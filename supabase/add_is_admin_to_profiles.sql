-- ONE-TIME BOOTSTRAP: edit the email below to your own account's email
-- BEFORE running this script. Safe to re-run (idempotent update), but if
-- the email doesn't match any user it will silently affect zero rows —
-- check the "UPDATE n" row count after running to confirm it matched.
alter table profiles
add column if not exists is_admin boolean not null default false;

update profiles
set is_admin = true
where id in (
  select id
  from auth.users
  where email = 'your-email@example.com'
);
