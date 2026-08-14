import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, readString, sendError } from '../../src/lib/api-utils/http';
import { createServerSupabase } from '../../src/lib/api-utils/supabase';
import { generateJson, requireGeminiKey } from './aiClient';
import { findOrCreateSubject, findOrCreateTopic, findOrCreateTask, insertTaskProgress, enrollChildInSubject, enrollChildInTopic, syncActivities } from './aiDb';
import type { MergeAction } from './aiDb';
import { buildSyllabusPrompt } from './prompts/SyllabusPrompt';
import { logger } from '../logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SyllabusResult {
  subject: { name: string; description: string };
  topics: Array<{
    title: string;
    description: string;
    difficulty_level: string;
    age_group: string;
    learning_objectives?: string[];
    estimated_hours?: number;
    bloom_level?: string;
    keywords?: string[];
    tasks: Array<{
      title: string;
      description: string;
      task_type?: string;
      instructions?: string;
      parent_guide?: string;
      materials_needed?: string[];
      estimated_minutes?: number;
      learning_objective?: string;
      assessment_criteria?: string;
      resources?: Array<{ type: string; url: string; title: string }>;
      activities?: Array<{
        name: string;
        activity_type?: string;
        instructions?: string;
        materials?: string[];
      }>;
    }>;
  }>;
}

interface ActionSummary {
  created: number;
  merged: number;
  unchanged: number;
}

function emptySummary(): ActionSummary {
  return { created: 0, merged: 0, unchanged: 0 };
}

function tally(summary: ActionSummary, action: MergeAction): void {
  summary[action]++;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    requireGeminiKey();

    const sourceText    = readString(req.body?.sourceText, 'sourceText');
    const age           = Number(req.body?.age)           || 10;
    const topicsCount   = Number(req.body?.topicsCount)   || 5;
    const tasksPerTopic = Number(req.body?.tasksPerTopic) || 3;
    const childId       = req.body?.childId ? String(req.body.childId) : null;
    const skillLevel    = req.body?.skillLevel ? String(req.body.skillLevel) : 'Beginner';
    const targetGrade   = req.body?.targetGrade ? String(req.body.targetGrade) : null;
    const isGlobal      = req.body?.isGlobal === true;

    logger.info(`[generateSyllabus] age=${age} skill=${skillLevel} grade=${targetGrade} isGlobal=${isGlobal} topics=${topicsCount}`);

    // 1. Generate syllabus JSON from AI
    const prompt = buildSyllabusPrompt({ sourceText, age, skillLevel, targetGrade, topicsCount, tasksPerTopic });
    const raw    = await generateJson(prompt);
    
    // Sometimes the model appends trailing whitespace or markdown (e.g. ```) even with application/json
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not find a JSON object in the AI response.");
    
    const result = JSON.parse(match[0]) as SyllabusResult;

    logger.info(`[generateSyllabus] Parsed subject: "${result.subject.name}" with ${result.topics.length} topics`);

    const supabase = createServerSupabase(req);

    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const subjectSummary = emptySummary();
    const topicSummary   = emptySummary();
    const taskSummary    = emptySummary();

    // 2. Resolve, merge, or create subject
    const subjectResult = await findOrCreateSubject(supabase, {
      name: result.subject.name,
      description: result.subject.description,
      childId: childId,
      userId: user.id,
      is_global: isGlobal,
    });
    tally(subjectSummary, subjectResult.action);
    const subjectId = subjectResult.id;

    if (childId) {
      await enrollChildInSubject(supabase, childId, subjectId);
    }

    // 3. Process topics and tasks
    let topicOrderIndex = 0;
    for (const t of result.topics) {
      const topicResult = await findOrCreateTopic(supabase, {
        subjectId,
        title: t.title,
        description: t.description,
        difficultyLevel: t.difficulty_level || 'Beginner',
        ageGroup: String(age),
        orderIndex: topicOrderIndex++,
        learningObjectives: t.learning_objectives,
        estimatedHours: t.estimated_hours,
        bloomLevel: t.bloom_level,
        keywords: t.keywords,
      });
      tally(topicSummary, topicResult.action);

      if (childId) {
        await enrollChildInTopic(supabase, childId, topicResult.id);
      }

      let taskOrderIndex = 0;
      for (const task of t.tasks) {
        const taskResult = await findOrCreateTask(supabase, {
          topicId: topicResult.id,
          name: task.title,
          description: task.description,
          orderIndex: taskOrderIndex++,
          taskType: task.task_type,
          instructions: task.instructions,
          parentGuide: task.parent_guide,
          materialsNeeded: task.materials_needed,
          estimatedMinutes: task.estimated_minutes,
          learningObjective: task.learning_objective,
          assessmentCriteria: task.assessment_criteria,
          resources: task.resources,
        });
        tally(taskSummary, taskResult.action);

        if (taskResult.isNew && childId) {
          await insertTaskProgress(supabase, { taskId: taskResult.id, childId });
        }

        // Sync Activities
        if (task.activities && task.activities.length > 0) {
          await syncActivities(supabase, taskResult.id, task.activities);
        }
      }
    }

    const summary = { subjects: subjectSummary, topics: topicSummary, tasks: taskSummary };
    logger.info({ summary, subjectId }, `[generateSyllabus] Done.`);

    res.status(200).json({
      success: true,
      subjectId,
      summary,
      message: buildMessage(summary),
    });
  } catch (error: any) {
    logger.error({ err: error, message: error.message, stack: error.stack }, '[generateSyllabus] Error details');
    sendError(res, error, 500);
  }
}

function buildMessage(summary: { subjects: ActionSummary; topics: ActionSummary; tasks: ActionSummary }): string {
  const parts: string[] = [];
  const { topics, tasks } = summary;

  if (topics.created > 0) parts.push(`${topics.created} topic${topics.created !== 1 ? 's' : ''} added`);
  if (topics.merged   > 0) parts.push(`${topics.merged} topic${topics.merged !== 1 ? 's' : ''} enriched`);
  if (tasks.created   > 0) parts.push(`${tasks.created} task${tasks.created !== 1 ? 's' : ''} added`);
  if (tasks.merged    > 0) parts.push(`${tasks.merged} task${tasks.merged !== 1 ? 's' : ''} enriched`);

  return parts.length > 0
    ? `Syllabus ready — ${parts.join(', ')}.`
    : 'Syllabus is already up to date.';
}
