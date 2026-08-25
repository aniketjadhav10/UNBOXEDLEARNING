// ============================================================
// server/ai/tools/plannerTools.ts — read tool feeding the weekly-planner agent
// Wraps the same candidate-gathering logic as server/planner.ts's
// selectSkillsForChild(), but returns richer per-candidate context (subject,
// topic, domain, a best-effort interest signal) so the agent can rank and
// arrange the week — it never invents a skill_id outside this pool.
// ============================================================
import { z } from 'zod';
import type { ToolDef } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Candidate {
  skill_id: string;
  name: string;
  kind: 'review' | 'new';
  subject_id: string | null;
  topic_id: string | null;
  development_domain: string | null;
  next_review_at: string | null;
  reason: string | null;
}

const getWeeklyCandidatePool: ToolDef = {
  name: 'get_weekly_candidate_pool',
  description:
    "Get the pool of skills eligible for a child's upcoming weekly plan: spaced-review skills that are due, plus recommended-next skills whose prerequisites are already mastered. Each candidate includes subject/topic/domain context and a best-effort interest_signal (0-5, may be null) so you can balance and prioritize the week. Only choose skill_id values from this pool — never invent one.",
  inputSchema: { child_id: z.string().uuid() },
  readOnly: true,
  async handler(args, { supabase }) {
    const childId = args.child_id as string;
    const nowIso = new Date().toISOString();

    const { data: reviews } = await supabase
      .from('skill_progress')
      .select('skill_id, next_review_at, skills(name, subject_id, topic_id, development_domain)')
      .eq('child_id', childId)
      .eq('is_active', true)
      .not('next_review_at', 'is', null)
      .lte('next_review_at', nowIso)
      .order('next_review_at', { ascending: true })
      .limit(5);

    const candidates: Candidate[] = [];
    for (const r of (reviews ?? []) as any[]) {
      const s = r.skills;
      if (!r.skill_id || !s) continue;
      candidates.push({
        skill_id: r.skill_id,
        name: s.name,
        kind: 'review',
        subject_id: s.subject_id ?? null,
        topic_id: s.topic_id ?? null,
        development_domain: s.development_domain ?? null,
        next_review_at: r.next_review_at,
        reason: 'Due for spaced review',
      });
    }

    const { data: recommended } = await supabase.rpc('recommend_next_skills', {
      p_child_id: childId,
      p_limit: 8,
    });
    for (const s of (recommended ?? []) as any[]) {
      if (s.id && !candidates.some((c) => c.skill_id === s.id)) {
        candidates.push({
          skill_id: s.id,
          name: s.name,
          kind: 'new',
          subject_id: s.subject_id ?? null,
          topic_id: s.topic_id ?? null,
          development_domain: s.development_domain ?? null,
          next_review_at: null,
          reason: s.reason ?? null,
        });
      }
    }

    const capped = candidates.slice(0, 8);

    // Best-effort interest signal: interest lives on task_progress, not
    // skill_progress, so approximate per-skill interest by averaging
    // interest_level across tasks under the same topic.
    const topicIds = [...new Set(capped.map((c) => c.topic_id).filter((id): id is string => !!id))];
    const interestByTopic = new Map<string, number>();
    if (topicIds.length > 0) {
      const { data: topicTasks } = await supabase.from('tasks').select('id, topic_id').in('topic_id', topicIds);
      const taskIds = (topicTasks ?? []).map((t: any) => t.id);
      const taskTopicById = new Map((topicTasks ?? []).map((t: any) => [t.id, t.topic_id]));

      if (taskIds.length > 0) {
        const { data: progressRows } = await supabase
          .from('task_progress')
          .select('task_id, interest_level')
          .eq('child_id', childId)
          .in('task_id', taskIds);

        const sums = new Map<string, { total: number; count: number }>();
        for (const row of (progressRows ?? []) as any[]) {
          const topicId = taskTopicById.get(row.task_id);
          const level = row.interest_level;
          if (!topicId || typeof level !== 'number') continue;
          const agg = sums.get(topicId) ?? { total: 0, count: 0 };
          agg.total += level;
          agg.count += 1;
          sums.set(topicId, agg);
        }
        for (const [topicId, agg] of sums) {
          interestByTopic.set(topicId, Math.round((agg.total / agg.count) * 10) / 10);
        }
      }
    }

    return capped.map((c) => ({
      ...c,
      interest_signal: c.topic_id ? interestByTopic.get(c.topic_id) ?? null : null,
    }));
  },
};

export const plannerTools: ToolDef[] = [getWeeklyCandidatePool];
