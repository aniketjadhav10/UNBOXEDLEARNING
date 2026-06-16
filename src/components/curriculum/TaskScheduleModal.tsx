import { Save, X, CalendarDays, Star, Repeat, Target, BrainCircuit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTaskProgress } from '../../services/curriculumService';
import { updateTaskProgress } from '../../services/taskService';
import type { SupabaseTaskProgress, LearningStage, InterestLevel } from '../../types/taskTypes';

interface TaskScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  childId: string;
  onSaved: () => void;
}

const LEARNING_STAGES = [
  { value: 'Not_Started', label: 'Not Started', color: 'text-gray-500 bg-gray-100' },
  { value: 'Introduced', label: 'Introduced', color: 'text-cyan-600 bg-cyan-50' },
  { value: 'Practicing', label: 'Practicing', color: 'text-indigo-600 bg-indigo-50' },
  { value: 'Comfortable', label: 'Comfortable', color: 'text-blue-600 bg-blue-50' },
  { value: 'Confident', label: 'Confident (Mastered)', color: 'text-emerald-600 bg-emerald-50' },
  { value: 'Needs_Practice', label: 'Needs Practice', color: 'text-amber-600 bg-amber-50' }
];

export function TaskScheduleModal({ isOpen, onClose, taskId, childId, onSaved }: TaskScheduleModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<SupabaseTaskProgress | null>(null);

  // Form state
  const [learningStage, setLearningStage] = useState<LearningStage>('Not_Started');
  const [targetCount, setTargetCount] = useState(5);
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [interestLevel, setInterestLevel] = useState<InterestLevel>(3);
  const [isScheduled, setIsScheduled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, taskId, childId]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getTaskProgress(taskId, childId);
      if (data) {
        setProgress(data);
        setLearningStage(data.learning_stage || 'Not_Started');
        setTargetCount(data.target_count || 5);
        setRepeatInterval(data.repeat_interval || 1);
        setInterestLevel(data.interest_level || 3);
        setIsScheduled(data.is_scheduled_this_week || false);
      }
    } catch (err) {
      console.error('Failed to load task progress:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateTaskProgress({
        task_id: taskId,
        learning_stage: learningStage,
        target_count: targetCount,
        repeat_interval: repeatInterval,
        interest_level: interestLevel,
        is_scheduled_this_week: isScheduled,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to update task progress:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <form
          onSubmit={handleSubmit}
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl pointer-events-auto overflow-hidden animate-slide-in"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                <CalendarDays size={16} />
              </div>
              <h3 className="text-base font-bold text-gray-900">Schedule Task</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-5 space-y-5">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Scheduled This Week Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <CalendarDays size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Schedule This Week</p>
                      <p className="text-xs text-gray-500">Prioritize task for the week</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isScheduled}
                      onChange={(e) => setIsScheduled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Learning Stage */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                    <BrainCircuit size={14} /> Learning Stage
                  </label>
                  <div className="relative">
                    <select
                      value={learningStage}
                      onChange={(e) => setLearningStage(e.target.value as LearningStage)}
                      className="w-full px-4 py-2.5 text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50 transition-all appearance-none cursor-pointer"
                    >
                      {LEARNING_STAGES.map((stage) => (
                        <option key={stage.value} value={stage.value}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Target Count */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                      <Target size={14} /> Target Goal
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={targetCount}
                      onChange={(e) => setTargetCount(Number(e.target.value))}
                      className="w-full px-4 py-2.5 text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50 transition-all"
                    />
                  </div>

                  {/* Repeat Interval */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                      <Repeat size={14} /> Repeat (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={repeatInterval}
                      onChange={(e) => setRepeatInterval(Number(e.target.value))}
                      className="w-full px-4 py-2.5 text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50 transition-all"
                    />
                  </div>
                </div>

                {/* Interest Level */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                    <Star size={14} /> Interest Level
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setInterestLevel(level as InterestLevel)}
                        className={`flex-1 h-10 rounded-xl flex items-center justify-center transition-all ${
                          interestLevel >= level
                            ? 'bg-amber-100 text-amber-500'
                            : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <Star size={18} className={interestLevel >= level ? 'fill-current' : ''} />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || saving}
              className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save size={16} /> Save Settings</>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
