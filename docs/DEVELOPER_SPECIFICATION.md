# Chatbot Backoffice Platform — Developer Technical Specification

> Module architecture, API specification, data model, and build-vs-vendor analysis for engineering teams.
>
> **Date:** 2026-03-27
> **Version:** 1.0
> **Status:** Draft — pending team lead review and signoff
> **Audience:** Engineering team leads, individual developers
> **Related:**
> - [User Functionality Guide](USER_FUNCTIONALITY_GUIDE.md) — what each module does from the user's perspective
> - [Vendor-Agnostic Strategy](STRATEGY_VENDOR_AGNOSTIC.md) — architecture decisions, capability-to-vendor matrix, phased roadmap, MAS compliance mapping

---

## How to Use This Document

1. **Module Overview** (Section 1) — understand the 6 main modules and their dependencies
2. **Module Details** (Section 2) — per-module feature list, build-vs-vendor options, sprint estimates
3. **API Specification** (Section 3) — endpoint listing + detailed schemas for critical flows
4. **Data Model** (Section 4) — entity relationships and key schemas
5. **Integration Points** (Section 5) — external systems and internal module boundaries
6. **Cross-Cutting Concerns** (Section 6) — auth, audit, maker-checker, error handling

> **Sprint estimates** throughout this document are rough ballpark figures for planning purposes (2-week sprints). Actual effort depends on team composition, vendor selection, and integration complexity. These are NOT commitments — they are starting points for team lead estimation.

---

## 1. Module Overview

The platform is decomposed into 6 main modules. Each module has clear boundaries, defined interfaces, and explicit dependencies.

| Module | Submodules | Phase | Description |
|--------|-----------|-------|-------------|
| **M1: Intent Management** | M1.1 CRUD, M1.2 Versioning, M1.3 Promotion, M1.4 Discovery | 1-3 | Full intent lifecycle: create, version, stage, promote, discover |
| **M2: Agent & Routing** | M2.1 Agent Config, M2.2 Routing Engine, M2.3 Preview | 1-2 | AI agent configuration, embedding-based query routing, dual-mode preview (production + personal diff overlay) |
| **M3: Content & Knowledge** | M3.1 Templates, M3.2 Documents, M3.3 Indexing Pipeline | 1-2 | Response templates, knowledge document management, vector indexing |
| **M4: Safety & Guardrails** | M4.1 Policy Config, M4.2 Runtime Engine, M4.3 Kill Switch | 1-2 | Content safety policies, pre/post-LLM screening, emergency controls |
| **M5: Governance & Audit** | M5.1 Maker-Checker, M5.2 Audit Trail, M5.3 RBAC | 1 | Approval workflows, immutable logging, role-based access |
| **M6: Observability** | M6.1 Metrics, M6.2 Cost Intelligence, M6.3 Dashboard API | 2-3 | Query metrics, per-agent cost tracking, aggregated KPIs |

### Module Dependency Graph

```mermaid
graph TD
    M5["M5: Governance & Audit\n(Maker-Checker · Audit · RBAC)"]
    M1["M1: Intent Management\n(CRUD · Versioning · Promotion · Discovery)"]
    M3["M3: Content & Knowledge\n(Templates · Documents · Indexing)"]
    M2["M2: Agent & Routing\n(Config · Routing Engine · Preview)"]
    M4["M4: Safety & Guardrails\n(Policy · Runtime · Kill Switch)"]
    M6["M6: Observability\n(Metrics · Cost · Dashboard)"]

    M5 --> M1 & M2 & M3 & M4
    M1 --> M2
    M3 --> M1 & M2
    M4 --> M2
    M2 --> M6
    M4 --> M6

    style M5 fill:#e3f2fd,stroke:#1565c0
    style M1 fill:#e8f5e9,stroke:#2e7d32
    style M2 fill:#fff3e0,stroke:#ef6c00
    style M3 fill:#e8f5e9,stroke:#2e7d32
    style M4 fill:#fce4ec,stroke:#c62828
    style M6 fill:#f5f5f5,stroke:#616161
```

**Read as:** M5 (Governance) is a dependency of M1, M2, M3, M4 — every module uses maker-checker and audit. M1 (Intents) feeds M2 (Routing). M3 (Content) feeds M1 (template-linked intents) and M2 (knowledge documents for agents). M4 (Guardrails) feeds M2 (runtime screening).

---

## 2. Module Details

### M1: Intent Management

**Purpose:** Full lifecycle management of chatbot intents — from AI-assisted discovery and creation, through editing and maintenance, to production deployment and versioning.

#### Submodules

| ID | Submodule | Description | Phase |
|----|-----------|-------------|-------|
| M1.1 | Intent CRUD (Active Intents) | Read, update, delete existing intents. Multi-column filtering (name, risk, mode, status). Edit utterances (manual), response text, response mode. Toggle status. Per-intent version history + restore. | 1 |
| M1.2 | Per-Intent Versioning | Per-intent change history (who changed what, when). Restore to prior version with approval. Stored in relational DB. | 1 |
| M1.3 | Promotion Pipeline & DB Snapshots (Intent Discovery) | Create new intents (manual + AI). Staging → PendingApproval → Production lifecycle. Batch promotion. DB-level snapshots on each promotion (immutable, 7-year retention). Rollback to prior DB snapshot. | 1 |
| M1.4 | AI-Assisted Discovery (Intent Discovery) | Upload knowledge sources → LLM extracts intents → generate diffs with confidence scores → AI-assisted utterance + response generation → human review → approve to staging. | 3 |

**Key distinction:** M1.1/M1.2 power the **Active Intents** tab (manage existing). M1.3/M1.4 power the **Intent Discovery** tab (create new, promote, snapshot). DB snapshots (M1.3) capture the entire intent database state; per-intent versioning (M1.2) tracks individual intent changes.

#### Feature List

**Active Intents (M1.1/M1.2):**
- Multi-column search and filtering (name, risk level, response mode, status)
- View environment badges (STAGING / PROD) and risk level (High / Low) per intent
- Edit existing intents: name, utterances (manual add/remove), response text
- Response mode selection: GenAI / Template / Exclude per intent (inline or edit modal)
- Toggle intent status (active/inactive) with approval
- Per-intent version history viewing + restore to prior version with approval
- Delete intents (production only) with approval

**Intent Discovery (M1.3/M1.4):**
- Manual intent creation via form (name, utterances, response, response mode)
- AI-powered intent discovery from uploaded documents (PDF, DOCX, URL, folders)
- AI-assisted utterance generation and response drafting
- Diff review: new / modified / deleted intents with confidence scores
- Inline diff editing before acceptance
- Batch approval to staging + batch promotion to production
- DB-level snapshot on each promotion (immutable, Object Lock, 7-year retention)
- Compare staging vs production side-by-side
- Rollback to prior DB snapshot

#### Build vs Vendor

| Capability | Build (Custom) | Vendor Option(s) | Recommendation | Est. Sprints* |
|-----------|---------------|-----------------|----------------|---------------|
| Intent CRUD API | Node/TS + Relational DB (standard REST) | — | Build | ~2 sprints |
| Multi-column filtering & search | SQL WHERE + full-text search | — | Build | ~0.5 sprint |
| Version history + snapshots | DB versioning table + object storage | — | Build | ~1.5 sprints |
| Promotion pipeline (staging → prod) | Custom state machine + maker-checker integration | — | Build | ~1.5 sprints |
| AI utterance generation | LLM API call + prompt engineering | Managed LLM service (see [Vendor Matrix](STRATEGY_VENDOR_AGNOSTIC.md#part-3-capability-to-vendor-matrix)) | Vendor (LLM) + custom prompt | ~1 sprint |
| AI intent discovery | LLM + document parsing + diff algorithm | Custom build on managed LLM | Build (on vendor LLM) | ~3 sprints |
| Immutable snapshot storage | Object storage with compliance lock | See vendor matrix: Object Storage | Vendor service | ~0.5 sprint |

**Total M1 estimate: ~10 sprints** (M1.1-M1.3 in Phase 1: ~5.5 sprints; M1.4 in Phase 3: ~4 sprints)

**Dependencies:** M5 (maker-checker, audit), M3.1 (template linking)

---

### M2: Agent & Routing

**Purpose:** Configure AI agents, route customer queries to the correct agent based on intent matching, and provide a dual-mode preview sandbox.

#### Submodules

| ID | Submodule | Description | Phase |
|----|-----------|-------------|-------|
| M2.1 | Agent Configuration | Edit existing agents: system prompt, model selection, temperature, max tokens, intent routing assignments. Status toggle (active/inactive). Disable agent. No create-agent UI in POC. | 1 (config), 2 (live routing) |
| M2.2 | Query Routing Engine | Embed query → vector similarity search → intent match → dispatch to GenAI / Template / Exclude path. Kill switch integration. Routing trace generation. | 2 |
| M2.3 | Chatbot Preview | Dual-mode preview: **Production** (default) queries against live intent DB; **Personal Diff Overlay** overlays the current user's pending changes on top of production snapshot, computed on-the-fly from `PendingApproval` records (`submittedBy === currentUser`). No shared staging state — each maker sees only their own diffs. Mode override (Auto/Template/GenAI). Guardrail test mode. Routing trace display. | 2 |

#### Feature List

- Agent editing: name, description, category (Wealth, General, Loans, Services, Security), system prompt, model ID, temperature, max tokens
- Intent-to-agent routing table (many-to-one: multiple intents → one agent)
- Agent status toggle (active/inactive) with maker-checker
- Disable agent with maker-checker approval
- Per-agent metrics: sessions handled, error rate, average response time
- Query embedding (embedding model) → cosine similarity (vector extension) → intent match
- Three-way dispatch: GenAI (invoke agent) / Template (fetch template) / Exclude (block response)
- Kill switch check on every route (5-second cache for performance)
- Routing trace: intent matched, confidence %, risk level, mode, agent, guardrail outcome
- Dual-mode preview sandbox:
  - **Production mode** (default): chat interface queries against live production intent DB
  - **Personal Diff Overlay mode**: toggle "Preview My Pending Changes" overlays only the current user's unapproved `PendingApproval` records on top of production snapshot. Computed on-the-fly, never persisted. Each maker sees only their own pending diffs — no shared staging state.
- Mode override (Auto/Template/GenAI) and guardrail test mode available in both preview modes
- Preset quick-action test queries
- v2 considerations: team staging view (checker previews all pending changes), named change sets, conflict detection across makers

#### Build vs Vendor

| Capability | Build (Custom) | Vendor Option(s) | Recommendation | Est. Sprints* |
|-----------|---------------|-----------------|----------------|---------------|
| Agent CRUD API | Node/TS + Relational DB | — | Build | ~1.5 sprints |
| Intent routing table | Junction table + API | — | Build | ~1 sprint |
| Query embedding | LLM embedding API call | Managed LLM Embeddings (see [Vendor Matrix](STRATEGY_VENDOR_AGNOSTIC.md#part-3-capability-to-vendor-matrix)) | Vendor service | ~0.5 sprint |
| Vector similarity search | DB-native vector extension (e.g., pgvector) | Dedicated vector service (Pinecone, Weaviate, etc.) | DB-native first (zero cost) | ~1 sprint |
| Routing engine (dispatch logic) | Custom: embed → match → route → trace | — | Build | ~2 sprints |
| Agent orchestration (GenAI path) | Custom agent invocation | Managed AI Agents (see vendor matrix) | Vendor + custom wrapper | ~2 sprints |
| Chatbot preview sandbox | Custom React component + dual-mode preview API (production default + personal diff overlay via `PendingApproval` records) | — | Build | ~2 sprints |
| Routing trace generation | Custom middleware | — | Build | ~0.5 sprint |

**Total M2 estimate: ~10.5 sprints** (M2.1 config in Phase 1: ~2.5 sprints; M2.2-M2.3 in Phase 2: ~8 sprints)

**Dependencies:** M1 (intents for routing), M3 (templates + documents for responses), M4 (guardrails for screening), M5 (maker-checker, audit)

---

### M3: Content & Knowledge

**Purpose:** Manage response templates (deterministic responses) and knowledge documents (AI retrieval source) that power chatbot responses.

#### Submodules

| ID | Submodule | Description | Phase |
|----|-----------|-------------|-------|
| M3.1 | Template Management | CRUD for markdown response templates with `{{variable}}` placeholders. Version history, intent linking, publish with approval. | 1 |
| M3.2 | Document Management | Upload, tag, and manage knowledge documents (PDF/DOCX/TXT/URL). Domain tagging. Status monitoring. | 1 (upload/metadata), 2 (indexing) |
| M3.3 | Indexing Pipeline | Document chunking → embedding generation → vector storage. Status tracking (pending/indexed/failed/stale). Re-indexing triggers. | 2 |

#### Feature List

- Template CRUD with markdown editor
- Variable extraction from `{{placeholder}}` syntax
- Template-to-intent linking (many-to-many)
- Template preview with sample variable substitution
- Template versioning with restore capability
- Template publish with maker-checker approval
- Document upload: PDF, DOCX, TXT, URL (drag-and-drop)
- Domain tagging: multi-select from defined domains
- Indexing status tracking: Pending → Indexed / Failed / Stale
- Re-index triggers: manual per-document + bulk for all stale/failed
- Document metadata: uploader, date, file size, chunk count
- Activity log for indexing operations

#### Build vs Vendor

| Capability | Build (Custom) | Vendor Option(s) | Recommendation | Est. Sprints* |
|-----------|---------------|-----------------|----------------|---------------|
| Template CRUD + versioning API | Node/TS + Relational DB | — | Build | ~2 sprints |
| Markdown editor (frontend) | Existing textarea (already in POC) | Rich markdown editor (MDXEditor, Tiptap) | Build (basic) or vendor (rich) | ~0.5 sprint |
| Variable extraction + preview | Custom regex parser | — | Build | ~0.5 sprint |
| Document upload + metadata API | Node/TS + object storage SDK | — | Build | ~1.5 sprints |
| Document chunking | Custom (split by section/page) | LangChain text splitters, Unstructured.io | Vendor library | ~1 sprint |
| Embedding generation | LLM embedding API call | Managed Embeddings (see vendor matrix) | Vendor service | ~0.5 sprint |
| Vector storage + retrieval | DB-native vector extension | Dedicated vector service | DB-native first | ~1 sprint |
| Indexing pipeline orchestration | Custom state machine (pending → indexed) | Step Functions / Durable Functions | Build (simple state machine) | ~1.5 sprints |

**Total M3 estimate: ~8.5 sprints** (M3.1-M3.2 metadata in Phase 1: ~4.5 sprints; M3.3 indexing in Phase 2: ~4 sprints)

**Dependencies:** M5 (maker-checker for template publish), M1 (intent linking)

---

### M4: Safety & Guardrails

**Purpose:** Configurable safety layer that screens all AI interactions — before LLM invocation (input screening) and after (output screening). Includes emergency kill switch.

#### Submodules

| ID | Submodule | Description | Phase |
|----|-----------|-------------|-------|
| M4.1 | Policy Configuration | CRUD for guardrail policies: blocked topics, denied words/phrases, exclusion template, sensitivity levels, PII masking toggle. | 1 (config), 2 (live enforcement) |
| M4.2 | Runtime Guardrail Engine | Pre-LLM screening (input) + post-LLM screening (output). Topic blocking, word filtering, hallucination detection, injection detection, PII masking. | 2 |
| M4.3 | Kill Switch | Global kill switch (all GenAI → template fallback). Per-agent kill switch. Activation is immediate; deactivation requires maker-checker. | 1 |

#### Feature List

- Blocked topics CRUD (add/remove from list)
- Denied words/phrases CRUD
- Exclusion response template editor
- Sensitivity level configuration: Hallucination (Off/Low/Medium/High/Strict), Injection (Off/Low/Medium/High/Strict)
- PII masking toggle
- Guardrail test panel: submit test query → see pass/block/flag result
- Guardrail statistics: queries screened, blocks this week
- Pre-LLM screening: topic check, injection detection, denied word filter
- Post-LLM screening: hallucination detection, PII masking, output word filter
- Policy synced to key-value store for fast reads during routing
- Global kill switch: immediate activation, maker-checker deactivation
- Per-agent kill switch
- Kill switch state cached with 5-second TTL for routing performance

#### Build vs Vendor

| Capability | Build (Custom) | Vendor Option(s) | Recommendation | Est. Sprints* |
|-----------|---------------|-----------------|----------------|---------------|
| Policy config API | Node/TS + Relational DB | — | Build | ~1 sprint |
| Blocked topics + denied words engine | Custom keyword matching | — | Build | ~0.5 sprint |
| Exclusion template rendering | Custom (simple template substitution) | — | Build | ~0.25 sprint |
| Pre-LLM input screening | Custom rules + vendor guardrails | Managed Guardrails (see [Vendor Matrix](STRATEGY_VENDOR_AGNOSTIC.md#part-3-capability-to-vendor-matrix)) | Vendor + custom fallback | ~1.5 sprints |
| Post-LLM output screening | Custom rules + vendor guardrails | Managed Guardrails, Guardrails AI, NeMo Guardrails | Vendor + custom rules | ~1.5 sprints |
| Hallucination detection | Vendor guardrail feature | Managed Guardrails, Vectara HHEM | Vendor | ~0.5 sprint (integration) |
| Prompt injection detection | Vendor guardrail feature | Managed Guardrails, Rebuff | Vendor | ~0.5 sprint (integration) |
| PII masking | Regex + vendor NER | Managed Guardrails, Presidio, custom regex | Vendor + custom regex | ~1 sprint |
| Kill switch (global + per-agent) | Custom (key-value store flag + cache) | — | Build | ~1 sprint |
| Guardrail test panel API | Custom (route test query through pipeline) | — | Build | ~0.5 sprint |

**Total M4 estimate: ~8.25 sprints** (M4.1 config + M4.3 kill switch in Phase 1: ~2.75 sprints; M4.2 runtime in Phase 2: ~5.5 sprints)

**Dependencies:** M5 (maker-checker for policy changes), M2 (routing engine integration)

---

### M5: Governance & Audit

**Purpose:** Cross-cutting governance layer. Every write operation in the platform flows through maker-checker approval. Every action is recorded in an immutable audit trail. Access is enforced by role at the API gateway.

#### Submodules

| ID | Submodule | Description | Phase |
|----|-----------|-------------|-------|
| M5.1 | Maker-Checker Engine | Approval queue: submit, list pending, approve/reject. Self-approval prevention (maker ≠ checker). Batch approval support. State machine: pending → approved/rejected. | 1 |
| M5.2 | Audit Trail | Append-only event log. DELETE/UPDATE revoked at DB level. Filter by action type, entity type, actor role, severity, date range. CSV export. Before/after state diffs. | 1 |
| M5.3 | RBAC Enforcement | API gateway authorizer function. JWT validation + group-to-role mapping. Per-route permission matrix. 4 roles: BA, DEV, MGMT, ADMIN. | 1 |

#### Feature List

- Approval submission API (accepts any `ApprovalActionType`)
- Approval listing with filtering (status, action type, submitter)
- Approve with optional note / Reject with required reason
- Self-approval prevention: `checker_id ≠ maker_id` enforced at API level
- Batch approval support (e.g., promote 5 intents at once)
- Cascading audit events on batch approval (one per item)
- Append-only audit log: INSERT only, DELETE/UPDATE/TRUNCATE revoked via DB grants
- Audit event schema: actor, role, action, entity, before/after, severity, timestamp
- Audit filtering: action type, entity type, actor role, severity, date range, free-text search
- Audit pagination (15 per page default)
- CSV export of filtered audit results
- Before/after JSON diffs for configuration changes
- JWT validation at API gateway (signature, expiry, claims)
- IdP group → platform role mapping
- Per-route permission check: method + path + role → allow/deny
- Standardized 403 response for unauthorized access

#### Build vs Vendor

| Capability | Build (Custom) | Vendor Option(s) | Recommendation | Est. Sprints* |
|-----------|---------------|-----------------|----------------|---------------|
| Maker-checker engine | Custom state machine + API | — | Build | ~2 sprints |
| Approval queue API | Node/TS + Relational DB | — | Build | ~1 sprint |
| Self-approval prevention | Custom validation middleware | — | Build | ~0.25 sprint |
| Audit trail API (append-only) | Node/TS + Relational DB + DB-level REVOKE | — | Build | ~1.5 sprints |
| Audit CSV export | Custom (streaming CSV) | — | Build | ~0.5 sprint |
| Before/after diff capture | Custom middleware (snapshot before write) | — | Build | ~0.5 sprint |
| RBAC authorizer function | Custom JWT validation + role matrix | OPA (Open Policy Agent), Casbin | Build (simple matrix) or vendor (complex policies) | ~1.5 sprints |
| IdP federation (SAML/OIDC) | Identity broker configuration | See vendor matrix: Identity Broker | Vendor service + config | ~1 sprint |

**Total M5 estimate: ~8.25 sprints** (all Phase 1)

**Dependencies:** None — M5 is a foundation module that other modules depend on.

---

### M6: Observability

**Purpose:** Collect, aggregate, and expose chatbot operational metrics. Per-agent cost attribution. Executive dashboard data API.

#### Submodules

| ID | Submodule | Description | Phase |
|----|-----------|-------------|-------|
| M6.1 | Metrics Collection | Emit custom metrics on every routed query: intent, mode, agent, latency, guardrail outcome. Aggregate in time-series format. | 2 |
| M6.2 | Cost Intelligence | Track LLM token usage per agent. Calculate cost per 1K queries. Month-over-month trend. Daily cost cache (key-value store, 48h TTL). | 3 |
| M6.3 | Dashboard API | Aggregated KPI endpoint: query volume, satisfaction, trending topics. Per-agent metrics endpoint. Cost intelligence endpoint. | 3 |

#### Feature List

- Custom metric emission per routed query (intent, mode, agent, latency, guardrail result)
- Query volume aggregation by time period (hourly, daily, weekly)
- Customer satisfaction tracking (per-query feedback aggregation)
- Per-agent metrics: sessions handled, fallback rate, average latency, satisfaction
- Trending topic detection (volume spike analysis)
- Per-agent cost tracking: sessions × tokens × token price
- Cost per 1,000 queries calculation
- Month-over-month cost trend
- Daily cost cache in key-value store (48h TTL)
- Intent distribution aggregation (pie chart data)
- Guardrail hit rate breakdown by category
- Kill switch status exposure
- Dashboard data API: `/dashboard/kpis`, `/dashboard/agents`, `/dashboard/costs`

#### Build vs Vendor

| Capability | Build (Custom) | Vendor Option(s) | Recommendation | Est. Sprints* |
|-----------|---------------|-----------------|----------------|---------------|
| Metric emission middleware | Custom (emit on every route) | — | Build | ~1 sprint |
| Metrics aggregation | Custom (scheduled aggregation job) | Observability platform native (see [Vendor Matrix](STRATEGY_VENDOR_AGNOSTIC.md#part-3-capability-to-vendor-matrix)) | Vendor platform + custom queries | ~1.5 sprints |
| Cost tracking | Custom (LLM API usage → per-agent attribution) | Cloud cost management APIs | Build + vendor cost API | ~1.5 sprints |
| Trending topic detection | Custom (volume spike algorithm) | — | Build | ~1 sprint |
| Dashboard data API | Node/TS + cache layer | — | Build | ~1.5 sprints |
| Alerting (threshold-based) | Custom | Observability platform alerts | Vendor | ~0.5 sprint |

**Total M6 estimate: ~7 sprints** (M6.1 in Phase 2: ~1 sprint; M6.2-M6.3 in Phase 3: ~6 sprints)

**Dependencies:** M2 (routing engine emits metrics), M4 (guardrail outcomes), M5 (RBAC for dashboard access)

---

### Sprint Estimate Summary

| Module | Phase 1 | Phase 2 | Phase 3 | Total |
|--------|---------|---------|---------|-------|
| M1: Intent Management | 5.5 | — | 4.0 | 9.5 |
| M2: Agent & Routing | 2.5 | 8.0 | — | 10.5 |
| M3: Content & Knowledge | 4.5 | 4.0 | — | 8.5 |
| M4: Safety & Guardrails | 2.75 | 5.5 | — | 8.25 |
| M5: Governance & Audit | 8.25 | — | — | 8.25 |
| M6: Observability | — | 1.0 | 6.0 | 7.0 |
| **Phase Total** | **23.5** | **18.5** | **10.0** | **52.0** |

> *Estimates assume 2-week sprints with 1 full-stack developer. With 2 developers working in parallel on independent modules, Phase 1 could complete in ~12 sprints (~6 months). These are rough planning figures — refine after team lead review.*

---

## 3. API Specification

### 3.1 Route Overview

All routes are prefixed with `/api/v1`. Authentication via Bearer JWT in the `Authorization` header. Authorizer function validates JWT and checks RBAC before request reaches the handler.

#### Intent Routes (Active Intents — M1.1/M1.2)

| Method | Path | Purpose | Auth Roles | Module | Phase |
|--------|------|---------|-----------|--------|-------|
| GET | `/intents` | List intents (filterable by name, risk, mode, status, env) | BA, DEV, ADMIN | M1.1 | 1 |
| GET | `/intents/{id}` | Get intent detail | BA, DEV, ADMIN | M1.1 | 1 |
| PUT | `/intents/{id}` | Update intent (triggers approval) | BA, DEV, ADMIN | M1.1 | 1 |
| DELETE | `/intents/{id}` | Delete intent (triggers approval, prod only) | BA, DEV, ADMIN | M1.1 | 1 |
| PUT | `/intents/{id}/status` | Toggle active/inactive (triggers approval) | BA, DEV, ADMIN | M1.1 | 1 |
| PUT | `/intents/{id}/response-mode` | Change response mode (triggers approval) | BA, DEV, ADMIN | M1.1 | 1 |
| GET | `/intents/{id}/versions` | List per-intent version history | BA, DEV, ADMIN | M1.2 | 1 |
| POST | `/intents/{id}/rollback` | Restore to prior version (triggers approval) | BA, DEV, ADMIN | M1.2 | 1 |

#### Discovery Routes (Intent Discovery — M1.3/M1.4)

| Method | Path | Purpose | Auth Roles | Module | Phase |
|--------|------|---------|-----------|--------|-------|
| POST | `/discovery/intents` | Manually create new intent (staging) | BA, DEV, ADMIN | M1.3 | 1 |
| POST | `/discovery/sources` | Upload knowledge source | BA, DEV, ADMIN | M1.4 | 3 |
| POST | `/discovery/sessions` | Trigger AI diff generation | BA, DEV, ADMIN | M1.4 | 3 |
| GET | `/discovery/sessions/{id}` | Get session with diffs | BA, DEV, ADMIN | M1.4 | 3 |
| PUT | `/discovery/sessions/{id}/diffs/{diffId}` | Edit a diff inline | BA, DEV, ADMIN | M1.4 | 3 |
| POST | `/discovery/sessions/{id}/approve` | Approve diffs to staging | BA, DEV, ADMIN | M1.4 | 3 |
| POST | `/discovery/promote-batch` | Batch promote staging → production (triggers approval) | BA, DEV, ADMIN | M1.3 | 1 |
| POST | `/discovery/intents/{id}/utterances/generate` | AI-generate utterance suggestions | BA, DEV, ADMIN | M1.4 | 3 |
| POST | `/discovery/intents/{id}/response/draft` | AI-draft response | BA, DEV, ADMIN | M1.4 | 3 |
| GET | `/discovery/snapshots` | List DB-level snapshots | BA, DEV, ADMIN | M1.3 | 1 |
| POST | `/discovery/snapshots/{id}/restore` | Restore to prior DB snapshot (triggers approval) | BA, DEV, ADMIN | M1.3 | 1 |

#### Agent Routes

| Method | Path | Purpose | Auth Roles | Module | Phase |
|--------|------|---------|-----------|--------|-------|
| GET | `/agents` | List agents with metrics | DEV, ADMIN | M2.1 | 1 |
| GET | `/agents/{id}` | Get agent detail + metrics | DEV, ADMIN | M2.1 | 1 |
| PUT | `/agents/{id}` | Update agent config (triggers approval) | DEV, ADMIN | M2.1 | 1 |
| PUT | `/agents/{id}/status` | Toggle active/inactive (triggers approval) | DEV, ADMIN | M2.1 | 1 |
| PUT | `/agents/{id}/routing` | Update intent routing (triggers approval) | DEV, ADMIN | M2.1 | 1 |
| POST | `/agents/{id}/disable` | Disable agent (triggers approval) | DEV, ADMIN | M2.1 | 1 |

#### Template Routes

| Method | Path | Purpose | Auth Roles | Module | Phase |
|--------|------|---------|-----------|--------|-------|
| GET | `/templates` | List templates | BA, DEV, ADMIN | M3.1 | 1 |
| POST | `/templates` | Create template | BA, DEV, ADMIN | M3.1 | 1 |
| GET | `/templates/{id}` | Get template detail + versions | BA, DEV, ADMIN | M3.1 | 1 |
| PUT | `/templates/{id}` | Update template | BA, DEV, ADMIN | M3.1 | 1 |
| POST | `/templates/{id}/publish` | Publish template (triggers approval) | BA, DEV, ADMIN | M3.1 | 1 |
| POST | `/templates/{id}/restore` | Restore prior version (triggers approval) | BA, DEV, ADMIN | M3.1 | 1 |

#### Document Routes

| Method | Path | Purpose | Auth Roles | Module | Phase |
|--------|------|---------|-----------|--------|-------|
| GET | `/documents` | List documents (filterable) | BA, DEV, ADMIN | M3.2 | 1 |
| POST | `/documents` | Upload document | BA, DEV, ADMIN | M3.2 | 1 |
| GET | `/documents/{id}` | Get document metadata | BA, DEV, ADMIN | M3.2 | 1 |
| DELETE | `/documents/{id}` | Deactivate + de-index | BA, DEV, ADMIN | M3.2 | 1 |
| POST | `/documents/{id}/reindex` | Trigger re-indexing | BA, DEV, ADMIN | M3.3 | 2 |
| POST | `/documents/reindex-stale` | Bulk re-index all stale/failed | DEV, ADMIN | M3.3 | 2 |

#### Guardrail Routes

| Method | Path | Purpose | Auth Roles | Module | Phase |
|--------|------|---------|-----------|--------|-------|
| GET | `/guardrails/policy` | Get current guardrail policy | BA, DEV, ADMIN | M4.1 | 1 |
| PUT | `/guardrails/policy` | Update policy (triggers approval) | DEV, ADMIN | M4.1 | 1 |
| POST | `/guardrails/test` | Test query against guardrails | DEV, ADMIN | M4.1 | 2 |

#### Approval Routes

| Method | Path | Purpose | Auth Roles | Module | Phase |
|--------|------|---------|-----------|--------|-------|
| GET | `/approvals` | List approvals (filterable by status) | DEV, ADMIN | M5.1 | 1 |
| GET | `/approvals/{id}` | Get approval detail | DEV, ADMIN | M5.1 | 1 |
| PUT | `/approvals/{id}/approve` | Approve (checker ≠ maker) | DEV, ADMIN | M5.1 | 1 |
| PUT | `/approvals/{id}/reject` | Reject with reason | DEV, ADMIN | M5.1 | 1 |

#### Audit Routes

| Method | Path | Purpose | Auth Roles | Module | Phase |
|--------|------|---------|-----------|--------|-------|
| GET | `/audit` | List audit events (filterable, paginated) | BA, DEV, ADMIN | M5.2 | 1 |
| GET | `/audit/export` | Export filtered results as CSV | BA, DEV, ADMIN | M5.2 | 1 |

#### System Routes

| Method | Path | Purpose | Auth Roles | Module | Phase |
|--------|------|---------|-----------|--------|-------|
| GET | `/system/kill-switch` | Get kill switch status | BA, DEV, MGMT, ADMIN | M4.3 | 1 |
| POST | `/system/kill-switch` | Toggle kill switch | DEV, ADMIN | M4.3 | 1 |
| GET | `/system/health` | Health check | Public | — | 1 |

#### Routing Routes (Chatbot-facing)

| Method | Path | Purpose | Auth Roles | Module | Phase |
|--------|------|---------|-----------|--------|-------|
| POST | `/route` | Route customer query | Service-to-service auth | M2.2 | 2 |
| POST | `/preview/route?include_my_pending=true` | Route query in preview mode. Default (no param or `false`): queries production intent DB only. With `include_my_pending=true`: overlays the authenticated user's pending `PendingApproval` intent changes on top of production snapshot (computed on-the-fly, never persisted). | DEV, BA, ADMIN | M2.3 | 2 |

#### Dashboard Routes

| Method | Path | Purpose | Auth Roles | Module | Phase |
|--------|------|---------|-----------|--------|-------|
| GET | `/dashboard/kpis` | Aggregated KPI data | BA, DEV, MGMT, ADMIN | M6.3 | 3 |
| GET | `/dashboard/agents` | Per-agent performance metrics | BA, DEV, MGMT, ADMIN | M6.3 | 3 |
| GET | `/dashboard/costs` | Cost intelligence data | DEV, MGMT, ADMIN | M6.3 | 3 |

#### User Routes

| Method | Path | Purpose | Auth Roles | Module | Phase |
|--------|------|---------|-----------|--------|-------|
| GET | `/users` | List users | ADMIN | M5.3 | 1 |
| POST | `/users` | Create user | ADMIN | M5.3 | 1 |
| PUT | `/users/{id}` | Update user role | ADMIN | M5.3 | 1 |
| DELETE | `/users/{id}` | Deactivate user | ADMIN | M5.3 | 1 |

---

### 3.2 Detailed Endpoint Schemas

#### 3.2.1 Intent Edit with Maker-Checker — `PUT /intents/{id}`

Updates an intent and creates a pending approval. The change does NOT take effect until approved.

```mermaid
sequenceDiagram
    participant Client as SPA
    participant GW as API Gateway
    participant API as Monolith API
    participant DB as Relational DB
    participant Audit as Audit Log

    Client->>GW: PUT /intents/{id} + Bearer JWT
    GW->>GW: Validate JWT, check role (BA/DEV/ADMIN)
    GW->>API: Forward + auth context
    API->>DB: SELECT intent WHERE id = {id}
    API->>DB: BEGIN TRANSACTION
    API->>DB: INSERT pending_approvals
    API->>DB: INSERT audit_log (approval.submit)
    API->>DB: COMMIT
    API->>Client: 200 OK
```

**Request:**
```json
{
  "name": "OCBC_Life_Goals_Retirement",
  "utterances": [
    "How do I retire at 65?",
    "What is my CPF payout?",
    "Retirement planning options"
  ],
  "response": "Based on your CPF contributions...",
  "responseMode": "GenAI",
  "riskLevel": "low",
  "status": "active"
}
```

**Response (200):**
```json
{
  "intent": {
    "id": "intent-001",
    "name": "OCBC_Life_Goals_Retirement",
    "utterances": ["How do I retire at 65?", "..."],
    "response": "Based on your CPF contributions...",
    "responseMode": "GenAI",
    "riskLevel": "low",
    "status": "active",
    "environment": "staging",
    "updatedAt": "2026-03-27T10:00:00Z",
    "updatedBy": "sarah.chen@ocbc.com"
  },
  "pendingApproval": {
    "id": "approval-042",
    "actionType": "intent.edit",
    "status": "pending",
    "submittedBy": "sarah.chen@ocbc.com",
    "submittedAt": "2026-03-27T10:00:00Z"
  }
}
```

**Error responses:**
- `403` — role lacks write access to intents
- `404` — intent not found
- `409` — intent has a pending approval already (cannot edit while approval pending)

**Side effects:** Creates `PendingApproval` record + `audit_log` event with `actionType: "approval.submit"`.

---

#### 3.2.2 Approval Decision — `PUT /approvals/{id}/approve`

Approves a pending action. Validates that the approver is not the submitter (maker ≠ checker). Executes the original action and creates audit events.

```mermaid
sequenceDiagram
    participant Client as SPA
    participant API as Monolith API
    participant DB as Relational DB

    Client->>API: PUT /approvals/{id}/approve
    API->>DB: SELECT pending_approvals WHERE id = {id}
    API->>API: Verify checker ≠ maker
    API->>DB: BEGIN TRANSACTION
    API->>DB: UPDATE pending_approvals SET status = 'approved'
    API->>DB: Execute original action (e.g., promote intent)
    API->>DB: INSERT audit_log (approval.approve)
    API->>DB: INSERT audit_log (original action)
    Note over API,DB: For batch: N additional audit events
    API->>DB: COMMIT
    API->>Client: 200 OK
```

**Request:**
```json
{
  "note": "Reviewed utterances — aligned with Q2 product update"
}
```

**Response (200):**
```json
{
  "approval": {
    "id": "approval-042",
    "actionType": "intent.edit",
    "status": "approved",
    "actionReviewNote": "Reviewed utterances — aligned with Q2 product update",
    "decidedBy": "admin@ocbc.com",
    "decidedAt": "2026-03-27T11:30:00Z"
  }
}
```

**Rejection variant — `PUT /approvals/{id}/reject`:**
```json
// Request (reason is required)
{ "reason": "Utterance #3 is too vague — please add specificity" }

// Response (200)
{
  "approval": {
    "id": "approval-042",
    "status": "rejected",
    "actionReviewNote": "Utterance #3 is too vague — please add specificity"
  }
}
```

**Error responses:**
- `403` — role cannot approve, or `checker_id === maker_id` (self-approval blocked)
- `404` — approval not found
- `409` — approval already decided (not pending)

**Side effects:** Updates approval status, executes original action (if approved), creates 1+ `audit_log` events. For batch approvals, creates cascading audit events per item.

---

#### 3.2.3 Batch Intent Promotion — `POST /discovery/promote-batch`

Promotes multiple staging intents to production in a single atomic operation. Called from Intent Discovery tab. Creates an immutable DB-level snapshot in object storage.

**Request:**
```json
{
  "intentIds": ["intent-001", "intent-002", "intent-005"],
  "description": "Q2 retirement planning content update",
  "snapshotLabel": "v3-q2-retirement"
}
```

**Response (200):**
```json
{
  "pendingApproval": {
    "id": "approval-050",
    "actionType": "intent.promote_batch",
    "entityName": "Intent Promotion Batch",
    "description": "Q2 retirement planning content update",
    "batchItems": ["intent-001", "intent-002", "intent-005"],
    "status": "pending",
    "submittedBy": "sarah.chen@ocbc.com",
    "submittedAt": "2026-03-27T14:00:00Z"
  }
}
```

**On approval, the system:**
1. Updates each intent's `environment` from `staging` → `production`
2. Creates a new `intent_version` row for each intent
3. Takes an immutable snapshot → object storage with compliance lock (7-year retention)
4. Refreshes the denormalized routing cache in key-value store
5. Creates audit events: 1 × `approval.approve` + N × `intent.promote`

**Error responses:**
- `400` — one or more intent IDs not found or not in staging
- `409` — batch has pending approval already

---

#### 3.2.4 Audit Trail Query — `GET /audit`

Paginated, filterable query of the immutable audit log.

**Query parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `actionType` | string | Filter by action type | `intent.edit` |
| `entityType` | string | Filter by entity type | `intent`, `agent`, `template`, `guardrail`, `system`, `approval` |
| `actorRole` | string | Filter by actor role | `BA`, `DEV`, `ADMIN` |
| `severity` | string | Filter by severity | `info`, `warning`, `critical` |
| `dateFrom` | ISO 8601 | Start date (inclusive) | `2026-01-01T00:00:00Z` |
| `dateTo` | ISO 8601 | End date (inclusive) | `2026-03-27T23:59:59Z` |
| `search` | string | Free-text search (actor, entity name, description) | `sarah` |
| `page` | integer | Page number (1-indexed) | `1` |
| `limit` | integer | Items per page (default 15, max 100) | `15` |

**Response (200):**
```json
{
  "data": [
    {
      "id": "evt-001",
      "timestamp": "2026-03-27T10:00:00Z",
      "actor": "sarah.chen@ocbc.com",
      "actorRole": "BA",
      "actionType": "intent.edit",
      "entityType": "intent",
      "entityId": "intent-001",
      "entityName": "OCBC_Life_Goals_Retirement",
      "description": "Updated 3 utterances and response text",
      "before": { "utterances": ["How do I retire?"] },
      "after": { "utterances": ["How do I retire?", "What is my CPF payout?", "Retirement planning options"] },
      "severity": "info"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 15,
    "total": 247,
    "totalPages": 17
  }
}
```

**Export variant — `GET /audit/export`:** Same query parameters, returns `Content-Type: text/csv` with headers: ID, Timestamp, Actor, Role, Action Type, Entity Type, Entity ID, Entity Name, Description, Severity.

---

#### 3.2.5 Guardrail Policy Update — `PUT /guardrails/policy`

Updates guardrail policy configuration. Triggers maker-checker approval.

**Request:**
```json
{
  "blockedTopics": ["Cryptocurrency", "Tax Avoidance", "Competitor Products"],
  "deniedWords": ["guaranteed returns", "risk-free", "no risk"],
  "exclusionTemplate": "I'm sorry, I'm not able to assist with that topic. Please contact our customer service team at 1800-363-3333.",
  "hallucinationLevel": "High",
  "injectionLevel": "Strict",
  "piiMasking": true
}
```

**Response (200):**
```json
{
  "policy": {
    "blockedTopics": ["Cryptocurrency", "Tax Avoidance", "Competitor Products"],
    "deniedWords": ["guaranteed returns", "risk-free", "no risk"],
    "exclusionTemplate": "I'm sorry, I'm not able to assist with that topic...",
    "hallucinationLevel": "High",
    "injectionLevel": "Strict",
    "piiMasking": true,
    "updatedAt": "2026-03-27T15:00:00Z"
  },
  "pendingApproval": {
    "id": "approval-055",
    "actionType": "guardrail.policy_change",
    "status": "pending"
  }
}
```

**Side effects:** Creates `PendingApproval` + audit event. On approval, syncs policy to key-value store cache for fast reads by runtime guardrail engine.

---

#### 3.2.6 Kill Switch Toggle — `POST /system/kill-switch`

**Activate** (immediate, no approval needed):
```json
// Request
{ "action": "activate", "reason": "Unusual chatbot responses detected — investigating" }

// Response (200)
{
  "killSwitch": { "active": true, "activatedAt": "2026-03-27T16:00:00Z", "activatedBy": "admin@ocbc.com", "reason": "Unusual chatbot responses detected" }
}
```

**Deactivate** (requires maker-checker approval):
```json
// Request
{ "action": "deactivate", "reason": "Root cause identified and resolved — safe to resume AI routing" }

// Response (200)
{
  "killSwitch": { "active": true },
  "pendingApproval": {
    "id": "approval-060",
    "actionType": "system.kill_switch_deactivate",
    "status": "pending"
  }
}
```

Note: Kill switch remains **active** until approval completes. The `active: true` in the deactivation response confirms this — the deactivation is pending, not executed.

**Side effects:**
- Activate: Immediately updates key-value store flag. Creates `audit_log` event with `severity: "critical"`. All subsequent queries routed to template fallback.
- Deactivate: Creates `PendingApproval` + `audit_log` event. Kill switch stays active until checker approves.

---

## 4. Data Model

### 4.1 Entity Relationship Diagram

```mermaid
erDiagram
    intents ||--o{ intent_versions : "has versions"
    intents ||--o{ intent_utterances : "has utterances"
    intents }o--o{ templates : "linked via template_intents"
    intents }o--o{ agents : "routed via agent_intent_routing"

    templates ||--o{ template_versions : "has versions"

    agents ||--o{ agent_intent_routing : "routes intents"

    documents ||--o{ document_domains : "tagged with"

    pending_approvals }o--|| users : "submitted by"
    audit_log }o--|| users : "acted by"

    intents {
        uuid id PK
        string name
        string response
        enum response_mode "GenAI | Template | Exclude"
        enum risk_level "high | low"
        enum status "active | inactive"
        enum environment "staging | production"
        timestamp created_at
        timestamp updated_at
        uuid created_by FK
        uuid updated_by FK
    }

    intent_versions {
        uuid id PK
        uuid intent_id FK
        int version_number
        jsonb snapshot
        string snapshot_s3_key
        uuid promoted_by FK
        timestamp promoted_at
    }

    intent_utterances {
        uuid id PK
        uuid intent_id FK
        string utterance_text
        vector embedding "pgvector"
    }

    templates {
        uuid id PK
        string name
        text content_markdown
        string variables "extracted from content"
        enum status "draft | published"
        timestamp updated_at
        uuid updated_by FK
    }

    template_versions {
        uuid id PK
        uuid template_id FK
        int version_number
        text content_markdown
        string change_description
        uuid changed_by FK
        timestamp changed_at
    }

    agents {
        uuid id PK
        string name
        string description
        enum category "Wealth | General | Loans | Services | Security"
        text system_prompt
        string model_id
        float temperature
        int max_tokens
        enum status "active | inactive"
        boolean kill_switch
        timestamp updated_at
    }

    agent_intent_routing {
        uuid agent_id FK
        uuid intent_id FK
    }

    documents {
        uuid id PK
        string filename
        enum file_type "pdf | docx | txt | url"
        string uploader
        timestamp uploaded_at
        enum indexed_status "pending | indexed | failed | stale"
        timestamp last_indexed_at
        int chunk_count
        float file_size_kb
        boolean is_active
    }

    document_domains {
        uuid document_id FK
        string domain
    }

    pending_approvals {
        uuid id PK
        enum action_type "ApprovalActionType"
        string entity_name
        uuid entity_id
        text description
        text detail
        uuid submitted_by FK
        timestamp submitted_at
        enum status "pending | approved | rejected"
        text review_note
        jsonb batch_items
    }

    audit_log {
        uuid id PK
        timestamp event_timestamp
        string actor
        enum actor_role "BA | DEV | ADMIN"
        enum action_type "AuditActionType"
        enum entity_type "intent | agent | template | guardrail | system | approval"
        uuid entity_id
        string entity_name
        text description
        jsonb before_state
        jsonb after_state
        enum severity "info | warning | critical"
        uuid batch_id
    }

    guardrail_policy {
        uuid id PK
        jsonb blocked_topics
        jsonb denied_words
        text exclusion_template
        enum hallucination_level "Off | Low | Medium | High | Strict"
        enum injection_level "Off | Low | Medium | High | Strict"
        boolean pii_masking
        timestamp updated_at
    }

    system_state {
        string key PK
        jsonb value
        timestamp updated_at
    }

    users {
        uuid id PK
        string email
        string name
        enum role "BA | DEV | MGMT | ADMIN"
        boolean is_active
        timestamp created_at
    }

    ai_model_registry {
        uuid id PK
        string model_id
        string provider
        string purpose
        enum materiality_tier "High | Medium | Low"
        string version
        uuid approved_by FK
        timestamp approved_at
        timestamp last_assessment_date
    }
```

### 4.2 Key Design Decisions

- **`audit_log`** — DELETE, UPDATE, and TRUNCATE are revoked at the database level via PostgreSQL grants. This is not application-level enforcement — it is database-enforced immutability.
- **`intent_utterances.embedding`** — vector column using DB-native vector extension (e.g., pgvector). Used for cosine similarity search during query routing.
- **`intent_versions.snapshot_s3_key`** — pointer to immutable snapshot in object storage with compliance lock (7-year retention).
- **`pending_approvals.batch_items`** — JSONB array supporting batch operations (e.g., promote 5 intents at once). Each batch item generates its own audit event on approval.
- **Chatbot Preview — no staging database.** The preview's "Personal Diff Overlay" mode does not use a separate staging database. Instead, it queries production intents and overlays the current user's pending `PendingApproval` records (filtered by `submitted_by === currentUser`, `status === 'pending'`, and intent-related `action_type` values) on the fly. The overlay is computed at request time and never persisted. This means each maker sees only their own proposed changes in preview — there is no shared staging state.
- **`ai_model_registry`** — required by MAS November 2025 AI consultation paper. Tracks what AI models are used, for what purpose, and their risk assessment status.

---

## 5. Integration Points

```mermaid
graph TD
    subgraph External["External Systems"]
        IdP["Bank IdP\n(SAML/OIDC)"]
        LLM["Managed LLM Service\n(Chat + Embeddings)"]
        GuardSvc["Managed Guardrails\n(Content Safety)"]
        ObjStore["Object Storage\n(Documents + Snapshots)"]
        ObsPlatform["Observability Platform\n(Logs + Metrics + Traces)"]
    end

    subgraph Platform["Chatbot Backoffice Platform"]
        GW["API Gateway\n+ Authorizer"]
        API["Monolith API\n(Phase 1)"]
        RouteF["Routing Function\n(Phase 2)"]
        GuardF["Guardrail Function\n(Phase 2)"]
    end

    subgraph Data["Data Layer"]
        RDB[("Relational DB\n+ Vector Extension")]
        KV[("Key-Value Store\n(Cache + Sessions)")]
    end

    IdP <-->|"SAML/OIDC\nfederation"| GW
    GW -->|"JWT + RBAC"| API & RouteF & GuardF

    API -->|"CRUD"| RDB
    API -->|"cache reads"| KV
    API -->|"snapshots"| ObjStore

    RouteF -->|"embed query"| LLM
    RouteF -->|"similarity search"| RDB
    RouteF -->|"routing cache"| KV
    RouteF -->|"invoke agent"| LLM

    GuardF -->|"content screening"| GuardSvc
    GuardF -->|"policy cache"| KV

    API -->|"logs + metrics"| ObsPlatform
    RouteF -->|"routing traces"| ObsPlatform

    style External fill:#f5f5f5,stroke:#616161
    style Platform fill:#e3f2fd,stroke:#1565c0
    style Data fill:#e8f5e9,stroke:#2e7d32
```

### Integration Summary

| Integration | Protocol | Direction | Auth | Phase |
|-------------|----------|-----------|------|-------|
| Bank IdP ↔ Identity Broker | SAML 2.0 / OIDC | Bidirectional | Federation trust | 1 |
| SPA → API Gateway | HTTPS + JWT Bearer | Client → Server | JWT validation | 1 |
| API → Relational DB | TCP (PostgreSQL wire protocol) | Server → DB | Token-based (no passwords) | 1 |
| API → Key-Value Store | HTTPS | Server → Store | IAM / service credentials | 1 |
| API → Object Storage | HTTPS | Server → Storage | IAM / service credentials | 1 |
| Routing Function → LLM (Embeddings) | HTTPS | Server → AI | API key / IAM | 2 |
| Routing Function → LLM (Chat) | HTTPS | Server → AI | API key / IAM | 2 |
| Guardrail Function → Managed Guardrails | HTTPS | Server → AI | API key / IAM | 2 |
| All Functions → Observability | Agent / SDK | Server → Monitoring | Auto-configured | 1 |

---

## 6. Cross-Cutting Concerns

### 6.1 Authentication and Authorization

**Flow:** Bank IdP → Identity Broker (SAML/OIDC) → JWT issued → API Gateway validates JWT → Authorizer function checks RBAC.

**JWT Claims (expected):**
```json
{
  "sub": "user-uuid",
  "email": "sarah.chen@ocbc.com",
  "cognito:groups": ["BA"],  // or custom claim per IdP
  "exp": 1711540800,
  "iss": "https://identity-broker.example.com"
}
```

**Authorizer logic (pseudocode):**
```
1. Validate JWT signature against JWKS endpoint
2. Check token expiry
3. Extract groups/role from claims
4. Look up route permission: RBAC_MATRIX[method][path][role]
5. If allowed → forward request with auth context header
6. If denied → return 403
```

**Auth context header** (injected by authorizer, trusted by API):
```
X-Auth-User-Id: user-uuid
X-Auth-User-Email: sarah.chen@ocbc.com
X-Auth-User-Role: BA
```

See [Vendor-Agnostic Strategy, Section 3.3](STRATEGY_VENDOR_AGNOSTIC.md#33-identity--auth) for identity broker vendor options.

### 6.2 Audit Logging

Every write operation emits an audit event. This is implemented as shared middleware in the monolith API.

**What gets logged:**
- All approval submissions, approvals, and rejections
- All intent mutations (create, edit, delete, toggle, promote, rollback)
- All agent configuration changes and status changes
- All template publishes and restores
- All guardrail policy changes
- All kill switch activations and deactivations

**Audit event schema** (from `src/types.ts`):
```typescript
interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;              // email of the person
  actorRole: 'BA' | 'DEV' | 'ADMIN';
  actionType: AuditActionType; // 17 distinct types
  entityType: 'intent' | 'agent' | 'template' | 'guardrail' | 'system' | 'approval';
  entityId: string;
  entityName: string;
  description: string;
  before?: Record<string, unknown>;  // state before change
  after?: Record<string, unknown>;   // state after change
  severity: 'info' | 'warning' | 'critical';
  batchId?: string;           // links batch items
  batchItems?: string[];      // for batch operations
}
```

**Database enforcement:** `REVOKE DELETE, UPDATE, TRUNCATE ON audit_log FROM api_role;` — no application code can modify or delete audit records.

**Retention:** 7 years minimum (MAS TRM 12.2.2). Immutable snapshots in object storage with compliance lock.

### 6.3 Maker-Checker Enforcement

**11 action types requiring approval:**

| Action Type | Entity | Severity |
|------------|--------|----------|
| `intent.toggle_status` | Intent | info |
| `intent.edit` | Intent | info |
| `intent.rollback` | Intent | warning |
| `intent.promote_batch` | Intent | critical |
| `agent.config_change` | Agent | warning |
| `agent.status_change` | Agent | info |
| `agent.kill_switch` | Agent | critical |
| `guardrail.policy_change` | Guardrail | warning |
| `template.publish` | Template | warning |
| `template.restore` | Template | warning |
| `system.kill_switch_deactivate` | System | critical |

**API-level enforcement:**
```
// On approval attempt:
if (approval.submittedBy === request.userId) {
  return 403: "Self-approval is not permitted (MAS TRM 9.1.1)"
}
```

**Transaction pattern:**
```sql
BEGIN;
  INSERT INTO pending_approvals (...) VALUES (...);
  INSERT INTO audit_log (...) VALUES (...);  -- approval.submit event
COMMIT;
```

On approval:
```sql
BEGIN;
  UPDATE pending_approvals SET status = 'approved', ...;
  -- Execute original action (e.g., UPDATE intents SET environment = 'production')
  INSERT INTO audit_log (...) VALUES (...);  -- approval.approve event
  INSERT INTO audit_log (...) VALUES (...);  -- original action event
  -- For batch: INSERT N additional audit events
COMMIT;
```

### 6.4 Error Handling

**Standardized error response format:**
```json
{
  "error": {
    "code": "SELF_APPROVAL_BLOCKED",
    "message": "You cannot approve your own submission (MAS TRM 9.1.1)",
    "status": 403,
    "timestamp": "2026-03-27T10:00:00Z",
    "requestId": "req-abc123"
  }
}
```

**Common error codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Role lacks required permission |
| `SELF_APPROVAL_BLOCKED` | 403 | Checker cannot be the maker |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT_PENDING_APPROVAL` | 409 | Resource has pending approval — cannot modify |
| `CONFLICT_ALREADY_DECIDED` | 409 | Approval already approved/rejected |
| `VALIDATION_ERROR` | 400 | Request body validation failure |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

**Observability:**
- All errors logged with `requestId` for tracing
- 5xx errors trigger alerts
- Structured logging (JSON) for all requests: method, path, status, latency, userId, role
