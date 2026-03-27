import Anthropic from '@anthropic-ai/sdk';

const WOW_VISION_PROMPT = `You are a retirement lifestyle advisor at OCBC Bank Singapore. Your role is to help customers understand how their lifestyle aspirations connect to their retirement financial plan.

Analyse this image and classify the retirement lifestyle tier it represents into exactly one of:
- "aspirational": Luxury living — premium international travel, fine dining, private clubs, high-end fashion, luxury property or second home. Estimated monthly retirement spend: SGD 8,000–15,000+.
- "balanced": Comfortable family life — regional travel, dining out regularly, children's education, hobbies, upgrading from HDB to private property. Estimated monthly retirement spend: SGD 4,000–8,000.
- "essential": Simple, meaningful living — local leisure, nature, community activities, wellness, modest needs comfortably met. Estimated monthly retirement spend: SGD 2,000–4,000.

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{"tier":"aspirational","reasoning":"2 sentences: describe specifically what you see in the image and why it maps to this retirement tier.","advice":"2–3 sentences of specific OCBC retirement advice for this tier. For aspirational: mention OCBC Premier Banking, Wealth Management, or overseas investment. For balanced: mention OCBC RoboInvest, CPF Investment Scheme (CPFIS), or SRS contributions. For essential: mention OCBC 360 Account, CPF voluntary top-ups, or Life Goals savings plan. Always reference CPF LIFE as Singapore's foundation retirement income scheme."}`;

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, mimeType } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const client = new Anthropic({ apiKey });

  try {
    const base64Data = image.includes(',') ? image.split(',')[1] : image;

    const rawMime = (mimeType || 'image/jpeg').toLowerCase();
    const validMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
    type ValidMime = typeof validMimes[number];
    const normalizedMime: ValidMime = validMimes.includes(rawMime as ValidMime)
      ? (rawMime as ValidMime)
      : rawMime === 'image/jpg' ? 'image/jpeg' : 'image/jpeg';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: normalizedMime, data: base64Data },
          },
          { type: 'text', text: WOW_VISION_PROMPT },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[wow-vision] error:', err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? 'Vision analysis failed. Please try again.' });
  }
}
