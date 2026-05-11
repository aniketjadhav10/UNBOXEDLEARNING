// ============================================================
// LearningStageBadge — Colored chip for each learning stage
// ============================================================
import type { LearningStage } from '../../types/taskTypes';

interface LearningStageBadgeProps {
  stage: LearningStage | string;
  size?: 'sm' | 'md';
}

const STAGE_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
  Not_Started:     { label: '⚪ Not Started',    classes: 'bg-gray-100 text-gray-500 border border-gray-200',        dot: 'bg-gray-400'    },
  Introduced:      { label: '🌱 Introduced',     classes: 'bg-blue-100 text-blue-700 border border-blue-200',        dot: 'bg-blue-500'    },
  Practicing:      { label: '🔄 Practicing',      classes: 'bg-violet-100 text-violet-700 border border-violet-200',  dot: 'bg-violet-500'  },
  Comfortable:     { label: '📈 Comfortable',     classes: 'bg-amber-100 text-amber-700 border border-amber-200',     dot: 'bg-amber-500'   },
  Confident:       { label: '⭐ Confident',       classes: 'bg-emerald-100 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  Needs_Practice:  { label: '🔁 Needs Practice',  classes: 'bg-red-100 text-red-700 border border-red-200',          dot: 'bg-red-500'     },
};

const FALLBACK = { label: 'Unknown', classes: 'bg-gray-100 text-gray-500 border border-gray-200', dot: 'bg-gray-400' };

const sizeClasses = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-2.5 py-1' };

export function LearningStageBadge({ stage, size = 'sm' }: LearningStageBadgeProps) {
  const config = STAGE_CONFIG[stage] ?? FALLBACK;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.classes} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
      {config.label}
    </span>
  );
}

// Exported for use in filters
export const LEARNING_STAGES: LearningStage[] = [
  'Not_Started',
  'Introduced',
  'Practicing',
  'Comfortable',
  'Confident',
  'Needs_Practice',
];

export function stageColor(stage: string): string {
  return STAGE_CONFIG[stage]?.dot ?? 'bg-gray-400';
}
