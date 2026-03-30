---
name: vercel-env-guard
description: Use before deploying to Vercel or when creating/modifying files in api/ directory. Reviews serverless functions for cold-start failures — streaming format, error logging, env vars, and build config.
---

# Vercel Cold-Start Guard

Scan serverless functions and build configs for patterns that cause cold-start failures on Vercel. Run this before any Vercel deployment.

## Lesson Learned

Checks 1–5 below were the original skill. They caught real issues but **did not fix the actual cold-start bug**. The root cause was Check 6 (SSE streaming via legacy `res.write()` silently fails on Vercel Fluid compute cold starts). Checks 7–8 were also missing — silent error swallowing made the bug invisible in logs.

**Always run Checks 6–8 first — they catch the class of bug that is hardest to diagnose.**

## Checklist

Use Grep and Read to check every item below. Report findings with file paths and line numbers.

### 6. SSE streaming format (Critical — root cause of cold-start bug)

**Flag:** Any `api/**/*.ts` file that uses `res.write()` for SSE streaming instead of Edge Runtime + Web Streams API.

Legacy Node.js serverless format (`res.setHeader()` + `res.write()`) silently fails on Vercel Fluid compute cold starts — the function returns 200 but the stream never reaches the client.

```typescript
// BAD - legacy format, breaks on cold start with Fluid compute
export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.write(`data: ${JSON.stringify({ type: 'delta', text: '...' })}\n\n`);
  res.end();
}

// GOOD - Edge Runtime + Web Streams (matches working chatbot_demo pattern)
export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: '...' })}\n\n`));
      controller.close();
    },
  });
  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

**Search:** `Grep` for `res\.write\(` in `api/` files. Any match in an SSE-streaming context is a flag. Also check for `export const config.*runtime.*edge` — streaming functions MUST have this.

### 7. Silent error swallowing (Critical)

**Flag:** Any `catch` block in `api/**/*.ts` that does NOT have `console.error`.

Without server-side logging, errors are invisible in Vercel logs. This was why the cold-start bug showed 200 status with no error messages.

```typescript
// BAD - error silently swallowed, nothing in Vercel logs
catch (err: any) {
  res.write(`data: ${JSON.stringify({ type: 'error', text: 'Something went wrong' })}\n\n`);
}

// GOOD - error logged server-side AND sent to client
catch (err: any) {
  console.error('[rag] error:', err?.message ?? err);
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', text: 'Something went wrong' })}\n\n`));
}
```

**Search:** `Grep` for `catch` in `api/` files, then verify each catch block contains `console.error`.

### 8. Dated model identifiers (Medium)

**Flag:** Model IDs with date suffixes (e.g., `claude-haiku-4-5-20251001`) instead of aliases (`claude-haiku-4-5`).

Dated snapshots can be deprecated. Use the alias to always get the latest version.

**Search:** `Grep` for model strings with date patterns like `\d{8}` in `api/` files.

---

### 1. Implicit SDK constructor (High)

**Flag:** Any AI SDK constructor without an explicit API key in `api/**/*.ts` files.

```typescript
// BAD
const client = new Anthropic();

// GOOD
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

**Search:** `Grep` for `new Anthropic()` and `new OpenAI()` (empty parens or no `apiKey`) in `api/` directory.

### 2. In-handler client instantiation (Medium)

**Flag:** SDK clients created inside `handler()` / `POST()` / `GET()` functions instead of at module level.

```typescript
// BAD - recreated on every request
export default async function handler(request: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// GOOD - created once at module load, reused across warm invocations
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export default async function handler(request: Request) { ... }
```

**Search:** `Grep` for `new Anthropic\|new OpenAI` inside function bodies in `api/` files.

### 3. Missing env var guard (High)

**Flag:** Handlers that use `process.env.*_KEY` without returning a clear error if missing.

```typescript
// GOOD
if (!process.env.ANTHROPIC_API_KEY) {
  return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }), { status: 500 });
}
```

**Search:** For each `api/*.ts` file, verify there is a guard checking the required env var before any API call.

### 4. Build config SDK pollution (High)

**Flag:** `vite.config.ts` or `next.config.ts` with unconditional top-level imports of AI SDK packages.

```typescript
// BAD - imported during production build
import Anthropic from '@anthropic-ai/sdk';

// GOOD - only imported in dev mode
if (mode === 'development') {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
}
```

**Search:** `Grep` for `import.*anthropic\|import.*openai` in `vite.config.ts` and `next.config.ts`. Any match is a flag unless inside a dev-mode guard.

### 5. Vercel env var config (Reminder)

After code checks pass, remind the user:

> Verify in **Vercel Dashboard > Project Settings > Environment Variables** that all required keys are set for the correct environments (Production, Preview, Development). Keys set only for "Preview" won't be available in production deployments.

List the env vars found in `process.env.*` references across `api/` files so the user can cross-check.

## Output Format

After scanning, output a table:

| Check | Status | File:Line | Details |
|-------|--------|-----------|---------|
| SSE streaming format | PASS/FAIL | path:line | ... |
| Silent error swallowing | PASS/FAIL | path:line | ... |
| Dated model identifiers | PASS/FAIL | path:line | ... |
| Implicit SDK constructor | PASS/FAIL | path:line | ... |
| In-handler instantiation | PASS/FAIL | path:line | ... |
| Missing env var guard | PASS/FAIL | path:line | ... |
| Build config pollution | PASS/FAIL | path:line | ... |
| Vercel env vars | REMINDER | - | List of required keys |

For any FAIL, provide the exact fix (code snippet with before/after).
