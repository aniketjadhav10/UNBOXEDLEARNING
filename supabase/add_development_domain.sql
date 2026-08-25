-- ============================================================
-- add_development_domain.sql
-- Roadmap Step 1: make the curriculum "whole-child (360°)".
-- Tags each subject with one of 7 development domains so subjects roll up into
-- a balanced view across dimensions, not just academics.
-- Idempotent. Apply in the Supabase SQL editor, then regenerate types.
-- ============================================================

alter table public.subjects
  add column if not exists development_domain text not null default 'academic';

alter table public.subjects
  drop constraint if exists subjects_development_domain_check;
alter table public.subjects
  add constraint subjects_development_domain_check
  check (development_domain in (
    'academic', 'social_emotional', 'physical',
    'creative', 'life_skills', 'character', 'digital'
  ));

comment on column public.subjects.development_domain is
  '360° development domain: academic | social_emotional | physical | creative | life_skills | character | digital';
