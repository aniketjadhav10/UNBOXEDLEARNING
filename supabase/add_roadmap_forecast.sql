-- ============================================================
-- add_roadmap_forecast.sql
-- Roadmap architecture M5 (insight) — predictive mastery ETA. Extends
-- get_skill_roadmap to also return the per-child practice signals the client
-- needs to project "mastery by ~date" (practice_count, last_practiced_at,
-- started_at). Return shape changes, so the function is dropped and recreated.
-- Idempotent. Apply in the Supabase SQL editor after add_roadmap_rpcs.sql.
-- ============================================================
begin;

drop function if exists public.get_skill_roadmap(uuid, uuid);

create function public.get_skill_roadmap(
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
  prerequisite_ids   uuid[],
  practice_count     integer,
  last_practiced_at  timestamptz,
  started_at         timestamptz
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
    select sp.skill_id, sp.status, sp.practice_count, sp.last_practiced_at, sp.created_at
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
    coalesce(pq.ids, '{}'::uuid[]) as prerequisite_ids,
    coalesce(pr.practice_count, 0) as practice_count,
    pr.last_practiced_at,
    pr.created_at as started_at
  from public.skills s
  left join prog pr on pr.skill_id = s.id
  left join prereqs pq on pq.skill_id = s.id
  where s.subject_id = p_subject_id
    and s.is_active = true
  order by s.level, s.sequence;
$$;

commit;
