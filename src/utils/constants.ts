// ============================================================
// utils/constants.ts — App-wide constants, no magic strings
// ============================================================

// ── Learning Stages (exact DB values) ────────────────────────
export const LEARNING_STAGES = [
  'Not_Started',
  'Introduced',
  'Practicing',
  'Comfortable',
  'Confident',
  'Needs_Practice',
] as const;

export type LearningStage = typeof LEARNING_STAGES[number];

// Stages that count as "mastered / completed"
export const MASTERED_STAGES: LearningStage[] = ['Comfortable', 'Confident'];

// ── Stage display metadata ───────────────────────────────────
export const STAGE_META: Record<LearningStage, { label: string; color: string; bg: string; dot: string }> = {
  Not_Started:    { label: 'Not Started',   color: 'text-gray-500',    bg: 'bg-gray-100',    dot: 'bg-gray-400'    },
  Introduced:     { label: 'Introduced',    color: 'text-blue-700',    bg: 'bg-blue-100',    dot: 'bg-blue-500'    },
  Practicing:     { label: 'Practicing',    color: 'text-violet-700',  bg: 'bg-violet-100',  dot: 'bg-violet-500'  },
  Comfortable:    { label: 'Comfortable',   color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-500'   },
  Confident:      { label: 'Confident',     color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  Needs_Practice: { label: 'Needs Practice',color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-500'     },
};

// ── Interest Levels ──────────────────────────────────────────
export const INTEREST_LEVELS = [1, 2, 3, 4, 5] as const;
export type InterestLevel = typeof INTEREST_LEVELS[number];

export const INTEREST_META: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😴', label: 'Very Low',  color: 'text-gray-400' },
  2: { emoji: '😐', label: 'Low',       color: 'text-gray-500' },
  3: { emoji: '🙂', label: 'Neutral',   color: 'text-amber-500' },
  4: { emoji: '😊', label: 'High',      color: 'text-orange-500' },
  5: { emoji: '🤩', label: 'Very High', color: 'text-rose-500' },
};

// ── Difficulty Levels ────────────────────────────────────────
export const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

// ── Activity Types ───────────────────────────────────────────
export const ACTIVITY_TYPES = ['Quiz', 'Reading', 'Video', 'Hands-on', 'Discussion', 'Practice', 'Assessment'] as const;
export type ActivityType = typeof ACTIVITY_TYPES[number];

// ── Subject Colors / Gradients ───────────────────────────────
export const SUBJECT_GRADIENTS: Record<string, string> = {
  '#3f6b57': 'from-emerald-500 to-teal-600',
  '#8b5cf6': 'from-violet-500 to-purple-600',
  '#3b82f6': 'from-blue-500 to-cyan-600',
  '#f59e0b': 'from-amber-500 to-orange-600',
  '#ec4899': 'from-pink-500 to-rose-600',
  '#6366f1': 'from-indigo-500 to-blue-600',
  '#22c55e': 'from-lime-500 to-green-600',
  '#64748b': 'from-slate-600 to-gray-700',
  '#14b8a6': 'from-teal-500 to-cyan-600',
  '#f97316': 'from-orange-500 to-amber-600',
  '#a855f7': 'from-purple-500 to-violet-600',
  '#ef4444': 'from-red-500 to-rose-600',
};

// ── Inactivity threshold (days) ──────────────────────────────
export const INACTIVITY_THRESHOLD_DAYS = 14;
