import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, readString, sendError } from '../../src/lib/api-utils/http';
import { createServerSupabase } from '../../src/lib/api-utils/supabase';
import { generateJson, requireGeminiKey } from './aiClient';
import { findOrCreateTask, insertTaskProgress } from './aiDb';
import type { MergeAction } from './aiDb';
import { buildTasksPrompt } from './prompts/TasksPrompt';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TasksResult {
  topic: string;
  subject: string;
  age_group: string;
  tasks: Array<{ title: string; description: string }>;
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

    const topicName   = readString(req.body?.topic_name, 'topic_name');
    const topicId     = readString(req.body?.topic_id,   'topic_id');
    const subjectName = req.body?.subject_name ? String(req.body.subject_name) : undefined;
    const ageGroup    = req.body?.age_group    ? String(req.body.age_group)    : undefined;
    const tasksCount  = Number(req.body?.tasks_count) || 10;
    const childId     = req.body?.child_id     ? String(req.body.child_id)     : null;

    console.log(`[generateTasks] topic="${topicName}" subject="${subjectName}" tasksCount=${tasksCount}`);

    // 1. Generate tasks JSON from AI
    const prompt = buildTasksPrompt({ topicName, subjectName, tasksCount, ageGroup });
    const raw    = await generateJson(prompt);
    const result = JSON.parse(raw) as TasksResult;

    console.log(`[generateTasks] Parsed ${result.tasks.length} tasks`);

    const supabase    = createServerSupabase(req);
    const taskSummary = emptySummary();

    // 2. Get current highest order_index so new tasks are appended correctly
    const { data: existing } = await supabase
      .from('tasks')
      .select('order_index')
      .eq('topic_id', topicId)
      .order('order_index', { ascending: false })
      .limit(1);

    let orderIndex = existing && existing.length > 0 ? (existing[0].order_index as number) + 1 : 0;

    const processedTasks: { id: string; name: string; action: MergeAction; isNew: boolean }[] = [];

    for (const task of result.tasks) {
      const taskResult = await findOrCreateTask(supabase, {
        topicId,
        name: task.title,
        description: task.description,
        orderIndex: orderIndex++,
      });

      tally(taskSummary, taskResult.action);
      processedTasks.push({ id: taskResult.id, name: task.title, action: taskResult.action, isNew: taskResult.isNew });

      if (taskResult.isNew && childId) {
        await insertTaskProgress(supabase, { taskId: taskResult.id, childId });
      }
    }

    console.log(`[generateTasks] Done.`, taskSummary);

    res.status(200).json({
      success: true,
      tasks: processedTasks,
      summary: { tasks: taskSummary },
    });
  } catch (error) {
    console.error('[generateTasks] Error:', error);
    sendError(res, error, 500);
  }
}
