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
  BookOpen, Search, Plus, Wand2, CheckCircle2, BarChart3, CalendarClock,
  ChevronRight, Sparkles, X, Loader2, Layers,
} from 'lucide-react';
import { HierarchicalCard } from '../../components/curriculum/HierarchicalCard';
import { CurriculumFormModal, type FormField } from '../../components/curriculum/CurriculumFormModal';
import { TopicPickerDrawer } from '../../components/curriculum/TopicPickerDrawer';
import { SyllabusReviewPanel } from '../../components/curriculum/SyllabusReviewPanel';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { TaskCard, TaskCardSkeleton } from '../../components/tasks/TaskCard';
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
import {
  getChildPlacement,
  getSubjectPlacementLabel,
  getTaskPlacementLabel,
  getTopicPlacementLabel,
  isSubjectAppropriateForChild,
  isTaskAppropriateForChild,
  isTopicAppropriateForChild,
} from '../../lib/curriculumPlacement';
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
  const { rawChildren, rawTopics: allMyTopics, rawTasks: allMyTasks, taskProgress, refresh } = useData();
  const { selectedChildId } = useSettingsStore();
  const childId = selectedChildId || rawChildren?.[0]?.id || '';
  const selectedChild = useMemo(() => rawChildren.find((child) => child.id === childId) ?? null, [rawChildren, childId]);
  const childPlacement = useMemo(() => getChildPlacement(selectedChild), [selectedChild]);

  const [tab, setTab] = useState<'mine' | 'library'>(initialTab);
  const [search, setSearch] = useState('');

  const [mySubjects, setMySubjects] = useState<DbSubject[]>([]);
  const [librarySubjects, setLibrarySubjects] = useState<SubjectWithEnrollment[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

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
      setMySubjects(mine.filter((subject) => isSubjectAppropriateForChild(subject, selectedChild).matches));
      const withEnrollment = await Promise.all(
        library.map(async (s) => ({ ...s, isEnrolled: childId ? await isEnrolledInSubject(childId, s.id) : false })),
      );
      setLibrarySubjects(withEnrollment.filter((subject) => isSubjectAppropriateForChild(subject, selectedChild).matches || subject.isEnrolled));
    } catch {
      toast.error('Failed to load subjects.');
    } finally {
      setSubjectsLoading(false);
    }
  }

  useEffect(() => {
    setTopicsBySubject({});
    loadSubjects();
  }, [childId, selectedChild]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load topics for an expanded subject (dual-mode: mine vs library) ──
  async function loadTopicsFor(subjectId: string, isLibrary: boolean) {
    if (topicsBySubject[subjectId]) return;
    try {
      const topics = await fetchTopics(subjectId, isLibrary ? undefined : childId);
      const childTopics = topics.filter((topic) => isTopicAppropriateForChild(topic, selectedChild).matches);
      setTopicsBySubject((prev) => ({ ...prev, [subjectId]: childTopics }));
    } catch {
      toast.error('Failed to load topics.');
    }
  }



  // ── Load tasks for the selected topic (Tree view) ──
  async function loadTasksForTopic(topicId: string) {
    setTasksLoading(true);
    try {
      const { data, error } = await supabase.from('tasks').select('*').eq('topic_id', topicId).eq('is_active', true).order('order_index');
      if (error) throw error;
      setSelectedTopicTasks(((data ?? []) as DbTask[]).filter((task) => isTaskAppropriateForChild(task, selectedChild).matches));
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

  const {
    filtered: allFilteredTasks,
    handleMarkPracticed, handleUpdateStage, handleUpdateInterest, handleToggleSchedule,
    handleArchive, handleUnarchive, load: reloadTaskList
  } = useTaskManagement(childId, 'all');

  const topicTasksWithProgress = useMemo(() => {
    return selectedTopicTasks.map(task => {
      const existing = allFilteredTasks.find(t => t.id === task.id);
      if (existing) return existing;
      return {
        ...task,
        progress: null,
        progressPercent: 0,
        isOverdue: false,
        isDueToday: false,
        isPracticedToday: false,
        isInactive: true,
        recommendedAction: 'Start first practice session'
      } as any;
    });
  }, [selectedTopicTasks, allFilteredTasks]);

  const childAiContext = useMemo(() => ({
    child_id: childId || undefined,
    age_group: childPlacement.ageGroup,
    age: childPlacement.age ?? undefined,
    targetGrade: selectedChild?.grade_level || undefined,
    interests: selectedChild?.interests ?? [],
    learningStyle: selectedChild?.learning_style ?? undefined,
  }), [childId, childPlacement, selectedChild]);

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
        body: JSON.stringify({ subject_id: subject.id, subject_name: subject.name, ...childAiContext }),
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
        body: JSON.stringify({ topic_id: topic.id, topic_name: topic.title, subject_name: selectedSubject.name, ...childAiContext }),
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
    const placement = isSubjectAppropriateForChild(subject, selectedChild);
    if (!placement.matches && !window.confirm(subject.name + ' is ' + placement.reason + ' Enroll anyway?')) return;
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
        body: JSON.stringify({ sourceText: aiSourceText, preview: true, childId: childId || undefined, ...childAiContext }),
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

  const subjectStats = useMemo(() => {
    const progressByTaskId = new Map(
      taskProgress
        .filter((p) => !childId || p.child_id === childId)
        .map((p) => [p.task_id, p]),
    );

    return [...mySubjects, ...librarySubjects].reduce<Record<string, { progress: number; topicsCount: number; tasksCount: number; scheduledCount: number }>>((acc, subject) => {
      const loadedTopics = topicsBySubject[subject.id] ?? [];
      const subjectTopics = allMyTopics.filter((topic) => topic.subject_id === subject.id);
      const topics = subjectTopics.length > 0 ? subjectTopics : loadedTopics;
      const topicIds = new Set(topics.map((topic) => topic.id));
      const tasks = allMyTasks.filter((task) => topicIds.has(task.topic_id));
      const completedCount = tasks.filter((task) => {
        const progress = progressByTaskId.get(task.id);
        return progress && ['Comfortable', 'Confident'].includes(progress.learning_stage);
      }).length;
      const scheduledCount = tasks.filter((task) => progressByTaskId.get(task.id)?.is_scheduled_this_week).length;

      acc[subject.id] = {
        progress: tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0,
        topicsCount: topics.length,
        tasksCount: tasks.length,
        scheduledCount,
      };
      return acc;
    }, {});
  }, [allMyTasks, allMyTopics, childId, librarySubjects, mySubjects, taskProgress, topicsBySubject]);

  const filteredSubjects = (tab === 'mine' ? mySubjects : librarySubjects).filter(
    (s) => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()),
  );


  // Compute task counts per topic for topics grid
  const topicTaskCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const task of allMyTasks) {
      map[task.topic_id] = (map[task.topic_id] || 0) + 1;
    }
    return map;
  }, [allMyTasks]);

  // Helper: select a subject and auto-load its topics
  function handleSelectSubject(subjectId: string) {
    setSelectedSubjectId(subjectId);
    setSelectedTopicId(null);
    loadTopicsFor(subjectId, tab === 'library');
  }

  // Determine current drill-down level
  const level: 1 | 2 | 3 = selectedTopicId ? 3 : selectedSubjectId ? 2 : 1;

  return (
    <div className="animate-fade-in min-h-screen" style={{ background: '#f4f6f8', margin: '-12px -16px', padding: '20px 16px 100px' }}>
      {/* ═══════════════════════════════════════════════════════════
          BREADCRUMB NAVIGATION
         ═══════════════════════════════════════════════════════════ */}
      <nav className="flex items-center gap-1.5 text-sm mb-5 flex-wrap" aria-label="Breadcrumb">
        <button
          onClick={() => { setSelectedSubjectId(null); setSelectedTopicId(null); }}
          className={`font-bold transition-colors ${level === 1 ? 'text-gray-900' : 'text-violet-600 hover:text-violet-700'}`}
        >
          Curriculum
        </button>
        {selectedSubject && (
          <>
            <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
            <button
              onClick={() => { setSelectedTopicId(null); }}
              className={`font-bold transition-colors truncate max-w-[200px] ${level === 2 ? 'text-gray-900' : 'text-violet-600 hover:text-violet-700'}`}
            >
              {selectedSubject.name}
            </button>
          </>
        )}
        {selectedTopic && (
          <>
            <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
            <span className="font-bold text-gray-900 truncate max-w-[200px]">{selectedTopic.title}</span>
          </>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════════════
          LEVEL 1 — SUBJECTS GRID
         ═══════════════════════════════════════════════════════════ */}
      {level === 1 && (
        <div className="space-y-5">
          {/* Header bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Tab toggle */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setTab('mine')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === 'mine' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                My Curriculum
              </button>
              <button onClick={() => setTab('library')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === 'library' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                Browse Library
              </button>
            </div>
            {tab === 'mine' && (
              <button
                onClick={() => setSubjectModal({ open: true })}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-accent-pink to-accent-coral rounded-xl hover:opacity-90 transition-opacity shadow-sm"
              >
                <Plus size={14} /> Add Subject
              </button>
            )}
          </div>

          {/* Subject cards grid */}
          {subjectsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
            </div>
          ) : filteredSubjects.length === 0 ? (
            search.trim() ? (
              <div className="text-center py-16">
                <p className="text-gray-400 text-sm">No subjects match &ldquo;{search}&rdquo;</p>
                <button onClick={() => setSearch('')} className="mt-2 text-violet-600 text-sm font-medium">Clear search</button>
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title={tab === 'mine' ? 'No subjects yet' : 'No subjects found'}
                description={tab === 'mine' ? 'Add your first subject to start building the curriculum, or use AI to generate one.' : 'Browse the library to find subjects to enroll in.'}
                actionLabel={tab === 'mine' ? 'Add Subject' : undefined}
                onAction={tab === 'mine' ? () => setSubjectModal({ open: true }) : undefined}
              />
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSubjects.map((s) => {
                const stats = subjectStats[s.id] ?? { progress: 0, topicsCount: 0, tasksCount: 0, scheduledCount: 0 };
                const isEnrolled = tab === 'library' ? (s as SubjectWithEnrollment).isEnrolled : true;
                return (
                  <HierarchicalCard
                    key={s.id}
                    title={s.name}
                    description={s.description || undefined}
                    icon={<span className="text-lg">{subjectEmoji(s.name)}</span>}
                    badge={<div className="flex flex-wrap gap-1">
                      <span title={isSubjectAppropriateForChild(s, selectedChild).reason} className="text-[10px] px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full font-bold">{getSubjectPlacementLabel(s)}</span>
                      {tab === 'library' && isEnrolled && <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold flex items-center gap-0.5"><CheckCircle2 size={10} /> Enrolled</span>}
                    </div>}
                    progress={stats.progress}
                    footerItems={[
                      { label: 'Topics', value: stats.topicsCount, icon: <BookOpen size={12} /> },
                      { label: 'Tasks', value: stats.tasksCount, icon: <BarChart3 size={12} /> },
                      { label: 'Scheduled', value: stats.scheduledCount, icon: <CalendarClock size={12} /> },
                    ]}
                    onEdit={tab === 'mine' ? () => { setSubjectModal({ open: true, editing: s }); } : undefined}
                    onDelete={tab === 'mine' ? () => setConfirmDelete({ table: 'subjects', id: s.id, label: s.name }) : undefined}
                    onClick={() => handleSelectSubject(s.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          LEVEL 2 — TOPICS GRID (subject selected)
         ═══════════════════════════════════════════════════════════ */}
      {level === 2 && selectedSubject && (
        <div className="space-y-5">
          {/* Header bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-2xl shadow-sm">
                  {subjectEmoji(selectedSubject.name)}
                </div>
                <div>
                  <h1 className="text-xl font-black text-gray-900">{selectedSubject.name}</h1>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {(topicsBySubject[selectedSubject.id] ?? []).length} topic{(topicsBySubject[selectedSubject.id] ?? []).length !== 1 ? 's' : ''}
                    {selectedSubject.description && <> · {selectedSubject.description}</>}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {tab === 'library' ? (
                <>
                  <button
                    onClick={() => setPickerSubjectId(selectedSubject.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-accent-pink border border-accent-pink/30 rounded-xl hover:bg-accent-pink/5"
                  >
                    Pick individual topics
                  </button>
                  <button
                    onClick={() => handleEnroll(selectedSubject as SubjectWithEnrollment)}
                    disabled={(selectedSubject as SubjectWithEnrollment).isEnrolled}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-accent-pink to-accent-coral rounded-xl disabled:opacity-50"
                  >
                    {(selectedSubject as SubjectWithEnrollment).isEnrolled ? 'Already enrolled' : 'Enroll All Topics'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleGenerateForSubject(selectedSubject)}
                    disabled={aiGenerating === selectedSubject.id}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-accent-pink border border-accent-pink/30 rounded-xl hover:bg-accent-pink/5"
                  >
                    {aiGenerating === selectedSubject.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Generate with AI
                  </button>
                  <button
                    onClick={() => setTopicModal({ open: true })}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-accent-pink to-accent-coral rounded-xl hover:opacity-90 shadow-sm"
                  >
                    <Plus size={14} /> Add Topic
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Topic cards grid */}
          {(topicsBySubject[selectedSubject.id] ?? []).length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No topics in this subject"
              description="Create topics to break this subject into manageable learning units, or generate them with AI."
              actionLabel={tab === 'mine' ? 'Add Topic' : undefined}
              onAction={tab === 'mine' ? () => setTopicModal({ open: true }) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(topicsBySubject[selectedSubject.id] ?? []).map((topic) => {
                const taskCount = topicTaskCounts[topic.id] || 0;
                return (
                  <HierarchicalCard
                    key={topic.id}
                    title={topic.title}
                    description={topic.description ?? undefined}
                    icon={<BookOpen size={18} />}
                    badge={<div className="flex flex-wrap gap-1">
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-bold">{normalizeDifficulty(topic.difficulty_level)}</span>
                      <span title={isTopicAppropriateForChild(topic, selectedChild).reason} className="text-[10px] px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full font-bold">{getTopicPlacementLabel(topic)}</span>
                    </div>}
                    footerItems={[
                      { label: 'Tasks', value: taskCount, icon: <BarChart3 size={12} /> },
                    ]}
                    onEdit={tab === 'mine' ? () => setTopicModal({ open: true, editing: topic }) : undefined}
                    onDelete={tab === 'mine' ? () => setConfirmDelete({ table: 'topics', id: topic.id, label: topic.title }) : undefined}
                    onClick={() => setSelectedTopicId(topic.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          LEVEL 3 — TASKS LIST (topic selected)
         ═══════════════════════════════════════════════════════════ */}
      {level === 3 && selectedSubject && selectedTopic && (
        <div className="space-y-5">
          {/* Header bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-black text-gray-900">{selectedTopic.title}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {selectedTopicTasks.length} task{selectedTopicTasks.length !== 1 ? 's' : ''}
                {selectedTopic.description && <> · {selectedTopic.description}</>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleGenerateForTopic(selectedTopic)}
                disabled={aiGenerating === selectedTopicId}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-accent-pink border border-accent-pink/30 rounded-xl hover:bg-accent-pink/5"
              >
                {aiGenerating === selectedTopicId ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generate Tasks
              </button>
              <button
                onClick={() => setTaskModal({ open: true })}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-accent-pink to-accent-coral rounded-xl hover:opacity-90 shadow-sm"
              >
                <Plus size={14} /> Add Task
              </button>
            </div>
          </div>

          {/* Task content */}
          {/* ── Tree view: Task cards ─────────────────────────── */}
          {tasksLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
            </div>
          ) : selectedTopicTasks.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No tasks yet"
              description="Add a task manually or generate them with AI."
              actionLabel="Add Task"
              onAction={() => setTaskModal({ open: true })}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topicTasksWithProgress.map((task) => (
                <div key={task.id} className="relative group">
                  <TaskCard
                    task={task}
                    onMarkPracticed={handleMarkPracticed}
                    onUpdateStage={handleUpdateStage}
                    onUpdateInterest={handleUpdateInterest}
                    onToggleSchedule={handleToggleSchedule}
                    onArchive={handleArchive}
                    onUnarchive={handleUnarchive}
                    onDelete={() => setConfirmDelete({ table: 'tasks', id: task.id, label: task.name })}
                    onOpenDetails={() => setTaskModal({ open: true, editing: task })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODALS (preserved from original)
         ═══════════════════════════════════════════════════════════ */}
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

