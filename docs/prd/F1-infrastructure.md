# TASK-F1: AWS Infrastructure & CDK Scaffolding
## Sub-PRD — Foundational Infrastructure for Chatbot Backoffice Platform

**Status:** P0 — Blocker for all other tasks
**Author domain:** AWS CDK / Infrastructure
**SSOT reference:** `/Users/lisatan/.claude/plans/serene-snuggling-kahn.md` Sections 2J, 4, 6
**Output artifact:** `infra/` directory in this repository

---

## 1. Overview

This task delivers the complete AWS infrastructure foundation that every other service task depends on. No backend Lambda, no database, no API, and no CI/CD pipeline can exist before this task is done and merged.

### What this task delivers

- AWS CDK v2 project scaffolded under `infra/` with TypeScript
- Two environment stacks (staging, production) deployable to separate AWS accounts
- All DynamoDB tables (hot-data layer) — provisioned with correct keys, GSIs, and TTL
- All S3 buckets — raw documents, intent snapshots, ONNX model registry
- IAM execution roles for every Lambda function group, following least-privilege
- CDK bootstrapping scripts and environment variable wiring
- GitHub Actions CI/CD pipeline for `synth → diff → deploy staging → gate → deploy production`

### Why this is a P0 blocker

Every downstream task (Intent DB service, Routing Engine, Guardrails, Agents, Observability, Aurora provisioning in TASK-F2, Auth in TASK-F3) needs to reference ARNs and resource names that only exist after this stack deploys. Specifically:

- DynamoDB table ARNs are imported by Intent DB (TASK-I1), Session Store (TASK-AG1), Guardrail Policy (TASK-GD1), Metrics Cache (TASK-OBS1)
- S3 bucket ARNs are imported by Document Store (TASK-DOC1), Intent Snapshot service (TASK-I1), ONNX model registry (TASK-P2-EDGE)
- IAM roles are assumed by every Lambda function; they must exist before Lambda code can be deployed
- CDK bootstrap must complete in both AWS accounts before any other CDK stack can synth and deploy

**Do not start any other implementation task until `cdk synth` succeeds for both staging and production stacks.**

---

## 2. CDK Project Structure

### Directory layout

Place the CDK project at `infra/` alongside the existing `src/` frontend:

```
chatbot-chat/
├── src/                        # React SPA (existing)
├── infra/                      # CDK project (this task)
│   ├── bin/
│   │   └── app.ts              # CDK app entry point; instantiates stacks for each env
│   ├── lib/
│   │   ├── stacks/
│   │   │   ├── storage-stack.ts        # S3 + DynamoDB (hot path)
│   │   │   ├── iam-stack.ts            # IAM roles and policies (no resources)
│   │   │   └── pipeline-stack.ts       # CDK Pipelines self-mutating stack
│   │   ├── constructs/
│   │   │   ├── standard-lambda.ts      # Custom L3: Lambda with opinionated defaults
│   │   │   ├── dynamo-table.ts         # Custom L3: DynamoDB table with standard config
│   │   │   └── secure-bucket.ts        # Custom L3: S3 bucket with standard config
│   │   └── config/
│   │       ├── environments.ts         # Env config (account IDs, region, naming)
│   │       └── tags.ts                 # Standard resource tags
│   ├── test/
│   │   └── infra.test.ts               # CDK snapshot + assertion tests
│   ├── cdk.json
│   ├── package.json
│   └── tsconfig.json
├── AGENT_TASKS.md
├── CLAUDE.md
└── docs/
    └── prd/
        └── F1-infrastructure.md        # This file
```

### Stack instantiation in `bin/app.ts`

```typescript
const app = new cdk.App();

const envStaging: cdk.Environment = {
  account: process.env.CDK_STAGING_ACCOUNT,
  region: 'ap-southeast-1',  // Singapore — required for MAS data residency
};

const envProd: cdk.Environment = {
  account: process.env.CDK_PROD_ACCOUNT,
  region: 'ap-southeast-1',
};

new StorageStack(app, 'ChatbotBackoffice-Storage-Staging', { env: envStaging, stage: 'staging' });
new StorageStack(app, 'ChatbotBackoffice-Storage-Prod',    { env: envProd,    stage: 'production' });

new IamStack(app,     'ChatbotBackoffice-IAM-Staging',     { env: envStaging, stage: 'staging' });
new IamStack(app,     'ChatbotBackoffice-IAM-Prod',        { env: envProd,    stage: 'production' });
```

### Cross-stack references

**Do not use CDK cross-stack references (`stack.exportValue`)** — they create hard CloudFormation export/import dependencies that are brittle to update. Instead:

- Export resource names and ARNs to **AWS Systems Manager Parameter Store** at deploy time
- Consuming stacks (TASK-F2, TASK-F3, etc.) read from SSM at synth time using `ssm.StringParameter.valueFromLookup()`
- All SSM parameter paths follow this convention: `/<stage>/chatbot-backoffice/<resource-type>/<resource-name>` (e.g., `/staging/chatbot-backoffice/dynamodb/intent-db-table-name`)

This pattern decouples stack deployments and allows stacks to be torn down and redeployed independently.

---

## 3. Stack Inventory

### 3.1 StorageStack

**Responsibility:** All stateful infrastructure — S3 buckets and DynamoDB tables. This is the most critical stack; destroy protection must be enabled on every resource.

**AWS resources owned:**
- S3: `raw-documents` bucket
- S3: `intent-snapshots` bucket
- S3: `onnx-model-registry` bucket
- DynamoDB: `intent-db` table (hot path)
- DynamoDB: `intent-version-metadata` table
- DynamoDB: `session-store` table
- DynamoDB: `metrics-cache` table
- DynamoDB: `cost-cache` table
- DynamoDB: `guardrail-policy-config` table
- DynamoDB: `agent-config` table
- SSM parameters for all resource ARNs and names

**Removal policy:** `RETAIN` for all resources. Deletion of this stack must be a manual, deliberate action — CDK must not drop tables or buckets on stack update.

### 3.2 IamStack

**Responsibility:** All IAM roles and policies for Lambda execution. Depends on StorageStack SSM outputs (reads bucket ARNs and table ARNs to build least-privilege policies). This stack has no stateful AWS resources of its own — it is safe to recreate.

**AWS resources owned:**
- IAM Role: `IntentCrudLambdaRole`
- IAM Role: `RoutingLambdaRole`
- IAM Role: `DiscoveryPipelineLambdaRole`
- IAM Role: `GenerationLambdaRole`
- IAM Role: `GuardrailAdapterLambdaRole`
- IAM Role: `AgentConfigLambdaRole`
- IAM Role: `CostAggregatorLambdaRole`
- IAM Role: `AdminApiLambdaRole`
- IAM Role: `DocumentIngestionLambdaRole`
- SSM parameters for all role ARNs

### 3.3 PipelineStack (CI/CD only — deployed once to toolchain account)

**Responsibility:** CDK Pipelines self-mutating pipeline. Lives in a dedicated "toolchain" AWS account (or the staging account if single-account setup). Triggers on push to `main`.

**AWS resources owned:**
- CodePipeline pipeline
- CodeBuild projects (synth, diff, integration test gate)
- S3 bucket for pipeline artifacts
- IAM cross-account deployment roles

---

## 4. S3 Buckets

All three buckets share these baseline security settings (enforced via the `SecureBucket` custom construct, Section 8):
- `blockPublicAccess: BlockPublicAccess.BLOCK_ALL`
- `encryption: BucketEncryption.S3_MANAGED` (upgrade to KMS if the security review requires CMK)
- `enforceSSL: true` (bucket policy denies `aws:SecureTransport = false`)
- `versioning: true` (on all three — the intent-snapshots bucket strictly requires it; the others benefit from it for audit and accident recovery)
- `removalPolicy: cdk.RemovalPolicy.RETAIN`

### 4.1 Raw Documents Bucket

**Name pattern:** `chatbot-backoffice-raw-docs-<stage>-<account-id>`
Using account ID in the name guarantees global uniqueness without a random suffix that changes on stack recreation.

| Property | Value |
|----------|-------|
| Versioning | Enabled |
| Lifecycle | Noncurrent versions → expire after 365 days (raw docs are never hard-deleted; keep 1 year of prior versions before deep-archive) |
| Intelligent Tiering | Enable for objects > 128 KB after 30 days (cost optimisation for infrequently accessed historical documents) |
| CORS | Required: allow `PUT` from API Gateway pre-signed URL flow; allowed origins = internal CloudFront distribution origin only |
| Bucket policy | Allow: `s3:PutObject`, `s3:GetObject` by `DocumentIngestionLambdaRole` only. Deny: all other principals including the deploying account root (force role-based access). |
| Access logging | Enable to a separate access-log bucket (provision that bucket separately with 90-day lifecycle). |
| Event notification | On `s3:ObjectCreated:*` → trigger DocumentIngestionLambda (TASK-DOC1). Wire this notification in TASK-DOC1's stack, not here, to avoid circular dependencies. |

**CORS configuration:**
```json
{
  "AllowedOrigins": ["https://<cloudfront-domain>"],
  "AllowedMethods": ["PUT", "GET"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

### 4.2 Intent Snapshots Bucket

**Name pattern:** `chatbot-backoffice-intent-snapshots-<stage>-<account-id>`

| Property | Value |
|----------|-------|
| Versioning | Enabled (required — every intent promotion writes an immutable JSON blob; S3 versioning adds a second layer of immutability) |
| Object Lock | Enable in COMPLIANCE mode with a 7-year retention period. This is a banking system; snapshot immutability must be enforced at the storage layer, not just at the application layer. |
| Lifecycle | No expiry on current versions. Noncurrent versions → transition to S3 Glacier Instant Retrieval after 90 days (rollback lookups are rare but need fast retrieval). |
| CORS | Not required (no browser direct access; all access via Lambda). |
| Bucket policy | Allow: `s3:PutObject` by `IntentCrudLambdaRole` only. Allow: `s3:GetObject` by `IntentCrudLambdaRole` and `RoutingLambdaRole`. Deny: `s3:DeleteObject` for all principals including root. |

**Object key convention** (document for TASK-I1 to follow):
`snapshots/<use-case>/<version-id>.json`
Example: `snapshots/retirement-planning/v_2026-03-26T14:00:00Z_a1b2c3.json`

### 4.3 ONNX Model Registry Bucket

**Name pattern:** `chatbot-backoffice-model-registry-<stage>-<account-id>`

| Property | Value |
|----------|-------|
| Versioning | Enabled (model artifacts must be rollback-able) |
| Lifecycle | Noncurrent versions → expire after 180 days (limit model artifact storage cost; keep last 5 major versions via noncurrent version count). |
| CORS | Not required for Phase 1. Required in Phase 2 if Electron client downloads directly. |
| Bucket policy | Allow: `s3:PutObject` by CI/CD role (pipeline uploads artifacts). Allow: `s3:GetObject` and `s3:ListBucket` by desktop client IAM identity (Phase 2). Phase 1: allow read by `AdminApiLambdaRole` for version manifest API only. |

**Object key convention:**
`models/<model-name>/<version>/model.onnx`
`models/<model-name>/manifest.json` (version pointer file)

---

## 5. DynamoDB Tables

**Billing mode for all tables:** `PAY_PER_REQUEST` (on-demand). Rationale: this platform has bursty, unpredictable traffic patterns (batch intent discovery, daily cost aggregation spikes). On-demand eliminates capacity planning risk and is cheaper at this scale until throughput is well-characterised.

**Point-in-time recovery:** Enabled on all tables. This is non-negotiable for a banking system — PITR provides a 35-day continuous backup window.

**Encryption:** `TableEncryption.DEFAULT` (AWS-owned keys) is acceptable initially. Upgrade to `TableEncryption.CUSTOMER_MANAGED` (CMK via KMS) if the security review mandates CMK for all data at rest.

**Removal policy:** `RETAIN` on all tables.

---

### 5.1 Intent DB Table (Hot Path)

**Table name:** `chatbot-backoffice-intent-db-<stage>`

| Attribute | Type | Role |
|-----------|------|------|
| `pk` | String | Partition key. Format: `<use_case>#<env_tier>` e.g. `retirement#production` |
| `sk` | String | Sort key. Format: `INTENT#<intent_id>` e.g. `INTENT#withdraw_cpf` |
| `intentId` | String | Unique identifier (UUID) |
| `name` | String | Display name |
| `utterances` | List | List of user phrasings |
| `response` | String | Template response text (if mode=Template) |
| `riskLevel` | String | `Low` or `High` |
| `responseMode` | String | `GenAI`, `Template`, or `Exclude` |
| `status` | String | `active` or `inactive` |
| `envTier` | String | `drafts`, `staging`, or `production` |
| `useCase` | String | e.g. `retirement-planning` |
| `linkedAgentId` | String | Agent ID if responseMode=GenAI |
| `linkedTemplateId` | String | Template ID if responseMode=Template |
| `updatedAt` | String | ISO 8601 |
| `updatedBy` | String | Actor user ID |

**GSIs:**

| GSI Name | Partition Key | Sort Key | Projected | Purpose |
|----------|--------------|----------|-----------|---------|
| `gsi-by-use-case-status` | `useCase` | `status` | ALL | Filter intents by use case and active/inactive status |
| `gsi-by-response-mode` | `responseMode` | `envTier` | ALL | Filter intents in a given tier by response mode (for routing engine bulk load) |

**TTL:** None (intents are not ephemeral).

**Access patterns this table must support:**
- Get all intents for a use case + tier (primary lookup by BA and routing engine) → `pk` query
- Get single intent by intentId → `pk` + `sk` get-item
- Filter by responseMode within a tier → `gsi-by-response-mode`
- Filter by status within a use case → `gsi-by-use-case-status`

---

### 5.2 Intent Version Metadata Table

**Table name:** `chatbot-backoffice-intent-versions-<stage>`

| Attribute | Type | Role |
|-----------|------|------|
| `pk` | String | Partition key. Format: `<use_case>` |
| `sk` | String | Sort key. Format: `VERSION#<version_id>` (version_id = ISO timestamp + short UUID) |
| `versionId` | String | Full version identifier |
| `s3Key` | String | Full S3 object key of the immutable snapshot JSON |
| `actor` | String | User ID who triggered the promotion |
| `promotedAt` | String | ISO 8601 timestamp |
| `intentCount` | Number | Number of intents in this snapshot (for display) |
| `description` | String | Optional human note about this version |

**GSIs:** None required. All queries are by `pk` (use case) with optional `sk` prefix scan for version history.

**TTL:** None (version metadata must be retained indefinitely for audit purposes).

---

### 5.3 Session Store Table

**Table name:** `chatbot-backoffice-session-store-<stage>`

| Attribute | Type | Role |
|-----------|------|------|
| `pk` | String | Partition key. Format: `SESSION#<session_id>` |
| `sk` | String | Sort key. Format: `MSG#<sequence_number>` (zero-padded, e.g. `MSG#0001`) |
| `sessionId` | String | Session identifier |
| `role` | String | `user` or `assistant` |
| `content` | String | Message content |
| `intentId` | String | Intent matched for this turn (if applicable) |
| `agentId` | String | Agent used (if applicable) |
| `timestamp` | String | ISO 8601 |
| `ttl` | Number | **Unix epoch seconds.** TTL attribute — set to `now + 86400` (24 hours) |

**GSIs:** None. Session data is always accessed by session ID.

**TTL attribute:** `ttl` — DynamoDB will automatically delete expired session records. TTL is 24 hours (86400 seconds) from last message time. Each new message in a session must update the TTL on existing items or insert with a fresh TTL.

---

### 5.4 Metrics Cache Table

**Table name:** `chatbot-backoffice-metrics-cache-<stage>`

| Attribute | Type | Role |
|-----------|------|------|
| `pk` | String | Partition key. Format: `METRIC#<metric_type>` e.g. `METRIC#daily_query_volume` |
| `sk` | String | Sort key. Format: `<use_case>#<date>` e.g. `retirement#2026-03-26` |
| `value` | Number | Metric value |
| `breakdown` | Map | Agent-level or intent-level breakdown (serialized JSON) |
| `computedAt` | String | ISO 8601 — when this cache entry was computed |
| `ttl` | Number | Unix epoch seconds. Set to `now + 172800` (48 hours) to prevent stale cache from persisting past 2 daily runs |

**GSIs:**

| GSI Name | Partition Key | Sort Key | Projected | Purpose |
|----------|--------------|----------|-----------|---------|
| `gsi-by-date` | `sk` (date portion — consider splitting this into its own attribute `date`) | `pk` | KEYS_ONLY | Query all metrics for a given date |

**Note:** Consider splitting `date` out as a top-level attribute for cleaner GSI design. The dashboard API queries "all metrics for today" frequently.

**TTL attribute:** `ttl`

---

### 5.5 Cost Cache Table

**Table name:** `chatbot-backoffice-cost-cache-<stage>`

| Attribute | Type | Role |
|-----------|------|------|
| `pk` | String | Partition key. Format: `COST#<use_case>` |
| `sk` | String | Sort key. Format: `<date>#<agent_id>` e.g. `2026-03-26#retirement_planner_agent` |
| `costUsd` | Number | Cost in USD (4 decimal precision — store as Number, not String) |
| `tokenCount` | Number | Total tokens consumed |
| `requestCount` | Number | Total API requests |
| `modelId` | String | Bedrock model ID used |
| `computedAt` | String | ISO 8601 |
| `ttl` | Number | Unix epoch seconds. Set to `now + 172800` (48 hours) |

**GSIs:**

| GSI Name | Partition Key | Sort Key | Projected | Purpose |
|----------|--------------|----------|-----------|---------|
| `gsi-cost-by-date` | `date` (top-level attribute, split from sk) | `pk` | ALL | Query all cost entries for a given date across all use cases |

**TTL attribute:** `ttl`

---

### 5.6 Guardrail Policy Config Table

**Table name:** `chatbot-backoffice-guardrail-policy-<stage>`

| Attribute | Type | Role |
|-----------|------|------|
| `pk` | String | Partition key. Format: `POLICY#<use_case>` |
| `sk` | String | Sort key. Always `ACTIVE` (only one active policy per use case; future: support versioning with different sk values) |
| `activeProvider` | String | `bedrock`, `azure-content-safety`, or `custom` |
| `blockedTopics` | List | List of topic strings |
| `deniedWords` | List | List of word/phrase strings |
| `hallucinationSensitivity` | String | `LOW`, `MEDIUM`, or `HIGH` |
| `injectionDetectionSensitivity` | String | `LOW`, `MEDIUM`, or `HIGH` |
| `exclusionResponseTemplate` | String | Boilerplate response text for excluded queries |
| `bedrockGuardrailId` | String | ARN/ID of the synced Bedrock Guardrail resource (set by TASK-GD1 after sync) |
| `updatedAt` | String | ISO 8601 |
| `updatedBy` | String | Actor user ID |
| `version` | Number | Monotonically increasing version number for optimistic locking |

**GSIs:** None required. Lookup is always by use case.

**TTL:** None (policy config must be retained indefinitely).

**Optimistic locking:** TASK-GD1 must use a conditional write (`ConditionExpression: "version = :expected_version"`) to prevent concurrent policy updates from silently clobbering each other.

---

### 5.7 Agent Config Table

**Table name:** `chatbot-backoffice-agent-config-<stage>`

| Attribute | Type | Role |
|-----------|------|------|
| `pk` | String | Partition key. Format: `AGENT#<agent_id>` |
| `sk` | String | Sort key. Always `CONFIG` for the primary config record. Use `INTENT#<intent_id>` for routing map entries (same table, different items). |
| `agentId` | String | Unique identifier |
| `name` | String | Display name (e.g. `Retirement_Planner_Agent`) |
| `useCase` | String | Domain/use case this agent serves |
| `modelId` | String | Bedrock model ID (e.g. `anthropic.claude-3-sonnet-20240229-v1:0`) |
| `temperature` | Number | 0.0–1.0 |
| `maxTokens` | Number | Max output tokens |
| `systemPromptS3Key` | String | S3 key to the system prompt stored in the raw-documents bucket under a reserved `system-prompts/` prefix |
| `bedrockAgentId` | String | AWS Bedrock Agent resource ID (set after TASK-AG1 provisions the agent) |
| `bedrockAgentAliasId` | String | Bedrock Agent alias ID |
| `status` | String | `active` or `inactive` |
| `createdAt` | String | ISO 8601 |
| `updatedAt` | String | ISO 8601 |
| `updatedBy` | String | Actor user ID |

**GSI for routing map (intent → agent lookup):**

| GSI Name | Partition Key | Sort Key | Projected | Purpose |
|----------|--------------|----------|-----------|---------|
| `gsi-intent-to-agent` | `intentId` (top-level attribute, only on `sk=INTENT#*` items) | `agentId` | ALL | Routing engine: given an intent ID, find the assigned agent |

**TTL:** None.

---

## 6. IAM Roles & Policies

**Naming convention:** `chatbot-backoffice-<function-group>-lambda-role-<stage>`

**Common baseline for all Lambda execution roles:**
- Trust policy: `lambda.amazonaws.com` as principal
- Attach AWS managed policy `AWSLambdaBasicExecutionRole` (CloudWatch Logs write access)
- Attach AWS managed policy `AWSXRayDaemonWriteAccess` (X-Ray tracing — enable on all Lambdas)
- No `AdministratorAccess`, no `PowerUserAccess`, no wildcard resource ARNs

---

### 6.1 IntentCrudLambdaRole

Used by: TASK-I1 (Intent CRUD, promote, rollback, list-versions handlers)

```
DynamoDB:
  - dynamodb:GetItem, PutItem, UpdateItem, DeleteItem, Query, BatchWriteItem
    Resource: arn:aws:dynamodb:<region>:<account>:table/chatbot-backoffice-intent-db-<stage>
  - dynamodb:GetItem, PutItem, UpdateItem, Query
    Resource: arn:aws:dynamodb:<region>:<account>:table/chatbot-backoffice-intent-versions-<stage>
  - dynamodb:Query
    Resource: arn:aws:dynamodb:<region>:<account>:table/chatbot-backoffice-intent-db-<stage>/index/*
              arn:aws:dynamodb:<region>:<account>:table/chatbot-backoffice-intent-versions-<stage>/index/*

S3:
  - s3:PutObject, GetObject, ListBucket
    Resource: arn:aws:s3:::chatbot-backoffice-intent-snapshots-<stage>-<account>/*
              arn:aws:s3:::chatbot-backoffice-intent-snapshots-<stage>-<account>

SSM:
  - ssm:GetParameter
    Resource: arn:aws:ssm:<region>:<account>:parameter/<stage>/chatbot-backoffice/*
```

---

### 6.2 RoutingLambdaRole

Used by: TASK-R1 (Routing Lambda)

```
DynamoDB:
  - dynamodb:GetItem, Query
    Resource: intent-db table + GSIs
  - dynamodb:GetItem
    Resource: guardrail-policy-config table
  - dynamodb:GetItem
    Resource: agent-config table + gsi-intent-to-agent

S3:
  - s3:GetObject
    Resource: intent-snapshots bucket (read only, for rollback verification)

Bedrock:
  - bedrock:InvokeModel
    Resource: arn:aws:bedrock:<region>::foundation-model/amazon.titan-embed-text-v1

CloudWatch:
  - cloudwatch:PutMetricData
    Resource: * (CloudWatch does not support resource-level restrictions on PutMetricData)

SSM:
  - ssm:GetParameter
    Resource: <stage>/chatbot-backoffice/* parameters

Note: The routing Lambda must NOT have bedrock:InvokeAgent access — that belongs to GuardrailAdapterLambdaRole.
The routing Lambda dispatches to other Lambdas via invocation, not directly to Bedrock Agents.
```

---

### 6.3 DiscoveryPipelineLambdaRole

Used by: TASK-D1 (Intent Discovery Pipeline Lambda)

```
DynamoDB:
  - dynamodb:PutItem, UpdateItem, Query
    Resource: intent-db table (for writing pending SyncSession diffs)

Bedrock:
  - bedrock:InvokeModel
    Resource: arn:aws:bedrock:<region>::foundation-model/anthropic.claude-3-sonnet-*

OpenSearch:
  - aoss:APIAccessAll
    Resource: <opensearch-serverless-collection-arn>/*
    (Restrict to the specific collection. OpenSearch Serverless uses data access policies, not IAM resource-level permissions.)

SSM:
  - ssm:GetParameter
    Resource: <stage>/chatbot-backoffice/*
```

---

### 6.4 GenerationLambdaRole

Used by: TASK-G1 (Utterance + RAG response generation)

```
Bedrock:
  - bedrock:InvokeModel
    Resource: arn:aws:bedrock:<region>::foundation-model/anthropic.claude-3-sonnet-*
              arn:aws:bedrock:<region>::foundation-model/amazon.titan-embed-text-v1

OpenSearch:
  - aoss:APIAccessAll
    Resource: <opensearch-serverless-collection-arn>/*

Note: GenerationLambdaRole must NOT have DynamoDB write access. Generation endpoints are read-only (output is returned to UI, never auto-saved).
```

---

### 6.5 GuardrailAdapterLambdaRole

Used by: TASK-GD1 (Guardrail Adapter Lambda, pre- and post-LLM screening)

```
DynamoDB:
  - dynamodb:GetItem
    Resource: guardrail-policy-config table

Bedrock:
  - bedrock:InvokeModel
    Resource: arn:aws:bedrock:<region>::foundation-model/anthropic.claude-3-sonnet-*
  - bedrock:ApplyGuardrail
    Resource: arn:aws:bedrock:<region>:<account>:guardrail/*
  - bedrock:InvokeAgent
    Resource: arn:aws:bedrock:<region>:<account>:agent-alias/*

CloudWatch:
  - cloudwatch:PutMetricData
    Resource: *

SNS:
  - sns:Publish
    Resource: arn:aws:sns:<region>:<account>:chatbot-backoffice-security-alerts-<stage>
```

---

### 6.6 AgentConfigLambdaRole

Used by: TASK-AG1 (Agent CRUD API, session management)

```
DynamoDB:
  - dynamodb:GetItem, PutItem, UpdateItem, DeleteItem, Query
    Resource: agent-config table + GSIs

S3:
  - s3:PutObject, GetObject
    Resource: raw-documents bucket under prefix system-prompts/*

Bedrock:
  - bedrock:CreateAgent, UpdateAgent, DeleteAgent, GetAgent
  - bedrock:CreateAgentAlias, UpdateAgentAlias, DeleteAgentAlias
    Resource: arn:aws:bedrock:<region>:<account>:agent/*

DynamoDB (session store):
  - dynamodb:GetItem, PutItem, UpdateItem, DeleteItem, Query
    Resource: session-store table
```

---

### 6.7 CostAggregatorLambdaRole

Used by: TASK-OBS1 (scheduled daily Lambda that queries Cost Explorer)

```
DynamoDB:
  - dynamodb:PutItem, UpdateItem
    Resource: cost-cache table
              metrics-cache table

CostExplorer:
  - ce:GetCostAndUsage
    Resource: * (Cost Explorer does not support resource-level restrictions)

CloudWatch:
  - cloudwatch:GetMetricStatistics, GetMetricData
    Resource: * (CloudWatch does not support resource-level restrictions on Get* calls)

Note: This role must be tightly scoped to read-only CE access. Do not add billing:* or account:* permissions.
```

---

### 6.8 AdminApiLambdaRole

Used by: TASK-I1, TASK-AG1, TASK-GD1 admin CRUD handlers (not routing or generation)

```
DynamoDB:
  - dynamodb:GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan
    Resource: intent-db, intent-versions, agent-config, guardrail-policy-config tables + GSIs

S3:
  - s3:GetObject
    Resource: intent-snapshots bucket (read-only, for rollback diff preview)
  - s3:GetObject, ListBucket
    Resource: model-registry bucket (version manifest reads)

CloudWatch:
  - logs:CreateLogGroup, CreateLogStream, PutLogEvents
    Resource: arn:aws:logs:<region>:<account>:log-group:/aws/lambda/chatbot-backoffice-*

SSM:
  - ssm:GetParameter
    Resource: <stage>/chatbot-backoffice/*

Note: AdminApiLambdaRole intentionally excludes Bedrock invoke permissions. Admin CRUD does not call LLMs.
```

---

### 6.9 DocumentIngestionLambdaRole

Used by: TASK-DOC1, TASK-DOC2 (S3 upload handler, indexing orchestrator, embedding layer)

```
S3:
  - s3:GetObject, PutObject, ListBucket
    Resource: raw-documents bucket

Textract:
  - textract:StartDocumentTextDetection, GetDocumentTextDetection
    Resource: *

Bedrock:
  - bedrock:InvokeModel
    Resource: arn:aws:bedrock:<region>::foundation-model/amazon.titan-embed-text-v1

OpenSearch:
  - aoss:APIAccessAll
    Resource: <opensearch-serverless-collection-arn>/*

SSM:
  - ssm:GetParameter
    Resource: <stage>/chatbot-backoffice/*
```

---

### Resource-based policies

**S3 bucket policies** are defined within the `SecureBucket` construct and enforce:
1. `aws:SecureTransport = false` → Deny all (enforce HTTPS)
2. Explicit allow only for the specific IAM roles listed per bucket above
3. Explicit deny `s3:DeleteObject` on intent-snapshots (immutability enforcement at storage layer)

**DynamoDB resource-based policies** are not used (DynamoDB does not support resource-based policies in the same way as S3). Access control is enforced entirely through the IAM identity-based policies on the Lambda execution roles.

---

## 7. Environment Separation

### Recommendation: Separate AWS Accounts (Not Separate Stacks in One Account)

**Decision: Use two AWS accounts — one for staging, one for production.**

Rationale for a banking context:

1. **Blast radius isolation.** A misconfigured IAM policy or runaway Lambda in staging cannot affect the production account. In a single-account setup, an accidental `--profile prod` CDK deploy of staging changes is possible.

2. **Compliance and audit boundary.** MAS TRM guidelines expect production systems to have clear environmental segregation. An auditor reviewing the production account can see that no staging workloads share its IAM boundary.

3. **IAM boundary enforcement.** Cross-account role assumption is explicit and logged in CloudTrail. Accidental access from a staging role to production resources is structurally impossible without explicit cross-account trust.

4. **Cost allocation.** AWS Cost Explorer can cleanly separate staging vs production spend by account, simplifying cost justification for senior management.

**Account structure:**

| Account | Purpose |
|---------|---------|
| `chatbot-backoffice-toolchain` | CDK Pipelines / CodePipeline lives here; deploys to other accounts via cross-account roles |
| `chatbot-backoffice-staging` | Staging workloads; used by developers for integration testing |
| `chatbot-backoffice-production` | Production workloads; IAM policies are stricter; CloudTrail logs forwarded to SIEM |

**How staging and production stacks differ:**

| Property | Staging | Production |
|----------|---------|------------|
| DynamoDB deletion protection | Disabled (faster dev iteration) | Enabled |
| S3 Object Lock | Disabled | COMPLIANCE mode, 7-year retention |
| CloudWatch Log retention | 30 days | 90 days |
| Lambda reserved concurrency | Not set (burst allowed for testing) | Set per function based on load testing |
| CloudWatch Alarms | Configured but SNS targets a dev Slack channel | Targets on-call PagerDuty + TISO email |
| WAF on API Gateway | Optional / basic rules | Required; OWASP rule set + rate limiting |
| Bedrock model access | `anthropic.claude-3-haiku` acceptable for cost | `anthropic.claude-3-sonnet` or better |
| Cost Explorer querying | Disabled (costs allocated to prod account only) | Enabled |

**CDK context parameters per environment** (set in `cdk.json` context or via `--context` CLI flags):

```json
{
  "staging": {
    "account": "123456789012",
    "region": "ap-southeast-1",
    "deletionProtection": false,
    "logRetentionDays": 30
  },
  "production": {
    "account": "987654321098",
    "region": "ap-southeast-1",
    "deletionProtection": true,
    "logRetentionDays": 90
  }
}
```

---

## 8. CDK Constructs Strategy

### L2 vs L3 guidance

- **Use L2 constructs** (e.g., `aws_dynamodb.Table`, `aws_s3.Bucket`, `aws_iam.Role`) as the foundation for all resources. L2 constructs provide sensible defaults and strong TypeScript typing. Never drop to L1 (`CfnTable`, `CfnBucket`) unless a property is unavailable in L2.
- **Create custom L3 constructs** for patterns that repeat 3+ times across the codebase. Three patterns qualify immediately:

---

### 8.1 `SecureBucket` construct

Wraps `aws_s3.Bucket` with all banking-grade defaults pre-applied. Consumers specify only the bucket-specific properties (name suffix, CORS if needed, lifecycle rules).

```typescript
// infra/lib/constructs/secure-bucket.ts
interface SecureBucketProps {
  bucketSuffix: string;   // e.g., 'raw-docs', 'intent-snapshots'
  stage: string;
  versioned?: boolean;    // default true
  cors?: s3.CorsRule[];
  lifecycleRules?: s3.LifecycleRule[];
  objectLockEnabled?: boolean;
  objectLockRetentionDays?: number;
}

// Always applies:
//   blockPublicAccess: BLOCK_ALL
//   encryption: S3_MANAGED
//   enforceSSL: true
//   removalPolicy: RETAIN
//   serverAccessLogsPrefix: 'access-logs/'
```

---

### 8.2 `StandardDynamoTable` construct

Wraps `aws_dynamodb.Table` with banking defaults. Consumers specify keys, GSIs, and TTL attribute only.

```typescript
// infra/lib/constructs/dynamo-table.ts
interface StandardDynamoTableProps {
  tableSuffix: string;          // e.g., 'intent-db'
  stage: string;
  partitionKey: dynamodb.Attribute;
  sortKey?: dynamodb.Attribute;
  globalSecondaryIndexes?: dynamodb.GlobalSecondaryIndexProps[];
  timeToLiveAttribute?: string;
  deletionProtection?: boolean; // default: true in prod, false in staging
}

// Always applies:
//   billingMode: PAY_PER_REQUEST
//   pointInTimeRecovery: true
//   encryption: DEFAULT (upgradeable to CUSTOMER_MANAGED)
//   removalPolicy: RETAIN
```

---

### 8.3 `StandardLambdaFunction` construct

The most important custom construct. Every Lambda function in this system should be instantiated through this construct, not directly from `aws_lambda.Function`. This ensures consistent observability, tracing, and naming.

```typescript
// infra/lib/constructs/standard-lambda.ts
interface StandardLambdaFunctionProps {
  functionSuffix: string;       // e.g., 'intent-crud', 'routing-engine'
  stage: string;
  handler: string;
  code: lambda.Code;
  role: iam.IRole;
  environment?: Record<string, string>;
  reservedConcurrentExecutions?: number;  // required in prod
  timeout?: cdk.Duration;       // default: 30s; generation Lambdas may need 60s
  memorySize?: number;          // default: 512 MB
}

// Always applies:
//   runtime: Runtime.NODEJS_20_X
//   tracing: Tracing.ACTIVE  (X-Ray)
//   logRetention: RetentionDays.ONE_MONTH (staging) / RetentionDays.THREE_MONTHS (prod)
//   architecture: Architecture.ARM_64  (Graviton2 — 20% cheaper, 20% faster for Node.js)
//   environment.STAGE: stage
//   environment.AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
```

**Why ARM_64 / Graviton2:** Node.js Lambda functions run 10–20% faster on Graviton2 with identical code, and cost 20% less per invocation. All Lambda runtimes used in this system (Node.js 20.x) are fully supported on ARM_64. This is a free optimisation.

---

## 9. CI/CD Pipeline

### Recommended approach: GitHub Actions (not CDK Pipelines)

**Rationale:** CDK Pipelines (CodePipeline-based) is powerful but requires the pipeline itself to live in AWS, which adds complexity when the codebase already uses GitHub for source control. GitHub Actions gives the team:
- Faster feedback (runs on GitHub infrastructure, no pipeline bootstrap time)
- Easier secret management (GitHub secrets vs SSM + CodeBuild)
- Simpler local reproduction of CI steps
- No additional AWS cost for the pipeline itself (CodePipeline pricing is per pipeline per month)

CDK Pipelines can be reconsidered if the security policy requires all deployments to originate from within the AWS network boundary.

### Workflow file: `.github/workflows/deploy.yml`

**Trigger:** Push to `main` branch or manually dispatched (`workflow_dispatch`).

#### Step 1: Lint and type-check

```
- name: CDK Lint
  run: |
    cd infra
    npm ci
    npm run lint        # tsc --noEmit
```

**Gate:** Fails fast. No CDK synth if TypeScript errors exist.

#### Step 2: CDK Synth (both stacks)

```
- name: CDK Synth
  env:
    CDK_STAGING_ACCOUNT: ${{ secrets.CDK_STAGING_ACCOUNT }}
    CDK_PROD_ACCOUNT: ${{ secrets.CDK_PROD_ACCOUNT }}
  run: |
    cd infra
    npx cdk synth --all
```

**Gate:** CloudFormation template generation must succeed. Fails if any resource is misconfigured. The generated templates are uploaded as workflow artifacts for audit.

#### Step 3: CDK Diff — Staging

```
- name: CDK Diff (Staging)
  run: |
    cd infra
    npx cdk diff ChatbotBackoffice-Storage-Staging ChatbotBackoffice-IAM-Staging \
      --require-approval never 2>&1 | tee staging-diff.txt
```

The diff output is posted as a GitHub Actions summary comment on the PR (using `github-actions/github-script`). This allows reviewers to see exactly what will change in AWS before approving the PR.

#### Step 4: Deploy Staging

```
- name: Deploy Staging
  if: github.ref == 'refs/heads/main'
  run: |
    cd infra
    npx cdk deploy ChatbotBackoffice-Storage-Staging ChatbotBackoffice-IAM-Staging \
      --require-approval never \
      --outputs-file staging-outputs.json
```

AWS credentials are injected via OIDC (OpenID Connect) — **do not use long-lived access keys in GitHub secrets.** Configure an IAM role in the staging account with a trust policy for the GitHub OIDC provider and the specific repository.

#### Step 5: Integration Test Gate (Staging)

```
- name: Verify Staging Deployment
  run: |
    node infra/test/verify-staging.js
```

`verify-staging.js` performs lightweight assertions:
- DynamoDB tables exist with correct names (using `aws dynamodb describe-table`)
- S3 buckets exist with versioning enabled
- SSM parameters are present
- IAM roles have correct trust policies

This is not a full integration test (that is TASK-QA1's responsibility). It is a smoke test to confirm the infra deployed as expected.

#### Step 6: Manual Gate — Production Deploy

```
- name: Wait for Production Approval
  uses: trstringer/manual-approval@v1
  with:
    secret: ${{ secrets.GITHUB_TOKEN }}
    approvers: infra-team
    minimum-approvals: 1
```

Production deploys require explicit human approval via GitHub Actions environment protection rules. Configure the `production` environment in GitHub with required reviewers.

#### Step 7: CDK Diff — Production

Same as Step 3 but for production stacks. Run after approval, before deploy.

#### Step 8: Deploy Production

```
- name: Deploy Production
  run: |
    cd infra
    npx cdk deploy ChatbotBackoffice-Storage-Prod ChatbotBackoffice-IAM-Prod \
      --require-approval never \
      --outputs-file prod-outputs.json
```

---

### GitHub Actions OIDC trust policy (for each AWS account)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<account>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<org>/chatbot-chat:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

The GitHub Actions deployment role should have only the permissions needed to deploy the specific stacks: `cloudformation:*`, `s3:*` (for CDK asset bucket), `iam:*` (for IAM stack), `dynamodb:*`, `ssm:PutParameter`. Do not grant `AdministratorAccess`.

---

## 10. Acceptance Criteria

### From TASK-F1 specification

- [ ] `npx cdk synth --all` produces valid CloudFormation for both staging and production stacks with zero errors and zero warnings
- [ ] All seven DynamoDB tables are provisioned with correct partition keys, sort keys, and GSIs as specified in Section 5 of this document
- [ ] All seven DynamoDB tables have point-in-time recovery enabled and `PAY_PER_REQUEST` billing mode
- [ ] TTL is configured on `session-store`, `metrics-cache`, and `cost-cache` tables (attribute name `ttl`)
- [ ] All three S3 buckets are provisioned with versioning enabled
- [ ] `intent-snapshots` bucket has Object Lock configured in COMPLIANCE mode (production only)
- [ ] All IAM roles follow least-privilege: no wildcard actions, no wildcard resources except where AWS does not support resource-level restrictions (Cost Explorer, CloudWatch PutMetricData)
- [ ] IAM roles do not share permissions across function groups (e.g., RoutingLambdaRole cannot write to DynamoDB)

### Additional infrastructure-expert criteria

- [ ] All resources have consistent tags: `Project=chatbot-backoffice`, `Stage=<staging|production>`, `ManagedBy=cdk`, `Owner=<team>`, `CostCenter=<billing-code>`
- [ ] CDK synth produces no assets in `cdk.out/` that reference local absolute paths (synth must be reproducible in CI)
- [ ] All S3 buckets have `enforceSSL: true` (bucket policy denies non-HTTPS requests)
- [ ] All S3 buckets have server access logging enabled, writing to a dedicated access-log bucket
- [ ] SSM Parameter Store outputs are written for all resource ARNs and names following the `/<stage>/chatbot-backoffice/<type>/<name>` convention
- [ ] CDK app passes `cdk-nag` AwsSolutions rule pack with zero errors (warnings are documented and suppressed with justification comments)
- [ ] `infra/test/infra.test.ts` contains CDK assertion tests (using `@aws-cdk/assertions`) verifying table key schemas and bucket versioning — these tests run in CI before synth
- [ ] GitHub Actions OIDC is configured for both staging and production accounts; no long-lived IAM access keys exist in GitHub secrets
- [ ] Production stack deploy requires manual approval in the GitHub Actions `production` environment
- [ ] `cdk bootstrap` has been run in all three accounts (toolchain, staging, production) before the pipeline is activated
- [ ] CloudTrail is enabled in the production account and logs are shipped to an S3 bucket in the toolchain account (or a dedicated logging account)

---

## 11. Open Questions / Risks

### 11.1 Single-account vs multi-account — confirm before CDK bootstrap

**Status: Recommended multi-account (see Section 7). Requires decision from IT/security team.**
Multi-account setup needs AWS Organization structure and account provisioning by the IT team. This has a dependency on the "AWS account setup + security approval" item in the project timeline (Section 5: 10-day buffer). If IT cannot provision multiple accounts in time, fall back to a single account with separate CDK stacks and strict IAM permission boundaries — but this must be a conscious, documented decision, not a default.

### 11.2 CDK version pin

Pin CDK to a specific minor version in `package.json` (e.g., `"aws-cdk-lib": "2.130.0"`). CDK minor versions occasionally contain breaking changes to L2 constructs. Do not use `"^2"` or `"2.x"` — a dependency update in CI should be an intentional action, not automatic.

**Action required:** Pick the current stable CDK v2 minor version at project kickoff and pin it. Set up Dependabot to notify (not auto-merge) on CDK updates.

### 11.3 Node.js runtime for CDK itself

Use Node.js 20 LTS for the CDK application (`infra/` package). Node.js 18 reaches end-of-life in April 2025. Also use `nodejs20.x` as the Lambda runtime for all functions (`StandardLambdaFunction` construct default).

### 11.4 KMS vs S3-managed encryption

S3-managed encryption (SSE-S3) is specified in this document. If the security/compliance team requires customer-managed keys (CMK via KMS) for all data at rest, this changes the design:
- Each bucket needs a dedicated KMS key (or shared key per data sensitivity tier)
- Lambda execution roles need `kms:Decrypt` and `kms:GenerateDataKey` permissions on the relevant keys
- KMS adds ~$1/month per key plus $0.03 per 10,000 API calls — cost impact is minor but not zero
- KMS CMK rotation must be enabled (annual automatic rotation)

**Recommendation:** Use S3-managed encryption for Phase 1. Plan a KMS upgrade in the security hardening phase (TASK-QA1).

### 11.5 OpenSearch Serverless provisioning ownership

TASK-F1 does not provision Amazon OpenSearch Serverless. The SSOT notes that OpenSearch provisioning requires IT/security approval (a 10-day critical path item). OpenSearch provisioning should be a separate stack (`SearchStack`) or part of TASK-DOC2. It is excluded from TASK-F1 to avoid blocking CDK scaffolding on the IT approval timeline.

**Action required:** Assign OpenSearch stack ownership to TASK-DOC2 or create a TASK-F1.5 for it. Ensure the SearchStack reads the VPC configuration (if applicable) from SSM parameters written by the network provisioning step.

### 11.6 Aurora Serverless v2 — excluded from this task

Aurora PostgreSQL provisioning is owned by TASK-F2. TASK-F1 does not provision Aurora. However, TASK-F1 should write a placeholder SSM parameter (`/<stage>/chatbot-backoffice/aurora/cluster-endpoint`) so that TASK-F2 knows the expected SSM path before it runs.

### 11.7 VPC requirement for Aurora (and downstream Lambda connectivity)

Aurora Serverless v2 requires a VPC. If TASK-F2 creates an Aurora cluster in a VPC, the Lambdas that connect to it (admin API, audit, template service) must also run inside that VPC. This requires:
- A `NetworkStack` (not defined in this document) that provisions the VPC, private subnets, NAT gateway, and security groups
- VPC configuration for the relevant Lambda execution roles (add `ec2:CreateNetworkInterface`, `DescribeNetworkInterfaces`, `DeleteNetworkInterface`)

**Action required:** Decide if all Lambdas run in VPC (simpler, consistent) or only Aurora-connected Lambdas (fewer Lambdas in VPC, simpler for non-Aurora Lambdas). Recommend all Lambdas in VPC for consistent networking and security posture. If all Lambdas are in VPC, add NAT Gateway egress for Bedrock API calls (Bedrock is a public endpoint).

### 11.8 cdk-nag integration

Integrate `cdk-nag` from the start, not as an afterthought. The `AwsSolutions` rule pack will flag common security misconfigurations (missing S3 access logging, missing VPC for Lambda, overly permissive IAM). Running `cdk-nag` in CI alongside `cdk synth` prevents security regressions.

Add to `bin/app.ts`:
```typescript
import { AwsSolutionsChecks } from 'cdk-nag';
cdk.Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
```

All suppressions must be accompanied by a justification comment and reviewed by the security lead.

### 11.9 Bedrock model access approval

AWS Bedrock foundation models (Claude, Titan) require explicit access request in the AWS console per account per region. This is a manual step that must be completed by the AWS account owner before any Lambda that calls Bedrock can function. This is not provisioned by CDK.

**Action required:** File Bedrock model access requests for both staging and production accounts on day one of the project. The models required are: `anthropic.claude-3-sonnet-*`, `anthropic.claude-3-haiku-*`, `amazon.titan-embed-text-v1`. Access approval typically takes 1–5 business days.

---

*End of TASK-F1 sub-PRD. Do not modify the SSOT file or AGENT_TASKS.md. All implementation work should reference this document for infrastructure decisions.*
