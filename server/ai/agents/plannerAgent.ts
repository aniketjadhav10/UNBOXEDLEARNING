// ============================================================
// server/ai/agents/plannerAgent.ts — ranks/arranges the weekly candidate pool
// Grounded: the model only ranks skill_ids returned by get_weekly_candidate_pool
// (server/ai/tools/plannerTools.ts) — it never invents a skill. Falls back to
// null on any failure so callers (server/planner.ts) can use the existing
// rules-based selection instead; the planner must never fail to produce a plan
// because AI is unavailable.
// ============================================================
import { MODEL_NAME } from '../aiClient';
import { runToolLoop } from '../tools/agentLoop';
import { toGeminiFunctionDeclarations } from '../tools/gemini';
import { plannerTools } from '../tools/plannerTools';
import { extractJson } from '../generateSyllabus';
import type { GatewayCtx } from '../gateway';

export interface RankedPlanItem {
  skill_id: string;
  name: string;
  kind: 'review' | 'new';
  /** 0 = Monday .. 4 = Friday */
  day_offset: number;
  rationale?: string;
}

const SYSTEM_INSTRUCTION = `You are a weekly homeschool planning assistant. Your job is to arrange one child's learning plan for the coming Mon-Fri week.

Call the "get_weekly_candidate_pool" tool exactly once to fetch the eligible skills for this child. You MUST only use skill_id values returned by that tool — never invent one.

Then decide, for each candidate you choose to include (up to 8):
- day_offset: which weekday to schedule it (0=Monday .. 4=Friday), spreading subjects across the week rather than clustering one subject on one day
- Prioritize "review" kind candidates (they're due) and higher interest_signal, but don't ignore "new" candidates entirely
- Balance across different subject_id/development_domain values where possible so no single day is one subject only

Respond with ONLY a JSON object of the exact shape (no markdown, no commentary):
{"items": [{"skill_id": "...", "name": "...", "kind": "review"|"new", "day_offset": 0, "rationale": "one short sentence"}]}`;

/**
 * Ranks and arranges a child's weekly plan using the candidate pool the
 * existing rules-based query already gathers. Returns null on any failure
 * (missing key, rate limit, unparseable response) — the caller falls back
 * to the deterministic selectSkillsForChild() + Mon-Fri spread.
 */
export async function rankWeeklyPlan(
  ctx: GatewayCtx,
  childId: string,
  weekStart: string,
  nowIso: string,
): Promise<RankedPlanItem[] | null> {
  try {
    const contents = [
      {
        role: 'user',
        parts: [{ text: `Plan the week starting ${weekStart} for child_id "${childId}". The current time is ${nowIso}.` }],
      },
    ];
    const config = {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations: toGeminiFunctionDeclarations(plannerTools) }],
    };

    const { text } = await runToolLoop(ctx, {
      model: MODEL_NAME,
      contents,
      config,
      operation: 'weekly_planner_rank',
      maxRounds: 3,
    });

    const parsed = extractJson(text);
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : null;
    if (!rawItems) return null;

    const items: RankedPlanItem[] = rawItems
      .filter((it: unknown): it is Record<string, unknown> => {
        const rec = it as Record<string, unknown>;
        return !!rec && typeof rec.skill_id === 'string' && typeof rec.day_offset === 'number';
      })
      .map((it: Record<string, unknown>) => ({
        skill_id: it.skill_id as string,
        name: typeof it.name === 'string' ? it.name : 'Skill',
        kind: it.kind === 'review' ? 'review' : 'new',
        day_offset: Math.min(4, Math.max(0, Math.round(it.day_offset as number))),
        rationale: typeof it.rationale === 'string' ? it.rationale : undefined,
      }))
      .slice(0, 8);

    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}
