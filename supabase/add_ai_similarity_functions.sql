-- SQL Migration: AI Similarity Functions for RAG
-- This file creates the necessary RPCs for pgvector cosine similarity search.

-- 1. Match Tasks
create or replace function public.match_tasks(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_topic_id uuid default null
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
    tasks.id,
    tasks.name,
    tasks.description,
    1 - (tasks.embedding <=> query_embedding) as similarity
  from tasks
  where 1 - (tasks.embedding <=> query_embedding) > match_threshold
    and (p_topic_id is null or tasks.topic_id = p_topic_id)
  order by tasks.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.match_tasks(vector(768), float, int, uuid) to authenticated;

-- 2. Match Topics
create or replace function public.match_topics(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_subject_id uuid default null
)
returns table (
  id uuid,
  title text,
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
    topics.id,
    topics.title,
    topics.description,
    1 - (topics.embedding <=> query_embedding) as similarity
  from topics
  where 1 - (topics.embedding <=> query_embedding) > match_threshold
    and (p_subject_id is null or topics.subject_id = p_subject_id)
  order by topics.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.match_topics(vector(768), float, int, uuid) to authenticated;

-- 3. Match User Memories
create or replace function public.match_user_memories(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
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
    user_memories.id,
    user_memories.content,
    1 - (user_memories.embedding <=> query_embedding) as similarity
  from user_memories
  where 1 - (user_memories.embedding <=> query_embedding) > match_threshold
    and user_memories.user_id = current_user_id
  order by user_memories.embedding <=> query_embedding
  limit match_count;
end;
$$;

grant execute on function public.match_user_memories(vector(768), float, int) to authenticated;
