// ============================================================
// ActivitiesListPage — Hierarchical level 4: Activities for a Task
// Fixed: uses fetchTaskById, fetchTopicById, fetchSubjectById.
// Uses ConfirmModal, error state, debounced search.
// ============================================================
import { Zap, Search, Clock, Box, PlayCircle, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Breadcrumbs } from '../../components/curriculum/Breadcrumbs';
import { HierarchicalCard } from '../../components/curriculum/HierarchicalCard';
import { CurriculumFormModal, type FormField } from '../../components/curriculum/CurriculumFormModal';
import { FloatingAddButton } from '../../components/curriculum/FloatingAddButton';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  fetchActivitiesByTask,
  fetchTaskById,
  fetchTopicById,
  fetchSubjectById,
  createItem,
  updateItem,
  deleteItem,
} from '../../services/curriculumService';
import { useToast } from '../../store/useToastStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDebounce } from '../../hooks/useDebounce';
import type { DbTopic, DbSubject, DbTask, DbActivity } from '../../types/database';

const ACTIVITY_FIELDS: FormField[] = [
  { name: 'name',      label: 'Activity Name',    type: 'text',     placeholder: 'e.g. Interactive Quiz',  required: true },
  { name: 'type',      label: 'Type',             type: 'select',   options: [
    { value: 'Quiz',         label: 'Quiz'               },
    { value: 'Reading',      label: 'Reading'            },
    { value: 'Video',        label: 'Video'              },
    { value: 'Hands-on',     label: 'Hands-on Project'   },
    { value: 'Discussion',   label: 'Discussion'         },
    { value: 'Practice',     label: 'Practice'           },
    { value: 'Assessment',   label: 'Assessment'         },
  ]},
  { name: 'materials', label: 'Materials Required', type: 'text', placeholder: 'e.g. Paper, Scissors' },
];

export function ActivitiesListPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const toast = useToast();

  const [task,       setTask]       = useState<DbTask | null>(null);
  const [topic,      setTopic]      = useState<DbTopic | null>(null);
  const [subject,    setSubject]    = useState<DbSubject | null>(null);
  const [activities, setActivities] = useState<DbActivity[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [search,     setSearch]     = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [modalOpen,       setModalOpen]       = useState(false);
  const [editingActivity, setEditingActivity] = useState<DbActivity | null>(null);
  const [confirmId,       setConfirmId]       = useState<string | null>(null);
  const [confirmLoading,  setConfirmLoading]  = useState(false);
  const [visibleCount,    setVisibleCount]    = useState(50);

  useDocumentTitle(task ? `${task.name} · Activities` : 'Activities');

  useEffect(() => {
    if (taskId) loadData();
  }, [taskId]);

  // Reset pagination on search
  useEffect(() => {
    setVisibleCount(50);
  }, [debouncedSearch]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [taskData, activitiesData] = await Promise.all([
        fetchTaskById(taskId!),
        fetchActivitiesByTask(taskId!),
      ]);
      setTask(taskData);
      setActivities(activitiesData);

      if (taskData?.topic_id) {
        const topicData = await fetchTopicById(taskData.topic_id);
        setTopic(topicData);
        if (topicData?.subject_id) {
          const subjectData = await fetchSubjectById(topicData.subject_id);
          setSubject(subjectData);
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load activities.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(data: any) {
    if (editingActivity) {
      const updated = await updateItem<DbActivity>('activities', editingActivity.id, data);
      setActivities(activities.map(a => a.id === updated.id ? updated : a));
      toast.success('Activity updated');
    } else {
      const created = await createItem<DbActivity>('activities', {
        ...data,
        task_id:     taskId,
        is_active:   true,
        order_index: activities.length,
      });
      setActivities([...activities, created]);
      toast.success('Activity created!');
    }
  }

  async function handleConfirmDelete() {
    if (!confirmId) return;
    setConfirmLoading(true);
    try {
      await deleteItem('activities', confirmId);
      setActivities(activities.filter(a => a.id !== confirmId));
      toast.success('Activity deleted');
    } catch {
      toast.error('Failed to delete activity.');
    } finally {
      setConfirmLoading(false);
      setConfirmId(null);
    }
  }

  const filtered = activities.filter(a =>
    a.name.toLowerCase().includes(debouncedSearch.toLowerCase())
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
      <h3 className="text-base font-bold text-gray-800 mb-2">Failed to load activities</h3>
      <p className="text-sm text-gray-400 mb-4">{error}</p>
      <button onClick={loadData} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors">
        Try Again
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in pb-24">
      <Breadcrumbs items={[
        { label: subject?.name || 'Subject', path: subject ? `/subjects/${subject.id}/topics` : '/subjects' },
        { label: topic?.title  || 'Topic',   path: topic   ? `/topics/${topic.id}/tasks`         : '/subjects' },
        { label: task?.name    || 'Task',    path: topic   ? `/topics/${topic.id}/tasks`         : '/subjects' },
        { label: 'Activities' },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">{task?.name || 'Activities'}</h1>
          <p className="text-sm text-gray-400">
            {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search activities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-violet-50 focus:border-violet-300 transition-all shadow-sm"
            aria-label="Search activities"
          />
        </div>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No activities yet"
          description="Add learning activities like quizzes, videos, or readings to this task."
          actionLabel="Add Activity"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.slice(0, visibleCount).map((activity) => (
              <HierarchicalCard
                key={activity.id}
                title={activity.name}
                subtitle={activity.type || undefined}
                description={activity.materials ? `Materials: ${activity.materials}` : undefined}
                icon={<PlayCircle size={20} />}
                badge={<span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-bold">READY</span>}
                footerItems={[
                  { label: 'Type',      value: activity.type || 'General', icon: <Box size={12} /> },
                  { label: 'Status',    value: 'Active',                   icon: <Clock size={12} /> },
                ]}
                onEdit={() => { setEditingActivity(activity); setModalOpen(true); }}
                onDelete={() => setConfirmId(activity.id)}
                onClick={() => {}} // Terminal node
              />
            ))}
          </div>
          {visibleCount < filtered.length && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setVisibleCount(v => v + 50)}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:border-violet-300 hover:text-violet-600 transition-colors shadow-sm"
              >
                Load More Activities
              </button>
            </div>
          )}
        </>
      )}

      <FloatingAddButton
        onClick={() => { setEditingActivity(null); setModalOpen(true); }}
        label="Add Activity"
      />

      <CurriculumFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingActivity(null); }}
        title={editingActivity ? 'Edit Activity' : 'Add Activity'}
        fields={ACTIVITY_FIELDS}
        initialData={editingActivity}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleConfirmDelete}
        loading={confirmLoading}
        title="Delete Activity?"
        message="This activity will be permanently removed from this task."
        confirmLabel="Delete Activity"
        danger
      />
    </div>
  );
}
