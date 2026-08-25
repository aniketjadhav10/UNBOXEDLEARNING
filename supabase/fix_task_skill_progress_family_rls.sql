-- ============================================================
-- fix_task_skill_progress_family_rls.sql
--
-- Same bug class as fix_child_enrollment_family_rls.sql: `task_progress`
-- and `skill_progress` still scope access via the old owner-only check
-- (`children.user_id = auth.uid()`), with no family_id path — unlike
-- `assessment_results`/`lesson_plans`/`scheduled_sessions`/`submissions`,
-- which already correctly check `c.user_id = auth.uid() OR c.family_id =
-- user_family_id()`. A co-parent (or any family member who isn't the
-- child's original creator) gets "new row violates row-level security
-- policy" on these two tables.
-- ============================================================

drop policy if exists "Users manage task progress for their own children" on public.task_progress;
create policy "Family members manage task progress for children"
on public.task_progress for all
using (
  child_id in (
    select children.id from public.children
    where children.user_id = auth.uid() or children.family_id = user_family_id()
  )
)
with check (
  child_id in (
    select children.id from public.children
    where children.user_id = auth.uid() or children.family_id = user_family_id()
  )
);

drop policy if exists "Users manage skill progress for their own children" on public.skill_progress;
create policy "Family members manage skill progress for children"
on public.skill_progress for all
using (
  child_id in (
    select c.id from public.children c
    where c.user_id = auth.uid() or c.family_id = user_family_id()
  )
)
with check (
  child_id in (
    select c.id from public.children c
    where c.user_id = auth.uid() or c.family_id = user_family_id()
  )
);
