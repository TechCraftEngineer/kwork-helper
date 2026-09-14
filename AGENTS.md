<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

# Kwork Helper — AGENTS.md

## Project Overview

Kwork Helper is a Turborepo monorepo that generates persuasive, human-sounding proposals/responses for freelance task postings (specifically for the Kwork platform) using AI via an OpenAI-compatible API.

## Architecture

```
kwork-helper/
├── apps/
│   └── web/          # Next.js 16.2 App Router frontend + API
├── packages/
│   ├── ai-service/   # Core AI generation logic (OpenAI-compatible API + Vercel AI SDK)
│   ├── types/        # Shared TypeScript types
│   ├── ui/           # Shared React components
│   ├── typescript-config/
│   └── eslint-config/
```

## Key Technologies

- **Next.js 16.2** with App Router
- **Vercel AI SDK v6** (`ai` package) for `generateText` / `generateObject`
- **OpenAI-compatible API** via `@ai-sdk/openai-compatible` — base URL and models set via `OPENAI_BASE_URL` / `OPENAI_MODELS`
- **Turborepo** for monorepo orchestration
- **Bun** as package manager (`bun@1.3.11`)
- **Zod** for schema validation in structured outputs

## Environment Variables

Required in `.env.local` (root or `apps/web/`):

```
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://router.cheap/v1
OPENAI_MODELS=gpt-5.6-sol,claude-sonnet-5
```

## Commands

```bash
bun run dev          # Start all apps in dev mode
bun run build        # Build all packages
bun run lint         # Lint all packages
bun run check-types  # Type-check all packages
```

## Code Conventions

- TypeScript strict mode everywhere
- No comments unless explicitly requested
- Server Components by default, `"use client"` only where needed
- API routes in `apps/web/app/api/` using Next.js Route Handlers
- Shared types live in `packages/types/src/`
- AI generation logic lives in `packages/ai-service/src/`

## How Generation Works

1. User fills in profile (skills, experience, style) and task description
2. Frontend POSTs to `/api/generate`
3. API route calls `generateProposal()` or `generateProposalVariants()` from `@repo/ai-service`
4. `ai-service` builds a system prompt (anti-detection, natural tone) + user prompt (profile + task)
5. Vercel AI SDK sends request to OpenRouter, returns text or structured object
6. Response returned to frontend for display + copy
