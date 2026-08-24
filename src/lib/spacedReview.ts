// ============================================================
// spacedReview — SM-2-lite spacing for skill mastery reviews.
// Pure + deterministic so it's easy to unit-test and safe to run on the client
// (at practice time) and on the server (the nightly adaptive-review cron).
//
// On success the review interval steps up (1→3→7→14→30→60 days); on a struggle
// it resets to 1 day so the skill resurfaces quickly.
// ============================================================
export const REVIEW_STEPS_DAYS = [1, 3, 7, 14, 30, 60] as const;

export interface ReviewSchedule {
  intervalDays: number;
  nextReviewAt: string; // ISO timestamp
}

/**
 * Given the previous interval (0 if never reviewed) and whether this attempt
 * succeeded, return the next interval and due date.
 */
export function computeNextReview(
  prevIntervalDays: number,
  success: boolean,
  now: Date = new Date(),
): ReviewSchedule {
  let intervalDays: number;
  if (!success) {
    intervalDays = REVIEW_STEPS_DAYS[0];
  } else {
    const next = REVIEW_STEPS_DAYS.find((s) => s > prevIntervalDays);
    intervalDays = next ?? REVIEW_STEPS_DAYS[REVIEW_STEPS_DAYS.length - 1];
  }
  const due = new Date(now);
  due.setDate(due.getDate() + intervalDays);
  return { intervalDays, nextReviewAt: due.toISOString() };
}

/** True if a review is due (next_review_at is set and in the past). */
export function isReviewDue(nextReviewAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!nextReviewAt) return false;
  return new Date(nextReviewAt).getTime() <= now.getTime();
}
