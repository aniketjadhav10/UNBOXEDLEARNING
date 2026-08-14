-- Migration to add is_approved and is_super_admin columns
alter table profiles add column if not exists is_approved boolean not null default false;
alter table profiles add column if not exists is_super_admin boolean not null default false;

-- Create an RPC to fetch all profiles for super admins (bypassing RLS)
create or replace function get_all_profiles()
returns setof profiles
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_super_admin = true) then
    raise exception 'Unauthorized';
  end if;
  return query select * from profiles order by created_at desc;
end;
$$;

-- Create an RPC to approve a user (only super admins can do this)
create or replace function approve_user(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_super_admin = true) then
    raise exception 'Unauthorized';
  end if;
  
  update profiles set is_approved = true where id = target_user_id;
end;
$$;
