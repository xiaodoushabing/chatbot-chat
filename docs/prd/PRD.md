# OCBC Retirement Planning Chatbot — Admin Suite PRD

## 1. Product Vision & Scope

**Product:** Governance-first admin control interface for OCBC's AI-powered retirement planning chatbot.

**Problem:** Banks deploying GenAI chatbots face regulatory scrutiny (MAS TRM guidelines), hallucination risk, and operational complexity. There is no off-the-shelf admin suite that provides banking-grade governance for AI chatbot management.

**Solution:** A single-pane-of-glass admin suite that gives business analysts, developers, and compliance officers full control over chatbot intents, AI agents, content, guardrails, and audit — with maker-checker approval on every change.

**Scope Exclusions:**
- chatbot_demo/ (separate Next.js proof-of-concept, not part of this product)
- End-user chatbot frontend (this product manages the chatbot, not the chatbot itself)

## 2. User Roles

| Role | Abbreviation | Description | Primary Actions |
|------|-------------|-------------|-----------------|
| Technical Business Analyst | TBA | Configures intents, agents, content | Edit intents, tune agents, manage templates |
| Management | MGMT | Reviews and approves changes | Approve/reject in Change Control |
| Administrator | ADMIN | System-level operations | Kill switch, system config, user management |
| Business Analyst | BA | Day-to-day content management | Edit responses, manage documents |
| Developer | DEV | Technical configuration | Agent system prompts, guardrail policies |

## 3. Feature Inventory

### 3.1 Login & Authentication
- POC: Hardcoded credentials (admin/ocbc2026) with localStorage persistence
- Production target: SAML/OIDC federation via corporate identity provider
- Singapore skyline background, animated card entrance, password visibility toggle, error handling

### 3.2 Navigation & Layout
- **Collapsible sidebar** (expanded: 288px, collapsed: 80px)
- **Primary navigation** (always visible):
  - Bot Tech Benchmark
  - Active Topics
  - Observability
  - Topic Discovery
- **Secondary navigation** (under "More" toggle):
  - Active Agents
  - Content Library
  - Audit Trail
  - Change Control
- **Top header:** Menu toggle, breadcrumb (supports sub-view labels from Bot Tech Benchmark and Content Library), kill switch status (pulsing red when active), notification bell, settings, system status indicator ("System Secure" green / "GenAI Disabled" red)
- OCBC brand color: #E3000F throughout

### 3.3 Bot Tech Benchmark
**Purpose:** Side-by-side demonstration of 3 chatbot engine architectures to support procurement and architecture decisions. Contains two sub-views selectable via toggle: **Chatbot Approaches** (engine comparison) and **Lifestyle Discovery** (vision-based profiling).

#### 3.3.1 Three-Engine Comparison
| Engine | Architecture | Latency | Risk | Use Case |
|--------|-------------|---------|------|----------|
| Traditional (NLU) | TF-IDF similarity → template response | <50ms | Lowest | Deterministic, audit-friendly |
| Hybrid (Traditional + GenAI) | Simple → template, Complex → LLM + trace | ~800ms | Medium | Recommended for production |
| Full GenAI (RAG) | Always LLM-powered, knowledge-grounded | 1-4s streaming | Highest | Maximum flexibility |

- 5 core intents: CPF Life, Retirement Planning, Gap Analysis, Investment, Life Events
- Routing traces: intent match, confidence %, response mode (Template/GenAI/Exclude)
- Hallucination cache: pre-cached known hallucination scenarios for demo
- Quick query chips, suggested follow-up buttons
- Out-of-scope detection, low-confidence disambiguation

#### 3.3.2 Lifestyle Discovery
- Image-based retirement lifestyle tier assessment using vision-capable LLM
- User selects 2-4 images from curated pool (~50 images across 3 tiers: 16 aspirational, 18 balanced, 16 essential)
- Vision LLM analyzes images → returns tier classification + reasoning
- **3 Tiers:**
  | Tier | Monthly Spend | Examples | OCBC Products |
  |------|--------------|----------|---------------|
  | Aspirational | SGD 8,000-15,000+ | International travel, fine dining, private clubs | Premier Banking, Wealth Advisory |
  | Balanced | SGD 4,000-8,000 | Regional travel, education, hobbies | RoboInvest, CPF Investment Scheme, SRS |
  | Essential | SGD 2,000-4,000 | Local leisure, nature, wellness | 360 Account, CPF top-ups, Life Goals |
- Two parallel UX approaches in side-by-side phone mockups:
  - **Vision Upload:** User uploads a photo → vision LLM classifies lifestyle tier
  - **Visual Picker:** User picks from 6-image grid (2 per tier) → tier determined by selections, 5 refreshes available
- Image compression (max 1024x1024, JPEG quality 0.85→0.7 fallback) before API call
- Images preloaded into browser cache on module load

### 3.4 Active Topics
**Purpose:** CRUD management for production chatbot intents (topics).

- 6 initial intents with mock data (3 low-risk GenAI, 3 high-risk across GenAI/Template/Exclude modes)
- **Fields per intent:** id, name, query count, responseMode (GenAI/Template/Exclude), riskLevel (High/Low), status (Active/Inactive), utterances, response text, environment (Staging/Production), pendingApproval flag
- **Search & Filter:** Full-text by name, filter by risk level, response mode, status. Active filter count badge.
- **Edit Modal:** Edit name, utterances, response. AI generation buttons ("Generate Utterances", "Draft Response"). Response mode color-coded: GenAI=emerald, Template=amber, Exclude=slate.
- **Actions per intent:** Edit, View, History (timestamps + actor + description), Toggle active/inactive, Switch response mode, Delete, Promote to production (staging only)
- **Maker-checker:** All changes create pending approval, entity locked until decision
- **Persistence:** localStorage (`ocbc_topics_v2`)

### 3.5 Observability
**Purpose:** Real-time performance metrics, cost analysis, and emergency controls.

- **Time range toggle:** 7d / 30d (updates all charts simultaneously)
- **KPI Cards (4):** Interactions (32,740), Customers (18,210), Satisfaction (91.3%), Fallback rate (3.2%) — all with week-over-week trends
- **Charts:**
  - Query Trend: Bar + line combo (queries + satisfaction %)
  - Query Distribution by Intent: Pie chart (OCBC 360 45%, Home Loans 25%, CPF 15%, Wealth 10%, Others 5%)
- **Hero Banner:** Trending insights with project selector (Retirement Planning / Home Loans / Card Services / All), "Review Policy" action buttons
- **Agent Cost Intelligence:** Table with agent name, sessions, cost, cost/1K, trend arrows
- **Agent Performance:** Sessions, fallback rate, latency, satisfaction, 7-day sparkline, status badge
- **Guardrails Monitor:** Hallucinations detected (247, 0.75%), successful blocks, risk attempts (89, 2.4%)
- **Cost Projection:** Monthly cost ($1,247.30), Cost/1K ($0.038), projected annual ($14,967)
- **Kill Switch Controls:** Activate/deactivate with confirmation dialog → creates approval + audit event. When active: all GenAI routed to templates.

### 3.6 Topic Discovery
**Purpose:** Automated intent discovery from documents/URLs, with staging review and production promotion.

- **Source Management:** Add PDFs, URLs, folders via drag-drop upload or paste
- **Sync & Generate Diffs:** 2-second loading animation → 3 mock diffs:
  - New: OCBC_360_Salary_Credit (98% confidence)
  - Changed: Home_Loan_Repayment_Impact (94% confidence) with "What's Changed" summary
  - Deleted: CPF_Life_Explanation (99% confidence) — merged into Retirement_Planning_Guide
- **Staging Review:** Select intents to approve, inline editing with "AI-drafted — please review" hint
- **Production Promotion:** Compare modal (staging vs production), batch promotion approval
- **Version History:** 3 snapshots (v3 live/6 intents, v2/5 intents, v1/4 intents), expandable rows, restore to prior version (creates approval)
- **Advanced Settings:** Confidence thresholds, diff filtering options (collapsible)

### 3.7 Active Agents
**Purpose:** Configure and monitor AI agents (LLM-powered processors).

- **6 agents:** Retirement_Planner, Account_Enquiry, Loan_Advisory, Card_Services, Investment_Insights (inactive), Fraud_Detection
- **Configuration per agent:**
  - System prompt (4,000 character limit)
  - Model selector dropdown (configurable model options per deployment)
  - Temperature slider (0.0-1.0)
  - Max tokens input
  - Status toggle (Active/Inactive) — requires approval
- **Intent Routing Editor:** Modal with checkboxes for 8 intents per agent. Save → approval + audit event.
- **Performance Metrics:** Sessions handled, fallback rate %, average latency (ms), satisfaction score
- **Search & Filter:** By name, category, description

### 3.8 Content Library
**Purpose:** Manage response templates and knowledge base documents.

#### 3.8.1 Templates
- 5 templates with `{{variable}}` placeholder system
- **Fields:** id, name, contentMarkdown, variables (auto-extracted), linkedIntents, status, createdBy, updatedBy, versions
- **Sample variables:** `{{user_name}}` → "Ahmad Razali", `{{cpf_balance}}` → "S$128,450"
- **Actions:** Preview (with sample substitution), Edit (textarea + auto-extract variables), Version history (expandable rows with restore), Activate/Deactivate, Delete
- **Publish flow:** Edit → "Publish" button → confirmation → approval (actionType: `template.publish`)

#### 3.8.2 Documents
- 8 knowledge base documents (PDF/DOCX/TXT/URL)
- **Fields:** id, filename, fileType, uploader, uploadedAt, domains (multi-select), indexedStatus, lastIndexedAt, providerUsed, isActive, fileSizeKb, chunkCount
- **Indexing Status Lifecycle:** Pending (pulsing amber) → Indexed (emerald) | Failed (red) | Stale (gray, needs refresh)
- **Domains:** Retirement Planning, Home Loans, Card Services, Compliance
- **Upload Modal:** Drag-drop or file picker, file type selector, domain multi-select, simulated progress
- **Indexing Hub:** Right sidebar showing 5 recent indexing events (success/failed)
- **Actions:** View, Refresh indexing (re-index for stale docs → approval), Delete (→ approval)
- **All operations require maker-checker approval**

### 3.9 Audit Trail
**Purpose:** Immutable compliance log of all system actions.

- 27 mock events, reverse chronological
- **Event fields:** id, timestamp, actor, actorRole (BA/DEV/ADMIN), actionType (20 types), entityType (7 types: intent, agent, template, guardrail, document, system, approval), entityId, entityName, description, before/after diffs, severity (info/warning/critical), batchId/batchItems
- **Filtering:** Date range, actor search, action type dropdown (20 types), entity type dropdown, severity filter, active filter count badge, "Clear Filters"
- **Diff Viewer:** Expandable rows, red strikethrough (removed), green bold (added), grid layout
- **Pagination:** 15 events per page
- **CSV Export:** All fields, proper escaping, dated filename
- **Batch Filter:** Click batchId to filter related events
- **Color coding:** Intents=emerald, Agents=purple, Templates=amber, System=red borders. Roles: BA=blue, DEV=purple, ADMIN=red badges.

### 3.10 Change Control
**Purpose:** Maker-checker approval queue for all pending changes.

- **15 approval action types:**
  - Intent: toggle_status, edit, rollback, promote_batch
  - Agent: config_change, status_change, kill_switch
  - Guardrail: policy_change
  - Template: publish, restore
  - Document: reindex, delete, full_reindex
  - System: kill_switch_activate, kill_switch_deactivate
- **Approval Card:** Action type badge (color-coded), entity name, description, batch items (pills), detail box, submitter info, Approve (green) / Reject (red) buttons
- **Inline Decision:** Approve → optional review note → Confirm. Reject → mandatory reason → Confirm.
- **Animations:** Card animates out on decision (opacity 0, x: 60)
- **Recent Decisions:** Toggle to show last 5 approved/rejected with status badges

### 3.11 Guardrails Config
**Purpose:** Configure safety guardrails for AI responses. Currently embedded within the Observability dashboard (not a standalone tab), rendered with `embedded` prop.

- **Blocked Topics:** List of excluded topics (e.g., "Investment Advice", "Tax Avoidance", "Cryptocurrency"). Add/remove interface.
- **Denied Words/Phrases:** Strings that trigger rejections (e.g., "guaranteed returns", "risk-free"). Add/remove interface.
- **Sensitivity Controls:**
  | Control | Levels | Default |
  |---------|--------|---------|
  | Hallucination Detection | Off / Low / Medium / High / Strict | Medium |
  | Injection Detection | Off / Low / Medium / High / Strict | High |
  | PII Masking | On / Off | On |
- **Exclusion Template:** Textarea with default out-of-scope response. "Update Exclusion Template" → approval.
- **Test Panel:** Input field → "Test for Safety Issues" → result: blocked / flagged / passed with explanation.
- **All changes require maker-checker approval**

## 4. Cross-Cutting Features

### 4.1 Maker-Checker Approval System
Every state-changing operation requires a second-person approval:
- 15 distinct approval action types (see Section 3.10)
- Entity locking: `pendingApproval: true` prevents further edits until decision
- Batch operations supported (e.g., intent promotion batches)
- Toast notifications on submission and decision
- Audit events generated for every approval/rejection

### 4.2 Kill Switch
Emergency GenAI disable:
- Activatable from Observability dashboard
- When active: ALL GenAI responses route to templates
- Visual indicators: pulsing red header badge, "GenAI Disabled" system status
- Requires approval to activate AND deactivate
- Full audit trail of kill switch events

### 4.3 Audit Integration
All features generate audit events:
- 20 distinct audit action types
- 7 entity types
- Before/after diffs for data changes
- Severity classification (info/warning/critical)
- Batch correlation via batchId

## 5. Technical Context

- **Current state:** React 19 SPA with mock/localStorage data (POC). Bot Tech Benchmark and Lifestyle Discovery make real LLM calls via serverless API routes (`api/rag.ts`, `api/hybrid.ts`, `api/wow-vision.ts`).
- **Target state:** Production deployment with relational database (PostgreSQL), key-value store, serverless compute, and API gateway. Vendor/platform selection is open — see [Vendor-Agnostic Strategy](../STRATEGY_VENDOR_AGNOSTIC.md).
- **Stack:** React 19, Vite 6, TypeScript, Tailwind CSS 4, Motion (Framer v12), Recharts, Lucide React
- **AI Integration:** LLM provider (vision-capable model required) for Hybrid and RAG chatbot responses and vision analysis; TF-IDF similarity engine (client-side) for NLU intent classification in Bot Tech Benchmark
- **Client-side persistence:** `localStorage` keys: `ocbc_auth`, `ocbc_topics_v2`, `ocbc_agents_v2`, `ocbc_pending_approvals`, `killSwitchActive`

## 6. PRD Index

Individual feature PRDs with implementation details:

| File | Scope |
|------|-------|
| [F1-infrastructure.md](F1-infrastructure.md) | Infrastructure scaffolding, object storage, key-value store, IAM/roles |
| [F2-aurora-schema.md](F2-aurora-schema.md) | Relational database (PostgreSQL) schema |
| [F3-auth-rbac.md](F3-auth-rbac.md) | Identity federation (SAML/OIDC), API gateway JWT, RBAC |
| [FE1-active-intents.md](FE1-active-intents.md) | Active Topics frontend integration |
| [FE2-intent-discovery.md](FE2-intent-discovery.md) | Topic Discovery frontend integration |
| [FE3-dashboard.md](FE3-dashboard.md) | Observability dashboard frontend |
| [FE4-agents.md](FE4-agents.md) | Active Agents frontend integration |
| [FE5-preview.md](FE5-preview.md) | Bot Tech Benchmark + Lifestyle Discovery |
| [FE6-audit-trail.md](FE6-audit-trail.md) | Audit Trail frontend |
| [FE7-guardrails.md](FE7-guardrails.md) | Guardrails Config frontend |
| [FE8-aci.md](FE8-aci.md) | Change Control (Admin Control Interface) |
