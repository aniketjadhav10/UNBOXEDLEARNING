-- ============================================================
-- harden_function_security.sql
-- Fixes the #1 finding from the live security advisors: ~18 SECURITY DEFINER
-- functions are executable by the `anon` (unauthenticated) role over the public
-- REST API (/rest/v1/rpc/...). That lets anyone on the internet call things like
-- get_all_profiles(), approve_user(), remove_family_member(), etc.
--
-- Strategy:
--   1. REVOKE EXECUTE from anon + public on every affected function
--      (this is the unambiguous, non-breaking fix — signed-in users are unaffected).
--   2. GRANT EXECUTE to `authenticated` on the legitimate user-facing functions.
--   3. Leave admin/maintenance/trigger functions callable only by service_role.
--   4. Pin search_path on functions flagged by the linter.
--
-- Signatures below were read from the LIVE database (pg_proc), so they are exact.
-- Apply in the Supabase SQL editor. Safe to re-run (idempotent grants/revokes).
-- ============================================================

-- ── 1 + 2. User-facing RPCs: block anon, allow signed-in users ──────────────
do $$
declare
  fn text;
  user_facing text[] := array[
    'public.add_parent_to_my_family(parent_email text)',
    'public.cancel_family_invitation(invitation_id uuid)',
    'public.complete_onboarding()',
    'public.create_family_invitation(invite_email text, invite_code text)',
    'public.create_family_workspace(family_name text)',
    'public.is_family_member(target_family_id uuid)',
    'public.is_family_owner(target_family_id uuid)',
    'public.join_family_with_code(joining_code text)',
    'public.leave_family()',
    'public.list_my_family_invitations()',
    'public.list_my_family_members()',
    'public.match_subjects(query_embedding extensions.vector, match_threshold double precision, match_count integer)',
    'public.remove_family_member(member_user_id uuid)',
    'public.user_family_id()'
  ];
begin
  foreach fn in array user_facing loop
    execute format('revoke execute on function %s from anon, public;', fn);
    execute format('grant  execute on function %s to authenticated;', fn);
  end loop;
end $$;

-- ── 3. Admin / maintenance / trigger functions: service_role only ───────────
-- These should NOT be callable directly by browser clients.
--   * create_profile_for_new_user  — trigger fn; still fires as table owner.
--   * rls_auto_enable              — maintenance.
revoke execute on function public.create_profile_for_new_user() from anon, authenticated, public;
revoke execute on function public.rls_auto_enable()             from anon, authenticated, public;

-- approve_user() and get_all_profiles() are ADMIN-only. Blocking anon is safe.
-- Whether they should stay callable by `authenticated` depends on how the app
-- invokes them:
--   * If the admin UI calls them from the browser as a signed-in admin, keep the
--     GRANT below AND make sure each function internally checks is_super_admin.
--   * The stricter, recommended path is to call them from a server route using
--     the service-role key and revoke `authenticated` entirely (commented out).
revoke execute on function public.approve_user(target_user_id uuid) from anon, public;
revoke execute on function public.get_all_profiles()                from anon, public;
grant  execute on function public.approve_user(target_user_id uuid) to authenticated; -- TODO: verify internal is_super_admin guard
grant  execute on function public.get_all_profiles()                to authenticated; -- TODO: verify internal is_super_admin guard
-- Stricter alternative (uncomment once calls are moved server-side to service_role):
-- revoke execute on function public.approve_user(target_user_id uuid) from authenticated;
-- revoke execute on function public.get_all_profiles()                from authenticated;

-- ── 4. Pin search_path on linter-flagged functions ──────────────────────────
-- Prevents search_path injection, especially for SECURITY DEFINER functions.
alter function public.get_all_profiles()                              set search_path = public, extensions;
alter function public.approve_user(target_user_id uuid)              set search_path = public, extensions;
alter function public.set_updated_at()                               set search_path = public, extensions;
alter function public.assign_missing_tasks_to_children()             set search_path = public, extensions;
alter function public.assign_tasks_to_child(p_task_ids uuid[], p_child_id uuid)
                                                                     set search_path = public, extensions;
alter function public.match_user_memories(query_embedding extensions.vector, user_id_filter uuid, match_threshold double precision, match_count integer)
                                                                     set search_path = public, extensions;
alter function public.match_topics(query_embedding extensions.vector, subject_id_filter uuid, match_threshold double precision, match_count integer)
                                                                     set search_path = public, extensions;
alter function public.match_tasks(query_embedding extensions.vector, topic_id_filter uuid, match_threshold double precision, match_count integer)
                                                                     set search_path = public, extensions;

-- ── 5. Auth (do this in the dashboard, not SQL) ─────────────────────────────
-- Enable "Leaked password protection" (HaveIBeenPwned) under
-- Authentication → Providers → Email. The linter flagged it as disabled.
