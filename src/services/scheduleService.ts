// ============================================================
// scheduleService — lesson plans + scheduled sessions.
// Client-side Supabase queries (RLS-scoped to the acting user's
// children/family). Backs the planner UI and the adaptive planner.
// ============================================================
import { supabase } from './supabase';
import type { DbLessonPlan, DbScheduledSession, SessionStatus } from '../types/database';
import type { TablesUpdate } from '../types/database.types';

// ── Lesson plans ─────────────────────────────────────────────
export async function fetchLessonPlans(childId: string): Promise<DbLessonPlan[]> {
  const { data, error } = await supabase
    .from('lesson_plans')
    .select('*')
    .eq('child_id', childId)
    .eq('status', 'active')
    .order('week_start_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbLessonPlan[];
}

export async function createLessonPlan(payload: {
  child_id: string;
  title: string;
  week_start_date?: string | null;
}): Promise<DbLessonPlan> {
  const { data, error } = await supabase
    .from('lesson_plans')
    .insert({ ...payload, status: 'active' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbLessonPlan;
}

export async function archiveLessonPlan(id: string): Promise<void> {
  const { error } = await supabase.from('lesson_plans').update({ status: 'archived' }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Scheduled sessions ───────────────────────────────────────
/** Sessions for a child, optionally bounded to a [from, to] date range (inclusive). */
export async function fetchSessions(
  childId: string,
  range?: { from: string; to: string },
): Promise<DbScheduledSession[]> {
  let query = supabase
    .from('scheduled_sessions')
    .select('*')
    .eq('child_id', childId)
    .order('scheduled_date', { ascending: true });
  if (range) query = query.gte('scheduled_date', range.from).lte('scheduled_date', range.to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DbScheduledSession[];
}

export async function createSession(payload: {
  child_id: string;
  scheduled_date: string;
  plan_id?: string | null;
  task_id?: string | null;
  topic_id?: string | null;
  start_time?: string | null;
  duration_minutes?: number | null;
  notes?: string | null;
}): Promise<DbScheduledSession> {
  const { data, error } = await supabase
    .from('scheduled_sessions')
    .insert({ status: 'planned', ...payload })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbScheduledSession;
}

export async function updateSessionStatus(id: string, status: SessionStatus): Promise<void> {
  const patch: TablesUpdate<'scheduled_sessions'> = { status };
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  const { error } = await supabase.from('scheduled_sessions').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('scheduled_sessions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
