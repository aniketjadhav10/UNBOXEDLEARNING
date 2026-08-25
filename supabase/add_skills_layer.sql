-- ============================================================
-- add_skills_layer.sql
-- Roadmap architecture M1 — the first-class "skill" layer that turns the flat
-- syllabus (subjects → topics → tasks) into a dependency-graph skill tree.
--
--   skills               — a learnable skill under a topic (level, age range,
--                          mastery criteria) — the roadmap's unit of progress
--   learning_objectives  — the concrete "what 'learned' means" for a skill
--   skill_prerequisites  — the dependency graph (DAG, cycle-guarded)
--   skill_progress       — per-child mastery of a skill (roadmap source of truth)
--   tasks.skill_id       — re-parents existing tasks under a skill (nullable;
--                          tasks keep working via topic_id — additive only)
--
-- Content tables (skills/objectives/prerequisites) use the library RLS model
-- (created_by owner OR is_global), matching subjects/topics/tasks in
-- optimize_rls_initplan.sql. skill_progress mirrors task_progress (per child by
-- children.user_id). All RLS uses (select auth.uid()); every FK is indexed;
-- updated_at is maintained by the shared set_updated_at() trigger.
-- Idempotent; safe to re-run. Apply in the Supabase SQL editor, then run
-- backfill_skills_from_topics.sql.
-- ============================================================
begin;

-- ── skills ──────────────────────────────────────────────────────────────────
create table if not exists public.skills (
  id                  uuid primary key default gen_random_uuid(),
  topic_id            uuid not null references public.topics(id)   on delete cascade,
  subject_id          uuid not null references public.subjects(id) on delete cascade,
  development_domain  text not null default 'academic',
  name                text not null,
  description         text,
  level               smallint not null default 1 check (level between 1 and 5),
  difficulty          text,
  age_min             smallint,
  age_max             smallint,
  sequence            integer not null default 0,
  mastery_criteria    text,
  embedding           vector(768),                 -- semantic de-dup (match_skills lands in M3)
  is_global           boolean not null default false,
  created_by          uuid references public.profiles(id) on delete set null,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists skills_topic_id_idx   on public.skills (topic_id);
create index if not exists skills_subject_id_idx  on public.skills (subject_id);
create index if not exists skills_created_by_idx  on public.skills (created_by);

-- ── learning_objectives ─────────────────────────────────────────────────────
create table if not exists public.learning_objectives (
  id           uuid primary key default gen_random_uuid(),
  skill_id     uuid not null references public.skills(id) on delete cascade,
  description  text not null,
  order_index  integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists learning_objectives_skill_id_idx on public.learning_objectives (skill_id);

-- ── skill_prerequisites (dependency graph — DAG) ─────────────────────────────
-- Edge semantics: skill_id "requires" prerequisite_skill_id.
create table if not exists public.skill_prerequisites (
  skill_id               uuid not null references public.skills(id) on delete cascade,
  prerequisite_skill_id  uuid not null references public.skills(id) on delete cascade,
  created_at             timestamptz not null default now(),
  primary key (skill_id, prerequisite_skill_id),
  check (skill_id <> prerequisite_skill_id)
);

-- reverse-lookup index ("what does mastering this skill unlock?")
create index if not exists skill_prerequisites_prereq_idx on public.skill_prerequisites (prerequisite_skill_id);

-- Cycle guard: reject any edge whose prerequisite already (transitively) requires
-- the skill — prerequisites must remain acyclic or the "next skill" engine loops.
create or replace function public.check_skill_prereq_acyclic()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.skill_id = new.prerequisite_skill_id then
    raise exception 'A skill cannot be its own prerequisite';
  end if;
  if exists (
    with recursive chain(id) as (
      select new.prerequisite_skill_id
      union
      select sp.prerequisite_skill_id
      from public.skill_prerequisites sp
      join chain on sp.skill_id = chain.id
    )
    select 1 from chain where id = new.skill_id
  ) then
    raise exception 'Adding this prerequisite would create a cycle in the skill graph';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_skill_prereq_acyclic on public.skill_prerequisites;
create trigger trg_skill_prereq_acyclic
  before insert or update on public.skill_prerequisites
  for each row execute function public.check_skill_prereq_acyclic();

-- ── skill_progress (per-child mastery — roadmap source of truth) ─────────────
create table if not exists public.skill_progress (
  id                    uuid primary key default gen_random_uuid(),
  child_id              uuid not null references public.children(id) on delete cascade,
  skill_id              uuid not null references public.skills(id)   on delete cascade,
  status                public.learning_stage not null default 'Not_Started',
  practice_count        integer not null default 0,
  success_count         integer not null default 0,
  success_rate          numeric(5,2) not null default 0,
  confidence            smallint not null default 0 check (confidence between 0 and 5),
  last_practiced_at     timestamptz,
  next_review_at        timestamptz,
  review_interval_days  integer not null default 0,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (child_id, skill_id)
);

create index if not exists skill_progress_child_id_idx      on public.skill_progress (child_id);
create index if not exists skill_progress_skill_id_idx      on public.skill_progress (skill_id);
create index if not exists skill_progress_next_review_idx   on public.skill_progress (next_review_at);

-- ── tasks.skill_id (re-parent existing tasks under a skill; additive) ────────
alter table public.tasks add column if not exists skill_id uuid references public.skills(id) on delete set null;
create index if not exists tasks_skill_id_idx on public.tasks (skill_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
drop trigger if exists set_skills_updated_at on public.skills;
create trigger set_skills_updated_at
  before update on public.skills
  for each row execute function public.set_updated_at();

drop trigger if exists set_learning_objectives_updated_at on public.learning_objectives;
create trigger set_learning_objectives_updated_at
  before update on public.learning_objectives
  for each row execute function public.set_updated_at();

drop trigger if exists set_skill_progress_updated_at on public.skill_progress;
create trigger set_skill_progress_updated_at
  before update on public.skill_progress
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.skills              enable row level security;
alter table public.learning_objectives enable row level security;
alter table public.skill_prerequisites enable row level security;
alter table public.skill_progress      enable row level security;

-- skills: accessible if their subject is accessible (owner OR global) —
-- mirrors the tasks policy in optimize_rls_initplan.sql.
drop policy if exists "Skills accessible if subject accessible" on public.skills;
create policy "Skills accessible if subject accessible" on public.skills
  for all to public
  using (subject_id in (
    select s.id from public.subjects s
    where (s.created_by = (select auth.uid())) or (s.is_global = true)))
  with check (subject_id in (
    select s.id from public.subjects s
    where (s.created_by = (select auth.uid())) or (s.is_global = true)));

-- learning_objectives: accessible if their skill's subject is accessible.
drop policy if exists "Objectives accessible if skill accessible" on public.learning_objectives;
create policy "Objectives accessible if skill accessible" on public.learning_objectives
  for all to public
  using (skill_id in (
    select sk.id from public.skills sk
    join public.subjects s on s.id = sk.subject_id
    where (s.created_by = (select auth.uid())) or (s.is_global = true)))
  with check (skill_id in (
    select sk.id from public.skills sk
    join public.subjects s on s.id = sk.subject_id
    where (s.created_by = (select auth.uid())) or (s.is_global = true)));

-- skill_prerequisites: scoped by the dependent skill's subject accessibility.
drop policy if exists "Prerequisites accessible if skill accessible" on public.skill_prerequisites;
create policy "Prerequisites accessible if skill accessible" on public.skill_prerequisites
  for all to public
  using (skill_id in (
    select sk.id from public.skills sk
    join public.subjects s on s.id = sk.subject_id
    where (s.created_by = (select auth.uid())) or (s.is_global = true)))
  with check (skill_id in (
    select sk.id from public.skills sk
    join public.subjects s on s.id = sk.subject_id
    where (s.created_by = (select auth.uid())) or (s.is_global = true)));

-- skill_progress: per-child, by owner — mirrors the task_progress policy.
drop policy if exists "Users manage skill progress for their own children" on public.skill_progress;
create policy "Users manage skill progress for their own children" on public.skill_progress
  for all to public
  using (child_id in (
    select c.id from public.children c where c.user_id = (select auth.uid())))
  with check (child_id in (
    select c.id from public.children c where c.user_id = (select auth.uid())));

commit;
