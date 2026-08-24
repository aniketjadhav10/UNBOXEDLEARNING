// ============================================================
// roadmapService — the "Learning GPS" reads, backed by the M2 RPCs
// (recommend_next_skills, get_skill_roadmap). RLS-scoped per caller.
// Cached (SWR) under the `roadmap:` prefix; skillService mutations invalidate
// that prefix so the roadmap re-reads after progress changes.
// ============================================================
import { supabase } from './supabase';
import { cachedQuery } from './cacheService';
import type { Enums } from '../types/database.types';

export type RoadmapBucket = 'completed' | 'current' | 'next' | 'locked';

/** A skill the child is ready to learn next (all prerequisites mastered). */
export interface NextSkill {
  id: string;
  name: string;
  description: string | null;
  level: number;
  sequence: number;
  subject_id: string;
  topic_id: string;
  development_domain: string;
  reason: string;
}

/** One node of a subject's skill graph, bucketed for the acting child. */
export interface RoadmapNode {
  id: string;
  name: string;
  description: string | null;
  level: number;
  sequence: number;
  topic_id: string;
  development_domain: string;
  status: Enums<'learning_stage'>;
  bucket: RoadmapBucket;
  prerequisite_ids: string[];
  practice_count: number;
  last_practiced_at: string | null;
  started_at: string | null;
}

/** Skills the child should tackle next, best first. */
export async function fetchRecommendedSkills(
  childId: string,
  subjectId?: string,
  limit = 10,
): Promise<NextSkill[]> {
  return cachedQuery(`roadmap:next:${childId}:${subjectId ?? 'all'}:${limit}`, async () => {
    const { data, error } = await supabase.rpc('recommend_next_skills', {
      p_child_id: childId,
      ...(subjectId ? { p_subject_id: subjectId } : {}),
      p_limit: limit,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as NextSkill[];
  });
}

/** Per-domain mastery for a child (powers the skill-gap radar). */
export interface DomainMastery {
  development_domain: string;
  total_skills: number;
  mastered_skills: number;
  in_progress_skills: number;
  mastery_pct: number;
}

export async function fetchDomainMastery(childId: string): Promise<DomainMastery[]> {
  return cachedQuery(`roadmap:domains:${childId}`, async () => {
    const { data, error } = await supabase.rpc('get_domain_mastery', { p_child_id: childId });
    if (error) throw new Error(error.message);
    return (data ?? []) as DomainMastery[];
  });
}

/** The full skill graph for a subject, bucketed per child. */
export async function fetchRoadmap(childId: string, subjectId: string): Promise<RoadmapNode[]> {
  return cachedQuery(`roadmap:tree:${childId}:${subjectId}`, async () => {
    const { data, error } = await supabase.rpc('get_skill_roadmap', {
      p_child_id: childId,
      p_subject_id: subjectId,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as RoadmapNode[];
  });
}
