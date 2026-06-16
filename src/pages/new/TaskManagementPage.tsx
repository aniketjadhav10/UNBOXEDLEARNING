// ============================================================
// TaskManagementPage — Main homeschool task tracking dashboard
// ============================================================
import {
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  Moon,
  RefreshCw,
  Sun,
  Zap,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskCard, TaskCardSkeleton } from '../../components/tasks/TaskCard';
import { TaskDetailsDrawer } from '../../components/tasks/TaskDetailsDrawer';
import { CurriculumFormModal, type FormField } from '../../components/curriculum/CurriculumFormModal';
import { TaskFilters } from '../../components/tasks/TaskFilters';
import { TaskToastContainer } from '../../components/tasks/TaskToastContainer';
import { useTaskManagement } from '../../hooks/useTaskManagement';
import type { TaskWithProgress } from '../../types/taskTypes';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useSettingsStore } from '../../store/useSettingsStore';
import { createItem } from '../../services/curriculumService';
import { assignTaskToChild } from '../../services/taskService';
import { supabase } from '../../services/supabase';
import type { DbTask, DbActivity } from '../../types/database';

// ── Tab config ──────────────────────────────────────────────
const TABS = [
  { key: 'all',      label: 'All Tasks'   },
  { key: 'today',    label: '📅 Today'    },
  { key: 'overdue',  label: '⚠ Overdue'  },
  { key: 'mastered', label: '⭐ Mastered' },
  { key: 'scheduled', label: '📌 Scheduled' },
  { key: 'archived',  label: '📦 Archived'  },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ── Empty state ─────────────────────────────────────────────
function EmptyTaskState({ tab }: { tab: TabKey }) {
  const messages: Record<TabKey, { icon: string; title: string; desc: string }> = {
    all:      { icon: '📚', title: 'No tasks yet',           desc: 'Add learning tasks to start tracking progress.' },
    today:    { icon: '🎉', title: 'All caught up!',         desc: 'No tasks are due today. Enjoy the day!' },
    overdue:  { icon: '✅', title: 'No overdue tasks',       desc: 'Great job keeping up with the schedule!' },
    mastered: { icon: '🌟', title: 'No mastered tasks yet',  desc: 'Keep practicing to reach mastery levels.' },
    scheduled:{ icon: '📌', title: 'No scheduled tasks',     desc: 'Click "Learn this week" on a task to prioritize it.' },
    archived: { icon: '📦', title: 'No archived tasks',      desc: 'Tasks you archive will appear here.' },
  };
  const { icon, title, desc } = messages[tab];
  return (
    <div className="text-center py-16">
      <span className="text-5xl">{icon}</span>
      <h3 className="mt-4 font-bold text-gray-700 text-base">{title}</h3>
      <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">{desc}</p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export function TaskManagementPage({ defaultTab = 'all' }: { defaultTab?: TabKey }) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { selectedChildId } = useSettingsStore();
  const { subjects, topics, kids } = useData(); // Get subjects and topics for the form
  
  // Admin manages a selected child, Student manages themselves
  const resolvedChildId = selectedChildId || (kids.length === 1 ? kids[0].id : null);
  const childId = isAdmin ? (resolvedChildId || user?.id || '') : (user?.id || '');

  const {
    filtered, loading, error, summary,
    filter, setFilter, sortKey, setSortKey,
    search, setSearch, activeTab, setActiveTab,
    darkMode, setDarkMode,
    toasts, addToast, load,
    handleMarkPracticed, handleUpdateStage,
    handleUpdateInterest, handleUpdateProgress, handleArchive,
    handleUnarchive, handleToggleSchedule,
  } = useTaskManagement(childId, defaultTab);

  const [drawerTask, setDrawerTask] = useState<TaskWithProgress | null>(null);
  const [activitiesMap, setActivitiesMap] = useState<Record<string, DbActivity[]>>({});
  const [visibleCount, setVisibleCount] = useState(50);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(50);
  }, [filter, sortKey, search, activeTab]);

  // Derive options for filters and forms
  const subjectOptions = subjects.map(s => ({ id: s.id, name: s.name }));
  
  const topicOptions = topics.map(t => ({ value: t.id, label: t.title }));

  const TASK_FIELDS: FormField[] = [
    { name: 'topic_id',         label: 'Topic',       type: 'select',   options: topicOptions, required: true },
    { name: 'name',             label: 'Task Name',   type: 'text',     placeholder: 'e.g. Solve 2D Word Problems', required: true },
    { name: 'description',      label: 'Description', type: 'textarea', placeholder: 'Specific instructions or goals...' },
    { name: 'difficulty_level', label: 'Difficulty',  type: 'select',   options: [
      { value: 'Beginner',     label: 'Beginner'      },
      { value: 'Intermediate', label: 'Intermediate'  },
      { value: 'Advanced',     label: 'Advanced'      },
    ]},
  ];

  async function handleCreateTask(data: any) {
    if (isAdmin && !resolvedChildId) {
      addToast('error', 'Please select a child from the dashboard before adding a task.');
      return;
    }

    const task = await createItem<DbTask>('tasks', {
      ...data,
      is_active:    true,
      order_index:  0, // Top of the list
      source_type:  'manual',
    });

    if (task && childId) {
      try {
        await assignTaskToChild(task.id, childId);
      } catch (err) {
        console.error("Assignment failed:", err);
      }
    }

    // Reload tasks
    load();
    setIsAddModalOpen(false);
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="space-y-6 animate-fade-in">

        {/* ── Page Header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                <BrainCircuit size={16} className="text-white" />
              </div>
              <h1 className="text-xl font-black text-gray-900">Learning Tasks</h1>
            </div>
            <p className="text-sm text-gray-400 pl-0.5">
              Track practice sessions, stages, and learning velocity
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode((v) => !v)}
              className="p-2.5 bg-white border border-gray-200 text-gray-400 hover:text-violet-600 hover:border-violet-300 rounded-xl transition-all"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Refresh */}
            <button
              onClick={load}
              disabled={loading}
              className="p-2.5 bg-white border border-gray-200 text-gray-400 hover:text-violet-600 hover:border-violet-300 rounded-xl transition-all disabled:animate-spin"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>

            {/* Add task */}
            <button
              id="add-task-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm active:scale-95"
            >
              <CalendarCheck size={15} />
              <span className="hidden sm:inline">Add Task</span>
            </button>
          </div>
        </div>



        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              id={`tab-${key}`}
              onClick={() => setActiveTab(key)}
              className={[
                'flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200',
                activeTab === key
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Filters ─────────────────────────────────────────── */}
        <TaskFilters
          filter={filter}
          onFilterChange={setFilter}
          sortKey={sortKey}
          onSortChange={setSortKey}
          search={search}
          onSearchChange={setSearch}
          subjectOptions={subjectOptions}
        />

        {/* ── Error state ─────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-700">Failed to load tasks</p>
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
              <button
                onClick={load}
                className="mt-2 text-xs font-semibold text-red-600 underline hover:text-red-800"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Task Grid ───────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <TaskCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyTaskState tab={activeTab as TabKey} />
        ) : (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                <BookOpen size={12} />
                {filtered.length} task{filtered.length !== 1 ? 's' : ''}
              </p>

              {/* AI insight chip */}
              <div className="flex items-center gap-1.5 text-xs text-violet-500 bg-violet-50 px-2.5 py-1 rounded-full font-medium">
                <BrainCircuit size={11} />
                AI insights active
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.slice(0, visibleCount).map((task) => {
                const topic = topics.find(t => t.id === task.topic_id);
                const subjectName = subjects.find(s => s.id === topic?.subjectId)?.name;
                
                return (
                  <TaskCard
                    key={task.id}
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
                );
              })}
            </div>

            {visibleCount < filtered.length && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setVisibleCount(v => v + 50)}
                  className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:border-violet-300 hover:text-violet-600 transition-colors shadow-sm"
                >
                  Load More Tasks
                </button>
              </div>
            )}
          </>
        )}
      </div>

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

      {/* ── Add Task Modal ──────────────────────────────────── */}
      <CurriculumFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Task"
        fields={TASK_FIELDS}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}
