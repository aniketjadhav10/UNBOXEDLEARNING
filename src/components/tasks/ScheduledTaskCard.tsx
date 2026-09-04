import { BookOpen, CalendarCheck, Check, ChevronDown, Clock, Layers, PlayCircle, RotateCcw, SkipForward } from 'lucide-react';
import { useState } from 'react';
import type { ScheduledSessionView } from '../../services/scheduleService';
import type { DbSubject, DbTask, DbTaskProgress, DbTopic, SessionStatus } from '../../types/database';

interface ScheduledTaskCardProps {
  session: ScheduledSessionView;
  task?: DbTask;
  topic?: DbTopic;
  subject?: DbSubject;
  progress?: DbTaskProgress;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onReset: (id: string) => void;
}

const STATUS_STYLE: Record<SessionStatus, string> = {
  planned: 'bg-gray-100 text-gray-600 border-gray-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  skipped: 'bg-amber-50 text-amber-700 border-amber-200',
};

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function stageLabel(stage?: string | null): string {
  return (stage ?? 'Not_Started').replace('_', ' ');
}

function progressPercent(progress?: DbTaskProgress): number {
  if (!progress) return 0;
  const target = progress.target_count || 5;
  return Math.min(100, Math.round((progress.learned_count / target) * 100));
}

function InfoBadge({
  children,
  info,
  className = '',
}: {
  children: React.ReactNode;
  info: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex min-w-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={info}
        className={`inline-flex min-h-6 max-w-full items-center gap-1 rounded-full border px-2 text-[11px] font-bold leading-none ${className}`}
      >
        {children}
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="Close badge information" onClick={() => setOpen(false)} />
          <span className="absolute left-0 top-7 z-50 w-56 rounded-xl border border-gray-100 bg-white p-3 text-left text-xs font-medium leading-relaxed text-gray-600 shadow-xl">
            {info}
          </span>
        </>
      )}
    </span>
  );
}

export function ScheduledTaskCard({
  session,
  task,
  topic,
  subject,
  progress,
  onComplete,
  onSkip,
  onReset,
}: ScheduledTaskCardProps) {
  const percent = progressPercent(progress);
  const stage = stageLabel(progress?.learning_stage);
  const learned = progress?.learned_count ?? 0;
  const target = progress?.target_count ?? 5;
  const kindLabel = task?.task_type ?? session.kind;
  const description = task?.description || topic?.description || 'Scheduled learning session.';

  return (
    <article className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex gap-3">
          <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-black text-rose-500">
            <span
              className="absolute inset-0 rounded-full"
              style={{ background: `conic-gradient(#8b5cf6 ${percent * 3.6}deg, #e5e7eb 0deg)` }}
            />
            <span className="absolute inset-1 rounded-full bg-white" />
            <span className="relative">{percent}%</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`line-clamp-2 text-base font-black leading-tight ${session.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                {session.label}
              </h3>
              <InfoBadge info={`Status: ${session.status.replace('_', ' ')}`} className={STATUS_STYLE[session.status]}>
                {session.status.replace('_', ' ')}
              </InfoBadge>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <InfoBadge info={`Type: ${kindLabel}`} className="border-violet-100 bg-violet-50 text-violet-700">
                <PlayCircle size={12} /> {kindLabel}
              </InfoBadge>
              {task?.estimated_minutes ? (
                <InfoBadge info={`Estimated time: ${task.estimated_minutes} minutes`} className="border-blue-100 bg-blue-50 text-blue-700">
                  <Clock size={12} /> {task.estimated_minutes} min
                </InfoBadge>
              ) : null}
              {subject ? (
                <InfoBadge info={`Subject: ${subject.name}`} className="border-gray-100 bg-gray-50 text-gray-600">
                  <BookOpen size={12} /> <span className="max-w-[7rem] truncate">{subject.name}</span>
                </InfoBadge>
              ) : null}
              {topic ? (
                <InfoBadge info={`Topic: ${topic.title}`} className="border-gray-100 bg-gray-50 text-gray-600">
                  <Layers size={12} /> <span className="max-w-[7rem] truncate">{topic.title}</span>
                </InfoBadge>
              ) : null}
            </div>

            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500">{description}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <InfoBadge info={`Learning stage: ${stage}`} className="border-violet-200 bg-violet-50 text-violet-700">
            <RotateCcw size={12} /> {stage}
          </InfoBadge>
          <InfoBadge info={`Progress: ${learned} of ${target} practices completed`} className="border-gray-100 bg-gray-50 text-gray-600">
            {learned}/{target}
          </InfoBadge>
          <InfoBadge info={`Scheduled date: ${formatDate(session.scheduled_date)}`} className="border-blue-100 bg-blue-50 text-blue-700">
            <CalendarCheck size={12} /> {formatDate(session.scheduled_date)}
          </InfoBadge>
          <InfoBadge info="This item is included in the current week plan." className="border-violet-100 bg-violet-50 text-violet-700">
            This Week
          </InfoBadge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 border-t border-gray-100 bg-gray-50/80 p-2">
        {session.status !== 'completed' ? (
          <button onClick={() => onComplete(session.id)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-white text-xs font-bold text-emerald-600 shadow-sm">
            <Check size={14} /> Done
          </button>
        ) : (
          <button onClick={() => onReset(session.id)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-white text-xs font-bold text-gray-500 shadow-sm">
            <RotateCcw size={14} /> Reset
          </button>
        )}
        {session.status === 'planned' ? (
          <button onClick={() => onSkip(session.id)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-white text-xs font-bold text-amber-600 shadow-sm">
            <SkipForward size={14} /> Skip
          </button>
        ) : (
          <button onClick={() => onReset(session.id)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-white text-xs font-bold text-gray-500 shadow-sm">
            <RotateCcw size={14} /> Plan
          </button>
        )}
        <InfoBadge info={task?.parent_guide || task?.learning_objective || description} className="h-10 w-full justify-center border-white bg-white text-violet-700 shadow-sm">
          Details <ChevronDown size={13} />
        </InfoBadge>
      </div>
    </article>
  );
}