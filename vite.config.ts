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

  return {
    name: 'rag-api',
    configureServer(server: any) {
      server.middlewares.use('/api/rag', makeLlmMiddleware(RAG_SYSTEM_PROMPT_GENAI));
      server.middlewares.use('/api/hybrid', makeLlmMiddleware(RAG_SYSTEM_PROMPT));
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
