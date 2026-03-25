# Agent Task Dispatch Index
> This document assigns work streams to specialized agents. Each agent MUST read the master SSOT plan before writing their sub-PRD or any code.
>
> **SSOT location:** `/Users/lisatan/.claude/plans/serene-snuggling-kahn.md`
> **Do not modify this file or the SSOT without instruction.**

---

## How Agents Should Work

1. Read the full SSOT plan at the path above
2. Read the specific sections listed for your task
3. Write your own sub-PRD file (see path in each task)
4. Implement against your sub-PRD
5. Verify against the acceptance criteria

---

## Phase 0 — Foundations (Must complete before all other phases)

### TASK-F1: AWS Infrastructure & CDK Scaffolding
| Field | Value |
|-------|-------|
| Priority | P0 — blocker for everything |
| SSOT Sections | Section 2J (Infrastructure & CI/CD), Section 4 (DB Design), Section 6 (Dependencies) |
| Agent type | Plan → general-purpose |
| Sub-PRD output | `docs/prd/F1-infrastructure.md` |
| Blocking | All other tasks |

**Scope:** CDK project setup, S3 buckets (docs/snapshots/model-registry), DynamoDB table definitions (intent DB hot path, version metadata, session store, metrics/cost cache, guardrail policy), IAM roles, staging + production stack separation.

**Acceptance criteria:**
- `cdk synth` produces valid CloudFormation for both staging and prod stacks
- All DynamoDB tables provisioned with correct partition keys and TTL configs
- S3 buckets provisioned with versioning enabled (snapshots bucket)
- IAM roles follow least-privilege principle

---

### TASK-F2: Aurora PostgreSQL Provisioning & Schema
| Field | Value |
|-------|-------|
| Priority | P0 — blocker for templates, audit, maker-checker |
| SSOT Sections | Section 2K, Section 2M, Section 4 (DB Design — Aurora rows) |
| Agent type | Plan → general-purpose |
| Sub-PRD output | `docs/prd/F2-aurora-schema.md` |
| Blocking | TASK-T1, TASK-A1, TASK-MC1, TASK-DOC2 |

**Scope:** Aurora Serverless v2 CDK construct, PostgreSQL schema migrations for: `templates`, `template_versions`, `template_intents`, `audit_log`, `users`, `roles`, `role_permissions`, `user_roles`, `pending_approvals`, `system_state`, `documents`.

**Acceptance criteria:**
- Aurora cluster provisions via CDK
- All tables created with indexes on audit/compliance query patterns (actor, action_type, entity_id, timestamp)
- Migration script is idempotent and versioned
- Connectivity from Lambda via VPC or RDS Proxy confirmed

---

### TASK-F3: Cognito Auth + API Gateway + RBAC
| Field | Value |
|-------|-------|
| Priority | P0 — blocker for all API-connected frontend work |
| SSOT Sections | Section 2H (Backoffice API), Section 1H (Access Control), Section 1I (Kill Switch/Maker-Checker — roles) |
| Agent type | Plan → general-purpose |
| Sub-PRD output | `docs/prd/F3-auth-rbac.md` |
| Blocking | All frontend API integration tasks |

**Scope:** Cognito User Pool + User Groups (BA, DEV, MGMT, ADMIN), API Gateway REST API with JWT authorizer, Lambda authorizer that maps group → allowed routes per the SSOT role table.

**Acceptance criteria:**
- Users in MGMT group can only access `/metrics` and `/audit` (read)
- Users in BA group can access intent, discovery, template, document, audit endpoints
- Users in DEV group have full access
- JWT validation rejects expired/invalid tokens with 401

---

## Phase 1 — Core Data Services

### TASK-I1: Intent DB Service (CRUD + Lifecycle API)
| Field | Value |
|-------|-------|
| Priority | P1 |
| SSOT Sections | Section 2C (Intent DB), Section 1A (Intent Lifecycle), Section 1B (Discovery — staging gate) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/I1-intent-db-api.md` |
| Depends on | TASK-F1, TASK-F3 |
| Unlocks | TASK-R1, TASK-D1, TASK-FE-INTENTS |

**Scope:** Lambda handlers for: intent CRUD (all 3 tiers: drafts/staging/production), promote (staging→prod + S3 snapshot), rollback (restore prior snapshot + re-index trigger), list-versions, search/filter endpoint.

**Acceptance criteria:**
- Promote creates an immutable S3 JSON snapshot and version metadata record in DynamoDB
- Rollback restores production from snapshot and triggers utterance re-index
- Filter supports: name, riskLevel, responseMode, status, environment tier
- All writes emit to audit log

---

### TASK-T1: Template Service API
| Field | Value |
|-------|-------|
| Priority | P1 |
| SSOT Sections | Section 2K (Template Service), Section 1I (Template Management) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/T1-template-service.md` |
| Depends on | TASK-F2, TASK-F3 |
| Unlocks | TASK-FE-ACI-TEMPLATE, TASK-R1 (template serve path) |

**Scope:** Lambda handlers for template CRUD, version history, restore, activate/deactivate, link/unlink intents. Template variable substitution Lambda (called by routing engine at serve time to replace `{{placeholder}}` tokens). Maker-checker enforcement at publish endpoint.

**Acceptance criteria:**
- Publish endpoint creates pending_approval record if action type is maker-checker gated, rather than applying directly
- Version history returns ordered list with content diff summary
- Variable substitution engine replaces all `{{key}}` tokens from provided context map; unresolved tokens are left as-is with a warning log
- All writes emit to audit log

---

### TASK-A1: Audit Log Service
| Field | Value |
|-------|-------|
| Priority | P1 |
| SSOT Sections | Section 1G (Audit Trail), Section 2H (audit middleware), Section 2K (Aurora cold-data) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/A1-audit-service.md` |
| Depends on | TASK-F2, TASK-F3 |
| Unlocks | TASK-FE-AUDIT, compliance sign-off |

**Scope:** Audit middleware Lambda layer (injected into all write API handlers). Audit log CRUD API (read-only: list with filters, export CSV). Aurora `audit_log` table with full-text index on actor, action_type, entity_id, timestamp.

**Events to capture:** intent create/edit/delete/approve/promote/rollback, agent config change, guardrail policy change, template create/edit/publish/restore, document add/remove/update, kill switch activate/deactivate, maker-checker submit/approve/reject/expire, login/logout.

**Acceptance criteria:**
- Every write API call produces an audit record within the same transaction (or compensating write on failure)
- Export endpoint produces valid CSV with all columns
- Filter supports: date range, actor, action_type, entity_id (all combinable)
- Audit records are never deleted (no DELETE endpoint; RBAC blocks it)

---

### TASK-MC1: Maker-Checker & Kill Switch Service
| Field | Value |
|-------|-------|
| Priority | P1 |
| SSOT Sections | Section 2M (Kill Switch & Maker-Checker), Section 1I (Kill Switch & Maker-Checker controls) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/MC1-maker-checker-kill-switch.md` |
| Depends on | TASK-F2, TASK-A1, TASK-F3 |
| Unlocks | TASK-FE-ACI-CONTROLS, TASK-R1 (kill switch integration) |

**Scope:**
- Kill switch: `system_state` table CRUD, `/system/kill-switch` API endpoint (GET state, PUT activate/deactivate). Routing Lambda integration (reads kill switch state with 5s Lambda memory cache).
- Maker-Checker: `pending_approvals` table API (`POST /approvals`, `PUT /approvals/{id}/approve`, `PUT /approvals/{id}/reject`, `GET /approvals?status=pending`). Approval replay service (on approve: re-executes original action payload). SNS notification Lambda on new pending record. EventBridge rule (every 15 min) for auto-expiry.

**Acceptance criteria:**
- Kill switch activation takes effect within 5s (cache TTL) for all new routing requests
- Kill switch activation is single-actor (no maker-checker gate for emergency)
- Approved maker-checker operations are replayed idempotently
- Auto-expire marks records as `expired` and notifies maker via SNS
- All kill switch and maker-checker events appear in audit log

---

## Phase 1 — Document & Indexing Pipeline

### TASK-DOC1: Document Store & Raw Ingestion
| Field | Value |
|-------|-------|
| Priority | P1 |
| SSOT Sections | Section 2L (Document Management & Indexing), Section 1I (Document Management view) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/DOC1-document-store.md` |
| Depends on | TASK-F1, TASK-F2, TASK-F3 |
| Unlocks | TASK-DOC2, TASK-FE-ACI-DOCS |

**Scope:** S3 upload endpoint (pre-signed URL generation), document metadata CRUD (Aurora), soft-delete (marks inactive, triggers de-index event), domain tagging API. `/documents` API endpoints.

**Acceptance criteria:**
- Uploaded documents stored in S3 and metadata record created in Aurora within the same request
- Soft delete marks `indexed_status=inactive` and emits de-index event to indexing queue
- Domain tags are validated against known use cases
- Raw documents are never hard-deleted from S3

---

### TASK-DOC2: Indexing Hub Integration & Embedding Layer
| Field | Value |
|-------|-------|
| Priority | P1 — but blocked on cross-team coordination |
| SSOT Sections | Section 2L (Document Management), Section 2D (Document Store), Section 4 (Vector Store row) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/DOC2-indexing-embedding.md` |
| Depends on | TASK-DOC1, TASK-F1 (OpenSearch provisioning — requires IT approval), external Indexing Hub API access |
| Unlocks | TASK-D1 (discovery pipeline), TASK-G1 (RAG generation), TASK-R1 (utterance indexing) |
| Cross-team | Requires Indexing Hub API spec from external team (14-day buffer built in) |

**Scope:** `DocumentIndexingProvider` interface with External Hub adapter (Phase 1) and stub for in-house adapter (Phase 2). Lambda that subscribes to hub events (or polls) for processed document chunks → calls Bedrock Titan Embeddings → upserts into OpenSearch Serverless. Indexing status updates written back to Aurora document metadata. Hub health polling Lambda.

**Acceptance criteria:**
- Uploading a document eventually results in `indexed_status=indexed` in Aurora (eventual consistency via hub)
- De-index on soft-delete removes document's chunks from OpenSearch by document_id filter
- Hub health API returns status, queue_depth, last_success_at
- Embedding layer is independent of hub provider — can be swapped without changing embedding logic

---

## Phase 1 — AI/ML Services

### TASK-R1: Routing Engine (Embedding-Based, No Custom Training)
| Field | Value |
|-------|-------|
| Priority | P1 |
| SSOT Sections | Section 2A (Routing Engine), Section 4 (DB Design), Section 1F (Chatbot Preview — routing trace) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/R1-routing-engine.md` |
| Depends on | TASK-I1, TASK-DOC2, TASK-MC1 (kill switch read) |
| Unlocks | TASK-FE-PREVIEW, TASK-AG1 |

**Scope:** Routing Lambda: embed incoming query (Bedrock Titan Embeddings) → cosine similarity search in OpenSearch → top intent match → lookup `responseMode` + `riskLevel` + `status` in DynamoDB → check kill switch state (5s cached) → dispatch to: Template path (fetch from Aurora, apply variable substitution) | GenAI path (forward to guardrail adapter + Bedrock agent) | Exclude path (return boilerplate). Emit CloudWatch metric per routing decision. Return routing trace object alongside response.

**Acceptance criteria:**
- Routing decision is deterministic given the same intent DB state
- Kill switch global=true → all requests return template or exclusion; no Bedrock calls
- Routing trace object contains: matched_intent_id, confidence_score, response_mode, agent_id (if GenAI), guardrail_outcome (if GenAI), kill_switch_active
- CloudWatch custom metric emitted per query with dimensions: response_mode, intent_id, agent_id, use_case

---

### TASK-D1: Intent Discovery Pipeline
| Field | Value |
|-------|-------|
| Priority | P1 |
| SSOT Sections | Section 2E (Intent Discovery), Section 1B (AI-Assisted Intent Discovery) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/D1-discovery-pipeline.md` |
| Depends on | TASK-DOC2, TASK-I1 |
| Unlocks | TASK-FE-DISCOVERY |

**Scope:** Discovery Lambda: triggered by BA's "Discover & Sync" action → retrieve document chunks from OpenSearch for selected source documents → Bedrock Claude prompt for structured intent diff generation (new/changed/deleted) with confidence score → store SyncSession + diffs in DynamoDB as `pending` → approve API moves selected diffs to `staging` tier in Intent DB.

**Acceptance criteria:**
- LLM output is validated against expected JSON schema before storage; invalid responses are retried once then marked as failed
- Confidence score (0.0–1.0) is included per diff
- `whatsChanged` field explains new utterances, removed utterances, and response changes in plain English
- Approving a diff creates intent records in `staging` tier (not production)

---

### TASK-G1: AI-Assisted Generation (Utterances + RAG Response)
| Field | Value |
|-------|-------|
| Priority | P1 |
| SSOT Sections | Section 2B (Utterance & Response Generation) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/G1-ai-generation.md` |
| Depends on | TASK-DOC2, TASK-F3 |
| Unlocks | TASK-FE-INTENTS (AI generation buttons) |

**Scope:** Two Lambda endpoints: (1) `POST /generation/utterances` — takes intent name → Bedrock prompt → returns N diverse user phrasings for BA review. (2) `POST /generation/response` — takes intent name + optional document filter → retrieve top-k chunks from OpenSearch → Bedrock RAG prompt → returns grounded draft response. Both are draft-only; output is returned to UI for human review, never auto-saved.

**Acceptance criteria:**
- Utterance generation returns 5–10 diverse phrasings covering different user phrasings of the same intent
- RAG response cites which document chunks were used (source metadata in response)
- Both endpoints complete within 10s (p95); longer calls return 202 with polling endpoint
- No output is auto-persisted; caller must explicitly save via intent CRUD API

---

### TASK-AG1: LLM Agent Framework
| Field | Value |
|-------|-------|
| Priority | P1 — but has cross-team dependency |
| SSOT Sections | Section 2F (LLM Agent Framework), Section 1E (Agent Management) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/AG1-llm-agents.md` |
| Depends on | TASK-R1, TASK-GD1 |
| Cross-team | Requires domain experts to provide system prompt content per agent (8-day buffer) |

**Scope:** Bedrock Agent provisioning (one per domain) via CDK. Agent config stored in DynamoDB (model_id, temperature, max_tokens) + S3 (system prompt). Agent CRUD API (update prompt, update model params, link to intents). Session store (DynamoDB TTL=24h). Agent invoked from routing Lambda when `responseMode=GenAI`.

**Acceptance criteria:**
- Agent config changes take effect on next invocation (no warm cache)
- Session context persists across turns within a session (by session_id)
- Inactive agents return 503 from routing engine, which falls back to exclusion response
- CDK provisions agents without hardcoded model IDs (all configurable)

---

### TASK-GD1: Guardrails Layer (Pluggable Provider)
| Field | Value |
|-------|-------|
| Priority | P1 |
| SSOT Sections | Section 2G (Guardrails Layer), Section 1C (Guardrails Policy Management) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/GD1-guardrails.md` |
| Depends on | TASK-AG1 |
| Unlocks | TASK-FE-GUARDRAILS |

**Scope:** `GuardrailProvider` interface with `BedrockGuardrailsAdapter` (primary). Guardrail Lambda called pre-LLM (input screening) and post-LLM (output screening). Policy config stored in DynamoDB; synced to Bedrock Guardrails API on update via policy CRUD Lambda. GuardrailPolicy CRUD API. CloudWatch metrics per guardrail hit type. SNS alert on high-severity injection detection.

**Acceptance criteria:**
- Changing policy config via API updates Bedrock Guardrail resource within 30s
- GuardrailProvider interface is documented with method signatures so future adapters can be added without changing routing Lambda
- Guardrail block event emits CloudWatch metric with dimensions: block_type (hallucination/injection/topic/word), severity, agent_id, use_case
- High-severity (injection) events trigger SNS within 60s of detection

---

## Phase 1 — Observability

### TASK-OBS1: Observability, Metrics & Cost Tracking
| Field | Value |
|-------|-------|
| Priority | P1 |
| SSOT Sections | Section 2I (Observability), Section 1D (Observability & Analytics) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/OBS1-observability.md` |
| Depends on | TASK-R1, TASK-GD1, TASK-A1 |
| Unlocks | TASK-FE-DASHBOARD |

**Scope:** CloudWatch custom metrics emitted from routing + guardrail Lambdas. Scheduled Lambda (daily) queries Cost Explorer for Bedrock costs tagged by use-case + agent, caches in DynamoDB. Dashboard metrics API: aggregates CW metrics + cost cache into single response for frontend. CloudWatch Alarms → SNS for: fallback rate spike (>10%), guardrail hit spike (>5%), latency spike (p95 > 3s), error rate (>1%).

**Acceptance criteria:**
- Dashboard API returns data within 500ms (served from cache, not live CW query)
- Cost breakdown is accurate to within $0.01 per agent per day
- All 4 alarm types fire on synthetic threshold breach in staging environment
- Per-agent breakdown includes: session_count, fallback_rate, avg_latency_ms, total_cost_usd

---

## Phase 2 — Frontend Integration

### TASK-FE-INTENTS: Connect ActiveIntents Tab to Real API
| Field | Value |
|-------|-------|
| Priority | P2 |
| SSOT Sections | Section 1A, Files to Modify (ActiveIntents.tsx) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/FE1-active-intents.md` |
| Depends on | TASK-I1, TASK-G1 |
| Files | `src/components/ActiveIntents.tsx` |

**Changes:** Replace mock data with API calls. Add `Exclude` response mode option. Add staging/prod environment indicator per intent. Add AI generation buttons (utterances + RAG response draft). Add version history panel. Add maker-checker submission on promote action. Add advanced search/filter (risk level, mode, status).

---

### TASK-FE-DISCOVERY: Connect IntentDiscovery to Pipeline + Staging Gate
| Field | Value |
|-------|-------|
| Priority | P2 |
| SSOT Sections | Section 1B, Files to Modify (IntentDiscovery.tsx) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/FE2-intent-discovery.md` |
| Depends on | TASK-D1 |
| Files | `src/components/IntentDiscovery.tsx` |

**Changes:** Wire "Approve & Deploy" to staging (not live). Add staging→prod promotion step after staging review. Add version history view. Update sync history status to include `staging` state.

---

### TASK-FE-DASHBOARD: Connect ExecutiveDashboard to Metrics API
| Field | Value |
|-------|-------|
| Priority | P2 |
| SSOT Sections | Section 1D, Files to Modify (ExecutiveDashboard.tsx) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/FE3-dashboard.md` |
| Depends on | TASK-OBS1 |
| Files | `src/components/ExecutiveDashboard.tsx` |

**Changes:** Add cost tracking cards (daily cost, cost per 1000 queries, per-agent cost). Add per-agent performance breakdown table. Add use case/project selector. Add PDF export. Wire all charts to real API data (replacing mock data).

---

### TASK-FE-AGENTS: Connect Agents Tab to Agent API
| Field | Value |
|-------|-------|
| Priority | P2 |
| SSOT Sections | Section 1E, Files to Modify (ActiveAgents.tsx) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/FE4-agents.md` |
| Depends on | TASK-AG1 |
| Files | `src/components/ActiveAgents.tsx` |

**Changes:** Add system prompt template editor (full text, monospace). Add model config fields (model_id, temperature, max_tokens). Add intent routing map assignment UI. Add per-agent live metrics panel.

---

### TASK-FE-PREVIEW: Add Routing Trace + Guardrail Test to Chatbot Preview
| Field | Value |
|-------|-------|
| Priority | P2 |
| SSOT Sections | Section 1F, Files to Modify (ChatbotPreview.tsx) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/FE5-preview.md` |
| Depends on | TASK-R1 |
| Files | `src/components/ChatbotPreview.tsx` |

**Changes:** Wire to routing engine (replace keyword-match mock). Show routing trace panel per response (intent matched, confidence, mode, agent, guardrail outcome). Add mode switcher (Template / GenAI / Auto). Add guardrail test mode (send excluded/blocked query, verify response).

---

### TASK-FE-AUDIT: Audit Trail UI Tab
| Field | Value |
|-------|-------|
| Priority | P2 |
| SSOT Sections | Section 1G, Files to Modify (AuditTrail.tsx — new) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/FE6-audit-trail.md` |
| Depends on | TASK-A1 |
| Files | `src/components/AuditTrail.tsx` (new), `src/App.tsx` |

**Changes:** New filterable audit log table. Date range, actor, action type, entity filters. Before/after value diff viewer. CSV export button.

---

### TASK-FE-GUARDRAILS: Guardrails Config UI
| Field | Value |
|-------|-------|
| Priority | P2 |
| SSOT Sections | Section 1C, Files to Modify (GuardrailsConfig.tsx — new) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/FE7-guardrails.md` |
| Depends on | TASK-GD1 |
| Files | `src/components/GuardrailsConfig.tsx` (new), `src/App.tsx` |

**Changes:** New pluggable policy editor. Active provider display. Blocked topics list (add/remove). Denied words list. Sensitivity sliders (hallucination, injection). Test query panel (see if guardrail would block it and why). Exclusion response template editor.

---

### TASK-FE-ACI: Admin Control Interface (ACI) — Kill Switch, Maker-Checker, Template, Document Views
| Field | Value |
|-------|-------|
| Priority | P2 |
| SSOT Sections | Section 1I (all sub-sections), Files to Modify (AdminControlInterface.tsx, TemplateManagement.tsx, DocumentManagement.tsx, MakerCheckerQueue.tsx — all new) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/FE8-aci.md` |
| Depends on | TASK-T1, TASK-MC1, TASK-DOC1, TASK-DOC2 |
| Files | `src/components/AdminControlInterface.tsx` (new), `src/components/TemplateManagement.tsx` (new), `src/components/DocumentManagement.tsx` (new), `src/components/MakerCheckerQueue.tsx` (new), `src/App.tsx` |

**Changes:**
- ACI tab shell with sub-view switcher (Template / Document) + kill switch controls
- Kill switch header indicator (shown across all views when active)
- Template management: table, markdown editor, preview, version history, restore, soft kill
- Document management: table, upload, soft-delete, update, status badge, manual re-index, hub health
- Maker-checker queue: pending approvals list, diff preview, approve/reject with comment

---

### TASK-FE-AUTH: Login + RBAC-Aware Navigation
| Field | Value |
|-------|-------|
| Priority | P2 |
| SSOT Sections | Section 1H (Access Control), Files to Modify (App.tsx) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/FE9-auth.md` |
| Depends on | TASK-F3 |
| Files | `src/App.tsx` |

**Changes:** Cognito-backed login flow. JWT storage and refresh. RBAC-aware tab rendering: MGMT sees only dashboard; BA sees intents/discovery/preview/audit/ACI-template; DEV sees all. User account management UI (admin only).

---

## Phase 3 — QA & Hardening

### TASK-QA1: End-to-End Integration Tests
| Field | Value |
|-------|-------|
| Priority | P3 |
| SSOT Sections | Verification Plan (all 12 tests) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/QA1-integration-tests.md` |
| Depends on | All Phase 1 + 2 tasks |

**Scope:** Automated test suite covering all 12 verification scenarios from the SSOT plan. Focus on: routing trace correctness, intent lifecycle (discover→staging→prod), kill switch bypass of Bedrock, maker-checker replay, audit log completeness, RBAC enforcement.

---

### TASK-QA2: Senior Management Demo Build
| Field | Value |
|-------|-------|
| Priority | P3 |
| SSOT Sections | Section 7 (AWS Buy-In Narrative), Section 1D (Observability) |
| Agent type | general-purpose |
| Sub-PRD output | `docs/prd/QA2-demo.md` |
| Depends on | TASK-FE-DASHBOARD, TASK-FE-PREVIEW |

**Scope:** Curated demo script and realistic mock data for the senior management presentation. Focuses on: cost visibility dashboard, guardrail hit stats, routing trace demo, AWS service highlights, ROI narrative.

---

## Phase 4 — Future (Phase 2 Backlog)

| Task ID | Title | Depends on | Notes |
|---------|-------|-----------|-------|
| TASK-P2-EDGE | On-device ONNX routing (pre-trained model, no training) | TASK-R1 stable | Ship all-MiniLM-L6-v2 as ONNX; S3 model registry; Electron/sidecar integration |
| TASK-P2-INDEXER | In-house document indexing (replace external hub adapter) | TASK-DOC2 | Lambda + Textract + custom chunking; plug in via DocumentIndexingProvider |
| TASK-P2-MULTIUSE | Multi-use-case project selector | TASK-FE-INTENTS, TASK-FE-DASHBOARD | Namespace all data by use_case; add project switcher to UI |
