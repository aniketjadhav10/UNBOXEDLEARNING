import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, readString, sendError } from '../../src/lib/api-utils/http';
import { createServerSupabase } from '../../src/lib/api-utils/supabase';
import { taskFromRow } from '../../src/lib/api-utils/tasks';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['PATCH'])) return;

  try {
    const id = readString(req.body?.id, 'id');
    const supabase = createServerSupabase(req);

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, topic_id, name, description, updated_at')
      .eq('id', id)
      .single();

    if (taskError) throw taskError;

    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('subject_id')
      .eq('id', task.topic_id)
      .single();

    if (topicError) throw topicError;

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('child_id')
      .eq('id', topic.subject_id)
      .single();

    if (subjectError) throw subjectError;

    const now = new Date().toISOString();
    const { data: existingProgress, error: existingProgressError } = await supabase
      .from('task_progress')
      .select('target_count')
      .eq('child_id', subject.child_id)
      .eq('task_id', id)
      .maybeSingle();

    if (existingProgressError) throw existingProgressError;

    const targetCount =
      typeof existingProgress?.target_count === 'number' ? existingProgress.target_count : 5;

    const { data: progress, error: progressError } = await supabase
      .from('task_progress')
      .upsert(
        {
          child_id: subject.child_id,
          task_id: id,
          learning_stage: 'Confident',
          learned_count: targetCount,
          target_count: targetCount,
          last_practiced_at: now,
          next_due_at: null,
          is_scheduled_this_week: false,
          is_active: true,
        },
        { onConflict: 'child_id,task_id' },
      )
      .select()
      .single();

    if (progressError) throw progressError;

    res.status(200).json({ task: taskFromRow(task, progress) });
  } catch (error) {
    sendError(res, error);
  }
}
