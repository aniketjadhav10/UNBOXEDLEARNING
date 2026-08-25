-- ============================================================
-- add_children_personalization.sql
-- Roadmap Step 2: personalize generation to the child.
-- Adds the personalization inputs (interests, learning style) to children.
-- Idempotent. Apply in the Supabase SQL editor, then regenerate types.
-- ============================================================

alter table public.children
  add column if not exists interests text[] not null default '{}';

alter table public.children
  add column if not exists learning_style text;

comment on column public.children.interests is 'Child interests used to personalize generated curriculum';
comment on column public.children.learning_style is 'Preferred learning style (e.g. visual, hands-on)';
