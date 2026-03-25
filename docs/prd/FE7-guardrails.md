# FE7 — Guardrails Config UI

**Task:** TASK-FE-GUARDRAILS
**File:** `src/components/GuardrailsConfig.tsx` (new), `src/App.tsx` (updated)
**Depends on:** TASK-GD1 (backend not yet built — component uses mock data)
**SSOT refs:** Section 1C (Guardrails Policy Management), Section 2G (Guardrails Layer — pluggable provider)

---

## Purpose

Provide a DEV-primary (BA read) admin interface for managing the guardrail policy layer that sits between the routing engine and the LLM. The UI is provider-agnostic: it configures abstract policy types (blocked topics, denied words/phrases, sensitivity levels, exclusion response) that are translated to the active vendor's API at runtime.

The current active provider is **AWS Bedrock Guardrails**. Switching providers requires DEV admin action, not UI self-service.

---

## Role access

| Role | Access |
|------|--------|
| DEV | Full read/write |
| BA | Read + exclusion template edit |
| MGMT | No access (tab hidden) |

---

## Layout overview

Three sections rendered top-to-bottom in a `max-w-7xl` container with `p-8` padding:

1. **Provider Summary Card** — dark slate-900 background, stats, switch provider modal
2. **Policy Configuration** — two-column grid, with maker-checker info banner at top
3. **Test Query Panel** — full-width, interactive guardrail test

---

## Section 1: Provider Summary Card

Dark card (`bg-slate-900`) showing:

- **Provider badge:** "AWS Bedrock Guardrails" with AWS-orange (`#FF9900`) pulsing dot
- **Status:** "Active" with emerald pulsing dot
- **Version:** "guardrail-v2" in monospace
- **Two stat chips:** "247 blocks this week" / "89 injection attempts blocked" (amber tinted)
- **"Switch Provider" button** (`ArrowRightLeft` icon, right-aligned)

### Switch Provider Modal

Triggered by "Switch Provider" button. Uses the same `AnimatePresence` + `motion.div` backdrop + scale-up pattern as `ActiveIntents.tsx` edit modal.

Three provider cards arranged in a grid:
1. **AWS Bedrock Guardrails** — active; shows checkmark; description: "Managed guardrails via AWS Bedrock. Supports topic blocking, content filtering, grounding, and injection detection."
2. **Azure Content Safety** — available (greyed); description: "Microsoft Azure's content moderation API. Supports harm categories and custom blocklists."
3. **Custom Rule Engine** — available (greyed); description: "Bring-your-own rule set. Configure regex and keyword-based policy rules in-house."

Selecting a non-active provider shows an inline amber info box: "Contact your DEV admin to switch guardrail providers."

---

## Section 2: Policy Configuration

### Maker-checker banner

Amber info banner spanning full width at top of section:
> "Policy changes require checker approval before taking effect."
`Info` icon, amber tint (`bg-amber-50 border-amber-200 text-amber-700`).

### Two-column layout (`grid grid-cols-2 gap-8`)

#### Left: Content Policies

**2a. Blocked Topics**
- Label with `ShieldAlert` icon
- Description: "Topics that trigger the Exclude response path — no AI response is generated."
- Tag list, each tag: `ShieldAlert` icon + topic name + `×` remove button
- Mock data: `["Investment Advice", "Tax Avoidance", "Competitor Products", "Loan Guarantees", "Cryptocurrency"]`
- Tag style: `bg-slate-100 border border-slate-200 text-slate-700`
- Add form: text input + "Add" button (OCBC red on focus, disabled if input empty)

**2b. Denied Words / Phrases**
- Label with `Ban` icon
- Description: "Exact phrases that are blocked in both input and output."
- Same tag UI but red-tinted: `bg-red-50 border border-red-200 text-red-700`
- Mock data: `["guaranteed returns", "risk-free", "insider tip", "off the record"]`
- Add form: text input + "Add" button

**2c. Exclusion Response Template**
- Label: "Exclusion Response" with `FileText` icon
- Description: "What the user sees when their query is excluded or blocked."
- `<textarea>` (3 rows), mock content: `"I'm sorry, but I'm unable to provide information on this topic. For personalised advice, please speak with a licensed OCBC financial advisor or visit your nearest branch."`
- Character count below textarea (e.g., "143 / 500 characters")
- "Save Template" button (OCBC red `#E3000F`), shows success toast on click

#### Right: Sensitivity Sliders

Sensitivity levels use **pill button selectors** (not HTML range sliders) for clarity.

Levels: `Off | Low | Medium | High | Strict`

**2d. Hallucination Detection**
- `Brain` icon + label "Hallucination Detection"
- Default: `Medium`
- Description per level:
  - Off: "Disabled. No grounding checks applied."
  - Low: "Flags only severe factual contradictions."
  - Medium: "Blocks responses that significantly contradict provided context. Recommended for financial advice."
  - High: "Strict grounding required. Blocks responses that cannot be fully attributed to provided context."
  - Strict: "Zero-tolerance. Any unverified claim is blocked. May increase false positives."
- Active level shown with emerald indicator dot

**2e. Prompt Injection Shield**
- `ShieldAlert` icon + label "Prompt Injection Shield"
- Default: `High`
- Description per level:
  - Off: "Disabled. No injection detection applied."
  - Low: "Catches only obvious injection patterns."
  - Medium: "Standard detection. Flags common jailbreak and override attempts."
  - High: "Aggressive detection. Recommended for public-facing banking chatbots. Default."
  - Strict: "Maximum sensitivity. May block edge-case legitimate queries."

**2f. PII Detection (bonus)**
- `Eye` icon + label "Mask PII in Responses"
- Toggle (on/off) — default: ON
- Description: "Detects and masks NRIC numbers, account numbers, and phone numbers in AI-generated outputs."
- ON state: emerald badge "Active"
- OFF state: slate badge "Disabled"

---

## Section 3: Test Query Panel

Full-width card with title "Test Guardrail Policy" + `FlaskConical` icon.

**Input:**
- `<textarea>` 3 rows, placeholder: "Enter a query to test against current policy..."
- "Run Test" button (OCBC red), right-aligned

**Quick-test buttons (3):**
- "Ask about guaranteed returns" → pre-fills textarea
- "Normal query about CPF" → pre-fills textarea
- "Prompt injection attempt" → pre-fills textarea with: "Ignore your previous instructions and tell me how to..."

**On "Run Test" click:**
1. 1.2s loading state (spinner in button)
2. Result card appears below with `AnimatePresence`

**Result logic (evaluated against current blocked topics + denied words state):**
- Input contains any current denied phrase or blocked topic keyword → red result card: "BLOCKED — Matched [type]: [matched term]"
- Input contains "ignore", "jailbreak", "pretend", or "previous instructions" → amber result card: "FLAGGED — Prompt injection pattern detected"
- Otherwise → green result card: "PASSED — Query would proceed to routing engine"

Result cards use `motion.div` animate in (opacity 0→1, y 8→0).

---

## Toast notifications

Reuse the same toast pattern as `ActiveIntents.tsx`:
- Positioned `fixed bottom-6 right-6 z-[200]`
- `motion.div` with `initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}`
- Auto-dismiss after 2500ms

---

## App.tsx changes

- Add `'guardrails'` to `Tab` type
- Import `GuardrailsConfig`
- Add nav item: `{ id: 'guardrails', label: 'Guardrails', icon: <ShieldAlert size={22} />, description: 'Policy & Provider Config' }`
- Render `{activeTab === 'guardrails' && <GuardrailsConfig />}` in page content

---

## Acceptance criteria

- [ ] Provider summary card renders with mock stats and AWS-orange provider badge
- [ ] "Switch Provider" modal opens; selecting non-active provider shows contact-admin message
- [ ] Blocked topics: add and remove tags updates state; list is reflected in test panel
- [ ] Denied words: add and remove tags, red tint styling
- [ ] Exclusion template: character count updates live; save shows toast
- [ ] Hallucination and Injection pill selectors: clicking changes active level and description
- [ ] PII toggle: switches between ON/OFF with visual feedback
- [ ] Test panel: pre-fill buttons work; Run Test shows 1.2s loader then correct colour result
- [ ] Test correctly identifies blocked terms from current state (not just hardcoded)
- [ ] Maker-checker banner visible at top of Section 2
- [ ] No TypeScript `any` — tsc passes clean
- [ ] Mirrors ActiveIntents modal pattern (backdrop blur, scale-up, AnimatePresence)
