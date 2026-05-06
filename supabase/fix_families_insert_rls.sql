alter table families enable row level security;

drop policy if exists "Users create families" on families;
drop policy if exists "Authenticated users create families" on families;

create policy "Authenticated users create families"
on families for insert
to authenticated
with check (created_by = auth.uid());
