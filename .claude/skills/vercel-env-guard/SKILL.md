---
name: vercel-env-guard
description: Use before deploying to Vercel or when creating/modifying files in api/ directory. Reviews serverless functions for env var anti-patterns that cause cold-start failures.
---

# Vercel Env Var Cold-Start Guard

Scan serverless functions and build configs for patterns that cause env var failures on Vercel cold starts. Run this before any Vercel deployment.

## Checklist

Use Grep and Read to check every item below. Report findings with file paths and line numbers.

### 1. Implicit SDK constructor (Critical)

**Flag:** Any AI SDK constructor without an explicit API key in `api/**/*.ts` files.

```typescript
// BAD - relies on SDK auto-detecting process.env
const client = new Anthropic();
const openai = new OpenAI();

// GOOD - explicit key passed
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

**Search:** `Grep` for `new Anthropic()` and `new OpenAI()` (empty parens or no `apiKey`) in `api/` directory.

### 2. In-handler client instantiation (High)

**Flag:** SDK clients created inside `handler()` / `POST()` / `GET()` functions instead of at module level.

```typescript
// BAD - recreated on every request, cold-start timing risk
export default async function handler(req, res) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// GOOD - created once at module load, reused across warm invocations
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export default async function handler(req, res) {
  // use client here
}
```

**Search:** `Grep` for `new Anthropic\|new OpenAI` inside function bodies in `api/` files. Check if the `const client` line appears after an `export` or `function handler` line.

### 3. Missing env var guard (High)

**Flag:** Handlers that use `process.env.*_KEY` or `process.env.*_SECRET` without returning a clear error if missing.

```typescript
// GOOD - early guard with actionable error message
if (!process.env.ANTHROPIC_API_KEY) {
  return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
}
```

**Search:** For each `api/*.ts` file, verify there is a guard checking the required env var before any API call.

### 4. Build config SDK pollution (Critical)

**Flag:** `vite.config.ts` or `next.config.ts` with unconditional top-level imports of AI SDK packages.

```typescript
// BAD - imported during production build, pollutes Vercel's nft module trace
import Anthropic from '@anthropic-ai/sdk';
import { RAG_SYSTEM_PROMPT } from './chatbot_demo/src/lib/knowledge-base';

export default defineConfig(({ mode }) => { ... });

// GOOD - only imported in dev mode, production build never touches the SDK
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss()];
  if (mode === 'development') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    plugins.push(devPlugin(Anthropic));
  }
  return { plugins };
});
```

**Search:** `Grep` for `import.*anthropic\|import.*openai` in `vite.config.ts` and `next.config.ts`. Any match is a flag unless inside a `mode === 'development'` block.

### 5. Vercel env var config (Reminder)

After code checks pass, remind the user:

> Verify in **Vercel Dashboard > Project Settings > Environment Variables** that all required keys are set for the correct environments (Production, Preview, Development). Keys set only for "Preview" won't be available in production deployments.

List the env vars found in `process.env.*` references across `api/` files so the user can cross-check.

## Output Format

After scanning, output a table:

| Check | Status | File:Line | Details |
|-------|--------|-----------|---------|
| Implicit SDK constructor | PASS/FAIL | path:line | ... |
| In-handler instantiation | PASS/FAIL | path:line | ... |
| Missing env var guard | PASS/FAIL | path:line | ... |
| Build config pollution | PASS/FAIL | path:line | ... |
| Vercel env vars | REMINDER | - | List of required keys |

For any FAIL, provide the exact fix (code snippet with before/after).
