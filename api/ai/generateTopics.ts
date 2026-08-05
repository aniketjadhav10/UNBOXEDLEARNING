import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, readString, sendError } from '../../src/lib/api-utils/http';
import { createServerSupabase } from '../../src/lib/api-utils/supabase';
import { generateJson, requireGeminiKey } from './aiClient';
import { findOrCreateTopic, findOrCreateTask, insertTaskProgress } from './aiDb';
import type { MergeAction } from './aiDb';
import { buildTopicsPrompt } from './prompts/TopicsPrompt';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TopicsResult {
  subject: string;
  age_group: string;
  topics: Array<{
    title: string;
    description: string;
    difficulty_level: string;
    age_group: string;
    tasks: Array<{ title: string; description: string }>;
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

    const subjectName   = readString(req.body?.subject_name, 'subject_name');
    const subjectId     = readString(req.body?.subject_id,   'subject_id');
    const ageGroup      = req.body?.age_group       ? String(req.body.age_group)       : '3-5';
    const topicsCount   = Number(req.body?.topics_count)    || 10;
    const tasksPerTopic = Number(req.body?.tasks_per_topic) || 10;
    const childId       = req.body?.child_id        ? String(req.body.child_id)        : null;

    console.log(`[generateTopics] subject="${subjectName}" age=${ageGroup} topics=${topicsCount} tasks=${tasksPerTopic}`);

    // 1. Generate topics JSON from AI
    const prompt = buildTopicsPrompt({ subjectName, ageGroup, topicsCount, tasksPerTopic });
    const raw    = await generateJson(prompt);
    const result = JSON.parse(raw) as TopicsResult;

    console.log(`[generateTopics] Parsed ${result.topics.length} topics`);

    const supabase     = createServerSupabase(req);
    const topicSummary = emptySummary();
    const taskSummary  = emptySummary();

    const processedTopics: { id: string; title: string; action: MergeAction }[] = [];
    const processedTasks:  { id: string; name: string;  action: MergeAction; isNew: boolean }[] = [];

    // 2. Process each topic and its tasks
    let topicOrderIndex = 0;
    for (const t of result.topics) {
      const topicResult = await findOrCreateTopic(supabase, {
        subjectId,
        title: t.title,
        description: t.description,
        difficultyLevel: t.difficulty_level || 'Beginner',
        ageGroup: t.age_group || ageGroup,
        orderIndex: topicOrderIndex++,
      });
      tally(topicSummary, topicResult.action);
      processedTopics.push({ id: topicResult.id, title: t.title, action: topicResult.action });

      let taskOrderIndex = 0;
      for (const task of t.tasks) {
        const taskResult = await findOrCreateTask(supabase, {
          topicId: topicResult.id,
          name: task.title,
          description: task.description,
          orderIndex: taskOrderIndex++,
        });
        tally(taskSummary, taskResult.action);
        processedTasks.push({ id: taskResult.id, name: task.title, action: taskResult.action, isNew: taskResult.isNew });

        if (taskResult.isNew && childId) {
          await insertTaskProgress(supabase, { taskId: taskResult.id, childId });
        }
      }
    }

    const summary = { topics: topicSummary, tasks: taskSummary };
    console.log(`[generateTopics] Done.`, summary);

    res.status(200).json({
      success: true,
      topics: processedTopics,
      tasks:  processedTasks,
      summary,
    });
  } catch (error) {
    console.error('[generateTopics] Error:', error);
    sendError(res, error, 500);
  }
}
