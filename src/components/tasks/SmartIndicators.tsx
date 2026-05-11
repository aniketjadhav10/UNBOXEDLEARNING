// ============================================================
// SmartIndicators — "Intelligent" contextual chips for a task
// ============================================================
import type { TaskWithProgress } from '../../types/taskTypes';
import { AlertTriangle, Clock, Flame, Star, Zap } from 'lucide-react';

interface SmartIndicatorsProps {
  task: TaskWithProgress;
}

export function SmartIndicators({ task }: SmartIndicatorsProps) {
  const indicators: { label: string; classes: string; Icon: React.ElementType }[] = [];
  const { progress } = task;

  if (task.isOverdue) {
    indicators.push({
      label: 'Practice Due',
      classes: 'bg-red-100 text-red-700',
      Icon: AlertTriangle,
    });
  }
  if (progress?.learning_stage === 'Confident') {
    indicators.push({ label: 'Mastered', classes: 'bg-emerald-100 text-emerald-700', Icon: Star });
  }
  if (progress?.learning_stage === 'Needs_Practice') {
    indicators.push({
      label: 'Needs Practice',
      classes: 'bg-orange-100 text-orange-700',
      Icon: Zap,
    });
  }
  if (task.isInactive) {
    indicators.push({
      label: 'Inactive 14d+',
      classes: 'bg-gray-100 text-gray-600',
      Icon: Clock,
    });
  }
  if ((progress?.interest_level ?? 3) >= 4) {
    indicators.push({
      label: 'High Interest',
      classes: 'bg-yellow-100 text-yellow-700',
      Icon: Flame,
    });
  }

  if (indicators.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {indicators.map(({ label, classes, Icon }) => (
        <span
          key={label}
          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${classes}`}
        >
          <Icon size={9} />
          {label}
        </span>
      ))}
    </div>
  );
}
