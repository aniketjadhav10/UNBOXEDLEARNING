-- Additive metadata for the AI-ranked weekly planner (server/ai/agents/plannerAgent.ts).
-- rationale: short per-session explanation from the AI ranking, null when rules-based.
-- generation_method: lets the admin UI / debugging tell whether a given week's plan
-- was AI-arranged or fell back to the deterministic rules-based selection.
alter table public.scheduled_sessions add column if not exists rationale text;

alter table public.lesson_plans add column if not exists generation_method text not null default 'rules'
  check (generation_method in ('rules', 'ai'));
