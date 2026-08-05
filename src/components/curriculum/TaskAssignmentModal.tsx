// ============================================================
// TaskAssignmentModal — Reusable 3-level tree (Subject → Topic → Task)
// for assigning library tasks to any child via a single Supabase RPC.
// ============================================================
import { X, ChevronDown, ChevronRight, BookOpen, Loader2, CheckCircle2, UserRound } from 'lucide-react';
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { assignTasksToChild } from '../../services/onboardingService';
import { useToast } from '../../store/useToastStore';
import type { DbSubject, DbTopic, DbTask } from '../../types/database';

// ── Props ─────────────────────────────────────────────────────
export interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-select a child and hide the child selector */
  defaultChildId?: string;
  /** Called after a successful assignment */
  onAssigned?: (result: { assigned: number; skipped: number }) => void;
  /** Render inline (no backdrop, no fixed positioning) */
  inline?: boolean;
}

// ── Internal tree state types ─────────────────────────────────
type CheckState = 'none' | 'some' | 'all';

function useTreeState(rawTasks: DbTask[]) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expanded, setExpanded]           = useState<Set<string>>(new Set());

  function getTopicCheck(topicId: string): CheckState {
    const tasks = rawTasks.filter((t) => t.topic_id === topicId);
    const sel   = tasks.filter((t) => selectedTasks.has(t.id)).length;
    if (sel === 0) return 'none';
    if (sel === tasks.length) return 'all';
    return 'some';
  }

  function getSubjectCheck(subjectId: string, topics: DbTopic[]): CheckState {
    const subTopics = topics.filter((t) => t.subject_id === subjectId);
    const states = subTopics.map((t) => getTopicCheck(t.id));
    if (states.every((s) => s === 'all'))  return 'all';
    if (states.every((s) => s === 'none')) return 'none';
    return 'some';
  }

  function toggleTask(taskId: string) {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }

  function toggleTopic(topicId: string) {
    const tasks  = rawTasks.filter((t) => t.topic_id === topicId);
    const allSel = tasks.every((t) => selectedTasks.has(t.id));
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      tasks.forEach((t) => allSel ? next.delete(t.id) : next.add(t.id));
      return next;
    });
  }

  function toggleSubject(subjectId: string, topics: DbTopic[]) {
    const subTopicIds = topics.filter((t) => t.subject_id === subjectId).map((t) => t.id);
    const subTasks    = rawTasks.filter((t) => subTopicIds.includes(t.topic_id));
    const allSel      = subTasks.every((t) => selectedTasks.has(t.id));
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      subTasks.forEach((t) => allSel ? next.delete(t.id) : next.add(t.id));
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function reset() {
    setSelectedTasks(new Set());
    setExpanded(new Set());
  }

  return {
    selectedTasks, expanded,
    getTopicCheck, getSubjectCheck,
    toggleTask, toggleTopic, toggleSubject, toggleExpand,
    reset,
  };
}

// ── Checkbox UI ───────────────────────────────────────────────
function Checkbox({ state, onChange }: { state: CheckState; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={[
        'w-4 h-4 rounded flex items-center justify-center border transition-colors flex-shrink-0',
        state === 'all'  ? 'bg-violet-600 border-violet-600' : '',
        state === 'some' ? 'bg-violet-200 border-violet-400' : '',
        state === 'none' ? 'border-gray-300 bg-white hover:border-violet-400' : '',
      ].join(' ')}
    >
      {state !== 'none' && (
        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-white">
          {state === 'all'
            ? <path d="M1.5 5.5L4 8l4.5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            : <rect x="1.5" y="4" width="7" height="2" rx="1" />
          }
        </svg>
      )}
    </button>
  );
}

// ── Main Modal ────────────────────────────────────────────────
export function TaskAssignmentModal({
  isOpen,
  onClose,
  defaultChildId,
  onAssigned,
  inline,
}: TaskAssignmentModalProps) {
  const { rawSubjects, rawTopics, rawTasks, kids } = useData();
  const toast = useToast();

  const [selectedChildId, setSelectedChildId] = useState(defaultChildId ?? kids[0]?.id ?? '');
  const [loading, setLoading]                 = useState(false);

  const tree = useTreeState(rawTasks);

  // Group topics by subject for display
  const topicsBySubject = useMemo(() => {
    const map: Record<string, DbTopic[]> = {};
    rawTopics.forEach((t) => {
      if (!map[t.subject_id]) map[t.subject_id] = [];
      map[t.subject_id].push(t);
    });
    return map;
  }, [rawTopics]);

  const tasksByTopic = useMemo(() => {
    const map: Record<string, DbTask[]> = {};
    rawTasks.forEach((t) => {
      if (!map[t.topic_id]) map[t.topic_id] = [];
      map[t.topic_id].push(t);
    });
    return map;
  }, [rawTasks]);

  const globalSubjects = useMemo(() => rawSubjects.filter((s) => s.is_global), [rawSubjects]);
  const familySubjects = useMemo(() => rawSubjects.filter((s) => !s.is_global), [rawSubjects]);

  const totalSelected = tree.selectedTasks.size;

  function handleClose() {
    tree.reset();
    onClose();
  }

  async function handleAssign() {
    if (totalSelected === 0 || !selectedChildId) return;
    setLoading(true);
    try {
      const result = await assignTasksToChild(Array.from(tree.selectedTasks), selectedChildId);
      const childName = kids.find((k) => k.id === selectedChildId)?.name ?? 'child';
      if (result.assigned > 0) {
        toast.success(`${result.assigned} task${result.assigned !== 1 ? 's' : ''} assigned to ${childName}!`);
      } else {
        toast.info(`All selected tasks were already assigned to ${childName}.`);
      }
      onAssigned?.(result);
      tree.reset();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to assign tasks.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen && !inline) return null;

  const content = (
    <div className={`bg-white ${inline ? '' : 'rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]'}`}>

      {/* Header (hidden in inline mode) */}
      {!inline && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-black text-gray-900">Assign Tasks to Child</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select tasks from the library to add to a child's progress</p>
          </div>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

        {/* Child selector */}
        {(!defaultChildId || kids.length > 1) && (
          <div className="px-5 py-3 border-b border-gray-50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <UserRound size={14} className="text-violet-500 flex-shrink-0" />
              <label className="text-xs font-semibold text-gray-600 flex-shrink-0">Assign to:</label>
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="flex-1 text-sm font-semibold text-gray-800 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white"
              >
                {kids.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Tree */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {rawSubjects.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No subjects in library yet</p>
              <p className="text-xs mt-1">Generate a curriculum first using the AI Syllabus Generator</p>
            </div>
          ) : (
            <>
              {globalSubjects.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Global App Library</h3>
                  <div className="space-y-1.5">
                    {renderSubjects(globalSubjects)}
                  </div>
                </div>
              )}
              {familySubjects.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Your Family Library</h3>
                  <div className="space-y-1.5">
                    {renderSubjects(familySubjects)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-gray-500">
            {totalSelected > 0
              ? <span className="text-violet-700">{totalSelected} task{totalSelected !== 1 ? 's' : ''} selected</span>
              : 'No tasks selected'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={totalSelected === 0 || !selectedChildId || loading}
              className="px-5 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {loading ? 'Assigning…' : 'Assign Tasks'}
            </button>
          </div>
        </div>
      </div>
  );

  function renderSubjects(subjectList: DbSubject[]) {
    return subjectList.map((subject: DbSubject) => {
      const subTopics   = topicsBySubject[subject.id] ?? [];
      const isExpSub    = tree.expanded.has(subject.id);
      const subState    = tree.getSubjectCheck(subject.id, rawTopics);
      const taskCount   = subTopics.reduce((n, t) => n + (tasksByTopic[t.id]?.length ?? 0), 0);

      return (
        <div key={subject.id} className="border border-gray-100 rounded-xl overflow-hidden">
          {/* Subject row */}
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 hover:bg-violet-50/40 cursor-pointer transition-colors select-none"
            onClick={() => tree.toggleExpand(subject.id)}
          >
            <Checkbox state={subState} onChange={() => tree.toggleSubject(subject.id, rawTopics)} />
            <span className="text-sm font-black text-gray-800 flex-1">{subject.name}</span>
            <span className="text-[10px] text-gray-400 font-medium">{taskCount} tasks</span>
            {isExpSub
              ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
              : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
            }
          </div>

          {/* Topics */}
          {isExpSub && subTopics.map((topic: DbTopic) => {
            const isExpTop  = tree.expanded.has(topic.id);
            const topState  = tree.getTopicCheck(topic.id);
            const topTasks  = tasksByTopic[topic.id] ?? [];

            return (
              <div key={topic.id} className="border-t border-gray-50">
                {/* Topic row */}
                <div
                  className="flex items-center gap-2.5 px-4 py-2 hover:bg-violet-50/30 cursor-pointer transition-colors select-none"
                  onClick={() => tree.toggleExpand(topic.id)}
                >
                  <Checkbox state={topState} onChange={() => tree.toggleTopic(topic.id)} />
                  <span className="text-xs font-bold text-gray-700 flex-1">{topic.title}</span>
                  <span className="text-[10px] text-gray-400">{topTasks.length} tasks</span>
                  {isExpTop
                    ? <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
                    : <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
                  }
                </div>

                {/* Tasks */}
                {isExpTop && topTasks.map((task: DbTask) => (
                  <label
                    key={task.id}
                    className="flex items-center gap-2.5 px-8 py-1.5 hover:bg-violet-50/20 cursor-pointer transition-colors border-t border-gray-50/70"
                  >
                    <input
                      type="checkbox"
                      checked={tree.selectedTasks.has(task.id)}
                      onChange={() => tree.toggleTask(task.id)}
                      className="w-3.5 h-3.5 accent-violet-600"
                    />
                    <span className="text-xs text-gray-600 flex-1 leading-relaxed">{task.name}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      );
    });
  }

  if (inline) {
    return content;
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="max-h-screen overflow-y-auto">
        {content}
      </div>
    </div>,
    document.body
  );
}
