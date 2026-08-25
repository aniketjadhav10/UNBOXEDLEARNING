-- ============================================================
-- harden_profiles_column_privileges.sql
--
-- profiles' "Users update their profile" RLS policy (schema.sql) allows a
-- signed-in user to update ANY column on their own row, with only
-- `auth.uid() = id` checked — no column restriction. That means any
-- authenticated client could previously run:
--   supabase.from('profiles').update({ is_admin: true, is_approved: true,
--     is_super_admin: true }).eq('id', <self>)
-- and grant themselves admin/approval/super-admin status directly.
--
-- Run grant_admin_on_family_actions.sql and auto_approve_password_signups.sql
-- BEFORE this file — they move every legitimate writer of these columns into
-- security definer functions (create_family_workspace, join_family_with_code,
-- approve_user, create_profile_for_new_user), which run as the function
-- owner and are unaffected by this revoke. Only direct client REST calls
-- (executing as `authenticated`/`anon`) are blocked.
-- ============================================================

revoke update (is_admin, is_approved, is_super_admin) on public.profiles from authenticated, anon;
