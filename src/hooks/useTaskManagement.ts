// ============================================================
// useTaskManagement — custom hook for task page state
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchTasksWithProgress,
  computeDashboardSummary,
  updateTaskProgress,
  markPracticedToday,
  archiveTask,
} from '../services/taskService';
import type {
  TaskWithProgress,
  DashboardSummary,
  TaskFilter,
  TaskSortKey,
  LearningStage,
  InterestLevel,
  UpdateProgressPayload,
} from '../types/taskTypes';

export type ToastType = 'success' | 'error' | 'info';
export interface ToastMessage { id: number; type: ToastType; message: string }

const EMPTY_FILTER: TaskFilter = {
  subject: '',
  stage: '',
  dueToday: false,
  overdue: false,
  scheduledThisWeek: false,
  interestLevel: 0,
};

export function useTaskManagement(childId: string) {
  // ── Data state ──────────────────────────────────────────────
  const [tasks, setTasks] = useState<TaskWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  // ── UI state ────────────────────────────────────────────────
  const [filter, setFilter] = useState<TaskFilter>(EMPTY_FILTER);
  const [sortKey, setSortKey] = useState<TaskSortKey>('next_due_at');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'overdue' | 'mastered'>('all');
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  // ── Load tasks ──────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTasksWithProgress(childId);
      setTasks(data);
      setSummary(computeDashboardSummary(data));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => { load(); }, [load]);

  // ── Toast helpers ────────────────────────────────────────────
  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // ── Optimistic task updater ──────────────────────────────────
  const patchTask = useCallback((taskId: string, updater: (t: TaskWithProgress) => TaskWithProgress) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? updater(t) : t));
      setSummary(computeDashboardSummary(next));
      return next;
    });
  }, []);

  // ── Actions ──────────────────────────────────────────────────
  const handleMarkPracticed = useCallback(async (task: TaskWithProgress) => {
    const prevCount = task.progress?.learned_count ?? 0;
    const now = new Date().toISOString();

    // Optimistic update
    patchTask(task.id, (t) => ({
      ...t,
      progress: t.progress
        ? { ...t.progress, learned_count: prevCount + 1, last_practiced_at: now }
        : t.progress,
      progressPercent: Math.min(100, Math.round(((prevCount + 1) / (t.progress?.target_count ?? 10)) * 100)),
    }));

    try {
      await markPracticedToday(task.id, prevCount);
      addToast('success', `✅ "${task.name}" marked as practiced!`);
    } catch {
      // Rollback
      patchTask(task.id, () => task);
      addToast('error', 'Failed to update. Please try again.');
    }
  }, [patchTask, addToast]);

  const handleUpdateStage = useCallback(async (task: TaskWithProgress, stage: LearningStage) => {
    patchTask(task.id, (t) => ({
      ...t,
      progress: t.progress ? { ...t.progress, learning_stage: stage } : t.progress,
    }));

    try {
      await updateTaskProgress({ task_id: task.id, learning_stage: stage });
      addToast('success', `Stage updated to "${stage.replace('_', ' ')}"`);
    } catch {
      patchTask(task.id, () => task);
      addToast('error', 'Failed to update stage.');
    }
  }, [patchTask, addToast]);

  const handleUpdateInterest = useCallback(async (task: TaskWithProgress, level: InterestLevel) => {
    patchTask(task.id, (t) => ({
      ...t,
      progress: t.progress ? { ...t.progress, interest_level: level } : t.progress,
    }));

    try {
      await updateTaskProgress({ task_id: task.id, interest_level: level });
      addToast('success', 'Interest level updated');
    } catch {
      patchTask(task.id, () => task);
      addToast('error', 'Failed to update interest.');
    }
  }, [patchTask, addToast]);

  const handleToggleSchedule = useCallback(async (task: TaskWithProgress) => {
    const newVal = !task.progress?.is_scheduled_this_week;
    patchTask(task.id, (t) => ({
      ...t,
      progress: t.progress ? { ...t.progress, is_scheduled_this_week: newVal } : t.progress,
    }));

    try {
      await updateTaskProgress({ task_id: task.id, is_scheduled_this_week: newVal });
      addToast('success', newVal ? 'Scheduled for this week' : 'Unscheduled from this week');
    } catch {
      patchTask(task.id, () => task);
      addToast('error', 'Failed to update schedule.');
    }
  }, [patchTask, addToast]);

  const handleUpdateProgress = useCallback(async (payload: UpdateProgressPayload) => {
    const task = tasks.find((t) => t.id === payload.task_id);
    if (!task) return;

    try {
      await updateTaskProgress(payload);
      await load(); // refresh for complex updates
      addToast('success', 'Task updated successfully');
    } catch {
      addToast('error', 'Update failed. Please retry.');
    }
  }, [tasks, load, addToast]);

  const handleArchive = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await archiveTask(taskId);
      addToast('info', `"${task?.name}" archived`);
    } catch {
      if (task) setTasks((prev) => [...prev, task]);
      addToast('error', 'Archive failed.');
    }
  }, [tasks, addToast]);

  // ── Filtered + sorted tasks ──────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...tasks];

    // Tab filter — use actual DB stage names
    if (activeTab === 'today')    result = result.filter((t) => t.isDueToday);
    else if (activeTab === 'overdue')  result = result.filter((t) => t.isOverdue);
    else if (activeTab === 'mastered') result = result.filter((t) =>
      ['Confident', 'Comfortable'].includes(t.progress?.learning_stage ?? '')
    );

    // Advanced filters
    if (filter.subject) result = result.filter((t) => t.topic_id === filter.subject); // Note: filter by topic_id since subject_id isn't on task table
    if (filter.stage)   result = result.filter((t) => t.progress?.learning_stage === filter.stage);
    if (filter.dueToday) result = result.filter((t) => t.isDueToday);
    if (filter.overdue)  result = result.filter((t) => t.isOverdue);
    // is_scheduled_this_week is in task_progress, not task table
    if (filter.scheduledThisWeek) result = result.filter((t) => t.progress?.is_scheduled_this_week === true);
    if (filter.interestLevel) {
      result = result.filter((t) => (t.progress?.interest_level ?? 0) === filter.interestLevel);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortKey) {
        case 'next_due_at': {
          const aDate = a.progress?.next_due_at ?? '';
          const bDate = b.progress?.next_due_at ?? '';
          return aDate.localeCompare(bDate);
        }
        case 'progress':
          return b.progressPercent - a.progressPercent;
        case 'last_practiced_at': {
          const aDate = a.progress?.last_practiced_at ?? '';
          const bDate = b.progress?.last_practiced_at ?? '';
          return bDate.localeCompare(aDate);
        }
        case 'interest_level':
          return (b.progress?.interest_level ?? 0) - (a.progress?.interest_level ?? 0);
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, filter, sortKey, search, activeTab]);

  return {
    // Data
    tasks,
    filtered,
    loading,
    error,
    summary,
    // UI state
    filter,
    setFilter,
    sortKey,
    setSortKey,
    search,
    setSearch,
    activeTab,
    setActiveTab,
    darkMode,
    setDarkMode,
    toasts,
    // Actions
    load,
    handleMarkPracticed,
    handleUpdateStage,
    handleUpdateInterest,
    handleToggleSchedule,
    handleUpdateProgress,
    handleArchive,
    addToast,
  };
}
