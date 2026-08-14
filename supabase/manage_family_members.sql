-- Migration: Manage Family Members and Invitations
-- Provides RPCs to cancel invitations, remove members, and leave a workspace.

-- 1. RPC to cancel a pending family invitation
create or replace function public.cancel_family_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  invite_family_id uuid;
begin
  if current_user_id is null then
    raise exception 'Please sign in first.';
  end if;

  -- Get the family ID for the invitation
  select family_id into invite_family_id
  from public.family_invitations
  where id = invitation_id;

  if invite_family_id is null then
    raise exception 'Invitation not found.';
  end if;

  -- Check if current user is the owner of this family
  if not exists (
    select 1
    from public.family_members
    where user_id = current_user_id
      and family_id = invite_family_id
      and role = 'owner'
      and is_active = true
  ) then
    raise exception 'Only the workspace owner can cancel invitations.';
  end if;

  -- Delete the invitation
  delete from public.family_invitations
  where id = invitation_id;
end;
$$;

grant execute on function public.cancel_family_invitation(uuid) to authenticated;


-- 2. RPC to remove a family member (Owner only)
create or replace function public.remove_family_member(member_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_family_id uuid;
begin
  if current_user_id is null then
    raise exception 'Please sign in first.';
  end if;

  -- Cannot remove yourself via this function
  if current_user_id = member_user_id then
    raise exception 'You cannot remove yourself using this function. Use leave_family instead.';
  end if;

  -- Find the family where the target user is a member
  select family_id into target_family_id
  from public.family_members
  where user_id = member_user_id
    and is_active = true
  limit 1;

  if target_family_id is null then
    raise exception 'User is not in an active family.';
  end if;

  -- Verify the current user is the owner of that family
  if not exists (
    select 1
    from public.family_members
    where user_id = current_user_id
      and family_id = target_family_id
      and role = 'owner'
      and is_active = true
  ) then
    raise exception 'Only the workspace owner can remove members.';
  end if;

  -- Deactivate the member
  update public.family_members
  set is_active = false
  where user_id = member_user_id
    and family_id = target_family_id;

  -- Remove their family_id in profiles
  update public.profiles
  set family_id = null
  where id = member_user_id;

end;
$$;

grant execute on function public.remove_family_member(uuid) to authenticated;


-- 3. RPC to leave a family (Non-owner only)
create or replace function public.leave_family()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_family_id uuid;
  current_role text;
begin
  if current_user_id is null then
    raise exception 'Please sign in first.';
  end if;

  -- Find current user's family and role
  select family_id, role into current_family_id, current_role
  from public.family_members
  where user_id = current_user_id
    and is_active = true
  limit 1;

  if current_family_id is null then
    raise exception 'You are not in an active family.';
  end if;

  if current_role = 'owner' then
    raise exception 'Workspace owners cannot leave the family. You must transfer ownership or delete the workspace.';
  end if;

  -- Deactivate membership
  update public.family_members
  set is_active = false
  where user_id = current_user_id
    and family_id = current_family_id;

  -- Remove family_id in profiles
  update public.profiles
  set family_id = null
  where id = current_user_id;

end;
$$;

grant execute on function public.leave_family() to authenticated;
