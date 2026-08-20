// ============================================================
// server/ai/tools/readTools.ts — read-only tools (safe surface)
// ============================================================
import { z } from 'zod';
import { getEmbedding } from '../aiClient';
import type { ToolDef } from './types';

const listChildren: ToolDef = {
  name: 'list_children',
  description: "List the parent's children (learners) with their id, name, and grade level.",
  inputSchema: {},
  readOnly: true,
  async handler(_args, { supabase, userId }) {
    const { data, error } = await supabase
      .from('children')
      .select('id, name, grade_level')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

const listSubjects: ToolDef = {
  name: 'list_subjects',
  description: 'List curriculum subjects. Optionally scope to a single child by child_id.',
  inputSchema: { child_id: z.string().uuid().optional() },
  readOnly: true,
  async handler(args, { supabase }) {
    if (args.child_id) {
      const { data, error } = await supabase
        .from('child_subjects')
        .select('subjects(id, name, description)')
        .eq('child_id', args.child_id as string)
        .eq('is_active', true);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => row.subjects).filter(Boolean);
    }
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name, description')
      .eq('is_active', true)
      .order('order_index', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

const listTopics: ToolDef = {
  name: 'list_topics',
  description: 'List topics under a subject.',
  inputSchema: { subject_id: z.string().uuid() },
  readOnly: true,
  async handler(args, { supabase }) {
    const { data, error } = await supabase
      .from('topics')
      .select('id, title, description, difficulty_level')
      .eq('subject_id', args.subject_id as string)
      .order('order_index', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

const listTasks: ToolDef = {
  name: 'list_tasks',
  description: 'List tasks under a topic.',
  inputSchema: { topic_id: z.string().uuid() },
  readOnly: true,
  async handler(args, { supabase }) {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, name, description, task_type, estimated_minutes')
      .eq('topic_id', args.topic_id as string)
      .eq('is_active', true)
      .order('order_index', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

const searchCurriculum: ToolDef = {
  name: 'search_curriculum',
  description: "Semantic search across the family's tasks by meaning. Optionally restrict to one topic.",
  inputSchema: {
    query: z.string().min(1),
    topic_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(20).optional(),
  },
  readOnly: true,
  async handler(args, { supabase }) {
    const embedding = await getEmbedding(args.query as string);
    if (!embedding) return { results: [], note: 'Embedding unavailable — search skipped.' };
    const { data, error } = await supabase.rpc('match_tasks', {
      query_embedding: embedding,
      topic_id_filter: (args.topic_id as string) ?? null,
      match_threshold: 0.6,
      match_count: (args.limit as number) ?? 5,
    });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

const getTaskProgress: ToolDef = {
  name: 'get_task_progress',
  description: "Get a child's task progress: learning stage, interest, due dates, ratings, session counts.",
  inputSchema: { child_id: z.string().uuid() },
  readOnly: true,
  async handler(args, { supabase }) {
    const { data, error } = await supabase
      .from('task_progress')
      .select('task_id, learning_stage, interest_level, next_due_at, parent_rating, session_count, notes, tasks(name)')
      .eq('child_id', args.child_id as string)
      .eq('is_active', true);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

const whatsDue: ToolDef = {
  name: 'whats_due',
  description: 'List tasks that are due or overdue for a child (next_due_at at or before now), soonest first.',
  inputSchema: { child_id: z.string().uuid() },
  readOnly: true,
  async handler(args, { supabase }) {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('task_progress')
      .select('task_id, learning_stage, next_due_at, tasks(name)')
      .eq('child_id', args.child_id as string)
      .eq('is_active', true)
      .not('next_due_at', 'is', null)
      .lte('next_due_at', nowIso)
      .order('next_due_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

const searchMemory: ToolDef = {
  name: 'search_memory',
  description: "Semantically search the parent's long-term memory (facts previously saved about the family/children).",
  inputSchema: {
    query: z.string().min(1),
    limit: z.number().int().min(1).max(10).optional(),
  },
  readOnly: true,
  async handler(args, { supabase, userId }) {
    const embedding = await getEmbedding(args.query as string);
    if (!embedding) return [];
    const { data, error } = await supabase.rpc('match_user_memories', {
      query_embedding: embedding,
      user_id_filter: userId,
      match_threshold: 0.7,
      match_count: (args.limit as number) ?? 5,
    });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

export const readTools: ToolDef[] = [
  listChildren,
  listSubjects,
  listTopics,
  listTasks,
  searchCurriculum,
  getTaskProgress,
  whatsDue,
  searchMemory,
];
