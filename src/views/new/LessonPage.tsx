// ============================================================
// LessonPage — Full-screen rich teaching session for a task
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  BookOpen, ChevronLeft, ChevronDown, ChevronUp,
  CheckSquare, Square, Clock, Star, ExternalLink,
  Video, FileText, Loader2, Save, Trophy
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useData } from '../../context/DataContext';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToast } from '../../store/useToastStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { fetchTaskWithBreadcrumb } from '../../services/curriculumService';
import { supabase } from '../../services/supabase';
import type { DbTaskWithBreadcrumb, LearningStage } from '../../types/database';

const STAGES: { value: LearningStage; label: string; color: string }[] = [
  { value: 'Not_Started',   label: 'Not Started',    color: 'bg-gray-100 text-gray-600' },
  { value: 'Introduced',    label: 'Introduced',      color: 'bg-blue-100 text-blue-700' },
  { value: 'Practicing',    label: 'Practicing',      color: 'bg-violet-100 text-violet-700' },
  { value: 'Comfortable',   label: 'Comfortable',     color: 'bg-emerald-100 text-emerald-700' },
  { value: 'Confident',     label: 'Mastered! ⭐',    color: 'bg-amber-100 text-amber-700' },
  { value: 'Needs_Practice','label': 'Needs Practice', color: 'bg-orange-100 text-orange-700' },
];

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  video:    <Video size={14} className="text-red-500" />,
  pdf:      <FileText size={14} className="text-blue-500" />,
  article:  <FileText size={14} className="text-gray-500" />,
  link:     <ExternalLink size={14} className="text-violet-500" />,
};

export function LessonPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { kids, taskProgress, refresh } = useData();
  const { selectedChildId } = useSettingsStore();

  const childId = selectedChildId || kids[0]?.id || '';

  const [task, setTask] = useState<DbTaskWithBreadcrumb | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingLog, setSavingLog] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [checkedMaterials, setCheckedMaterials] = useState<Set<number>>(new Set());

  // Session log form
  const [logData, setLogData] = useState({
    notes: '',
    timeSpent: 30,
    parentRating: 0,
    stage: 'Not_Started' as LearningStage,
  });

  const existingProgress = task
    ? taskProgress.find(p => p.task_id === task.id && p.child_id === childId)
    : null;

  useDocumentTitle(task?.name ?? 'Lesson');

  useEffect(() => {
    if (!taskId) return;
    loadTask();
  }, [taskId]);

  useEffect(() => {
    if (existingProgress) {
      setLogData(prev => ({
        ...prev,
        stage: existingProgress.learning_stage,
        notes: existingProgress.notes ?? '',
      }));
    }
  }, [existingProgress]);

  async function loadTask() {
    try {
      setLoading(true);
      const data = await fetchTaskWithBreadcrumb(taskId!);
      setTask(data);
    } catch (err) {
      toast.error('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveLog() {
    if (!task || !childId) return;
    setSavingLog(true);
    try {
      const payload = {
        child_id: childId,
        task_id: task.id,
        learning_stage: logData.stage,
        notes: logData.notes || null,
        time_spent_minutes: logData.timeSpent,
        parent_rating: logData.parentRating > 0 ? logData.parentRating : null,
        last_practiced_at: new Date().toISOString(),
        session_count: (existingProgress?.session_count ?? 0) + 1,
        learned_count: (existingProgress?.learned_count ?? 0) + 1,
        is_active: true,
      };

      if (existingProgress) {
        await supabase.from('task_progress').update(payload).eq('id', existingProgress.id);
      } else {
        await supabase.from('task_progress').insert({ ...payload, target_count: 3 });
      }

      toast.success('Session logged!');
      refresh();
    } catch (err) {
      toast.error('Failed to save session log.');
    } finally {
      setSavingLog(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-violet-500" size={36} />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Task not found.</p>
      </div>
    );
  }

  const resources: Array<{ type: string; url: string; title: string }> = task.resources ?? [];

  return (
    <div className="max-w-2xl mx-auto pb-32 animate-fade-in">
      {/* Back + breadcrumb */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-violet-600 transition-colors mb-3"
        >
          <ChevronLeft size={16} /> Back
        </button>
        {task.topic && (
          <p className="text-xs text-gray-400 font-medium">
            <span className="text-gray-500">{task.topic.subject?.name}</span>
            {' › '}
            <span className="text-gray-500">{task.topic.title}</span>
            {' › '}
            <span className="text-violet-600 font-semibold">{task.name}</span>
          </p>
        )}
        <h1 className="text-2xl font-black text-gray-900 mt-1">{task.name}</h1>

        {/* Metadata badges */}
        <div className="flex flex-wrap gap-2 mt-2">
          {task.task_type && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold capitalize">
              {task.task_type}
            </span>
          )}
          {task.difficulty_level && (
            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold">
              {task.difficulty_level}
            </span>
          )}
          {(task.estimated_minutes ?? 0) > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
              <Clock size={11} /> {task.estimated_minutes} min
            </span>
          )}
          {existingProgress && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              STAGES.find(s => s.value === existingProgress.learning_stage)?.color ?? ''
            }`}>
              {STAGES.find(s => s.value === existingProgress.learning_stage)?.label ?? existingProgress.learning_stage}
            </span>
          )}
        </div>
      </div>

      {/* Learning Objective */}
      {task.learning_objective && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">🎯 Learning Objective</p>
          <p className="text-sm text-blue-900">{task.learning_objective}</p>
        </div>
      )}

      {/* Parent Guide (collapsible) */}
      {task.parent_guide && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <button
            onClick={() => setShowGuide(g => !g)}
            className="flex items-center justify-between w-full"
          >
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">👩‍🏫 Parent Guide</p>
            {showGuide ? <ChevronUp size={16} className="text-amber-600" /> : <ChevronDown size={16} className="text-amber-600" />}
          </button>
          {showGuide && (
            <p className="text-sm text-amber-900 mt-2 whitespace-pre-line">{task.parent_guide}</p>
          )}
        </div>
      )}

      {/* Materials Checklist */}
      {(task.materials_needed ?? []).length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">🛒 Materials Needed</p>
          <div className="space-y-2">
            {task.materials_needed!.map((material, idx) => (
              <button
                key={idx}
                onClick={() => setCheckedMaterials(prev => {
                  const next = new Set(prev);
                  next.has(idx) ? next.delete(idx) : next.add(idx);
                  return next;
                })}
                className="flex items-center gap-3 w-full text-left group"
              >
                {checkedMaterials.has(idx) ? (
                  <CheckSquare size={16} className="text-emerald-500 flex-shrink-0" />
                ) : (
                  <Square size={16} className="text-gray-300 flex-shrink-0 group-hover:text-gray-400" />
                )}
                <span className={`text-sm ${checkedMaterials.has(idx) ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {material}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {task.instructions && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">📋 Instructions</p>
          <div className="space-y-3">
            {task.instructions.split('\n').filter(Boolean).map((step, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="w-6 h-6 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment Criteria */}
      {task.assessment_criteria && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">✅ How to Know They've Got It</p>
          <p className="text-sm text-emerald-900 whitespace-pre-line">{task.assessment_criteria}</p>
        </div>
      )}

      {/* Resources */}
      {resources.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">🔗 Resources</p>
          <div className="space-y-2">
            {resources.map((res, idx) => (
              <a
                key={idx}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-violet-50 transition-colors group"
              >
                {RESOURCE_ICONS[res.type] ?? <ExternalLink size={14} className="text-gray-400" />}
                <span className="text-sm text-gray-700 group-hover:text-violet-700 font-medium flex-1">{res.title}</span>
                <ExternalLink size={12} className="text-gray-300 group-hover:text-violet-400" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Session Log — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl p-4 z-30">
        <div className="max-w-2xl mx-auto space-y-3">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">📝 Log Today's Session</p>

          {/* Stage picker */}
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map(s => (
              <button
                key={s.value}
                onClick={() => setLogData(d => ({ ...d, stage: s.value }))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border-2 ${
                  logData.stage === s.value
                    ? 'border-violet-500 ' + s.color
                    : 'border-transparent ' + s.color + ' opacity-60'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            {/* Time */}
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2">
              <Clock size={14} className="text-gray-400" />
              <input
                type="number"
                min={1}
                max={240}
                value={logData.timeSpent}
                onChange={(e) => setLogData(d => ({ ...d, timeSpent: Number(e.target.value) }))}
                className="w-12 bg-transparent text-sm font-semibold text-gray-700 outline-none"
              />
              <span className="text-xs text-gray-400">min</span>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setLogData(d => ({ ...d, parentRating: n }))}>
                  <Star
                    size={18}
                    className={n <= logData.parentRating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                  />
                </button>
              ))}
            </div>

            {/* Save */}
            <button
              onClick={handleSaveLog}
              disabled={savingLog}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-60"
            >
              {savingLog ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
          </div>

          {/* Notes */}
          <textarea
            value={logData.notes}
            onChange={(e) => setLogData(d => ({ ...d, notes: e.target.value }))}
            placeholder="Add session notes (optional)..."
            rows={2}
            className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-violet-400 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
