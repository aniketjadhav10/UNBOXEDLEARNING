create or replace function is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from family_members
    where family_members.family_id = target_family_id
      and family_members.user_id = auth.uid()
      and family_members.is_active = true
  )
$$;

create or replace function is_family_owner(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from family_members
    where family_members.family_id = target_family_id
      and family_members.user_id = auth.uid()
      and family_members.role = 'owner'
      and family_members.is_active = true
  )
$$;

drop policy if exists "Family members read their family" on families;
create policy "Family members read their family"
on families for select
using (is_family_member(id));

drop policy if exists "Family owners update their family" on families;
create policy "Family owners update their family"
on families for update
using (is_family_owner(id))
with check (is_family_owner(id));

drop policy if exists "Family members read memberships" on family_members;
create policy "Family members read memberships"
on family_members for select
using (is_family_member(family_id));

drop policy if exists "Family owners update memberships" on family_members;
create policy "Family owners update memberships"
on family_members for update
using (is_family_owner(family_id))
with check (is_family_owner(family_id));
