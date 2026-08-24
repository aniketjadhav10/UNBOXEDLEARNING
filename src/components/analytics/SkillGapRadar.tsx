// ============================================================
// SkillGapRadar — whole-child mastery across the 7 development domains.
// A recharts radar of mastery %, with the weakest/uncovered domains called out
// as gaps to fill. Data comes from get_domain_mastery via roadmapService.
// ============================================================
'use client';
import { useMemo } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { DEVELOPMENT_DOMAINS } from '../../types/domains';
import type { DomainMastery } from '../../services/roadmapService';

export function SkillGapRadar({ mastery }: { mastery: DomainMastery[] }) {
  const byDomain = useMemo(
    () => new Map(mastery.map((m) => [m.development_domain, m])),
    [mastery],
  );

  const data = useMemo(
    () => DEVELOPMENT_DOMAINS.map((d) => {
      const m = byDomain.get(d.value);
      return {
        domain: d.label,
        emoji: d.emoji,
        pct: m ? Number(m.mastery_pct) || 0 : 0,
        total: m?.total_skills ?? 0,
        mastered: m?.mastered_skills ?? 0,
      };
    }),
    [byDomain],
  );

  const covered = data.filter((d) => d.total > 0);
  const uncovered = data.filter((d) => d.total === 0);
  // Weakest covered domain (lowest mastery) = the clearest "focus here" gap.
  const weakest = covered.length ? covered.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-base font-bold text-gray-900">Skill-gap radar</h3>
      <p className="text-xs text-gray-400 mb-2">Mastery across the whole-child domains</p>

      {covered.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">
          No skill progress yet — generate a curriculum and start practicing to see the radar.
        </p>
      ) : (
        <>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="72%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} angle={90} />
                <Radar name="Mastery %" dataKey="pct" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.35} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((v: any, _n: any, p: any) => [`${v}% (${p?.payload?.mastered}/${p?.payload?.total})`, 'Mastered']) as any}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-1.5 text-sm">
            {weakest && weakest.pct < 100 && (
              <p className="text-gray-600">
                <span className="font-semibold text-amber-600">Focus area:</span> {weakest.domain} — {weakest.pct}% mastered
              </p>
            )}
            {uncovered.length > 0 && (
              <p className="text-gray-500">
                <span className="font-semibold text-rose-500">Gaps:</span>{' '}
                {uncovered.map((d) => `${d.emoji} ${d.domain}`).join(', ')} — no skills yet
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
