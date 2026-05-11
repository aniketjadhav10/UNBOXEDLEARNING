// ============================================================
// curriculumService.ts — CRUD for Subjects, Topics, Tasks, Activities
// ============================================================
import { supabase } from './supabase';
import type { DbSubject, DbTopic, DbTask, DbActivity } from '../types/database';

export type CurriculumLevel = 'subjects' | 'topics' | 'tasks' | 'activities' | 'children';

// ── Generic CRUD handlers ────────────────────────────────────

export async function createItem<T>(table: CurriculumLevel, payload: any): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as T;
}

export async function updateItem<T>(table: CurriculumLevel, id: string, payload: any): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as T;
}

export async function deleteItem(table: CurriculumLevel, id: string): Promise<void> {
  // Use soft delete (is_active = false)
  const { error } = await supabase
    .from(table)
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

// ── Specific Fetchers with hierarchical filtering ────────────

export async function fetchSubjects(childId?: string): Promise<DbSubject[]> {
  let query = supabase.from('subjects').select('*').eq('is_active', true);
  if (childId) query = query.eq('child_id', childId);
  const { data, error } = await query.order('order_index', { ascending: true });
  if (error) throw error;
  return data as DbSubject[];
}

export async function fetchSubjectById(id: string): Promise<DbSubject | null> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as DbSubject | null;
}

export async function fetchTopics(subjectId: string): Promise<DbTopic[]> {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data as DbTopic[];
}

export async function fetchTopicById(id: string): Promise<DbTopic | null> {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as DbTopic | null;
}

export async function fetchTasksByTopic(topicId: string): Promise<DbTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('topic_id', topicId)
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data as DbTask[];
}

export async function fetchTaskById(id: string): Promise<DbTask | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as DbTask | null;
}

export async function fetchActivitiesByTask(taskId: string): Promise<DbActivity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('task_id', taskId)
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data as DbActivity[];
}

// ── Stats Calculation ───────────────────────────────────────

export async function getTopicStats(topicId: string) {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('topic_id', topicId)
    .eq('is_active', true);
  
  if (error) return { count: 0 };
  return { count: tasks.length };
}

export async function getTaskProgress(taskId: string, childId: string) {
  const { data, error } = await supabase
    .from('task_progress')
    .select('*')
    .eq('task_id', taskId)
    .eq('child_id', childId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
  return data;
}
