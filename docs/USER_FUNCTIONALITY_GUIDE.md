# Chatbot Backoffice Platform — Functionality Guide

> A unified admin control interface for managing AI chatbot intents, agents, guardrails, and compliance.
>
> **Date:** 2026-03-27
> **Version:** 1.0
> **Audience:** Senior Management (executive summary) | Product & Tech Leads (detailed walkthroughs)
> **Related:** [Vendor-Agnostic Strategy](STRATEGY_VENDOR_AGNOSTIC.md) for architecture and compliance details

---

## 1. Executive Overview

### What This Platform Is

A **governance-first admin control interface** for managing an AI-powered customer-facing chatbot. It provides Technical BAs with a controlled workspace to configure the chatbot, with management and admin oversight, and view-only access for general business staff and developers:

- Define and manage what the chatbot knows (intents, templates, knowledge documents)
- Configure how the chatbot responds (AI agents, routing rules, response modes)
- Control what the chatbot is allowed to say (guardrails, blocked topics, sensitivity levels)
- Monitor how the chatbot performs (query volume, cost per agent, customer satisfaction)
- Enforce compliance at every step (maker-checker approvals, immutable audit trail, emergency kill switch)

### Why It Matters

Every configuration change to a customer-facing AI chatbot in a regulated bank must be **tracked, approved, and auditable**. This platform ensures:

- **No change goes unreviewed** — maker-checker approval on all writes (MAS TRM 9.1.1)
- **No action goes unrecorded** — immutable audit trail with 7-year retention (MAS TRM 12.2.2)
- **AI can be stopped via kill switch** — global kill switch (with maker-checker approval) falls back to safe template responses
- **Cost is visible** — per-agent cost attribution prevents budget surprises

### Platform at a Glance

- **9 functional modules** across 3 domains
- **5 user roles** with least-privilege access (1 maker, 3 reviewers/viewers, 1 admin)
- **12 approval action types** requiring maker-checker sign-off
- **Full audit trail** of every system action

```mermaid
graph TD
    subgraph Makers["Makers (write access)"]
        TBA["Technical BA"]
    end

    subgraph Reviewers["Reviewers (approve/reject)"]
        TBA2["Technical BA (peer)"]
        MGMT["Senior Management"]
        ADMIN["Administrator"]
    end

    subgraph Viewers["Viewers (read-only)"]
        BA["Business Analyst"]
        DEV["Developer"]
    end

    subgraph Platform["Chatbot Backoffice Platform"]
        CM["Content Management"]
        AI_OPS["AI Operations"]
        GOV["Governance &\nObservability"]
    end

    Chatbot["Customer-Facing\nChatbot"]

    Makers --> Platform
    Reviewers --> Platform
    Viewers -.->|read-only| Platform
    Platform --> Chatbot

    style Platform fill:#e3f2fd,stroke:#1565c0
    style Chatbot fill:#e8f5e9,stroke:#2e7d32
```

---

## 2. Platform Modules

The 9 modules are organized into three functional domains. Every write operation flows through the maker-checker approval system, and every action is recorded in the audit trail.

```mermaid
graph LR
    subgraph Content["Content Management"]
        AI_TAB["Active Intents"]
        ID_TAB["Intent Discovery"]
        CL_TAB["Content Library\n(Templates + Documents)"]
    end

    subgraph Operations["AI Operations"]
        AG_TAB["Active Agents"]
        GR_TAB["Guardrails Config"]
        CP_TAB["Chatbot Preview"]
    end

    subgraph Governance["Governance & Observability"]
        ED_TAB["Executive Dashboard"]
        AT_TAB["Audit Trail"]
        CC_TAB["Change Control"]
    end

    ID_TAB -- "discovered intents" --> AI_TAB
    AI_TAB -- "intent routing" --> AG_TAB
    CL_TAB -- "templates" --> AI_TAB
    CL_TAB -- "knowledge docs" --> AG_TAB
    GR_TAB -- "safety policies" --> CP_TAB
    AG_TAB -- "agent config" --> CP_TAB
    AI_TAB -- "live intents" --> CP_TAB

    AI_TAB -. "all writes" .-> CC_TAB
    AG_TAB -. "all writes" .-> CC_TAB
    GR_TAB -. "all writes" .-> CC_TAB
    CL_TAB -. "all writes" .-> CC_TAB

    CC_TAB -. "every action" .-> AT_TAB
    CP_TAB -- "metrics" --> ED_TAB

    style Content fill:#e8f5e9,stroke:#2e7d32
    style Operations fill:#fff3e0,stroke:#ef6c00
    style Governance fill:#e3f2fd,stroke:#1565c0
```

---

## 3. Module Walkthroughs

### 3.1 Active Intents — *Manage existing intents*

**Primary users:** Technical BA (edit) | BA, DEV (view-only)

An intent represents a customer question the chatbot can handle (e.g., "How do I retire at 65?"). This module manages **existing intents** — editing their configuration, monitoring their status, and maintaining per-intent version history. New intent creation and production promotion happen in Intent Discovery (Section 3.2).

**What users can do:**
- Filter and search intents by name, risk level, response mode, and status
- View status badges per intent (PENDING or PROD)
- View risk level per intent (High or Low) with visual indicators
- Edit existing intents: name, utterances (add/remove manually), response text
- Select response mode per intent: **GenAI** (AI-generated), **Template** (fixed text), or **Exclude** (blocked topic) — via inline toggle or edit modal
- Toggle intent status (active/inactive) — requires maker-checker approval
- View per-intent version history (who changed what, when)
- Restore to a prior version — requires maker-checker approval
- Delete intents (production intents only) — requires maker-checker approval

**Key workflow:**

1. Technical BA filters intents by risk level or response mode to find the intent to update
2. Technical BA opens the intent edit modal → modifies utterances or response text
3. Technical BA selects the appropriate response mode (GenAI / Template / Exclude)
4. Technical BA saves changes → change is submitted for approval
5. Checker reviews and approves or rejects in Change Control
6. Audit trail records every step; per-intent version history updated

**Business value:** Provides a centralized view of all chatbot intents with filtering and risk visibility. Per-intent version history enables rollback if a change causes issues — without affecting other intents.

```mermaid
flowchart TD
    A[Filter & Find\nIntent to Update] --> B[Edit Intent\nUtterances · Response · Mode]
    B --> C[Submit Change\nfor Approval]
    C --> D{Checker Decision}
    D -->|Approved| E[Change Applied\n+ Version Recorded]
    D -->|Rejected| F[Returned with\nFeedback]
    E --> G[Audit Trail\nRecorded]

    H[View Version\nHistory] --> I[Restore Prior\nVersion]
    I --> C

    style E fill:#c8e6c9,stroke:#2e7d32
    style F fill:#ffcdd2,stroke:#c62828
```

> [Screenshot: Active Intents — intent list with environment badges, risk indicators, and filter panel]

---

### 3.2 Intent Discovery — *Create, discover, and promote intents*

**Primary users:** Technical BA (edit) | BA, DEV (view-only)

The primary workflow for adding new intents and promoting them to production. Supports two paths: **AI-powered discovery** (upload documents and let AI identify intents) and **manual creation** (create intents directly). Also manages DB-level snapshots — immutable copies of the entire intent database at each production deployment.

**What users can do:**
- Upload knowledge sources: PDF, DOCX, URL, or folder
- Trigger AI-powered discovery to detect new, modified, and deleted intents with confidence scores (TBD)
- Manually create new intents via the "New Intent" form (name, utterances, response, response mode)
- Use AI-assisted generation for both utterances and response drafting
- Review and edit diffs inline before accepting (modify utterances, responses)
- Approve selected diffs as pending changes (individually or batch)
- Compare pending changes vs production side-by-side
- Batch promote pending intents to production — requires checker approval
- View **DB-level version snapshots** (v1, v2, v3) — each snapshot captures the entire intent database state at promotion time
- Restore to a prior DB snapshot (rollback entire database state) — requires approval

**Key workflow:**

1. Technical BA uploads new/updated product document (e.g., revised retirement planning guide)
2. System generates intent diffs: "3 new intents detected, 2 modified, 1 deleted" with confidence scores
3. Technical BA reviews each diff — edits utterances and responses inline (with AI-assisted suggestions)
4. Technical BA accepts selected diffs → intents saved as pending changes
5. Technical BA tests in Chatbot Preview using "Preview My Pending Changes" mode (overlays only this user's pending changes on top of production — other makers' pending changes are excluded)
6. Technical BA submits batch promotion to production
7. Checker approves; system creates immutable DB snapshot (Object Lock, 7-year retention)

**Business value:** Reduces manual effort to keep chatbot knowledge current. When product policies change, AI identifies which intents need updating — instead of manually comparing documents line by line. DB-level snapshots provide a safety net: if a batch promotion causes issues, the entire database can be rolled back to the prior state.

```mermaid
flowchart TD
    subgraph Create["Two Paths to New Intents"]
        A1[Upload Knowledge\nSource] --> B[AI Generates\nIntent Diffs]
        A2[Manual Creation\nvia New Intent Form] --> C
    end

    B --> C[Review & Edit\nUtterances + Responses\nAI-assisted]
    C --> D[Save as\nPending Changes]
    D --> E[Test in\nChatbot Preview]
    E --> F[Submit Batch\nPromotion]
    F --> G{Checker Decision}
    G -->|Approved| H[Production Updated\n+ DB Snapshot Created]
    G -->|Rejected| I[Return to\nPending Changes]

    J[View DB\nSnapshots] --> K[Restore Prior\nSnapshot]
    K --> F

    style H fill:#c8e6c9,stroke:#2e7d32
    style Create fill:#f5f5f5,stroke:#9e9e9e
```

> [Screenshot: Intent Discovery — diff review panel with confidence scores, AI suggestions, and DB snapshot history]

---

### 3.3 Executive Dashboard — *Operational intelligence and monitoring*

**Primary users:** All roles (read-only) | MGMT's primary view

Real-time operational view of chatbot performance, cost, and health. Designed for management reporting and operational monitoring.

**What users can do:**
- Filter by time period (7 days / 30 days) and project domain (All Projects / Retirement Planner / Investment Advisor / Loan Eligibility / ...)
- View KPI cards: total query volume, customer satisfaction trend, trending topics
- Review per-agent performance: sessions handled, fallback rate, latency, satisfaction sparklines
- Analyze cost intelligence: per-agent cost, cost per 1,000 queries, month-over-month trend
- Monitor intent distribution (pie chart) and guardrail metrics (queries screened, blocks, injection attempts)
- Check kill switch status at a glance
- Export data as CSV
- Navigate directly to Intent Discovery ("Generate New Intent" button) or Active Intents ("View Active Intents" button)

**Key workflow:**

1. Management opens dashboard → views KPI hero card (e.g., "340% spike in OCBC 360 queries")
2. Selects project domain filter → narrows to Retirement Planner
3. Drills into agent performance table → identifies high-fallback agent
4. Reviews cost intelligence → confirms budget is on track
5. Checks guardrail metrics → notes increase in blocked queries
6. Exports data for monthly reporting

**Business value:** Gives management visibility into AI operations without requiring technical knowledge. Per-agent cost attribution prevents the "AI is too expensive, shut it down" reaction by showing exactly where costs originate.

```mermaid
flowchart LR
    A[Select Time Period\n& Domain] --> B[View KPI\nHero Cards]
    B --> C[Review Agent\nPerformance]
    C --> D[Analyze Cost\nIntelligence]
    D --> E[Check Guardrail\nHit Rates]
    E --> F[Export for\nReporting]

    style B fill:#e3f2fd,stroke:#1565c0
```

> [Screenshot: Executive Dashboard — KPI cards, agent performance table, cost intelligence]

---

### 3.4 Chatbot Preview — *Test before you ship*

**Primary users:** Technical BA (test + preview pending changes) | BA, DEV (view-only)

A dual-mode preview environment that runs against the **live production intent database** by default. Users can toggle a personal diff overlay to preview their own pending (unapproved) changes on top of production — without affecting other users or requiring a shared staging environment.

**Two preview modes:**

| Mode | What it runs against | When to use |
|------|---------------------|-------------|
| **Production** (default) | Live production intent DB, agents, and guardrails | Verify current production behavior, reproduce customer issues, test guardrail rules |
| **Preview My Pending Changes** (toggle) | Production + the current user's pending (unapproved) changes overlaid | Test your own changes before they are approved and promoted |

The "Preview My Pending Changes" mode overlays **only the current user's** pending changes. Other makers' pending changes are excluded — each user sees a clean preview of what production would look like if their changes alone were approved. A banner indicates how many pending changes are being previewed (e.g., "Previewing 3 pending changes by you").

This per-user overlay design avoids the staging concurrency problem where multiple makers editing a shared staging environment simultaneously would create a messy, unreliable preview.

**What users can do:**
- Type test queries into a simulated chat interface
- Use quick-action preset queries for common test scenarios
- Toggle between Production and "Preview My Pending Changes" modes
- Override response mode: Auto (normal routing), Template-only, or GenAI-only
- Enable guardrail test mode to simulate injection detection and topic blocking
- View detailed routing trace per message: intent matched, confidence %, risk level, response mode, agent invoked, guardrail outcome, kill switch status
- Observe kill switch behavior (when active, all GenAI disabled)

**Key workflow:**

1. Technical BA types test query: "How do I retire at 65?"
2. System shows routing trace: Intent = `Retirement_Planning`, Confidence = 94%, Mode = GenAI, Agent = `Retirement_Planner`
3. Technical BA toggles to Template mode → same query returns fixed template response
4. Technical BA enables guardrail test mode → types injection attempt → system blocks it
5. Technical BA verifies kill switch behavior → when kill switch is active, all queries fall back to templates
6. Technical BA toggles "Preview My Pending Changes" → banner shows "Previewing 2 pending changes by you" → retests queries to validate pending intent edits behave as expected

**Business value:** Running against production by default ensures the preview reflects real customer experience. The per-user pending changes overlay lets makers validate their own work without coordinating with other makers or polluting a shared staging environment. The routing trace provides explainability — essential for regulatory inquiries about how the chatbot handles specific queries.

```mermaid
sequenceDiagram
    actor Tester as Technical BA
    participant UI as Chat Interface
    participant Toggle as Mode Toggle
    participant Router as Routing Engine
    participant Guard as Guardrails
    participant Agent as AI Agent

    Tester->>Toggle: Select mode:<br/>Production or Preview My Pending Changes
    Toggle-->>UI: Load intent DB<br/>(production ± user's pending diffs)
    Tester->>UI: Type test query
    UI->>Router: Route query
    Router->>Router: Match intent\n(confidence: 94%)
    Router->>Guard: Pre-LLM screening
    Guard-->>Router: PASSED
    Router->>Agent: Invoke agent
    Agent-->>Router: AI response
    Router->>Guard: Post-LLM screening
    Guard-->>Router: PASSED
    Router->>UI: Response + routing trace
    UI->>Tester: View response\n+ full trace details
```

> [Screenshot: Chatbot Preview — chat interface with routing trace expanded and pending changes banner]

---

### 3.5 Active Agents — *View / Configure (TBD) AI agent behavior*

**Primary users:** Technical BA (edit) | ADMIN (edit + approve) | BA, DEV (view-only)

Manages the AI agents that generate responses for GenAI-mode intents. Each agent has a system prompt, model configuration, and assigned intents.

The level of access to agent configuration is TBD. Two possible routes:

#### Route A: View-Only (with activation toggle)

**What users can do:**
- View all agents with status, category, session count, and performance metrics (error rate, avg response time)
- Toggle agent status (active/inactive) — requires maker-checker approval
- Disable an agent — requires maker-checker approval
- Monitor per-agent metrics: sessions handled, error rate, average response time

Agent configuration (system prompt, model parameters, intent routing) is **managed by the development team** and deployed via code/config pipelines. Technical BAs can activate/deactivate agents but cannot modify their behavior.

**Key workflow:**

1. Technical BA views agent list → identifies underperforming agent (high error rate)
2. Technical BA toggles agent to inactive → submitted for approval
3. Checker approves → agent deactivated, intents fall back to template responses
4. Development team investigates and fixes the agent configuration via deployment
5. Technical BA re-activates agent → submitted for approval → checker approves

```mermaid
flowchart TD
    A[View Agent List\n+ Performance Metrics] --> B{Issue Detected?}
    B -->|Yes| C[Toggle Agent\nInactive]
    C --> D[Submit for\nApproval]
    D --> E{Checker Decision}
    E -->|Approved| F[Agent Deactivated\nFallback to Templates]
    E -->|Rejected| G[Remains Active]
    F --> H[Dev Team Fixes\nvia Deployment]
    H --> I[Re-activate\nAgent]
    B -->|No| J[Continue\nMonitoring]

    style F fill:#ffcdd2,stroke:#c62828
    style J fill:#c8e6c9,stroke:#2e7d32
```

#### Route B: Fully Configurable

**What users can do:**
- Everything in Route A, plus:
- Edit agent configuration: name, description, category, system prompt, model selection, temperature, max tokens
- Edit intent routing: select which intents are routed to this agent (checkbox list)

Technical BAs have full control over agent behavior. Changes go through maker-checker approval before taking effect.

**Key workflow:**

1. Technical BA selects an existing agent to configure (e.g., "Retirement_Planner")
2. Technical BA edits system prompt and tunes model parameters (temperature, max tokens)
3. Technical BA updates intent routing — assigns or unassigns intents
4. Technical BA submits configuration change for approval
5. Checker approves → agent config updated
6. Technical BA monitors performance metrics → adjusts if error rate is high

```mermaid
flowchart TD
    A[Select Agent\nto Configure] --> B[Edit System Prompt\n+ Model Parameters]
    B --> C[Update Intent\nRouting]
    C --> D[Submit for\nApproval]
    D --> E{Checker Decision}
    E -->|Approved| F[Config Updated]
    E -->|Rejected| G[Revise Config]
    F --> H[Monitor Metrics\nError Rate · Response Time]
    H -->|Issues| I[Adjust Config\n→ Re-approve]

    style F fill:#c8e6c9,stroke:#2e7d32
```

**Business value:** Both routes separate agent availability from intent management. Route A is safer (agent behavior is code-controlled), while Route B gives Technical BAs faster iteration without waiting for developer deployments.

> [Screenshot: Active Agents — agent list with metrics and configuration panel]

---

### 3.6 Content Library — *Templates and knowledge documents*

**Primary users:** Technical BA (edit) | BA, DEV (view-only)

Two-part module managing (a) response templates used for Template-mode intents, and (b) knowledge documents that feed the AI's understanding.

#### Templates

- Create and edit markdown templates with `{{variable}}` placeholders
- Link templates to specific intents
- Preview template with sample variable substitution
- Publish templates with version control (requires approval)
- Restore prior template versions

#### Documents

- Upload knowledge documents (PDF, DOCX, TXT, URL)
- Assign domain tags (Retirement Planning, Home Loans, etc.)
- Monitor indexing status: Pending → Indexed → or Failed/Stale
- Trigger re-indexing for stale or failed documents
- Bulk re-index operations

**Key workflow (Templates):**

1. Technical BA drafts template: "Your projected payout is {{payout_amount}} starting at age {{retirement_age}}"
2. Technical BA links template to intent "CPF_Payout_Inquiry"
3. Technical BA submits for publish → Checker approves → template goes live
4. When intent matches in Template mode, variables are substituted from context

**Key workflow (Documents):**

1. Technical BA uploads updated product brochure PDF
2. Technical BA assigns domain tag "Retirement Planning"
3. System indexes document (chunks + embeds for AI retrieval)
4. Status moves from Pending → Indexed
5. AI agents can now reference this document in GenAI responses

**Business value:** Templates provide deterministic, safe responses for high-risk intents (guaranteed consistency). Documents keep the AI's knowledge base current without retraining.

```mermaid
flowchart LR
    subgraph Templates["Template Track"]
        T1[Draft Template\nwith Variables] --> T2[Link to\nIntents]
        T2 --> T3[Publish\nfor Approval]
        T3 --> T4[Template\nGoes Live]
    end

    subgraph Documents["Document Track"]
        D1[Upload\nDocument] --> D2[Assign Domain\nTags]
        D2 --> D3[Auto-Index\nChunk + Embed]
        D3 --> D4[Available for\nAI Retrieval]
    end

    style Templates fill:#e8f5e9,stroke:#2e7d32
    style Documents fill:#e3f2fd,stroke:#1565c0
```

> [Screenshot: Content Library — template editor with variable preview and document list with indexing status]

---

### 3.7 Guardrails Config — *Safety policy management*

**Primary users:** Technical BA (edit) | ADMIN (edit + approve) | BA, DEV (view-only)

Configures the safety layer that screens all AI interactions. Prevents the chatbot from discussing blocked topics, using denied phrases, or generating hallucinated/unsafe content.

**What users can do:**
- Add/remove blocked topics (e.g., "Cryptocurrency", "Tax Avoidance", "Competitor Products")
- Add/remove denied words and phrases (e.g., "guaranteed returns", "risk-free")
- Edit the exclusion response template (what the chatbot says when a topic is blocked)
- Adjust sensitivity levels for hallucination detection: Off / Low / Medium / High / Strict
- Adjust sensitivity levels for prompt injection detection: Off / Low / Medium / High / Strict
- Toggle PII masking on/off
- Test queries against guardrail rules and see pass/block/flag results
- View guardrail stats: queries screened, blocks this week
- Trigger full re-index of knowledge documents (for stale/failed documents)

**Key workflow:**

1. Compliance flags that chatbot should not discuss competitor products
2. Technical BA adds "Competitor Products" to blocked topics
3. Technical BA tests: types "How does DBS savings compare?" → guardrail blocks it
4. Technical BA submits policy change for approval
5. Checker approves → policy goes live
6. All future queries mentioning competitors return the exclusion template response

**Business value:** Prevents the chatbot from creating liability (Air Canada scenario). Configurable sensitivity levels allow fine-tuning the balance between safety and usability.

```mermaid
flowchart TD
    A[Configure Policies\nBlocked Topics · Denied Words\nSensitivity · PII Masking] --> B[Test Against\nSample Queries]
    B --> C{Test Result}
    C -->|PASSED| D[Adjust if\nToo Permissive]
    C -->|BLOCKED| E[Confirm\nCorrect Behavior]
    C -->|FLAGGED| F[Review and\nFine-tune]
    E --> G[Submit Policy\nChange for Approval]
    G --> H{Checker Decision}
    H -->|Approved| I[Policy Live]

    style I fill:#c8e6c9,stroke:#2e7d32
```

> [Screenshot: Guardrails Config — blocked topics list, sensitivity sliders, and test panel]

---

### 3.8 Audit Trail — *Immutable compliance record*

**Primary users:** All roles (read-only) | Compliance/Auditors

A read-only, immutable log of every action taken in the platform. Cannot be modified or deleted — enforced at the database level. Designed for MAS TRM 9.1.3 compliance.

**What users can do:**
- View chronological log of all system actions
- Filter by: action type, entity type (intent/agent/template/guardrail/system/approval), actor role (TBA/MGMT/ADMIN/BA/DEV), severity (info/warning/critical)
- Search by actor name, entity name, or description
- Set date range for targeted investigation
- Expand events to view before/after state diffs (for configuration changes)
- Paginate through results (15 per page)
- Export filtered results as CSV for compliance reporting

**Key workflow:**

1. Compliance officer needs to audit all guardrail changes in the last quarter
2. Filters: Entity Type = "Guardrail", Date Range = last 3 months
3. Reviews each event — expands to see before/after policy state
4. Exports as CSV → attaches to MAS compliance report

**Business value:** Satisfies MAS TRM requirement for immutable audit logging with minimum 7-year retention. Every action is attributed to a specific person and role — no anonymous changes possible.

```mermaid
flowchart LR
    A[All System\nActions] --> B[Append-Only\nAudit Log]
    B --> C[Filter & Search\nby Type · Role · Severity\n· Date Range]
    C --> D[Expand Event\nBefore/After Diffs]
    D --> E[Export CSV\nfor Compliance]

    style B fill:#fce4ec,stroke:#c62828
```

> [Screenshot: Audit Trail — filtered event list with expanded before/after diff]

---

### 3.9 Change Control — *Approval queue and emergency controls*

**Primary users:** Technical BA (approve/reject) | MGMT (approve/reject) | ADMIN (approve/reject + kill switch)

The central approval hub. All maker-checker items across the entire platform flow here. Also houses the global kill switch for emergency AI shutdown.

**What users can do:**
- View pending approval queue (all actions awaiting checker decision)
- Review change details: what changed, who submitted, when, and why
- Approve pending actions with optional review note
- Reject pending actions with mandatory rejection reason
- Submit kill switch activation / deactivation (requires maker-checker approval before taking effect)
- View recent decisions (last 5 approved/rejected items)
- Monitor kill switch status bar (red alert when active)

**Key workflow (Approval):**

1. Admin opens Change Control → sees 3 pending approvals
2. Reviews first item: "Promote batch of 5 intents to production" submitted by BA
3. Examines the batch items listed
4. Approves with note: "Reviewed utterances, all aligned with Q2 product update"
5. System promotes intents, creates audit events, takes snapshots

**Key workflow (Kill Switch):**

1. Anomaly detected: chatbot producing unexpected responses
2. TBA/Admin submits kill switch activation → added to approval queue
3. Checker approves → kill switch takes effect, all GenAI disabled
4. All customer queries now receive template-only responses (safe fallback)
5. Team investigates root cause
6. TBA/Admin submits kill switch deactivation → requires separate checker approval
7. Checker approves → AI routing resumes

**Business value:** Single point of control for all platform changes. The kill switch provides a "break glass" mechanism with maker-checker governance — even emergency actions require a second pair of eyes, ensuring no single actor can unilaterally disable or re-enable AI.

```mermaid
flowchart TD
    subgraph Approvals["Approval Queue"]
        A[Pending Items\nfrom All Modules] --> B{Review\nChange Detail}
        B -->|Approve| C[Action Executed\n+ Audit Logged]
        B -->|Reject| D[Returned to\nSubmitter with Reason]
    end

    subgraph KillSwitch["Kill Switch"]
        E[Anomaly\nDetected] --> F[Submit Kill Switch\nActivation]
        F --> F2{Checker\nApproval}
        F2 -->|Approved| G[All Queries →\nTemplate Only]
        G --> H[Investigate\n+ Resolve]
        H --> I[Submit\nDeactivation]
        I --> J{Checker\nApproval}
        J -->|Approved| K[AI Routing\nResumed]
    end

    style F fill:#ffcdd2,stroke:#c62828
    style K fill:#c8e6c9,stroke:#2e7d32
```

> [Screenshot: Change Control — approval queue with kill switch status bar]

---

## 4. Access and Permissions

### 4.1 Role Definitions

| Role | Who | Responsibilities |
|------|-----|-----------------|
| **TBA** (Technical BA) | Senior business staff with technical aptitude | The **maker** role. Makes all configuration changes: intents, agents, guardrails, templates, documents. Can also review and approve other TBAs' submissions. |
| **MGMT** (Senior Management) | Directors, VP, CxO | A **reviewer** role. Can approve/reject TBA submissions. Read-only access to dashboards and metrics. Monitors cost, performance, and compliance. |
| **ADMIN** (Administrator) | Platform administrators | A **reviewer + operator** role. Approves all action types, controls kill switch, manages users, handles emergency operations. |
| **BA** (Business Analyst) | General business staff, product managers | **View-only**. Can view intents, dashboards, audit trail, and metrics. Cannot make or approve changes. |
| **DEV** (Developer) | Engineering team that builds the platform | **View-only**. Can view the platform for debugging and support purposes. Does not use the platform operationally. |

### 4.2 Permission Matrix

| Resource | TBA | MGMT | ADMIN | BA | DEV | Why |
|----------|-----|------|-------|-----|-----|-----|
| **Intents** | Read/Write | Read | Read/Write | Read | Read | TBAs make changes; MGMT/ADMIN review; BA/DEV observe |
| **Agents** | Read/Write | Read | Read/Write | Read | Read | Agent config affects model behavior and cost — requires technical aptitude |
| **Guardrails** | Read/Write | Read | Read/Write | Read | Read | Safety policies require technical understanding to configure correctly |
| **Templates** | Read/Write | Read | Read/Write | Read | Read | TBAs manage response templates; others view |
| **Documents** | Read/Write | Read | Read/Write | Read | Read | TBAs manage knowledge base; others view |
| **Audit Trail** | Read | Read | Read | Read | Read | Immutable — no one can write. DELETE revoked at database level |
| **Metrics / Dashboard** | Read | Read | Read | Read | Read | All roles benefit from visibility; MGMT's primary view |
| **Kill Switch** | Read/Write | Read | Read/Write | Read | Read | Emergency control requires operational expertise |
| **User Management** | — | — | Read/Write | — | — | User provisioning is admin-only (least privilege) |
| **Approvals** | Submit + Approve | Approve | Submit + Approve | — | — | TBA submits (maker); TBA/MGMT/ADMIN approve (checker). Maker ≠ checker enforced. |

### 4.3 Why These Boundaries

- **Only TBAs can make changes** — all configuration changes (intents, agents, guardrails, templates, documents) require technical aptitude. This concentrates write access in a trained role and reduces the risk of well-intentioned but incorrect modifications.
- **MGMT can review but not edit** — management serves as a checker/approver, providing oversight without needing to operate the platform directly. This keeps the maker-checker separation clean.
- **BAs and DEVs are view-only** — BAs can observe the platform's state (useful for understanding chatbot behavior and providing feedback to TBAs). DEVs can view for debugging and support but do not use the platform operationally.
- **No one can modify audit logs** — DELETE and UPDATE are revoked at the database level. This is not a permission setting — it is a database constraint. Even admins cannot tamper with the audit trail.
- **Kill switch requires TBA or ADMIN** — activating the kill switch has immediate customer impact. Only roles with operational understanding should have this power.

---

## 5. Cross-Cutting Concerns

### 5.1 Maker-Checker Workflow

Every write operation in the platform follows the **"never alone" principle** (MAS TRM 9.1.1). The person who submits a change (maker) cannot be the same person who approves it (checker).

- **Makers:** Technical BA only — the sole role with write access
- **Checkers:** Another Technical BA (peer review), MGMT, or ADMIN — maker ≠ checker enforced at API level

**Actions requiring maker-checker approval:**

| Category | Action Types |
|----------|-------------|
| **Intents** | Toggle status, Edit, Rollback, Promote batch |
| **Agents** | Config change, Status change, Kill switch |
| **Guardrails** | Policy change |
| **Templates** | Publish, Restore |
| **System** | Kill switch activation, Kill switch deactivation |

```mermaid
sequenceDiagram
    actor Maker as Technical BA<br/>(maker — submits change)
    participant Platform as Platform
    participant Queue as Approval Queue
    actor Checker as TBA / MGMT / ADMIN<br/>(checker — different person)
    participant Audit as Audit Trail

    Maker->>Platform: Submit change
    Platform->>Queue: Create pending approval
    Platform->>Audit: Log: approval.submit
    Queue->>Checker: Notification: item pending

    alt Approved
        Checker->>Queue: Approve + note
        Queue->>Platform: Execute change
        Platform->>Audit: Log: approval.approve
        Platform->>Audit: Log: (action executed)
    else Rejected
        Checker->>Queue: Reject + reason
        Queue->>Maker: Returned with feedback
        Platform->>Audit: Log: approval.reject
    end
```

**Key enforcement:** The system validates that `checker_id ≠ maker_id` at the API level. Self-approval is rejected regardless of role. Only TBA, MGMT, and ADMIN roles can appear as checkers; BA and DEV roles have no approval capability.

### 5.2 Kill Switch and Emergency Controls

The kill switch is the platform's "break glass" mechanism. **Both activation and deactivation require maker-checker approval** — no unilateral action is possible.

- **Activation requires approval** — TBA or ADMIN submits activation request, a different checker must approve before it takes effect
- **All GenAI paths disabled** — upon approval, every customer query receives a template response instead
- **Deactivation requires approval** — resuming AI requires a separate maker-checker cycle (prevents premature reactivation)
- **State persists** — kill switch state survives page refreshes and session changes

**Where the kill switch appears:**
- **Executive Dashboard** — status indicator (visible to all roles)
- **Change Control** — activation/deactivation controls (TBA, ADMIN submit; TBA/MGMT/ADMIN approve)
- **Chatbot Preview** — routing trace shows kill switch state per query

---

## 6. How Tabs Connect — End-to-End Lifecycle

The 9 modules form a complete lifecycle for chatbot content management, from knowledge discovery through production deployment and ongoing monitoring:

```mermaid
graph LR
    ID["Intent\nDiscovery"] -->|"discovered\nintents"| AI["Active\nIntents"]
    AI -->|"intent\nrouting"| AG["Active\nAgents"]
    CL["Content\nLibrary"] -->|"templates"| AI
    CL -->|"knowledge\ndocs"| AG
    GR["Guardrails\nConfig"] -->|"safety\npolicies"| CP["Chatbot\nPreview"]
    AG -->|"agent\nconfig"| CP
    AI -->|"live\nintents"| CP
    CP -->|"metrics"| ED["Executive\nDashboard"]

    AI -. "writes" .-> CC["Change\nControl"]
    AG -. "writes" .-> CC
    GR -. "writes" .-> CC
    CL -. "writes" .-> CC
    CC -. "every\naction" .-> AT["Audit\nTrail"]

    style ID fill:#e8f5e9,stroke:#2e7d32
    style AI fill:#e8f5e9,stroke:#2e7d32
    style CL fill:#e8f5e9,stroke:#2e7d32
    style AG fill:#fff3e0,stroke:#ef6c00
    style GR fill:#fff3e0,stroke:#ef6c00
    style CP fill:#fff3e0,stroke:#ef6c00
    style ED fill:#e3f2fd,stroke:#1565c0
    style AT fill:#e3f2fd,stroke:#1565c0
    style CC fill:#e3f2fd,stroke:#1565c0
```

**The lifecycle in narrative form:**

1. **Discover & Create** — Upload knowledge documents → AI identifies new/changed intents → create manually or accept AI suggestions → promote to production (Intent Discovery)
2. **Manage** — View, edit, filter, and maintain existing intents — adjust response modes, review per-intent history, restore versions (Active Intents)
3. **Support** — Create response templates and upload knowledge documents for AI retrieval (Content Library)
4. **Configure** — Set up AI agents with system prompts and route intents to them (Active Agents)
5. **Protect** — Define guardrail policies: blocked topics, denied phrases, sensitivity levels (Guardrails Config)
6. **Test** — Preview the full routing pipeline against production, with optional per-user pending changes overlay (Chatbot Preview)
7. **Approve** — Review and approve all changes through maker-checker workflow (Change Control)
8. **Monitor** — Track query volume, agent performance, cost, and guardrail hit rates (Executive Dashboard)
9. **Audit** — Every action is permanently recorded for compliance and investigation (Audit Trail)

---

## Appendix: Slide Conversion Guide

When converting this document to a presentation deck:

| Section | Suggested Slides | Notes |
|---------|-----------------|-------|
| Executive Overview | 2 slides | One narrative, one diagram |
| Platform Modules | 1 slide | Grouped module diagram |
| Tab Walkthroughs (each) | 2 slides each | One workflow, one screenshot |
| Permissions Matrix | 1-2 slides | Table + role descriptions |
| Maker-Checker | 1 slide | Sequence diagram |
| Kill Switch | 1 slide | Activation/deactivation flow |
| How Tabs Connect | 1 slide | Integration diagram |
| **Total** | **~25-28 slides** | Add title + closing slides |
