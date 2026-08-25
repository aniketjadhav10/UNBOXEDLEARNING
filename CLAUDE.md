# CLAUDE.md

Guidance for Claude Code when working in this repository. Keep changes consistent with the conventions below.

## Project

**UnBoxed Learning** (package name `homeschool-management-app`) — a homeschool/curriculum management app. Parents (admins) build multi-child curricula (child → subject → topic → task), track per-child learning progress, generate content with AI, and receive scheduled email reports. Students get a read-only learning view.

> The root `README.md` is **stale** — it describes the old Vite/React SPA. The app has been migrated to **Next.js App Router**. Trust this file and the code, not the README.

## Stack

- **Next.js 15** (App Router, `--turbopack` dev) · **React 18** · **TypeScript** (strict)
- **Supabase** — Postgres, Auth, RLS, RPCs, `pgvector` embeddings (`@supabase/ssr`, `@supabase/supabase-js`)
- **AI** — Google **Gemini** via `@google/genai` (server-only). `openai` dep is legacy; prefer Gemini.
- **Zustand** (client state) · **Tailwind CSS** + `@tailwindcss/typography` · **framer-motion** · **lucide-react** · **recharts**
- **IndexedDB** via `idb` (offline cache + sync queue) · **nodemailer** (emails) · **pino** (logging)
- **Vitest** + Testing Library (jsdom) · Deploys to **Vercel** (cron + serverless)

## Architecture & Directory Layout

Path alias: **`@/*` → repo root** (e.g. `@/server/logger`, `@/lib/supabase/server`).

- **`app/`** — Next.js App Router.
  - `app/(auth)/`, `app/(dashboard)/`, `app/onboarding/` — route groups (pages, Server Components by default).
  - `app/api/**/route.ts` — Route Handlers (AI, cron, family, sync, tasks).
- **`server/`** — **server-only** business logic: `ai/` (agents, prompts, Gemini client, `aiDb.ts`) and `logger.ts`. Never import into Client Components. (Cron/sync/family/tasks logic lives inline in the corresponding `app/api/**/route.ts` handlers.)
- **`lib/`** — Next.js helpers: `supabase/{client,server}.ts`, `api-utils/{http,supabase}.ts`.
- **`src/`** — UI + legacy SPA code mid-migration: `components/`, `views/` (legacy admin/onboarding views), `store/` (Zustand), `services/`, `offline/`, `hooks/`, `types/`, `lib/email-templates/`.
- **`supabase/`** — `schema.sql` plus incremental `*.sql` migrations/RPCs (apply in Supabase SQL editor).
- **`middleware.ts`** — the single source of truth for auth/route protection (see below).
- `automation/`, `dist/`, `output/`, `.next/`, `*.log`, `test-*.ts/js` — scratch/build/legacy; do not treat as source.

When adding a feature, put UI in `src/components`, server logic in `server/`, expose it through an `app/api/**/route.ts`, and gate access in `middleware.ts`.

## Commands

```bash
npm run dev        # Next dev server (turbopack)
npm run build      # production build
npm start          # run production build
npm run lint       # next lint (ESLint flat config)
npm run typecheck  # tsc --noEmit
npm test           # vitest run (CI mode)
npm run test:watch # vitest watch
```

Before finishing a change, run `npm run typecheck` and `npm run lint`; run `npm test` when touching tested modules. Node **>= 20**.

## Coding Standards

- **TypeScript strict** — no implicit `any`. The existing AI/Supabase code casts Supabase join rows with `as any`; keep such casts narrow and localized, don't spread them.
- **Server vs client** — Components are Server Components by default; add `'use client'` only when you need hooks/state/browser APIs. Keep secrets and `server/` imports out of client bundles.
- **Route Handlers** — use helpers in `lib/api-utils/http.ts` (`sendError`, `readString`, `methodNotAllowed`). Wrap handlers in `try/catch` and return `NextResponse.json`. Validate inputs; return `400` on bad input, `401` on auth failure.
- **Logging** — use `import { logger } from '@/server/logger'` (pino) in server code, not `console.*`. In dev it also writes `app-local.log`.
- **State** — Zustand stores live in `src/store` (`useAdminStore`, `useSettingsStore`, `useToastStore`); one store per concern, actions colocated with state.
- **Imports** — use the `@/` alias, not deep relative paths. ESM only (`"type": "module"`).
- Match surrounding file style (these files use a banner comment header on route/lib modules).

## Database Rules (Supabase)

- **RLS is mandatory.** Every user-facing table is row-level-secured and scoped by family/user ownership. Any new table must ship with matching RLS policies in a `supabase/*.sql` file.
- **Two server clients** (`lib/supabase/server.ts`):
  - `createServerSupabase()` — uses the **anon key** + user cookies; **RLS-enforced**. Use for all normal request handling so the acting user's permissions apply.
  - `createServerSupabaseAdmin()` — uses the **service-role key**; **bypasses RLS**. Use only for trusted server tasks (e.g. cron, invitations). Never expose to the client and never use to serve unauthenticated user input.
- Data model hierarchy: `profiles` → `children` → `subjects` → `topics` → `tasks`, with per-child `task_progress`. `learning_stage` is a Postgres enum (`Not_Started`, `Introduced`, `Practicing`, `Comfortable`, `Confident`, `Needs_Practice`) — use these exact values.
- Business logic that spans rows lives in **RPCs** (`supabase.rpc(...)`, e.g. `match_tasks`, `match_user_memories`, family/task RPCs). Prefer adding an RPC over multi-round-trip client logic for transactional work.
- Schema changes are **additive migration files** in `supabase/` (never edit past migrations); use `create ... if not exists` / guarded `alter`.
- Embeddings: Gemini, `EMBEDDING_DIMENSIONS = 768`, cosine similarity thresholds in `server/ai/aiClient.ts`.

## Security Rules

- **Auth & authorization are centralized in `middleware.ts`.** It refreshes the Supabase session and enforces: unauthenticated → `/login`; unapproved → `/pending-approval`; approved-but-not-onboarded → `/onboarding`; admin-only vs student-only route lists; super-admin routes. Update the path lists there when adding gated routes — do not scatter ad-hoc auth checks.
- Every API route must independently verify the user (`supabase.auth.getUser()`) — never trust the client for identity or role.
- **Cron routes** (`app/api/cron/*`) are public to the middleware and secured by an `Authorization: Bearer ${CRON_SECRET}` header check inside the handler. Preserve that guard.
- **Secrets are server-only.** Only `NEXT_PUBLIC_*` vars reach the browser. `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `SMTP_*` must never be imported into client code or `NEXT_PUBLIC_`-prefixed.
- Never log secrets, tokens, or full request bodies.
- ⚠️ **`.env.example`, `.env`, and `.env.local` currently contain real-looking credentials** (Supabase keys, SMTP app password, `CRON_SECRET`, Gemini key). `.env*` is gitignored, but `.env.example` should hold **placeholders only** — treat the committed secrets as compromised and rotate them; do not add real secrets to any tracked file.

## Testing

- **Vitest** with Testing Library + jsdom. Test files: `*.test.ts` / `*.test.tsx` next to source (e.g. `src/services/*.test.ts`, `src/utils/*.test.ts`).
- Run `npm test` (CI) or `npm run test:watch`. Add/extend tests when changing `src/services`, `src/utils`, or other covered logic.
- Prefer unit tests for pure logic (date/string/retry utils, services) and component tests via Testing Library. Mock Supabase/Gemini network calls — do not hit live services in tests.

## UI Conventions

- **Tailwind** utility classes; theme tokens/colors in `tailwind.config.ts`. Brand green `#3f6b57` is the default subject color.
- Icons from **lucide-react**; charts from **recharts** (`src/components/analytics/*`); animations/page transitions via **framer-motion** (`src/components/motion/*`). Route progress bar via `nextjs-toploader`.
- Reusable primitives in `src/components` (`Modal/`, `Form/`, `Card/`, `ui/`); feature components grouped by domain (`tasks/`, `curriculum/`, `chat/`, `analytics/`). Reuse these before adding new ones.
- Markdown (AI chat, content) rendered with `react-markdown` + `remark-gfm` + typography plugin.
- Wrap risky trees in `src/components/ErrorBoundary.tsx`. Keep client interactivity minimal; keep data-fetching in Server Components / route handlers where possible.

## Git Workflow

- Branches: **`main`** (production/PR target) and **`develop`** (active work — the current default branch). Feature work branches off `develop`.
- Commit in small, meaningful units with imperative messages describing the change (`chore:`/`feat:`-style prefixes appear in history but aren't strictly enforced). Avoid bare `"update"` messages.
- Do **not** commit `.env*`, build output (`.next/`, `dist/`), or `*.log` files (already gitignored).
- Commit/push only when the user asks. If asked to commit while on `main`, branch first.
