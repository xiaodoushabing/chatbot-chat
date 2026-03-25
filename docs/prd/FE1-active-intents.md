# FE1 — ActiveIntents Component Upgrade
> Sub-PRD for TASK-FE-INTENTS. Self-contained mock-data implementation; no real API calls yet.

## Scope
Upgrade `src/components/ActiveIntents.tsx` with six feature changes aligned to SSOT Section 1A (Intent Lifecycle Management) items 6, 7, 8, 9, 10, 11.

---

## Change 1 — Three-Way Response Mode Selector

**What:** Replace binary GenAI/Template toggle with a 3-way pill selector: GenAI | Template | Exclude.

**Type changes:**
```ts
responseMode: 'genai' | 'template' | 'exclude'
```

**UI:** Inline 3-segment selector in table row (not a toggle). Each segment highlights when active:
- GenAI → emerald (`bg-emerald-600`)
- Template → amber (`bg-amber-500`)
- Exclude → slate (`bg-slate-500`)

When `exclude`, show a `Ban` icon badge ("No AI") beside the selector.

**Mock data:** Add one intent with `responseMode: 'exclude'`.

---

## Change 2 — Environment Tier Badge

**What:** `environment: 'staging' | 'production'` field on `Topic`. All existing intents = `production`. One new staging intent added.

**UI:** Small badge beside intent name: `PROD` (emerald) or `STAGING` (amber). Uses existing `cn()` pattern.

---

## Change 3 — Advanced Search and Filter Bar

**What:** Collapse/expand filter bar below search input. Three dropdowns (AND logic):
1. Risk Level: All / Low / High
2. Response Mode: All / GenAI / Template / Exclude
3. Status: All / Active / Inactive

**UI:**
- "Filters" button with active filter count badge (red dot with number) when any non-All filter is set
- Filter bar animates in/out with `AnimatePresence`
- All filters applied together in `filteredTopics` computation

**State:** `showFilters: boolean`, `filterRisk`, `filterMode`, `filterStatus` (all default to `'all'`)

---

## Change 4 — AI Generation Buttons in Edit Modal

**What:** Two sparkle buttons inside the edit modal.

### 4a. Generate Utterances
- Button: `✨ Generate utterances` (Sparkles icon, OCBC red) — next to utterances section header
- On click: set `isGeneratingUtterances: true` for 1500ms, then append 3 "suggested" utterances (objects with `{ text, suggested: true }`)
- Suggested items: dashed border, amber-tinted background, accept (click to keep, converts to regular) or dismiss (× removes)
- Mock: generate 3 phrasings based on the current intent name

### 4b. Draft Response
- Button: `✨ Draft response` (Sparkles icon, OCBC red) — next to Response label
- On click: set `isDraftingResponse: true` for 1500ms, then fill textarea with mock RAG draft
- Show "Revert" link to restore original response
- Mock: `"Based on our knowledge base: " + current response + " [AI-drafted — please review before saving]"`

**State added to modal scope:**
```ts
isGeneratingUtterances: boolean
isDraftingResponse: boolean
suggestedUtterances: string[]
originalResponse: string | null  // null means no draft applied yet
```

---

## Change 5 — Version History Panel

**What:** History icon button in actions column; clicking opens a slide-in right-panel (fixed overlay).

**UI:**
- Panel slides in from right: `fixed inset-y-0 right-0 w-96 bg-white shadow-2xl`
- Shows 3 mock history entries per intent (timestamps, actor, change description)
- Each entry has a "Restore" button — shows `window.confirm` then a toast notification
- Toast: simple fixed-bottom notification, auto-dismiss after 2.5s

**Mock history structure:**
```ts
interface HistoryEntry {
  timestamp: string;
  actor: string;
  description: string;
}
```

**State:** `historyTopic: Topic | null`

---

## Change 6 — Staging → Production Promotion

**What:** For staging intents, replace the delete button with a "Promote to Prod" button (`ArrowUpCircle`, emerald).

**UI:**
- Confirm dialog: `window.confirm("Submit for approval? This will send the intent to a checker before going live.")`
- On confirm: update intent with a `pendingApproval: true` flag and show amber `Clock` badge ("Pending Approval") beside environment badge
- Show success toast "Submitted for maker-checker approval"

**Type change:**
```ts
pendingApproval?: boolean
```

---

## Mock Data Plan

| Intent | Mode | Env | Notes |
|--------|------|-----|-------|
| OCBC_360_Salary_Credit | genai | production | existing |
| Home_Loan_Repayment_Impact | genai | production | existing, high risk |
| OCBC_Life_Goals_Retirement | genai | production | existing |
| Account_Balance_Query | genai | production | existing |
| Card_Replacement | genai | production | existing |
| International_Transfer | genai | production | existing, high risk |
| Investment_Product_Inquiry | exclude | production | **new** — demonstrates exclude mode |
| CPF_Retirement_Advisory | genai | staging | **new** — demonstrates staging + promote flow |

---

## Files Modified

- `src/components/ActiveIntents.tsx` — only file changed

## No New Files, No New Imports Beyond

Additional lucide-react icons used: `Sparkles`, `History`, `ArrowUpCircle`, `Clock`, `Ban`, `ChevronDown`

---

## Acceptance Criteria

- [ ] Three-way response mode selector works; clicking each segment updates mode; `exclude` shows "No AI" badge
- [ ] Environment badge visible on all intents; staging intent shows STAGING badge
- [ ] Filter bar toggles with animation; all 3 filters work together (AND logic); filter count badge shows
- [ ] "Generate utterances" button shows loading 1.5s then appends 3 suggested items; each can be accepted or dismissed
- [ ] "Draft response" button shows loading 1.5s then fills textarea; Revert restores original
- [ ] History panel slides in from right; shows 3 mock entries; Restore shows toast
- [ ] Staging intent shows "Promote to Prod" button; confirm dialog appears; on confirm shows toast + pending badge
- [ ] All existing functionality (toggle status, edit/save, delete) still works
- [ ] No TypeScript errors (all types correct)
