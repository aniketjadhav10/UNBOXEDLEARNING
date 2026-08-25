# Schema Reconciliation Checklist

The live Supabase database has drifted far from the tracked SQL: whole tables and
dozens of columns were created in the dashboard and never captured in a migration.
This checklist gets the schema back under version control and fixes the known gaps.

Work top to bottom. Steps 1–2 are safe/read-only; Step 3 changes data — review first.

---

## Step 1 — Capture a baseline (do this first)

Pick one:

- **Supabase CLI** (recommended):
  ```bash
  supabase link --project-ref <your-ref>
  bash supabase/scripts/dump-baseline.sh cli
  ```
- **pg_dump** (needs the DB password from Dashboard → Settings → Database):
  ```bash
  export DB_URL="postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres"
  bash supabase/scripts/dump-baseline.sh pgdump
  ```
  PowerShell equivalent:
  ```powershell
  $env:DB_URL = "postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres"
  pg_dump --schema-only --no-owner --no-privileges --schema=public $env:DB_URL > supabase/schema_baseline.sql
  ```
- **No tooling:** run `supabase/scripts/introspect.sql` in the SQL editor and save the output.

- [ ] `supabase/schema_baseline.sql` produced and committed
- [ ] Confirm `schema.sql` header is updated to say it is historical, not authoritative

## Step 2 — Verify the known drift (check each against the baseline)

Tables the **code uses** but no migration defines — confirm they exist and are captured:
- [ ] `child_subjects` (child↔subject enrollment)
- [ ] `child_topics` (child↔topic enrollment)
- [ ] `user_memories` (+ `embedding vector(768)`)
- [ ] `chat_sessions`, `chat_messages`
- [ ] `email_logs`
- [ ] `family_invitations`

Columns the **code writes** but no migration adds — confirm they exist:
- [ ] `subjects`: `created_by`, `is_global`, `embedding` (and whether `child_id` still exists)
- [ ] `topics`: `learning_objectives`, `estimated_hours`, `bloom_level`, `keywords`, `embedding`
- [ ] `tasks`: `task_type`, `instructions`, `parent_guide`, `materials_needed`, `estimated_minutes`, `learning_objective`, `assessment_criteria`, `resources`, `embedding`
- [ ] `task_progress`: `notes`, `session_count`, `parent_rating`
- [ ] `activities`: `activity_type`, `instructions`, `materials`

## Step 3 — Fix the integrity issues found

- [ ] **`task_progress.interest_level` type mismatch** — `schema.sql` declares it `text`, but the
      code writes a number (`interest_level: 3`). Pick one and migrate. Recommended:
      `smallint` constrained 1–5. Backfill/cast existing rows before altering.
- [ ] **RLS on the uncaptured tables** — verify RLS is enabled and correctly scoped for
      `child_subjects`, `child_topics`, `user_memories`, `chat_sessions`, `chat_messages`,
      `email_logs`, `family_invitations`. Query 4 in `introspect.sql` lists any table with
      `rls_enabled = false` — treat each as a data-exposure risk.
- [ ] **`email_logs` exposure** — it is written by cron (service-role). Confirm it is
      admin-read-only, not readable by ordinary users.
- [ ] **Stale `subjects.unique(child_id, name)`** — conflicts with the global/enrollment model.
      Confirm it was dropped live (or drop it).
- [ ] **`updated_at` triggers + indexes** — the dashboard-created tables likely lack the
      `set_updated_at` trigger and FK indexes the base tables have. Add where missing.

## Step 4 — Stop the drift going forward

- [ ] Adopt ordered migrations (`supabase/migrations/`) via the Supabase CLI; make the
      baseline the `0000_baseline.sql`.
- [ ] **No more schema edits in the dashboard** — every change lands as a migration file in a PR.
- [ ] Retire the ad-hoc `fix_*` / `add_*` SQL files once folded into the baseline.

---

### After this
With a trustworthy baseline captured, the feature tables from the DB analysis
(scheduling → assessment → learning-log/attendance) can be added as clean, ordered
migrations. Paste the baseline (or `introspect.sql` output) back and it can be reviewed
against the code for an exact gap list.
