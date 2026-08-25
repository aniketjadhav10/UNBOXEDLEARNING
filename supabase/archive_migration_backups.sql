-- ============================================================
-- archive_migration_backups.sql
-- Clears the remaining advisor notices for the 5 _migration_backup_* tables
-- WITHOUT destroying data. Instead of DROP, it moves them into an `archive`
-- schema: PostgREST only exposes `public`, so this removes them from the API
-- (clearing rls_enabled_no_policy + no_primary_key) and is fully reversible.
--
-- These backups currently hold MORE rows than the live tables (e.g. ~1080
-- topics vs 17 live), so preserving them is the safe default.
--
-- LATER — once you have confirmed you never need this pre-migration data,
-- permanently remove it with:
--     drop schema archive cascade;
--
-- Apply in the Supabase SQL editor.
-- ============================================================
begin;

create schema if not exists archive;

alter table if exists public._migration_backup_subjects       set schema archive;
alter table if exists public._migration_backup_topics         set schema archive;
alter table if exists public._migration_backup_tasks          set schema archive;
alter table if exists public._migration_backup_activities     set schema archive;
alter table if exists public._migration_backup_task_progress  set schema archive;

commit;
