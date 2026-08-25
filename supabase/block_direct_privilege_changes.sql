-- ============================================================
-- block_direct_privilege_changes.sql
--
-- SUPERSEDES harden_profiles_column_privileges.sql, which did NOT work:
-- Supabase grants UPDATE on `profiles` to `authenticated`/`anon` at the
-- TABLE level (see relacl), and in Postgres a table-level GRANT implicitly
-- covers every column — a column-specific REVOKE cannot narrow that back
-- down. `information_schema.column_privileges` still showed authenticated/
-- anon holding UPDATE on is_admin/is_approved/is_super_admin after running
-- that file. The self-privilege-escalation hole was still open.
--
-- Fix: a BEFORE UPDATE trigger that blocks changes to the three privileged
-- columns unless the change is happening inside a trusted SECURITY DEFINER
-- function (create_family_workspace, join_family_with_code, approve_user,
-- create_profile_for_new_user). Those functions are owned by `postgres`, and
-- Postgres sets `current_user` to the function owner for the duration of a
-- SECURITY DEFINER call — so `current_user` reliably distinguishes "inside a
-- trusted RPC" (postgres/service_role) from "direct client REST call"
-- (authenticated/anon), which RLS alone cannot do at column granularity.
-- ============================================================

create or replace function public.block_direct_privilege_changes()
returns trigger
language plpgsql
as $$
begin
  if (new.is_admin is distinct from old.is_admin
      or new.is_approved is distinct from old.is_approved
      or new.is_super_admin is distinct from old.is_super_admin)
     and current_user not in ('postgres', 'service_role') then
    raise exception 'is_admin, is_approved, and is_super_admin can only be changed via a trusted server-side function.';
  end if;
  return new;
end;
$$;

drop trigger if exists block_direct_privilege_changes on public.profiles;
create trigger block_direct_privilege_changes
before update on public.profiles
for each row execute function public.block_direct_privilege_changes();

-- The column-level revoke from harden_profiles_column_privileges.sql is kept
-- (harmless, and correct in spirit) but the trigger above is the actual
-- enforcement mechanism.
