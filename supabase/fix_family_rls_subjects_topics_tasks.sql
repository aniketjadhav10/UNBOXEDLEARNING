-- =============================================================================
-- Migration: Fix RLS policies for family-based data access
-- =============================================================================
-- Problem:  The RLS policies on subjects, topics, tasks, activities, and
--           task_progress still use `children.user_id = auth.uid()` which
--           blocks the second family member from seeing any curriculum data.
--
-- Fix:      Replace those checks with family-aware conditions:
--             children.family_id = user_family_id()  -- family members
--             OR children.user_id = auth.uid()        -- legacy / solo users
--
-- Requires: user_family_id() function (from add_family_workspace.sql)
-- Run in:   Supabase SQL Editor
-- =============================================================================

-- 1. SUBJECTS ----------------------------------------------------------------
drop policy if exists "Users manage subjects through children" on subjects;
create policy "Family members manage subjects through children"
on subjects for all
using (
  exists (
    select 1
    from children
    where children.id = subjects.child_id
      and (
        children.family_id = user_family_id()
        or children.user_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from children
    where children.id = subjects.child_id
      and (
        children.family_id = user_family_id()
        or children.user_id = auth.uid()
      )
  )
);

-- 2. TOPICS -------------------------------------------------------------------
drop policy if exists "Users manage topics through subjects" on topics;
create policy "Family members manage topics through subjects"
on topics for all
using (
  exists (
    select 1
    from subjects
    join children on children.id = subjects.child_id
    where subjects.id = topics.subject_id
      and (
        children.family_id = user_family_id()
        or children.user_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from subjects
    join children on children.id = subjects.child_id
    where subjects.id = topics.subject_id
      and (
        children.family_id = user_family_id()
        or children.user_id = auth.uid()
      )
  )
);

-- 3. TASKS --------------------------------------------------------------------
drop policy if exists "Users manage tasks through topics" on tasks;
create policy "Family members manage tasks through topics"
on tasks for all
using (
  exists (
    select 1
    from topics
    join subjects on subjects.id = topics.subject_id
    join children on children.id = subjects.child_id
    where topics.id = tasks.topic_id
      and (
        children.family_id = user_family_id()
        or children.user_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from topics
    join subjects on subjects.id = topics.subject_id
    join children on children.id = subjects.child_id
    where topics.id = tasks.topic_id
      and (
        children.family_id = user_family_id()
        or children.user_id = auth.uid()
      )
  )
);

-- 4. ACTIVITIES ---------------------------------------------------------------
drop policy if exists "Users manage activities through tasks" on activities;
create policy "Family members manage activities through tasks"
on activities for all
using (
  exists (
    select 1
    from tasks
    join topics on topics.id = tasks.topic_id
    join subjects on subjects.id = topics.subject_id
    join children on children.id = subjects.child_id
    where tasks.id = activities.task_id
      and (
        children.family_id = user_family_id()
        or children.user_id = auth.uid()
      )
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
      and (
        children.family_id = user_family_id()
        or children.user_id = auth.uid()
      )
  )
);

-- 5. TASK_PROGRESS ------------------------------------------------------------
drop policy if exists "Users manage progress through children and tasks" on task_progress;
create policy "Family members manage progress through children and tasks"
on task_progress for all
using (
  exists (
    select 1
    from children
    where children.id = task_progress.child_id
      and (
        children.family_id = user_family_id()
        or children.user_id = auth.uid()
      )
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
      and (
        children.family_id = user_family_id()
        or children.user_id = auth.uid()
      )
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
