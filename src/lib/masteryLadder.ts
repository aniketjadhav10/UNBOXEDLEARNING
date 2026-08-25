// ============================================================
// masteryLadder — UI labels for the learning_stage enum.
// The DB enum values are kept (Not_Started … Needs_Practice); the roadmap
// relabels them to the parent-facing mastery ladder (🌱 Beginner → 🏆 Mastery)
// without a breaking enum migration. Shared by the roadmap and the adaptive
// engine's surfaces.
// ============================================================
import type { Enums } from '../types/database.types';

export type LearningStage = Enums<'learning_stage'>;

export interface MasteryRung {
  /** parent-facing label */
  label: string;
  emoji: string;
  /** tailwind text/bg classes for a chip */
  chip: string;
}

export const MASTERY_LADDER: Record<LearningStage, MasteryRung> = {
  Not_Started:    { label: 'Not started',   emoji: '○',  chip: 'bg-gray-100 text-gray-500' },
  Introduced:     { label: 'Beginner',      emoji: '🌱', chip: 'bg-lime-100 text-lime-700' },
  Practicing:     { label: 'Practicing',    emoji: '🌳', chip: 'bg-emerald-100 text-emerald-700' },
  Comfortable:    { label: 'Proficient',    emoji: '⭐', chip: 'bg-sky-100 text-sky-700' },
  Confident:      { label: 'Mastery',       emoji: '🏆', chip: 'bg-violet-100 text-violet-700' },
  Needs_Practice: { label: 'Needs practice', emoji: '🔁', chip: 'bg-amber-100 text-amber-700' },
};

/** Stages ordered as a progression, for status pickers. */
export const LADDER_ORDER: LearningStage[] = [
  'Not_Started', 'Introduced', 'Practicing', 'Comfortable', 'Confident', 'Needs_Practice',
];

export function masteryRung(stage: LearningStage): MasteryRung {
  return MASTERY_LADDER[stage] ?? MASTERY_LADDER.Not_Started;
}
