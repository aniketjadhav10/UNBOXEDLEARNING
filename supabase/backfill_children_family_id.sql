-- =============================================================================
-- Migration: Backfill children.family_id from the creator's profile
-- =============================================================================
-- Problem:  Children created via the new UI (dataService.ts / KidsPage) only
--           set user_id and never set family_id, leaving it NULL. The RLS
--           policies check children.family_id = user_family_id(), which fails
--           when family_id is NULL because NULL = anything is always false.
--
-- Fix:      Backfill children.family_id from the creator's profiles.family_id,
--           so existing children get linked to the family workspace.
--
-- Run in:   Supabase SQL Editor (AFTER fix_family_rls_subjects_topics_tasks.sql)
-- =============================================================================

-- Backfill: copy family_id from the child creator's profile
update children
set family_id = profiles.family_id
from profiles
where children.user_id = profiles.id
  and children.family_id is null
  and profiles.family_id is not null;
