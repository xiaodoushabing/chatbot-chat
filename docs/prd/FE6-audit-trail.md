# FE6 — Audit Trail UI

**Task ID:** TASK-FE-AUDIT
**Priority:** P2
**Depends on:** TASK-A1 (Audit Log Service — mock data only until backend is live)
**Files:** `src/components/AuditTrail.tsx` (new), `src/App.tsx` (add tab entry)

---

## 1. Purpose

Provide BA and DEV roles with a filterable, exportable, compliance-grade view of every system change. Required for MAS regulatory sign-off. All audit events (intent lifecycle, agent config, guardrail policy, kill switch, maker-checker, auth) must be visible in a single searchable table with before/after diff inspection.

---

## 2. Data Model

### 2.1 AuditEvent interface

```typescript
interface AuditEvent {
  id: string
  timestamp: string           // ISO 8601
  actor: string               // display name
  actorRole: 'BA' | 'DEV' | 'ADMIN'
  actionType: AuditActionType
  entityType: 'intent' | 'agent' | 'template' | 'document' | 'guardrail' | 'system' | 'approval'
  entityId: string
  entityName: string          // human-readable
  description: string         // plain-English summary
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  useCase: string
  severity: 'info' | 'warning' | 'critical'
}
```

### 2.2 AuditActionType union (20 types)

Groups:
- **Intent (6):** `intent.create` | `intent.edit` | `intent.delete` | `intent.toggle_status` | `intent.rollback` | `intent.promote`
- **Agent (3):** `agent.config_change` | `agent.status_change` | `agent.kill_switch`
- **Template (2):** `template.publish` | `template.restore`
- **Document (3):** `document.reindex` | `document.delete` | `document.full_reindex`
- **Guardrail (1):** `guardrail.policy_change`
- **System (2):** `system.kill_switch_activate` | `system.kill_switch_deactivate`
- **Approval (3):** `approval.submit` | `approval.approve` | `approval.reject`

### 2.3 Severity mapping

| Severity | Use when |
|----------|----------|
| `critical` | Kill switch activate/deactivate, guardrail policy change, approval.reject |
| `warning`  | Intent promote/rollback, approval.approve/submit, agent config change |
| `info`     | All CRUD (create/edit/delete), auth events, template/document ops |

---

## 3. Mock Data Requirements

27 mock events spanning the last 7 days (relative to 2026-03-29):

| Must include | Count |
|-------------|-------|
| `system.kill_switch_activate` / `deactivate` | 2-3 |
| `approval.approve` / `reject` / `submit` | 3-4 |
| `intent.promote` / `intent.rollback` | 3-4 |
| `intent.create` / `intent.edit` / `intent.toggle_status` | 3-4 |
| `guardrail.policy_change` | 1-2 |
| `agent.config_change` / `agent.status_change` | 2-3 |
| `template.publish` / `template.restore` | 2-3 |
| `document.reindex` / `document.delete` / `document.full_reindex` | 2-3 |

Actors: Sarah Chen (BA), James Lim (DEV), Admin (ADMIN).
Use cases: `retirement-planning`, `account-services`.

### 3.1 Batch Correlation

Some events share a `batchId` to group related operations (e.g., a batch intent promotion creates one approval event and multiple intent.promote events).

```typescript
interface AuditEvent {
  // ... existing fields ...
  batchId?: string;        // groups related events
  batchItems?: string[];   // entity names in the batch
}
```

Clicking a batchId in the UI filters the event list to show only events with the same batchId.

---

## 4. UI Specification

### 4.1 Page layout

```
[Header: "Audit Trail" + icon | subtitle | Export CSV button]
[Filter bar — always visible]
[Summary line: "Showing X of Y events"]
[Table]
[Pagination]
```

### 4.2 Header

- Title: `ClipboardList` icon + "Audit Trail" (text-4xl font-bold)
- Subtitle: "Complete change history for compliance and regulatory review" (text-slate-500 text-lg)
- **Export CSV button** (right-aligned): `Download` icon + "Export CSV" label
  - On click: generates CSV from currently filtered events (all pages, not just current page)
  - Columns: ID, Timestamp, Actor, Role, Action Type, Entity Type, Entity ID, Entity Name, Description, Severity, Use Case
  - Uses `URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))` + auto-click anchor
  - Filename: `audit-trail-YYYY-MM-DD.csv`

### 4.3 Filter bar

Always visible (no collapsible toggle). Renders as a white card with `rounded-2xl border border-slate-200 shadow-sm`.

| Filter | Control | Default |
|--------|---------|---------|
| From date | `<input type="date">` | 7 days ago |
| To date | `<input type="date">` | today |
| Actor | Text input with `Search` icon | empty |
| Action type | `<select>` (All + each type, grouped by category with `<optgroup>`) | All |
| Entity type | `<select>` (All / Intent / Agent / Template / Document / Guardrail / System / Approval) | All |
| Severity | `<select>` (All / Info / Warning / Critical) | All |
| Clear filters link | Appears right-aligned when any filter deviates from default | — |

### 4.4 Summary line

```
Showing {filtered.length} of {total.length} events
```

Small `text-sm text-slate-500`. Appears between filter bar and table.

### 4.5 Event table

Columns (left to right):

| Column | Width | Content |
|--------|-------|---------|
| Timestamp | fixed | "26 Mar 2026, 14:32" |
| Actor | auto | Name + role badge |
| Action | auto | Human-readable label + color-coded left border by category |
| Entity | auto | entityName (small entityType label below) |
| Description | flex-1 | Plain text summary |
| Severity | fixed | Badge |
| Details | fixed | `ChevronRight` button |

**Role badges:**
- BA → `bg-blue-100 text-blue-700 border-blue-200`
- DEV → `bg-purple-100 text-purple-700 border-purple-200`
- ADMIN → `bg-red-100 text-[#E3000F] border-red-200`

**Action display names** (examples):
- `intent.promote` → "Intent Promoted"
- `intent.rollback` → "Intent Rolled Back"
- `system.kill_switch_activate` → "Kill Switch Activated"
- `approval.reject` → "Approval Rejected"

**Category color borders** (left border on action cell):
- Intent → emerald
- Agent → purple
- Template → amber
- Document → sky
- Guardrail → orange
- System → red (`#E3000F`)
- Approval → indigo
- Auth → slate

**Severity badges:**
- `info` → `bg-slate-100 text-slate-600`
- `warning` → `bg-amber-100 text-amber-700`
- `critical` → `bg-red-100 text-[#E3000F]`

**Critical row background:** `bg-red-50/40` tint on the `<tr>`.

**Row animation:** `motion.tr` with `initial={{ opacity: 0, y: 6 }}`, staggered by index (`delay: index * 0.03`).

### 4.6 Inline diff expansion

Clicking the `ChevronRight` details button on a row expands an inline sub-row (spans all columns) showing:

- If the event has no `before`/`after`: "No additional details available."
- If it has `before`/`after`: a two-column diff view
  - Left column: "Before" — key-value pairs, values in `line-through text-red-500`
  - Right column: "After" — key-value pairs, values in `font-bold text-emerald-700`
  - Only shows keys that differ between before/after
  - Renders with `bg-slate-50 rounded-xl p-4 border border-slate-200`

Clicking the button again collapses the row. Uses `AnimatePresence` + `motion.div`.

### 4.7 Pagination

- Page size: 15 events per page
- Controls: `ChevronLeft` / `ChevronRight` buttons + "Page X of Y"
- Reset to page 1 whenever filters change

### 4.8 Empty state

When no events match filters:

```
[centered ClipboardList icon, text-slate-300, size 48]
"No audit events match your filters"
[small "Try adjusting your date range or clearing filters"]
```

---

## 5. CSV Export Specification

Headers:
```
ID,Timestamp,Actor,Role,Action Type,Entity Type,Entity ID,Entity Name,Description,Severity,Use Case
```

Rows: all filtered events (not paginated). Values with commas or quotes must be wrapped in double-quotes with internal quotes escaped (`""`).

---

## 6. Acceptance Criteria

- [ ] 27 mock events displayed
- [ ] All 6 filters work in combination (AND logic)
- [ ] Date range filter correctly compares ISO timestamps
- [ ] Clearing filters resets all inputs to defaults
- [ ] CSV export downloads a valid file with correct headers and all filtered rows
- [ ] Before/after diff expansion shows only changed keys
- [ ] Critical rows have red-50 background tint
- [ ] Pagination shows 15 rows per page; filter changes reset to page 1
- [ ] Empty state shown when no rows match
- [ ] All `motion.tr` rows animate on mount with stagger
- [ ] No TypeScript `any` types
- [ ] `cn()` defined locally (not imported from shared util)
- [ ] Component is fully self-contained

---

## 7. Future Work (post-backend integration)

- Wire to `GET /audit?from=&to=&actor=&action_type=&entity_type=` API
- Replace client-side filter logic with query params
- Add server-side pagination (cursor-based)
- Wire export to `GET /audit/export` endpoint (streaming CSV from database)
- Add real-time polling for new events (30s interval)
