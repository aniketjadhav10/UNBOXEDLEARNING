-- Run this script in your Supabase SQL Editor.
-- It updates the `join_family_with_code` function to also approve and onboard the user.

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

  -- Get current user email from auth.users (definer context)
  select email
  into current_user_email
  from auth.users
  where id = current_user_id;

  if current_user_email is null then
    raise exception 'User email not found.';
  end if;

  -- Find matching active, unused invitation
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

  -- Enforce email match (case insensitive)
  if lower(matching_invite.email) != lower(current_user_email) then
    raise exception 'This code was sent to a different email address.';
  end if;

  -- Add current user as a family member
  insert into public.family_members (family_id, user_id, role, is_active)
  values (matching_invite.family_id, current_user_id, 'parent', true)
  on conflict (family_id, user_id) do update
    set role = 'parent',
        is_active = true,
        updated_at = now();

  -- Upsert profile to ensure it exists, link family, and instantly approve/onboard
  insert into public.profiles (id, display_name, family_id, is_approved, is_onboarded)
  values (current_user_id, current_user_email, matching_invite.family_id, true, true)
  on conflict (id) do update
  set family_id = excluded.family_id,
      is_approved = excluded.is_approved,
      is_onboarded = excluded.is_onboarded;

  -- Mark invitation as used
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
