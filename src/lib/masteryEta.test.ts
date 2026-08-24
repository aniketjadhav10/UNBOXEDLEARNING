import { describe, it, expect } from 'vitest';
import { estimateMasteryEta } from './masteryEta';

const NOW = new Date('2026-06-01T00:00:00.000Z');

describe('estimateMasteryEta', () => {
  it('reports mastered with no ETA when already Confident', () => {
    const r = estimateMasteryEta({ status: 'Confident', practiceCount: 9, startedAt: '2026-05-01T00:00:00Z' }, NOW);
    expect(r.mastered).toBe(true);
    expect(r.etaDate).toBeNull();
  });

  it('returns no ETA without enough history', () => {
    const r = estimateMasteryEta({ status: 'Introduced', practiceCount: 1, startedAt: '2026-05-31T00:00:00Z' }, NOW);
    expect(r.etaDate).toBeNull();
    expect(r.sessionsRemaining).toBe(4);
  });

  it('projects a future ETA from practice cadence', () => {
    // Started 10 days ago, practiced 10× → 1/day. Practicing needs 3 → ~3 days out.
    const r = estimateMasteryEta({ status: 'Practicing', practiceCount: 10, startedAt: '2026-05-22T00:00:00Z' }, NOW);
    expect(r.etaDate).not.toBeNull();
    expect(new Date(r.etaDate as string).getTime()).toBeGreaterThan(NOW.getTime());
    expect(r.perWeek).toBeGreaterThan(0);
  });

  it('gives a later ETA for a slower pace', () => {
    const fast = estimateMasteryEta({ status: 'Practicing', practiceCount: 20, startedAt: '2026-05-22T00:00:00Z' }, NOW);
    const slow = estimateMasteryEta({ status: 'Practicing', practiceCount: 3, startedAt: '2026-05-02T00:00:00Z' }, NOW);
    expect(new Date(slow.etaDate as string).getTime()).toBeGreaterThan(new Date(fast.etaDate as string).getTime());
  });
});
