// app/api/ai/generate-topics/route.ts — migrated from server/ai/generateTopics.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendError, parseJson } from '@/lib/api-utils/http';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { generateJson, requireGeminiKey } from '@/server/ai/aiClient';
import { enforceRateLimit, RateLimitError } from '@/server/ai/gateway';
import { findOrCreateTopic, findOrCreateTask, insertTaskProgress } from '@/server/ai/aiDb';
import type { MergeAction } from '@/server/ai/aiDb';
import { buildTopicsPrompt } from '@/server/ai/prompts/TopicsPrompt';

interface ActionSummary { created: number; merged: number; unchanged: number; }
function emptySummary(): ActionSummary { return { created: 0, merged: 0, unchanged: 0 }; }
function tally(s: ActionSummary, a: MergeAction) { s[a]++; }

export async function POST(req: NextRequest) {
  try {
    requireGeminiKey();
    const body = await parseJson(req, z.object({
      subject_name: z.string().min(1),
      subject_id: z.string().uuid(),
      age_group: z.string().optional(),
      topics_count: z.number().int().positive().optional(),
      tasks_per_topic: z.number().int().positive().optional(),
      child_id: z.string().uuid().optional(),
    }));
    const subjectName   = body.subject_name;
    const subjectId     = body.subject_id;
    const ageGroup      = body.age_group ?? '3-5';
    const topicsCount   = body.topics_count ?? 10;
    const tasksPerTopic = body.tasks_per_topic ?? 10;
    const childId       = body.child_id ?? null;

    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const ctx = { supabase, userId: user.id };
    await enforceRateLimit(ctx);

    const prompt = buildTopicsPrompt({ subjectName, ageGroup, topicsCount, tasksPerTopic });
    const raw    = await generateJson(prompt, { ctx, operation: 'generate_topics' });
    const result = JSON.parse(raw);

    const topicSummary = emptySummary();
    const taskSummary  = emptySummary();
    const processedTopics: { id: string; title: string; action: MergeAction }[] = [];
    const processedTasks:  { id: string; name: string; action: MergeAction; isNew: boolean }[] = [];

    let topicOrderIndex = 0;
    for (const t of result.topics) {
      const topicResult = await findOrCreateTopic(supabase, {
        subjectId, title: t.title, description: t.description,
        difficultyLevel: t.difficulty_level || 'Beginner', ageGroup: t.age_group || ageGroup,
        orderIndex: topicOrderIndex++, learningObjectives: t.learning_objectives,
        estimatedHours: t.estimated_hours, bloomLevel: t.bloom_level, keywords: t.keywords,
      });
      tally(topicSummary, topicResult.action);
      processedTopics.push({ id: topicResult.id, title: t.title, action: topicResult.action });

      let taskOrderIndex = 0;
      for (const task of t.tasks) {
        const taskResult = await findOrCreateTask(supabase, {
          topicId: topicResult.id, name: task.title, description: task.description, orderIndex: taskOrderIndex++,
          taskType: task.task_type, instructions: task.instructions, parentGuide: task.parent_guide,
          materialsNeeded: task.materials_needed, estimatedMinutes: task.estimated_minutes,
          learningObjective: task.learning_objective, assessmentCriteria: task.assessment_criteria, resources: task.resources,
        });
        tally(taskSummary, taskResult.action);
        processedTasks.push({ id: taskResult.id, name: task.title, action: taskResult.action, isNew: taskResult.isNew });
        if (taskResult.isNew && childId) await insertTaskProgress(supabase, { taskId: taskResult.id, childId });
      }
    }

    return NextResponse.json({ success: true, topics: processedTopics, tasks: processedTasks, summary: { topics: topicSummary, tasks: taskSummary } });
  } catch (error) {
    if (error instanceof RateLimitError) return sendError(error, 429);
    return sendError(error, 500);
  }
}
