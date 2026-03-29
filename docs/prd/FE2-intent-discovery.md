# FE2 — Intent Discovery: Staging Gate, Staging Review, Version History, Confidence Tooltip

**SSOT reference:** `/Users/lisatan/.claude/plans/serene-snuggling-kahn.md` — Section 1B items 20–26
**Task ID:** TASK-FE-DISCOVERY
**File:** `src/components/IntentDiscovery.tsx`
**Backend dependency:** TASK-D1 (mocked here; no real API calls)

---

## Scope

Four UI changes to `IntentDiscovery.tsx`. All existing functionality (sources panel, sync trigger, diff review modal, localStorage history) is preserved unchanged.

---

## Change 1 — Staging Gate

### Problem
The current "Approve All & Deploy" and "Approve Selected" buttons move a session directly to `deployed`. Per SSOT item 20, approvals must land in `staging` first — not production.

### Type change
```ts
// Before
status: 'pending' | 'deployed'

// After
status: 'pending' | 'staging' | 'deployed'
pendingApproval?: boolean   // sub-state on deployed; true = awaiting maker-checker
```

### UI changes
- Rename "Approve Selected" → **"Approve Selected → Staging"**
- Rename "Approve All & Deploy" → **"Approve All → Staging"**
- Both buttons call a new `handleApproveToStaging()` handler that sets status to `'staging'`
- The review modal's "Approve & Sync Selected" button also routes to staging, not deployed
- Sync history badges: `pending` = gray (existing), `staging` = amber, `deployed` = emerald (existing)

---

## Change 2 — Staging Review Panel

### Trigger
When `activeSync?.status === 'staging'`, replace the "Ready for Deployment" dark banner with a "Staging Review" panel.

### Contents
- Header: "Staging Review" with an amber `<span>STAGING</span>` badge
- List of approved intents (the diffs stored on the session) with name and status chip (new/changed/deleted)
- Two action buttons:
  1. **"Compare with Production"** — opens `showCompareModal` modal (side-by-side diff)
  2. **"Promote to Production"** — emerald button, opens `showPromoteConfirmModal` confirmation dialog

### Compare Modal
- Side-by-side: left = "Production (current)", right = "Staging (pending)"
- For each staging intent: right column shows new content with green highlight; left column shows what it replaces (uses `diff.original` if present, otherwise shows "No existing record" for new intents). Deleted intents show current content on left with red strikethrough and "Will be removed" on right.

### Promote Confirmation
- Text: "Submit for maker-checker approval? A checker must approve before this goes live."
- Buttons: Cancel | "Submit for Approval"
- On confirm: toast "Promotion submitted for approval", session moves to `status: 'deployed', pendingApproval: true`

### Deployed with pending_approval
- In sync history list, show a `Clock` icon next to the emerald "deployed" badge when `pendingApproval === true`

---

## Change 3 — Version History

### Location
Collapsible section in the left panel, below the "Recent Syncs" block.

### Contents
- Section header: "Intent DB Snapshots" with `GitBranch` icon, toggle chevron
- 3 mock snapshot entries with expandable rows:

| Version | Date | Author | Intents | Status |
|---------|------|--------|---------|--------|
| v3 | 2026-03-20 | Sarah Chen | 6 intents | LIVE (emerald badge) |
| v2 | 2026-03-10 | Admin | 5 intents | Archived |
| v1 | 2026-02-28 | Admin | 4 intents | Archived |

- Each row: snapshot label, optional LIVE badge, "Restore" button (`RotateCcw` icon, slate)
- Expandable rows: clicking a version shows the list of intents included in that snapshot
- Clicking Restore: opens `showRestoreModal` with the chosen snapshot version

### Restore Confirmation Modal
- Text: "Restore production to v[X]? This will overwrite the current live intent database. This action requires maker-checker approval."
- Buttons: Cancel | "Submit Restore Request" (OCBC red)
- On submit: creates pending approval (`intent.rollback`), toast "Restore request submitted for approval"
- Generates audit event with before (current version) and after (restored version) payloads

---

## Change 4 — Confidence Score Tooltip

### Location
In the review modal, next to the "Confidence: X%" text for each diff.

### Implementation
- Add an `Info` icon (lucide-react) inline after the confidence percentage
- On hover, show a tooltip using CSS `title` or a custom positioned tooltip div
- Tooltip text: "How clearly the source material supports this as a distinct, well-scoped intent. High = specific and unambiguous. Low = vague or overlapping with other intents."
- Use a `group/tooltip` pattern with a `relative` wrapper and absolute-positioned tooltip div for consistent styling

---

## State additions
```ts
// New modal/panel state
showCompareModal: boolean
showPromoteConfirmModal: boolean
showRestoreModal: boolean
restoreTargetVersion: string | null
showVersionHistory: boolean
toastMessage: string | null   // auto-clears after 3s
```

---

## Constraints
- Self-contained — no shared state, no router, no external store
- All mock; no API calls
- TypeScript strict — all new interfaces consistent with existing patterns
- Tailwind CSS v4 inline values, motion/react animations, lucide-react icons
- OCBC red `#E3000F`, emerald for promote/live, amber for staging
