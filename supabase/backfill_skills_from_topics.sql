-- ============================================================
-- backfill_skills_from_topics.sql
-- Roadmap architecture M1 — seed the new skill layer from existing data so the
-- roadmap has something to render on day one. Run AFTER add_skills_layer.sql.
--
--   1. one skill per existing topic (only if the topic has none yet)
--   2. re-parent each topic's tasks onto that skill (tasks.skill_id)
--   3. seed skill_progress from task_progress (most-advanced stage per child+skill)
--
-- Idempotent: step 1 skips topics that already have a skill; step 2 only fills
-- null skill_id; step 3 uses ON CONFLICT DO NOTHING. Safe to re-run.
-- No new prerequisite edges are created here — the graph is populated by AI
-- generation (M3) or by the parent; backfilled skills simply start unlocked.
-- ============================================================
begin;

-- 1. One skill per topic ------------------------------------------------------
insert into public.skills
  (topic_id, subject_id, development_domain, name, description, level, difficulty, sequence, is_global, created_by, is_active)
select
  t.id,
  t.subject_id,
  coalesce(s.development_domain, 'academic'),
  t.title,
  t.description,
  1,
  t.difficulty_level,
  t.order_index,
  coalesce(s.is_global, false),
  s.created_by,
  true
from public.topics t
join public.subjects s on s.id = t.subject_id
where not exists (select 1 from public.skills sk where sk.topic_id = t.id);

-- 2. Re-parent existing tasks onto their topic's skill ------------------------
update public.tasks tk
set skill_id = (
  select sk.id from public.skills sk
  where sk.topic_id = tk.topic_id
  order by sk.created_at, sk.id
  limit 1)
where tk.skill_id is null
  and exists (select 1 from public.skills sk2 where sk2.topic_id = tk.topic_id);

-- 3. Seed skill_progress from task_progress -----------------------------------
-- Collapse each child's per-task stages into one per-skill stage, taking the
-- most-advanced stage (Needs_Practice treated as mid, not a regression floor).
with prog as (
  select
    tp.child_id,
    tk.skill_id,
    max(case tp.learning_stage
          when 'Confident'      then 5
          when 'Comfortable'    then 4
          when 'Practicing'     then 3
          when 'Needs_Practice' then 3
          when 'Introduced'     then 2
          else 1
        end) as rank,
    max(tp.last_practiced_at) as last_practiced_at
  from public.task_progress tp
  join public.tasks tk on tk.id = tp.task_id
  where tk.skill_id is not null
  group by tp.child_id, tk.skill_id
)
insert into public.skill_progress (child_id, skill_id, status, last_practiced_at)
select
  prog.child_id,
  prog.skill_id,
  (case prog.rank
     when 5 then 'Confident'
     when 4 then 'Comfortable'
     when 3 then 'Practicing'
     when 2 then 'Introduced'
     else 'Not_Started'
   end)::public.learning_stage,
  prog.last_practiced_at
from prog
on conflict (child_id, skill_id) do nothing;

commit;
