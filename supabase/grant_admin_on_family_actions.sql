-- ============================================================
-- grant_admin_on_family_actions.sql
--
-- Previously, `is_admin` was only ever set client-side, by a direct
-- `profiles` upsert from onboardingService.ts (ensureFamily/addChild).
-- That relied on profiles' permissive self-update RLS policy, which is
-- being locked down in harden_profiles_column_privileges.sql. This
-- migration moves admin-granting into the two RPCs that legitimately
-- represent "this user should be a family admin":
--   - create_family_workspace: creating a family makes you its admin.
--   - join_family_with_code: a co-parent redeeming an invite joins as
--     family_members.role='parent' and should also get curriculum-admin
--     access (previously only the family *creator* got is_admin=true,
--     so joined co-parents were silently treated as non-admins).
-- Both functions are security definer, so this is safe to run even
-- after client write access to profiles.is_admin is revoked.
-- ============================================================

create or replace function create_family_workspace(family_name text)
returns table (
  id uuid,
  name text,
  created_by uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  new_family_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Please sign in before creating a family workspace.';
  end if;

  if family_name is null or length(trim(family_name)) = 0 then
    raise exception 'Family name is required.';
  end if;

  insert into families (name, created_by)
  values (trim(family_name), current_user_id)
  returning families.id into new_family_id;

  insert into family_members (family_id, user_id, role)
  values (new_family_id, current_user_id, 'owner')
  on conflict (family_id, user_id) do update
    set role = 'owner',
        is_active = true,
        updated_at = now();

  update profiles
  set family_id = new_family_id,
      is_admin = true
  where profiles.id = current_user_id;

  return query
  select families.id, families.name, families.created_by
  from families
  where families.id = new_family_id;
end;
$$;

grant execute on function create_family_workspace(text) to authenticated;

create or replace function public.join_family_with_code(joining_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text;
  matching_invite record;
begin
  if current_user_id is null then
    raise exception 'Please sign in to join a family.';
  end if;

  select email
  into current_user_email
  from auth.users
  where id = current_user_id;

  if current_user_email is null then
    raise exception 'User email not found.';
  end if;

  select fi.*, f.name as family_name
  into matching_invite
  from public.family_invitations as fi
  join public.families as f on f.id = fi.family_id
  where fi.code = upper(trim(joining_code))
    and fi.is_used = false
    and fi.expires_at > now()
  limit 1;

  if matching_invite.id is null then
    raise exception 'Invalid or expired joining code.';
  end if;

  if lower(matching_invite.email) != lower(current_user_email) then
    raise exception 'This code was sent to a different email address.';
  end if;

  insert into public.family_members (family_id, user_id, role, is_active)
  values (matching_invite.family_id, current_user_id, 'parent', true)
  on conflict (family_id, user_id) do update
    set role = 'parent',
        is_active = true,
        updated_at = now();

  insert into public.profiles (id, display_name, family_id, is_admin, is_approved, is_onboarded)
  values (current_user_id, current_user_email, matching_invite.family_id, true, true, true)
  on conflict (id) do update
  set family_id = excluded.family_id,
      is_admin = true,
      is_approved = excluded.is_approved,
      is_onboarded = excluded.is_onboarded;

  update public.family_invitations
  set is_used = true
  where id = matching_invite.id;

  return jsonb_build_object(
    'family_id', matching_invite.family_id,
    'family_name', matching_invite.family_name,
    'role', 'parent'
  );
end;
$$;

grant execute on function public.join_family_with_code(text) to authenticated;
