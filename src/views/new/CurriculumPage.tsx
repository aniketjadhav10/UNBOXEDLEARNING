// ============================================================
// CurriculumPage — unified Curriculum Builder.
// Merges the former SubjectsPage + SubjectLibraryPage + TopicsPage +
// TaskManagementPage into one screen: a subject rail (expandable to
// topics), a My Curriculum / Browse Library tab switch, and a
// Tree (drill-down) / Task list (flat, status-tabbed) view toggle.
// Every action the four old pages offered is preserved here — this
// consolidates *where things live*, not *what they do*.
// ============================================================
'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Search, Plus, Wand2, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, Sparkles, X, Loader2, Layers,
} from 'lucide-react';
import { HierarchicalCard } from '../../components/curriculum/HierarchicalCard';
import { CurriculumFormModal, type FormField } from '../../components/curriculum/CurriculumFormModal';
import { TopicPickerDrawer } from '../../components/curriculum/TopicPickerDrawer';
import { SyllabusReviewPanel } from '../../components/curriculum/SyllabusReviewPanel';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { TaskCard, TaskCardSkeleton } from '../../components/tasks/TaskCard';
import { TaskFilters } from '../../components/tasks/TaskFilters';
import {
  createItem, updateItem, deleteItem,
  fetchSubjects, fetchAllSubjectsFromLibrary, fetchTopics,
  enrollInSubject, isEnrolledInSubject, createSubjectAndEnroll,
} from '../../services/curriculumService';
import { assignTaskToChild } from '../../services/taskService';
import { useTaskManagement } from '../../hooks/useTaskManagement';
import { useData } from '../../context/DataContext';
import { useToast } from '../../store/useToastStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { supabase } from '../../services/supabase';
import { subjectEmoji, normalizeDifficulty } from '../../utils/string';
import type { DbSubject, DbTopic, DbTask } from '../../types/database';

type SubjectWithEnrollment = DbSubject & { isEnrolled?: boolean };

const SUBJECT_FIELDS: FormField[] = [
  { name: 'name', label: 'Subject Name', type: 'text', placeholder: 'e.g. Mathematics', required: true },
  { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Short summary of the subject...' },
];

const TOPIC_FIELDS: FormField[] = [
  { name: 'title', label: 'Topic Title', type: 'text', placeholder: 'e.g. Fractions & Decimals', required: true },
  { name: 'description', label: 'Description', type: 'textarea', placeholder: 'What will be learned...' },
  { name: 'difficulty_level', label: 'Difficulty', type: 'select', options: [
    { value: 'Beginner', label: 'Beginner' }, { value: 'Intermediate', label: 'Intermediate' }, { value: 'Advanced', label: 'Advanced' },
  ]},
];

const TASK_FIELDS: FormField[] = [
  { name: 'name', label: 'Task Name', type: 'text', placeholder: 'e.g. Solve 2D Word Problems', required: true },
  { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Specific instructions or goals...' },
  { name: 'difficulty_level', label: 'Difficulty', type: 'select', options: [
    { value: 'Beginner', label: 'Beginner' }, { value: 'Intermediate', label: 'Intermediate' }, { value: 'Advanced', label: 'Advanced' },
  ]},
];

interface CurriculumPageProps {
  initialSubjectId?: string;
  initialTopicId?: string;
  initialTab?: 'mine' | 'library';
  initialView?: 'tree' | 'tasks';
  /** Opens the subject-level "Generate topics & tasks with AI" action immediately — used by the Dashboard's Curriculum Gaps quick-action. */
  autoOpenAI?: boolean;
}

export function CurriculumPage({
  initialSubjectId, initialTopicId, initialTab = 'mine', initialView = 'tree', autoOpenAI = false,
}: CurriculumPageProps) {
  useDocumentTitle('Curriculum Builder');
  const toast = useToast();
  const { rawChildren, rawTopics: allMyTopics, rawTasks: allMyTasks, refresh } = useData();
  const { selectedChildId } = useSettingsStore();
  const childId = selectedChildId || rawChildren?.[0]?.id || '';

  const [tab, setTab] = useState<'mine' | 'library'>(initialTab);
  const [view, setView] = useState<'tree' | 'tasks'>(initialView);
  const [search, setSearch] = useState('');

  const [mySubjects, setMySubjects] = useState<DbSubject[]>([]);
  const [librarySubjects, setLibrarySubjects] = useState<SubjectWithEnrollment[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(initialSubjectId ? [initialSubjectId] : []));
  const [topicsBySubject, setTopicsBySubject] = useState<Record<string, DbTopic[]>>({});

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(initialSubjectId ?? null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(initialTopicId ?? null);
  const [selectedTopicTasks, setSelectedTopicTasks] = useState<DbTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // ── Modals ────────────────────────────────────────────────
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; editing?: DbSubject }>({ open: false });
  const [topicModal, setTopicModal] = useState<{ open: boolean; editing?: DbTopic }>({ open: false });
  const [taskModal, setTaskModal] = useState<{ open: boolean; editing?: DbTask }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<{ table: 'subjects' | 'topics' | 'tasks'; id: string; label: string } | null>(null);
  const [pickerSubjectId, setPickerSubjectId] = useState<string | null>(null);

  // ── AI generation (subject/topic-level — fills an EXISTING subject/topic) ──
  const [aiGenerating, setAiGenerating] = useState<string | null>(null); // subjectId or topicId currently generating

  // ── AI generation (page-level — builds a NEW subject from a prompt) ──
  const [aiBuildOpen, setAiBuildOpen] = useState(false);
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiDraft, setAiDraft] = useState<any>(null);
  const [aiCommitting, setAiCommitting] = useState(false);

  const selectedSubject = useMemo(
    () => [...mySubjects, ...librarySubjects].find((s) => s.id === selectedSubjectId) ?? null,
    [mySubjects, librarySubjects, selectedSubjectId],
  );
  const selectedTopic = useMemo(
    () => (topicsBySubject[selectedSubjectId ?? ''] ?? []).find((t) => t.id === selectedTopicId) ?? null,
    [topicsBySubject, selectedSubjectId, selectedTopicId],
  );

  // ── Load subject rail (both tabs, so switching is instant) ──
  async function loadSubjects() {
    setSubjectsLoading(true);
    try {
      const [mine, library] = await Promise.all([
        fetchSubjects(childId),
        fetchAllSubjectsFromLibrary(),
      ]);
      setMySubjects(mine);
      const withEnrollment = await Promise.all(
        library.map(async (s) => ({ ...s, isEnrolled: childId ? await isEnrolledInSubject(childId, s.id) : false })),
      );
      setLibrarySubjects(withEnrollment);
    } catch {
      toast.error('Failed to load subjects.');
    } finally {
      setSubjectsLoading(false);
    }
  }

  useEffect(() => { loadSubjects(); }, [childId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load topics for an expanded subject (dual-mode: mine vs library) ──
  async function loadTopicsFor(subjectId: string, isLibrary: boolean) {
    if (topicsBySubject[subjectId]) return;
    try {
      const topics = await fetchTopics(subjectId, isLibrary ? undefined : childId);
      setTopicsBySubject((prev) => ({ ...prev, [subjectId]: topics }));
    } catch {
      toast.error('Failed to load topics.');
    }
  }

  // Mobile back button: one level at a time (task list → topics → rail).
  function handleMobileBack() {
    if (selectedTopicId) setSelectedTopicId(null);
    else setSelectedSubjectId(null);
  }

  function toggleExpand(subjectId: string, isLibrary: boolean) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId); else next.add(subjectId);
      return next;
    });
    loadTopicsFor(subjectId, isLibrary);
    // Selecting the subject also drives the main panel (topic cards / library preview).
    setSelectedSubjectId(subjectId);
    setSelectedTopicId(null);
  }

  // ── Load tasks for the selected topic (Tree view) ──
  async function loadTasksForTopic(topicId: string) {
    setTasksLoading(true);
    try {
      const { data, error } = await supabase.from('tasks').select('*').eq('topic_id', topicId).eq('is_active', true).order('order_index');
      if (error) throw error;
      setSelectedTopicTasks((data ?? []) as DbTask[]);
    } catch {
      toast.error('Failed to load tasks.');
    } finally {
      setTasksLoading(false);
    }
  }

  useEffect(() => {
    if (selectedTopicId) loadTasksForTopic(selectedTopicId);
    else setSelectedTopicTasks([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopicId]);

  // On mount: if a subject was passed in, make sure its topics are loaded (and its rail row expanded).
  useEffect(() => {
    if (initialSubjectId) loadTopicsFor(initialSubjectId, tab === 'library');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSubjectId]);

  // autoOpenAI: trigger the subject-level "fill this subject" AI action once subjects are loaded.
  useEffect(() => {
    if (autoOpenAI && initialSubjectId && !subjectsLoading) {
      const subj = mySubjects.find((s) => s.id === initialSubjectId);
      if (subj) handleGenerateForSubject(subj);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAI, initialSubjectId, subjectsLoading]);

  // ── Task-list view (flat, status-tabbed) — reuse the exact hook TaskManagementPage used ──
  const {
    filtered: allFilteredTasks, loading: taskListLoading,
    filter, setFilter, sortKey, setSortKey, search: taskSearch, setSearch: setTaskSearch,
    activeTab: taskTab, setActiveTab: setTaskTab,
    handleMarkPracticed, handleUpdateStage, handleUpdateInterest, handleToggleSchedule,
    handleArchive, handleUnarchive, load: reloadTaskList,
  } = useTaskManagement(childId, 'all');

  // Scope the flat task list to the selected subject/topic, if any is selected.
  const scopedTaskIds = useMemo(() => {
    if (!selectedSubjectId) return null; // null = no scoping, show everything
    const topicIds = new Set(allMyTopics.filter((t) => t.subject_id === selectedSubjectId).map((t) => t.id));
    if (selectedTopicId) return new Set(allMyTasks.filter((t) => t.topic_id === selectedTopicId).map((t) => t.id));
    return new Set(allMyTasks.filter((t) => topicIds.has(t.topic_id)).map((t) => t.id));
  }, [selectedSubjectId, selectedTopicId, allMyTopics, allMyTasks]);

  const scopedTasks = useMemo(
    () => (scopedTaskIds ? allFilteredTasks.filter((t) => scopedTaskIds.has(t.id)) : allFilteredTasks),
    [allFilteredTasks, scopedTaskIds],
  );

  const subjectOptions = mySubjects.map((s) => ({ id: s.id, name: s.name }));

  // ── Subject CRUD ──────────────────────────────────────────
  async function handleSubjectSubmit(data: any) {
    try {
      if (subjectModal.editing) {
        await updateItem<DbSubject>('subjects', subjectModal.editing.id, data);
        toast.success(`"${data.name}" updated`);
      } else {
        if (!childId) { toast.error('Add a child profile first.'); return; }
        await createSubjectAndEnroll({ name: data.name, description: data.description }, childId);
        toast.success(`"${data.name}" created and enrolled!`);
      }
      await loadSubjects();
      refresh();
    } catch {
      toast.error('Failed to save subject.');
    }
  }

  async function handleGenerateForSubject(subject: DbSubject) {
    setAiGenerating(subject.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: session ? `Bearer ${session.access_token}` : '' },
        body: JSON.stringify({ subject_id: subject.id, subject_name: subject.name, child_id: childId }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to generate content'); }
      toast.success(`AI generated topics & tasks for "${subject.name}"!`);
      setTopicsBySubject((prev) => { const next = { ...prev }; delete next[subject.id]; return next; });
      loadTopicsFor(subject.id, false);
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed.');
    } finally {
      setAiGenerating(null);
    }
  }

  // ── Topic CRUD ────────────────────────────────────────────
  async function handleTopicSubmit(data: any) {
    if (!selectedSubjectId) return;
    try {
      if (topicModal.editing) {
        await updateItem<DbTopic>('topics', topicModal.editing.id, data);
        toast.success(`"${data.title}" updated`);
      } else {
        const existing = topicsBySubject[selectedSubjectId] ?? [];
        await createItem<DbTopic>('topics', { ...data, subject_id: selectedSubjectId, is_active: true, order_index: existing.length });
        toast.success(`"${data.title}" created!`);
      }
      setTopicsBySubject((prev) => { const next = { ...prev }; delete next[selectedSubjectId]; return next; });
      loadTopicsFor(selectedSubjectId, tab === 'library');
    } catch {
      toast.error('Failed to save topic.');
    }
  }

  async function handleGenerateForTopic(topic: DbTopic) {
    if (!selectedSubject) return;
    setAiGenerating(topic.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: session ? `Bearer ${session.access_token}` : '' },
        body: JSON.stringify({ topic_id: topic.id, topic_name: topic.title, subject_name: selectedSubject.name, child_id: childId }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to generate content'); }
      toast.success(`AI generated tasks for "${topic.title}"!`);
      loadTasksForTopic(topic.id);
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed.');
    } finally {
      setAiGenerating(null);
    }
  }

  // ── Task CRUD (Tree view) ────────────────────────────────
  async function handleTaskSubmit(data: any) {
    if (!selectedTopicId) return;
    try {
      if (taskModal.editing) {
        await updateItem<DbTask>('tasks', taskModal.editing.id, data);
        toast.success(`"${data.name}" updated`);
      } else {
        const task = await createItem<DbTask>('tasks', { ...data, topic_id: selectedTopicId, is_active: true, order_index: selectedTopicTasks.length, source_type: 'manual' });
        if (childId) await assignTaskToChild(task.id, childId).catch(() => {});
        toast.success(`"${data.name}" created!`);
      }
      loadTasksForTopic(selectedTopicId);
      reloadTaskList();
    } catch {
      toast.error('Failed to save task.');
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    try {
      await deleteItem(confirmDelete.table, confirmDelete.id);
      toast.success(`"${confirmDelete.label}" deleted`);
      if (confirmDelete.table === 'subjects') { setSelectedSubjectId(null); loadSubjects(); }
      else if (confirmDelete.table === 'topics') { setSelectedTopicId(null); if (selectedSubjectId) { setTopicsBySubject((p) => { const n = { ...p }; delete n[selectedSubjectId]; return n; }); loadTopicsFor(selectedSubjectId, tab === 'library'); } }
      else if (selectedTopicId) loadTasksForTopic(selectedTopicId);
      refresh();
    } catch {
      toast.error('Delete failed.');
    } finally {
      setConfirmDelete(null);
    }
  }

  // ── Library enrollment ───────────────────────────────────
  async function handleEnroll(subject: SubjectWithEnrollment) {
    if (!childId) { toast.error('Add a child profile first.'); return; }
    try {
      await enrollInSubject(childId, subject.id);
      toast.success(`Enrolled in "${subject.name}"!`);
      await loadSubjects();
      refresh();
    } catch {
      toast.error('Failed to enroll.');
    }
  }

  // ── Build with AI (page-level — new subject from a prompt) ──
  async function handleAiBuild() {
    if (!aiSourceText.trim()) { toast.error('Describe what you want to build.'); return; }
    setAiStreaming(true);
    setAiMessage('Starting…');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/generate-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: session ? `Bearer ${session.access_token}` : '' },
        body: JSON.stringify({ sourceText: aiSourceText, preview: true, childId: childId || undefined }),
      });
      if (!res.ok || !res.body) throw new Error('Failed to generate.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf('\n\n')) >= 0) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            if (chunk.startsWith('data: ')) {
              const data = JSON.parse(chunk.replace('data: ', ''));
              setAiMessage(data.message || '');
              if (data.status === 'draft') { setAiDraft(data.draft); return; }
              if (data.status === 'error') throw new Error(data.message);
            }
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed.');
    } finally {
      setAiStreaming(false);
    }
  }

  async function handleAiCommit(draft: any) {
    setAiCommitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/commit-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: session ? `Bearer ${session.access_token}` : '' },
        body: JSON.stringify({ draft, childId: childId || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save curriculum');
      toast.success('Curriculum saved!');
      setAiDraft(null);
      setAiBuildOpen(false);
      setAiSourceText('');
      await loadSubjects();
      refresh();
      if (json.subjectId) { setSelectedSubjectId(json.subjectId); setTab('mine'); }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save curriculum');
    } finally {
      setAiCommitting(false);
    }
  }

  const railSubjects = (tab === 'mine' ? mySubjects : librarySubjects).filter(
    (s) => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-6rem)] -m-3 sm:-m-4 lg:-m-6 bg-[#f4f6f8]">
      {/* ── Subject rail — full-width "home" screen on mobile until a subject is picked, side panel at lg: ── */}
      <div className={`${selectedSubjectId ? 'hidden lg:flex' : 'flex'} w-full lg:w-64 lg:flex-shrink-0 border-r border-gray-200 bg-white flex-col`}>
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setTab('mine')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${tab === 'mine' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              My Curriculum
            </button>
            <button onClick={() => setTab('library')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${tab === 'library' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              Browse Library
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects…"
              className="w-full pl-8 pr-2 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-accent-pink"
            />
          </div>
          {tab === 'mine' && (
            <button
              onClick={() => setSubjectModal({ open: true })}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-accent-pink to-accent-coral rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus size={13} /> Add Subject
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {subjectsLoading ? (
            <div className="space-y-2 p-2">{[...Array(4)].map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : railSubjects.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">{tab === 'mine' ? 'No subjects yet.' : 'No subjects found.'}</p>
          ) : (
            railSubjects.map((s) => {
              const isExpanded = expandedIds.has(s.id);
              const topics = topicsBySubject[s.id] ?? [];
              const isEnrolled = tab === 'library' ? (s as SubjectWithEnrollment).isEnrolled : true;
              return (
                <div key={s.id} className="mb-0.5">
                  <button
                    onClick={() => toggleExpand(s.id, tab === 'library')}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                      selectedSubjectId === s.id ? 'bg-accent-pink/10 font-bold text-accent-pink' : 'font-semibold text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{subjectEmoji(s.name)}</span>
                    <span className="flex-1 text-left truncate">{s.name}</span>
                    {tab === 'library' && isEnrolled && <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />}
                  </button>
                  {isExpanded && (
                    <div className="pl-7 space-y-0.5 mt-0.5">
                      {topics.length === 0 ? (
                        <p className="text-[11px] text-gray-400 px-2 py-1">No topics</p>
                      ) : topics.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => { setSelectedSubjectId(s.id); setSelectedTopicId(t.id); }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs truncate transition-colors ${
                            selectedTopicId === t.id ? 'bg-accent-pink/10 font-bold text-accent-pink' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {t.title}
                        </button>
                      ))}
                      {tab === 'mine' && (
                        <button
                          onClick={() => { setSelectedSubjectId(s.id); setSelectedTopicId(null); setTopicModal({ open: true }); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-50 hover:text-accent-pink"
                        >
                          + Add topic
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main — full-width once a subject is picked on mobile, always visible at lg: ── */}
      <div className={`${selectedSubjectId ? 'flex' : 'hidden lg:flex'} flex-1 flex-col min-w-0 lg:overflow-hidden`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3 lg:px-6 lg:py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={handleMobileBack}
              className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </button>
            {selectedSubject && (
              <p className="font-display text-base lg:text-lg font-bold text-gray-900 truncate">
                {selectedSubject.name}{selectedTopic && <span className="text-gray-300 mx-2">→</span>}{selectedTopic?.title}
              </p>
            )}
            {!selectedSubject && <p className="font-display text-base lg:text-lg font-bold text-gray-900">Curriculum Builder</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setView('tree')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === 'tree' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Tree</button>
              <button onClick={() => setView('tasks')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${view === 'tasks' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Task list</button>
            </div>
            <button
              onClick={() => setAiBuildOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-accent-pink to-accent-coral rounded-xl hover:opacity-90 transition-opacity shadow-sm"
            >
              <Wand2 size={13} /> Build with AI
            </button>
          </div>
        </div>

        <div className="flex-1 lg:overflow-y-auto p-4 lg:p-6">
          {view === 'tree' ? (
            tab === 'library' && selectedSubject ? (
              /* ── Library subject preview ─────────────────────── */
              <div className="max-w-2xl">
                <p className="text-sm text-gray-500 mb-4">{selectedSubject.description ?? `Learn about ${selectedSubject.name}.`}</p>
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setPickerSubjectId(selectedSubject.id)}
                    className="px-4 py-2 text-xs font-bold text-accent-pink border border-accent-pink/30 rounded-xl hover:bg-accent-pink/5"
                  >
                    Pick individual topics
                  </button>
                  <button
                    onClick={() => handleEnroll(selectedSubject as SubjectWithEnrollment)}
                    disabled={(selectedSubject as SubjectWithEnrollment).isEnrolled}
                    className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-accent-pink to-accent-coral rounded-xl disabled:opacity-50"
                  >
                    {(selectedSubject as SubjectWithEnrollment).isEnrolled ? 'Already enrolled' : 'Enroll All Topics'}
                  </button>
                </div>
                <div className="grid gap-2">
                  {(topicsBySubject[selectedSubject.id] ?? []).map((t) => (
                    <div key={t.id} className="p-3 bg-white rounded-xl border border-gray-100 text-sm font-semibold text-gray-700">{t.title}</div>
                  ))}
                </div>
              </div>
            ) : selectedTopicId ? (
              /* ── Tasks for selected topic ─────────────────────── */
              <div className="space-y-3 max-w-3xl">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-400">{selectedTopicTasks.length} task{selectedTopicTasks.length === 1 ? '' : 's'}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectedTopic && handleGenerateForTopic(selectedTopic)}
                      disabled={aiGenerating === selectedTopicId}
                      className="flex items-center gap-1.5 text-xs font-bold text-accent-pink px-3 py-1.5 rounded-lg hover:bg-accent-pink/10"
                    >
                      {aiGenerating === selectedTopicId ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Generate Tasks with AI
                    </button>
                    <button onClick={() => setTaskModal({ open: true })} className="flex items-center gap-1.5 text-xs font-bold text-white bg-accent-coral px-3 py-1.5 rounded-lg">
                      <Plus size={12} /> Add Task
                    </button>
                  </div>
                </div>
                {tasksLoading ? (
                  <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
                ) : selectedTopicTasks.length === 0 ? (
                  <EmptyState icon={Layers} title="No tasks yet" description="Add a task manually or generate them with AI." actionLabel="Add Task" onAction={() => setTaskModal({ open: true })} />
                ) : (
                  selectedTopicTasks.map((task) => (
                    <HierarchicalCard
                      key={task.id}
                      title={task.name}
                      description={task.description ?? undefined}
                      badge={<span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-bold">{normalizeDifficulty(task.difficulty_level)}</span>}
                      onEdit={() => setTaskModal({ open: true, editing: task })}
                      onDelete={() => setConfirmDelete({ table: 'tasks', id: task.id, label: task.name })}
                    />
                  ))
                )}
              </div>
            ) : selectedSubject ? (
              /* ── Topics for selected subject ──────────────────── */
              <div className="space-y-3 max-w-3xl">
                <div className="flex justify-end gap-2 mb-1">
                  <button
                    onClick={() => handleGenerateForSubject(selectedSubject)}
                    disabled={aiGenerating === selectedSubject.id}
                    className="flex items-center gap-1.5 text-xs font-bold text-accent-pink px-3 py-1.5 rounded-lg hover:bg-accent-pink/10"
                  >
                    {aiGenerating === selectedSubject.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Generate Topics &amp; Tasks with AI
                  </button>
                  <button onClick={() => setTopicModal({ open: true })} className="flex items-center gap-1.5 text-xs font-bold text-white bg-accent-coral px-3 py-1.5 rounded-lg">
                    <Plus size={12} /> Add Topic
                  </button>
                </div>
                {(topicsBySubject[selectedSubject.id] ?? []).length === 0 ? (
                  <EmptyState icon={BookOpen} title="No topics in this subject" description="Create topics to break this subject into manageable units, or generate them with AI." actionLabel="Add Topic" onAction={() => setTopicModal({ open: true })} />
                ) : (
                  (topicsBySubject[selectedSubject.id] ?? []).map((topic) => (
                    <HierarchicalCard
                      key={topic.id}
                      title={topic.title}
                      description={topic.description ?? undefined}
                      badge={<span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-bold">{normalizeDifficulty(topic.difficulty_level)}</span>}
                      onEdit={() => setTopicModal({ open: true, editing: topic })}
                      onDelete={() => setConfirmDelete({ table: 'topics', id: topic.id, label: topic.title })}
                      onClick={() => setSelectedTopicId(topic.id)}
                    />
                  ))
                )}
              </div>
            ) : (
              <EmptyState icon={BookOpen} title="Pick a subject" description="Select a subject from the left to see its topics, or browse the library to enroll in a new one." />
            )
          ) : (
            /* ── Flat task list (status-tabbed) ───────────────── */
            <div className="space-y-4">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
                {(['all', 'today', 'overdue', 'mastered', 'scheduled', 'archived'] as const).map((k) => (
                  <button key={k} onClick={() => setTaskTab(k)} className={`flex-shrink-0 py-2 px-3 text-xs font-semibold rounded-xl capitalize transition-all ${taskTab === k ? 'bg-white text-accent-pink shadow-sm' : 'text-gray-500'}`}>
                    {k}
                  </button>
                ))}
              </div>
              <TaskFilters filter={filter} onFilterChange={setFilter} sortKey={sortKey} onSortChange={setSortKey} search={taskSearch} onSearchChange={setTaskSearch} subjectOptions={subjectOptions} />
              {taskListLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <TaskCardSkeleton key={i} />)}</div>
              ) : scopedTasks.length === 0 ? (
                <EmptyState icon={BookOpen} title="No tasks here" description="Nothing matches this filter yet." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scopedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onMarkPracticed={handleMarkPracticed}
                      onUpdateStage={handleUpdateStage}
                      onUpdateInterest={handleUpdateInterest}
                      onToggleSchedule={handleToggleSchedule}
                      onArchive={handleArchive}
                      onUnarchive={handleUnarchive}
                      onOpenDetails={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      <CurriculumFormModal isOpen={subjectModal.open} onClose={() => setSubjectModal({ open: false })} title={subjectModal.editing ? 'Edit Subject' : 'Add Subject'} fields={SUBJECT_FIELDS} initialData={subjectModal.editing} onSubmit={handleSubjectSubmit} />
      <CurriculumFormModal isOpen={topicModal.open} onClose={() => setTopicModal({ open: false })} title={topicModal.editing ? 'Edit Topic' : 'Add Topic'} fields={TOPIC_FIELDS} initialData={topicModal.editing} onSubmit={handleTopicSubmit} />
      <CurriculumFormModal isOpen={taskModal.open} onClose={() => setTaskModal({ open: false })} title={taskModal.editing ? 'Edit Task' : 'Add Task'} fields={TASK_FIELDS} initialData={taskModal.editing} onSubmit={handleTaskSubmit} />
      <ConfirmModal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleConfirmDelete} title={`Delete ${confirmDelete?.label ?? ''}?`} message="This action cannot be undone." confirmLabel="Delete" danger />

      {pickerSubjectId && childId && (
        <TopicPickerDrawer subjectId={pickerSubjectId} childId={childId} onClose={() => setPickerSubjectId(null)} onEnrolled={() => { loadSubjects(); refresh(); }} />
      )}

      {/* ── Build with AI (new subject from a prompt) ──────────── */}
      {aiBuildOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            {aiDraft ? (
              <SyllabusReviewPanel draft={aiDraft} saving={aiCommitting} onSave={handleAiCommit} onDiscard={() => setAiDraft(null)} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-gray-900 flex items-center gap-2"><Wand2 size={18} className="text-accent-pink" /> Build with AI</h2>
                  <button onClick={() => setAiBuildOpen(false)} className="p-2 text-gray-400 hover:text-gray-700"><X size={18} /></button>
                </div>
                <p className="text-sm text-gray-500">Describe the subject you want — a topic, a grade level, anything. AI will draft topics and tasks for you to review before saving.</p>
                <textarea
                  value={aiSourceText}
                  onChange={(e) => setAiSourceText(e.target.value)}
                  rows={5}
                  placeholder="e.g. Ancient Egypt for a 9-year-old — pyramids, hieroglyphs, daily life…"
                  className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-accent-pink resize-none"
                />
                {aiStreaming && <p className="text-xs text-gray-400">{aiMessage || 'Generating…'}</p>}
                <button
                  onClick={handleAiBuild}
                  disabled={aiStreaming || !aiSourceText.trim()}
                  className="w-full py-3 bg-gradient-to-r from-accent-pink to-accent-coral text-white text-sm font-bold rounded-2xl disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {aiStreaming ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  {aiStreaming ? 'Generating…' : 'Generate'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
