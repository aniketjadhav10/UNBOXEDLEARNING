/**
 * persistSyllabusDraft — writes an assembled curriculum draft (subject → topics →
 * skills → objectives/prerequisites → tasks → activities) to the DB using the
 * shared find-or-create + embedding-dedup helpers.
 *
 * Both paths share this: the generator can persist immediately, or return the
 * draft for parent review and commit it afterwards (review-before-save). The
 * draft is intentionally loosely typed — it comes from the Director/SME JSON.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  findOrCreateSubject,
  findOrCreateTopic,
  findOrCreateSkill,
  findOrCreateTask,
  syncActivities,
  syncLearningObjectives,
  syncSkillPrerequisites,
  insertSkillProgress,
  insertTaskProgress,
  enrollChildInSubject,
  enrollChildInTopic,
} from './aiDb';
import type { MergeAction } from './aiDb';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SyllabusDraft {
  subject: { name: string; description: string; development_domain?: string };
  topics: any[];
}

export interface PersistOptions {
  childId: string | null;
  isGlobal: boolean;
  userId: string;
}

interface ActionSummary { created: number; merged: number; unchanged: number; }
function emptySummary(): ActionSummary { return { created: 0, merged: 0, unchanged: 0 }; }
function tally(s: ActionSummary, a: MergeAction) { s[a]++; }

export interface PersistResult {
  subjectId: string;
  summary: { subjects: ActionSummary; topics: ActionSummary; tasks: ActionSummary; skills: ActionSummary };
}

/** Normalize a topic's skills; synthesize one skill from the topic if the model
 *  returned tasks directly (older shape) so tasks always attach to a skill. */
function skillsForTopic(t: any): any[] {
  if (Array.isArray(t.skills) && t.skills.length > 0) return t.skills;
  return [{
    name: t.title,
    description: t.description || '',
    level: 1,
    difficulty: t.difficulty_level || 'Beginner',
    learning_objectives: t.learning_objectives || [],
    prerequisites: [],
    tasks: t.tasks || [],
  }];
}

export async function persistSyllabusDraft(
  supabase: SupabaseClient,
  draft: SyllabusDraft,
  opts: PersistOptions,
): Promise<PersistResult> {
  const { childId, isGlobal, userId } = opts;
  const subjectSummary = emptySummary();
  const topicSummary   = emptySummary();
  const taskSummary    = emptySummary();
  const skillSummary   = emptySummary();

  // Skill graph state — resolve prerequisite names → ids once every skill exists.
  const skillNameToId = new Map<string, string>();
  const pendingPrereqs: Array<{ skillId: string; prereqNames: string[] }> = [];

  const subjectResult = await findOrCreateSubject(supabase, {
    name: draft.subject.name,
    description: draft.subject.description,
    childId,
    userId,
    is_global: isGlobal,
    developmentDomain: draft.subject.development_domain,
  });
  tally(subjectSummary, subjectResult.action);
  const subjectId = subjectResult.id;
  if (childId) await enrollChildInSubject(supabase, childId, subjectId);

  let topicOrder = 0;
  for (const t of draft.topics) {
    const topicResult = await findOrCreateTopic(supabase, {
      subjectId,
      title: t.title,
      description: t.description || '',
      difficultyLevel: t.difficulty_level || 'Beginner',
      ageGroup: t.age_group != null ? String(t.age_group) : '',
      orderIndex: topicOrder++,
      learningObjectives: t.learning_objectives || [],
      estimatedHours: t.estimated_hours || 1,
      bloomLevel: t.bloom_level || 'Apply',
      keywords: t.keywords || [],
    });
    tally(topicSummary, topicResult.action);
    if (childId) await enrollChildInTopic(supabase, childId, topicResult.id);

    let skillOrder = 0;
    for (const skill of skillsForTopic(t)) {
      const skillResult = await findOrCreateSkill(supabase, {
        topicId: topicResult.id,
        subjectId,
        name: skill.name,
        description: skill.description || '',
        level: Number(skill.level) || (skillOrder + 1),
        difficulty: skill.difficulty || t.difficulty_level || 'Beginner',
        ageMin: skill.age_min != null ? Number(skill.age_min) : undefined,
        ageMax: skill.age_max != null ? Number(skill.age_max) : undefined,
        masteryCriteria: skill.mastery_criteria,
        developmentDomain: draft.subject.development_domain,
        isGlobal,
        createdBy: userId,
      });
      skillOrder++;
      tally(skillSummary, skillResult.action);
      skillNameToId.set(String(skill.name).toLowerCase().trim(), skillResult.id);

      if (Array.isArray(skill.learning_objectives) && skill.learning_objectives.length > 0) {
        await syncLearningObjectives(supabase, skillResult.id, skill.learning_objectives);
      }
      if (Array.isArray(skill.prerequisites) && skill.prerequisites.length > 0) {
        pendingPrereqs.push({ skillId: skillResult.id, prereqNames: skill.prerequisites.map((p: any) => String(p)) });
      }
      if (childId) await insertSkillProgress(supabase, childId, skillResult.id);

      let taskOrder = 0;
      for (const task of (skill.tasks || [])) {
        const taskResult = await findOrCreateTask(supabase, {
          topicId: topicResult.id, skillId: skillResult.id, name: task.title, description: task.description,
          orderIndex: taskOrder++, taskType: task.task_type, instructions: task.instructions,
          parentGuide: task.parent_guide, materialsNeeded: task.materials_needed,
          estimatedMinutes: task.estimated_minutes, learningObjective: task.learning_objective,
          assessmentCriteria: task.assessment_criteria, resources: task.resources,
        });
        tally(taskSummary, taskResult.action);
        if (taskResult.isNew && childId) await insertTaskProgress(supabase, { taskId: taskResult.id, childId });
        if (task.activities && task.activities.length > 0) await syncActivities(supabase, taskResult.id, task.activities);
      }
    }
  }

  // Wire the prerequisite graph (cycles/dupes are skipped inside the helper).
  for (const { skillId, prereqNames } of pendingPrereqs) {
    const prereqIds = prereqNames
      .map((n) => skillNameToId.get(n.toLowerCase().trim()))
      .filter((id): id is string => Boolean(id) && id !== skillId);
    if (prereqIds.length > 0) await syncSkillPrerequisites(supabase, skillId, prereqIds);
  }

  return { subjectId, summary: { subjects: subjectSummary, topics: topicSummary, tasks: taskSummary, skills: skillSummary } };
}
