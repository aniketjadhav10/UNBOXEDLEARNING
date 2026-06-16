// ============================================================
// TasksListPage — Hierarchical level 3: Tasks under a Topic
// ============================================================
import { CheckSquare, Search, AlertTriangle, BookOpen, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../../components/ui/BackButton';
import { FloatingAddButton } from '../../components/curriculum/FloatingAddButton';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { StaggerContainer, StaggerItem } from '../../components/motion/MotionWrappers';

import { TaskCard, TaskCardSkeleton } from '../../components/tasks/TaskCard';
import { TaskDetailsDrawer } from '../../components/tasks/TaskDetailsDrawer';
import { TaskToastContainer } from '../../components/tasks/TaskToastContainer';
import { useTaskManagement } from '../../hooks/useTaskManagement';
import { CurriculumFormModal, type FormField } from '../../components/curriculum/CurriculumFormModal';

import { fetchTopicById, createItem } from '../../services/curriculumService';
import { assignTaskToChild } from '../../services/taskService';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { supabase } from '../../services/supabase';
import type { DbTopic, DbTask, DbActivity } from '../../types/database';
import type { TaskWithProgress } from '../../types/taskTypes';

const TASK_FIELDS: FormField[] = [
  { name: 'name',             label: 'Task Name',   type: 'text',     placeholder: 'e.g. Solve 2D Word Problems', required: true },
  { name: 'description',      label: 'Description', type: 'textarea', placeholder: 'Specific instructions or goals...' },
  { name: 'difficulty_level', label: 'Difficulty',  type: 'select',   options: [
    { value: 'Beginner',     label: 'Beginner'      },
    { value: 'Intermediate', label: 'Intermediate'  },
    { value: 'Advanced',     label: 'Advanced'      },
  ]},
];

export function TasksListPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const { user, isAdmin } = useAuth();
  const { kids, subjects } = useData();
  const { selectedChildId } = useSettingsStore();

  const resolvedChildId = selectedChildId || (kids.length === 1 ? kids[0].id : null);
  const childId = isAdmin ? (resolvedChildId || user?.id || '') : (user?.id || '');

  const [topic, setTopic] = useState<DbTopic | null>(null);
  const [topicLoading, setTopicLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [drawerTask, setDrawerTask] = useState<TaskWithProgress | null>(null);
  const [activitiesMap, setActivitiesMap] = useState<Record<string, DbActivity[]>>({});
  const [visibleCount, setVisibleCount] = useState(50);
  const navigate = useNavigate();

  const {
    filtered, loading, error,
    search, setSearch,
    toasts, addToast, load,
    handleMarkPracticed, handleUpdateStage,
    handleUpdateInterest, handleUpdateProgress, handleArchive,
    handleUnarchive, handleToggleSchedule,
  } = useTaskManagement(childId, 'all');

  useDocumentTitle(topic ? `${topic.title} · Tasks` : 'Tasks');

  useEffect(() => {
    if (topicId) {
      setTopicLoading(true);
      fetchTopicById(topicId)
        .then(t => setTopic(t))
        .catch(console.error)
        .finally(() => setTopicLoading(false));
    }
  }, [topicId]);

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

  // Reset pagination on search
  useEffect(() => {
    setVisibleCount(50);
  }, [search]);

  async function handleCreateTask(data: any) {
    if (isAdmin && !resolvedChildId) {
      addToast('error', 'Please select a child before adding a task.');
      return;
    }

    try {
      const created = await createItem<DbTask>('tasks', {
        ...data,
        topic_id:     topicId,
        is_active:    true,
        order_index:  0,
        source_type:  'manual',
      });
      
      if (childId) {
        await assignTaskToChild(created.id, childId);
      }
      
      addToast('success', 'Task created!');
      setIsAddModalOpen(false);
      load(); // Refresh tasks
    } catch (err) {
      addToast('error', 'Failed to create task.');
    }
  }

  // Only show tasks for the current topic
  const topicTasks = filtered.filter(t => t.topic_id === topicId);
  const subjectName = topic ? subjects.find(s => s.id === topic.subject_id)?.name : undefined;

  if (topicLoading || loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-5 w-64 bg-gray-100 rounded animate-pulse" />
      <SkeletonGrid count={6} />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-red-400" />
      </div>
      <h3 className="text-base font-bold text-gray-800 mb-2">Failed to load tasks</h3>
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
        <div>
          <h1 className="text-2xl font-black text-gray-900">{topic?.title || 'Tasks'}</h1>
          <p className="text-sm text-gray-400">
            {topicTasks.length} task{topicTasks.length !== 1 ? 's' : ''} in this topic
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-violet-50 focus:border-violet-300 transition-all shadow-sm"
            aria-label="Search tasks"
          />
        </div>
      </div>

      {topicTasks.length === 0 && !search ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks in this topic"
          description="Create specific tasks to start tracking learning progress."
          actionLabel="Add Task"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : topicTasks.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching tasks"
          description="Try a different search term."
        />
      ) : (
        <>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {topicTasks.slice(0, visibleCount).map((task) => (
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
            ))}
          </StaggerContainer>
          
          {visibleCount < topicTasks.length && (
            <div className="flex justify-center mt-8">
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

      <FloatingAddButton
        onClick={() => setIsAddModalOpen(true)}
        label="Add Task"
      />

      <CurriculumFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Task"
        fields={TASK_FIELDS}
        onSubmit={handleCreateTask}
      />

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
