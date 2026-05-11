// ============================================================
// utils/date.ts — Date/time utility functions
// ============================================================

import { INACTIVITY_THRESHOLD_DAYS } from './constants';

const TODAY_DATE = () => new Date().toISOString().split('T')[0];

/** Format a date string to a readable display string */
export function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(isoStr));
  } catch {
    return '—';
  }
}

/** Format a date as a relative string (e.g. "2 days ago", "in 3 days") */
export function formatRelative(isoStr: string | null | undefined): string {
  if (!isoStr) return 'Never';
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)  return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  return `${Math.floor(diff / 30)} months ago`;
}

/** Check if a due date is in the past */
export function isOverdue(nextDueAt: string | null | undefined): boolean {
  if (!nextDueAt) return false;
  return new Date(nextDueAt) < new Date(new Date().setHours(0, 0, 0, 0));
}

/** Check if a due date is today */
export function isDueToday(nextDueAt: string | null | undefined): boolean {
  if (!nextDueAt) return false;
  return nextDueAt.split('T')[0] === TODAY_DATE();
}

/** Check if a task has been inactive for INACTIVITY_THRESHOLD_DAYS days */
export function isInactive(lastPracticedAt: string | null | undefined): boolean {
  if (!lastPracticedAt) return true;
  const diff = (Date.now() - new Date(lastPracticedAt).getTime()) / (1000 * 60 * 60 * 24);
  return diff > INACTIVITY_THRESHOLD_DAYS;
}

/** Get a short human-readable repeat interval from numeric days */
export function formatRepeatInterval(days: number | null | undefined): string {
  if (!days) return '—';
  if (days === 1) return 'Daily';
  if (days === 7) return 'Weekly';
  if (days === 14) return 'Bi-weekly';
  if (days === 30) return 'Monthly';
  return `Every ${days}d`;
}

/** Compute age from date of birth string */
export function computeAge(dob: string | null): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/** Check how many of last N days had at least one practice session */
export function computeConsistencyScore(practiceDates: (string | null | undefined)[], days = 7): number {
  if (practiceDates.length === 0) return 0;
  const todayMs = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;
  const activeDays = new Set<string>();
  for (const d of practiceDates) {
    if (!d) continue;
    const diffDays = Math.floor((todayMs - new Date(d).getTime()) / dayMs);
    if (diffDays < days) activeDays.add(new Date(d).toISOString().split('T')[0]);
  }
  return Math.round((activeDays.size / days) * 100);
}
