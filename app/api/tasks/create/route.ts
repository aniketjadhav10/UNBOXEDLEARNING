// app/api/tasks/create/route.ts — migrated from server/tasks/create.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendError } from '@/lib/api-utils/http';
import { createServerSupabase } from '@/lib/supabase/server';
import { createTaskFromBody, taskFromRow, taskInsertPayload } from '@/src/lib/api-utils/tasks';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task = createTaskFromBody(body ?? {});
    const supabase = await createServerSupabase();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    }
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const { data, error } = await supabase.from('tasks').insert(taskInsertPayload(task)).select().single();
    if (error) throw error;
    return NextResponse.json({ task: taskFromRow(data) }, { status: 201 });
  } catch (error) {
    return sendError(error);
  }
}
