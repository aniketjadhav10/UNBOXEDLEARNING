-- ============================================================
-- add_skill_embeddings_and_match.sql
-- Roadmap architecture M3 — semantic de-dup for the skill layer, so AI
-- generation reuses existing skills instead of duplicating them (same pattern
-- as match_tasks / match_topics). The skills.embedding column ships in
-- add_skills_layer.sql; this adds the ANN index and the search RPC.
--
-- Param name topic_id_filter matches how server/ai/aiDb.ts calls the live
-- match_* functions. SECURITY DEFINER + grant to authenticated mirrors the
-- other match_* RPCs (server-side generation use). Idempotent. Apply in the
-- Supabase SQL editor after add_skills_layer.sql.
-- ============================================================

create index if not exists skills_embedding_idx
  on public.skills using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function public.match_skills(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  topic_id_filter uuid default null
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
begin
  return query
  select
    skills.id,
    skills.name,
    skills.description,
    1 - (skills.embedding <=> query_embedding) as similarity
  from skills
  where skills.embedding is not null
    and 1 - (skills.embedding <=> query_embedding) > match_threshold
    and (topic_id_filter is null or skills.topic_id = topic_id_filter)
  order by skills.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.match_skills(vector(768), float, int, uuid) to authenticated;
