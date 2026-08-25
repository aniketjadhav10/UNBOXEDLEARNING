// ============================================================
// AiUsagePage — AI observability: token/latency/error breakdown
// over the ai_usage log (per-operation).
// ============================================================
import { useEffect, useState } from 'react';
import { BrainCircuit, RefreshCw, AlertTriangle } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  fetchAiUsage,
  summarizeByOperation,
  type AiUsageRow,
} from '../../services/aiUsageService';

export function AiUsagePage() {
  useDocumentTitle('AI Usage');
  const [rows, setRows] = useState<AiUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAiUsage());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load AI usage');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const summary = summarizeByOperation(rows);
  const totalCalls = rows.length;
  const totalTokens = rows.reduce((a, r) => a + (r.total_tokens ?? 0), 0);
  const errorCount = rows.filter((r) => r.status === 'error').length;

  const stats = [
    { label: 'Total calls', value: totalCalls.toLocaleString(), bg: 'bg-violet-600' },
    { label: 'Total tokens', value: totalTokens.toLocaleString(), bg: 'bg-emerald-500' },
    { label: 'Errors', value: errorCount.toLocaleString(), bg: errorCount > 0 ? 'bg-red-500' : 'bg-gray-400' },
  ];

  if (loading) return (
    <div className="space-y-4 animate-fade-in pb-10">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
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
          <BrainCircuit className="text-violet-600" size={22} />
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Usage</h2>
            <p className="text-sm text-gray-400">Tokens, latency, and errors by operation (last {rows.length} calls)</p>
          </div>
        </div>
        <button onClick={load} className="p-2.5 bg-white border border-gray-200 text-gray-400 hover:text-violet-600 rounded-xl transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-5 text-white shadow-sm`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {summary.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400 text-sm">
          No AI usage recorded yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-3">Operation</th>
                  <th className="px-5 py-3 text-right">Calls</th>
                  <th className="px-5 py-3 text-right">Tokens</th>
                  <th className="px-5 py-3 text-right">Avg latency</th>
                  <th className="px-5 py-3 text-right">Errors</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.operation} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-semibold text-gray-800">{s.operation}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{s.calls.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{s.totalTokens.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{(s.avgLatencyMs / 1000).toFixed(2)}s</td>
                    <td className={`px-5 py-3 text-right font-medium ${s.errors > 0 ? 'text-red-500' : 'text-gray-400'}`}>{s.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
