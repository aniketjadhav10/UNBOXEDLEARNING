// ============================================================
// SubjectsPage — Production-ready with real progress, ConfirmModal,
// toast, debounced search, child_id from auth, and document title
// ============================================================
import { BookOpen, Search, BarChart2, Hash, Wand2, LibraryBig, Plus } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/ui/BackButton';
import { HierarchicalCard } from '../../components/curriculum/HierarchicalCard';
import { CurriculumFormModal, type FormField } from '../../components/curriculum/CurriculumFormModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { fetchSubjects, createItem, updateItem, deleteItem } from '../../services/curriculumService';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../store/useToastStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDebounce } from '../../hooks/useDebounce';
import { subjectEmoji, normalizeDifficulty } from '../../utils/string';
import type { DbSubject } from '../../types/database';

const SUBJECT_FIELDS: FormField[] = [
  { name: 'name',        label: 'Subject Name', type: 'text',     placeholder: 'e.g. Mathematics',           required: true },
  { name: 'description', label: 'Description',  type: 'textarea', placeholder: 'Short summary of the subject...' },
  { name: 'color',       label: 'Theme Color',  type: 'text',     placeholder: '#8b5cf6' },
];

export function SubjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subjects: appSubjects, rawTopics, rawTasks, taskProgress, rawChildren } = useData();
  const { selectedChildId } = useSettingsStore();
  const toast = useToast();

  const childId = selectedChildId || rawChildren?.[0]?.id || '';

  useDocumentTitle('Subjects');

  const [subjects,        setSubjects]        = useState<DbSubject[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [search,          setSearch]          = useState('');
  const [modalOpen,       setModalOpen]       = useState(false);
  const [editingSubject,  setEditingSubject]  = useState<DbSubject | null>(null);
  const [confirmId,       setConfirmId]       = useState<string | null>(null);
  const [confirmLoading,  setConfirmLoading]  = useState(false);
  const [visibleCount,    setVisibleCount]    = useState(50);
  const [generatingAi,    setGeneratingAi]    = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { loadSubjects(); }, [childId]);

  // Reset pagination on search
  useEffect(() => {
    setVisibleCount(50);
  }, [debouncedSearch]);

  async function loadSubjects() {
    try {
      setLoading(true);
      setError(null);
      if (!childId) {
        setSubjects([]);
      } else {
        const data = await fetchSubjects(childId);
        setSubjects(data);
      }
    } catch (err) {
      setError('Failed to load subjects.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(data: any) {
    try {
      if (editingSubject) {
        const updated = await updateItem<DbSubject>('subjects', editingSubject.id, data);
        setSubjects(subjects.map(s => s.id === updated.id ? updated : s));
        toast.success(`"${updated.name}" updated`);
      } else {
        // Create subject in the global library and enroll the first child
        const childId = rawChildren?.[0]?.id ?? '';
        if (!childId) {
          toast.error('No child profile found. Please create a child profile first.');
          return;
        }

        const { createSubjectAndEnroll } = await import('../../services/curriculumService');
        const created = await createSubjectAndEnroll(
          { name: data.name, description: data.description, color: data.color },
          childId
        );
        setSubjects([...subjects, created]);
        toast.success(`"${created.name}" created and enrolled!`);
      }
    } catch {
      toast.error('Failed to save subject. Please try again.');
    }
  }

  async function handleConfirmDelete() {
    if (!confirmId) return;
    setConfirmLoading(true);
    try {
      await deleteItem('subjects', confirmId);
      setSubjects(subjects.filter(s => s.id !== confirmId));
      toast.success('Subject deleted');
    } catch {
      toast.error('Failed to delete subject.');
    } finally {
      setConfirmLoading(false);
      setConfirmId(null);
    }
  }

  async function handleGenerateAi() {
    if (!editingSubject) return;
    setGeneratingAi(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/generateTopics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          subject_id: editingSubject.id,
          subject_name: editingSubject.name,
          child_id: childId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate content');
      }

      toast.success('AI successfully generated topics & tasks!');
      // Reload subjects or just close
      setModalOpen(false);
      setEditingSubject(null);
      // Let's trigger a full data reload (can just window.location.reload for simplicity, or re-fetch)
      window.location.reload(); 
    } catch (err: any) {
      toast.error(err.message || 'Error generating AI content');
    } finally {
      setGeneratingAi(false);
    }
  }

  // Compute real progress and topic counts from DataContext
  const subjectStats = useMemo(() => {
    const map: Record<string, { progress: number; topicsCount: number; tasksCount: number }> = {};
    for (const s of subjects) {
      const appSub = appSubjects.find(a => a.id === s.id);
      const subjectTopics = rawTopics.filter(t => t.subject_id === s.id);
      const subjectTasks  = rawTasks.filter(t => subjectTopics.some(st => st.id === t.topic_id));
      map[s.id] = {
        progress:     appSub?.progress ?? 0,
        topicsCount:  subjectTopics.length,
        tasksCount:   subjectTasks.length,
      };
    }
    return map;
  }, [subjects, appSubjects, rawTopics, rawTasks]);

  const filtered = useMemo(() =>
    subjects.filter(s =>
      s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      s.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [subjects, debouncedSearch]
  );

  if (loading) return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
      <div className="h-10 w-1/3 bg-gray-100 rounded-xl animate-pulse" />
      <SkeletonGrid count={6} />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm text-red-400 mb-3">{error}</p>
      <button onClick={loadSubjects} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors">
        Try Again
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ background: '#f4f6f8', margin: '-20px -16px', padding: '20px 16px 100px', minHeight: '100vh' }}>
      <div className="mb-2">
        <BackButton />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Curriculum</h1>
            <p className="text-sm text-gray-400">
              {subjects.length} subject{subjects.length !== 1 ? 's' : ''} · Manage learning areas
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/library')}
              className="flex items-center gap-2 px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 text-sm font-semibold rounded-xl transition-colors hidden sm:flex"
            >
              <LibraryBig size={16} />
              Browse Library
            </button>
            <button
              onClick={() => { setEditingSubject(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Subject
            </button>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search subjects"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-violet-50 focus:border-violet-300 transition-all shadow-sm"
          />
        </div>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Add your first subject to start building the curriculum."
          actionLabel="Add Subject"
          onAction={() => setModalOpen(true)}
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">No subjects match "{debouncedSearch}"</p>
          <button onClick={() => setSearch('')} className="mt-2 text-violet-600 text-sm font-medium">Clear search</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.slice(0, visibleCount).map((subject) => {
              const stats = subjectStats[subject.id] ?? { progress: 0, topicsCount: 0, tasksCount: 0 };
              return (
                <HierarchicalCard
                  key={subject.id}
                  title={subject.name}
                  description={subject.description || undefined}
                  icon={<span className="text-lg">{subjectEmoji(subject.name)}</span>}
                  progress={stats.progress}
                  footerItems={[
                    { label: 'Topics', value: stats.topicsCount, icon: <Hash size={12} /> },
                    { label: 'Tasks',  value: stats.tasksCount,  icon: <BarChart2 size={12} /> },
                  ]}
                  onEdit={() => { setEditingSubject(subject); setModalOpen(true); }}
                  onDelete={() => setConfirmId(subject.id)}
                  onClick={() => navigate(`/subjects/${subject.id}/topics`)}
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
                Load More Subjects
              </button>
            </div>
          )}
        </>
      )}


      <CurriculumFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSubject(null); }}
        title={editingSubject ? 'Edit Subject' : 'Add Subject'}
        fields={SUBJECT_FIELDS}
        initialData={editingSubject}
        onSubmit={handleSubmit}
        extraActions={editingSubject ? [{
          label: 'Generate Topics & Tasks with AI',
          icon: <Wand2 size={16} />,
          onClick: handleGenerateAi,
          loading: generatingAi
        }] : undefined}
      />

      <ConfirmModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleConfirmDelete}
        loading={confirmLoading}
        title="Delete Subject?"
        message="This will remove the subject and all its topics and tasks. This action cannot be undone."
        confirmLabel="Delete Subject"
        danger
      />
    </div>
  );
}
