// ============================================================
// TaskQuickActions — bottom action bar for a task card
// ============================================================
import { Archive, Calendar, ChevronDown, Plus, RotateCcw } from 'lucide-react';
import type { LearningStage, TaskWithProgress } from '../../types/taskTypes';
import { LEARNING_STAGES } from './LearningStageBadge';
import { useState } from 'react';

interface TaskQuickActionsProps {
  task: TaskWithProgress;
  onMarkPracticed: (task: TaskWithProgress) => void;
  onUpdateStage: (task: TaskWithProgress, stage: LearningStage) => void;
  onArchive: (taskId: string) => void;
  onToggleSchedule?: (task: TaskWithProgress) => void;
  onExpandDetails: () => void;
}

export function TaskQuickActions({
  task,
  onMarkPracticed,
  onUpdateStage,
  onArchive,
  onToggleSchedule,
  onExpandDetails,
}: TaskQuickActionsProps) {
  const [stageMenuOpen, setStageMenuOpen] = useState(false);
  const isNotStarted = task.progress?.learning_stage === 'Not_Started';
  const isConfident = task.progress?.learning_stage === 'Confident';
  const isFullyMastered = isConfident && (task.progress?.learned_count ?? 0) >= (task.progress?.target_count ?? 5);

  return (
    <div className="relative flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
      {/* Mark Practiced */}
      <button
        id={`practice-${task.id}`}
        onClick={() => onMarkPracticed(task)}
        disabled={isNotStarted || isFullyMastered}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:shadow-sm active:scale-95"
      >
        <Plus size={12} />
        Practiced
      </button>

      {/* Stage dropdown */}
      {!isFullyMastered && (
        <div className="relative">
        <button
          onClick={() => setStageMenuOpen((v) => !v)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-lg transition-all duration-200"
        >
          <RotateCcw size={11} />
          Stage
          <ChevronDown size={11} className={`transition-transform ${stageMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {stageMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setStageMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px] animate-fade-in">
              {LEARNING_STAGES.filter(s => 
                task.progress?.learning_stage === 'Not_Started' ? s === 'Introduced' || s === 'Not_Started' : true
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onUpdateStage(task, s);
                    setStageMenuOpen(false);
                  }}
                  className={[
                    'w-full text-left px-3 py-2 text-xs font-medium hover:bg-violet-50 hover:text-violet-700 transition-colors',
                    task.progress?.learning_stage === s ? 'text-violet-700 bg-violet-50' : 'text-gray-600',
                  ].join(' ')}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      )}

      {/* Reschedule button */}
      <button
        onClick={() => onToggleSchedule?.(task)}
        disabled={isNotStarted}
        className={[
          isFullyMastered 
            ? "flex-1 px-3 py-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            : "p-1.5 rounded-lg transition-colors disabled:opacity-50",
          task.progress?.is_scheduled_this_week
            ? "text-violet-600 bg-violet-50 hover:bg-violet-100"
            : "text-gray-500 hover:text-violet-600 hover:bg-violet-50"
        ].join(" ")}
        title={task.progress?.is_scheduled_this_week ? "Unschedule" : "Schedule for this week"}
      >
        <Calendar size={13} />
        {isFullyMastered && <span>{task.progress?.is_scheduled_this_week ? "Scheduled this week" : "Learn this week"}</span>}
      </button>

      {/* Archive */}
      <button
        onClick={() => {
          if (window.confirm("Are you sure you want to archive this task?")) {
            onArchive(task.id);
          }
        }}
        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title="Archive task"
      >
        <Archive size={13} />
      </button>

      {/* Expand details */}
      <button
        onClick={onExpandDetails}
        className="ml-auto flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors"
      >
        Details
        <ChevronDown size={12} />
      </button>
    </div>
  );
}
