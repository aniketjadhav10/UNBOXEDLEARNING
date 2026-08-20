-- SQL Migration: capture pgvector embedding columns in version control
-- ---------------------------------------------------------------------------
-- These columns exist in production (server/ai/aiDb.ts writes to them and the
-- match_* RPCs read them) but were never captured in a tracked migration, so a
-- fresh Supabase project would be missing them. This file is fully idempotent:
-- `add column if not exists` is a no-op when the column already exists and never
-- alters an existing column's type. Safe to run against production.
-- Apply in the Supabase SQL editor.

create extension if not exists vector;

alter table subjects      add column if not exists embedding vector(768);
alter table topics        add column if not exists embedding vector(768);
alter table tasks         add column if not exists embedding vector(768);
alter table user_memories add column if not exists embedding vector(768);

-- Approximate-nearest-neighbour indexes (cosine). Optional but recommended once
-- each table holds enough rows; harmless on small tables.
create index if not exists subjects_embedding_idx
  on subjects using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists topics_embedding_idx
  on topics using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists tasks_embedding_idx
  on tasks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists user_memories_embedding_idx
  on user_memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);
