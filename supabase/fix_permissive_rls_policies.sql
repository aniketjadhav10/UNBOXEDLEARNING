-- ============================================================
-- fix_permissive_rls_policies.sql
-- Closes three RLS tenant-isolation holes found while reading the live policies.
-- Each currently uses a bare `true` predicate, so ANY signed-in user is allowed:
--   * system_settings — read/write to everyone (write is the dangerous part)
--   * task_progress   — two "Admins can insert/update" policies with `true`
--                       let any user write ANY child's progress (cross-family)
--   * email_logs      — readable by every authenticated user (all families' logs)
--
-- Apply in the Supabase SQL editor. Wrapped in a transaction.
-- Depends on optimize_rls_initplan.sql having recreated the per-child
-- task_progress policy (this file only removes the offending `true` ones).
-- ============================================================
begin;

-- ── system_settings: reads open (app config), writes super-admin only ───────
drop policy if exists "Enable read/write for admin users" on public.system_settings;

drop policy if exists "system_settings readable by authenticated" on public.system_settings;
create policy "system_settings readable by authenticated" on public.system_settings
  for select to authenticated
  using (true);

drop policy if exists "system_settings insert by super admins" on public.system_settings;
create policy "system_settings insert by super admins" on public.system_settings
  for insert to authenticated
  with check (exists (select 1 from public.profiles p
                      where p.id = (select auth.uid()) and p.is_super_admin));

drop policy if exists "system_settings update by super admins" on public.system_settings;
create policy "system_settings update by super admins" on public.system_settings
  for update to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.is_super_admin))
  with check (exists (select 1 from public.profiles p
                      where p.id = (select auth.uid()) and p.is_super_admin));

drop policy if exists "system_settings delete by super admins" on public.system_settings;
create policy "system_settings delete by super admins" on public.system_settings
  for delete to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.is_super_admin));

-- ── task_progress: remove the cross-family `true` write policies ────────────
-- The correct per-child policy ("Users manage task progress for their own
-- children") remains and is sufficient. If family co-parents later need write
-- access, widen THAT policy to be family-aware — do not re-add a `true` policy.
drop policy if exists "Admins can insert task progress" on public.task_progress;
drop policy if exists "Admins can update task progress" on public.task_progress;

-- ── email_logs: restrict reads to super-admins ─────────────────────────────
-- email_logs has no family_id/user_id column, so per-family scoping isn't
-- possible yet. Super-admin-only read is the safe interim scope.
-- FOLLOW-UP: add family_id to email_logs and scope by (select user_family_id()).
drop policy if exists "Enable read access for authenticated users" on public.email_logs;
create policy "Super admins read email logs" on public.email_logs
  for select to authenticated
  using (exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.is_super_admin));

commit;
