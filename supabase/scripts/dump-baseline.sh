#!/usr/bin/env bash
# ============================================================
# dump-baseline.sh — capture the LIVE Supabase schema as a
# version-controlled baseline (supabase/schema_baseline.sql).
#
# The live DB has drifted far from schema.sql (whole tables and
# dozens of columns were created in the dashboard, never tracked).
# This produces a single source-of-truth snapshot to commit.
#
# Usage — pick ONE mode:
#
#   A) Supabase CLI (recommended — cleanest output):
#        supabase link --project-ref <your-ref>
#        bash supabase/scripts/dump-baseline.sh cli
#
#   B) pg_dump (needs the DB password from
#      Supabase Dashboard -> Settings -> Database -> Connection string):
#        export DB_URL="postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres"
#        bash supabase/scripts/dump-baseline.sh pgdump
#
# Do NOT paste the password on the command line or commit it.
# ============================================================
set -euo pipefail

OUT="supabase/schema_baseline.sql"
MODE="${1:-cli}"

case "$MODE" in
  cli)
    command -v supabase >/dev/null || { echo "Supabase CLI not found. Install it or use 'pgdump' mode."; exit 1; }
    supabase db dump --schema public -f "$OUT"
    ;;
  pgdump)
    command -v pg_dump >/dev/null || { echo "pg_dump not found (install postgresql-client)."; exit 1; }
    : "${DB_URL:?Set DB_URL to your Supabase Postgres connection string}"
    pg_dump --schema-only --no-owner --no-privileges --schema=public "$DB_URL" > "$OUT"
    ;;
  *)
    echo "Unknown mode '$MODE'. Use 'cli' or 'pgdump'."; exit 1 ;;
esac

echo "✅ Wrote $OUT — review it, then commit as the schema baseline."
