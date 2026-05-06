create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'parent' check (role in ('owner', 'parent')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, user_id)
);

alter table profiles
add column if not exists family_id uuid references families(id) on delete set null;

alter table profiles
add column if not exists is_admin boolean not null default false;

alter table children
add column if not exists family_id uuid references families(id) on delete cascade;

alter table children
add column if not exists is_active boolean not null default true;

alter table children
alter column user_id drop not null;

create index if not exists profiles_family_id_idx on profiles(family_id);
create index if not exists family_members_family_id_idx on family_members(family_id);
create index if not exists family_members_user_id_idx on family_members(user_id);
create index if not exists children_family_id_idx on children(family_id);

drop trigger if exists set_families_updated_at on families;
create trigger set_families_updated_at
before update on families
for each row execute function set_updated_at();

drop trigger if exists set_family_members_updated_at on family_members;
create trigger set_family_members_updated_at
before update on family_members
for each row execute function set_updated_at();

alter table families enable row level security;
alter table family_members enable row level security;

create or replace function user_family_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select profiles.family_id
  from profiles
  where profiles.id = auth.uid()
$$;

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

drop policy if exists "Users create families" on families;
drop policy if exists "Authenticated users create families" on families;
create policy "Authenticated users create families"
on families for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Family owners update their family" on families;
create policy "Family owners update their family"
on families for update
using (is_family_owner(id))
with check (is_family_owner(id));

drop policy if exists "Family members read memberships" on family_members;
create policy "Family members read memberships"
on family_members for select
using (is_family_member(family_id));

drop policy if exists "Users create their owner membership" on family_members;
create policy "Users create their owner membership"
on family_members for insert
with check (user_id = auth.uid());

drop policy if exists "Family owners update memberships" on family_members;
create policy "Family owners update memberships"
on family_members for update
using (is_family_owner(family_id))
with check (is_family_owner(family_id));

drop policy if exists "Users manage their children" on children;
create policy "Family members manage children"
on children for all
using (
  family_id = user_family_id()
  or auth.uid() = user_id
)
with check (
  family_id = user_family_id()
  or auth.uid() = user_id
);
