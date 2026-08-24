-- ============================================================
-- add_scheduled_session_skill.sql
-- Rewires the weekly planner onto the roadmap: a scheduled session can now point
-- at a SKILL (from the skill tree) instead of only a task. The planner cron
-- schedules due spaced-reviews + recommended-next skills; task-based sessions
-- still work (task_id stays). Idempotent. Apply in the Supabase SQL editor.
-- ============================================================
begin;

alter table public.scheduled_sessions
  add column if not exists skill_id uuid references public.skills(id) on delete set null;

create index if not exists scheduled_sessions_skill_id_idx
  on public.scheduled_sessions (skill_id);

commit;
