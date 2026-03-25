# FE4 — Active Agents UI Upgrade

**Task:** TASK-FE-AGENTS
**SSOT Sections:** Section 1E (Agent Management), Section 2F (LLM Agent Framework), "Files to Modify"
**File:** `src/components/ActiveAgents.tsx`
**Status:** Mock data only — no real API calls in this phase.

---

## Background

The `ActiveAgents` component is the backoffice UI for managing AI agent configurations. Agents in this system are specialized LLM configurations per domain (Retirement, Loans, Cards, Security, etc.), each with a system prompt, model parameters, and a set of intents they handle. Currently the component supports basic CRUD and status toggling but is missing the features developers need to meaningfully configure agents.

SSOT Section 1E identifies these gaps (features #51–56):
- #51: System prompt editor (full text)
- #52: Model parameters (model ID, temperature, max tokens)
- #53: Intent routing map assignment
- #55: Per-agent live metrics in the table view
- #56: Test agent shortcut (pointing to Chatbot Preview)

---

## Changes

### Change 1: System Prompt Template Editor

**What:** Add a full-width monospace textarea inside the edit modal for the agent's system prompt.

**Interface change:** Add `systemPrompt: string` to `Agent`.

**Mock data:** Pre-populate each agent with a 2–4 sentence realistic system prompt appropriate for its domain.

**UI:**
- Label: "System Prompt"
- Textarea: `font-mono`, `min-h-[200px]`, `resize-y`, full-width
- Character count display bottom-right: `"342 / 4000 chars"` (amber if > 3500, red if > 4000)
- Help text below: `"This prompt is sent to the LLM on every conversation turn."`

---

### Change 2: Model Configuration (Collapsible Advanced Section)

**What:** A collapsible "Advanced" section in the edit modal with model config fields.

**Interface change:** Add `modelId?: string`, `temperature?: number`, `maxTokens?: number` to `Agent`.

**UI:**
- Toggle header: `Settings2` icon + "Advanced" label, chevron rotates on open
- Collapsed by default
- Fields:
  1. **Model ID** — `<select>` with options: `claude-3-5-sonnet-20241022` (default), `claude-3-5-haiku-20241022`, `claude-opus-4-6`, `amazon.titan-text-express-v1`
  2. **Temperature** — range slider 0.0–1.0, step 0.1; current value shown inline
  3. **Max Tokens** — number input 256–8192, step 256

**Mock defaults:** modelId = `claude-3-5-sonnet-20241022`, temperature = 0.7, maxTokens = 2048.

---

### Change 3: Intent Routing Map

**What:** A "Routed Intents" section in the edit modal showing which intents route to this agent.

**Mock data:** `MOCK_INTENT_ROUTING` object keyed by agent ID, listing 2–4 intent names per agent.

**UI:**
- Section label: "Routed Intents"
- Intents shown as small pill tags (slate background, slate text)
- "Edit routing →" link below tags; clicking shows a toast: `"Intent routing is managed in the Active Topics tab"`
- For inactive agents with no routing, show a muted `"No intents routed to this agent."` message

---

### Change 4: Per-Agent Live Metrics Column

**What:** A new "Live Metrics" column in the agent table between Sessions and Actions.

**Interface change:** Add `fallbackRate: number` and `avgLatencyMs: number` to `Agent`.

**UI (inline, compact):**
- Format: `"2.3% fallback · 1.2s avg"`
- `Investment_Insights_Agent` (inactive): show `"— · —"` in muted text
- Color-coding:
  - Fallback > 10%: red text (`text-red-600`)
  - Fallback > 5%: amber text (`text-amber-600`)
  - Fallback <= 5%: normal slate text
  - Latency > 2s: amber text (`text-amber-600`)
  - Latency <= 2s: normal slate text

**Mock values:**
- Retirement_Planner_Agent: fallback 3.1%, latency 1.4s
- Account_Enquiry_Agent: fallback 4.2%, latency 1.8s
- Loan_Advisory_Agent: fallback 2.7%, latency 1.1s
- Card_Services_Agent: fallback 5.8%, latency 0.9s
- Investment_Insights_Agent: inactive — display `"— · —"`
- Fraud_Detection_Agent: fallback 0.8%, latency 0.7s

---

### Change 5: Test Agent Button

**What:** A small "Test" button in the actions column.

**UI:**
- `Play` icon, small, outline style (`border border-slate-200`)
- Shows on row hover (same `opacity-0 group-hover:opacity-100` pattern)
- Clicking shows a toast notification: `"Open Chatbot Preview to test [agent name]"`
- Toast auto-dismisses after 3 seconds; positioned top-right of viewport

---

## Toast System

A lightweight in-component toast mechanism:
- State: `toast: { message: string; id: number } | null`
- `showToast(message)` sets state and clears after 3000ms
- Toast renders in a `fixed top-6 right-6 z-[200]` container using `AnimatePresence` + `motion.div`
- Style: white card, slate border, shadow, OCBC red left accent stripe

---

## Table Column Order (after changes)

1. Agent Name (with description)
2. Category
3. Status
4. Sessions
5. Live Metrics ← new
6. Last Active
7. Actions (Test + Toggle + Edit + Delete) ← Test button added

---

## Interface Summary

```typescript
interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  lastUpdated: string;
  sessionsHandled: number;
  status: AgentStatus;
  // New fields
  systemPrompt: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  fallbackRate: number;   // percentage, e.g. 3.1 means 3.1%
  avgLatencyMs: number;   // milliseconds, e.g. 1400 means 1.4s; 0 = inactive/unknown
}
```

---

## Constraints

- Do NOT break existing search, status toggle, edit/save, delete, pagination
- Modal must remain scrollable for the added sections
- Table rows must stay compact — no added height from new column
- TypeScript strict throughout — no `any`
