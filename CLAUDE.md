# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Banking chatbot admin suite — a React SPA for managing AI chatbot intents, agents, and observability. Built for OCBC's retirement planning chatbot. Currently uses mock/simulated data (no real backend API).

## Commands

- `npm install` — install dependencies
- `npm run dev` — start Vite dev server on port 3000
- `npm run build` — production build to `dist/`
- `npm run lint` — type-check via `tsc --noEmit` (no ESLint configured)
- `python serve.py` — serve production build with SPA fallback routing

## Architecture

Single-page React app with tab-based navigation. No router library — `App.tsx` manages active tab state and renders the corresponding component.

**Tabs/Views** (defined as `Tab` type in `App.tsx`):
- `IntentDiscovery` — diff-based intent sync workflow with LLM suggestions
- `ExecutiveDashboard` — observability charts using Recharts
- `ChatbotPreview` — simulated chatbot with keyword-matched responses (no real AI calls)
- `ActiveIntents` — CRUD management for live intent database
- `ActiveAgents` — CRUD management for AI agent configurations

**Key patterns:**
- Each component is self-contained with its own mock data (no shared state/store)
- `cn()` utility (clsx + tailwind-merge) is redefined in every component file — not extracted to a shared util
- Animations use `motion/react` (Framer Motion v12+) with `AnimatePresence`
- Tailwind CSS v4 via `@tailwindcss/vite` plugin (no tailwind.config — uses CSS-first config in `index.css`)
- OCBC brand color: `#E3000F` used throughout as inline Tailwind values
- Icons from `lucide-react`

## Environment

- `GEMINI_API_KEY` — set in `.env.local` (loaded by Vite via `loadEnv`, exposed as `process.env.GEMINI_API_KEY`)
- Path alias: `@` maps to project root (both in `tsconfig.json` paths and Vite resolve)
