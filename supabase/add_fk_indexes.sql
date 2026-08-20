-- ============================================================
-- add_fk_indexes.sql
-- Adds covering indexes for the 8 unindexed foreign keys flagged by the live
-- performance advisor. Foreign keys without a covering index make joins and
-- cascade deletes slower. All are safe, additive, and idempotent.
-- Apply in the Supabase SQL editor.
-- ============================================================

create index if not exists chat_messages_session_id_idx
  on public.chat_messages (session_id);

create index if not exists chat_sessions_user_id_idx
  on public.chat_sessions (user_id);

create index if not exists child_subjects_subject_id_idx
  on public.child_subjects (subject_id);

create index if not exists child_topics_topic_id_idx
  on public.child_topics (topic_id);

create index if not exists families_created_by_idx
  on public.families (created_by);

create index if not exists family_invitations_created_by_idx
  on public.family_invitations (created_by);

create index if not exists subjects_created_by_idx
  on public.subjects (created_by);

create index if not exists user_memories_user_id_idx
  on public.user_memories (user_id);
