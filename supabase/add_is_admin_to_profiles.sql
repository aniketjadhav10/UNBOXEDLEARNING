alter table profiles
add column if not exists is_admin boolean not null default false;

-- Replace this email with your Google account email, then run it once.
update profiles
set is_admin = true
where id in (
  select id
  from auth.users
  where email = 'your-email@example.com'
);
