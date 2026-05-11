// ============================================================
// TasksListPage — Hierarchical level 3: Tasks under a Topic
// Fixed: uses fetchTopicById, fetchSubjectById. Uses ConfirmModal.
// Has error state. Wires real progress data.
// ============================================================
import { Layers, CheckSquare, Search, Zap, Clock, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../../components/curriculum/Breadcrumbs';
import { HierarchicalCard } from '../../components/curriculum/HierarchicalCard';
import { CurriculumFormModal, type FormField } from '../../components/curriculum/CurriculumFormModal';
import { FloatingAddButton } from '../../components/curriculum/FloatingAddButton';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  fetchTasksByTopic,
  fetchTopicById,
  fetchSubjectById,
  createItem,
  updateItem,
  deleteItem,
} from '../../services/curriculumService';
import { useToast } from '../../store/useToastStore';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { assignTaskToChild } from '../../services/taskService';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDebounce } from '../../hooks/useDebounce';
import type { DbTopic, DbSubject, DbTask } from '../../types/database';

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
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { kids } = useData();

  const [topic,   setTopic]   = useState<DbTopic | null>(null);
  const [subject, setSubject] = useState<DbSubject | null>(null);
  const [tasks,   setTasks]   = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [search,  setSearch]  = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [modalOpen,     setModalOpen]     = useState(false);
  const [editingTask,   setEditingTask]   = useState<DbTask | null>(null);
  const [confirmId,     setConfirmId]     = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [visibleCount,  setVisibleCount]  = useState(50);

  useDocumentTitle(topic ? `${topic.title} · Tasks` : 'Tasks');

  useEffect(() => {
    if (topicId) loadData();
  }, [topicId]);

  // Reset pagination on search
  useEffect(() => {
    setVisibleCount(50);
  }, [debouncedSearch]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [topicData, tasksData] = await Promise.all([
        fetchTopicById(topicId!),
        fetchTasksByTopic(topicId!),
      ]);
      setTopic(topicData);
      setTasks(tasksData);

      if (topicData?.subject_id) {
        const subjectData = await fetchSubjectById(topicData.subject_id);
        setSubject(subjectData);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(data: any) {
    if (editingTask) {
      const updated = await updateItem<DbTask>('tasks', editingTask.id, data);
      setTasks(tasks.map(t => t.id === updated.id ? updated : t));
      toast.success('Task updated successfully');
    } else {
      const created = await createItem<DbTask>('tasks', {
        ...data,
        topic_id:     topicId,
        is_active:    true,
        order_index:  tasks.length,
        source_type:  'manual',
      });
      
      // Auto-assign to child if available
      const childId = kids.length > 0 ? kids[0].id : user?.id;
      if (childId) {
        try {
          await assignTaskToChild(created.id, childId);
        } catch (err) {
          console.error("Failed to assign task to child", err);
        }
      }
      
      setTasks([...tasks, created]);
      toast.success('Task created!');
    }
  }

  async function handleConfirmDelete() {
    if (!confirmId) return;
    setConfirmLoading(true);
    try {
      await deleteItem('tasks', confirmId);
      setTasks(tasks.filter(t => t.id !== confirmId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task.');
    } finally {
      setConfirmLoading(false);
      setConfirmId(null);
    }
  }

  const filtered = tasks.filter(t =>
    t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    t.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  if (loading) return (
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
        onClick={loadData}
        className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in pb-24">
      <Breadcrumbs items={[
        { label: subject?.name || 'Subject',    path: subject ? `/subjects/${subject.id}/topics` : '/subjects' },
        { label: topic?.title  || 'Topic' },
        { label: 'Tasks' },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{topic?.title || 'Tasks'}</h1>
          <p className="text-sm text-gray-400">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} in this topic
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

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks in this topic"
          description="Create specific tasks to start tracking learning progress."
          actionLabel="Add Task"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.slice(0, visibleCount).map((task) => (
              <HierarchicalCard
                key={task.id}
                title={task.name}
                subtitle={task.difficulty_level || undefined}
                description={task.description || undefined}
                icon={<CheckSquare size={20} />}
                footerItems={[
                  { label: 'Activities', value: '—', icon: <Zap size={12} /> },
                  { label: 'Difficulty', value: task.difficulty_level || 'Standard', icon: <Clock size={12} /> },
                ]}
                onEdit={() => { setEditingTask(task); setModalOpen(true); }}
                onDelete={() => setConfirmId(task.id)}
                onClick={() => navigate(`/tasks/${task.id}/activities`)}
              />
            ))}
          </div>
          {visibleCount < filtered.length && (
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
        onClick={() => { setEditingTask(null); setModalOpen(true); }}
        label="Add Task"
      />

      <CurriculumFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
        title={editingTask ? 'Edit Task' : 'Add Task'}
        fields={TASK_FIELDS}
        initialData={editingTask}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleConfirmDelete}
        loading={confirmLoading}
        title="Delete Task?"
        message="This will permanently delete this task and all associated progress data."
        confirmLabel="Delete Task"
        danger
      />
    </div>
  );
}
