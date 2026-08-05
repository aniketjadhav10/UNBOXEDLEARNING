// ============================================================
// LearningStageBadge — Colored chip for each learning stage
// ============================================================
import type { LearningStage } from '../../types/taskTypes';
import { Circle, Sprout, RefreshCw, TrendingUp, Star, AlertCircle } from 'lucide-react';
import React from 'react';

interface LearningStageBadgeProps {
  stage: LearningStage | string;
  size?: 'sm' | 'md';
}

const STAGE_CONFIG: Record<string, { label: string; icon: React.ElementType; classes: string }> = {
  Not_Started:     { label: 'Not Started',    icon: Circle,       classes: 'bg-gray-100 text-gray-500 border border-gray-200' },
  Introduced:      { label: 'Introduced',     icon: Sprout,       classes: 'bg-blue-100/50 text-blue-700 border border-blue-200/50' },
  Practicing:      { label: 'Practicing',     icon: RefreshCw,    classes: 'bg-violet-100/50 text-violet-700 border border-violet-200/50' },
  Comfortable:     { label: 'Comfortable',    icon: TrendingUp,   classes: 'bg-amber-100/50 text-amber-700 border border-amber-200/50' },
  Confident:       { label: 'Confident',      icon: Star,         classes: 'bg-emerald-100/50 text-emerald-700 border border-emerald-200/50' },
  Needs_Practice:  { label: 'Needs Practice', icon: AlertCircle,  classes: 'bg-rose-100/50 text-rose-700 border border-rose-200/50' },
};

const FALLBACK = { label: 'Unknown', icon: Circle, classes: 'bg-gray-100 text-gray-500 border border-gray-200' };

const sizeClasses = { sm: 'text-[10px] px-2 py-0.5', md: 'text-xs px-2.5 py-1' };

export function LearningStageBadge({ stage, size = 'sm' }: LearningStageBadgeProps) {
  const config = STAGE_CONFIG[stage] ?? FALLBACK;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider ${config.classes} ${sizeClasses[size]}`}
    >
      <Icon size={size === 'sm' ? 10 : 12} />
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
  // Use text color class to represent the dot color in filters
  return STAGE_CONFIG[stage]?.classes.split(' ').find(c => c.startsWith('text-'))?.replace('text-', 'bg-') ?? 'bg-gray-400';
}
