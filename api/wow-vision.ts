import Anthropic from '@anthropic-ai/sdk';

export const config = { runtime: 'edge' };

const WOW_VISION_PROMPT = `You are a retirement lifestyle advisor at OCBC Bank Singapore. Your role is to help customers understand how their lifestyle aspirations connect to their retirement financial plan.

Analyse this image and classify the retirement lifestyle tier it represents into exactly one of:
- "enhanced": Extended world travel, iconic international destinations (Europe, the Americas, etc.), luxury experiences at sea (yachts, cruises), premium holiday resorts, luxury retirement villages, upscale overseas living environments. Estimated monthly retirement spend: ~SGD 9,000/month.
- "comfortable": Creative and skill-based workshops, continuous learning pursuits, trekking or hiking in Asia, exploring natural mountain scenery in small groups, outdoor adventures, occasional overseas travel, cooking or hobby-focused activities. Estimated monthly retirement spend: ~SGD 5,000/month.
- "basic": Home gatherings and cosy dining, family bonding, community involvement or volunteering, yoga, meditation, walking in nature, local parks, purposeful day-to-day routines, service-oriented activities. Estimated monthly retirement spend: up to SGD 2,000/month.

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{"tier":"enhanced","reasoning":"2 sentences: describe specifically what you see in the image and why it maps to this retirement tier.","advice":"2–3 sentences of specific OCBC retirement advice for this tier. For enhanced: mention OCBC Premier Banking, Wealth Management, or overseas investment. For comfortable: mention OCBC RoboInvest, CPF Investment Scheme (CPFIS), or SRS contributions. For basic: mention OCBC 360 Account, CPF voluntary top-ups, or Life Goals savings plan. Always reference CPF LIFE as Singapore's foundation retirement income scheme."}`;

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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { image, mimeType } = await request.json();

  try {
    const base64Data = image.includes(',') ? image.split(',')[1] : image;

    const rawMime = (mimeType || 'image/jpeg').toLowerCase();
    const validMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
    type ValidMime = typeof validMimes[number];
    const normalizedMime: ValidMime = validMimes.includes(rawMime as ValidMime)
      ? (rawMime as ValidMime)
      : rawMime === 'image/jpg' ? 'image/jpeg' : 'image/jpeg';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
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
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[wow-vision] error:', err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Vision analysis failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
