import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, sendError } from '../_utils/http';
import { createServerSupabase } from '../_utils/supabase';
import { taskFromRow, taskUpdatePayload, updateTaskFromBody } from '../_utils/tasks';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['PATCH'])) return;

  try {
    const task = updateTaskFromBody(req.body ?? {});
    const supabase = createServerSupabase(req);
    const { data, error } = await supabase
      .from('tasks')
      .update(taskUpdatePayload(task))
      .eq('id', task.id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ task: taskFromRow(data) });
  } catch (error) {
    sendError(res, error);
  }
}
