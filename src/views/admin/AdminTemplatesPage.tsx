import { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { createItem, fetchMyPrivateSubjects, promoteSubjectToLibrary } from '../../services/curriculumService';
import { useToast } from '../../store/useToastStore';
import { supabase } from '../../services/supabase';
import { BookOpen, Sparkles, Plus, Loader2, LibraryBig, ArrowUpCircle } from 'lucide-react';
import { HierarchicalCard } from '../../components/curriculum/HierarchicalCard';
import { CurriculumFormModal, type FormField } from '../../components/curriculum/CurriculumFormModal';
import type { DbSubject } from '../../types/database';

const SUBJECT_FIELDS: FormField[] = [
  { name: 'name', label: 'Template Name', type: 'text', placeholder: 'e.g. Basic Mathematics', required: true },
  { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief overview...' },
  { name: 'color', label: 'Color Hex', type: 'text' },
];

export function AdminTemplatesPage() {
  const { rawSubjects, rawTopics, rawTasks, refresh } = useData();
  const toast = useToast();

  const globalSubjects = rawSubjects.filter(s => s.is_global);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [submittingAi, setSubmittingAi] = useState(false);

  async function handleManualSubmit(data: Record<string, any>) {
    setSubmittingManual(true);
    try {
      await createItem('subjects', {
        ...data,
        is_global: true,
        order_index: globalSubjects.length,
        is_active: true,
      });
      toast.success('Global Template created');
      setIsManualModalOpen(false);
      refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingManual(false);
    }
  }

  async function handleAiSubmit() {
    if (!aiPrompt.trim()) return;
    setSubmittingAi(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/ai/generate-syllabus', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          sourceText: aiPrompt,
          age: 10,
          topicsCount: 5,
          tasksPerTopic: 3,
          childId: null // Force Global Template
        }),
      });

      if (!response.ok) throw new Error('AI Generation failed');
      toast.success('Global Template generated from AI!');
      setIsAiModalOpen(false);
      setAiPrompt('');
      refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingAi(false);
    }
  }

  const { isSuperAdmin } = useAuth();
  const [privateSubjects, setPrivateSubjects] = useState<DbSubject[]>([]);
  const [promoting, setPromoting] = useState<string | null>(null);

  async function loadPrivate() {
    try { setPrivateSubjects(await fetchMyPrivateSubjects()); } catch { /* ignore */ }
  }
  useEffect(() => { loadPrivate(); }, []);

  async function handlePromote(id: string) {
    setPromoting(id);
    try {
      await promoteSubjectToLibrary(id);
      toast.success('Promoted to the shared library');
      await loadPrivate();
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? 'Promote failed');
    } finally {
      setPromoting(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <LibraryBig className="w-8 h-8 text-indigo-600" />
            </div>
            Global Templates
          </h1>
          <p className="mt-2 text-gray-600">
            Manage subjects that are available to all families in the Global App Library.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-100 text-violet-700 hover:bg-violet-200 text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            <Sparkles size={16} /> AI Generate
          </button>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Plus size={16} /> Manual Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {globalSubjects.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400">
            <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-lg font-bold">No Global Templates</p>
            <p className="text-sm">Create one to populate the library for all users.</p>
          </div>
        ) : (
          globalSubjects.map(subject => {
            const topicCount = rawTopics.filter(t => t.subject_id === subject.id).length;
            return (
              <HierarchicalCard
                key={subject.id}
                title={subject.name}
                description={subject.description || 'No description'}
                footerItems={[
                  { label: 'Topics', value: topicCount, icon: <BookOpen size={14} /> }
                ]}
                onClick={() => {}} // Could link to a detail page later
              />
            );
          })
        )}
      </div>

      {/* Curation: private drafts awaiting promotion to the shared library */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Private drafts</h2>
        <p className="text-sm text-gray-400 mb-4">
          Curriculum generated privately for your family.
          {isSuperAdmin ? ' Promote vetted ones to the shared library.' : ' A super-admin can promote vetted ones to the shared library.'}
        </p>
        {privateSubjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
            No private drafts.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {privateSubjects.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
                <h3 className="text-base font-bold text-gray-900 truncate">{s.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mt-1 flex-1">{s.description || 'No description'}</p>
                {isSuperAdmin && (
                  <button
                    onClick={() => handlePromote(s.id)}
                    disabled={promoting === s.id}
                    className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
                  >
                    {promoting === s.id ? <Loader2 size={15} className="animate-spin" /> : <ArrowUpCircle size={15} />}
                    Promote to library
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CurriculumFormModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Create Global Template"
        fields={SUBJECT_FIELDS}
        initialData={{ color: '#8b5cf6' }}
        onSubmit={handleManualSubmit}
        loading={submittingManual}
      />

      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-violet-600" />
              Generate Global Template
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Describe what the subject should cover. AI will generate the Subject, 5 Topics, and 15 Tasks.
            </p>
            <textarea
              autoFocus
              rows={4}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. A comprehensive introduction to Astronomy for 10 year olds..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none resize-none mb-6"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={submittingAi}
              >
                Cancel
              </button>
              <button
                onClick={handleAiSubmit}
                disabled={submittingAi || !aiPrompt.trim()}
                className="px-6 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submittingAi && <Loader2 size={16} className="animate-spin" />}
                {submittingAi ? 'Generating...' : 'Generate Syllabus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
