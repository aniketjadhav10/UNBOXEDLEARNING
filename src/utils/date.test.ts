import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  formatDate, 
  formatRelative, 
  isOverdue, 
  isDueToday, 
  isInactive, 
  formatRepeatInterval, 
  computeAge, 
  computeConsistencyScore 
} from './date';
import { INACTIVITY_THRESHOLD_DAYS } from './constants';

describe('Date Utilities', () => {
  beforeEach(() => {
    // Mock system time to a fixed date to make tests deterministic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-06T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDate', () => {
    it('formats valid ISO string', () => {
      expect(formatDate('2026-08-06T12:00:00Z')).toBe('Aug 6, 2026');
    });

    it('returns — for empty or invalid dates', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate('')).toBe('—');
      expect(formatDate('invalid-date')).toBe('—');
    });
  });

  describe('formatRelative', () => {
    it('formats Today', () => {
      expect(formatRelative('2026-08-06T08:00:00Z')).toBe('Today');
    });

    it('formats Yesterday', () => {
      expect(formatRelative('2026-08-05T12:00:00Z')).toBe('Yesterday');
    });

    it('formats days ago', () => {
      expect(formatRelative('2026-08-03T12:00:00Z')).toBe('3 days ago');
    });

    it('formats weeks ago', () => {
      expect(formatRelative('2026-07-20T12:00:00Z')).toBe('2 weeks ago');
    });

    it('formats months ago', () => {
      expect(formatRelative('2026-05-15T12:00:00Z')).toBe('2 months ago');
    });

    it('handles null', () => {
      expect(formatRelative(null)).toBe('Never');
    });
  });

  describe('isOverdue', () => {
    it('returns true for past dates before today', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isOverdue(yesterday.toISOString())).toBe(true);
    });

    it('returns false for today', () => {
      expect(isOverdue('2026-08-06T23:59:59Z')).toBe(false);
    });

    it('returns false for future dates', () => {
      expect(isOverdue('2026-08-07T00:00:00Z')).toBe(false);
    });
  });

  describe('isDueToday', () => {
    it('returns true for today', () => {
      expect(isDueToday(new Date().toISOString())).toBe(true);
    });

    it('returns false for other days', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isDueToday(tomorrow.toISOString())).toBe(false);
    });
  });

  describe('isInactive', () => {
    it('returns true if date is older than INACTIVITY_THRESHOLD_DAYS', () => {
      const pastDate = new Date(Date.now() - (INACTIVITY_THRESHOLD_DAYS + 1) * 24 * 60 * 60 * 1000);
      expect(isInactive(pastDate.toISOString())).toBe(true);
    });

    it('returns false if date is newer', () => {
      expect(isInactive('2026-08-05T12:00:00Z')).toBe(false);
    });

    it('returns true for null', () => {
      expect(isInactive(null)).toBe(true);
    });
  });

  describe('formatRepeatInterval', () => {
    it('formats numeric days into readable strings', () => {
      expect(formatRepeatInterval(1)).toBe('Daily');
      expect(formatRepeatInterval(7)).toBe('Weekly');
      expect(formatRepeatInterval(14)).toBe('Bi-weekly');
      expect(formatRepeatInterval(30)).toBe('Monthly');
      expect(formatRepeatInterval(3)).toBe('Every 3d');
    });
  });

  describe('computeAge', () => {
    it('computes correct age', () => {
      // Born 2016-08-01 -> 10 years old (since today is 2026-08-06)
      expect(computeAge('2016-08-01T00:00:00Z')).toBe(10);
      // Born 2016-08-10 -> 9 years old (hasn't had birthday yet)
      expect(computeAge('2016-08-10T00:00:00Z')).toBe(9);
    });
  });

  describe('computeConsistencyScore', () => {
    it('computes percentage of active days', () => {
      const dates = [
        '2026-08-06T12:00:00Z', // today
        '2026-08-05T12:00:00Z', // yesterday
        '2026-08-05T15:00:00Z', // yesterday (duplicate)
        '2026-08-01T12:00:00Z', // 5 days ago
      ];
      // 3 unique active days in the last 7 days (7 days is default)
      // 3 / 7 = 43%
      expect(computeConsistencyScore(dates)).toBe(Math.round((3 / 7) * 100));
    });

    it('returns 0 for empty array', () => {
      expect(computeConsistencyScore([])).toBe(0);
    });
  });
});
