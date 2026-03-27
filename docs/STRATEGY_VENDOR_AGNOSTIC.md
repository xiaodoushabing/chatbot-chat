# Vendor-Agnostic Strategy: Chatbot Backoffice Platform

> Architecture review + banking-reality roadmap for OCBC retirement planning chatbot admin suite.
> Replaces the "everything is Phase 1" approach with genuine incremental delivery.
> **This version describes architecture in terms of capabilities with vendor options — no single-vendor commitment.**
>
> **Date:** 2026-03-26
> **Author perspective:** Senior Product Manager with software engineering background
> **Audience:** Senior management (business case) + Engineering leads (technical decisions)

---

## Executive Summary

**What exists today:** A fully functional proof-of-concept with 9 tabs demonstrating the complete vision — maker-checker workflows, audit trails, guardrails configuration, intent lifecycle management, AI-assisted discovery, and executive observability. Deployed at Firebase, ready for demonstration.

**What this document proposes:** A realistic 12-month roadmap to move from POC to production, accounting for banking procurement realities, MAS regulatory requirements, and incremental value delivery. Architecture decisions are expressed as **capability requirements** with vendor options — allowing the bank to plug in preferred providers without rearchitecting.

**Core thesis:** *"Unified platform first, AI second."* The governance, audit, and control features are the foundation that unlocks AI safely. This is not an AI project that happens to have governance — it is a governance platform that enables AI.

**Why now:** MAS November 2025 consultation paper on AI governance creates a compliance tailwind. Banks that build AI inventory and lifecycle controls early will have regulatory advantage. OCBC was one of 7 Veritas pilot banks for FEAT principles — this platform operationalizes that work.

**Investment:** ~$300-700/month (Phase 1, no AI) growing to ~$800-2,500/month (Phase 3+, full platform). Infrastructure cost is dwarfed by personnel. Team: 2 people growing to 4 at peak.

---

## Table of Contents

1. [Architecture Review](#part-1-architecture-review)
2. [Revised Architecture](#part-2-revised-architecture)
3. [Capability-to-Vendor Matrix](#part-3-capability-to-vendor-matrix)
4. [Banking Reality Adjustments](#part-4-banking-reality-adjustments)
5. [Phased Roadmap](#part-5-phased-roadmap)
6. [Cost Projections](#part-6-cost-projections)
7. [Risk Register](#part-7-risk-register)
8. [MAS Compliance Mapping](#part-8-mas-compliance-mapping)
9. [Decision Log](#part-9-decision-log)

---

## Part 1: Architecture Review

### 1.1 Decisions That Are Sound (Keep As-Is)

| # | Decision | Why It's Sound | MAS Alignment |
|---|----------|---------------|---------------|
| 1 | **Two-DB strategy (Relational + Key-Value)** | Correct separation: relational DB for ACID-compliant data (audit, templates, approvals), key-value store for sub-millisecond hot-path reads (sessions, cache, kill switch). Industry standard for banking platforms. | MAS TRM 11.1 — data stores must match sensitivity and access patterns |
| 2 | **Auto-scaling managed relational database** | Variable admin-tool traffic (bursty approval storms, bulk audit exports) suits auto-scaling. Avoids over-provisioning. Multi-AZ failover supported. | Financial services best practice — right-sizing for variable workloads |
| 3 | **Maker-checker as first-class citizen** | MAS TRM 9.1.1 mandates segregation of duties. The shared type system (`PendingApproval` in `src/types.ts`) and App.tsx wiring demonstrate the pattern end-to-end. Not an afterthought. | MAS TRM 9.1.1 — "never alone" principle |
| 4 | **Append-only audit log, DELETE revoked at DB level** | Database-enforced immutability via PostgreSQL grants (REVOKE DELETE/UPDATE/TRUNCATE). Not just application-level — correct for banking. | MAS TRM 9.1.3, 12.2.2 — log integrity, minimum 1-year retention |
| 5 | **Immutable object storage for intent snapshots** | COMPLIANCE mode, 7-year retention. Immutability enforced at storage layer (e.g., S3 Object Lock, Azure Immutable Blob). Banking-grade. | MAS TRM 12.2.2 — protected from unauthorized modification |
| 6 | **Token-based DB auth (no passwords)** | Connection proxy with short-lived token generation. No credentials in environment variables. Tokens rotate frequently. | MAS TRM 10.2 — cryptographic controls, no plaintext credentials |
| 7 | **Pluggable provider pattern** | `GuardrailProvider` and `DocumentIndexingProvider` interfaces allow swapping vendors without changing core routing logic. Future-proofs against vendor changes. | Procurement flexibility — avoids vendor lock-in |
| 8 | **RBAC at API Gateway level** | Authorizer function maps identity groups to route permissions. Four roles (BA, DEV, MGMT, ADMIN) with least-privilege per route. Enforcement at gateway layer. | MAS TRM 9.1.1 — least privilege, access by job responsibility |
| 9 | **Separate staging/production environments** | Isolated environments for blast radius containment. IaC stacks parameterized by stage. | Financial services best practice — standard banking practice |
| 10 | **Connection pooler for serverless-to-DB** | Prevents FaaS concurrency spikes from exhausting database `max_connections`. Critical for serverless-to-relational patterns. | Operational resilience |

### 1.2 Decisions That Need Revision

| # | Current Decision | Problem | Recommendation | Impact if Unchanged |
|---|-----------------|---------|---------------|-------------------|
| 1 | **Managed auth as standalone identity source** | Bank almost certainly runs an existing IdP (ADFS, Azure AD, Okta). Designing managed auth as the default means retrofitting SAML/OIDC later requires user migration. | **Make SAML/OIDC federation the default.** Identity broker handles token issuance; bank's IdP handles auth + MFA. | Auth rework mid-project. User migration. MFA duplication. |
| 2 | **External CI/CD for deployment** | Banks typically prohibit source code and secrets transiting external infrastructure. | **Design for cloud-native CI/CD** (within the bank's cloud account) as production pipeline. External CI (e.g., GitHub Actions) only for pre-merge checks — no secrets, no cloud access. | Blocked by bank security at deployment time. |
| 3 | **Key-value store for intent DB** | Filtering by 5 columns (name, risk, mode, status, env) is a relational query pattern. Key-value secondary indexes cover only 2 per index. The ActiveIntents UI already demonstrates multi-column filtering. | **Move intents to relational DB.** Keep key-value store only for: sessions (TTL), cache, kill switch state, denormalized routing lookup (refreshed on promote). | Index proliferation. Scan-based filters. Complex cross-DB joins. |
| 4 | **15+ separate FaaS functions from day one** | 12+ handlers before a single API call works. Each adds cold-start latency, deployment complexity, IAM management. | **Phase 1: single monolith function** with route dispatch. Shared middleware (auth, audit, errors), shared connection pool. Decompose in Phase 2. | 15 cold-start variants. 15 log groups. Debugging nightmare. |
| 5 | **Dedicated vector search service** | Minimum cost of dedicated vector search (e.g., OpenSearch Serverless 4 OCU) = $350-700/month at zero traffic. Disproportionate for admin tool volumes. | **Use DB-native vector extension** (e.g., pgvector, pg_embedding). Zero incremental cost, adequate for <100K vectors. Migrate to dedicated vector service only if latency demands it. | $4,200-8,400/year wasted before the system has users. |

### 1.3 Critical Gaps That Must Be Addressed

| # | Gap | Why It's Critical | Required Action |
|---|-----|-------------------|----------------|
| 1 | **No governance/procurement timeline** | Cloud account provisioning: 2-4 months. AI vendor approval: 3-6 months. Architecture review board: 6-8 weeks. These are hard gates invisible in the current plan. | Add explicit **Governance Track (Phase 0.5)** running in parallel. |
| 2 | **"Everything is Phase 1"** | AGENT_TASKS.md places 15 tasks in Phase 1. When everything is Phase 1, nothing is prioritized. A single developer cannot deliver 15 tasks simultaneously. | **Re-tier genuinely.** Phase 1 = 6 governance tasks. Phase 2 = AI. Phase 3 = AI productivity. |
| 3 | **No data classification** | MAS TRM 11.1 requires data classification before storing data. The architecture stores config data, audit logs, system state, and session data (potentially containing PII) — each with different requirements. | Classify all data types before infrastructure deployment. (See Section 2.5.) |
| 4 | **No DR/BCP** | Banks require disaster recovery and business continuity planning before production. Multi-AZ is specified but there are no RTO/RPO targets, no failover runbook, no backup test procedure. | Define RTO/RPO targets now. Document DR procedures in Phase 4. |
| 5 | **No AI Model Governance** | MAS November 2025 consultation paper requires: AI Inventory, materiality tiering, lifecycle controls, board accountability. The architecture uses LLM services but has no tracking mechanism. | Build **AI Model Registry** into relational DB schema. |
| 6 | **No cost estimation** | Senior management will ask "how much?" — the current plan has zero cost projections. | Include monthly cloud cost estimates per phase. (See Part 6.) |

---

## Part 2: Revised Architecture

### 2.0 High-Level System Architecture

```mermaid
graph TB
    subgraph Users["Users & Roles"]
        BA["Business Analyst\n(intents, templates, discovery)"]
        DEV["Developer / ML Eng\n(agents, guardrails, config)"]
        MGMT["Senior Management\n(dashboard, read-only)"]
        ADMIN_U["Admin\n(users, kill switch, approvals)"]
    end

    subgraph Frontend["React SPA — 9 Tabs"]
        UI["Active Intents | Discovery | Dashboard\nPreview | Agents | Content Library\nGuardrails | Audit Trail | Change Control"]
    end

    subgraph Gateway["API Gateway + Auth"]
        GW["API Gateway\n+ Authorizer (RBAC)"]
        IDB["Identity Broker\n(SAML/OIDC)"]
        IdP["Bank IdP\n(existing)"]
    end

    subgraph Backend["Backend Services (FaaS)"]
        direction TB
        Mono["Monolith API\n(Phase 1: all CRUD)"]
        Routing["Routing Function\n(Phase 2: AI dispatch)"]
        Guard["Guardrail Function\n(Phase 2: safety)"]
    end

    subgraph Data["Data Layer"]
        RDB[("Relational DB\n(auto-scaling)\nIntents · Templates\nAudit · Approvals\n+ vector extension")]
        KV[("Key-Value Store\nSessions · Cache\nKill Switch")]
        ObjStore[("Object Storage\nDocuments\nSnapshots")]
    end

    subgraph AI["AI / LLM Layer (Phase 2+)"]
        LLM["Managed LLM Service\nChat + Embeddings\nGuardrails + Agents"]
    end

    subgraph Monitoring["Observability"]
        Obs["Logs · Metrics\nTracing · Alerts"]
    end

    Users --> Frontend
    Frontend --> GW
    IdP <--> IDB
    IDB --> GW
    GW --> Backend
    Mono --> RDB & KV & ObjStore
    Routing --> KV & RDB & LLM
    Guard --> LLM & KV
    Backend --> Monitoring

    style Frontend fill:#e8eaf6,stroke:#3f51b5
    style Gateway fill:#fce4ec,stroke:#c62828
    style Backend fill:#e3f2fd,stroke:#1565c0
    style Data fill:#e8f5e9,stroke:#2e7d32
    style AI fill:#fff3e0,stroke:#ef6c00
    style Monitoring fill:#f5f5f5,stroke:#616161
```

### 2.1 Data Architecture

```mermaid
graph TB
    subgraph RelDB["Managed Relational DB — All Relational Data"]
        direction TB
        subgraph Moved["Moved from Key-Value Store"]
            intents[intents]
            intent_ver[intent_versions]
            intent_utt[intent_utterances]
        end
        subgraph Existing["Core Tables"]
            templates[templates]
            tmpl_ver[template_versions]
            tmpl_int[template_intents]
            audit[audit_log\n— append-only —]
            approvals[pending_approvals]
            sys_state[system_state]
            users[users / roles / permissions]
            docs_meta[documents / document_domains]
        end
        subgraph New["New"]
            ai_reg[ai_model_registry]
        end
        subgraph Phase2Ext["Phase 2"]
            pgvec[Vector extension\n— utterance embeddings —\n— zero incremental cost —]
        end
    end

    subgraph KVStore["Key-Value Store — Hot-Path Only"]
        direction TB
        sessions[session-store\nTTL = 24h]
        metrics[metrics-cache\nTTL = 48h]
        cost[cost-cache\nTTL = 48h]
        routing_cache[routing-intent-cache\ndenormalized from Relational DB\nrefreshed on promote]
        guardrail[guardrail-policy\nfast reads for LLM screening]
    end

    subgraph ObjStorage["Object Storage"]
        direction TB
        raw_docs[raw-documents\nversioned]
        snapshots[intent-snapshots\nImmutable Lock · 7-year retention]
        onnx[onnx-model-registry\nPhase 2]
    end

    intents -. "promote event" .-> routing_cache
    RelDB -. "snapshots on promote" .-> snapshots

    style RelDB fill:#e8f4fd,stroke:#1a73e8
    style KVStore fill:#fef7e0,stroke:#f9ab00
    style ObjStorage fill:#e8f5e9,stroke:#34a853
    style audit fill:#fce4ec,stroke:#e53935
    style Moved fill:#fff3e0,stroke:#ff9800
    style New fill:#f3e5f5,stroke:#9c27b0
```

**Why intents move to relational DB:**
- Admin UI needs multi-column filtering (risk + mode + status + env) — relational queries
- Templates and intents share foreign-key relationships (junction table)
- Version history needs ordered range queries with ACID guarantees
- Routing engine uses a **denormalized key-value cache** (refreshed on promote) for sub-millisecond reads — best of both worlds

**Why DB-native vector extension replaces dedicated vector search:**
- PostgreSQL-compatible databases support vector extensions natively (zero incremental cost)
- Adequate for <100K utterance vectors at this scale
- Saves $4,200-8,400/year in infrastructure
- Clear migration path to dedicated vector service if volume demands it

### 2.2 Auth Architecture

```mermaid
sequenceDiagram
    participant User as Admin User<br/>(BA / DEV / MGMT / ADMIN)
    participant SPA as React SPA
    participant IdP as Bank IdP<br/>(ADFS / Azure AD / Okta)
    participant Broker as Identity Broker<br/>(SAML/OIDC Token Service)
    participant GW as API Gateway<br/>+ Authorizer Function
    participant API as Monolith API

    User->>SPA: Access app
    SPA->>Broker: Redirect to login
    Broker->>IdP: SAML AuthnRequest / OIDC redirect
    IdP->>User: MFA challenge
    User->>IdP: Authenticate
    IdP->>Broker: SAML Assertion / OIDC tokens<br/>(groups: BA/DEV/MGMT/ADMIN)
    Broker->>SPA: JWT (access + ID tokens)
    Note over Broker: Maps IdP groups<br/>→ platform roles

    SPA->>GW: API request + Bearer JWT
    GW->>GW: Authorizer function:<br/>validate JWT signature,<br/>extract groups,<br/>check RBAC matrix
    alt Authorized
        GW->>API: Forward request + auth context
        API->>GW: Response
        GW->>SPA: 200 OK
    else Forbidden
        GW->>SPA: 403 Role lacks access
    end
```

**RBAC Matrix:**

```mermaid
block-beta
    columns 5
    space:1 BA DEV MGMT ADMIN

    Intents:1 ba_i["R/W"] dev_i["R/W"] mgmt_i["—"] admin_i["R/W"]
    Agents:1 ba_a["—"] dev_a["R/W"] mgmt_a["—"] admin_a["R/W"]
    Guardrails:1 ba_g["Read"] dev_g["R/W"] mgmt_g["—"] admin_g["R/W"]
    Audit:1 ba_au["Read"] dev_au["Read"] mgmt_au["—"] admin_au["Read"]
    Metrics:1 ba_m["Read"] dev_m["Read"] mgmt_m["Read"] admin_m["Read"]
    KillSwitch:1 ba_k["Read"] dev_k["R/W"] mgmt_k["Read"] admin_k["R/W"]
    Users:1 ba_u["—"] dev_u["—"] mgmt_u["—"] admin_u["R/W"]

    style ba_i fill:#c8e6c9
    style dev_i fill:#c8e6c9
    style admin_i fill:#c8e6c9
    style ba_a fill:#ffcdd2
    style mgmt_a fill:#ffcdd2
    style dev_a fill:#c8e6c9
    style admin_a fill:#c8e6c9
    style ba_g fill:#fff9c4
    style dev_g fill:#c8e6c9
    style mgmt_g fill:#ffcdd2
    style admin_g fill:#c8e6c9
    style ba_au fill:#fff9c4
    style dev_au fill:#fff9c4
    style mgmt_au fill:#ffcdd2
    style admin_au fill:#fff9c4
    style ba_m fill:#fff9c4
    style dev_m fill:#fff9c4
    style mgmt_m fill:#fff9c4
    style admin_m fill:#fff9c4
    style ba_k fill:#fff9c4
    style dev_k fill:#c8e6c9
    style mgmt_k fill:#fff9c4
    style admin_k fill:#c8e6c9
    style ba_u fill:#ffcdd2
    style dev_u fill:#ffcdd2
    style mgmt_u fill:#ffcdd2
    style admin_u fill:#c8e6c9
```

**Default posture: SAML/OIDC federation.** The identity broker handles token issuance only — not authentication. The bank's existing IdP handles authentication and MFA. If bank confirms no existing IdP (unlikely for OCBC), fall back to managed-auth-native mode.

### 2.3 Compute Architecture (Progressive Decomposition)

```mermaid
graph LR
    subgraph Phase1["Phase 1 — Monolith"]
        API[backoffice-api]
        MW["Shared Middleware\n· Auth context\n· Audit emission\n· Error handling\n· Connection pool"]
        API --- MW
        R1["/intents/*"]
        R2["/templates/*"]
        R3["/audit/*"]
        R4["/approvals/*"]
        R5["/system/*"]
        R6["/documents/*"]
        R7["/users/*"]
        MW --- R1 & R2 & R3 & R4 & R5 & R6 & R7
    end

    subgraph Phase2["Phase 2 — Extract AI"]
        API2[Monolith API\nunchanged]
        ROUTE[Routing Function\nembedding + vector search\n+ dispatch]
        GUARD[Guardrail Function\npre/post-LLM\nscreening]
    end

    subgraph Phase3["Phase 3 — Extract Productivity"]
        API3[Monolith API]
        ROUTE3[Routing Function]
        GUARD3[Guardrail Function]
        DISC[Discovery\nPipeline]
        GEN[Generation\nutterances + RAG]
    end

    Phase1 -- "decompose\nwhen needed" --> Phase2
    Phase2 -- "decompose\nif needed" --> Phase3

    style Phase1 fill:#e3f2fd,stroke:#1565c0
    style Phase2 fill:#fff3e0,stroke:#ef6c00
    style Phase3 fill:#f3e5f5,stroke:#7b1fa2
```

### 2.4 CI/CD Architecture

```mermaid
graph LR
    subgraph PreMerge["Pre-merge — Source Control"]
        PR[Pull Request] --> Lint[Type check\n+ lint]
        Lint --> UT[Unit tests]
        UT --> Check{Checks\npass?}
    end

    subgraph PostMerge["Post-merge — Cloud-Native CI/CD"]
        Synth[IaC synth/plan] --> Diff[Diff review\nstaging]
        Diff --> DeployStg[Deploy\nstaging]
        DeployStg --> IntTest[Integration\ntests]
        IntTest --> Gate{Manual\napproval}
        Gate -->|approved| DeployProd[Deploy\nproduction]
        Gate -->|rejected| Stop[Stop]
    end

    Check -->|pass| Merge[Merge to main]
    Merge --> Synth

    style PreMerge fill:#f5f5f5,stroke:#9e9e9e
    style PostMerge fill:#e3f2fd,stroke:#1565c0
    style Gate fill:#fff9c4,stroke:#f9a825
    style DeployProd fill:#c8e6c9,stroke:#2e7d32
```

**Decision point:** If bank security approves external CI with OIDC federation (no long-lived credentials), it can handle the full pipeline. If not (likely), cloud-native CI/CD handles all post-merge deployment.

### 2.5 Data Classification

| Data Category | Examples | Sensitivity | Retention | Encryption | Access |
|---------------|---------|-------------|-----------|------------|--------|
| **Chatbot Configuration** | Intents, templates, agent configs, guardrail policies | Internal | Indefinite | AES-256 at rest, TLS in transit | BA, DEV, ADMIN |
| **Audit Logs** | Who changed what, when, before/after state | Confidential | 7 years (MAS) | AES-256, immutable | BA (read), DEV (read), ADMIN (read), Auditors |
| **System State** | Kill switch, feature flags | Internal | Current only | AES-256 | DEV, ADMIN |
| **Session Data** | Conversation history, routing traces | Confidential (may contain PII) | 24 hours (TTL) | AES-256, auto-deleted | System only |
| **Knowledge Documents** | Product guides, policy PDFs | Internal / Confidential | Per document lifecycle | AES-256, versioned | BA, DEV, ADMIN |
| **AI Model Metadata** | Model IDs, versions, risk assessments | Internal | Indefinite | AES-256 | DEV, ADMIN, MGMT (read) |
| **Cost / Metrics** | LLM token usage, query volumes | Internal | 90 days (cache), indefinite (aggregated) | AES-256 | MGMT (read), DEV, ADMIN |

### 2.6 Key Workflow: Maker-Checker (Intent Promotion)

```mermaid
sequenceDiagram
    actor BA as Business Analyst<br/>(Maker)
    participant UI as React SPA
    participant API as Monolith API
    participant DB as Relational DB
    actor Checker as Admin / DEV<br/>(Checker)

    BA->>UI: Edit intent → Submit for approval
    UI->>API: PUT /intents/{id}<br/>+ approval payload
    API->>DB: BEGIN TRANSACTION
    API->>DB: INSERT pending_approvals<br/>(maker_id = BA)
    API->>DB: INSERT audit_log<br/>(action: approval.submit)
    API->>DB: COMMIT
    API->>UI: 200 OK (pendingApproval: true)
    Note over UI: Intent shows "Pending" badge

    Checker->>UI: Open Change Control tab
    UI->>API: GET /approvals?status=pending
    API->>DB: SELECT * FROM pending_approvals
    API->>UI: List of pending items

    alt Approve
        Checker->>UI: Click Approve + add note
        UI->>API: PUT /approvals/{id}/approve
        API->>API: Verify checker ≠ maker
        API->>DB: BEGIN TRANSACTION
        API->>DB: UPDATE pending_approvals SET decision=approved
        API->>DB: Replay original action (promote intent)
        API->>DB: INSERT audit_log (action: approval.approve)
        API->>DB: INSERT audit_log (action: intent.promote)
        API->>DB: COMMIT
        API->>UI: 200 OK
    else Reject
        Checker->>UI: Click Reject + reason
        UI->>API: PUT /approvals/{id}/reject
        API->>DB: UPDATE + INSERT audit_log
        API->>UI: 200 OK
    end
```

### 2.7 Key Workflow: Query Routing (Phase 2)

```mermaid
sequenceDiagram
    participant Customer
    participant GW as API Gateway
    participant Route as Routing Function
    participant KS as Key-Value Store<br/>(Kill Switch)
    participant VEC as Relational DB<br/>(Vector Extension)
    participant Guard as Guardrail Function
    participant Agent as LLM Agent
    participant Tmpl as Relational DB<br/>(Templates)
    participant Obs as Observability

    Customer->>GW: "How do I retire at 65?"
    GW->>Route: Forward query

    Route->>KS: Check kill switch (5s cache)

    alt Kill Switch ACTIVE
        Route->>Tmpl: Fetch fallback template
        Tmpl->>Route: Template response
        Route->>Obs: Emit metric (mode: template, kill_switch: true)
        Route->>GW: Response + routing trace
    else Kill Switch INACTIVE
        Route->>VEC: Embed query (Embedding Model)<br/>→ cosine similarity
        VEC->>Route: Top match: OCBC_Life_Goals_Retirement<br/>confidence: 0.94, mode: GenAI

        alt GenAI Path
            Route->>Guard: Pre-LLM screening
            Guard->>Route: PASSED
            Route->>Agent: Invoke Retirement_Planner_Agent
            Agent->>Route: AI response
            Route->>Guard: Post-LLM screening
            Guard->>Route: PASSED
        else Template Path
            Route->>Tmpl: Fetch template + substitute vars
            Tmpl->>Route: Rendered response
        else Exclude Path
            Route->>Route: Return exclusion boilerplate
        end

        Route->>Obs: Emit metric (intent, mode, agent, latency)
        Route->>GW: Response + routing trace
    end

    GW->>Customer: Response
```

---

## Part 3: Capability-to-Vendor Matrix

This matrix maps each architectural capability to available vendor options. **No vendor is mandated.** Selection should be driven by the bank's existing cloud agreements, security policies, and procurement constraints.

### 3.1 Infrastructure Capabilities

| Capability | Purpose | AWS | Azure | GCP | Self-Hosted / Other |
|-----------|---------|-----|-------|-----|-------------------|
| **Managed Relational DB (auto-scaling)** | ACID data: intents, templates, audit, approvals | Aurora Serverless v2 (PostgreSQL) | Azure SQL Serverless / Azure Database for PostgreSQL Flex | Cloud SQL / AlloyDB | CockroachDB Serverless, Supabase |
| **Key-Value Store (managed, TTL)** | Hot-path: sessions, cache, kill switch | DynamoDB | Cosmos DB | Firestore / Cloud Bigtable | Redis (ElastiCache / Upstash), ScyllaDB |
| **Object Storage (immutable lock)** | Documents, snapshots (7-year retention) | S3 (Object Lock) | Azure Blob (Immutable Policy) | GCS (Retention Lock) | MinIO (Object Lock) |
| **Connection Pooler** | Prevent FaaS concurrency from exhausting DB connections | RDS Proxy | Built-in (Azure SQL) | Alloy DB Proxy / PgBouncer | PgBouncer, ProxySQL |
| **Vector Extension (DB-native)** | Utterance embeddings, similarity search | pgvector (Aurora PostgreSQL) | pgvector (Azure PostgreSQL) | pgvector (Cloud SQL) / AlloyDB AI | pg_embedding, Pinecone, Weaviate |
| **Dedicated Vector Search** | Only if DB-native exceeds latency/volume limits | OpenSearch Serverless | Azure AI Search | Vertex AI Vector Search | Pinecone, Weaviate, Qdrant |

### 3.2 Compute & Networking

| Capability | Purpose | AWS | Azure | GCP | Self-Hosted / Other |
|-----------|---------|-----|-------|-----|-------------------|
| **Serverless Compute (FaaS)** | API handlers, routing, guardrails | Lambda | Azure Functions | Cloud Functions / Cloud Run | Knative, OpenFaaS |
| **API Gateway** | REST API + auth enforcement + rate limiting | API Gateway | Azure API Management | Apigee / Cloud Endpoints | Kong, Traefik |
| **Authorizer Function** | JWT validation + RBAC at gateway level | Lambda Authorizer | Azure AD B2C / APIM Policy | IAP / Custom Middleware | OPA (Open Policy Agent), Casbin |

### 3.3 Identity & Auth

| Capability | Purpose | AWS | Azure | GCP | Self-Hosted / Other |
|-----------|---------|-----|-------|-----|-------------------|
| **Identity Broker (SAML/OIDC)** | Token issuance, IdP federation | Cognito | Azure AD B2C / Entra External ID | Firebase Auth / Identity Platform | Keycloak, Auth0, Okta |
| **Bank IdP (existing)** | Authentication, MFA, group management | — | ADFS / Azure AD | — | Okta, Ping Identity |

### 3.4 AI / LLM

| Capability | Purpose | AWS | Azure | GCP | Self-Hosted / Other |
|-----------|---------|-----|-------|-----|-------------------|
| **Managed LLM (Chat)** | GenAI responses, intent discovery, utterance generation | Bedrock (Claude / Llama) | Azure OpenAI (GPT-4o / o1) | Vertex AI (Gemini) | Anthropic API direct, OpenAI API direct |
| **Managed Embeddings** | Query + utterance embedding for routing | Bedrock (Titan Embeddings) | Azure OpenAI (text-embedding-3) | Vertex AI (Gecko / text-embedding) | Cohere Embed, Voyage AI |
| **Managed Guardrails** | Content filtering, topic blocking | Bedrock Guardrails | Azure Content Safety | Vertex AI Safety | Guardrails AI, NeMo Guardrails |
| **Managed AI Agents** | Domain-specific agent orchestration | Bedrock Agents | Azure AI Agent Service | Vertex AI Agents | LangGraph, CrewAI, custom |

### 3.5 DevOps & Observability

| Capability | Purpose | AWS | Azure | GCP | Self-Hosted / Other |
|-----------|---------|-----|-------|-----|-------------------|
| **Infrastructure as Code** | Reproducible infrastructure | CDK / CloudFormation | Bicep / ARM | Deployment Manager | Terraform, Pulumi, OpenTofu |
| **Cloud-Native CI/CD** | Build, test, deploy within cloud account | CodePipeline + CodeBuild | Azure DevOps Pipelines | Cloud Build | GitLab CI, Jenkins |
| **External CI (pre-merge)** | Lint + type-check + unit tests (no secrets) | GitHub Actions | GitHub Actions | GitHub Actions | GitLab CI, CircleCI |
| **Observability (Logs + Metrics + Traces)** | Monitoring, alerting, debugging | CloudWatch + X-Ray | Azure Monitor + App Insights | Cloud Logging + Cloud Trace | Datadog, Grafana + Loki + Tempo, ELK |
| **Cost Management** | Per-service cost attribution | Cost Explorer + Budgets | Cost Management + Budgets | Billing + Budgets | Kubecost, Infracost |

### 3.6 Vendor Selection Criteria

When choosing vendors for each capability, evaluate against:

1. **Existing bank agreements** — Leverage existing cloud contracts to reduce procurement time
2. **Data residency** — MAS requires data to remain in-jurisdiction (Singapore ap-southeast-1 or equivalent)
3. **Compliance certifications** — SOC 2, ISO 27001, MAS-outsourcing-compatible audit rights
4. **Integration depth** — How well do the chosen services integrate with each other?
5. **Operational maturity** — Bank's existing team expertise reduces ramp-up time
6. **Exit strategy** — How portable is the architecture if vendor must be replaced?

---

## Part 4: Banking Reality Adjustments

### 4.1 The Hidden Critical Path — Procurement Timeline

```mermaid
gantt
    title 12-Month Roadmap with Banking Governance Gates
    dateFormat YYYY-MM
    axisFormat %b

    section Governance
    POC Demo & Buy-in              :milestone, m0, 2026-04, 0d
    Cloud Account Provisioning     :crit, cloud, 2026-04, 2026-07
    AI Vendor Risk Assessment      :crit, ai_risk, 2026-04, 2026-09
    Architecture Review Board      :arb, 2026-06, 2026-08
    Data Classification Sign-off   :dataclass, 2026-05, 2026-06

    section Phase 1 — Governance
    IaC + Relational DB + Auth     :p1a, 2026-06, 2026-07
    Monolith API (Audit + MC)      :p1b, 2026-07, 2026-08
    Intent & Template CRUD         :p1c, 2026-07, 2026-09
    Frontend Integration (4 tabs)  :p1d, 2026-08, 2026-09

    section Phase 2 — AI Layer
    Routing Engine (vector search) :p2a, after ai_risk, 60d
    Guardrails + Agents            :p2b, after ai_risk, 60d
    Document Indexing Pipeline     :p2c, 2026-10, 2026-11
    Frontend Integration (3 tabs)  :p2d, 2026-10, 2026-12

    section Phase 3 — Productivity
    Intent Discovery Pipeline      :p3a, 2026-12, 2027-01
    AI Generation + Observability  :p3b, 2026-12, 2027-02
    Executive Dashboard (real)     :p3c, 2027-01, 2027-02

    section Phase 4 — Go-Live
    VAPT + Pen Testing             :crit, vapt, 2027-02, 2027-03
    DR/BCP + Load Testing          :dr, 2027-02, 2027-03
    CAB Approval                   :milestone, cab, 2027-03, 0d
    Go-Live + Hypercare            :golive, 2027-03, 2027-04
```

**Key dependency:** Phase 2 (AI) cannot start until AI vendor risk assessment completes. Phase 1 (governance) proceeds independently — this is not idle time, it delivers real compliance value.

### 4.2 Intent Lifecycle (Core Business Workflow)

```mermaid
stateDiagram-v2
    [*] --> Draft: BA creates intent
    Draft --> Staging: BA submits for review
    Staging --> Staging: BA edits & tests\nin Chatbot Preview
    Staging --> PendingApproval: BA requests\npromotion to prod
    PendingApproval --> Production: Checker approves
    PendingApproval --> Staging: Checker rejects\n(with reason)
    Production --> PendingApproval: BA requests\nstatus change
    Production --> Rollback: Admin triggers\nrollback
    Rollback --> Production: Restore from\nsnapshot
    Production --> Inactive: Checker approves\ndeactivation

    note right of PendingApproval
        Maker ≠ Checker enforced
        at API level (MAS 9.1.1)
    end note

    note right of Production
        Immutable snapshot created
        on every promotion
        (Object Lock, 7yr)
    end note
```

### 4.3 What the POC Buys You Right Now

The POC is not throwaway work. It serves three purposes:

1. **Immediate (Month 0):** Senior management demo to secure budget and cloud buy-in. Every tab demonstrates a real capability. The mock data tells a coherent story about governance, compliance, and AI-assisted operations.

2. **Medium-term (Months 2-5):** Functional specification for the backend API. Every mock data shape in every component IS the future API response contract. The POC is the spec.

3. **Long-term (Months 5+):** The React SPA becomes the actual production frontend. The Phase 2 frontend tasks wire each component to real APIs — replacing mock data, not rewriting components.

### 4.4 Avoiding the Pilot Trap

Industry data shows 75% of banking chatbot implementations get stuck in siloed pilots. Only 5% deliver measurable P&L impact (MIT, 2025). The strategy to avoid this:

- **Build the platform first, then plug in AI.** The governance, audit, and multi-use-case infrastructure serves retirement planning first, but the architecture (use-case namespacing, pluggable providers) supports loans, cards, wealth without rearchitecture.

- **Each phase delivers a standalone usable system**, not a half-built bridge. Phase 1 alone is a fully compliant intent management + approval system — useful even without AI.

- **Cost visibility from Phase 2 onward.** Management sees per-agent cost attribution, not a single LLM bill. This prevents the "AI is too expensive, kill it" knee-jerk reaction.

---

## Part 5: Phased Roadmap

### Phase Dependency Map

```mermaid
graph LR
    subgraph Phase0["Phase 0"]
        POC[POC Demo\n& Buy-in]
    end

    subgraph Phase05["Phase 0.5 — Governance"]
        CLOUD[Cloud Account\nProvisioning]
        AI_RISK[AI Vendor\nApproval]
        ARB[Architecture\nReview Board]
        DC[Data\nClassification]
    end

    subgraph Phase1["Phase 1 — Foundation"]
        IAC[IaC +\nRelational DB]
        AUTH[Auth +\nRBAC]
        CRUD[Monolith API\nAudit · MC · CRUD]
        FE1_N[Frontend\n4 tabs wired]
    end

    subgraph Phase2["Phase 2 — AI"]
        ROUT[Routing\nEngine]
        GUAR[Guardrails]
        AGEN[Agent\nFramework]
        FE2_N[Frontend\n3 tabs wired]
    end

    subgraph Phase3["Phase 3 — Productivity"]
        DISC[Discovery\nPipeline]
        GEN_N[AI\nGeneration]
        OBS[Observability\nDashboard]
    end

    subgraph Phase4["Phase 4 — Go-Live"]
        VAPT_N[VAPT]
        CAB_N[CAB +\nGo-Live]
    end

    POC --> CLOUD & AI_RISK & DC
    CLOUD --> IAC
    DC --> IAC
    ARB --> IAC
    IAC --> AUTH --> CRUD --> FE1_N
    AI_RISK --> ROUT
    FE1_N --> ROUT & GUAR & AGEN
    ROUT --> FE2_N
    GUAR --> FE2_N
    FE2_N --> DISC & GEN_N & OBS
    OBS --> VAPT_N --> CAB_N

    style Phase0 fill:#e8f5e9,stroke:#2e7d32
    style Phase05 fill:#fff3e0,stroke:#ef6c00
    style Phase1 fill:#e3f2fd,stroke:#1565c0
    style Phase2 fill:#f3e5f5,stroke:#7b1fa2
    style Phase3 fill:#fce4ec,stroke:#c62828
    style Phase4 fill:#f5f5f5,stroke:#616161
```

### Phase 0: Demonstrate Value (Week 0 — NOW)

**Deliverable:** Management buy-in and budget approval.

| Action | Detail |
|--------|--------|
| Demo the POC | Use existing Firebase deployment. Walk through all 9 tabs: maker-checker flow, audit trail, guardrails, intent lifecycle, executive dashboard. |
| Prepare cloud buy-in narrative | Cost projections (Part 6). MAS TRM alignment (Part 8). Build-vs-buy analysis. |
| Start procurement paperwork | Cloud account request to Cloud CoE. AI vendor risk assessment intake form. |
| Identify bank's IdP | Confirm ADFS / Azure AD / Okta. This determines auth architecture. |
| Select cloud vendor | Evaluate against criteria in Section 3.6. Leverage existing bank cloud agreements. |

**Cost:** $0. **Team:** PM + presenter.

---

### Phase 0.5: Governance Track (Months 1-4, PARALLEL with Phase 1 design)

**Deliverable:** All procurement approvals needed for Phase 1 + Phase 2.

| Activity | Owner | Duration | Notes |
|----------|-------|----------|-------|
| Cloud account provisioning | Cloud CoE | 2-4 months | Longest lead item — submit first |
| AI vendor risk assessment | Risk / Compliance | 3-6 months | Gates Phase 2, not Phase 1 |
| Data classification sign-off | Data Governance | 4-6 weeks | Use table in Section 2.5 |
| Architecture review board submission | Architecture team | 6-8 weeks | This document is the input |
| MAS FEAT self-assessment | Compliance | Ongoing | Leverage OCBC's Veritas pilot |
| AI Model Governance framework | Risk / ML team | 4-8 weeks | MAS Nov 2025 requirement |
| IdP federation agreement | IAM / Security | 2-4 weeks | SAML/OIDC metadata exchange |

**Cost:** $0 (governance work, not infrastructure). **Team:** PM + Compliance + Architecture.

---

### Phase 1: Governance Foundation (Months 2-5)

**Gate:** Cloud accounts provisioned.

**Deliverable:** *"Every change is tracked and approved. Business analysts can manage intents and templates. Fully MAS-compliant governance layer."*

| Component | Scope | PRD Reference |
|-----------|-------|--------------|
| IaC scaffolding | Single stack initially. Relational DB + Key-Value Store + Object Storage + API Gateway. | F1 (revised) |
| Relational DB schema | All tables from F2 PRD + intents (moved from key-value store) + AI Model Registry (new). Vector extension enabled. | F2 (expanded) |
| Auth | Identity broker as SAML/OIDC federation. Authorizer function with RBAC. 4 roles. | F3 (revised) |
| Monolith API | Single handler. Routes: `/intents`, `/templates`, `/audit`, `/approvals`, `/system`, `/documents`, `/users`. | New (consolidates I1, T1, A1, MC1, DOC1) |
| Frontend integration | Wire 4 tabs to real API: **Active Intents**, **Content Library**, **Audit Trail**, **Change Control**. Remove mock data. | FE1, FE6, FE8 |

**Not in Phase 1:** Routing engine, AI generation, discovery pipeline, agents, LLM-based guardrails, real-time observability, chatbot preview with real routing. All require AI vendor approval.

**Team:** 1 full-stack developer + 1 DevOps/cloud engineer.
**Monthly cloud cost:** ~$300-700.

---

### Phase 2: Intelligence Layer (Months 5-8)

**Gate:** AI vendor approval completed.

**Deliverable:** *"The chatbot routes customer queries with AI. Guardrails prevent unsafe responses. BAs can preview real routing behavior."*

| Component | Scope | PRD Reference |
|-----------|-------|--------------|
| Routing engine | Embed query (embedding model) → cosine similarity (vector extension) → intent match → dispatch to GenAI / Template / Exclude. Kill switch integration. Routing trace. | R1 |
| Guardrails | Managed guardrails (primary) + application-level rules. Pre-LLM input + post-LLM output screening. | GD1 |
| Agent framework | Managed AI agents (one per domain). Config in key-value store. Session store with 24h TTL. | AG1 |
| Document indexing | Object storage upload → processing → embedding model → vector extension. Status tracking. | DOC2 |
| Key-value routing cache | Denormalized intent lookup for sub-ms routing reads. Refreshed on promote. | New |
| Frontend integration | Wire: **Chatbot Preview**, **Active Agents**, **Guardrails Config**. | FE4, FE5, FE7 |

**Team:** Add 1 ML/AI engineer (total: 2 devs + 1 DevOps).
**Monthly cloud cost:** ~$800-2,000.

---

### Phase 3: AI Productivity + Observability (Months 8-10)

**Deliverable:** *"AI assists BAs in discovering and generating intents. Management has full visibility into cost, performance, and quality."*

| Component | Scope | PRD Reference |
|-----------|-------|--------------|
| Intent Discovery pipeline | Upload docs → LLM extracts intents → generate diffs → review → promote to staging. | D1 |
| AI generation | Utterance generation + RAG response drafting. Draft-only (human review required). | G1 |
| Observability | Custom metrics + cost tracking cache + dashboard API. Per-agent cost attribution. | OBS1 |
| Frontend integration | Wire: **Intent Discovery**, **Executive Dashboard** (real metrics). | FE2, FE3 |
| Vector search evaluation | If routing p95 > 200ms or intent count > 50K → plan migration to dedicated vector service. | Decision point |

**Team:** Same as Phase 2.
**Monthly cloud cost:** ~$1,000-2,500.

---

### Phase 4: Hardening + Go-Live (Months 10-12)

**Deliverable:** *"Production-ready system with MAS compliance documentation."*

| Activity | Detail |
|----------|--------|
| VAPT / penetration testing | External firm. 2-6 weeks + remediation. |
| Performance / load testing | All APIs at 10x expected traffic. DB auto-scaling burst behavior. |
| DR/BCP procedures | Runbooks. DB failover test. Cross-region storage verification. Backup restoration test. |
| MAS TRM compliance package | Map every control to platform component. Exportable audit evidence. |
| MAS FEAT self-assessment | Document fairness, accountability, transparency controls. |
| AI Model Governance | Complete AI Inventory. Materiality assessments for all models used. |
| CAB submission + approval | Change Advisory Board review for production. |
| Go-live + hypercare | 4-week hypercare with on-call rotation. |

**Team:** Add 1 security/compliance consultant (contract, 2-3 months).
**Monthly cloud cost:** ~$1,000-2,500.

---

## Part 6: Cost Projections

### Monthly Cloud Cost by Phase (Vendor-Neutral Estimates)

| Capability | Phase 1 | Phase 2 | Phase 3+ | Notes |
|-----------|---------|---------|----------|-------|
| Managed Relational DB (staging) | $50 | $50 | $50 | Minimum tier, idle |
| Managed Relational DB (prod) | $200-500 | $200-500 | $200-500 | Auto-scaling, variable load |
| Connection Pooler | $50-100 | $50-100 | $50-100 | Per-instance |
| Key-Value Store (on-demand) | $20-50 | $30-80 | $30-80 | Admin tool traffic |
| API Gateway | $10-30 | $20-50 | $20-50 | REST API |
| Serverless Compute (FaaS) | $5-20 | $20-80 | $30-100 | Invocations + duration |
| Object Storage | $5-15 | $10-20 | $10-20 | Documents + snapshots |
| Observability | $20-50 | $30-80 | $30-80 | Logs + metrics + traces |
| LLM (Chat model) | — | $200-1,000 | $200-1,000 | Per-token, volume dependent |
| LLM (Embedding model) | — | $50-200 | $50-200 | Per-embedding call |
| Vector extension (DB-native) | $0 | $0 | $0 | Included in DB cost |
| Dedicated vector search | — | — | $350-700 | Only if DB-native insufficient |
| **TOTAL** | **$300-700** | **$600-2,000** | **$800-2,500** | |

### Cost Distribution at Steady State

```mermaid
pie title Monthly Cloud Cost Distribution — Phase 3+ (Steady State)
    "Relational DB (prod + staging)" : 550
    "LLM (Chat + Embeddings)" : 800
    "Connection Pooler" : 75
    "Key-Value Store" : 55
    "Observability" : 55
    "API Gateway" : 35
    "Serverless Compute" : 65
    "Object Storage" : 15
```

### Annual Summary

| Phase | Monthly Range | Annual Range |
|-------|-------------|-------------|
| Phase 1 (governance, no AI) | $300-700 | $3,600-8,400 |
| Phase 2 (with AI) | $600-2,000 | $7,200-24,000 |
| Phase 3+ (full platform) | $800-2,500 | $9,600-30,000 |

**For management:** Infrastructure cost is $10-30K/year. The dominant cost is personnel. Two developers for 12 months costs significantly more than cloud services.

### Cost Optimization Decisions

| Decision | Annual Saving | Trade-off |
|----------|--------------|-----------|
| DB-native vectors instead of dedicated vector search | $4,200-8,400 | Migrate later if needed |
| Monolith function instead of 15 micro-functions | Fewer cold starts, simpler ops | Decompose in Phase 2 |
| Auto-scaling DB instead of provisioned | ~50% during off-hours | Minimum capacity floor |
| On-demand key-value (not provisioned) | No capacity planning | Slightly higher per-request |

### Team Composition

| Role | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|------|---------|---------|---------|---------|
| Full-stack developer | 1 | 1 | 1 | 1 |
| DevOps / Cloud engineer | 1 | 1 | 1 | 1 |
| ML / AI engineer | — | 1 | 1 | 1 |
| Security consultant (contract) | — | — | — | 1 |
| **Total** | **2** | **3** | **3** | **4** |

---

## Part 7: Risk Register

### Risk Heatmap

```mermaid
quadrantChart
    title Risk Heatmap — Likelihood vs Impact
    x-axis Low Likelihood --> High Likelihood
    y-axis Low Impact --> High Impact
    quadrant-1 Monitor closely
    quadrant-2 Critical — act now
    quadrant-3 Accept
    quadrant-4 Mitigate early
    R1 AI vendor delay: [0.50, 0.80]
    R2 External CI blocked: [0.75, 0.45]
    R3 IdP federation issues: [0.45, 0.50]
    R4 Dev bottleneck: [0.80, 0.75]
    R5 Chatbot liability: [0.20, 0.95]
    R6 MAS AI gap: [0.50, 0.70]
    R7 Scope creep: [0.55, 0.45]
    R8 Vector perf ceiling: [0.20, 0.40]
    R9 No DR at go-live: [0.15, 0.90]
    R10 LLM cost overrun: [0.50, 0.45]
    R11 Vendor lock-in: [0.60, 0.55]
```

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **AI vendor approval delayed >6 months** | Medium | High — blocks all AI features | Phase 1 delivers full governance value without AI. Pluggable provider pattern allows switching vendors (e.g., from one cloud LLM to another, or to direct API). |
| R2 | **Bank blocks external CI for deployment** | High | Medium — CI/CD rearch | Design cloud-native CI/CD as default. External CI for pre-merge only (no secrets). |
| R3 | **IdP federation complications** | Medium | Medium — delays auth | Start IdP discovery in Phase 0 (NOW). Design SAML/OIDC broker as default. |
| R4 | **Single developer bottleneck** | High | High — delivery risk | Genuine re-tiering (6 tasks in Phase 1, not 15). Monolith function reduces scope. Each phase is independently shippable. |
| R5 | **Chatbot liability (Air Canada scenario)** | Low | Critical — legal + regulatory | Guardrails in Phase 2. Kill switch from Phase 1. Template responses for high-risk intents. Maker-checker on all AI changes. Exclusion for sensitive topics. |
| R6 | **MAS AI governance gap** | Medium | High — supervisory | AI Model Registry in Phase 1 schema. FEAT self-assessment in Phase 0.5. OCBC's Veritas pilot is an advantage. |
| R7 | **Scope creep to multi-use-case** | Medium | Medium — delays delivery | Ship retirement planning end-to-end first. Architecture supports multi-use-case (namespacing) but implementation stays single-use-case until Phase 3+. |
| R8 | **Vector search performance ceiling** | Low | Medium — routing latency | Monitor p95. Migration path to dedicated vector service documented. Decision point at Phase 3 end. |
| R9 | **No DR at go-live** | Low (if planned) | Critical | Define RTO/RPO in Phase 1 design. Multi-AZ DB. Cross-region object storage replication. Runbook in Phase 4. |
| R10 | **LLM cost overrun** | Medium | Medium — budget | Per-agent cost attribution. Daily cost cache. Budget alerts. Application-level throttling. Template fallback for cost-sensitive intents. |
| R11 | **Vendor lock-in** | Medium | Medium — migration cost | Pluggable provider interfaces for all AI services. Standard PostgreSQL (portable across all clouds). IaC abstraction via Terraform/Pulumi (multi-cloud). Avoid proprietary APIs where standards exist. |

---

## Part 8: MAS Compliance Mapping

### 8.1 MAS TRM 2021

| MAS TRM Section | Requirement | Platform Component | Phase |
|-----------------|-------------|-------------------|-------|
| **9.1.1** | Segregation of duties, "never alone" | Maker-checker workflow. Self-approval rejected at API level. | 1 |
| **9.1.3** | Audit logging of user activities | Append-only `audit_log`. DELETE/UPDATE revoked at DB level. | 1 |
| **9.1.3** | Privileged users cannot access own logs for tampering | RBAC enforcement. Audit log DELETE revoked for all roles. | 1 |
| **9.1.6** | Encryption of confidential data | AES-256 at rest. TLS in transit. Token-based auth (no passwords). | 1 |
| **11.1** | Data classification and protection | Classification table (Section 2.5). Sensitivity-based controls. | 0.5 |
| **12.2.2** | Log integrity and retention | Immutable object storage (7-year). Audit table immutability. | 1 |
| **11.3.2** | Change management controls | Kill switch + maker-checker + audit. All changes require approval. | 1 |
| **13.1** | Technology risk management | Kill switch (global + per-agent). Guardrails. Routing trace. | 1-2 |
| **10.2** | Cloud outsourcing governance | Separate environments. Data residency (Singapore region). Shared responsibility model. | 0.5 |
| **13.2** | Annual VAPT | Penetration testing + remediation. | 4 |

### 8.2 MAS November 2025 AI Risk Management Consultation

| Requirement | Platform Component | Phase |
|-------------|-------------------|-------|
| **AI Inventory** | `ai_model_registry` table. Tracks: model, provider, purpose, materiality, version. | 1 (schema), 2 (data) |
| **Materiality tiering** | `materiality_tier` field. Retirement chatbot = High (customer-facing). | 2 |
| **Lifecycle controls** | Agent config versioning. System prompts in object storage (versioned). Full audit trail. | 2 |
| **Board accountability** | Executive Dashboard with AI usage, cost, quality metrics. | 3 |
| **Independent validation** | Chatbot Preview (staging-only). Guardrail test mode. Routing trace. | 2 |

### 8.3 FEAT Principles

| Principle | How Addressed | Phase |
|-----------|--------------|-------|
| **Fairness** | Guardrails screen for discriminatory outputs. Templates ensure consistent treatment. | 2 |
| **Ethics** | Maker-checker on all AI changes. Human escalation. Kill switch. AI drafts require human approval. | 1 (governance), 2 (AI) |
| **Accountability** | Full audit trail. Every AI change attributed to a human. AI Model Registry. OCBC remains responsible (Principle 8). | 1 (audit), 2 (registry) |
| **Transparency** | Routing trace shows how queries are handled. Dashboard shows AI usage + cost. Bot discloses it is AI. | 2 (trace), 3 (dashboard) |

---

## Part 9: Decision Log (Requires Stakeholder Input)

These decisions cannot be made by the development team alone.

| # | Decision | Options | Stakeholder | Urgency |
|---|----------|---------|------------|---------|
| D1 | **Cloud vendor** | (a) AWS (b) Azure (c) GCP — evaluate against Section 3.6 criteria | CTO / Cloud CoE | **Phase 0** |
| D2 | **Identity provider** | (a) SAML/OIDC federation with existing IdP *(recommended)* (b) Managed auth standalone | IAM / Security | **Phase 0** |
| D3 | **CI/CD platform** | (a) Cloud-native CI/CD *(recommended for banking)* (b) External CI with OIDC federation | Security team | **Phase 0.5** |
| D4 | **Data classification** | Submit table (Section 2.5) for sign-off | Data Governance | **Phase 0.5** |
| D5 | **AI vendor / model** | (a) Cloud-native LLM service (b) Direct vendor API (c) Self-hosted — see Section 3.4 | Risk / Compliance + ML team | **Phase 0.5** |
| D6 | **Encryption key management** | (a) Cloud-managed keys Phase 1, customer-managed keys Phase 2 *(recommended)* (b) Customer-managed from day one | Security team | **Phase 1** |
| D7 | **Environment isolation** | (a) Separate accounts/subscriptions *(recommended)* (b) Single account with resource-level isolation | Cloud CoE | **Phase 0.5** |
| D8 | **IaC tooling** | (a) Cloud-native IaC (CDK, Bicep) (b) Multi-cloud IaC (Terraform, Pulumi) *(recommended if multi-cloud is possible)* | DevOps / Architecture | **Phase 0.5** |

---

## Appendix A: Existing Asset Inventory

| Asset | Location | Status |
|-------|----------|--------|
| POC React SPA (9 tabs) | `src/components/*.tsx` | Complete, mock data |
| Infrastructure PRD | `docs/prd/F1-infrastructure.md` | Needs revision per this document |
| Database Schema PRD | `docs/prd/F2-aurora-schema.md` | Needs expansion (intents + AI registry) |
| Auth/RBAC PRD | `docs/prd/F3-auth-rbac.md` | Needs revision (SAML/OIDC default) |
| Frontend PRDs (8) | `docs/prd/FE1-FE8*.md` | Complete, backend-ready |
| Master Plan (SSOT) | Tracked separately | Needs re-tiering |
| Task Index | `AGENT_TASKS.md` | Needs re-tiering |

## Appendix B: Files to Modify When Implementing

| File | Change Required | Phase |
|------|----------------|-------|
| `docs/prd/F1-infrastructure.md` | Remove intent-db from key-value store. Add routing-intent-cache. Change CI/CD to cloud-native. Consolidate FaaS roles. Vendor-agnostic service names. | 1 |
| `docs/prd/F2-aurora-schema.md` | Add intents + intent_versions + intent_utterances tables. Add `ai_model_registry`. Enable vector extension. Rename to vendor-neutral where possible. | 1 |
| `docs/prd/F3-auth-rbac.md` | Elevate SAML/OIDC federation to default architecture. Update identity broker config. | 1 |
| `AGENT_TASKS.md` | Re-tier: consolidate Phase 1 to 6 tasks. Move AI to Phase 2. Add Phase 0.5 governance tasks. | 0 |

## Appendix C: Research Sources

- MAS TRM Guidelines (January 2021): Technology risk management framework
- MAS Consultation Paper on AI Risk Management Guidelines (November 2025)
- MAS FEAT Principles (2018) + Veritas Initiative
- Cloud provider FSI reference architectures (AWS FSI Lens, Azure FSI Blueprint, GCP FSI)
- Richmond Fed: AI and Operational Losses in Banking (2025)
- MIT: AI Implementation Success Rates (2025)
- Air Canada v. Moffatt: Chatbot liability case law
