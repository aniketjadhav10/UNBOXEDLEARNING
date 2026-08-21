// ============================================================
// DevelopmentOverviewPage — whole-child (360°) view: subjects
// grouped across the 7 development domains, highlighting gaps.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { Compass, RefreshCw, AlertTriangle } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { DEVELOPMENT_DOMAINS } from '../../types/domains';
import { fetchDomainSubjects, type DomainSubject } from '../../services/domainService';

export function DevelopmentOverviewPage() {
  useDocumentTitle('360° Development');
  const [subjects, setSubjects] = useState<DomainSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSubjects(await fetchDomainSubjects());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const byDomain = useMemo(() => {
    const m: Record<string, DomainSubject[]> = {};
    for (const s of subjects) (m[s.development_domain] ??= []).push(s);
    return m;
  }, [subjects]);

  const coveredCount = DEVELOPMENT_DOMAINS.filter((d) => (byDomain[d.value]?.length ?? 0) > 0).length;

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in pb-10">
      {[...Array(6)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />)}
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="text-red-400 mb-2" size={24} />
      <p className="text-sm text-red-400 mb-3">{error}</p>
      <button onClick={load} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors">
        Try Again
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="text-violet-600" size={22} />
          <div>
            <h2 className="text-xl font-bold text-gray-900">360° Development</h2>
            <p className="text-sm text-gray-400">
              {coveredCount} of {DEVELOPMENT_DOMAINS.length} domains covered — a balanced, whole-child view
            </p>
          </div>
        </div>
        <button onClick={load} className="p-2.5 bg-white border border-gray-200 text-gray-400 hover:text-violet-600 rounded-xl transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DEVELOPMENT_DOMAINS.map((d) => {
          const items = byDomain[d.value] ?? [];
          const empty = items.length === 0;
          return (
            <div
              key={d.value}
              className={`rounded-2xl border p-5 shadow-sm transition-shadow ${
                empty ? 'border-dashed border-gray-200 bg-gray-50/50' : 'border-gray-100 bg-white hover:shadow-card-hover'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{d.emoji}</span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{d.label}</h3>
                    <p className="text-xs text-gray-400">{d.description}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.accent}`}>
                  {items.length}
                </span>
              </div>

              {empty ? (
                <p className="text-xs text-amber-600 mt-3">
                  No subjects yet — a gap to fill for balanced development.
                </p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {items.slice(0, 5).map((s) => (
                    <li key={s.id} className="text-sm text-gray-700 truncate">• {s.name}</li>
                  ))}
                  {items.length > 5 && (
                    <li className="text-xs text-gray-400">+{items.length - 5} more</li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
