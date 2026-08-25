// ============================================================
// server/ai/suggestTaskStage.ts — on-demand, advisory stage/pacing suggestion
// Single-record analysis (no tool-calling needed — the task_progress row is
// fetched directly). Never applied automatically: the caller only shows the
// suggestion, the parent still has to hit Save on the real edit form.
// Returns null on any failure so the UI can just hide the suggestion panel.
// ============================================================
import { generateJson } from './aiClient';
import { extractJson } from './generateSyllabus';
import { LEARNING_STAGES } from './tools/writeTools';
import type { GatewayCtx } from './gateway';

export interface StageSuggestion {
  suggestion: 'advance' | 'hold' | 'needs_practice' | 'adjust_pacing';
  suggestedStage?: string;
  suggestedRepeatInterval?: number;
  rationale: string;
}

export async function suggestStageAdjustment(
  ctx: GatewayCtx,
  taskId: string,
  childId: string,
): Promise<StageSuggestion | null> {
  try {
    const { data: task, error: taskErr } = await ctx.supabase
      .from('tasks')
      .select('id, name, description')
      .eq('id', taskId)
      .single();
    if (taskErr || !task) return null;

    const { data: progress } = await ctx.supabase
      .from('task_progress')
      .select('learning_stage, learned_count, target_count, interest_level, last_practiced_at, repeat_interval, session_count')
      .eq('task_id', taskId)
      .eq('child_id', childId)
      .maybeSingle();

    const daysSincePracticed = progress?.last_practiced_at
      ? Math.round((Date.now() - new Date(progress.last_practiced_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const prompt = `You are helping a homeschool parent decide whether to adjust one task's learning stage or practice pacing for their child.

Task: "${task.name}"${task.description ? ` — ${task.description}` : ''}
Current learning_stage: ${progress?.learning_stage ?? 'Not_Started'}
Practice progress: ${progress?.learned_count ?? 0} / ${progress?.target_count ?? 5} sessions toward the current stage
Interest level (1-5, may be unknown): ${progress?.interest_level ?? 'unknown'}
Days since last practiced: ${daysSincePracticed ?? 'never practiced'}
Current repeat interval (days between scheduled practices): ${progress?.repeat_interval ?? 1}
Total sessions logged: ${progress?.session_count ?? 0}

Valid learning_stage values: ${LEARNING_STAGES.join(', ')}.

Choose exactly one suggestion:
- "advance": progress is strong enough to move to the next stage now
- "hold": current pace and stage are appropriate, no change needed
- "needs_practice": the child is struggling or has stalled — flag it
- "adjust_pacing": keep the current stage, but the repeat interval should change (e.g. spacing out an easy task, or tightening one that's being forgotten)

Respond with ONLY this JSON object, no markdown fences, no extra commentary:
{"suggestion": "advance" | "hold" | "needs_practice" | "adjust_pacing", "suggestedStage": "<a value from the list above, include only when suggestion is advance or needs_practice>", "suggestedRepeatInterval": <integer days, include only when suggestion is adjust_pacing>, "rationale": "one short sentence a parent would understand"}`;

    const raw = await generateJson(prompt, { ctx, operation: 'suggest_task_stage' });
    const parsed = extractJson(raw);
    if (!parsed || typeof parsed.suggestion !== 'string' || typeof parsed.rationale !== 'string') return null;

    const validSuggestions = ['advance', 'hold', 'needs_practice', 'adjust_pacing'];
    if (!validSuggestions.includes(parsed.suggestion)) return null;

    return {
      suggestion: parsed.suggestion,
      suggestedStage: typeof parsed.suggestedStage === 'string' ? parsed.suggestedStage : undefined,
      suggestedRepeatInterval:
        typeof parsed.suggestedRepeatInterval === 'number' ? parsed.suggestedRepeatInterval : undefined,
      rationale: parsed.rationale,
    };
  } catch {
    return null;
  }
}
