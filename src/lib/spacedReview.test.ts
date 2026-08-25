import { describe, it, expect } from 'vitest';
import { computeNextReview, isReviewDue, REVIEW_STEPS_DAYS } from './spacedReview';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const daysAfter = (n: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  return d.getTime();
};

describe('computeNextReview', () => {
  it('starts at the first step for a never-reviewed skill on success', () => {
    const r = computeNextReview(0, true, NOW);
    expect(r.intervalDays).toBe(1);
    expect(new Date(r.nextReviewAt).getTime()).toBe(daysAfter(1));
  });

  it('steps up to the next interval on repeated success', () => {
    expect(computeNextReview(1, true, NOW).intervalDays).toBe(3);
    expect(computeNextReview(3, true, NOW).intervalDays).toBe(7);
    expect(computeNextReview(7, true, NOW).intervalDays).toBe(14);
  });

  it('caps at the final step', () => {
    const last = REVIEW_STEPS_DAYS[REVIEW_STEPS_DAYS.length - 1];
    expect(computeNextReview(last, true, NOW).intervalDays).toBe(last);
    expect(computeNextReview(9999, true, NOW).intervalDays).toBe(last);
  });

  it('resets to 1 day on a struggle regardless of prior interval', () => {
    expect(computeNextReview(30, false, NOW).intervalDays).toBe(1);
    expect(computeNextReview(0, false, NOW).intervalDays).toBe(1);
  });
});

describe('isReviewDue', () => {
  it('is due when next_review_at is in the past', () => {
    expect(isReviewDue('2025-12-31T00:00:00.000Z', NOW)).toBe(true);
  });
  it('is not due for a future date', () => {
    expect(isReviewDue('2026-02-01T00:00:00.000Z', NOW)).toBe(false);
  });
  it('is not due when unset', () => {
    expect(isReviewDue(null, NOW)).toBe(false);
    expect(isReviewDue(undefined, NOW)).toBe(false);
  });
});
