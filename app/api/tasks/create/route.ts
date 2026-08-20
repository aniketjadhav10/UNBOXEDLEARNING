// app/api/tasks/create/route.ts — migrated from server/tasks/create.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendError } from '@/lib/api-utils/http';
import { createServerSupabase } from '@/lib/api-utils/supabase';
import { createTaskFromBody, taskFromRow, taskInsertPayload } from '@/src/lib/api-utils/tasks';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task = createTaskFromBody(body ?? {});
    const supabase = createServerSupabase(req);
    const { data, error } = await supabase.from('tasks').insert(taskInsertPayload(task)).select().single();
    if (error) throw error;
    return NextResponse.json({ task: taskFromRow(data) }, { status: 201 });
  } catch (error) {
    return sendError(error);
  }
}
