-- ============================================================
-- add_lesson_planning.sql
-- Adds the #1 missing curriculum feature: scheduling / lesson plans.
-- Today scheduling is only a `task_progress.is_scheduled_this_week` boolean and
-- `child_topics.target_completion_date`, so the weekly-planner cron and any
-- adaptive planner have nowhere to persist a real schedule.
--
--   lesson_plans       — a named plan for a child (e.g. a week)
--   scheduled_sessions — individual dated items (a task/topic on a date)
--
-- RLS is scoped by child ownership (matches the children/task_progress model),
-- family-aware so co-parents in the same workspace are covered.
-- Idempotent; safe to re-run. Apply in the Supabase SQL editor.
-- ============================================================
begin;

-- ── lesson_plans ────────────────────────────────────────────────────────────
create table if not exists public.lesson_plans (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references public.children(id) on delete cascade,
  title           text not null,
  week_start_date date,
  status          text not null default 'active' check (status in ('active', 'archived')),
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists lesson_plans_child_id_idx on public.lesson_plans (child_id);

-- ── scheduled_sessions ──────────────────────────────────────────────────────
create table if not exists public.scheduled_sessions (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid references public.lesson_plans(id) on delete cascade,
  child_id         uuid not null references public.children(id) on delete cascade,
  task_id          uuid references public.tasks(id)  on delete set null,
  topic_id         uuid references public.topics(id) on delete set null,
  scheduled_date   date not null,
  start_time       time,
  duration_minutes integer,
  status           text not null default 'planned'
                     check (status in ('planned', 'in_progress', 'completed', 'skipped')),
  notes            text,
  completed_at     timestamptz,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists scheduled_sessions_child_date_idx
  on public.scheduled_sessions (child_id, scheduled_date);
create index if not exists scheduled_sessions_plan_id_idx
  on public.scheduled_sessions (plan_id);

-- ── updated_at triggers (reuse the existing set_updated_at fn) ───────────────
drop trigger if exists set_lesson_plans_updated_at on public.lesson_plans;
create trigger set_lesson_plans_updated_at
  before update on public.lesson_plans
  for each row execute function public.set_updated_at();

drop trigger if exists set_scheduled_sessions_updated_at on public.scheduled_sessions;
create trigger set_scheduled_sessions_updated_at
  before update on public.scheduled_sessions
  for each row execute function public.set_updated_at();

-- ── RLS: scope by child ownership (owner OR same family) ────────────────────
alter table public.lesson_plans       enable row level security;
alter table public.scheduled_sessions enable row level security;

drop policy if exists "Manage lesson plans for own children" on public.lesson_plans;
create policy "Manage lesson plans for own children" on public.lesson_plans
  for all to public
  using (child_id in (
    select c.id from public.children c
    where c.user_id = (select auth.uid()) or c.family_id = (select user_family_id())))
  with check (child_id in (
    select c.id from public.children c
    where c.user_id = (select auth.uid()) or c.family_id = (select user_family_id())));

drop policy if exists "Manage scheduled sessions for own children" on public.scheduled_sessions;
create policy "Manage scheduled sessions for own children" on public.scheduled_sessions
  for all to public
  using (child_id in (
    select c.id from public.children c
    where c.user_id = (select auth.uid()) or c.family_id = (select user_family_id())))
  with check (child_id in (
    select c.id from public.children c
    where c.user_id = (select auth.uid()) or c.family_id = (select user_family_id())));

commit;
