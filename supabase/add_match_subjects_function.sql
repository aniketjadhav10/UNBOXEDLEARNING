-- SQL Migration: match_subjects RPC for AI curriculum de-duplication
-- ---------------------------------------------------------------------------
-- Fixes a silently-broken code path: server/ai/aiDb.ts#findOrCreateSubject
-- called public.match_subjects(...), which did not exist, so every subject
-- vector-similarity lookup errored and fell back to exact-name matching only.
--
-- Unlike the existing match_topics / match_tasks (which search globally), this
-- function is ownership-scoped: it only matches subjects the current user owns
-- or subjects flagged is_global. That prevents one family's generation run from
-- vector-matching another family's private subject.
--
-- Assumes the live `subjects` table already has: embedding vector(768),
-- created_by uuid, is_global boolean. (These exist in production but are not in
-- a tracked migration — see the companion capture migration.)
-- Apply this file in the Supabase SQL editor.
--
-- NOTE: an older match_subjects already exists in production with a different
-- return shape, so we DROP it first (CREATE OR REPLACE cannot change a
-- function's return type). Dropping is safe here — aiDb.ts is its only caller
-- and this recreates it immediately with the shape that caller expects.

drop function if exists public.match_subjects(vector(768), float, int);

create or replace function public.match_subjects(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  name text,
  description text,
  similarity float
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  return query
  select
    subjects.id,
    subjects.name,
    subjects.description,
    1 - (subjects.embedding <=> query_embedding) as similarity
  from subjects
  where subjects.embedding is not null
    and 1 - (subjects.embedding <=> query_embedding) > match_threshold
    and (subjects.created_by = current_user_id or subjects.is_global = true)
  order by subjects.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.match_subjects(vector(768), float, int) to authenticated;
