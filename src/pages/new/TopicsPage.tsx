// ============================================================
// TopicsPage — Production-ready with real progress, ConfirmModal,
// toast, debounced search, and document title
// ============================================================
import { Layers, Search, BarChart2, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../../components/ui/BackButton';
import { HierarchicalCard } from '../../components/curriculum/HierarchicalCard';
import { CurriculumFormModal, type FormField } from '../../components/curriculum/CurriculumFormModal';
import { FloatingAddButton } from '../../components/curriculum/FloatingAddButton';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  fetchTopics,
  fetchSubjectById,
  createItem,
  updateItem,
  deleteItem,
} from '../../services/curriculumService';
import { useData } from '../../context/DataContext';
import { useToast } from '../../store/useToastStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDebounce } from '../../hooks/useDebounce';
import { normalizeDifficulty } from '../../utils/string';
import { isTopicCompleted } from '../../services/dataService';
import type { DbTopic, DbSubject } from '../../types/database';

const DIFFICULTY_BADGE: Record<string, string> = {
  Beginner:     'bg-emerald-100 text-emerald-700',
  Intermediate: 'bg-amber-100 text-amber-700',
  Advanced:     'bg-red-100 text-red-700',
};

const TOPIC_FIELDS: FormField[] = [
  { name: 'title',            label: 'Topic Title', type: 'text',     placeholder: 'e.g. Fractions & Decimals', required: true },
  { name: 'description',      label: 'Description', type: 'textarea', placeholder: 'What will be learned...' },
  { name: 'difficulty_level', label: 'Difficulty',  type: 'select',   options: [
    { value: 'Beginner',     label: 'Beginner'      },
    { value: 'Intermediate', label: 'Intermediate'  },
    { value: 'Advanced',     label: 'Advanced'      },
  ]},
];

export function TopicsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { rawTasks, taskProgress, rawSubjects } = useData();
  const toast = useToast();

  const [subject,        setSubject]        = useState<DbSubject | null>(null);
  const [topics,         setTopics]         = useState<DbTopic[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [search,         setSearch]         = useState('');
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editingTopic,   setEditingTopic]   = useState<DbTopic | null>(null);
  const [confirmId,      setConfirmId]      = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [visibleCount,   setVisibleCount]   = useState(50);

  const debouncedSearch = useDebounce(search, 300);

  const fields = useMemo(() => {
    if (subjectId) return TOPIC_FIELDS;
    const subjectOptions = rawSubjects.map(s => ({
      value: s.id,
      label: s.name,
    }));
    return [
      { name: 'subject_id', label: 'Subject', type: 'select' as const, options: subjectOptions, required: true },
      ...TOPIC_FIELDS
    ];
  }, [subjectId, rawSubjects]);

  useDocumentTitle(subject ? `${subject.name} · Topics` : 'Topics');

  useEffect(() => {
    loadData();
  }, [subjectId]);

  // Reset pagination on search
  useEffect(() => {
    setVisibleCount(50);
  }, [debouncedSearch]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      if (subjectId) {
        const [subjectData, topicsData] = await Promise.all([
          fetchSubjectById(subjectId),
          fetchTopics(subjectId),
        ]);
        setSubject(subjectData);
        setTopics(topicsData);
      } else {
        const topicsData = await fetchTopics();
        setSubject(null);
        setTopics(topicsData);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load topics.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(data: any) {
    try {
      if (editingTopic) {
        const updated = await updateItem<DbTopic>('topics', editingTopic.id, data);
        setTopics(topics.map(t => t.id === updated.id ? updated : t));
        toast.success(`"${updated.title}" updated`);
      } else {
        const created = await createItem<DbTopic>('topics', {
          ...data,
          subject_id:  subjectId,
          is_active:   true,
          order_index: topics.length,
        });
        setTopics([...topics, created]);
        toast.success(`"${created.title}" created!`);
      }
    } catch {
      toast.error('Failed to save topic.');
    }
  }

  async function handleConfirmDelete() {
    if (!confirmId) return;
    setConfirmLoading(true);
    try {
      await deleteItem('topics', confirmId);
      setTopics(topics.filter(t => t.id !== confirmId));
      toast.success('Topic deleted');
    } catch {
      toast.error('Failed to delete topic.');
    } finally {
      setConfirmLoading(false);
      setConfirmId(null);
    }
  }

  // Real per-topic stats from DataContext
  const topicStats = useMemo(() => {
    const map: Record<string, { tasksCount: number; completed: boolean; progress: number }> = {};
    for (const t of topics) {
      const tasks    = rawTasks.filter(tk => tk.topic_id === t.id);
      const done     = isTopicCompleted(t.id, rawTasks, taskProgress);
      const masteredTasks = tasks.filter(tk =>
        taskProgress.some(p => p.task_id === tk.id && ['Comfortable', 'Confident'].includes(p.learning_stage))
      ).length;
      const progress = tasks.length > 0 ? Math.round((masteredTasks / tasks.length) * 100) : 0;
      map[t.id] = { tasksCount: tasks.length, completed: done, progress };
    }
    return map;
  }, [topics, rawTasks, taskProgress]);

  const filtered = useMemo(() =>
    topics.filter(t =>
      t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      t.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [topics, debouncedSearch]
  );

  if (loading) return (
    <div className="space-y-6 animate-fade-in pb-24">
      <SkeletonGrid count={6} />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm text-red-400 mb-3">{error}</p>
      <button onClick={loadData} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors">
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
          <h1 className="text-2xl font-black text-gray-900">{subject?.name || 'All Topics'}</h1>
          <p className="text-sm text-gray-400">
            {topics.length} topic{topics.length !== 1 ? 's' : ''} · {subject ? 'Learning areas in this subject' : 'All registered learning areas'}
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search topics"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-violet-50 focus:border-violet-300 transition-all shadow-sm"
          />
        </div>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={subject ? "No topics in this subject" : "No topics found"}
          description={subject ? "Create topics to break this subject into manageable learning units." : "Add a topic to get started!"}
          actionLabel="Add Topic"
          onAction={() => setModalOpen(true)}
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">No topics match "{debouncedSearch}"</p>
          <button onClick={() => setSearch('')} className="mt-2 text-violet-600 text-sm font-medium">Clear search</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.slice(0, visibleCount).map((topic) => {
              const stats = topicStats[topic.id] ?? { tasksCount: 0, completed: false, progress: 0 };
              const difficulty = normalizeDifficulty(topic.difficulty_level);
              const parentSubject = rawSubjects.find(s => s.id === topic.subject_id);
              const subtitle = subject ? undefined : (parentSubject?.name || undefined);
              return (
                <HierarchicalCard
                  key={topic.id}
                  title={topic.title}
                  subtitle={subtitle}
                  description={topic.description || undefined}
                  icon={<Layers size={20} />}
                  badge={
                    stats.completed
                      ? <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Done</span>
                      : <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${DIFFICULTY_BADGE[difficulty] ?? 'bg-gray-100 text-gray-600'}`}>{difficulty}</span>
                  }
                  progress={stats.progress}
                  footerItems={[
                    { label: 'Tasks',    value: stats.tasksCount,                          icon: <BarChart2 size={12} /> },
                    { label: 'Progress', value: `${stats.progress}%` },
                  ]}
                  onEdit={() => { setEditingTopic(topic); setModalOpen(true); }}
                  onDelete={() => setConfirmId(topic.id)}
                  onClick={() => navigate(`/topics/${topic.id}/tasks`)}
                />
              );
            })}
          </div>
          {visibleCount < filtered.length && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setVisibleCount(v => v + 50)}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:border-violet-300 hover:text-violet-600 transition-colors shadow-sm"
              >
                Load More Topics
              </button>
            </div>
          )}
        </>
      )}

      <FloatingAddButton
        onClick={() => { setEditingTopic(null); setModalOpen(true); }}
        label="Add Topic"
      />

      <CurriculumFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTopic(null); }}
        title={editingTopic ? 'Edit Topic' : 'Add Topic'}
        fields={fields}
        initialData={editingTopic}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleConfirmDelete}
        loading={confirmLoading}
        title="Delete Topic?"
        message="This will remove the topic and all its tasks."
        confirmLabel="Delete Topic"
        danger
      />
    </div>
  );
}
