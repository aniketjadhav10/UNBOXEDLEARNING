-- ============================================================
-- introspect.sql — live-schema snapshot with NO local tooling.
-- Run each query in the Supabase SQL editor and copy the output
-- back (or export CSV). This is the fallback when you don't have
-- the Supabase CLI or pg_dump handy. Read-only; safe to run.
-- ============================================================

-- 1) Tables and columns (types, nullability, defaults)
select table_name, ordinal_position, column_name, data_type,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- 2) Primary keys, foreign keys, unique constraints
select tc.table_name, tc.constraint_type, kcu.column_name,
       ccu.table_name  as references_table,
       ccu.column_name as references_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
     on kcu.constraint_name = tc.constraint_name and kcu.table_schema = 'public'
left join information_schema.constraint_column_usage ccu
     on ccu.constraint_name = tc.constraint_name and ccu.table_schema = 'public'
where tc.table_schema = 'public'
  and tc.constraint_type in ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
order by tc.table_name, tc.constraint_type;

-- 3) Indexes
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 4) RLS enabled? (any table with false is a data-exposure risk)
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
order by c.relname;

-- 5) RLS policies (who can do what)
select tablename, policyname, cmd, qual as using_expr, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 6) Functions / RPCs
select routine_name, data_type as returns, external_language
from information_schema.routines
where routine_schema = 'public'
order by routine_name;

-- 7) Enum types and their values
select t.typname as enum_type, e.enumlabel as value
from pg_enum e
join pg_type t on t.oid = e.enumtypid
order by t.typname, e.enumsortorder;

-- 8) Triggers (e.g. updated_at)
select event_object_table as table_name, trigger_name,
       action_timing, event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name;
