-- Supabase schema for a multi-user homeschool management app.
-- Fresh installs can run this file directly in the Supabase SQL editor.
-- Existing projects with old columns may need ALTER TABLE migrations.

create extension if not exists pgcrypto;

do $$
begin
  create type learning_stage as enum (
    'Not_Started',
    'Introduced',
    'Practicing',
    'Comfortable',
    'Confident',
    'Needs_Practice'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  grade_level text not null,
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#3f6b57',
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, name)
);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  description text,
  difficulty_level text,
  age_group text,
  is_active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  name text not null,
  description text,
  difficulty_level text,
  age_group text,
  source_type text not null default 'manual' check (source_type in ('manual', 'ai_generated')),
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_progress (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  learning_stage learning_stage not null default 'Not_Started',
  interest_level text,
  learned_count integer not null default 0,
  target_count integer not null default 5,
  last_practiced_at timestamptz,
  next_due_at timestamptz,
  repeat_interval integer,
  is_scheduled_this_week boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, task_id)
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  name text not null,
  type text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  topic text not null,
  lesson jsonb not null,
  saved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sync_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null,
  method text not null check (method in ('POST', 'PATCH', 'DELETE')),
  payload jsonb not null,
  synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists children_user_id_idx on children(user_id);
create index if not exists subjects_child_id_idx on subjects(child_id);
create index if not exists topics_subject_id_idx on topics(subject_id);
create index if not exists tasks_topic_id_idx on tasks(topic_id);
create index if not exists task_progress_child_id_idx on task_progress(child_id);
create index if not exists task_progress_task_id_idx on task_progress(task_id);
create index if not exists task_progress_stage_idx on task_progress(learning_stage);
create index if not exists activities_task_id_idx on activities(task_id);
create index if not exists ai_inbox_user_id_created_at_idx on ai_inbox(user_id, created_at desc);
create index if not exists sync_queue_user_id_created_at_idx on sync_queue(user_id, created_at);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on profiles;
create trigger set_profiles_updated_at
before update on profiles
for each row execute function set_updated_at();

drop trigger if exists set_children_updated_at on children;
create trigger set_children_updated_at
before update on children
for each row execute function set_updated_at();

drop trigger if exists set_subjects_updated_at on subjects;
create trigger set_subjects_updated_at
before update on subjects
for each row execute function set_updated_at();

drop trigger if exists set_topics_updated_at on topics;
create trigger set_topics_updated_at
before update on topics
for each row execute function set_updated_at();

drop trigger if exists set_tasks_updated_at on tasks;
create trigger set_tasks_updated_at
before update on tasks
for each row execute function set_updated_at();

drop trigger if exists set_task_progress_updated_at on task_progress;
create trigger set_task_progress_updated_at
before update on task_progress
for each row execute function set_updated_at();

drop trigger if exists set_activities_updated_at on activities;
create trigger set_activities_updated_at
before update on activities
for each row execute function set_updated_at();

drop trigger if exists set_ai_inbox_updated_at on ai_inbox;
create trigger set_ai_inbox_updated_at
before update on ai_inbox
for each row execute function set_updated_at();

create or replace function create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
after insert on auth.users
for each row execute function create_profile_for_new_user();

alter table profiles enable row level security;
alter table children enable row level security;
alter table subjects enable row level security;
alter table topics enable row level security;
alter table tasks enable row level security;
alter table task_progress enable row level security;
alter table activities enable row level security;
alter table ai_inbox enable row level security;
alter table sync_queue enable row level security;

drop policy if exists "Users read their profile" on profiles;
create policy "Users read their profile"
on profiles for select
using (auth.uid() = id);

drop policy if exists "Users create their profile" on profiles;
create policy "Users create their profile"
on profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users update their profile" on profiles;
create policy "Users update their profile"
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users manage their children" on children;
create policy "Users manage their children"
on children for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage subjects through children" on subjects;
create policy "Users manage subjects through children"
on subjects for all
using (
  exists (
    select 1
    from children
    where children.id = subjects.child_id
      and children.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from children
    where children.id = subjects.child_id
      and children.user_id = auth.uid()
  )
);

drop policy if exists "Users manage topics through subjects" on topics;
create policy "Users manage topics through subjects"
on topics for all
using (
  exists (
    select 1
    from subjects
    join children on children.id = subjects.child_id
    where subjects.id = topics.subject_id
      and children.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from subjects
    join children on children.id = subjects.child_id
    where subjects.id = topics.subject_id
      and children.user_id = auth.uid()
  )
);

drop policy if exists "Users manage tasks through topics" on tasks;
create policy "Users manage tasks through topics"
on tasks for all
using (
  exists (
    select 1
    from topics
    join subjects on subjects.id = topics.subject_id
    join children on children.id = subjects.child_id
    where topics.id = tasks.topic_id
      and children.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from topics
    join subjects on subjects.id = topics.subject_id
    join children on children.id = subjects.child_id
    where topics.id = tasks.topic_id
      and children.user_id = auth.uid()
  )
);

drop policy if exists "Users manage progress through children and tasks" on task_progress;
create policy "Users manage progress through children and tasks"
on task_progress for all
using (
  exists (
    select 1
    from children
    where children.id = task_progress.child_id
      and children.user_id = auth.uid()
  )
  and exists (
    select 1
    from tasks
    join topics on topics.id = tasks.topic_id
    join subjects on subjects.id = topics.subject_id
    where tasks.id = task_progress.task_id
      and subjects.child_id = task_progress.child_id
  )
)
with check (
  exists (
    select 1
    from children
    where children.id = task_progress.child_id
      and children.user_id = auth.uid()
  )
  and exists (
    select 1
    from tasks
    join topics on topics.id = tasks.topic_id
    join subjects on subjects.id = topics.subject_id
    where tasks.id = task_progress.task_id
      and subjects.child_id = task_progress.child_id
  )
);

drop policy if exists "Users manage activities through tasks" on activities;
create policy "Users manage activities through tasks"
on activities for all
using (
  exists (
    select 1
    from tasks
    join topics on topics.id = tasks.topic_id
    join subjects on subjects.id = topics.subject_id
    join children on children.id = subjects.child_id
    where tasks.id = activities.task_id
      and children.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from tasks
    join topics on topics.id = tasks.topic_id
    join subjects on subjects.id = topics.subject_id
    join children on children.id = subjects.child_id
    where tasks.id = activities.task_id
      and children.user_id = auth.uid()
  )
);

drop policy if exists "Users manage their AI inbox" on ai_inbox;
create policy "Users manage their AI inbox"
on ai_inbox for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage their sync queue" on sync_queue;
create policy "Users manage their sync queue"
on sync_queue for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
