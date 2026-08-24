// ============================================================
// StandardsCoverageCard — on-demand standards coverage for a subject.
// Pick a framework + grade, "Analyze", and see coverage % + the gaps (expected
// standards not yet in the child's skill tree). Powered by standardsService.
// ============================================================
'use client';
import { useState } from 'react';
import { ClipboardCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { analyzeStandards, type StandardsCoverage } from '../../services/standardsService';

const FRAMEWORKS = ['Common Core', 'CBSE', 'ICSE', 'IB PYP', 'UK National Curriculum'];
const GRADES = ['Preschool', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 5', 'Grade 8', 'Grade 10', 'Grade 12'];

export function StandardsCoverageCard({ subjectId, subjectName }: { subjectId: string; subjectName?: string }) {
  const [framework, setFramework] = useState(FRAMEWORKS[0]);
  const [grade, setGrade] = useState('Grade 1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StandardsCoverage | null>(null);

  async function analyze() {
    try {
      setLoading(true);
      setError(null);
      setResult(await analyzeStandards({ subjectId, framework, grade }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  }

  const pct = result?.coverage_pct ?? 0;
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardCheck className="w-5 h-5 text-violet-600" />
        <h3 className="text-base font-bold text-gray-900">Standards coverage</h3>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        How {subjectName ? `“${subjectName}”` : 'this subject'} maps to a curriculum standard
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        <select value={framework} onChange={(e) => setFramework(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50">
          {FRAMEWORKS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50">
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button
          onClick={analyze}
          disabled={loading}
          className="text-sm font-bold px-4 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Analyze
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-500">{result.framework} · {result.grade}</span>
              <span className="text-sm font-bold text-gray-900">{result.coverage_pct}% covered</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>

          {result.gaps.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-1.5 flex items-center gap-1">
                <AlertCircle size={13} /> Gaps ({result.gaps.length})
              </p>
              <ul className="space-y-1">
                {result.gaps.map((g, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-rose-300 mt-0.5">○</span>{g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.covered.length > 0 && (
            <details>
              <summary className="text-xs font-bold uppercase tracking-wider text-emerald-600 cursor-pointer flex items-center gap-1">
                <CheckCircle2 size={13} /> Covered ({result.covered.length})
              </summary>
              <ul className="mt-1.5 space-y-1">
                {result.covered.map((c, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    <span className="text-emerald-500">✓</span> {c.standard}
                    {c.skill ? <span className="text-gray-400"> — {c.skill}</span> : null}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
