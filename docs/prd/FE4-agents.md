# FE4 — Active Agents UI

**Task:** TASK-FE-AGENTS
**SSOT Sections:** Section 1E (Agent Management), Section 2F (LLM Agent Framework)
**File:** `src/components/ActiveAgents.tsx`
**Status:** Mock data only — no real API calls in this phase.

---

## Overview

The Active Agents component is the backoffice UI for managing AI agent configurations. Agents are specialized LLM configurations per domain (Retirement, Loans, Cards, Security, etc.), each with a system prompt, model parameters, and a set of intents they handle.

---

## Agent Registry (6 Agents)

| Agent | Category | Status | System Prompt Summary | Model | Temp | Max Tokens | Sessions | Fallback | Latency | Satisfaction |
|-------|----------|--------|----------------------|-------|------|------------|----------|----------|---------|-------------|
| Retirement_Planner | Advisory | Active | Retirement planning specialist for CPF, SRS, and investment schemes | claude-3-5-sonnet-20241022 | 0.7 | 2048 | 3,420 | 3.1% | 1.4s | 91.3% |
| Account_Enquiry | Transactional | Active | Account balance, transaction history, and statement queries | claude-3-5-sonnet-20241022 | 0.3 | 1024 | 2,890 | 4.2% | 1.8s | 89.5% |
| Loan_Advisory | Advisory | Active | Home loan, personal loan, and refinancing advisor | claude-3-5-sonnet-20241022 | 0.5 | 2048 | 2,180 | 2.7% | 1.1s | 87.4% |
| Card_Services | Transactional | Active | Credit card rewards, replacements, and limit adjustments | claude-3-5-haiku-20241022 | 0.3 | 1024 | 1,940 | 5.8% | 0.9s | 89.2% |
| Investment_Insights | Advisory | Inactive | Investment portfolio analysis and market insights | claude-3-5-sonnet-20241022 | 0.7 | 2048 | 0 | — | — | — |
| Fraud_Detection | Security | Active | Fraud alert triage, transaction dispute handling | claude-3-5-haiku-20241022 | 0.1 | 512 | 4,210 | 0.8% | 0.7s | 94.7% |

---

## Configuration Features

### System Prompt Editor

- Full-width monospace textarea inside the edit modal
- Label: "System Prompt"
- Textarea: `font-mono`, `min-h-[200px]`, `resize-y`, full-width
- Character count display bottom-right: `"342 / 4000 chars"` (amber if > 3500, red if > 4000)
- Help text: "This prompt is sent to the LLM on every conversation turn."
- Each agent has a pre-populated 2-4 sentence realistic system prompt appropriate for its domain

### Model Configuration

Collapsible "Advanced" section in the edit modal with:

1. **Model ID** — `<select>` dropdown:
   - `claude-3-5-sonnet-20241022` (default)
   - `claude-3-5-haiku-20241022`
   - `claude-opus-4-6`
   - `amazon.titan-text-express-v1`
2. **Temperature** — range slider 0.0-1.0, step 0.1; current value shown inline
3. **Max Tokens** — number input 256-8192, step 256

Toggle header: `Settings2` icon + "Advanced" label, chevron rotates on open. Collapsed by default.

### Intent Routing Editor

Modal with checkboxes for routing intents to each agent.

- Section label: "Routed Intents"
- 8 available intents shown as checkboxes
- Each agent has 2-4 intents pre-assigned
- Save triggers maker-checker approval + audit event
- Intent routing changes shown as before/after diff in approval card

**Mock routing assignments:**
| Agent | Routed Intents |
|-------|---------------|
| Retirement_Planner | OCBC_Life_Goals_Retirement, CPF_Retirement_Advisory |
| Account_Enquiry | Account_Balance_Query, OCBC_360_Salary_Credit |
| Loan_Advisory | Home_Loan_Repayment_Impact |
| Card_Services | Card_Replacement |
| Investment_Insights | Investment_Product_Inquiry |
| Fraud_Detection | International_Transfer |

### Status Toggle

- Active/Inactive toggle per agent
- Status change requires maker-checker approval
- Creates audit event: `agent.status_change`
- Inactive agents display muted styling and "— " for metric values

---

## Per-Agent Performance Metrics

Displayed in the agent table as a "Live Metrics" column and in expanded detail view.

**Table column (compact inline format):**
- Format: `"2.3% fallback · 1.2s avg"`
- Inactive agents: `"— · —"` in muted text

**Color-coding:**
- Fallback > 10%: red text (`text-red-600`)
- Fallback > 5%: amber text (`text-amber-600`)
- Fallback <= 5%: normal slate text
- Latency > 2s: amber text (`text-amber-600`)
- Latency <= 2s: normal slate text

**Expanded detail view per agent:**
- Sessions handled (total)
- Fallback rate (%)
- Average latency (ms)
- Satisfaction score (%)

---

## Table Column Order

1. Agent Name (with description)
2. Category
3. Status
4. Sessions
5. Live Metrics
6. Last Active
7. Actions (Test + Toggle + Edit + Delete)

---

## Test Agent Button

- `Play` icon, small, outline style (`border border-slate-200`)
- Shows on row hover (`opacity-0 group-hover:opacity-100`)
- Clicking shows toast: `"Open Chatbot Preview to test [agent name]"`
- Toast auto-dismisses after 3 seconds

---

## Interface

```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  lastUpdated: string;
  sessionsHandled: number;
  status: 'active' | 'inactive';
  systemPrompt: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  fallbackRate: number;     // percentage, e.g. 3.1 means 3.1%
  avgLatencyMs: number;     // milliseconds, e.g. 1400 means 1.4s
  satisfactionScore: number; // percentage, e.g. 91.3
}
```

---

## Search & Filter

- Text search by agent name, category, or description
- Filter by status (All / Active / Inactive)
- Filter by category (All / Advisory / Transactional / Security)

---

## Toast System

- State: `toast: { message: string; id: number } | null`
- `showToast(message)` sets state and clears after 3000ms
- Toast renders in a `fixed top-6 right-6 z-[200]` container using `AnimatePresence` + `motion.div`
- Style: white card, slate border, shadow, OCBC red left accent stripe

---

## Constraints

- Do NOT break existing search, status toggle, edit/save, delete, pagination
- Modal must remain scrollable for the added sections
- Table rows must stay compact — no added height from new column
- TypeScript strict throughout — no `any`
- All maker-checker approvals generate corresponding audit events
- `cn()` defined locally (not imported from shared util)
- Component is fully self-contained with mock data

---

## Acceptance Criteria

- [ ] All 6 agents render with correct configurations and metrics
- [ ] System prompt editor shows character count with color thresholds (3500 amber, 4000 red)
- [ ] Model selector dropdown includes all 4 model options
- [ ] Temperature slider and max tokens input validate within bounds
- [ ] Intent routing editor shows checkboxes; save triggers approval flow
- [ ] Status toggle triggers maker-checker approval
- [ ] Live metrics column displays formatted fallback rate and latency
- [ ] Color-coding rules applied correctly for all metric thresholds
- [ ] Test button shows toast with agent name
- [ ] Search and filter work in combination
- [ ] No TypeScript `any` types
