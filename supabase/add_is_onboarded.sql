-- Migration: Add is_onboarded flag to enforce onboarding wizard
alter table public.profiles add column if not exists is_onboarded boolean not null default false;

-- RPC to mark onboarding as complete for the current user
create or replace function public.complete_onboarding()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.';
  end if;

  update public.profiles
  set is_onboarded = true
  where id = auth.uid();
end;
$$;

grant execute on function public.complete_onboarding() to authenticated;
