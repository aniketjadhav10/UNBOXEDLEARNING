// app/api/ai/generate-tasks/route.ts — migrated from server/ai/generateTasks.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendError, readString } from '@/lib/api-utils/http';
import { createServerSupabase } from '@/lib/supabase/server';
import { generateJson, requireGeminiKey } from '@/server/ai/aiClient';
import { enforceRateLimit, RateLimitError } from '@/server/ai/gateway';
import { findOrCreateTask, insertTaskProgress } from '@/server/ai/aiDb';
import type { MergeAction } from '@/server/ai/aiDb';
import { buildTasksPrompt } from '@/server/ai/prompts/TasksPrompt';

interface ActionSummary { created: number; merged: number; unchanged: number; }
function emptySummary(): ActionSummary { return { created: 0, merged: 0, unchanged: 0 }; }
function tally(s: ActionSummary, a: MergeAction) { s[a]++; }

export async function POST(req: NextRequest) {
  try {
    requireGeminiKey();
    const body = await req.json();
    const topicName   = readString(body?.topic_name, 'topic_name');
    const topicId     = readString(body?.topic_id,   'topic_id');
    const subjectName = body?.subject_name ? String(body.subject_name) : undefined;
    const ageGroup    = body?.age_group    ? String(body.age_group)    : undefined;
    const tasksCount  = Number(body?.tasks_count) || 10;
    const childId     = body?.child_id     ? String(body.child_id)     : null;

    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const ctx = { supabase, userId: user.id };
    await enforceRateLimit(ctx);

    const prompt = buildTasksPrompt({ topicName, subjectName, tasksCount, ageGroup });
    const raw    = await generateJson(prompt, { ctx, operation: 'generate_tasks' });
    const result = JSON.parse(raw);

    const taskSummary = emptySummary();

    const { data: existing } = await supabase
      .from('tasks').select('order_index').eq('topic_id', topicId)
      .order('order_index', { ascending: false }).limit(1);

    let orderIndex = existing && existing.length > 0 ? (existing[0].order_index as number) + 1 : 0;
    const processedTasks: { id: string; name: string; action: MergeAction; isNew: boolean }[] = [];

    for (const task of result.tasks) {
      const taskResult = await findOrCreateTask(supabase, {
        topicId, name: task.title, description: task.description, orderIndex: orderIndex++,
        taskType: task.task_type, instructions: task.instructions, parentGuide: task.parent_guide,
        materialsNeeded: task.materials_needed, estimatedMinutes: task.estimated_minutes,
        learningObjective: task.learning_objective, assessmentCriteria: task.assessment_criteria, resources: task.resources,
      });
      tally(taskSummary, taskResult.action);
      processedTasks.push({ id: taskResult.id, name: task.title, action: taskResult.action, isNew: taskResult.isNew });
      if (taskResult.isNew && childId) await insertTaskProgress(supabase, { taskId: taskResult.id, childId });
    }

    return NextResponse.json({ success: true, tasks: processedTasks, summary: { tasks: taskSummary } });
  } catch (error) {
    if (error instanceof RateLimitError) return sendError(error, 429);
    return sendError(error, 500);
  }
}
