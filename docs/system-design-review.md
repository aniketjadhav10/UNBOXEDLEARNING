# System Design Review — UnBoxed Learning

> Architecture analysis + modernization plan, framed against current Next.js 15 /
> Supabase / AI best practices. Based on the codebase and the live database.

---

## Current architecture

```
                        ┌─────────────────────────────────────────┐
  Browser (client)      │  Next.js 15 App Router (Vercel)          │
  ─────────────────     │                                          │
  29 pages: ALL 'use    │  middleware.ts  ← single auth gate       │
  client' SPA shells    │   (cookie session, role/route lists)     │
   • Zustand stores     │                                          │
   • DataContext  ──────┼─► app/api/**/route.ts (Node runtime)     │
     (global fetch of   │     • AI routes  → AI gateway → Gemini    │
      ALL app data)     │     • cron (Bearer CRON_SECRET)          │
   • IndexedDB cache    │     • MCP server /api/mcp                 │
   • recharts/framer    │     • tasks/family/sync                  │
                        └───────────────┬─────────────────────────┘
                                        │  (2 auth models: cookies + Bearer)
                        ┌───────────────▼─────────────────────────┐
                        │  Supabase: Postgres + RLS + RPCs +       │
                        │  pgvector · Auth · (Storage unused)      │
                        └──────────────────────────────────────────┘

  AI subsystem: shared tool registry → { Gemini function-calling (chat), MCP server }
                multi-agent generation (Director/SME) · embeddings dedup
                · gateway (rate-limit/retry/usage logging)
```

## What's genuinely strong
- **Centralized auth/authz** in `middleware.ts` — one source of truth, backed by **hardened RLS**.
- **Sophisticated, modern AI layer** — a shared tool registry feeding *both* the chat agent and an
  MCP server, an AI gateway (rate-limit + retry + cost logging), multi-agent generation, and
  embedding-based de-dup. Ahead of most apps.
- **Clean server/client boundary** in code organization (`server/` server-only, `lib/` helpers).
- **RLS-first data model** with RPCs for transactional logic.

## Structural weaknesses (the real design debt)

| Area | Issue | Consequence |
|---|---|---|
| Rendering | **29/29 pages are `'use client'`** + a global `DataContext` that eager-fetches *all* app data | No SSR; JS-heavy; waterfall fetch; poor first paint. App Router migration is cosmetic — still an SPA. |
| Auth transport | **Two models** (cookie via middleware, Bearer via API) + two Supabase client modules | Fragile, undocumented, easy to misuse. |
| Data access | Client queries Supabase directly everywhere; no server data layer; `as any` casts throughout | UI coupled to DB shape; no type safety; N+1 patterns. |
| Offline/sync | IndexedDB cache exists but `sync/push` is a **no-op stub** | Incoherent offline story; silent data-loss risk. |
| State | Zustand + several Contexts + global DataContext overlap | Duplicated concerns, re-render cost (worst of it memoized). |
| Quality gates | No CI; ESLint out of build; thin tests | Regressions slip in (TS gate re-enabled). |
| Observability | pino logs only; no error tracking, no `ai_usage` dashboard | Blind in production. |
| Secrets | Leaked keys still in git history | Unrotated credential exposure. |

## Improvement plan — aligned to the latest platform capabilities

### 1. Modernize rendering (biggest leverage)
- **Adopt Server Components + Server Actions** (Next 15). Move read-heavy pages (reports, library,
  subjects, lesson) to **RSC fetching server-side**; replace hand-rolled API-route + Bearer
  mutations with **Server Actions**. Kills the dual-auth problem *and* the client-fetch waterfall
  at once.
- **Streaming + Suspense** boundaries instead of client spinners.
- Keep a thin client layer only for genuinely interactive widgets.

### 2. Introduce a typed server data layer (DAL)
- A `data/` module of cached server functions using React `cache()` + Next `revalidateTag()` —
  replaces the global `DataContext` eager fetch with per-route, cache-tagged reads.
- **Generate Supabase TypeScript types** (the Supabase MCP exposes `generate_typescript_types`) —
  a one-command win that eliminates the `as any` debt. Highest-ROI "latest update".

### 3. Unify auth
- Standardize on **cookie-based `@supabase/ssr`** across pages *and* route handlers; delete the
  Bearer client module. One mental model.

### 4. Validation & AI robustness
- **zod** at every route / Server-Action boundary.
- **Gemini `responseSchema`** for structured generation → delete the brittle `extractJson` repair.

### 5. Observability & CI/CD
- **Sentry** (or similar) for error tracking; a small **`ai_usage` dashboard** (table already logs
  tokens/cost).
- **GitHub Actions**: typecheck → lint → test → build on PRs; Vercel preview deploys — makes the
  re-enabled TS gate stick.

### 6. Realtime & offline — pick a lane
- Add **Supabase Realtime** for live progress (great for multi-parent families).
- For offline: commit to a real sync engine (**ElectricSQL / PowerSync**, or Realtime + a proper
  queue) **or remove** the half-built IndexedDB / `sync-push`. Currently the worst of both.

### 7. Finish the migration
- Retire the legacy `src/views` SPA screens as pages move to RSC; drop the unused `openai`
  dependency; reconcile remaining schema drift (baseline dump).

## Quick wins to start with
1. **`generate_typescript_types`** (one MCP command) → replace `as any` — instant type safety.
2. **CI pipeline** (typecheck/lint/test/build) — locks in quality.
3. **Convert one heavy page to a Server Component** (e.g. `/reports`) as the RSC pilot.
4. **Rotate the leaked secrets** — the one urgent security item.

---

**Through-line:** the AI subsystem is modern and ahead of the curve, but the web/data layer is a
2022-era client-side SPA wearing an App Router shell. Closing that gap — RSC + Server Actions + a
typed server data layer — is the single biggest modernization, and it simultaneously fixes the
dual-auth fragility and the client-fetch performance problems.
