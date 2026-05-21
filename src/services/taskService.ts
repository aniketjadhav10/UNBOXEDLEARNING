// ============================================================
// taskService — Supabase queries for task + task_progress
// ============================================================
import { supabase } from './supabase';
import { computeConsistencyScore } from '../utils/date';
import type {
  SupabaseTask,
  SupabaseTaskProgress,
  TaskWithProgress,
  UpdateProgressPayload,
  DashboardSummary,
} from '../types/taskTypes';

// ── Date helpers ─────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

function isOverdue(nextDueAt: string | null | undefined): boolean {
  if (!nextDueAt) return false;
  return new Date(nextDueAt) < new Date(new Date().setHours(0, 0, 0, 0));
}

function isDueToday(nextDueAt: string | null | undefined): boolean {
  if (!nextDueAt) return false;
  return nextDueAt.split('T')[0] === today();
}

function isInactive(lastPracticedAt: string | null | undefined): boolean {
  if (!lastPracticedAt) return true;
  const diff = (Date.now() - new Date(lastPracticedAt).getTime()) / (1000 * 60 * 60 * 24);
  return diff > 14;
}

function progressPercent(learned: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, Math.round((learned / target) * 100));
}

function masteryPrediction(learned: number, target: number, streak: number): number | undefined {
  const remaining = target - learned;
  if (remaining <= 0) return 0;
  const sessionsPerDay = streak > 5 ? 1.2 : streak > 2 ? 0.8 : 0.4;
  return Math.ceil(remaining / sessionsPerDay);
}

function recommendedAction(task: SupabaseTask, progress: SupabaseTaskProgress | null): string {
  if (!progress) return 'Start practicing this task';
  const { learning_stage, learned_count } = progress;
  const interestNum = progress.interest_level ?? 3;
  const overdue = isOverdue(progress.next_due_at);
  const inactive = isInactive(progress.last_practiced_at);

  // Use actual DB stage values
  if (learning_stage === 'Confident') return 'Great job! Keep reviewing periodically';
  if (learning_stage === 'Needs_Practice') return 'Schedule a revision session soon';
  if (overdue) return 'Practice is overdue — do it now!';
  if (inactive) return 'Resume practice — inactive for 14+ days';
  if (interestNum <= 2) return 'Try a different approach to spark interest';
  if (learned_count === 0) return 'Start first practice session';
  return 'Continue steady practice';
}

// ── Merge task + progress into view model ─────────────────────
function buildTaskWithProgress(
  task: SupabaseTask,
  progressMap: Map<string, SupabaseTaskProgress>,
): TaskWithProgress {
  const progress = progressMap.get(task.id) ?? null;
  const learned = progress?.learned_count ?? 0;
  const target = progress?.target_count ?? 10; // Default target if none

  return {
    ...task,
    progress,
    progressPercent: progressPercent(learned, target),
    isOverdue: isOverdue(progress?.next_due_at),
    isDueToday: isDueToday(progress?.next_due_at),
    isInactive: isInactive(progress?.last_practiced_at),
    // streak and mastery score removed as they are not in DbTaskProgress schema
    recommendedAction: recommendedAction(task, progress),
  };
}

// ── Fetch all tasks for a child ───────────────────────────────
export async function fetchTasksWithProgress(childId: string): Promise<TaskWithProgress[]> {
  // 1. Fetch all progress for this child
  const { data: progressData, error: progErr } = await supabase
    .from('task_progress')
    .select('*')
    .eq('child_id', childId)
    .eq('is_active', true);

  if (progErr) throw new Error(progErr.message);
  if (!progressData || progressData.length === 0) return [];

  const taskIds = progressData.map((p) => p.task_id);

  // 2. Fetch the corresponding tasks
  const { data: tasks, error: taskErr } = await supabase
    .from('tasks')
    .select('*')
    .in('id', taskIds)
    .eq('is_active', true);

  if (taskErr) throw new Error(taskErr.message);

  const progressMap = new Map<string, SupabaseTaskProgress>(
    progressData.map((p) => [p.task_id, p])
  );

  return (tasks ?? []).map((t) => buildTaskWithProgress(t, progressMap));
}

// ── Fetch dashboard summary ───────────────────────────────────
export function computeDashboardSummary(tasks: TaskWithProgress[]): DashboardSummary {
  const interestLevels = tasks
    .map((t) => {
      const level = t.progress?.interest_level;
      return level ?? 3;
    })
    .filter((v) => !isNaN(v));
    
  const avgInterest = interestLevels.length
    ? interestLevels.reduce((a, b) => a + b, 0) / interestLevels.length
    : 0;

  // Compute real consistency from last_practiced_at dates (past 7 days)
  const practiceDates = tasks.map((t) => t.progress?.last_practiced_at);
  const consistencyScore = computeConsistencyScore(practiceDates, 7);

  return {
    dueTodayCount:          tasks.filter((t) => t.isDueToday).length,
    overdueCount:           tasks.filter((t) => t.isOverdue).length,
    // Use correct DB stage names for mastery check
    masteredCount:          tasks.filter((t) => ['Comfortable', 'Confident'].includes(t.progress?.learning_stage ?? '')).length,
    // is_scheduled_this_week lives in task_progress, not task table
    scheduledThisWeekCount: tasks.filter((t) => t.progress?.is_scheduled_this_week === true).length,
    avgInterestLevel:       Math.round(avgInterest * 10) / 10,
    consistencyScore,
  };
}

// ── Upsert task progress ──────────────────────────────────────
export async function updateTaskProgress(payload: UpdateProgressPayload): Promise<void> {
  const { task_id, ...updates } = payload;
  const { error } = await supabase
    .from('task_progress')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('task_id', task_id);
  if (error) throw new Error(error.message);
}

// ── Mark practiced today ─────────────────────────────────────
export async function markPracticedToday(
  taskId: string,
  updates: {
    learned_count: number;
    learning_stage?: string;
    next_due_at?: string | null;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('task_progress')
    .update({
      last_practiced_at: now,
      updated_at: now,
      ...updates,
    })
    .eq('task_id', taskId);
  if (error) throw new Error(error.message);
}

// ── Archive task ─────────────────────────────────────────────
export async function archiveTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ is_active: false })
    .eq('id', taskId);
  if (error) throw new Error(error.message);
}

// ── Assign task to child ──────────────────────────────────────
export async function assignTaskToChild(taskId: string, childId: string): Promise<void> {
  const { error } = await supabase
    .from('task_progress')
    .insert({
      task_id: taskId,
      child_id: childId,
      learning_stage: 'Not_Started',
      learned_count: 0,
      target_count: 5, // Default goal
      repeat_interval: 1,
      is_active: true,
      is_scheduled_this_week: false
    });
    
  if (error) throw new Error(error.message);
}
