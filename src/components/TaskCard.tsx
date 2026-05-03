import { CheckCircle2, Circle, LoaderCircle } from 'lucide-react';
import type { LearningTask } from '../types';

interface TaskCardProps {
  task: LearningTask;
  onComplete: (task: LearningTask) => void;
}

const statusIcon = {
  not_started: Circle,
  in_progress: LoaderCircle,
  completed: CheckCircle2,
};

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const Icon = statusIcon[task.status];

  return (
    <article className="rounded-md border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <Icon className="mt-1 text-moss" aria-hidden="true" size={20} />
          <div>
            <h3 className="font-semibold text-ink">{task.title}</h3>
            {task.notes && <p className="mt-1 text-sm text-ink/65">{task.notes}</p>}
            <p className="mt-2 text-xs uppercase tracking-wide text-ink/50">
              {task.status.replace('_', ' ')}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={task.status === 'completed'}
          onClick={() => onComplete(task)}
          className="rounded-md bg-moss px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-ink/30"
        >
          Complete
        </button>
      </div>
    </article>
  );
}
