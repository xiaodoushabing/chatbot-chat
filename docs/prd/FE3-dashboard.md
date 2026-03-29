# FE3 — Executive Dashboard Upgrade

**Task ID:** TASK-FE-DASHBOARD
**File:** `src/components/ExecutiveDashboard.tsx`
**SSOT Sections:** 1D (Observability & Analytics), Section 7 (Cloud Platform Value Narrative)
**Status:** Mock data only (no real API calls in this iteration)

---

## Scope

Add five new capability areas to the existing `ExecutiveDashboard` component. All existing charts, stat cards, and guardrail cards must remain untouched. All new data is mocked and internally consistent.

---

## Change 1: Project Selector

**Position:** Top-right of header, next to the time filter pills.

**Options:** "Retirement Planning" (default selected), "Home Loans", "Card Services", "All Projects"

**Behaviour:**
- Selecting a project updates a `selectedProject` state string
- Hero card title and subtitle reflect the active project
- Charts are labelled "(demo data)" — no chart data changes on switch
- Use `Layers` icon from lucide-react beside the dropdown label

**Implementation:** Native `<select>` element styled to match the existing pill-button group, or a custom dropdown with `useState`. Keep it simple — no animation required.

---

## Change 2: Agent Cost Intelligence Section

**Position:** After the guardrail cards (emerald + violet row), before the Risk Alert card.

**Section header:** "Agent Cost Intelligence" with `DollarSign` icon (amber accent).

**Three stat cards (row):**

| Card | Value | Subtext | Trend badge |
|------|-------|---------|-------------|
| Monthly LLM Cost | $1,247.30 | March 2026 | -8% vs Feb (green — cost down = good) |
| Cost per 1,000 Queries | $0.038 | Rolling 30-day avg | +2% (amber) |
| Projected Annual Cost | $14,967 | At current query volume | note: "vs $180K self-hosted GPU estimate" in small emerald text |

**Per-agent cost table (below cards):**

Columns: Agent Name | Sessions This Month | Cost This Month | Cost / 1K Sessions | Trend

Mock rows (sorted by Cost This Month descending):

| Agent | Sessions | Cost | Cost/1K | Trend |
|-------|----------|------|---------|-------|
| Retirement_Planner_Agent | 3,420 | $312.40 | $91.34 | ↓ 5% |
| Loan_Advisory_Agent | 2,180 | $287.60 | $131.93 | ↑ 3% |
| Card_Services_Agent | 1,940 | $241.80 | $124.64 | ↓ 2% |
| Wealth_Advisory_Agent | 1,650 | $213.10 | $129.15 | ↑ 7% |
| Fraud_Detection_Agent | 4,210 | $192.40 | $45.70 | ↓ 1% |
| Investment_Insights_Agent | 0 | $0.00 | $0.00 | — |

Total costs: $312.40 + $287.60 + $241.80 + $213.10 + $192.40 + $0 = $1,247.30 (matches hero card).

**Styling:** `bg-slate-900` card background with amber/gold accent border (`border-amber-500/30`). Distinct from the red guardrail cards.

---

## Change 3: Per-Agent Performance Breakdown (Collapsible)

**Position:** After the Agent Cost Intelligence section.

**Pattern:** Same collapsible pattern as the existing "Detailed Analytics" section — `AnimatePresence` + `motion.div` with height animation.

**Table columns:** Agent | Active | Sessions | Fallback Rate | Avg Latency | Satisfaction

**Color-coding rules:**
- Fallback rate > 10% → red text/badge
- Fallback rate 5–10% → amber
- Fallback rate < 5% → green
- Latency > 2000ms → amber
- Satisfaction < 85% → amber

**Sessions column:** Include a mini sparkline (Recharts `LineChart` `width={80}` `height={30}`, no axes, no tooltip) showing 7-day trend.

**Mock data:**

| Agent | Active | Sessions | Fallback | Latency | Satisfaction |
|-------|--------|----------|----------|---------|--------------|
| Retirement_Planner_Agent | Yes | 3,420 | 3.2% | 1,840ms | 91.3% |
| Loan_Advisory_Agent | Yes | 2,180 | 6.1% | 2,120ms | 87.4% |
| Card_Services_Agent | Yes | 1,940 | 4.8% | 1,650ms | 89.2% |
| Wealth_Advisory_Agent | Yes | 1,650 | 11.3% | 2,430ms | 82.1% |
| Fraud_Detection_Agent | Yes | 4,210 | 1.4% | 420ms | 94.7% |
| Investment_Insights_Agent | No | 0 | — | — | — |

---

## Change 4: PDF Export Button

**Position:** Top-right header area, next to the project selector.

**Icon:** `Download` from lucide-react.

**Label:** "Export Report" (shows "Preparing..." for 800ms on click then reverts and calls `window.print()`).

**Print CSS:** Injected via `useEffect` into `document.head` as a `<style>` tag with media `print`. Rules:
- Hide sidebar, top nav, and all interactive controls (buttons, dropdowns, collapsible toggles)
- Show only the dashboard content area
- Add a print header via `::before` pseudo-element on the dashboard root with "OCBC AI Chatbot — Executive Dashboard" and the current date

**Implementation:** `isPrinting` state (boolean), `useEffect` for print style injection, `window.print()` in the button handler.

---

## Change 5: Hero Banner with Trending Insights

**Hero banner** at the top of the dashboard with trending insights and project context.

**Cloud Powered badge:** Small pill badge in the top-right of the hero card. Contains "Cloud Powered" text and a small cloud icon (use `Cloud` from lucide-react).

**Project Selector:** Dropdown integrated into the hero banner. Options: "Retirement Planning" (default), "Home Loans", "Card Services", "All Projects". Selecting a project updates the hero heading, subtitle, and "Review Policy" action buttons.

**Example titles per project:**
- Retirement Planning: "Trending: OCBC 360 Account Changes" — "Review Policy" links to Active Topics
- Home Loans: "Trending: Fixed Rate Lock-In Queries" — "Review Policy" links to Active Topics
- Card Services: "Trending: Miles Card Rewards Redemption" — "Review Policy" links to Active Topics
- All Projects: "Cross-Project: Multi-Domain Query Surge" — "Review All" links to Active Topics

**Action buttons:** Each hero banner includes contextual "Review Policy" buttons that highlight the trending insight for the selected project.

---

## Change 6: Kill Switch Controls

**Position:** Prominently displayed in the Observability dashboard header area, near the KPI cards.

**Activate flow:**
1. "Activate Kill Switch" button (red outline, `Power` icon) visible when kill switch is inactive
2. Click opens confirmation dialog: "This will immediately disable all LLM agent calls. All queries will be served by template responses or exclusion messages."
3. Buttons: "Cancel" | "Activate Emergency Override" (red, `Power` icon)
4. On confirm: kill switch activates, creates pending approval + audit event (`system.kill_switch_activate`), shows toast: "Kill switch activated — submitted for approval"

**Deactivate flow:**
1. When kill switch is active, header shows red banner: "KILL SWITCH ACTIVE — GenAI Disabled"
2. "Deactivate" button (white outline on red)
3. Click opens maker-checker submission: "Deactivation requires checker approval. Submit for review?"
4. On confirm: creates pending approval (`system.kill_switch_deactivate`), shows toast: "Deactivation submitted for approval"

**Visual indicators when active:**
- Pulsing red dot in dashboard header
- "GenAI Disabled" system status badge
- All GenAI metric cards show warning state

---

## Change 7: Guardrails Monitor

**Position:** After the existing guardrail cards (emerald + violet row).

**Three stat cards (row):**

| Card | Value | Subtext | Style |
|------|-------|---------|-------|
| Hallucinations Detected | 247 | 0.75% of total queries | Amber border, `Brain` icon |
| Successful Blocks | 158 | Topics excluded + words denied | Emerald border, `ShieldCheck` icon |
| Risk Attempts | 89 | 2.4% of total queries | Red border, `AlertTriangle` icon |

**Details (expandable):**
- Top blocked topics this period
- Top denied phrases triggered
- Injection attempts breakdown

---

## Change 8: Cost Projection

**Position:** Within the Agent Cost Intelligence section (Change 2).

**Three projection cards:**

| Card | Value | Subtext |
|------|-------|---------|
| Monthly Cost | $1,247.30 | March 2026 actual |
| Cost per 1,000 Queries | $0.038 | Rolling 30-day average |
| Projected Annual Cost | $14,967 | At current query volume, vs $180K self-hosted GPU estimate |

These are the summary stat cards for the cost intelligence section, with the per-agent cost table below providing the breakdown.

---

## TypeScript Constraints

- All new state: `useState<string>` for `selectedProject`, `useState<boolean>` for `showAgentPerformance`, `showCostSection`, `isPrinting`, `isExporting`
- New sub-components: `AgentCostTable`, `AgentPerformanceTable`, `CostStatCard` — all typed with explicit prop interfaces
- All mock data arrays declared at module scope with `as const` where appropriate
- No `any` types

---

## Non-Goals

- No real API calls
- No routing / navigation changes
- No changes to existing stat cards, charts, or guardrail cards
- No removal of existing content
