# FE8 — Admin Control Interface (ACI) Sub-PRD

> Derived from SSOT: `/Users/lisatan/.claude/plans/serene-snuggling-kahn.md` Section 1I
> SSOT task reference: `AGENT_TASKS.md` → `TASK-FE-ACI`

---

## Overview

The Admin Control Interface (ACI) is the **Change Control** tab in the admin suite. It provides the maker-checker approval queue:

1. **Maker-Checker Queue** — inline pending approvals list with action type badges, approve/reject flows

**Note:** In the current implementation, the originally planned ACI consolidation has been split:
- **Kill Switch controls** → moved to Observability dashboard (ExecutiveDashboard component)
- **Template Management** → moved to Content Library tab (ContentLibrary > TemplateManagement)
- **Document Management** → moved to Content Library tab (ContentLibrary > DocumentManagement)

All data is mocked. No backend calls are made in this phase.

---

## Files Produced

| File | Purpose |
|------|---------|
| `src/components/AdminControlInterface.tsx` | Shell: kill switch bar + maker-checker queue + sub-view switcher |
| `src/components/TemplateManagement.tsx` | Template CRUD, edit modal, preview, version history |
| `src/components/DocumentManagement.tsx` | Document list (cards), upload modal, indexing hub panel |

`src/App.tsx` renders `<AdminControlInterface />` as the `change-control` tab.

---

## Roles & Access

Per SSOT Section 1I and 1H:
- DEV/Admin: full access to kill switch activation/deactivation, all ACI views
- BA: template content, document management; no kill switch activation
- MGMT: excluded from ACI tab

In this mock phase: no RBAC enforcement. All actions are available.

---

## Component 1: AdminControlInterface.tsx

### Kill Switch Header Bar

**State: inactive (default)**
- Slim dark bar (`bg-slate-900`, white text)
- Left: green dot + "Kill Switch: Inactive | GenAI: Active"
- Right: "Activate Kill Switch" button (red outline, `Power` icon)

**State: active**
- Full-width prominent red banner (`bg-red-600`, white text)
- Icon: `Zap` (lightning) for emergency feel
- Message: "KILL SWITCH ACTIVE — All GenAI responses disabled. System serving templates and exclusions only."
- Right: "Deactivate" button (white outline)

**Activate flow:**
1. Click "Activate Kill Switch" → confirmation modal
2. Modal shows impact: "This will immediately disable all LLM agent calls. All queries will be served by template responses or exclusion messages."
3. Buttons: "Cancel" | "Activate Emergency Override" (red, `Power` icon)
4. On confirm: kill switch activates, banner turns red, toast: "Kill switch activated"

**Deactivate flow:**
1. Click "Deactivate" → maker-checker submission modal
2. Message: "Deactivation requires checker approval. Submit for review?"
3. On confirm: creates pending approval in queue, shows toast: "Deactivation submitted for approval"

### Maker-Checker Queue

- Section title: "Pending Approvals" + `ClipboardCheck` icon + count badge (amber)
- Empty state: `CheckCircle` icon, "All clear — no pending approvals"
- Each approval card shows:
  - Action type badge (color-coded by category):
    - Intent: `bg-blue-100 text-blue-700` (toggle_status, edit, rollback, promote_batch)
    - Agent: `bg-purple-100 text-purple-700` (config_change, status_change, kill_switch)
    - Guardrail: `bg-orange-100 text-orange-700` (policy_change)
    - Template: `bg-amber-100 text-amber-700` (publish, restore)
    - Document: `bg-sky-100 text-sky-700` (reindex, delete, full_reindex)
    - System: `bg-red-100 text-red-700` (kill_switch_activate, kill_switch_deactivate)
  - Entity name, description, batch items (pills if batch operation)
  - Detail box with before/after summary
  - Submitted by + submitted at timestamp
  - "Approve" (emerald, `Check` icon) + "Reject" (red outline, `X` icon)

**15 approval action types:**
| Category | Action Types |
|----------|-------------|
| Intent | toggle_status, edit, rollback, promote_batch |
| Agent | config_change, status_change, kill_switch |
| Guardrail | policy_change |
| Template | publish, restore |
| Document | reindex, delete, full_reindex |
| System | kill_switch_activate, kill_switch_deactivate |

**Approve flow:**
1. Click Approve → inline comment input ("Add a review note (optional)")
2. Confirm button → card animates out (opacity 0, x: 60 via `motion.div`), success toast

**Reject flow:**
1. Click Reject → inline mandatory reason textarea
2. Confirm button (disabled until reason filled) → card animates out (opacity 0, x: 60), toast: "Approval rejected"

**Card exit animations:**
- On decision (approve or reject), the card uses `motion.div` exit animation: `exit={{ opacity: 0, x: 60 }}` with `transition={{ duration: 0.3 }}`
- Cards are wrapped in `AnimatePresence` for smooth removal from the list

**Recent Decisions toggle:**
- Toggle button at top of queue: "Show Recent Decisions"
- When active, shows last 5 approved/rejected items below the pending queue
- Each recent decision shows: action type badge, entity name, decision (Approved green / Rejected red badge), decided by, timestamp
- Recent decisions are display-only (no further actions)

**Mock data:** 3 pending approvals:
- Template publish: "CPF_Life_Standard_Response" content update
- Intent promote: "CPF_Retirement_Advisory" staging → production
- Kill switch deactivate: submitted by DEV, awaiting MGMT approval

### Sub-view Tabs

Below the kill switch bar and maker-checker section:
- Tab buttons: "Template Management" | "Document Management"
- Active tab: `bg-[#E3000F]` text, bottom border
- Renders `<TemplateManagement />` or `<DocumentManagement />` based on selection

---

## Component 2: TemplateManagement.tsx

### Data Model

```typescript
interface TemplateVersion {
  versionNumber: number
  contentMarkdown: string
  changedBy: string
  changedAt: string
  changeDescription: string
}

interface Template {
  id: string
  name: string
  contentMarkdown: string
  variables: string[]        // e.g. ['user_name', 'cpf_balance']
  linkedIntents: string[]    // intent names
  status: 'active' | 'inactive'
  createdBy: string
  updatedBy: string
  updatedAt: string
  versions: TemplateVersion[]
  pendingApproval?: boolean
}
```

### Mock Templates (5)

1. **CPF_Life_Standard_Response** — active, linked to OCBC_Life_Goals_Retirement, variables: `user_name`, `cpf_balance`
2. **Home_Loan_High_Risk_Response** — active, linked to Home_Loan_Repayment_Impact, variables: `monthly_repayment`
3. **Transfer_Compliance_Response** — active, linked to International_Transfer, long compliance text
4. **Card_Replacement_Response** — active, linked to Card_Replacement, simple template
5. **Excluded_Topic_Response** — active (default exclusion), no linked intents, no variables

### Table Columns

Name | Linked Intents (tags) | Variables (tags) | Status | Last Updated | Actions

### Row Actions

- Edit (`Edit3` icon) → edit modal
- Preview (`Eye` icon) → preview modal
- Version History (`History` icon) → slide-in side panel
- Toggle active/inactive (`Power`/`PowerOff` icon)
- Delete (`Trash2` icon) → confirmation

### Edit Modal

- Full-width markdown `textarea` (min-height 200px, monospace font)
- Auto-extract `{{...}}` variables on content change → display as detected tags
- Linked intents: multi-select (checkboxes from mock intent list)
- Status toggle: Active / Inactive (pill buttons)
- Footer: "Cancel" | "Save Draft" | "Publish" (emerald)
- Publish → maker-checker confirmation → sets `pendingApproval: true` → Clock pending badge appears on row

### Preview Modal

- Renders template with sample variable values substituted:
  - `{{user_name}}` → "Ahmad Razali"
  - `{{cpf_balance}}` → "S$128,450"
  - `{{monthly_repayment}}` → "S$2,340"
- Chat bubble styling: rounded bubble, OCBC red header, white background
- Sample values shown as legend below bubble

### Version History Side Panel

- Slide in from right (same spring animation as ActiveIntents)
- List of `TemplateVersion` objects: version number, changedBy, changedAt, changeDescription
- "Restore" button per version → confirmation dialog → toast

---

## Component 3: DocumentManagement.tsx

### Data Model

```typescript
interface KnowledgeDocument {
  id: string
  filename: string
  fileType: 'pdf' | 'docx' | 'txt' | 'url'
  uploader: string
  uploadedAt: string
  domains: string[]
  indexedStatus: 'pending' | 'indexed' | 'failed' | 'stale'
  lastIndexedAt?: string
  providerUsed: string
  isActive: boolean
  fileSizeKb: number
  chunkCount?: number
}
```

### Mock Documents (8)

1. OCBC_CPF_Life_Product_Guide.pdf — indexed, 47 chunks, Retirement Planning
2. OCBC_Home_Loan_Policy_2025.docx — indexed, 31 chunks, Home Loans
3. OCBC_Card_Services_FAQ.pdf — indexed, 22 chunks, Card Services
4. CPF_Retirement_Sum_Schemes.pdf — stale (re-index needed), Retirement Planning
5. International_Transfer_Compliance.docx — indexed, 18 chunks, Compliance
6. OCBC_360_Account_Handbook.pdf — pending (newly uploaded), Retirement Planning + Card Services
7. https://www.ocbc.com/personal-banking/investments/cpf — failed (URL fetch error), Retirement Planning
8. OCBC_Wealth_Advisory_Guidelines.pdf — indexed, 55 chunks, Retirement Planning

### Layout: Two-Panel

**Left panel (60%):**
- Search input + filter dropdowns (domain, status)
- "Upload Document" button (emerald) → upload modal
- Document cards (not table):
  - File type icon, filename (bold), uploader + upload date
  - Status badge: indexed (emerald), pending (amber + pulse animation), failed (red), stale (slate)
  - "47 chunks" label for indexed
  - Hover actions: Re-index (`RefreshCw`), Remove (`Trash2`), Details expand

**Right panel (40%):**
- Title: "Indexing Hub" + `Database` icon
- Provider: "External ES Hub" + green status dot
- Stats: Queue depth (3), Last run ("2 minutes ago"), Total indexed (156)
- "Trigger Full Re-index" (DEV only styling: amber outline) → confirmation dialog
- Activity log: 5 recent events (doc name, timestamp, success/failed result)
- "Manage Domain Tags" section: domain pills (Retirement Planning, Home Loans, Card Services, Compliance) with document counts

### Upload Modal

- Drag-and-drop area (dashed border, `Upload` icon)
- File type selector (PDF / DOCX / TXT / URL)
- Domain multi-select checkboxes
- "Upload" button → 1.5s simulated delay → success toast → adds doc to list with `pending` status

---

## Acceptance Criteria

- [ ] Kill switch banner is immediately visually distinct and alarming when active
- [ ] Kill switch activate/deactivate flows both have confirmation dialogs
- [ ] Maker-checker queue shows meaningful content of what is being approved (not just generic labels)
- [ ] Reject flow requires non-empty reason before confirming
- [ ] Template edit detects `{{variable}}` patterns in real-time and displays them as tags
- [ ] Template preview substitutes variables with sample values in chat bubble style
- [ ] Version history slide panel uses spring animation (matching ActiveIntents pattern)
- [ ] Document cards show appropriate status badge with pulse for `pending`
- [ ] Upload modal simulates upload and shows success toast
- [ ] All `cn()` is defined inline in each file (not imported from a shared util)
- [ ] No TypeScript `any`
- [ ] No real API calls — all data is mock/simulated

---

## Styling Conventions (from CLAUDE.md)

- OCBC brand color: `#E3000F` (use as inline Tailwind value)
- `cn()` defined at top of each file using clsx + tailwind-merge
- Modals: `fixed inset-0 z-[100]`, backdrop `bg-slate-900/60 backdrop-blur-sm`
- Slide panels: `fixed inset-y-0 right-0`, spring animation `damping: 28, stiffness: 300`
- Toasts: `fixed bottom-6 left-1/2 -translate-x-1/2 z-[200]`, dark pill style
- Tables: `bg-white rounded-2xl border border-slate-200 shadow-sm`
- Table headers: `bg-slate-50`, uppercase, `tracking-widest`, `text-slate-500`
- Inputs: `bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#E3000F]`
- Icons: lucide-react
- Animation: `motion/react` (Framer Motion v12+) with `AnimatePresence`
