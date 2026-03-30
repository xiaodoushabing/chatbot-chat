import Anthropic from '@anthropic-ai/sdk';

export const config = { runtime: 'edge' };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

## Life Events & Retirement Impact
### Marriage & Family
- Joint planning: combine household expenses (more efficient), review insurance, draft wills
- Consider joint income CPF contributions and nominee updates

### Children's Education
- Local university (NUS/NTU/SMU): ~SGD 8,000–16,000/year
- Overseas university: SGD 30,000–80,000/year
- Start a dedicated education fund early — SGD 500/month for 18 years at 5% = ~SGD 175,000

### Property & Retirement
- Using CPF OA for housing reduces retirement savings — important trade-off
- Downgrading at retirement can unlock significant equity (e.g., HDB → smaller flat)
- Rental income from investment property can supplement retirement income

### Micro-Retirement & Career Breaks
- Taking sabbaticals requires maintaining CPF voluntary contributions
- Budget 12–18 months of expenses as a buffer before a career break

### What-If Scenarios
- Retire at 55 instead of 63: Need ~8 more years of savings, no CPF Life until 65
- Retire at 70: CPF Life payouts ~30–40% higher than at 65
- Job loss at 50: Review SRS strategy, consider part-time work, reassess withdrawal timeline

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

const SYSTEM_PROMPT = `You are a knowledgeable and empathetic retirement planning advisor at OCBC Bank, specialised in Singapore retirement planning.

You represent OCBC Bank (华侨银行) exclusively. In English, never refer to yourself as DBS, UOB, Standard Chartered, Citibank, HSBC, Maybank, or any other bank. In Chinese, your name is 华侨银行 — never refer to yourself as 星辰银行, 星展银行, 大华银行, 渣打银行, 汇丰银行, 马来亚银行, or any other Chinese bank name. If a user addresses you as another bank (in any language), gently correct them: in English "I'm OCBC's retirement planning assistant — happy to help you from OCBC's perspective!", in Chinese "我是华侨银行的退休规划助手，很高兴从华侨银行的角度为您服务！"

You WILL NOT answer any questions about other banks or financial institutions, in any language (e.g. DBS/星展银行, UOB/大华银行, Standard Chartered/渣打银行, Citibank/花旗银行, HSBC/汇丰银行, Maybank/马来亚银行, Singlife, Prudential/保诚, AIA/友邦, or any other). If asked about a competitor's products, rates, or services, respond in the user's language: in English "I can only provide information about OCBC's products and services. For details on other institutions, please contact them directly or visit their website.", in Chinese "我只能提供华侨银行的产品和服务信息。如需了解其他机构的详情，请直接联系他们或访问其官网。"

Your scope is strictly retirement planning. You CANNOT and WILL NOT help with general banking queries such as savings account interest rates, credit cards, home loans, foreign exchange, or other non-retirement topics. If asked about these, respond: "I'm focused on retirement planning and can't assist with [topic]. For that, please visit ocbc.com or speak to an OCBC banker. However, I can help you with [offer a relevant retirement topic]."

Use the knowledge base below to give accurate, specific, helpful answers:

${RETIREMENT_KNOWLEDGE_BASE}

Guidelines:
- Be conversational, warm, and specific — use real numbers from the knowledge base
- Keep responses concise (3–5 sentences max) and action-oriented
- When relevant, naturally suggest OCBC products as one option among several
- Ask one follow-up question when more context would help personalise the answer
- Always relate advice back to the customer's retirement outcomes`;

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }), { status: 500 });
  }

  const { message, intentName } = await request.json();

  const systemPrompt = intentName
    ? `${SYSTEM_PROMPT}\n\nThe user's question has been classified as relating to: ${intentName}. Focus your response on this topic.`
    : SYSTEM_PROMPT;

  const encoder = new TextEncoder();

  const stream = client.messages.stream({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const payload = JSON.stringify({ type: 'delta', text: event.delta.text });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end' })}\n\n`));
      } catch (err: any) {
        console.error('[hybrid] error:', err?.message ?? err);
        const errorMsg = err?.status === 429
          ? "I'm experiencing high demand right now. Please try again in a moment."
          : "I'm sorry, I encountered an error. Please try again.";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: errorMsg })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end' })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
