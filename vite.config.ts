import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import Anthropic from '@anthropic-ai/sdk';
import { RAG_SYSTEM_PROMPT, RAG_SYSTEM_PROMPT_GENAI } from './chatbot_demo/src/lib/knowledge-base';

function ragApiPlugin(apiKey: string) {
  function makeLlmMiddleware(systemPrompt: string) {
    return async (req: any, res: any, next: any) => {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.end();
        return;
      }
      if (req.method !== 'POST') { next(); return; }

      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk);
      const { message } = JSON.parse(Buffer.concat(chunks).toString());

      const client = new Anthropic({ apiKey });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        const stream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }],
        });
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            res.write(`data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`);
          }
        }
        res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
      } catch {
        res.write(`data: ${JSON.stringify({ type: 'error', text: 'An error occurred.' })}\n\n`);
      }
      res.end();
    };
  }

  const wowVisionMiddleware = async (req: any, res: any, next: any) => {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.end();
      return;
    }
    if (req.method !== 'POST') { next(); return; }

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const { image, mimeType } = JSON.parse(Buffer.concat(chunks).toString());

    const client = new Anthropic({ apiKey });

    res.setHeader('Content-Type', 'application/json');

    try {
      const base64Data = image.includes(',') ? image.split(',')[1] : image;

      // Normalize MIME type — Claude only accepts jpeg/png/gif/webp
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
            {
              type: 'text',
              text: `You are a retirement lifestyle advisor at OCBC Bank Singapore. Your role is to help customers understand how their lifestyle aspirations connect to their retirement financial plan.

Analyse this image and classify the retirement lifestyle tier it represents into exactly one of:
- "aspirational": Luxury living — premium international travel, fine dining, private clubs, high-end fashion, luxury property or second home. Estimated monthly retirement spend: SGD 8,000–15,000+.
- "balanced": Comfortable family life — regional travel, dining out regularly, children's education, hobbies, upgrading from HDB to private property. Estimated monthly retirement spend: SGD 4,000–8,000.
- "essential": Simple, meaningful living — local leisure, nature, community activities, wellness, modest needs comfortably met. Estimated monthly retirement spend: SGD 2,000–4,000.

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{"tier":"aspirational","reasoning":"2 sentences: describe specifically what you see in the image and why it maps to this retirement tier.","advice":"2–3 sentences of specific OCBC retirement advice for this tier. For aspirational: mention OCBC Premier Banking, Wealth Management, or overseas investment. For balanced: mention OCBC RoboInvest, CPF Investment Scheme (CPFIS), or SRS contributions. For essential: mention OCBC 360 Account, CPF voluntary top-ups, or Life Goals savings plan. Always reference CPF LIFE as Singapore's foundation retirement income scheme."}`,
            },
          ],
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const result = JSON.parse(jsonMatch[0]);
      res.end(JSON.stringify(result));
    } catch (err: any) {
      console.error('[wow-vision] error:', err?.message ?? err);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: err?.message ?? 'Vision analysis failed. Please try again.' }));
    }
  };

  return {
    name: 'rag-api',
    configureServer(server: any) {
      server.middlewares.use('/api/rag', makeLlmMiddleware(RAG_SYSTEM_PROMPT_GENAI));
      server.middlewares.use('/api/hybrid', makeLlmMiddleware(RAG_SYSTEM_PROMPT));
      server.middlewares.use('/api/wow-vision', wowVisionMiddleware);
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), ragApiPlugin(env.ANTHROPIC_API_KEY)],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
