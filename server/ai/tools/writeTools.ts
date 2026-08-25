// ============================================================
// server/ai/tools/writeTools.ts — mutating tools (RLS-scoped)
// Promoted from the inline chat function-declarations, with the
// multi-child correctness bug fixed in update_task_stage.
// ============================================================
import { z } from 'zod';
import { getEmbedding } from '../aiClient';
import type { ToolDef } from './types';

/** Postgres `learning_stage` enum — keep in exact sync with schema.sql. */
export const LEARNING_STAGES = [
  'Not_Started',
  'Introduced',
  'Practicing',
  'Comfortable',
  'Confident',
  'Needs_Practice',
] as const;

const saveUserMemory: ToolDef = {
  name: 'save_user_memory',
  description: 'Save an important fact or preference about the family or a child to long-term memory for future sessions.',
  inputSchema: { fact: z.string().min(1) },
  readOnly: false,
  async handler(args, { supabase, userId }) {
    const fact = args.fact as string;
    const embedding = await getEmbedding(fact);
    const { error } = await supabase
      .from('user_memories')
      .insert({ user_id: userId, content: fact, embedding });
    if (error) throw new Error(error.message);
    return { success: true };
  },
};

const updateTaskStage: ToolDef = {
  name: 'update_task_stage',
  description:
    "Update the learning stage of a task for a specific child. If the family has more than one child, child_name is required to disambiguate.",
  inputSchema: {
    task_name: z.string().min(1),
    new_stage: z.enum(LEARNING_STAGES),
    child_name: z.string().optional(),
  },
  readOnly: false,
  async handler(args, { supabase, userId }) {
    const taskName = args.task_name as string;
    const newStage = args.new_stage as string;
    const childName = (args.child_name as string | undefined)?.trim();

    // ── Resolve the target child (multi-child correct) ──────────
    const { data: children, error: childErr } = await supabase
      .from('children')
      .select('id, name')
      .eq('user_id', userId);
    if (childErr) throw new Error(childErr.message);
    if (!children || children.length === 0) {
      return { success: false, message: 'No children found for this account.' };
    }

    let child: { id: string; name: string } | undefined;
    if (childName) {
      const lower = childName.toLowerCase();
      child =
        children.find((c: any) => c.name.toLowerCase() === lower) ??
        children.find((c: any) => c.name.toLowerCase().includes(lower));
      if (!child) {
        return {
          success: false,
          message: `No child named "${childName}". Known children: ${children.map((c: any) => c.name).join(', ')}.`,
        };
      }
    } else if (children.length === 1) {
      child = children[0];
    } else {
      return {
        success: false,
        message: `This family has multiple children (${children.map((c: any) => c.name).join(', ')}). Specify child_name.`,
      };
    }

    // ── Find the task (RLS scopes to the family's curriculum) ───
    const { data: tasks, error: taskErr } = await supabase
      .from('tasks')
      .select('id, name')
      .ilike('name', `%${taskName}%`)
      .limit(1);
    if (taskErr) throw new Error(taskErr.message);
    if (!tasks || tasks.length === 0) {
      return { success: false, message: `Task "${taskName}" not found.` };
    }

    // ── Update the correct child's progress row ─────────────────
    const { error: updErr } = await supabase
      .from('task_progress')
      .update({ learning_stage: newStage })
      .eq('task_id', tasks[0].id)
      .eq('child_id', child.id);
    if (updErr) throw new Error(updErr.message);

    return { success: true, message: `Updated "${tasks[0].name}" to ${newStage} for ${child.name}.` };
  },
};

export const writeTools: ToolDef[] = [saveUserMemory, updateTaskStage];
