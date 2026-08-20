-- ============================================================
-- optimize_rls_initplan.sql
-- Fixes the 21 `auth_rls_initplan` performance warnings from the live advisor.
-- Each policy called auth.uid() (or user_family_id()) per row; wrapping the call
-- in a scalar subquery `(select auth.uid())` makes Postgres evaluate it ONCE per
-- statement. Logic is byte-for-byte equivalent — only the evaluation plan changes.
--
-- Policy definitions were read from the live pg_policies, so these recreate the
-- exact predicates. Wrapped in a transaction: no window where a policy is absent.
-- Apply in the Supabase SQL editor.
-- ============================================================
begin;

-- profiles ------------------------------------------------------------------
drop policy if exists "Users read their profile" on public.profiles;
create policy "Users read their profile" on public.profiles
  for select to public
  using ((select auth.uid()) = id);

drop policy if exists "Users create their profile" on public.profiles;
create policy "Users create their profile" on public.profiles
  for insert to public
  with check ((select auth.uid()) = id);

drop policy if exists "Users update their profile" on public.profiles;
create policy "Users update their profile" on public.profiles
  for update to public
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ai_inbox ------------------------------------------------------------------
drop policy if exists "Users manage their AI inbox" on public.ai_inbox;
create policy "Users manage their AI inbox" on public.ai_inbox
  for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ai_usage ------------------------------------------------------------------
drop policy if exists "Users insert own ai usage" on public.ai_usage;
create policy "Users insert own ai usage" on public.ai_usage
  for insert to public
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users read own ai usage" on public.ai_usage;
create policy "Users read own ai usage" on public.ai_usage
  for select to public
  using ((select auth.uid()) = user_id);

-- chat_sessions / chat_messages ---------------------------------------------
drop policy if exists "Users can manage their own chat sessions" on public.chat_sessions;
create policy "Users can manage their own chat sessions" on public.chat_sessions
  for all to public
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can manage messages in their sessions" on public.chat_messages;
create policy "Users can manage messages in their sessions" on public.chat_messages
  for all to public
  using (exists (
    select 1 from chat_sessions
    where chat_sessions.id = chat_messages.session_id
      and chat_sessions.user_id = (select auth.uid())));

-- child_subjects / child_topics ---------------------------------------------
drop policy if exists "Users manage own children's subject enrollments" on public.child_subjects;
create policy "Users manage own children's subject enrollments" on public.child_subjects
  for all to public
  using (child_id in (select children.id from children where children.user_id = (select auth.uid())));

drop policy if exists "Users manage own children's topic enrollments" on public.child_topics;
create policy "Users manage own children's topic enrollments" on public.child_topics
  for all to public
  using (child_id in (select children.id from children where children.user_id = (select auth.uid())));

-- children ------------------------------------------------------------------
drop policy if exists "Family members manage children" on public.children;
create policy "Family members manage children" on public.children
  for all to public
  using ((family_id = (select user_family_id())) or ((select auth.uid()) = user_id))
  with check ((family_id = (select user_family_id())) or ((select auth.uid()) = user_id));

-- families ------------------------------------------------------------------
drop policy if exists "Authenticated users create families" on public.families;
create policy "Authenticated users create families" on public.families
  for insert to authenticated
  with check (created_by = (select auth.uid()));

-- family_members ------------------------------------------------------------
drop policy if exists "Users create their owner membership" on public.family_members;
create policy "Users create their owner membership" on public.family_members
  for insert to public
  with check (user_id = (select auth.uid()));

-- subjects ------------------------------------------------------------------
drop policy if exists "Authors manage their own subjects" on public.subjects;
create policy "Authors manage their own subjects" on public.subjects
  for all to public
  using ((created_by = (select auth.uid())) or (is_global = true));

-- topics --------------------------------------------------------------------
drop policy if exists "Topics accessible if subject accessible" on public.topics;
create policy "Topics accessible if subject accessible" on public.topics
  for all to public
  using (subject_id in (
    select subjects.id from subjects
    where (subjects.created_by = (select auth.uid())) or (subjects.is_global = true)));

-- tasks ---------------------------------------------------------------------
drop policy if exists "Tasks accessible if topic accessible" on public.tasks;
create policy "Tasks accessible if topic accessible" on public.tasks
  for all to public
  using (topic_id in (
    select t.id from topics t
    join subjects s on s.id = t.subject_id
    where (s.created_by = (select auth.uid())) or (s.is_global = true)));

-- activities ----------------------------------------------------------------
drop policy if exists "Activities accessible if task accessible" on public.activities;
create policy "Activities accessible if task accessible" on public.activities
  for all to public
  using (task_id in (
    select tk.id from tasks tk
    join topics t on t.id = tk.topic_id
    join subjects s on s.id = t.subject_id
    where (s.created_by = (select auth.uid())) or (s.is_global = true)));

-- task_progress -------------------------------------------------------------
drop policy if exists "Users manage task progress for their own children" on public.task_progress;
create policy "Users manage task progress for their own children" on public.task_progress
  for all to public
  using (child_id in (select children.id from children where children.user_id = (select auth.uid())));

-- sync_queue ----------------------------------------------------------------
drop policy if exists "Users manage their sync queue" on public.sync_queue;
create policy "Users manage their sync queue" on public.sync_queue
  for all to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- user_memories -------------------------------------------------------------
drop policy if exists "Users can manage their own memories" on public.user_memories;
create policy "Users can manage their own memories" on public.user_memories
  for all to public
  using ((select auth.uid()) = user_id);

commit;
