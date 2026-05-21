// ============================================================
// TaskCard — Main card component for a task with progress
// ============================================================
import { Calendar, Clock, Repeat, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { InterestLevel, LearningStage, TaskWithProgress } from '../../types/taskTypes';
import { InterestLevelIndicator } from './InterestLevelIndicator';
import { LearningStageBadge } from './LearningStageBadge';
import { SmartIndicators } from './SmartIndicators';
import { TaskProgressRing } from './TaskProgressRing';
import { TaskQuickActions } from './TaskQuickActions';

interface TaskCardProps {
  task: TaskWithProgress;
  onMarkPracticed: (task: TaskWithProgress) => void;
  onUpdateStage: (task: TaskWithProgress, stage: LearningStage) => void;
  onUpdateInterest: (task: TaskWithProgress, level: InterestLevel) => void;
  onArchive: (taskId: string) => void;
  onUnarchive?: (taskId: string) => void;
  onOpenDetails: (task: TaskWithProgress) => void;
  onToggleSchedule?: (task: TaskWithProgress) => void;
  subjectName?: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatLastPracticed(iso?: string | null): string {
  if (!iso) return 'Never';
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

export function TaskCard({
  task,
  onMarkPracticed,
  onUpdateStage,
  onUpdateInterest,
  onArchive,
  onUnarchive,
  onOpenDetails,
  onToggleSchedule,
  subjectName,
}: TaskCardProps) {
  const { progress } = task;

  // Card border accent based on urgency
  const borderAccent = task.isOverdue
    ? 'border-l-4 border-l-red-400'
    : task.isDueToday
    ? 'border-l-4 border-l-blue-400'
    : progress?.learning_stage === 'Confident'
    ? 'border-l-4 border-l-emerald-400'
    : progress?.learning_stage === 'Needs_Practice'
    ? 'border-l-4 border-l-orange-400'
    : 'border-l-4 border-l-transparent';

  const isScheduled = progress?.is_scheduled_this_week;

  return (
    <article
      className={[
        'group bg-white rounded-2xl border border-gray-100 shadow-card',
        'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300',
        borderAccent,
        'overflow-hidden',
      ].join(' ')}
    >
      {/* ── TOP SECTION ─────────────────────────────────────── */}
      <div className="p-4 pb-0">
        <div className="flex items-start gap-3">
          {/* Progress ring */}
          <div className="flex-shrink-0 mt-0.5">
            <TaskProgressRing percent={task.progressPercent} size={52} />
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 text-sm leading-snug flex-1">
                {task.name}
              </h3>
              {isScheduled && (
                <span className="flex-shrink-0 text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                  📅 This week
                </span>
              )}
            </div>

            {/* Subject + topic */}
            {subjectName && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{subjectName}</p>
            )}

            {/* Stage + interest row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <LearningStageBadge stage={progress?.learning_stage ?? 'Introduced'} />
              <InterestLevelIndicator
                level={(progress?.interest_level ?? 3) as InterestLevel}
                interactive
                onSelect={(l) => onUpdateInterest(task, l)}
              />
            </div>
          </div>
        </div>

        {/* Smart indicators */}
        <SmartIndicators task={task} />
      </div>

      {/* ── MIDDLE SECTION ──────────────────────────────────── */}
      <div className="px-4 pt-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-medium text-gray-500">
            <span className="flex items-center gap-1">
              <TrendingUp size={11} className="text-violet-400" />
              {progress?.learned_count ?? 0} / {progress?.target_count ?? 5} sessions
            </span>
            <span className="text-violet-600 font-bold">{task.progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={[
                'h-full rounded-full transition-all duration-700 ease-out',
                task.progressPercent >= 80
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                  : task.progressPercent >= 50
                  ? 'bg-gradient-to-r from-violet-400 to-purple-500'
                  : task.progressPercent >= 25
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                  : 'bg-gradient-to-r from-red-400 to-rose-500',
              ].join(' ')}
              style={{ width: `${task.progressPercent}%` }}
              role="progressbar"
              aria-valuenow={task.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Date row */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatLastPracticed(progress?.last_practiced_at)}
          </span>
          <span
            className={[
              'flex items-center gap-1 font-medium',
              task.isOverdue ? 'text-red-500' : task.isDueToday ? 'text-blue-500' : 'text-gray-400',
            ].join(' ')}
          >
            <Calendar size={11} />
            Due: {formatDate(progress?.next_due_at)}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Repeat size={11} />
            {progress?.repeat_interval === 1 ? 'Daily' : progress?.repeat_interval === 7 ? 'Weekly' : progress?.repeat_interval ? `${progress.repeat_interval}d` : '—'}
          </span>
        </div>
      </div>

      {/* ── BOTTOM SECTION — Actions ─────────────────────────── */}
      <div className="px-4 pb-4">
        <TaskQuickActions
          task={task}
          onMarkPracticed={onMarkPracticed}
          onUpdateStage={onUpdateStage}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onToggleSchedule={onToggleSchedule}
          onExpandDetails={() => onOpenDetails(task)}
        />
      </div>

      {/* ── EXPANDED DETAILS (inline) ────────────────────────── */}
      {/* ── EXPANDED DETAILS ─────────────────────────────────── */}
      {/* (Details now open in Drawer via onOpenDetails) */}
    </article>
  );
}

// ── Skeleton loader variant ──────────────────────────────────
export function TaskCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-4 space-y-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 bg-gray-100 rounded-full w-3/4" />
          <div className="h-3 bg-gray-100 rounded-full w-1/2" />
          <div className="flex gap-2">
            <div className="h-5 bg-gray-100 rounded-full w-24" />
            <div className="h-5 bg-gray-100 rounded-full w-16" />
          </div>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full" />
      <div className="flex gap-2">
        <div className="h-7 bg-gray-100 rounded-lg w-20" />
        <div className="h-7 bg-gray-100 rounded-lg w-16" />
      </div>
    </div>
  );
}
