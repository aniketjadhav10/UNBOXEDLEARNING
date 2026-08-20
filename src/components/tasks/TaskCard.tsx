import { Calendar, Clock, Repeat, TrendingUp, ChevronDown, ChevronUp, BookOpen, PenTool, Beaker, FileText, CheckSquare, MessageSquare, PlayCircle, Target } from 'lucide-react';
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
  topicName?: string;
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

const getTaskTypeIcon = (type?: string) => {
  switch (type) {
    case 'reading': return <BookOpen size={14} className="text-blue-500" />;
    case 'quiz': return <CheckSquare size={14} className="text-amber-500" />;
    case 'project': return <PenTool size={14} className="text-rose-500" />;
    case 'worksheet': return <FileText size={14} className="text-gray-500" />;
    case 'experiment': return <Beaker size={14} className="text-emerald-500" />;
    case 'discussion': return <MessageSquare size={14} className="text-fuchsia-500" />;
    case 'lesson': default: return <PlayCircle size={14} className="text-violet-500" />;
  }
};

const getStageGradient = (stage?: string | null) => {
  switch(stage) {
    case 'Introduced': return 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200';
    case 'Practicing': return 'bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200';
    case 'Needs_Practice': return 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200';
    case 'Comfortable': return 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200';
    case 'Confident': return 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200';
    default: return 'bg-white hover:bg-gray-50/50 border-gray-100';
  }
};

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
}: TaskCardProps) {
  const { progress } = task;
  const [isExpanded, setIsExpanded] = useState(false);

  const bgStyle = task.isOverdue
    ? 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-200'
    : getStageGradient(progress?.learning_stage);

  const isScheduled = progress?.is_scheduled_this_week;
  const hasDetails = task.materials_needed?.length || task.parent_guide || task.learning_objective;

  return (
    <article className={`group rounded-3xl border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ${bgStyle} overflow-hidden flex flex-col relative`}>
      
      {/* ── TOP SECTION ─────────────────────────────────────── */}
      <div className="p-5 pb-3 flex gap-4">
        {/* Progress ring */}
        <div className="flex-shrink-0 mt-1">
          <TaskProgressRing percent={task.progressPercent} size={48} />
        </div>

        {/* Details Column */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Row 1: Title & Badges */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-gray-900 text-base leading-tight flex-1 line-clamp-2">
              {task.name}
            </h3>
            {task.is_assessment && (
              <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
                Assessment
              </span>
            )}
          </div>

          {/* Row 2: Type, Time, Subject/Topic */}
          <div className="flex items-center gap-3 flex-wrap text-xs font-medium">
            <div className="flex items-center gap-1.5 bg-white/60 px-2 py-1 rounded-lg border border-gray-200/50">
              {getTaskTypeIcon(task.task_type)}
              <span className="capitalize text-gray-700">{task.task_type || 'Lesson'}</span>
            </div>
            
            {task.estimated_minutes && (
              <div className="flex items-center gap-1 text-gray-500 bg-white/60 px-2 py-1 rounded-lg border border-gray-200/50">
                <Clock size={12} className="text-blue-500" />
                {task.estimated_minutes} min
              </div>
            )}
            
            {(subjectName || topicName) && (
              <span className="text-gray-400 truncate max-w-[150px]">
                {subjectName} {subjectName && topicName && ' › '} {topicName}
              </span>
            )}
          </div>

          <p className="text-gray-500 text-sm line-clamp-2 mt-1">
            {task.description}
          </p>

          {/* Row 3: Interactive Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <LearningStageBadge stage={progress?.learning_stage ?? 'Introduced'} size="sm" />
            <InterestLevelIndicator level={(progress?.interest_level ?? 3) as InterestLevel} interactive onSelect={(l) => onUpdateInterest(task, l)} size="sm" />
            <SmartIndicators task={task} />
            {isScheduled && (
              <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-1 rounded-md border border-violet-200 ml-auto">
                📅 Scheduled
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── MIDDLE SECTION ──────────────────────────────────── */}
      <div className="px-5 pb-3 flex-1">
        <div className="flex flex-col gap-3">
          <div className="w-full flex items-center gap-3">
            <span className="text-xs font-bold text-gray-700 w-8 text-right">{task.progressPercent}%</span>
            <div className="flex-1 h-2.5 bg-gray-200/50 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${task.progressPercent >= 80 ? 'bg-emerald-500' : task.progressPercent >= 50 ? 'bg-violet-500' : task.progressPercent >= 25 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${task.progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1 whitespace-nowrap bg-white/50 px-2 py-0.5 rounded-md">
              <TrendingUp size={12} />
              {progress?.learned_count ?? 0}/{progress?.target_count ?? 5}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600 font-medium bg-white/60 px-3 py-2 rounded-xl border border-gray-100 shadow-sm">
            <span className="flex items-center gap-1.5"><Clock size={12} className="text-gray-400" /> {formatLastPracticed(progress?.last_practiced_at)}</span>
            <span className={task.isOverdue ? 'text-rose-600 font-bold' : task.isDueToday ? 'text-blue-600 font-bold' : ''}>
              <Calendar size={12} className="inline mr-1 text-gray-400" /> Due: {formatDate(progress?.next_due_at)}
            </span>
            <span className="flex items-center gap-1.5"><Repeat size={12} className="text-gray-400" /> {progress?.repeat_interval ? `${progress.repeat_interval}d` : '—'}</span>
          </div>
        </div>
      </div>

      {/* ── ACTIONS ─────────────────────────────────────────── */}
      <div className="px-5 pb-4 mt-auto">
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

      {/* ── EXPANDABLE DRAWER ─────────────────────────────────── */}
      {hasDetails && (
        <div className="border-t border-gray-200/50 bg-white/40">
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="w-full flex items-center justify-center py-2 text-gray-400 hover:text-violet-600 hover:bg-white/60 transition-colors"
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {isExpanded && (
            <div className="px-5 pb-5 pt-2 animate-fade-in space-y-4" onClick={(e) => e.stopPropagation()}>
              {/* Learning Objective */}
              {task.learning_objective && (
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-800 flex items-center gap-1.5 mb-1"><Target size={14} /> Objective</h4>
                  <p className="text-xs text-blue-900/80 leading-relaxed">{task.learning_objective}</p>
                </div>
              )}
              
              {/* Materials */}
              {task.materials_needed && task.materials_needed.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 mb-1.5 ml-1">Materials Needed</h4>
                  <ul className="flex flex-wrap gap-1.5">
                    {task.materials_needed.map((item, idx) => (
                      <li key={idx} className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md border border-gray-200 font-medium">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Parent Guide */}
              {task.parent_guide && (
                <div className="bg-violet-50 p-4 rounded-xl border border-violet-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><Info size={40} /></div>
                  <h4 className="text-xs font-bold text-violet-900 mb-1.5 uppercase tracking-wider">Parent Guide</h4>
                  <p className="text-xs text-violet-800/80 leading-relaxed relative z-10">{task.parent_guide}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-5 space-y-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-4 bg-gray-100 rounded-full w-3/4" />
          <div className="flex gap-2"><div className="h-6 bg-gray-100 rounded-lg w-20" /><div className="h-6 bg-gray-100 rounded-lg w-16" /></div>
          <div className="h-3 bg-gray-100 rounded-full w-full" />
          <div className="h-3 bg-gray-100 rounded-full w-2/3" />
        </div>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full w-full mt-4" />
      <div className="flex justify-between mt-4">
        <div className="h-8 bg-gray-100 rounded-lg w-1/4" /><div className="h-8 bg-gray-100 rounded-lg w-1/4" /><div className="h-8 bg-gray-100 rounded-lg w-1/4" />
      </div>
    </div>
  );
}
