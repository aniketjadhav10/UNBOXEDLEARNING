// ============================================================
// TaskCard — Main card component for a task with progress
// ============================================================
import { Calendar, Clock, Repeat, TrendingUp, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useState, useRef } from 'react';
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
  topicName?: string;
  expandableContent?: React.ReactNode;
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

function getStageProgressData(stage: string | undefined | null) {
  const normalized = stage || 'Not_Started';
  switch(normalized) {
    case 'Introduced': return { current: 1, total: 5, colorClass: 'bg-blue-400' };
    case 'Practicing': return { current: 2, total: 5, colorClass: 'bg-violet-400' };
    case 'Needs_Practice': return { current: 2, total: 5, colorClass: 'bg-red-400' };
    case 'Comfortable': return { current: 4, total: 5, colorClass: 'bg-amber-400' };
    case 'Confident': return { current: 5, total: 5, colorClass: 'bg-emerald-400' };
    default: return { current: 0, total: 5, colorClass: 'bg-gray-200' };
  }
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
  topicName,
  expandableContent,
}: TaskCardProps) {
  const { progress } = task;
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDescPopover, setShowDescPopover] = useState(false);
  const infoRef = useRef<HTMLButtonElement>(null);

  // Determine overall card style based on stage and urgency
  const isConfident = progress?.learning_stage === 'Confident';
  const isNeedsPractice = progress?.learning_stage === 'Needs_Practice';
  
  const bgStyle = task.isOverdue
    ? 'bg-rose-50 border-rose-200'
    : task.isDueToday
    ? 'bg-blue-50 border-blue-200'
    : isConfident
    ? 'bg-emerald-50 border-emerald-200'
    : isNeedsPractice
    ? 'bg-amber-50 border-amber-200'
    : 'bg-white border-gray-100 hover:bg-violet-50/30';

  const isScheduled = progress?.is_scheduled_this_week;

  return (
    <article
      className={[
        'group rounded-2xl border shadow-sm',
        'hover:shadow-md hover:-translate-y-0.5 transition-all duration-300',
        bgStyle,
        'overflow-hidden flex flex-col relative',
      ].join(' ')}
    >
      {/* ── TOP SECTION ─────────────────────────────────────── */}
      <div className="p-4 pb-2 flex gap-3">
        {/* Progress ring */}
        <div className="flex-shrink-0">
          <TaskProgressRing percent={task.progressPercent} size={44} />
        </div>

        {/* Details Column */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {/* Row 1: Title & Info */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-sm leading-tight flex-1 line-clamp-2">
              {task.name}
            </h3>
            
            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
              {task.description && (
                <div className="relative">
                  <button
                    ref={infoRef}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDescPopover((v) => !v);
                    }}
                    className="p-0.5 text-gray-400 hover:text-violet-500 transition-colors rounded"
                    aria-label="Show task description"
                  >
                    <Info size={14} />
                  </button>
                  {showDescPopover && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setShowDescPopover(false)}
                        aria-hidden="true"
                      />
                      <div className="absolute right-0 top-6 z-40 w-64 bg-gray-900 text-white text-xs rounded-xl shadow-xl p-3 leading-relaxed animate-fade-in">
                        <p className="font-semibold text-violet-300 mb-1 text-[10px] uppercase tracking-wider">Description</p>
                        <p>{task.description}</p>
                        <div className="absolute -top-1.5 right-2 w-3 h-3 bg-gray-900 rotate-45" />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Subject/Topic & Scheduled Badge */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 font-medium">
            {(subjectName || topicName) && (
              <span className="truncate max-w-[150px]">
                {subjectName} {subjectName && topicName && ' › '} {topicName}
              </span>
            )}
            {isScheduled && (
              <span className="text-[10px] font-bold text-violet-700 bg-violet-100/70 px-1.5 py-0.5 rounded border border-violet-200">
                📅 This week
              </span>
            )}
          </div>

          {/* Row 3: Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <LearningStageBadge stage={progress?.learning_stage ?? 'Introduced'} size="sm" />
            <InterestLevelIndicator
              level={(progress?.interest_level ?? 3) as InterestLevel}
              interactive
              onSelect={(l) => onUpdateInterest(task, l)}
              size="sm"
            />
            <SmartIndicators task={task} />
          </div>
        </div>
      </div>

      {/* ── MIDDLE SECTION ──────────────────────────────────── */}
      <div className="px-4 pb-2 flex-1">
        {/* Progress bar and Date row condensed */}
        <div className="flex flex-col gap-2">
          <div className="w-full flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 w-10 text-right">{task.progressPercent}%</span>
            <div className="flex-1 h-2 bg-gray-200/50 rounded-full overflow-hidden">
              <div
                className={[
                  'h-full rounded-full transition-all duration-700 ease-out',
                  task.progressPercent >= 80 ? 'bg-emerald-500' : task.progressPercent >= 50 ? 'bg-violet-500' : task.progressPercent >= 25 ? 'bg-amber-500' : 'bg-rose-500',
                ].join(' ')}
                style={{ width: `${task.progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-gray-500 flex items-center gap-0.5 whitespace-nowrap">
              <TrendingUp size={10} />
              {progress?.learned_count ?? 0}/{progress?.target_count ?? 5}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium bg-white/40 px-2 py-1 rounded-lg">
            <span className="flex items-center gap-1">
              <Clock size={10} /> {formatLastPracticed(progress?.last_practiced_at)}
            </span>
            <span className={task.isOverdue ? 'text-rose-600 font-bold' : task.isDueToday ? 'text-blue-600 font-bold' : ''}>
              <Calendar size={10} className="inline mr-1" />
              Due: {formatDate(progress?.next_due_at)}
            </span>
            <span className="flex items-center gap-1">
              <Repeat size={10} /> {progress?.repeat_interval ? `${progress.repeat_interval}d` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION — Actions ─────────────────────────── */}
      <div className="px-4 pb-3 mt-auto">
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

      {/* ── Bottom Segmented Progress Bar ── */}
      <div className="flex h-1.5 w-full gap-0.5 mt-auto bg-gray-100/50">
        {Array.from({ length: 5 }).map((_, i) => {
          const progData = getStageProgressData(progress?.learning_stage);
          return (
            <div
              key={i}
              className={`h-full flex-1 transition-colors ${
                i < progData.current ? progData.colorClass : 'bg-transparent'
              }`}
            />
          );
        })}
      </div>

      {/* ── Expand Button ── */}
      {expandableContent && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-full flex items-center justify-center py-1.5 bg-gray-50/50 hover:bg-violet-50/50 text-gray-400 hover:text-violet-600 border-t border-gray-50 transition-colors"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}

      {/* ── Expanded Content ── */}
      {expandableContent && isExpanded && (
        <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/30 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          {expandableContent}
        </div>
      )}
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
