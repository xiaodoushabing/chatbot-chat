# TASK-F2: Aurora PostgreSQL Provisioning & Schema
**Sub-PRD — Cold-Data Relational Database Layer**

| Field | Value |
|-------|-------|
| Task ID | TASK-F2 |
| Priority | P0 — blocker for TASK-T1, TASK-A1, TASK-MC1, TASK-DOC2 |
| Author perspective | Senior PostgreSQL Architect |
| SSOT Sections | 2K, 2M, 2H, 4, 1G, 1H, 1I |
| Output path | `docs/prd/F2-aurora-schema.md` |

---

## 1. Overview

### Why Aurora Serverless v2

Amazon Aurora Serverless v2 (PostgreSQL-compatible) was selected as the cold-data layer for this platform over standard RDS PostgreSQL and over DynamoDB for the following reasons:

**Vs. standard RDS PostgreSQL:**
- Aurora Serverless v2 scales Aurora Capacity Units (ACUs) up and down in fine-grained 0.5 ACU increments in response to actual load, within seconds. A banking backoffice admin tool has bursty, unpredictable traffic patterns (bulk audit exports, maker-checker approval storms, compliance reporting) rather than constant throughput. Standard RDS requires pre-provisioning for peak, which is wasteful.
- Billing is per ACU-hour consumed, not per instance-hour. Staging and non-production environments can scale near-zero during off-hours, materially reducing cost.
- Aurora Serverless v2 supports Multi-AZ failover with the same Aurora storage layer — no additional complexity vs. standard RDS Multi-AZ.

**Vs. DynamoDB (hot-data layer):**
- The tables in scope — templates, audit log, users, roles, maker-checker approvals — require ACID-compliant multi-row transactions, multi-column filtering, joins across related entities, and complex range queries (e.g., audit log filtered by actor AND action_type AND date range). DynamoDB's single-table access patterns are ill-suited to these query shapes.
- Template version history with foreign key constraints and the many-to-many `template_intents` junction table are naturally relational.
- Audit log compliance export (date range + actor + action type, all combinable, exported to CSV) benefits from PostgreSQL's index-backed filtered scans across 4+ columns.

**Important distinction — "scales to zero" vs. "scales near-zero":**
Aurora Serverless v2 does not scale to 0 ACUs (that is Aurora Serverless v1 behaviour). The minimum is 0.5 ACUs. For staging environments this is acceptable. If true zero-cost idle is required in future, v1 can be used for non-production, but v1 has slower cold-start latency and is not recommended for production. This PRD uses v2 throughout for consistency.

### What this task delivers

1. Aurora Serverless v2 cluster provisioned via AWS CDK (staging + prod stacks).
2. RDS Proxy in front of the cluster for Lambda connection pooling.
3. Complete PostgreSQL DDL for all 12 tables in the cold-data layer.
4. Index definitions for all compliance-critical query patterns.
5. Versioned migration strategy using `golang-migrate` run by a CDK custom resource on deploy.
6. Data lifecycle, retention, and security policies enforced at the database level.

---

## 2. Aurora Cluster CDK Configuration

### Engine & Version

Use Aurora PostgreSQL 15.x (minimum). PostgreSQL 15 introduced `MERGE` statement (useful for upsert patterns in migration runners), improved logical replication, and is the current Aurora-supported LTS version with long-term support horizon. Do not use PostgreSQL 16 until Aurora certifies it for Serverless v2.

### CDK Construct Parameters

```typescript
// lib/constructs/aurora-cluster.ts
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

interface AuroraClusterProps {
  vpc: ec2.IVpc;
  isProd: boolean;
}

export function createAuroraCluster(scope: Construct, props: AuroraClusterProps) {
  const { vpc, isProd } = props;

  const cluster = new rds.DatabaseCluster(scope, 'ChatbotAurora', {
    engine: rds.DatabaseClusterEngine.auroraPostgres({
      version: rds.AuroraPostgresEngineVersion.VER_15_4,
    }),

    // Serverless v2 scaling — writer instance only (reader added for prod)
    writer: rds.ClusterInstance.serverlessV2('writer', {
      scaleWithWriter: true,
    }),

    // Prod: add one serverless v2 reader for Multi-AZ failover
    // Staging: writer-only (single-AZ, cost optimisation)
    readers: isProd
      ? [rds.ClusterInstance.serverlessV2('reader', { scaleWithWriter: true })]
      : [],

    serverlessV2MinCapacity: isProd ? 1 : 0.5,   // ACUs
    serverlessV2MaxCapacity: isProd ? 16 : 4,     // ACUs — adjust based on load testing

    vpc,
    vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },

    // Storage encryption (mandatory for banking — MAS TRM requirement)
    storageEncrypted: true,

    // Backup retention
    backup: {
      retention: Duration.days(isProd ? 30 : 7),
      preferredWindow: '02:00-03:00',  // UTC, off-peak SGT
    },

    // Deletion protection: always on for prod; off for staging to allow teardown
    deletionProtection: isProd,
    removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,

    // CloudWatch Logs export — important for audit trail of DDL changes
    cloudwatchLogsExports: ['postgresql'],
    cloudwatchLogsRetention: logs.RetentionDays.THREE_MONTHS,

    // Default database
    defaultDatabaseName: 'chatbot',

    // Parameter group — enforce SSL and set connection limits
    parameterGroup: new rds.ParameterGroup(scope, 'AuroraPG', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      parameters: {
        'rds.force_ssl': '1',           // Enforce TLS for all connections
        'log_statement': 'ddl',         // Log DDL statements to CloudWatch
        'log_min_duration_statement': '1000',  // Log queries > 1s (slow query log)
      },
    }),

    // IAM authentication — Lambdas use IAM tokens, not passwords
    iamAuthentication: true,
  });

  return cluster;
}
```

### Capacity Guidance

| Environment | Min ACU | Max ACU | Rationale |
|-------------|---------|---------|-----------|
| Staging | 0.5 | 4 | Off-hours near-zero cost; handles developer testing load |
| Production | 1 | 16 | Minimum 1 ACU avoids cold-start latency on first query; max headroom for compliance export spikes |

Monitor `ServerlessDatabaseCapacity` CloudWatch metric and adjust max ACU upward if the cluster sustains max capacity for > 5 minutes during normal operations.

---

## 3. Connection Strategy — RDS Proxy

### Problem: Lambda + Aurora Connection Exhaustion

AWS Lambda functions are ephemeral and scale horizontally. Each Lambda invocation opens a new database connection. Under load, 200 concurrent Lambda invocations attempting to open 200 PostgreSQL connections will exhaust Aurora's `max_connections` limit (which scales with ACU count but remains bounded — at 0.5 ACU: ~90 connections; at 2 ACU: ~360 connections).

Aurora Serverless v2 does not support the PgBouncer-style connection pooling that is native to standard PostgreSQL deployments. RDS Proxy is the AWS-native solution: it maintains a warm pool of connections to Aurora and multiplexes Lambda connections through it.

### RDS Proxy CDK Configuration

```typescript
// lib/constructs/rds-proxy.ts
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';

export function createRdsProxy(
  scope: Construct,
  cluster: rds.DatabaseCluster,
  vpc: ec2.IVpc,
  lambdaRole: iam.IRole,
) {
  const proxy = new rds.DatabaseProxy(scope, 'ChatbotRdsProxy', {
    proxyTarget: rds.ProxyTarget.fromCluster(cluster),
    vpc,
    vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },

    // IAM authentication — no plaintext passwords
    iamAuth: true,

    // Require TLS between proxy and Aurora (defence-in-depth)
    requireTLS: true,

    // Connection pool settings
    maxConnectionsPercent: 90,       // Proxy uses up to 90% of Aurora max_connections
    maxIdleConnectionsPercent: 10,   // Keep 10% idle to absorb burst
    connectionBorrowTimeout: Duration.seconds(30),

    // Secrets: even with IAM auth, a secret is required for the proxy's own connection
    // to Aurora. Use a Secrets Manager secret for the proxy admin user.
    secrets: [cluster.secret!],

    // Debug logging for connection failures (disable in prod after stabilisation)
    debugLogging: !isProd,
  });

  // Grant Lambda role permission to connect via IAM auth
  proxy.grantConnect(lambdaRole, 'chatbot_lambda');  // PostgreSQL user name

  return proxy;
}
```

### IAM Authentication Flow

Lambda does not store a database password anywhere (not in environment variables, not in Secrets Manager for Lambda consumption). Instead:

1. Lambda execution role has `rds-db:connect` permission for the specific RDS Proxy resource and DB user.
2. At connection time, the Lambda SDK calls `rds.signer.getAuthToken()` to generate a 15-minute IAM authentication token.
3. The token is passed as the password field in the PostgreSQL connection string. RDS Proxy validates the token against IAM and routes the connection to Aurora.
4. The underlying Aurora connection from proxy to cluster uses the Secrets Manager credential (invisible to Lambda).

```typescript
// Lambda connection setup (Node.js / pg library)
import { Signer } from '@aws-sdk/rds-signer';
import { Pool } from 'pg';

const signer = new Signer({
  region: process.env.AWS_REGION!,
  hostname: process.env.RDS_PROXY_ENDPOINT!,
  port: 5432,
  username: 'chatbot_lambda',
});

// Called once per Lambda container lifetime; token is refreshed before expiry
async function getPool(): Promise<Pool> {
  const token = await signer.getAuthToken();
  return new Pool({
    host: process.env.RDS_PROXY_ENDPOINT,
    port: 5432,
    database: 'chatbot',
    user: 'chatbot_lambda',
    password: token,
    ssl: { rejectUnauthorized: true },
    max: 5,          // Per-Lambda-container pool size; RDS Proxy aggregates across containers
    idleTimeoutMillis: 60000,
  });
}
```

### Why Not Direct Lambda-to-Aurora Connection

Direct connections bypass the proxy's connection pooling benefits. Under a burst of 100 concurrent Lambda invocations each holding a connection open for 500ms, the total connection slots consumed equals 100 — regardless of query duration. With RDS Proxy, the proxy multiplexes these through a smaller persistent pool to Aurora. For a backoffice tool the burst scenario is realistic during bulk audit export or maker-checker approval floods.

---

## 4. Complete Schema DDL

All DDL is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). Enums are created with `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$` guards to allow re-running migrations safely.

```sql
-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE approval_decision AS ENUM ('pending', 'approved', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE indexed_status AS ENUM ('pending', 'indexed', 'failed', 'stale', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE template_status AS ENUM ('active', 'inactive', 'draft');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- USERS & ROLES (Access Control)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT        NOT NULL UNIQUE,
  cognito_sub      TEXT        NOT NULL UNIQUE,  -- Cognito User Pool sub claim
  display_name     TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at    TIMESTAMPTZ,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE users IS
  'Internal staff accounts. cognito_sub links to Cognito User Pool identity. '
  'Deactivated users (is_active=false) retain all records for audit purposes.';

COMMENT ON COLUMN users.cognito_sub IS
  'The "sub" claim from the Cognito JWT. Used by the Lambda authorizer to resolve '
  'the internal user_id without a separate lookup round-trip.';

-- ----

CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL      PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,   -- 'BA', 'DEV', 'MGMT', 'ADMIN'
  description TEXT
);

COMMENT ON TABLE roles IS
  'Static role definitions. Seeded at deployment. '
  'Valid values: BA (Business Analyst), DEV (Developer/ML Engineer), '
  'MGMT (Senior Management — read-only), ADMIN (platform administrator).';

-- ----

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id     INTEGER     NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  resource    TEXT        NOT NULL,   -- e.g. 'intents', 'audit', 'templates', 'kill_switch'
  action      TEXT        NOT NULL,   -- e.g. 'read', 'write', 'approve', 'export'
  PRIMARY KEY (role_id, resource, action)
);

COMMENT ON TABLE role_permissions IS
  'Fine-grained RBAC: each role has a set of (resource, action) pairs it is permitted. '
  'The Lambda authorizer joins this table at request time to gate API access. '
  'Resource and action values must match the constants defined in the authorizer Lambda.';

-- ----

CREATE TABLE IF NOT EXISTS user_roles (
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     INTEGER     NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID        REFERENCES users(id),  -- NULL if seeded by system
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

COMMENT ON TABLE user_roles IS
  'Many-to-many user↔role assignment. A user can hold multiple roles '
  '(e.g., a DEV who is also an ADMIN). assigned_by is nullable for initial seeding.';

-- ============================================================
-- TEMPLATES (Template Management)
-- ============================================================

CREATE TABLE IF NOT EXISTS templates (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT            NOT NULL,
  content_markdown TEXT            NOT NULL,
  variables        JSONB           NOT NULL DEFAULT '[]',
  -- variables format: [{"key": "user_name", "description": "Customer display name", "required": true}]
  status           template_status NOT NULL DEFAULT 'draft',
  created_by       UUID            NOT NULL REFERENCES users(id),
  updated_by       UUID            NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE templates IS
  'Pre-approved static response templates served when a query matches an intent '
  'configured in Template mode. Soft-deleted via status=inactive; records are never '
  'hard-deleted. created_by and updated_by reference internal user IDs.';

COMMENT ON COLUMN templates.variables IS
  'JSON array of variable descriptors for {{placeholder}} tokens in content_markdown. '
  'The substitution Lambda reads this at serve time to validate that all required '
  'variables are present in the runtime context before rendering.';

-- ----

CREATE TABLE IF NOT EXISTS template_versions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      UUID        NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  version_number   INTEGER     NOT NULL,
  content_markdown TEXT        NOT NULL,
  variables        JSONB       NOT NULL DEFAULT '[]',
  changed_by       UUID        NOT NULL REFERENCES users(id),
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_number)
);

COMMENT ON TABLE template_versions IS
  'Immutable snapshot of each template edit. version_number increments monotonically '
  'per template. The current live content is always in the templates table; '
  'template_versions stores the full history for rollback and audit diff views. '
  'ON DELETE CASCADE ensures versions are removed if a template is hard-deleted '
  '(which should only occur in development — production templates are never hard-deleted).';

-- ----

CREATE TABLE IF NOT EXISTS template_intents (
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  intent_id   TEXT NOT NULL,
  -- intent_id is the DynamoDB intent record ID (string PK). No FK constraint
  -- because DynamoDB is a separate data store. Referential integrity is enforced
  -- at the application layer (Template Service validates intent existence via
  -- the Intent DB API before inserting here).
  PRIMARY KEY (template_id, intent_id)
);

COMMENT ON TABLE template_intents IS
  'Many-to-many junction between templates and intents. intent_id references the '
  'DynamoDB intent partition key (a string UUID). There is intentionally no FK '
  'constraint to DynamoDB — integrity is enforced by the Template Service Lambda '
  'at write time. If an intent is deleted from DynamoDB, the Template Service must '
  'clean up orphaned rows here as a compensating action.';

-- ============================================================
-- AUDIT LOG (Compliance — MAS Audit Trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id       UUID        NOT NULL REFERENCES users(id),
  action_type    TEXT        NOT NULL,
  -- Canonical action types (enforced at application layer, not DB enum, to allow
  -- adding new types without a DDL migration):
  -- intent.create, intent.edit, intent.delete, intent.promote, intent.rollback,
  -- intent.approve (discovery), agent.config_change, guardrail.policy_change,
  -- template.create, template.edit, template.publish, template.restore,
  -- template.activate, template.deactivate,
  -- document.add, document.remove, document.update, document.reindex,
  -- kill_switch.activate, kill_switch.deactivate,
  -- approval.submit, approval.approve, approval.reject, approval.expire,
  -- user.login, user.logout, user.create, user.deactivate
  entity_type    TEXT        NOT NULL,   -- 'intent', 'template', 'agent', 'document', etc.
  entity_id      TEXT        NOT NULL,   -- UUID or DynamoDB key of the affected record
  before_payload JSONB,                  -- NULL for create operations
  after_payload  JSONB,                  -- NULL for delete operations
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT now(),
  use_case       TEXT,                   -- e.g. 'retirement_planning', 'loans'
  ip_address     INET,                   -- caller's IP from API Gateway request context
  request_id     TEXT                    -- API Gateway request ID for correlation
);

COMMENT ON TABLE audit_log IS
  'Append-only compliance audit log. All write operations across the platform produce '
  'a record here within the same database transaction as the write (or as a '
  'compensating write on transaction failure). '
  'DELETE and TRUNCATE are REVOKED from all application roles on this table. '
  'Records are retained indefinitely per MAS Notice 655 / TRM requirements. '
  'before_payload and after_payload store the full JSON snapshot of the entity '
  'before and after the change — enabling before/after diff in the audit UI.';

-- Prevent any application role from deleting audit records
-- (Executed after table creation and role setup — see migration V3)
-- REVOKE DELETE ON audit_log FROM chatbot_lambda;
-- REVOKE TRUNCATE ON audit_log FROM chatbot_lambda;

-- ============================================================
-- MAKER-CHECKER (Pending Approvals)
-- ============================================================

CREATE TABLE IF NOT EXISTS pending_approvals (
  id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type  TEXT              NOT NULL,
  -- Matches audit_log.action_type for the gated operation.
  -- e.g. 'template.publish', 'intent.promote', 'guardrail.policy_change',
  --      'agent.config_change', 'kill_switch.deactivate' (non-emergency re-enable)
  payload      JSONB             NOT NULL,
  -- Full serialized operation payload. On approval, the Approval Service
  -- deserializes this and re-executes it against the target service Lambda.
  -- Payload schema is action_type-specific; validated by the Approval Service.
  maker_id     UUID              NOT NULL REFERENCES users(id),
  submitted_at TIMESTAMPTZ       NOT NULL DEFAULT now(),
  checker_id   UUID              REFERENCES users(id),  -- NULL until decided
  decided_at   TIMESTAMPTZ,                              -- NULL until decided
  decision     approval_decision NOT NULL DEFAULT 'pending',
  comment      TEXT,             -- Mandatory for reject; optional for approve
  expires_at   TIMESTAMPTZ       NOT NULL
  -- expires_at set by maker-checker config at submit time (e.g., now() + 48h).
  -- EventBridge rule runs every 15 minutes and marks expired records.
);

COMMENT ON TABLE pending_approvals IS
  'Maker-checker approval queue. A Maker submits a change; a Checker must approve '
  'before the change is applied. Maker and Checker must be different users (enforced '
  'at application layer). On approval, the Approval Service replays payload against '
  'the target service. All state transitions are recorded in audit_log. '
  'Records are never deleted — they accumulate as a permanent approval history.';

COMMENT ON COLUMN pending_approvals.payload IS
  'Full serialized request payload of the gated operation. Must include enough '
  'information to replay the action without requiring the Maker to re-enter data. '
  'For template.publish: {template_id, content_markdown, variables, name}. '
  'For intent.promote: {intent_ids: [...], from_tier: staging, to_tier: production}. '
  'Payload is stored as-submitted and replayed as-submitted — idempotency is the '
  'responsibility of the target service (use upsert semantics).';

-- ============================================================
-- SYSTEM STATE (Kill Switch)
-- ============================================================

CREATE TABLE IF NOT EXISTS system_state (
  key        VARCHAR(255) PRIMARY KEY,
  value      JSONB        NOT NULL,
  updated_by UUID         REFERENCES users(id),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE system_state IS
  'Key-value store for global system configuration flags. '
  'Designed for a small number of rows (< 100). Not for high-throughput use. '
  'Used by the kill switch service and any future global feature flags. '
  'Two rows are seeded at deploy time: '
  '  key=kill_switch_global  value={"active": false, "reason": null, "activated_at": null} '
  '  key=kill_switch_agents  value={"agent_ids": {}} '
  'The Routing Lambda caches these rows in Lambda memory with a 5-second TTL. '
  'All updates to system_state are recorded in audit_log.';

-- Seed data — applied in migration V1, idempotent:
-- INSERT INTO system_state (key, value, updated_by, updated_at)
-- VALUES
--   ('kill_switch_global', '{"active": false, "reason": null, "activated_at": null}', NULL, now()),
--   ('kill_switch_agents', '{"agent_ids": {}}', NULL, now())
-- ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- DOCUMENTS (Document Management)
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  filename         TEXT            NOT NULL,
  s3_key           TEXT            NOT NULL UNIQUE,
  file_type        TEXT            NOT NULL,  -- 'pdf', 'docx', 'txt', 'url'
  uploader_id      UUID            NOT NULL REFERENCES users(id),
  use_case         TEXT            NOT NULL,  -- e.g. 'retirement_planning', 'loans'
  indexed_status   indexed_status  NOT NULL DEFAULT 'pending',
  last_indexed_at  TIMESTAMPTZ,
  provider_used    TEXT,           -- e.g. 'external_hub_v1', 'inhouse_v1'
  is_active        BOOLEAN         NOT NULL DEFAULT TRUE,
  -- Soft delete: is_active=false. Raw document in S3 is never deleted.
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
  content_hash     TEXT            -- SHA-256 of file content; used for delta re-index detection
);

COMMENT ON TABLE documents IS
  'Metadata for all uploaded knowledge documents. Raw files live in S3 permanently '
  '(s3_key is the authoritative reference). Soft delete via is_active=false triggers '
  'a de-index event but does not remove the S3 object. indexed_status tracks the '
  'current state of this document in the vector store (OpenSearch). '
  'content_hash enables the indexing provider to detect unchanged documents and skip '
  're-processing, reducing cost.';

-- ----

CREATE TABLE IF NOT EXISTS document_domains (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  domain_tag  TEXT NOT NULL,
  -- domain_tag values are validated at application layer against known use cases.
  -- Examples: 'retirement_planning', 'loans', 'cards', 'wealth', 'fraud'
  PRIMARY KEY (document_id, domain_tag)
);

COMMENT ON TABLE document_domains IS
  'Many-to-many junction: a document can be tagged to multiple use-case domains. '
  'Intent discovery and RAG retrieval filter by domain_tag to ensure a use case '
  'only retrieves documents tagged for it, providing data isolation between domains.';
```

---

## 5. Indexes

### Design Rationale

Index strategy prioritises compliance query patterns (audit log filtering), operational query patterns (pending approval expiry jobs), and management UI query patterns (template and document listing). Every index carries a written rationale — do not add indexes without one, as each index adds write overhead to a table that may receive high insert rates (audit_log in particular).

```sql
-- ============================================================
-- audit_log indexes
-- ============================================================

-- Single-column: actor lookup
-- Use case: "Show me all actions by actor X" — filter by compliance officer
--   or audit UI actor filter. High selectivity when a single user is queried.
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id
  ON audit_log (actor_id);

-- Single-column: action type filter
-- Use case: "Show all template.publish events" — common filter in audit export.
--   Low cardinality column (~25 distinct values), but combined with date range
--   the composite index below is preferred. This single-column index serves
--   single-predicate queries without a date range.
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type
  ON audit_log (action_type);

-- Single-column: entity lookup
-- Use case: "Show all changes to template ID abc-123" — clicking an entity
--   in any management UI to see its full change history. entity_id is a
--   string (UUID or DynamoDB key); high cardinality.
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id
  ON audit_log (entity_id);

-- Descending timestamp: chronological listing
-- Use case: Audit log default view — most recent events first. BRIN index
--   would be more space-efficient for a monotonically increasing timestamp,
--   but B-tree with DESC is needed for ORDER BY timestamp DESC with LIMIT
--   to use an index scan instead of a sequential scan + sort.
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp_desc
  ON audit_log (timestamp DESC);

-- Composite: action_type + timestamp — the most common compliance export pattern
-- Use case: "Export all template.publish events in Q1 2025" — combines action
--   type filter with date range. The composite index satisfies both predicates
--   without a separate sort, enabling index-only scans for the most frequent
--   audit export queries. action_type first (equality predicate), timestamp
--   second (range predicate) — correct ordering for B-tree selectivity.
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type_timestamp
  ON audit_log (action_type, timestamp DESC);

-- Composite: actor_id + timestamp — "all actions by user in date range"
-- Use case: Per-user activity report for a time window (e.g., "what did
--   this BA do last week?"). Supports actor filter + date range without
--   a full table scan.
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_timestamp
  ON audit_log (actor_id, timestamp DESC);

-- ============================================================
-- pending_approvals indexes
-- ============================================================

-- Composite: decision + expires_at — used by the EventBridge auto-expiry job
-- Use case: EventBridge rule runs every 15 minutes to find all pending records
--   where expires_at < now(). Without this index, the expiry Lambda performs
--   a full table scan. decision=pending is the equality prefix; expires_at is
--   the range predicate.
CREATE INDEX IF NOT EXISTS idx_pending_approvals_decision_expires
  ON pending_approvals (decision, expires_at)
  WHERE decision = 'pending';
-- Partial index: only indexes 'pending' rows, significantly reducing index size
-- as approved/rejected/expired rows are not scanned by the expiry job.

-- Maker lookup: "show all approvals I submitted"
CREATE INDEX IF NOT EXISTS idx_pending_approvals_maker_id
  ON pending_approvals (maker_id, submitted_at DESC);

-- Checker lookup: "show all approvals assigned to me / awaiting my decision"
CREATE INDEX IF NOT EXISTS idx_pending_approvals_checker_id
  ON pending_approvals (checker_id, submitted_at DESC);

-- Action type filter: "show all pending template.publish approvals"
CREATE INDEX IF NOT EXISTS idx_pending_approvals_action_type
  ON pending_approvals (action_type, decision);

-- ============================================================
-- templates indexes
-- ============================================================

-- Status filter: template management UI default view shows active templates
CREATE INDEX IF NOT EXISTS idx_templates_status
  ON templates (status);

-- Recency: most recently updated templates first (default sort in management UI)
CREATE INDEX IF NOT EXISTS idx_templates_updated_at_desc
  ON templates (updated_at DESC);

-- Creator lookup: "templates I created"
CREATE INDEX IF NOT EXISTS idx_templates_created_by
  ON templates (created_by);

-- ============================================================
-- documents indexes
-- ============================================================

-- Indexing pipeline: find documents awaiting indexing or re-indexing
-- Use case: Indexing orchestrator Lambda queries for documents in 'pending'
--   or 'stale' status to enqueue for processing.
CREATE INDEX IF NOT EXISTS idx_documents_indexed_status
  ON documents (indexed_status)
  WHERE indexed_status IN ('pending', 'stale', 'failed');
-- Partial index: active documents needing indexing attention. Excludes
-- 'indexed' (the majority of rows) and 'inactive' (soft-deleted).

-- Use case filter: domain-scoped document listing
CREATE INDEX IF NOT EXISTS idx_documents_use_case
  ON documents (use_case, is_active);

-- Active document listing (default management UI view)
CREATE INDEX IF NOT EXISTS idx_documents_is_active
  ON documents (is_active, created_at DESC);

-- ============================================================
-- template_versions indexes
-- ============================================================

-- Version history lookup for a template (ordered by version)
CREATE INDEX IF NOT EXISTS idx_template_versions_template_id
  ON template_versions (template_id, version_number DESC);

-- ============================================================
-- user_roles indexes (for Lambda authorizer join)
-- ============================================================

-- Lambda authorizer joins user_roles → role_permissions on user_id.
-- The primary key (user_id, role_id) covers the lookup, but an explicit
-- index on user_id alone speeds the initial join lookup.
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON user_roles (user_id);

-- ============================================================
-- document_domains indexes
-- ============================================================

-- Domain tag lookup: "all documents tagged retirement_planning"
CREATE INDEX IF NOT EXISTS idx_document_domains_tag
  ON document_domains (domain_tag);
```

---

## 6. Migration Strategy

### Tool: golang-migrate

**Rationale for golang-migrate over alternatives:**

| Tool | Verdict | Rationale |
|------|---------|-----------|
| Flyway | Rejected | JVM dependency; adds ~200MB to Lambda deployment package if run in-process; better suited for ECS/EC2 deployments |
| Liquibase | Rejected | Same JVM issue; XML/YAML changesets add verbosity without benefit for a pure-SQL schema |
| node-pg-migrate | Viable | JavaScript-native; good for TypeScript Lambda projects. Rejected here because golang-migrate produces a single self-contained binary with no runtime dependency — easier to run as a CDK custom resource |
| golang-migrate | Selected | Self-contained binary, pure SQL migration files, supports PostgreSQL natively, can be invoked as a one-shot Lambda, no framework lock-in |
| Prisma Migrate | Rejected | Forces use of Prisma ORM client across the project; too opinionated for a multi-Lambda architecture |

### Migration File Structure

```
migrations/
├── V1__init_users_roles.sql
├── V2__init_templates.sql
├── V3__init_audit_log.sql
├── V4__init_pending_approvals.sql
├── V5__init_system_state.sql
├── V6__init_documents.sql
├── V7__seed_roles_permissions.sql
├── V8__seed_system_state.sql
├── V9__revoke_audit_delete.sql
└── V10__add_indexes.sql
```

**Naming convention:** `V{sequential_integer}__{snake_case_description}.sql`
- Version number is a simple incrementing integer (not semantic version).
- Description must be human-readable and descriptive — the migration history is a compliance artifact.
- Never renumber or modify a committed migration. Create a new migration to correct a prior one.
- Each migration file must be idempotent where possible (use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).

**Example: V9__revoke_audit_delete.sql**
```sql
-- Ensure the application Lambda role cannot delete audit records.
-- This is enforced at the database level as a defence-in-depth measure
-- beyond application-layer controls.
REVOKE DELETE ON audit_log FROM chatbot_lambda;
REVOKE TRUNCATE ON audit_log FROM chatbot_lambda;

-- Also ensure no UPDATE on audit_log (records are truly immutable)
REVOKE UPDATE ON audit_log FROM chatbot_lambda;
```

**Example: V7__seed_roles_permissions.sql**
```sql
-- Seed canonical roles
INSERT INTO roles (name, description) VALUES
  ('BA',    'Business Analyst / PM — intent and template management'),
  ('DEV',   'Developer / ML Engineer — full access'),
  ('MGMT',  'Senior Management — read-only metrics and audit'),
  ('ADMIN', 'Platform Administrator — user and role management')
ON CONFLICT (name) DO NOTHING;

-- Seed role_permissions
-- BA permissions
INSERT INTO role_permissions (role_id, resource, action)
SELECT r.id, p.resource, p.action
FROM roles r, (VALUES
  ('intents',    'read'),
  ('intents',    'write'),
  ('discovery',  'read'),
  ('discovery',  'write'),
  ('templates',  'read'),
  ('templates',  'write'),
  ('documents',  'read'),
  ('documents',  'write'),
  ('audit',      'read'),
  ('audit',      'export'),
  ('preview',    'read')
) AS p(resource, action)
WHERE r.name = 'BA'
ON CONFLICT DO NOTHING;

-- DEV permissions (all resources)
INSERT INTO role_permissions (role_id, resource, action)
SELECT r.id, p.resource, p.action
FROM roles r, (VALUES
  ('intents',     'read'), ('intents',     'write'),
  ('agents',      'read'), ('agents',      'write'),
  ('guardrails',  'read'), ('guardrails',  'write'),
  ('templates',   'read'), ('templates',   'write'),
  ('documents',   'read'), ('documents',   'write'),
  ('audit',       'read'), ('audit',       'export'),
  ('metrics',     'read'),
  ('approvals',   'read'), ('approvals',   'write'), ('approvals', 'approve'),
  ('kill_switch', 'read'), ('kill_switch', 'write'),
  ('discovery',   'read'), ('discovery',   'write'),
  ('preview',     'read'), ('users',       'read')
) AS p(resource, action)
WHERE r.name = 'DEV'
ON CONFLICT DO NOTHING;

-- MGMT permissions (read-only)
INSERT INTO role_permissions (role_id, resource, action)
SELECT r.id, p.resource, p.action
FROM roles r, (VALUES
  ('metrics', 'read'),
  ('audit',   'read')
) AS p(resource, action)
WHERE r.name = 'MGMT'
ON CONFLICT DO NOTHING;

-- ADMIN permissions (everything + user management)
INSERT INTO role_permissions (role_id, resource, action)
SELECT r.id, p.resource, p.action
FROM roles r, (VALUES
  ('intents',     'read'), ('intents',     'write'),
  ('agents',      'read'), ('agents',      'write'),
  ('guardrails',  'read'), ('guardrails',  'write'),
  ('templates',   'read'), ('templates',   'write'),
  ('documents',   'read'), ('documents',   'write'),
  ('audit',       'read'), ('audit',       'export'),
  ('metrics',     'read'),
  ('approvals',   'read'), ('approvals',   'write'), ('approvals', 'approve'),
  ('kill_switch', 'read'), ('kill_switch', 'write'),
  ('discovery',   'read'), ('discovery',   'write'),
  ('preview',     'read'),
  ('users',       'read'), ('users',       'write')
) AS p(resource, action)
WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;
```

### How Migrations Run on Deploy

Migrations are not run from a long-lived ECS task or a developer's machine. They run as part of the CDK deployment pipeline via a **CDK Custom Resource backed by a migration Lambda**.

**Architecture:**

```
CDK deploy
  └── CustomResource (MigrationRunner)
        └── triggers MigrationLambda (Node.js or Go)
              └── downloads golang-migrate binary from S3 (Lambda layer)
              └── connects to Aurora via RDS Proxy (IAM auth)
              └── runs: migrate -path /migrations -database postgres://... up
              └── exits 0 on success, non-zero on failure (CDK deploy fails)
```

**CDK Custom Resource configuration:**
```typescript
const migrationLambda = new lambda.Function(scope, 'MigrationRunner', {
  runtime: lambda.Runtime.PROVIDED_AL2,  // Go runtime for golang-migrate binary
  handler: 'bootstrap',
  code: lambda.Code.fromAsset('lambda/migration-runner'),
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  timeout: Duration.minutes(5),
  environment: {
    DB_PROXY_ENDPOINT: proxy.endpoint,
    DB_NAME: 'chatbot',
    DB_USER: 'chatbot_lambda',
    AWS_REGION: Stack.of(scope).region,
  },
});

// Grant IAM auth to proxy
proxy.grantConnect(migrationLambda.role!, 'chatbot_lambda');

// CDK Custom Resource — runs on every deploy
const migrationResource = new cr.AwsCustomResource(scope, 'RunMigrations', {
  onCreate: {
    service: 'Lambda',
    action: 'invoke',
    parameters: {
      FunctionName: migrationLambda.functionName,
      InvocationType: 'RequestResponse',
    },
    physicalResourceId: cr.PhysicalResourceId.of('migration-runner'),
  },
  onUpdate: {
    service: 'Lambda',
    action: 'invoke',
    parameters: {
      FunctionName: migrationLambda.functionName,
      InvocationType: 'RequestResponse',
    },
    physicalResourceId: cr.PhysicalResourceId.of('migration-runner'),
  },
  policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
    resources: [migrationLambda.functionArn],
  }),
});
```

**Zero-downtime migration constraint:** All DDL migrations must be backwards-compatible with the currently deployed Lambda code. This means:
- New columns must have a default value or be nullable.
- Renaming a column requires a three-phase migration: add new column → backfill → update Lambda code → drop old column (three separate deployments).
- Never drop a column in the same deployment that removes its usage from Lambda code.

---

## 7. Data Lifecycle & Compliance

### audit_log — Append-Only, Indefinite Retention

`audit_log` is append-only by design and regulatory requirement. MAS Notice 655 (Technology Risk Management) and MAS TRM Guidelines require that audit trails be complete, tamper-evident, and retained for a minimum period (typically 5 years for financial institutions, though the exact retention period must be confirmed with the compliance team and legal counsel).

**Enforced at the database level:**
- `REVOKE DELETE ON audit_log FROM chatbot_lambda` — applied in migration V9.
- `REVOKE UPDATE ON audit_log FROM chatbot_lambda` — audit records are never modified.
- `REVOKE TRUNCATE ON audit_log FROM chatbot_lambda` — truncation is also blocked.
- Only a privileged DBA role (never used by application Lambdas) retains `DELETE` privilege for emergency data correction procedures, which themselves must be approved and logged out-of-band.

**No archival policy is set at the database level** — all records remain in the primary Aurora table. If table size becomes a concern (projected: ~1M rows/year at moderate volume), consider:
1. Table partitioning by month (`PARTITION BY RANGE (timestamp)`) — add in a future migration without changing application queries.
2. pg_partman extension for automatic partition maintenance.
3. Cold partition export to S3 Glacier for long-term compliance storage (query via Athena when needed).

### Templates and Documents — Soft Delete

Templates and documents are never hard-deleted. Soft delete is implemented via:
- `templates.status = 'inactive'` — template is excluded from active serve-path queries but remains queryable for audit and restore.
- `documents.is_active = FALSE` — document metadata remains; S3 object is never deleted. De-index event is emitted to the indexing queue.

### Session Data — Not in Aurora

Conversation session data (user message history, session context) is stored exclusively in DynamoDB with a 24-hour TTL. It is not persisted to Aurora. This is intentional:
- Session data is ephemeral, high-volume, and does not require ACID guarantees.
- DynamoDB TTL handles automatic expiry without Aurora storage cost.
- Audit of session interactions is captured at the routing/guardrail layer in CloudWatch Logs, not in the audit_log table (which is for admin platform actions, not end-user chat interactions).

### pending_approvals — Permanent History

Approval records are never deleted. Even after a decision (approved/rejected/expired), the record remains as a permanent history of who approved what and when. The `decision` column and `decided_at`/`checker_id` are updated in-place — this is the only allowed UPDATE on this table by the application role.

---

## 8. Security

### Encryption at Rest

Aurora storage encryption is enabled via `storageEncrypted: true` in the CDK construct (Section 2). The encryption key is the AWS-managed RDS key by default. For enhanced control, supply a customer-managed KMS key:

```typescript
const auroraKey = new kms.Key(scope, 'AuroraKmsKey', {
  enableKeyRotation: true,
  description: 'Aurora PostgreSQL encryption key — chatbot platform',
  alias: `alias/chatbot-aurora-${isProd ? 'prod' : 'staging'}`,
});

// Pass to DatabaseCluster:
storageEncryptionKey: auroraKey,
```

A customer-managed key allows key rotation on a schedule and enables CloudTrail logging of all key usage — required for banking compliance.

### Encryption in Transit

TLS is enforced at two levels:
1. **`rds.force_ssl = 1`** parameter group setting — Aurora rejects any non-TLS connection attempt.
2. **`ssl: { rejectUnauthorized: true }`** in the Lambda pg connection configuration — Lambda verifies the Aurora/RDS Proxy certificate.
3. **`requireTLS: true`** on the RDS Proxy construct.

Lambda functions must include the Amazon RDS CA bundle in their deployment package or Lambda layer. Rotate the CA bundle when AWS announces certificate rotation.

### IAM Authentication

No plaintext database passwords appear in Lambda environment variables, SSM Parameter Store (unencrypted), or application code. The connection flow is:
- Lambda execution role → `rds-db:connect` IAM policy → RDS Proxy endpoint → Aurora.
- IAM tokens are 15-minute short-lived credentials generated by the AWS SDK at connection time.
- Secrets Manager holds the proxy admin credential (for the proxy's own connection to Aurora) — not accessed by Lambda directly.

### Row-Level Security (RLS) Considerations

The current schema does not implement PostgreSQL Row-Level Security (RLS) at the database layer. Access control is enforced at the API Gateway + Lambda authorizer layer (by role and resource). RLS would add defence-in-depth but also significant query complexity.

**Recommendation for future hardening:** Enable RLS on the `audit_log` table to prevent the `chatbot_lambda` role from reading audit records belonging to other use cases (if multi-tenancy is introduced). Implement as:
```sql
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_use_case_isolation ON audit_log
  USING (use_case = current_setting('app.current_use_case'));
```
The Lambda would set `SET LOCAL app.current_use_case = 'retirement_planning'` at the start of each transaction. This is a Phase 2 hardening item — not required for the single-use-case Phase 1 launch.

### Network Isolation

The Aurora cluster and RDS Proxy are placed in private subnets with no inbound rule from the internet. Only Lambda functions within the same VPC (or VPC-peered environments) can reach the proxy. Security group rules:

```typescript
// Lambda SG → RDS Proxy SG: port 5432 only
proxySecurityGroup.addIngressRule(
  lambdaSecurityGroup,
  ec2.Port.tcp(5432),
  'Allow Lambda to connect to RDS Proxy',
);

// RDS Proxy SG → Aurora SG: port 5432 only
auroraSecurityGroup.addIngressRule(
  proxySecurityGroup,
  ec2.Port.tcp(5432),
  'Allow RDS Proxy to connect to Aurora',
);
```

No direct inbound rule from Lambda SG to Aurora SG — all traffic passes through the proxy.

---

## 9. Acceptance Criteria

From TASK-F2 in `AGENT_TASKS.md`:

| # | Criterion | How to Verify |
|---|-----------|---------------|
| AC-1 | Aurora cluster provisions via CDK | `cdk synth` produces valid CloudFormation; `cdk deploy` creates the Aurora cluster without errors in both staging and prod stacks |
| AC-2 | All tables created with indexes on audit/compliance query patterns (actor, action_type, entity_id, timestamp) | Run `\d audit_log` and `\di audit_log*` in psql after migration; verify all 6 audit_log indexes exist |
| AC-3 | Migration script is idempotent and versioned | Run migrations twice on a fresh database; second run completes with "no migrations to apply" and 0 errors; migration versions stored in `schema_migrations` table |
| AC-4 | Connectivity from Lambda via VPC/RDS Proxy confirmed | Deploy a test Lambda in the VPC that executes `SELECT 1` against the proxy endpoint using IAM auth; verify response within 500ms |

Additional acceptance criteria identified by this PRD:

| # | Criterion | How to Verify |
|---|-----------|---------------|
| AC-5 | `audit_log` is immutable for the `chatbot_lambda` role | Attempt `DELETE FROM audit_log WHERE id = '...'` as `chatbot_lambda` user; verify PostgreSQL returns `ERROR: permission denied` |
| AC-6 | `system_state` seed rows exist after migration | `SELECT key FROM system_state` returns exactly `kill_switch_global` and `kill_switch_agents` |
| AC-7 | Role permissions seed is complete and queryable | Join `users`, `user_roles`, `roles`, `role_permissions` for a test BA user; verify expected resources and actions are returned |
| AC-8 | RDS Proxy IAM auth works (no password in Lambda env vars) | Lambda environment variables contain no `DB_PASSWORD` or similar; connection succeeds using IAM token only |
| AC-9 | TLS enforced — non-TLS connection rejected | Attempt `psql` connection with `sslmode=disable`; verify connection is refused by Aurora |
| AC-10 | Aurora cluster encryption confirmed | In AWS Console → RDS → Cluster, verify "Encryption" shows "Enabled" with the expected KMS key |
| AC-11 | Partial index on `pending_approvals` covers expiry query | `EXPLAIN ANALYZE SELECT id FROM pending_approvals WHERE decision = 'pending' AND expires_at < now()` uses index scan, not seq scan |
| AC-12 | Backup retention set correctly per environment | Staging: 7-day retention; Production: 30-day retention — verify in RDS console or `cdk synth` CloudFormation output |

---

## 10. Open Questions and Risks

### RISK-1: Aurora Serverless v2 Does Not Scale to Zero

**Issue:** Aurora Serverless v2 minimum capacity is 0.5 ACUs (~$0.06/hour), not zero. A staging environment running 24/7 at 0.5 ACUs costs ~$43/month in compute (excluding storage and I/O). This is acceptable for a banking project but should be communicated to the project sponsor.

**Mitigation options:**
- Accept the cost — it is low for a banking context.
- Use Aurora Serverless v1 for staging (true scale-to-zero, but slower cold starts ~25s vs ~1–3s for v2). Not recommended due to v1's deprecation trajectory.
- Implement a scheduled Lambda that stops the cluster (via `stopDBCluster` API) during off-hours (e.g., nights and weekends) — Aurora can be stopped for up to 7 days; it auto-restarts on connection attempt.

**Recommendation:** Accept the 0.5 ACU minimum cost for staging. Do not use v1.

### RISK-2: RDS Proxy Cost vs. Benefit

**Issue:** RDS Proxy charges per vCPU of the underlying database instances. For Aurora Serverless v2, the proxy cost is based on ACU-hours of the cluster. At 0.5 ACUs, RDS Proxy adds approximately 30–40% to the compute cost. For a backoffice tool with low concurrency, the proxy may be unnecessary overhead.

**Mitigation:** Evaluate whether connection exhaustion is actually a problem for this use case. A backoffice admin tool with 20–50 concurrent users is unlikely to exhaust Aurora's connection limit at 0.5 ACUs (~90 connections). Consider starting without RDS Proxy and adding it only if connection pool exhaustion is observed in staging.

**Recommendation:** Provision without RDS Proxy initially for the staging environment. Add RDS Proxy before production launch, where concurrency may be higher and connection stability more critical.

### RISK-3: Schema Migration During Zero-Downtime Deploys

**Issue:** If a migration adds a `NOT NULL` column without a default value to a table that already has data, PostgreSQL will reject the migration. If a migration takes an `ACCESS EXCLUSIVE` lock (e.g., `ALTER TABLE ... ADD COLUMN ... NOT NULL`), it will block all reads and writes for the duration — potentially causing a 30–60 second outage during a production deploy.

**Mitigation:**
- All `ADD COLUMN` statements must include a `DEFAULT` value or be `NULL`able when first added. Backfill and add the `NOT NULL` constraint in a subsequent migration after data is populated.
- Monitor lock acquisition during staging deployments using `pg_locks` and `pg_stat_activity`. Any migration that takes > 1s should be reviewed before production.
- For large tables (audit_log expected to grow to millions of rows), use `ALTER TABLE ... ADD COLUMN ... DEFAULT ... NOT NULL` which in PostgreSQL 11+ is a metadata-only operation for constant defaults — safe on large tables.

**Recommendation:** Establish a "migration review checklist" as part of the PR process that checks for: lock type, backwards compatibility, index build time.

### RISK-4: Cold Start After Aurora Scales Down

**Issue:** Even with the 0.5 ACU minimum, Aurora Serverless v2 may pause internal processes when completely idle. The first query after a long idle period can take 3–5 seconds to establish a connection through the cold path. This is generally acceptable for a backoffice tool (users expect slightly slower responses on first use after idle), but would be unacceptable for the Routing Lambda serving end-user queries.

**Mitigation:**
- The Routing Lambda's use of system_state (kill switch check) must not add significant latency. Since the kill switch is cached in Lambda memory with a 5-second TTL, it rarely hits Aurora — this risk is low for the routing path.
- Admin API Lambdas are the primary consumers of Aurora. A cold-start delay of 3–5s is acceptable for an admin tool (not a customer-facing SLA).
- If cold start becomes a problem in production, set `serverlessV2MinCapacity: 2` to maintain always-warm compute.

### RISK-5: intent_id Referential Integrity

**Issue:** `template_intents.intent_id` references DynamoDB records (a separate data store). There is no database-level FK constraint. If an intent is deleted from DynamoDB, orphaned rows in `template_intents` will remain, potentially causing the template serve path to load a template linked to a non-existent intent.

**Mitigation:**
- The Template Service Lambda must validate intent existence in DynamoDB before inserting into `template_intents`.
- The Intent DB Service must call the Template Service to unlink intents before deleting them from DynamoDB (or emit an SNS event that the Template Service subscribes to for cleanup).
- A periodic reconciliation Lambda can scan `template_intents` and validate each `intent_id` against DynamoDB, logging orphaned rows.

**Recommendation:** Implement the SNS event-based cleanup in TASK-I1 and add the orphan scan Lambda to the TASK-T1 backlog.

### OPEN-1: audit_log Retention Period

**Question:** What is the exact MAS-required retention period for audit logs in this system? MAS Notice 655 references retention requirements, but the specific period applicable to a chatbot backoffice tool depends on the system's classification (critical vs. non-critical infrastructure, whether it involves customer-facing financial advice).

**Action required:** Compliance team to confirm retention period before TASK-F2 is closed. The current PRD defaults to indefinite retention in Aurora with no archival. If a specific period (e.g., 7 years) is confirmed, implement table partitioning and cold-archival to S3 Glacier.

### OPEN-2: Multi-Use-Case Tenant Isolation

**Question:** The SSOT indicates future multi-use-case support (loans, cards, wealth). The current schema includes a `use_case` column on `audit_log` and `documents` but does not implement row-level tenant isolation. When a second use case is onboarded, should each use case see only its own data, or can BA users with access to both use cases see records across cases?

**Action required:** Product to clarify tenant isolation model before multi-use-case launch (Phase 2 scope). Current schema supports adding RLS in a non-breaking migration.
