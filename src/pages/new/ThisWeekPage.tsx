// ============================================================
// ThisWeekPage — Shows all tasks marked as "scheduled this week"
// ============================================================
import { CalendarCheck, Search, RefreshCw, AlertTriangle, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/ui/BackButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { StaggerContainer, StaggerItem } from '../../components/motion/MotionWrappers';

import { TaskCard, TaskCardSkeleton } from '../../components/tasks/TaskCard';
import { TaskDetailsDrawer } from '../../components/tasks/TaskDetailsDrawer';
import { TaskToastContainer } from '../../components/tasks/TaskToastContainer';
import { useTaskManagement } from '../../hooks/useTaskManagement';
import { supabase } from '../../services/supabase';
import type { TaskWithProgress } from '../../types/taskTypes';
import type { DbActivity } from '../../types/database';

export function ThisWeekPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { kids, subjects, topics } = useData();
  const { selectedChildId } = useSettingsStore();

  const resolvedChildId = selectedChildId || (kids.length === 1 ? kids[0].id : null);
  const childId = isAdmin ? (resolvedChildId || user?.id || '') : (user?.id || '');

  const {
    filtered, loading, error,
    search, setSearch,
    toasts, load,
    handleMarkPracticed, handleUpdateStage,
    handleUpdateInterest, handleUpdateProgress, handleArchive,
    handleUnarchive, handleToggleSchedule,
  } = useTaskManagement(childId, 'scheduled');

  const [drawerTask, setDrawerTask] = useState<TaskWithProgress | null>(null);
  const [activitiesMap, setActivitiesMap] = useState<Record<string, DbActivity[]>>({});
  const [weekTab, setWeekTab] = useState<'pending' | 'learned_today'>('pending');

  useEffect(() => {
    async function fetchActivities() {
      const taskIds = filtered.map(t => t.id);
      if (taskIds.length === 0) return;

      const { data: acts } = await supabase
        .from('activities')
        .select('*')
        .in('task_id', taskIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
        
      if (acts) {
        const actMap: Record<string, DbActivity[]> = {};
        acts.forEach(a => {
          if (!actMap[a.task_id]) actMap[a.task_id] = [];
          actMap[a.task_id].push(a);
        });
        setActivitiesMap(actMap);
      }
    }
    fetchActivities();
  }, [filtered]);

  useDocumentTitle('This Week');

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-red-400" />
      </div>
      <h3 className="text-base font-bold text-gray-800 mb-2">Failed to load</h3>
      <p className="text-sm text-gray-400 mb-4">{error}</p>
      <button
        onClick={load}
        className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in pb-4">
      <div className="mb-2">
        <BackButton />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <CalendarCheck size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">This Week</h1>
            <p className="text-sm text-gray-400">
              {filtered.length} task{filtered.length !== 1 ? 's' : ''} scheduled for this week
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-violet-50 focus:border-violet-300 transition-all shadow-sm"
              aria-label="Search this week's tasks"
            />
          </div>
          <button
            onClick={load}
            className="p-2.5 bg-white border border-gray-200 text-gray-400 hover:text-violet-600 rounded-xl transition-colors flex-shrink-0"
            aria-label="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6">
        <button
          onClick={() => setWeekTab('pending')}
          className={[
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200',
            weekTab === 'pending'
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          ].join(' ')}
        >
          Pending ({filtered.filter(t => !t.isPracticedToday).length})
        </button>
        <button
          onClick={() => setWeekTab('learned_today')}
          className={[
            'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200',
            weekTab === 'learned_today'
              ? 'bg-white text-violet-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          ].join(' ')}
        >
          Learned Today ({filtered.filter(t => t.isPracticedToday).length})
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <TaskCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 && !search ? (
        <EmptyState
          icon={CalendarCheck}
          title="No tasks scheduled this week"
          description="Mark tasks as 'Scheduled This Week' from the task schedule dialog to see them here."
        />
      ) : (() => {
        const displayedTasks = filtered.filter(t => weekTab === 'learned_today' ? t.isPracticedToday : !t.isPracticedToday);
        if (displayedTasks.length === 0) {
          return (
            <EmptyState
              icon={Search}
              title={weekTab === 'learned_today' ? "No tasks learned today" : "No pending tasks!"}
              description={weekTab === 'learned_today' ? "Complete some pending tasks to see them here." : "Great job! You've learned all tasks for today."}
            />
          );
        }
        return (
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedTasks.map((task) => {
              const topic = topics.find(t => t.id === task.topic_id);
            const subjectName = subjects.find(s => s.id === topic?.subjectId)?.name;
            return (
              <StaggerItem key={task.id}>
                <TaskCard
                  task={task}
                  onMarkPracticed={handleMarkPracticed}
                  onUpdateStage={handleUpdateStage}
                  onUpdateInterest={handleUpdateInterest}
                  onToggleSchedule={handleToggleSchedule}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  onOpenDetails={(t) => setDrawerTask(t)}
                  subjectName={subjectName}
                  expandableContent={
                    <div className="space-y-2">
                      {(!activitiesMap[task.id] || activitiesMap[task.id].length === 0) ? (
                        <p className="text-xs text-gray-400 text-center py-2">No activities yet.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {activitiesMap[task.id].slice(0, 5).map(act => (
                            <li
                              key={act.id}
                              className="flex items-center gap-2 text-xs text-gray-600 p-1.5 hover:bg-violet-50 hover:text-violet-700 rounded-md cursor-pointer transition-colors"
                              onClick={() => navigate(`/tasks/${task.id}/activities`)}
                            >
                              <Zap size={12} className="text-violet-400 flex-shrink-0" />
                              <span className="truncate flex-1 font-medium">{act.name}</span>
                              {act.type && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded">{act.type}</span>}
                            </li>
                          ))}
                          {activitiesMap[task.id].length > 5 && (
                            <li className="text-center text-[10px] text-gray-400 pt-1">
                              + {activitiesMap[task.id].length - 5} more activities
                            </li>
                          )}
                        </ul>
                      )}
                      <button
                        onClick={() => navigate(`/tasks/${task.id}/activities`)}
                        className="w-full text-center text-[11px] font-bold text-violet-600 hover:text-violet-700 py-1"
                      >
                        Manage Activities
                      </button>
                    </div>
                  }
                />
              </StaggerItem>
            );
          })}
        </StaggerContainer>
        );
      })()}

      {/* ── Details Drawer ──────────────────────────────────── */}
      {drawerTask && (
        <TaskDetailsDrawer
          task={drawerTask}
          onClose={() => setDrawerTask(null)}
          onUpdateProgress={handleUpdateProgress}
        />
      )}

      {/* ── Toast Notifications ─────────────────────────────── */}
      <TaskToastContainer toasts={toasts} />
    </div>
  );
}
