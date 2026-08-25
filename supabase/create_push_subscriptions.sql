-- Per-user Web Push subscriptions (one row per subscribed browser/device).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "Users read own push subscriptions" on push_subscriptions;
create policy "Users read own push subscriptions" on push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert own push subscriptions" on push_subscriptions;
create policy "Users insert own push subscriptions" on push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users delete own push subscriptions" on push_subscriptions;
create policy "Users delete own push subscriptions" on push_subscriptions
  for delete using (auth.uid() = user_id);
