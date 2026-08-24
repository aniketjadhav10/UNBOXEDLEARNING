// ============================================================
// masteryEta — predict "mastery of this skill by ~date Y" from a child's pace.
// Pure + deterministic (easy to test). Estimates sessions-to-mastery from the
// current stage, then projects a date using the child's practice cadence.
// ============================================================
import type { Enums } from '../types/database.types';

type LearningStage = Enums<'learning_stage'>;

/** Rough sessions still needed to reach mastery (Confident) from each stage. */
const SESSIONS_TO_MASTERY: Record<LearningStage, number> = {
  Not_Started: 5,
  Introduced: 4,
  Practicing: 3,
  Needs_Practice: 3,
  Comfortable: 1,
  Confident: 0,
};

export interface MasteryEtaInput {
  status: LearningStage;
  practiceCount: number;
  startedAt: string | null;      // when the child started the skill (progress created_at)
  lastPracticedAt?: string | null;
}

export interface MasteryEta {
  mastered: boolean;
  sessionsRemaining: number;
  /** ISO date, or null when there isn't enough history to project. */
  etaDate: string | null;
  /** estimated practices per week (for display), or null. */
  perWeek: number | null;
}

const DAY_MS = 86_400_000;

export function estimateMasteryEta(input: MasteryEtaInput, now: Date = new Date()): MasteryEta {
  const sessionsRemaining = SESSIONS_TO_MASTERY[input.status] ?? 5;
  if (sessionsRemaining === 0) {
    return { mastered: true, sessionsRemaining: 0, etaDate: null, perWeek: null };
  }
  // Need a couple of data points and a start date to infer a pace.
  if (input.practiceCount < 2 || !input.startedAt) {
    return { mastered: false, sessionsRemaining, etaDate: null, perWeek: null };
  }
  const started = new Date(input.startedAt).getTime();
  const daysElapsed = Math.max(1, (now.getTime() - started) / DAY_MS);
  const perDay = input.practiceCount / daysElapsed;
  if (perDay <= 0) {
    return { mastered: false, sessionsRemaining, etaDate: null, perWeek: null };
  }
  const daysNeeded = Math.ceil(sessionsRemaining / perDay);
  const eta = new Date(now.getTime() + daysNeeded * DAY_MS);
  return {
    mastered: false,
    sessionsRemaining,
    etaDate: eta.toISOString(),
    perWeek: Math.round(perDay * 7 * 10) / 10,
  };
}
