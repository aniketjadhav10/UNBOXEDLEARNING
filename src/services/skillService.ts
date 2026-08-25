// ============================================================
// skillService — reads + mutations for the roadmap skill layer
// (skills, learning_objectives, skill_prerequisites, skill_progress).
//
// Content reads (skills/objectives/prerequisites) are RLS-scoped to the
// accessible library (own or global); skill_progress is per-child. Hot reads
// go through cachedQuery (SWR); mutations invalidate via delByPrefix so the
// roadmap re-reads. The recommend/roadmap RPCs land in M2 (roadmapService).
// ============================================================
import { supabase } from './supabase';
import { cachedQuery, delByPrefix } from './cacheService';
import { computeNextReview } from '../lib/spacedReview';
import type { Tables, Enums } from '../types/database.types';

export type Skill = Tables<'skills'>;
export type LearningObjective = Tables<'learning_objectives'>;
export type SkillProgress = Tables<'skill_progress'>;
export type LearningStage = Enums<'learning_stage'>;

/** Stages that count as "mastered" for roadmap unlocking (kept in sync with the RPCs). */
export const MASTERED_STAGES: LearningStage[] = ['Comfortable', 'Confident'];

/** A skill joined with the acting child's progress (null if never started). */
export interface SkillWithProgress extends Skill {
  progress: SkillProgress | null;
}

async function invalidate() {
  await Promise.all([delByPrefix('skills:'), delByPrefix('roadmap:')]);
}

// ── Reads ─────────────────────────────────────────────────────────────────
/** All skills under a subject, annotated with a child's progress, ordered by level→sequence. */
export async function fetchSkillsForSubject(subjectId: string, childId: string): Promise<SkillWithProgress[]> {
  return cachedQuery(`skills:subject:${subjectId}:${childId}`, async () => {
    const { data: skills, error } = await supabase
      .from('skills')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('is_active', true)
      .order('level', { ascending: true })
      .order('sequence', { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (skills ?? []).map((s) => s.id);
    const progressMap = await fetchSkillProgressMap(childId, ids);
    return (skills ?? []).map((s) => ({ ...s, progress: progressMap.get(s.id) ?? null }));
  });
}

/** Map of skill_id → progress for a child, optionally limited to a set of skills. */
async function fetchSkillProgressMap(childId: string, skillIds?: string[]): Promise<Map<string, SkillProgress>> {
  let query = supabase.from('skill_progress').select('*').eq('child_id', childId);
  if (skillIds && skillIds.length > 0) query = query.in('skill_id', skillIds);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((p) => [p.skill_id, p]));
}

/** Learning objectives for a skill, ordered. */
export async function fetchObjectives(skillId: string): Promise<LearningObjective[]> {
  return cachedQuery(`skills:objectives:${skillId}`, async () => {
    const { data, error } = await supabase
      .from('learning_objectives')
      .select('*')
      .eq('skill_id', skillId)
      .eq('is_active', true)
      .order('order_index', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
}

/** Prerequisite skill ids this skill depends on. */
export async function fetchPrerequisiteIds(skillId: string): Promise<string[]> {
  return cachedQuery(`skills:prereqs:${skillId}`, async () => {
    const { data, error } = await supabase
      .from('skill_prerequisites')
      .select('prerequisite_skill_id')
      .eq('skill_id', skillId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.prerequisite_skill_id);
  });
}

// ── Mutations ───────────────────────────────────────────────────────────────
/**
 * Record a practice attempt for a child on a skill: bump counts, recompute
 * success_rate, stamp last_practiced_at. Creates the progress row on first use.
 * Sophisticated stage/spaced-review logic is the adaptive engine's job (M4);
 * this keeps the counters honest. Pass `status` to also set the mastery stage.
 */
export async function markSkillPracticed(
  childId: string,
  skillId: string,
  opts: { success: boolean; status?: LearningStage; confidence?: number },
): Promise<void> {
  const { data: existing, error: readErr } = await supabase
    .from('skill_progress')
    .select('*')
    .eq('child_id', childId)
    .eq('skill_id', skillId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);

  const practiceCount = (existing?.practice_count ?? 0) + 1;
  const successCount = (existing?.success_count ?? 0) + (opts.success ? 1 : 0);
  const successRate = Math.round((successCount / practiceCount) * 10000) / 100; // 2dp
  const now = new Date().toISOString();

  // Spaced-review scheduling (SM-2-lite): step up on success, reset on struggle.
  const review = computeNextReview(existing?.review_interval_days ?? 0, opts.success);

  // A struggle drops the skill to Needs_Practice unless the caller set a stage.
  const derivedStatus = opts.status ?? (opts.success ? undefined : 'Needs_Practice');

  const { error } = await supabase.from('skill_progress').upsert(
    {
      child_id: childId,
      skill_id: skillId,
      practice_count: practiceCount,
      success_count: successCount,
      success_rate: successRate,
      last_practiced_at: now,
      review_interval_days: review.intervalDays,
      next_review_at: review.nextReviewAt,
      updated_at: now,
      ...(derivedStatus ? { status: derivedStatus } : {}),
      ...(opts.confidence != null ? { confidence: opts.confidence } : {}),
    },
    { onConflict: 'child_id, skill_id' },
  );
  if (error) throw new Error(error.message);
  await invalidate();
}

/** Directly set the mastery stage for a child on a skill (parent override). */
export async function setSkillStatus(childId: string, skillId: string, status: LearningStage): Promise<void> {
  const { error } = await supabase.from('skill_progress').upsert(
    { child_id: childId, skill_id: skillId, status, updated_at: new Date().toISOString() },
    { onConflict: 'child_id, skill_id' },
  );
  if (error) throw new Error(error.message);
  await invalidate();
}

/** Add a prerequisite edge (skill requires prerequisite). The DB trigger rejects cycles. */
export async function addPrerequisite(skillId: string, prerequisiteSkillId: string): Promise<void> {
  const { error } = await supabase
    .from('skill_prerequisites')
    .insert({ skill_id: skillId, prerequisite_skill_id: prerequisiteSkillId });
  if (error) throw new Error(error.message); // includes the cycle-guard message
  await invalidate();
}

/** Remove a prerequisite edge. */
export async function removePrerequisite(skillId: string, prerequisiteSkillId: string): Promise<void> {
  const { error } = await supabase
    .from('skill_prerequisites')
    .delete()
    .eq('skill_id', skillId)
    .eq('prerequisite_skill_id', prerequisiteSkillId);
  if (error) throw new Error(error.message);
  await invalidate();
}
