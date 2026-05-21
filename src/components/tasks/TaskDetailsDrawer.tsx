// ============================================================
// TaskDetailsDrawer — Slide-in drawer with full task details
// ============================================================
import { X, BookOpen, Calendar, Clock, BarChart2, Repeat, Lightbulb, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { InterestLevel, LearningStage, TaskWithProgress, UpdateProgressPayload } from '../../types/taskTypes';
import { LearningStageBadge, LEARNING_STAGES } from './LearningStageBadge';
import { InterestLevelIndicator } from './InterestLevelIndicator';
import { TaskProgressRing } from './TaskProgressRing';

interface TaskDetailsDrawerProps {
  task: TaskWithProgress | null;
  onClose: () => void;
  onUpdateProgress: (payload: UpdateProgressPayload) => void;
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatRelative(iso?: string | null) {
  if (!iso) return '—';
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 0) return `In ${Math.abs(diff)} days`;
  return `${diff} days ago`;
}

export function TaskDetailsDrawer({ task, onClose, onUpdateProgress }: TaskDetailsDrawerProps) {
  const [editNotes, setEditNotes] = useState('');
  const [editStage, setEditStage] = useState<LearningStage | ''>('');
  const [editInterest, setEditInterest] = useState<InterestLevel | 0>(0);
  const [editLearnedCount, setEditLearnedCount] = useState<number | ''>('');
  const [editTargetCount, setEditTargetCount] = useState<number | ''>('');
  const [editRepeatInterval, setEditRepeatInterval] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (task) {
      setEditNotes(task.progress?.notes ?? '');
      setEditStage(task.progress?.learning_stage ?? '');
      setEditInterest((task.progress?.interest_level as InterestLevel) ?? 0);
      setEditLearnedCount(task.progress?.learned_count ?? 0);
      setEditTargetCount(task.progress?.target_count ?? 5);
      setEditRepeatInterval(task.progress?.repeat_interval ?? 1);
      setErrorMsg('');
    }
  }, [task?.id]);

  if (!task) return null;

  const { progress } = task;

  async function handleSave() {
    if (
      editTargetCount === '' || editTargetCount <= 0 ||
      editRepeatInterval === '' || editRepeatInterval <= 0 ||
      editLearnedCount === '' || editLearnedCount < 0
    ) {
      setErrorMsg('Please enter valid numbers (Target and Repeat must be positive).');
      return;
    }
    setErrorMsg('');

    setSaving(true);
    const payload: UpdateProgressPayload = {
      task_id: task!.id,
      ...(editNotes ? { notes: editNotes } : {}),
      ...(editStage ? { learning_stage: editStage as LearningStage } : {}),
      ...(editInterest ? { interest_level: editInterest as InterestLevel } : {}),
      learned_count: Number(editLearnedCount),
      target_count: Number(editTargetCount),
      repeat_interval: Number(editRepeatInterval),
    };
    await onUpdateProgress(payload);
    setSaving(false);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-slide-in overflow-hidden"
        role="dialog"
        aria-label="Task details"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-xs font-semibold text-violet-500 uppercase tracking-widest mb-1">Task Details</p>
            <h3 className="font-bold text-gray-900 text-base leading-snug">{task.name}</h3>
            {task.description && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TaskProgressRing percent={task.progressPercent} size={52} />
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-colors"
              aria-label="Close drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Stage & interest */}
          <div className="flex flex-wrap gap-2">
            <LearningStageBadge stage={progress?.learning_stage ?? 'Introduced'} size="md" />
            <InterestLevelIndicator level={progress?.interest_level ?? 3} size="md" />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* Learned & Target */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart2 size={12} className="text-violet-400" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Learned / Target</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={editTargetCount === '' ? 10 : editTargetCount}
                  value={editLearnedCount}
                  onChange={(e) => setEditLearnedCount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-12 px-1 py-1 text-sm font-bold text-center bg-white border border-gray-200 rounded-md outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                />
                <span className="text-gray-400 font-bold">/</span>
                <input
                  type="number"
                  min={1}
                  value={editTargetCount}
                  onChange={(e) => setEditTargetCount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-12 px-1 py-1 text-sm font-bold text-center bg-white border border-gray-200 rounded-md outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                />
              </div>
            </div>

            {/* Repeat Interval */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Repeat size={12} className="text-violet-400" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Repeat (Days)</span>
              </div>
              <input
                type="number"
                min={1}
                max={15}
                value={editRepeatInterval}
                onChange={(e) => setEditRepeatInterval(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-2 py-1 text-sm font-bold bg-white border border-gray-200 rounded-md outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
              />
            </div>

            {/* Last Practiced */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={12} className="text-violet-400" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Last Practiced</span>
              </div>
              <p className="text-sm font-bold text-gray-800">{formatRelative(progress?.last_practiced_at)}</p>
            </div>

            {/* Next Due */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar size={12} className="text-violet-400" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Next Due</span>
              </div>
              <p className="text-sm font-bold text-gray-800">{formatDate(progress?.next_due_at)}</p>
            </div>
            
          </div>

          {/* Mastery prediction */}
          {task.masteryPredictionDays !== undefined && task.masteryPredictionDays > 0 && (
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 flex items-start gap-2">
              <Lightbulb size={14} className="text-violet-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-violet-700">Mastery Prediction</p>
                <p className="text-xs text-violet-600 mt-0.5">
                  Estimated <span className="font-bold">{task.masteryPredictionDays} more sessions</span> to reach mastery at current pace.
                </p>
              </div>
            </div>
          )}

          {/* Recommended action */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
            <span className="text-base flex-shrink-0">💡</span>
            <div>
              <p className="text-xs font-semibold text-amber-700">Recommended Action</p>
              <p className="text-xs text-amber-600 mt-0.5">{task.recommendedAction}</p>
            </div>
          </div>

          {/* Scheduled badge */}
          {progress?.is_scheduled_this_week && (
            <div className="flex items-center gap-2 text-xs text-violet-600 font-medium">
              <Calendar size={13} />
              Scheduled this week
            </div>
          )}

          {/* ── Edit section ── */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Edit Progress</p>

            {/* Stage select */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Learning Stage</label>
              <select
                value={editStage || progress?.learning_stage || ''}
                onChange={(e) => setEditStage(e.target.value as LearningStage)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
              >
                <option value="">No change</option>
                {LEARNING_STAGES.filter(s => 
                  progress?.learning_stage === 'Not_Started' ? s === 'Introduced' || s === 'Not_Started' : true
                ).map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Interest */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Interest Level</label>
              <InterestLevelIndicator
                level={editInterest || progress?.interest_level || 3}
                interactive
                onSelect={(l) => setEditInterest(l)}
                size="md"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add session notes..."
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex flex-col gap-3">
          {errorMsg && (
            <p className="text-xs font-semibold text-red-500 bg-red-50 p-2 rounded-lg text-center">
              {errorMsg}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 rounded-xl transition-colors shadow-sm"
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
