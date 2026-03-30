import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getDatabase} from "firebase-admin/database";
import Anthropic from "@anthropic-ai/sdk";

const app = initializeApp({
  databaseURL:
    "https://chatbot-backoffice-8888b-default-rtdb.asia-southeast1.firebasedatabase.app/",
});

const db = getDatabase(app);

setGlobalOptions({maxInstances: 10});

let cachedApiKey: string | null = null;

async function getAnthropicKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const snapshot = await db.ref("/ANTHROPIC_API_KEY").once("value");
  const key = snapshot.val();
  if (!key) throw new Error("ANTHROPIC_API_KEY not found in Realtime Database");
  cachedApiKey = key;
  return key;
}

const RETIREMENT_KNOWLEDGE_BASE = `
# Singapore Retirement Planning – Knowledge Base

## Retirement Age
- Official retirement age: 63 years old (from 2022)
- Re-employment (employer must offer): up to age 68
- CPF payout eligibility age: 65 (can defer to 70 for higher monthly payouts)

## CPF (Central Provident Fund)
### Account Types & Interest Rates
- Ordinary Account (OA): 2.5% p.a. — housing, education, investments
- Special Account (SA): 4.0% p.a. — retirement savings (higher interest, restricted)
- MediSave Account (MA): 4.0% p.a. — medical expenses
- Retirement Account (RA): created at age 55 by merging OA/SA, used for CPF Life

### CPF Contribution Rates (2024, employees ≤55)
- Employee contributes: 20% of gross salary
- Employer contributes: 17% of gross salary
- Total: 37% of gross salary | Ordinary Wage cap: SGD 6,800/month

### CPF Retirement Sums (2024)
| Sum | Amount | Estimated monthly CPF Life payout from 65 |
|-----|--------|------------------------------------------|
| Basic (BRS) | SGD 99,400 | ~SGD 860–930/month |
| Full (FRS) | SGD 198,800 | ~SGD 1,560–1,670/month |
| Enhanced (ERS) | SGD 298,200 | ~SGD 2,200–2,430/month |

### CPF Life Plans
- Standard Plan: Higher monthly payouts, lower bequest
- Basic Plan: Lower monthly payouts, more left for estate
- Escalating Plan: Payouts increase by 2%/year — protects against inflation
- Earliest payout age: 65 (can defer to 70 for ~7% more per year deferred)

## Supplementary Retirement Scheme (SRS)
- Voluntary tax-advantaged account to supplement CPF
- Annual contribution limit: SGD 15,300 (citizens/PRs) | SGD 35,700 (foreigners)
- Tax relief: dollar-for-dollar deduction from chargeable income
- At retirement age (63): only 50% of withdrawals are taxable — significant tax saving
- Penalty for early withdrawal: 5% + full amount taxable
- Invest SRS funds into: unit trusts, ETFs, Singapore-listed shares, endowment plans via OCBC

## Retirement Income Planning
### Rules of Thumb
- **4% Rule**: Withdraw 4% of portfolio per year → need 25× annual expenses as lump sum
- **Rule of 300**: Monthly expenses × 300 = total retirement fund needed
- Example: SGD 3,000/month × 300 = SGD 900,000 target

### Typical Monthly Expenses in Retirement (Singapore)
- Basic (housing, food, transport, utilities): SGD 1,500–2,000
- Comfortable (+ leisure, dining, occasional travel): SGD 2,500–3,500
- Premium (frequent travel, premium healthcare): SGD 4,000+
- Healthcare buffer: add SGD 500–1,000/month for medical costs

### Inflation Impact
- Singapore average inflation: ~2–3% p.a.
- SGD 3,000 today = ~SGD 4,900 in 20 years at 2.5% inflation
- Always plan with inflation-adjusted figures

## Retirement Gap Calculation (Example)
1. Target monthly income: SGD 3,500 → Annual: SGD 42,000
2. Total fund needed (4% rule): SGD 42,000 ÷ 0.04 = SGD 1,050,000
3. Less CPF Life payout (FRS): −SGD 1,670/month = −SGD 20,040/year
4. Net annual withdrawal needed: SGD 42,000 − SGD 20,040 = SGD 21,960
5. Portfolio required for remaining: SGD 21,960 ÷ 0.04 = SGD 549,000
6. Compare to current investable savings + projected growth to find the gap

## OCBC Retirement Products
### OCBC SRS Investment Account
- Open SRS account to invest for retirement with tax relief
- Access: unit trusts, ETFs, Singapore-listed equities
- Annual contributions reduce taxable income immediately

### OCBC RoboInvest
- Automated, diversified portfolio management
- Minimum: SGD 100/month or SGD 3,500 lump sum
- Risk profiles: Conservative → Aggressive | ESG portfolios available
- Typical historical returns (varies): 4–8% p.a. depending on risk level

### OCBC Life Income (Endowment/Annuity)
- Guaranteed lifetime monthly income starting at chosen age
- Premiums paid over fixed term (10–25 years), payouts for life
- Suitable for those who want certainty of income floor

### OCBC Unit Trusts
- Wide range: equity, fixed income, balanced, sector-specific, global
- SRS-eligible funds available for tax-advantaged investing
- Professional fund management with diversification

## Protection Needs in Retirement Planning
- Life protection (death): Cover outstanding liabilities + income replacement
- Disability (Total & Permanent): Replaces income if unable to work permanently
- Critical Illness: Lump sum on diagnosis to fund treatment and recovery
- Long-Term Care / CareShield Life: Covers severe disability costs in old age
- Hospitalisation: MediShield Life is baseline; Integrated Shield Plans for private wards

## Key Planning Principles
1. Start as early as possible — compounding rewards patience
2. Maximise CPF SA contributions (guaranteed 4%, risk-free) before investing elsewhere
3. Use SRS for tax savings especially if you are in the 11.5%+ tax bracket
4. Keep 6–12 months expenses in liquid cash; invest the rest for growth
5. Review your plan every 3–5 years or after any major life event
6. Do not rely solely on CPF — it covers ~40–50% of a comfortable retirement income
7. Account for healthcare inflation (often higher than general inflation)
8. Consider the sequence-of-returns risk when transitioning to drawdown phase
`;

const SYSTEM_PROMPT = `You are a helpful and knowledgeable retirement planning advisor at OCBC Bank, specialised in Singapore retirement planning.

Use the reference information below as a starting point, and draw on your broader financial knowledge to give specific, helpful answers — especially for questions about OCBC products, fees, and performance figures:

${RETIREMENT_KNOWLEDGE_BASE}

Guidelines:
- Be specific and confident — always give concrete numbers and figures when asked
- Keep responses concise (3–5 sentences max) and action-oriented
- Naturally reference OCBC products and their specific rates or returns where relevant
- Ask one follow-up question when more context would help personalise the answer`;

export const rag = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const apiKey = await getAnthropicKey();
    const client = new Anthropic({apiKey});
    const {message} = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = client.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{role: "user", content: message}],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const payload = JSON.stringify({
          type: "delta",
          text: event.delta.text,
        });
        res.write(`data: ${payload}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({type: "end"})}\n\n`);
    res.end();
  } catch (err: unknown) {
    const error = err as Error & {status?: number};
    logger.error("[rag] error:", error.message ?? error);
    res.status(500).json({error: "Internal server error"});
  }
});
