-- ============================================================
-- add_roadmap_rpcs.sql
-- Roadmap architecture M2 — the "Learning GPS" engine. Two SECURITY INVOKER
-- functions (so RLS on skills / skill_progress still applies per caller):
--
--   recommend_next_skills(child, subject?, limit)
--       → skills the child hasn't mastered whose EVERY prerequisite IS mastered,
--         with a human-readable reason. Powers "What should my child learn next?"
--
--   get_skill_roadmap(child, subject)
--       → every skill in a subject, bucketed per child into
--         completed / current / next / locked, with its prerequisite ids for
--         drawing the graph. Powers the roadmap tree.
--
-- "Mastered" = skill_progress.status in ('Comfortable','Confident') — kept in
-- sync with MASTERED_STAGES in src/services/skillService.ts. Run AFTER
-- add_skills_layer.sql. Idempotent (create or replace). Apply in the SQL editor.
-- ============================================================
begin;

-- ── recommend_next_skills ────────────────────────────────────────────────────
create or replace function public.recommend_next_skills(
  p_child_id   uuid,
  p_subject_id uuid default null,
  p_limit      integer default 10
)
returns table (
  id                 uuid,
  name               text,
  description        text,
  level              smallint,
  sequence           integer,
  subject_id         uuid,
  topic_id           uuid,
  development_domain text,
  reason             text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with mastered as (
    select sp.skill_id
    from public.skill_progress sp
    where sp.child_id = p_child_id
      and sp.status in ('Comfortable', 'Confident')
  ),
  candidate as (
    select s.*
    from public.skills s
    where s.is_active = true
      and (p_subject_id is null or s.subject_id = p_subject_id)
      and s.id not in (select skill_id from mastered)
      -- every prerequisite (if any) is mastered
      and not exists (
        select 1
        from public.skill_prerequisites pr
        where pr.skill_id = s.id
          and pr.prerequisite_skill_id not in (select skill_id from mastered)
      )
  )
  select
    c.id, c.name, c.description, c.level, c.sequence, c.subject_id, c.topic_id, c.development_domain,
    case
      when count(pre.id) = 0 then 'Ready to start — no prerequisites'
      else 'Prerequisites mastered: ' || string_agg(pre.name, ', ' order by pre.name)
    end as reason
  from candidate c
  left join public.skill_prerequisites pr on pr.skill_id = c.id
  left join public.skills pre on pre.id = pr.prerequisite_skill_id
  group by c.id, c.name, c.description, c.level, c.sequence, c.subject_id, c.topic_id, c.development_domain
  order by c.level, c.sequence
  limit p_limit;
$$;

-- ── get_skill_roadmap ────────────────────────────────────────────────────────
create or replace function public.get_skill_roadmap(
  p_child_id   uuid,
  p_subject_id uuid
)
returns table (
  id                 uuid,
  name               text,
  description        text,
  level              smallint,
  sequence           integer,
  topic_id           uuid,
  development_domain text,
  status             public.learning_stage,
  bucket             text,
  prerequisite_ids   uuid[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  with mastered as (
    select sp.skill_id
    from public.skill_progress sp
    where sp.child_id = p_child_id
      and sp.status in ('Comfortable', 'Confident')
  ),
  prog as (
    select sp.skill_id, sp.status
    from public.skill_progress sp
    where sp.child_id = p_child_id
  ),
  prereqs as (
    select skill_id, array_agg(prerequisite_skill_id) as ids
    from public.skill_prerequisites
    group by skill_id
  )
  select
    s.id, s.name, s.description, s.level, s.sequence, s.topic_id, s.development_domain,
    coalesce(pr.status, 'Not_Started'::public.learning_stage) as status,
    case
      when s.id in (select skill_id from mastered) then 'completed'
      when coalesce(pr.status, 'Not_Started'::public.learning_stage)
             in ('Introduced', 'Practicing', 'Needs_Practice') then 'current'
      when not exists (
        select 1 from public.skill_prerequisites pr2
        where pr2.skill_id = s.id
          and pr2.prerequisite_skill_id not in (select skill_id from mastered)
      ) then 'next'
      else 'locked'
    end as bucket,
    coalesce(pq.ids, '{}'::uuid[]) as prerequisite_ids
  from public.skills s
  left join prog pr on pr.skill_id = s.id
  left join prereqs pq on pq.skill_id = s.id
  where s.subject_id = p_subject_id
    and s.is_active = true
  order by s.level, s.sequence;
$$;

commit;
