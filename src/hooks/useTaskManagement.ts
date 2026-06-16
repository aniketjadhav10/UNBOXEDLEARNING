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
  unarchiveTask,
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

export function useTaskManagement(childId: string, defaultTab: 'all' | 'today' | 'overdue' | 'mastered' | 'scheduled' | 'archived' = 'all') {
  // ── Data state ──────────────────────────────────────────────
  const [tasks, setTasks] = useState<TaskWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  // ── UI state ────────────────────────────────────────────────
  const [filter, setFilter] = useState<TaskFilter>(EMPTY_FILTER);
  const [sortKey, setSortKey] = useState<TaskSortKey>('next_due_at');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'overdue' | 'mastered' | 'scheduled' | 'archived'>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
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
      // Fetch all tasks including archived so client can filter
      const data = await fetchTasksWithProgress(childId, 'all');
      setTasks(data);
      // Only include active tasks in summary stats
      setSummary(computeDashboardSummary(data.filter(t => t.is_active !== false)));
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
    const targetCount = task.progress?.target_count ?? 5;
    const repeatInterval = task.progress?.repeat_interval ?? 1;
    const currentStage = task.progress?.learning_stage ?? 'Introduced';
    const now = new Date().toISOString();

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + repeatInterval);
    const nextDueAt = nextDueDate.toISOString();

    let newLearnedCount = prevCount + 1;
    let newStage = currentStage;
    let didUpgrade = false;

    if (newLearnedCount >= targetCount && currentStage !== 'Needs_Practice') {
      const stages: LearningStage[] = ['Not_Started', 'Introduced', 'Practicing', 'Comfortable', 'Confident'];
      const currentIndex = stages.indexOf(currentStage as LearningStage);
      if (currentIndex >= 0 && currentIndex < stages.length - 1) {
        newStage = stages[currentIndex + 1];
        newLearnedCount = 0;
        didUpgrade = true;
      }
    }

    if (newLearnedCount > targetCount) {
      newLearnedCount = targetCount;
    }

    // Optimistic update
    patchTask(task.id, (t) => ({
      ...t,
      progress: t.progress
        ? { 
            ...t.progress, 
            learned_count: newLearnedCount, 
            last_practiced_at: now,
            learning_stage: newStage,
            next_due_at: nextDueAt
          }
        : t.progress,
      progressPercent: Math.min(100, Math.round((newLearnedCount / targetCount) * 100)),
      isPracticedToday: true,
    }));

    try {
      await markPracticedToday(task.id, {
        learned_count: newLearnedCount,
        learning_stage: newStage,
        next_due_at: nextDueAt
      });
      addToast('success', `✅ "${task.name}" marked as practiced!`);
      if (didUpgrade) {
        setTimeout(() => {
          addToast('info', `🎉 Task upgraded to ${newStage.replace('_', ' ')}!`);
        }, 500);
      }
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

    let finalPayload = { ...payload };
    const targetCount = finalPayload.target_count ?? task.progress?.target_count ?? 5;
    const currentStage = finalPayload.learning_stage ?? task.progress?.learning_stage ?? 'Introduced';
    let newLearnedCount = finalPayload.learned_count ?? task.progress?.learned_count ?? 0;

    let didUpgrade = false;
    let upgradedStage = currentStage;

    if (newLearnedCount >= targetCount && currentStage !== 'Needs_Practice') {
      const stages: LearningStage[] = ['Not_Started', 'Introduced', 'Practicing', 'Comfortable', 'Confident'];
      const currentIndex = stages.indexOf(currentStage as LearningStage);
      if (currentIndex >= 0 && currentIndex < stages.length - 1) {
        upgradedStage = stages[currentIndex + 1];
        finalPayload.learning_stage = upgradedStage;
        newLearnedCount = 0;
        didUpgrade = true;
      }
    }

    if (newLearnedCount > targetCount) {
      newLearnedCount = targetCount;
    }
    finalPayload.learned_count = newLearnedCount;

    try {
      await updateTaskProgress(finalPayload);
      await load(); // refresh for complex updates
      if (didUpgrade) {
        addToast('success', `Task updated! 🎉 Auto-upgraded to ${upgradedStage.replace('_', ' ')}`);
      } else {
        addToast('success', 'Task updated successfully');
      }
    } catch {
      addToast('error', 'Update failed. Please retry.');
    }
  }, [tasks, load, addToast]);

  const handleArchive = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    patchTask(taskId, (t) => ({ ...t, is_active: false }));

    try {
      await archiveTask(taskId);
      addToast('info', `"${task?.name}" archived`);
    } catch {
      patchTask(taskId, () => task!);
      addToast('error', 'Archive failed.');
    }
  }, [tasks, patchTask, addToast]);

  const handleUnarchive = useCallback(async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    patchTask(taskId, (t) => ({ ...t, is_active: true }));

    try {
      await unarchiveTask(taskId);
      addToast('success', `"${task?.name}" restored`);
    } catch {
      patchTask(taskId, () => task!);
      addToast('error', 'Restore failed.');
    }
  }, [tasks, patchTask, addToast]);

  // ── Filtered + sorted tasks ──────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...tasks];

    // Filter by active vs archived
    if (activeTab === 'archived') {
      result = result.filter((t) => t.is_active === false);
    } else {
      result = result.filter((t) => t.is_active !== false); // active only

      // Tab filter — use actual DB stage names
      if (activeTab === 'today')    result = result.filter((t) => t.isDueToday);
      else if (activeTab === 'overdue')  result = result.filter((t) => t.isOverdue);
      else if (activeTab === 'mastered') result = result.filter((t) =>
        ['Confident', 'Comfortable'].includes(t.progress?.learning_stage ?? '')
      );
      else if (activeTab === 'scheduled') result = result.filter((t) => t.progress?.is_scheduled_this_week);
    }

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
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1; // Empty dates go to the bottom
          if (!bDate) return -1;
          return bDate.localeCompare(aDate); // Descending order
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
    handleUpdateProgress,
    handleArchive,
    handleUnarchive,
    handleToggleSchedule,
    addToast,
  };
}
