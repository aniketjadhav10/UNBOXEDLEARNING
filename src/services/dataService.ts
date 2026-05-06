// ============================================================
// dataService.ts — All Supabase data fetching for the new UI
// Schema: children → subjects → topics → tasks → task_progress
// ============================================================
import { supabase } from './supabase';
import type {
  DbChild,
  DbProfile,
  DbSubject,
  DbTask,
  DbTaskProgress,
  DbTopic,
  LearningStage,
} from '../types/database';

// ── Helpers ──────────────────────────────────────────────────

/** Map subject name keywords → emoji */
export function subjectEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('math'))              return '🔢';
  if (n.includes('science'))           return '🔬';
  if (n.includes('english') || n.includes('language') || n.includes('reading') || n.includes('writing')) return '📚';
  if (n.includes('history') || n.includes('social'))  return '🏛️';
  if (n.includes('art') || n.includes('creative'))    return '🎨';
  if (n.includes('cod') || n.includes('tech') || n.includes('computer')) return '💻';
  if (n.includes('music'))             return '🎵';
  if (n.includes('pe') || n.includes('physical') || n.includes('sport')) return '⚽';
  if (n.includes('geo'))               return '🌍';
  if (n.includes('bio'))               return '🧬';
  if (n.includes('chem'))              return '⚗️';
  if (n.includes('phys'))              return '⚡';
  return '📖';
}

/** Map a hex color to a Tailwind gradient string */
export function colorToGradient(hex: string): string {
  const gradients: Record<string, string> = {
    '#3f6b57': 'from-emerald-500 to-teal-600',
    '#8b5cf6': 'from-violet-500 to-purple-600',
    '#3b82f6': 'from-blue-500 to-cyan-600',
    '#f59e0b': 'from-amber-500 to-orange-600',
    '#ec4899': 'from-pink-500 to-rose-600',
    '#6366f1': 'from-indigo-500 to-blue-600',
    '#22c55e': 'from-lime-500 to-green-600',
    '#64748b': 'from-slate-600 to-gray-700',
    '#14b8a6': 'from-teal-500 to-cyan-600',
    '#f97316': 'from-orange-500 to-amber-600',
    '#a855f7': 'from-purple-500 to-violet-600',
    '#ef4444': 'from-red-500 to-rose-600',
  };
  return gradients[hex.toLowerCase()] ?? 'from-violet-500 to-purple-600';
}

/** Compute initials from a name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Map child index → avatar gradient */
const AVATAR_COLORS = [
  'from-pink-400 to-rose-500',
  'from-sky-400 to-blue-500',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-lime-400 to-green-500',
];
export function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/** Compute age from date_of_birth */
export function computeAge(dob: string | null): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/** Progress: completed = Comfortable | Confident */
const COMPLETED_STAGES: LearningStage[] = ['Comfortable', 'Confident'];
export function isStageComplete(stage: LearningStage): boolean {
  return COMPLETED_STAGES.includes(stage);
}

// ── Auth ─────────────────────────────────────────────────────

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function getMyProfile(): Promise<DbProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) return null;
  return data as DbProfile;
}

// ── Children ─────────────────────────────────────────────────

export async function fetchChildren(): Promise<DbChild[]> {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbChild[];
}

export async function createChild(payload: {
  name: string;
  grade_level: string;
  date_of_birth?: string;
}): Promise<DbChild> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('children')
    .insert({ ...payload, user_id: user.id })
    .select('*')
    .single();
  if (error) throw error;
  return data as DbChild;
}

export async function updateChild(id: string, payload: Partial<DbChild>): Promise<DbChild> {
  const { data, error } = await supabase
    .from('children')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as DbChild;
}

// ── Subjects ─────────────────────────────────────────────────

export async function fetchSubjects(childId?: string): Promise<DbSubject[]> {
  let query = supabase
    .from('subjects')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  if (childId) query = query.eq('child_id', childId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DbSubject[];
}

export async function createSubject(payload: {
  child_id: string;
  name: string;
  description?: string;
  color?: string;
}): Promise<DbSubject> {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ ...payload, color: payload.color ?? '#8b5cf6' })
    .select('*')
    .single();
  if (error) throw error;
  return data as DbSubject;
}

// ── Topics ───────────────────────────────────────────────────

export async function fetchTopics(subjectId?: string): Promise<DbTopic[]> {
  let query = supabase
    .from('topics')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  if (subjectId) query = query.eq('subject_id', subjectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DbTopic[];
}

export async function createTopic(payload: {
  subject_id: string;
  title: string;
  description?: string;
  difficulty_level?: string;
}): Promise<DbTopic> {
  const { data, error } = await supabase
    .from('topics')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as DbTopic;
}

// ── Tasks ────────────────────────────────────────────────────

export async function fetchTasks(topicId?: string): Promise<DbTask[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  if (topicId) query = query.eq('topic_id', topicId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DbTask[];
}

// ── Task Progress ─────────────────────────────────────────────

export async function fetchTaskProgress(childId?: string): Promise<DbTaskProgress[]> {
  let query = supabase
    .from('task_progress')
    .select('*')
    .eq('is_active', true);
  if (childId) query = query.eq('child_id', childId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DbTaskProgress[];
}

// ── Aggregated data for pages ─────────────────────────────────

/**
 * Fetch all data needed for the app in one go.
 * Returns raw DB rows — DataContext will transform them.
 */
export async function fetchAllAppData() {
  const [children, subjects, topics, tasks, taskProgress] = await Promise.all([
    fetchChildren(),
    fetchSubjects(),
    fetchTopics(),
    fetchTasks(),
    fetchTaskProgress(),
  ]);
  return { children, subjects, topics, tasks, taskProgress };
}

/**
 * Compute subject progress % from task_progress rows.
 * Uses only tasks belonging to topics of this subject.
 */
export function computeSubjectProgress(
  subjectId: string,
  topics: DbTopic[],
  tasks: DbTask[],
  progress: DbTaskProgress[],
): number {
  const subjectTopicIds = new Set(
    topics.filter((t) => t.subject_id === subjectId).map((t) => t.id)
  );
  const subjectTasks = tasks.filter((t) => subjectTopicIds.has(t.topic_id));
  if (subjectTasks.length === 0) return 0;

  const subjectTaskIds = new Set(subjectTasks.map((t) => t.id));
  const progressRows = progress.filter((p) => subjectTaskIds.has(p.task_id));

  const completed = progressRows.filter((p) => isStageComplete(p.learning_stage)).length;
  return Math.round((completed / subjectTasks.length) * 100);
}

/**
 * Compute topic completion from task_progress.
 * A topic is "completed" if all its tasks have a completed learning stage.
 */
export function isTopicCompleted(
  topicId: string,
  tasks: DbTask[],
  progress: DbTaskProgress[],
): boolean {
  const topicTasks = tasks.filter((t) => t.topic_id === topicId);
  if (topicTasks.length === 0) return false;
  const topicTaskIds = new Set(topicTasks.map((t) => t.id));
  const topicProgress = progress.filter((p) => topicTaskIds.has(p.task_id));
  return topicTasks.every((task) => {
    const prog = topicProgress.find((p) => p.task_id === task.id);
    return prog ? isStageComplete(prog.learning_stage) : false;
  });
}
