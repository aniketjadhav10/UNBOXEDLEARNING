-- ============================================================
-- fix_interest_level_type.sql
-- task_progress.interest_level is stored as TEXT, but the app always treats it
-- as a 1-5 number (aiDb writes interest_level: 3, the UI uses InterestLevel).
-- This mismatch forced `as unknown as` bridges in the typed code. Convert the
-- column to smallint with a 1-5 CHECK so app and DB agree.
--
-- Run ONCE (the type change is not re-runnable). Wrapped in a transaction.
-- After applying, regenerate the Supabase types (MCP generate_typescript_types
-- or `supabase gen types`) — interest_level becomes `number | null`, and the
-- interest_level bridges in taskService/TaskScheduleModal can be removed.
-- ============================================================
begin;

-- 1. Null out anything that isn't a clean 1-5 (defensive; app only writes 1-5).
update public.task_progress
set interest_level = null
where interest_level is not null and btrim(interest_level) !~ '^[1-5]$';

-- 2. Convert text -> smallint.
alter table public.task_progress
  alter column interest_level type smallint
  using nullif(btrim(interest_level), '')::smallint;

-- 3. Constrain to 1-5 (null = "not rated").
alter table public.task_progress
  drop constraint if exists task_progress_interest_level_check;
alter table public.task_progress
  add constraint task_progress_interest_level_check
  check (interest_level is null or interest_level between 1 and 5);

commit;
