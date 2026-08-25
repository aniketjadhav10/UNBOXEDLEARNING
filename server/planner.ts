// ============================================================
// planner — roadmap-driven weekly plan generation, shared by the Monday cron
// and the admin "Generate Weekly Plan" button. Works with any Supabase client
// (service-role for the cron, RLS user client for the admin action).
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import { rankWeeklyPlan } from './ai/agents/plannerAgent';
import type { GatewayCtx } from './ai/gateway';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PlanItem { skill_id: string; name: string; kind: 'review' | 'new'; day_offset?: number; rationale?: string; }

/** ISO date (YYYY-MM-DD) of the Monday of the week containing `d` (UTC). */
export function mondayOf(d: Date): string {
  const date = new Date(d);
  const day = date.getUTCDay(); // 0=Sun … 6=Sat
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().split('T')[0];
}

export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

/**
 * Pick the week's skills for a child from the roadmap:
 *   1) spaced-review skills that are due (next_review_at ≤ now), soonest first
 *   2) recommended-next skills (all prerequisites mastered)
 * Deduped, capped at 8.
 */
export async function selectSkillsForChild(
  supabase: SupabaseClient,
  childId: string,
  nowIso: string,
): Promise<PlanItem[]> {
  const items: PlanItem[] = [];

  const { data: reviews } = await supabase
    .from('skill_progress')
    .select('skill_id, next_review_at, skills(name)')
    .eq('child_id', childId)
    .eq('is_active', true)
    .not('next_review_at', 'is', null)
    .lte('next_review_at', nowIso)
    .order('next_review_at', { ascending: true })
    .limit(5);

  for (const r of (reviews ?? []) as any[]) {
    if (r.skill_id) items.push({ skill_id: r.skill_id, name: r.skills?.name ?? 'Skill', kind: 'review' });
  }

  const { data: recommended } = await supabase.rpc('recommend_next_skills', {
    p_child_id: childId,
    p_limit: 8,
  });

  for (const s of (recommended ?? []) as any[]) {
    if (s.id && !items.some((i) => i.skill_id === s.id)) {
      items.push({ skill_id: s.id, name: s.name, kind: 'new' });
    }
  }

  return items.slice(0, 8);
}

/**
 * Build (and persist) a child's weekly plan. Idempotent by default: if a plan
 * for (child, week) already exists it is left untouched. Pass `replace: true`
 * (the admin button) to rebuild it — the old plan's sessions cascade-delete.
 *
 * By default (`useAi: true`), an LLM ranks and arranges the same candidate
 * pool `selectSkillsForChild()` would gather (see plannerAgent.ts) — it only
 * ever chooses from that pool, never invents a skill. On any AI failure
 * (missing key, rate limit, bad response) this falls back to the plain
 * rules-based selection/spread, so a plan always gets produced either way.
 *
 * Pass `dryRun: true` to run the full selection/ranking and return the
 * proposed items without writing `lesson_plans`/`scheduled_sessions` — the
 * admin "Generate Weekly Plan" button uses this to preview before committing
 * (a second call without `dryRun` is the commit step).
 */
export async function generateWeeklyPlan(
  supabase: SupabaseClient,
  child: { id: string; user_id: string | null },
  weekStart: string,
  nowIso: string,
  opts?: { replace?: boolean; useAi?: boolean; dryRun?: boolean },
): Promise<{ items: PlanItem[]; created: boolean; generationMethod?: 'rules' | 'ai' }> {
  const { data: existing } = await supabase
    .from('lesson_plans')
    .select('id')
    .eq('child_id', child.id)
    .eq('week_start_date', weekStart)
    .limit(1);

  if (existing && existing.length > 0 && !opts?.dryRun) {
    if (!opts?.replace) return { items: [], created: false };
    // Rebuild: remove the current week's plan (sessions cascade on plan delete).
    await supabase.from('lesson_plans').delete().eq('child_id', child.id).eq('week_start_date', weekStart);
  }

  let items: PlanItem[] = [];
  let generationMethod: 'rules' | 'ai' = 'rules';

  if ((opts?.useAi ?? true) && child.user_id) {
    const ctx: GatewayCtx = { supabase, userId: child.user_id };
    const ranked = await rankWeeklyPlan(ctx, child.id, weekStart, nowIso);
    if (ranked && ranked.length > 0) {
      items = ranked;
      generationMethod = 'ai';
    }
  }

  if (items.length === 0) {
    items = await selectSkillsForChild(supabase, child.id, nowIso);
    generationMethod = 'rules';
  }

  if (items.length === 0) return { items: [], created: false };

  if (opts?.dryRun) {
    return { items, created: false, generationMethod };
  }

  const { data: plan, error: planErr } = await supabase
    .from('lesson_plans')
    .insert({
      child_id: child.id,
      title: `Week of ${weekStart}`,
      week_start_date: weekStart,
      status: 'active',
      created_by: child.user_id,
      generation_method: generationMethod,
    })
    .select('id')
    .single();
  if (planErr || !plan) return { items: [], created: false };

  const sessions = items.map((it, i) => ({
    plan_id: plan.id,
    child_id: child.id,
    skill_id: it.skill_id,
    scheduled_date: addDays(weekStart, it.day_offset ?? i % 5), // AI-ranked day, else spread Mon–Fri
    status: 'planned',
    notes: it.kind, // 'review' | 'new' — badge in the UI
    rationale: it.rationale ?? null,
    created_by: child.user_id,
  }));
  await supabase.from('scheduled_sessions').insert(sessions);

  return { items, created: true, generationMethod };
}
