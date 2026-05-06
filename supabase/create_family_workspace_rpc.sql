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
  set family_id = new_family_id
  where profiles.id = current_user_id;

  return query
  select families.id, families.name, families.created_by
  from families
  where families.id = new_family_id;
end;
$$;

grant execute on function create_family_workspace(text) to authenticated;
