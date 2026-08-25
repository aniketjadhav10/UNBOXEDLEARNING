-- ============================================================
-- add_assessments.sql
-- Curriculum feature #2: capturing child work and grading it.
-- Today `tasks.is_assessment` / `assessment_criteria` exist but there is nowhere
-- to record what a child submitted or how it was scored, so the auto-assessment
-- loop (submit -> grade -> advance learning_stage) can't be built.
--
--   submissions        — a child's submitted work for a task (text and/or file)
--   assessment_results — the evaluation of a submission (AI or parent)
--
-- Built to the same standard as add_lesson_planning.sql: family-aware RLS using
-- (select auth.uid()), covering indexes on every FK, updated_at triggers.
-- Idempotent; safe to re-run. Apply in the Supabase SQL editor.
-- ============================================================
begin;

-- ── submissions ─────────────────────────────────────────────────────────────
create table if not exists public.submissions (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references public.children(id) on delete cascade,
  task_id        uuid not null references public.tasks(id) on delete cascade,
  session_id     uuid references public.scheduled_sessions(id) on delete set null,
  content        text,                                    -- typed answer
  attachment_url text,                                    -- Supabase Storage path (photo/file)
  status         text not null default 'submitted'
                   check (status in ('submitted', 'grading', 'graded', 'returned')),
  submitted_by   uuid references public.profiles(id) on delete set null,
  submitted_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists submissions_child_id_idx  on public.submissions (child_id);
create index if not exists submissions_task_id_idx    on public.submissions (task_id);
create index if not exists submissions_session_id_idx on public.submissions (session_id);

-- ── assessment_results ──────────────────────────────────────────────────────
create table if not exists public.assessment_results (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  score         double precision,
  max_score     double precision not null default 100,
  passed        boolean,
  feedback      text,
  rubric        jsonb not null default '[]'::jsonb,       -- per-criterion breakdown
  graded_by     text not null default 'parent' check (graded_by in ('ai', 'parent')),
  grader_id     uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists assessment_results_submission_id_idx on public.assessment_results (submission_id);
create index if not exists assessment_results_grader_id_idx     on public.assessment_results (grader_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
drop trigger if exists set_submissions_updated_at on public.submissions;
create trigger set_submissions_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

drop trigger if exists set_assessment_results_updated_at on public.assessment_results;
create trigger set_assessment_results_updated_at
  before update on public.assessment_results
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.submissions        enable row level security;
alter table public.assessment_results enable row level security;

-- submissions: scoped by child ownership (owner OR same family)
drop policy if exists "Manage submissions for own children" on public.submissions;
create policy "Manage submissions for own children" on public.submissions
  for all to public
  using (child_id in (
    select c.id from public.children c
    where c.user_id = (select auth.uid()) or c.family_id = (select user_family_id())))
  with check (child_id in (
    select c.id from public.children c
    where c.user_id = (select auth.uid()) or c.family_id = (select user_family_id())));

-- assessment_results: scoped through the parent submission's child
drop policy if exists "Manage assessment results for own children" on public.assessment_results;
create policy "Manage assessment results for own children" on public.assessment_results
  for all to public
  using (submission_id in (
    select s.id from public.submissions s
    join public.children c on c.id = s.child_id
    where c.user_id = (select auth.uid()) or c.family_id = (select user_family_id())))
  with check (submission_id in (
    select s.id from public.submissions s
    join public.children c on c.id = s.child_id
    where c.user_id = (select auth.uid()) or c.family_id = (select user_family_id())));

commit;
