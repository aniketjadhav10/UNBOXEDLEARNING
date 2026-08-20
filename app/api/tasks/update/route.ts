// app/api/tasks/update/route.ts — migrated from server/tasks/update.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendError } from '@/lib/api-utils/http';
import { createServerSupabase } from '@/lib/api-utils/supabase';
import { taskFromRow, taskUpdatePayload, updateTaskFromBody } from '@/src/lib/api-utils/tasks';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const task = updateTaskFromBody(body ?? {});
    const supabase = createServerSupabase(req);
    const { data, error } = await supabase.from('tasks').update(taskUpdatePayload(task)).eq('id', task.id).select().single();
    if (error) throw error;
    return NextResponse.json({ task: taskFromRow(data) });
  } catch (error) {
    return sendError(error);
  }
}
