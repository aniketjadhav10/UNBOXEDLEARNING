-- ============================================================
-- add_domain_mastery_rpc.sql
-- Roadmap architecture M5 (insight) — the skill-gap radar. Aggregates a child's
-- skill mastery across the 7 development domains so parents see, at a glance,
-- where the child is strong and where the gaps are.
--
-- SECURITY INVOKER: RLS on skill_progress (child owner) and skills applies.
-- Denominator is the child's active skills (those with a skill_progress row).
-- Idempotent. Apply in the Supabase SQL editor after the M1–M3 files.
-- ============================================================
begin;

create or replace function public.get_domain_mastery(p_child_id uuid)
returns table (
  development_domain  text,
  total_skills        integer,
  mastered_skills     integer,
  in_progress_skills  integer,
  mastery_pct         numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.development_domain,
    count(*)::int as total_skills,
    count(*) filter (where sp.status in ('Comfortable', 'Confident'))::int as mastered_skills,
    count(*) filter (where sp.status in ('Introduced', 'Practicing', 'Needs_Practice'))::int as in_progress_skills,
    round(
      100.0 * count(*) filter (where sp.status in ('Comfortable', 'Confident'))
      / nullif(count(*), 0),
      0
    ) as mastery_pct
  from public.skill_progress sp
  join public.skills s on s.id = sp.skill_id
  where sp.child_id = p_child_id
    and sp.is_active = true
  group by s.development_domain;
$$;

commit;
