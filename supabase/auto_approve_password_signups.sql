-- ============================================================
-- auto_approve_password_signups.sql
--
-- New email/password registrations (via the /register page) should skip
-- the admin-approval gate, per product decision. Google OAuth sign-ups keep
-- today's behavior (is_approved = false until a super-admin approves them,
-- or they redeem a family invite code). The client passes
-- `signup_source: 'password'` in signUp()'s options.data (raw_user_meta_data)
-- only from the password-registration form, so this trigger can tell the
-- two paths apart without trusting any other client-writable field.
-- ============================================================

create or replace function create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, display_name, is_approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    coalesce((new.raw_user_meta_data->>'signup_source') = 'password', false)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
