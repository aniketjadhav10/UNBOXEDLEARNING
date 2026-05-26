-- SQL Migration: Family Joining Codes and Invitations System
-- Run this script in your Supabase SQL Editor.

-- 1. Create the family invitations table
create table if not exists public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  code varchar(10) not null,
  role text not null default 'parent' check (role in ('parent')),
  created_by uuid not null references auth.users(id) on delete cascade,
  is_used boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

-- 2. Create indices for speed and integrity
-- Ensure one active invitation per email per family to avoid duplicates
create unique index if not exists family_invitations_active_idx 
  on public.family_invitations(family_id, lower(email)) 
  where (is_used = false);

-- Search index for checking codes
create index if not exists family_invitations_code_idx 
  on public.family_invitations(code);

-- 3. Enable RLS
alter table public.family_invitations enable row level security;

-- 4. Set up Policies
drop policy if exists "Family members read family invitations" on public.family_invitations;
create policy "Family members read family invitations"
on public.family_invitations for select
using (is_family_member(family_id));

drop policy if exists "Family owners manage family invitations" on public.family_invitations;
create policy "Family owners manage family invitations"
on public.family_invitations for all
using (is_family_owner(family_id))
with check (is_family_owner(family_id));

-- 5. RPC to securely create a family invitation from owner context
create or replace function public.create_family_invitation(invite_email text, invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_family_id uuid;
  new_invitation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Please sign in first.';
  end if;

  -- Find the family owned by the current user
  select fm.family_id
  into current_family_id
  from public.family_members as fm
  where fm.user_id = current_user_id
    and fm.role = 'owner'
    and fm.is_active = true
  limit 1;

  if current_family_id is null then
    raise exception 'Only the family owner can invite new members.';
  end if;

  -- Check if there's already an active (unused) invitation for this email in this family
  if exists (
    select 1
    from public.family_invitations
    where family_id = current_family_id
      and lower(email) = lower(trim(invite_email))
      and is_used = false
      and expires_at > now()
  ) then
    raise exception 'An active invitation already exists for this email address.';
  end if;

  -- Insert the new invitation
  insert into public.family_invitations (family_id, email, code, created_by)
  values (current_family_id, trim(invite_email), upper(trim(invite_code)), current_user_id)
  returning id into new_invitation_id;

  return jsonb_build_object(
    'id', new_invitation_id,
    'family_id', current_family_id,
    'email', trim(invite_email),
    'code', upper(trim(invite_code)),
    'created_at', now()
  );
end;
$$;

grant execute on function public.create_family_invitation(text, text) to authenticated;

-- 6. RPC to list active and historic family invitations for members
create or replace function public.list_my_family_invitations()
returns table (
  id uuid,
  family_id uuid,
  email text,
  code varchar(10),
  role text,
  is_used boolean,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id,
         family_id,
         email,
         code,
         role,
         is_used,
         created_at,
         expires_at
  from public.family_invitations
  where family_id = user_family_id()
  order by created_at desc
$$;

grant execute on function public.list_my_family_invitations() to authenticated;

-- 7. RPC to join an existing family using a valid invitation code
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

  -- Update profiles.family_id
  update public.profiles
  set family_id = matching_invite.family_id
  where id = current_user_id;

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

grant execute on function public.join_family_with_code(text) to authenticated;
