# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**decision.log** is a Next.js app that mines GitHub repository history to automatically extract and store Architecture Decision Records (ADRs). It uses LLMs (Claude as primary, GPT-4o as fallback) to identify and structure architectural decisions from pull requests and commits.

## Commands

```bash
# Development
npm run dev               # Start dev server
npm run build             # Production build
npm run lint              # ESLint

# Testing
npm run test              # All Vitest tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run test:e2e          # Playwright E2E
npm run test:e2e:ui       # E2E with Playwright UI
npm run test:all          # All suites sequentially

# Database
npx prisma migrate dev    # Apply migrations
npx prisma studio         # DB GUI
npx prisma generate       # Regenerate Prisma client after schema changes
node prisma/seed.js       # Seed demo data

# Setup
node scripts/generate-keys.js  # Generate JWT_SECRET and ENCRYPTION_SECRET
```

## Environment Variables

```bash
JWT_SECRET=                        # 32-byte hex
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback
DATABASE_URL=postgresql://user:password@host:5432/decisionlog
ENCRYPTION_SECRET=                 # 32-byte hex (AES-256-GCM for GitHub tokens)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=                    # Optional fallback
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=false
LOG_LEVEL=debug
```

Use `docker-compose.yml` for a local PostgreSQL instance.

## Architecture

### Route Groups

- `app/(public)/` — Unauthenticated landing page and login
- `app/(setup)/setup/` — Onboarding wizard for first-time repo setup
- `app/(app)/` — All authenticated views (decisions, candidates, timeline, exports, settings)
- `app/api/` — REST API handlers

### Core Data Flow: Sync → Sieve → Extract

1. **Sync** (`lib/sync/orchestrator.ts`): Fetches PRs/commits from GitHub via `lib/sync/fetch.ts`, stores them as `Artifact` records. Pagination state is tracked in `lib/sync/cursor.ts`.
2. **Sieve** (`lib/sieve/scorer.ts`): Scores each artifact (0–1) to identify likely architectural decisions. Artifacts above threshold become `Candidate` records.
3. **Extract** (`lib/extract/client.ts`): On user approval, sends the candidate diff + metadata to Claude/GPT-4 using the prompt schema in `lib/extract/schema.ts`. The response is validated with Zod and saved as a `Decision`.
4. **Governor** (`lib/extract/governor.ts`): Enforces a hard limit of 20 LLM extractions per repo per day.

### Auth

- GitHub OAuth → JWT in HTTP-only cookie
- `lib/auth/requireAuth.ts` — JWT middleware for all protected API routes
- `lib/auth/requireRepoAccess.ts` — Ensures users can only access their own repos
- GitHub PATs are encrypted at rest using AES-256-GCM (`lib/crypto.ts`)
- Demo mode (`lib/demoMode.ts`) allows unauthenticated read-only access

### Database Schema (Prisma)

Seven models with the following relationships:
`User` → `Repo` → `Artifact` → `Candidate` → `Decision`
`Repo` also has `SyncOperation` (audit log) and `ExtractionCost` (LLM cost tracking).

Schema is in `prisma/schema.prisma`. Run `npx prisma generate` after any schema change.

### API Error Format

All API errors return:
```json
{ "code": "UNAUTHORIZED|NOT_FOUND|RATE_LIMIT|DATABASE_ERROR", "message": "...", "details": "..." }
```

Error classes are defined in `lib/errors.ts`.

### Key Libraries

| Purpose | Library |
|---|---|
| ORM | Prisma 7 |
| JWT | José 6 |
| Validation | Zod 4 |
| LLM | Anthropic SDK, OpenAI SDK |
| UI | Tailwind CSS 4, Lucide React |
| Unit/Integration tests | Vitest 2 + happy-dom + MSW |
| E2E tests | Playwright 1.49 |

### Path Alias

`@/*` maps to the project root. Use this for all imports (e.g., `import { db } from '@/lib/db'`).

### next.config.ts

Contains a 301 redirect from `/app/*` → `/*` for legacy route migration. Do not remove.

## Testing Notes

- Unit tests live in `tests/unit/`, integration in `tests/integration/`, E2E in `tests/e2e/`
- Shared fixtures and factories are in `tests/fixtures/`
- Global test setup is in `tests/setup.ts`
- Coverage targets: 80% lines/functions/statements, 75% branches
- E2E tests target `http://localhost:3000` (override with `BASE_URL` env var)
