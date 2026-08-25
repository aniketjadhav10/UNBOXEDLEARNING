-- ============================================================
-- fix_child_enrollment_family_rls.sql
--
-- `children`'s RLS policy ("Family members manage children") checks
-- `family_id = user_family_id() OR auth.uid() = user_id` — family-aware.
-- But `child_subjects`/`child_topics` (subject/topic enrollment junction
-- tables) still use an older policy that only checks
-- `children.user_id = auth.uid()` — no family_id path at all. So a
-- co-parent (or anyone who didn't personally create the child row) gets
-- "new row violates row-level security policy for table child_subjects"
-- when enrolling a subject for a child added by a different family member.
-- ============================================================

drop policy if exists "Users manage own children's subject enrollments" on public.child_subjects;
create policy "Family members manage children's subject enrollments"
on public.child_subjects for all
using (
  child_id in (
    select children.id from public.children
    where children.family_id = user_family_id() or children.user_id = auth.uid()
  )
)
with check (
  child_id in (
    select children.id from public.children
    where children.family_id = user_family_id() or children.user_id = auth.uid()
  )
);

drop policy if exists "Users manage own children's topic enrollments" on public.child_topics;
create policy "Family members manage children's topic enrollments"
on public.child_topics for all
using (
  child_id in (
    select children.id from public.children
    where children.family_id = user_family_id() or children.user_id = auth.uid()
  )
)
with check (
  child_id in (
    select children.id from public.children
    where children.family_id = user_family_id() or children.user_id = auth.uid()
  )
);
