import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, sendError } from '../../src/lib/api-utils/http.js';
import { createServerSupabase } from '../../src/lib/api-utils/supabase.js';
import { createTaskFromBody, taskFromRow, taskInsertPayload } from '../../src/lib/api-utils/tasks.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    const task = createTaskFromBody(req.body ?? {});
    const supabase = createServerSupabase(req);
    const { data, error } = await supabase
      .from('tasks')
      .insert(taskInsertPayload(task))
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ task: taskFromRow(data) });
  } catch (error) {
    sendError(res, error);
  }
}
