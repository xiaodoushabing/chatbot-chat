import Anthropic from '@anthropic-ai/sdk';

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `You are a retirement lifestyle advisor at OCBC Bank Singapore. Based on a short conversation, classify the user's retirement lifestyle tier and write a brief personalised reasoning addressed directly to them using "you" and "your".

Tiers:
- "enhanced": Extended world travel, luxury experiences, iconic international destinations, premium resorts, upscale living. ~SGD 9,000/month.
- "comfortable": Hobbies, learning, outdoor activities, occasional travel, social activities, dining out. ~SGD 5,000/month.
- "basic": Home life, family, community, simple wellness (yoga, walking, meditation), local routines. Up to SGD 2,000/month.

You will receive questions and the user's answers. Infer their preferred retirement lifestyle from what they actually said — do not assume or embellish. If their answers are vague or minimal (e.g. "chill, sleep, eat"), reflect that simply and honestly. Always address the user as "you" — never refer to them in the third person.

Respond with ONLY valid JSON, no markdown:
{"tier":"comfortable","reasoning":"1-2 sentences addressed to the user (using you/your), grounded in what they actually said, honest and specific."}`;

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

  const { questions, answers } = await request.json();

  const conversation = (questions as string[])
    .map((q: string, i: number) => `Q: ${q}\nA: ${answers[i] ?? '(no answer)'}`)
    .join('\n\n');

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: conversation }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const result = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[lifestyle-chat] error:', err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Classification failed.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
