drop function if exists add_parent_to_my_family(text);

create function add_parent_to_my_family(parent_email text)
returns table (
  member_id uuid,
  member_family_id uuid,
  member_user_id uuid,
  member_role text,
  member_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_family_id uuid;
  target_user_id uuid;
begin
  if current_user_id is null then
    raise exception 'Please sign in before adding a parent.';
  end if;

  select fm.family_id
  into current_family_id
  from public.family_members as fm
  where fm.user_id = current_user_id
    and fm.role = 'owner'
    and fm.is_active = true
  limit 1;

  if current_family_id is null then
    raise exception 'Only a family owner can add parents.';
  end if;

  select au.id
  into target_user_id
  from auth.users as au
  where lower(au.email) = lower(trim(parent_email))
  limit 1;

  if target_user_id is null then
    raise exception 'Parent must sign in once with Google before they can be added.';
  end if;

  insert into public.family_members as fm (family_id, user_id, role, is_active)
  values (current_family_id, target_user_id, 'parent', true)
  on conflict (family_id, user_id) do update
    set role = excluded.role,
        is_active = excluded.is_active,
        updated_at = now();

  update public.profiles as p
  set family_id = current_family_id
  where p.id = target_user_id;

  return query
  select
    fm.id as member_id,
    fm.family_id as member_family_id,
    fm.user_id as member_user_id,
    fm.role as member_role,
    au.email as member_email
  from public.family_members as fm
  join auth.users as au on au.id = fm.user_id
  where fm.family_id = current_family_id
    and fm.user_id = target_user_id;
end;
$$;

grant execute on function add_parent_to_my_family(text) to authenticated;
