// app/api/tasks/complete/route.ts — migrated from server/tasks/complete.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendError, parseJson } from '@/lib/api-utils/http';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import { taskFromRow } from '@/src/lib/api-utils/tasks';

export async function PATCH(req: NextRequest) {
  try {
    const { id } = await parseJson(req, z.object({ id: z.string().uuid() }));
    const supabase = await createServerSupabase();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    }
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks').select('id, topic_id, name, description, updated_at').eq('id', id).single();
    if (taskError) throw taskError;

    const { data: topic, error: topicError } = await supabase
      .from('topics').select('subject_id').eq('id', task.topic_id).single();
    if (topicError) throw topicError;

    // FIXME: subjects no longer have a child_id (enrollment moved to child_subjects),
    // so this derivation is broken — "complete task" needs childId passed by the caller.
    const { data: subject, error: subjectError } = await supabase
      .from('subjects').select('child_id').eq('id', topic.subject_id).single();
    if (subjectError) throw subjectError;

    const now = new Date().toISOString();
    const { data: existingProgress } = await supabase
      .from('task_progress').select('target_count')
      .eq('child_id', subject.child_id).eq('task_id', id).maybeSingle();

    const targetCount = typeof existingProgress?.target_count === 'number' ? existingProgress.target_count : 5;

    const { data: progress, error: progressError } = await supabase
      .from('task_progress').upsert({
        child_id: subject.child_id, task_id: id, learning_stage: 'Confident',
        learned_count: targetCount, target_count: targetCount, last_practiced_at: now,
        next_due_at: null, is_scheduled_this_week: false, is_active: true,
      }, { onConflict: 'child_id,task_id' }).select().single();

    if (progressError) throw progressError;

    return NextResponse.json({ task: taskFromRow(task, progress) });
  } catch (error) {
    return sendError(error);
  }
}
