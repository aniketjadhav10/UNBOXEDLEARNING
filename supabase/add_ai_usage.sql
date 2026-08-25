-- SQL Migration: ai_usage — per-request AI cost/rate tracking
-- ---------------------------------------------------------------------------
-- Backs the AI gateway (server/ai/gateway.ts): every Gemini call records a row
-- here, and the rate limiter counts recent rows per user. RLS scopes every row
-- to its owner, so the gateway uses the acting user's client (no service role).
-- Apply in the Supabase SQL editor.

create table if not exists ai_usage (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  operation        text not null,               -- e.g. 'chat', 'generate_syllabus'
  model            text,
  prompt_tokens    integer,
  candidate_tokens integer,
  total_tokens     integer,
  latency_ms       integer,
  status           text not null default 'success',  -- 'success' | 'error'
  error            text,
  created_at       timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx
  on ai_usage (user_id, created_at desc);

alter table ai_usage enable row level security;

drop policy if exists "Users read own ai usage" on ai_usage;
create policy "Users read own ai usage"
  on ai_usage for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own ai usage" on ai_usage;
create policy "Users insert own ai usage"
  on ai_usage for insert
  with check (auth.uid() = user_id);
