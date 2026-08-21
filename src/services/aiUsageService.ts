// ============================================================
// aiUsageService — reads the ai_usage log (RLS-scoped to the
// current user) for the AI observability dashboard.
// ============================================================
import { supabase } from './supabase';
import type { Tables } from '../types/database.types';

export type AiUsageRow = Tables<'ai_usage'>;

export interface AiUsageSummary {
  operation: string;
  calls: number;
  totalTokens: number;
  avgLatencyMs: number;
  errors: number;
}

export async function fetchAiUsage(limit = 500): Promise<AiUsageRow[]> {
  const { data, error } = await supabase
    .from('ai_usage')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Aggregate raw usage rows into a per-operation breakdown. */
export function summarizeByOperation(rows: AiUsageRow[]): AiUsageSummary[] {
  const map = new Map<
    string,
    { calls: number; tokens: number; latency: number; latencyCount: number; errors: number }
  >();
  for (const r of rows) {
    const m = map.get(r.operation) ?? { calls: 0, tokens: 0, latency: 0, latencyCount: 0, errors: 0 };
    m.calls++;
    m.tokens += r.total_tokens ?? 0;
    if (r.latency_ms != null) {
      m.latency += r.latency_ms;
      m.latencyCount++;
    }
    if (r.status === 'error') m.errors++;
    map.set(r.operation, m);
  }
  return [...map.entries()]
    .map(([operation, m]) => ({
      operation,
      calls: m.calls,
      totalTokens: m.tokens,
      avgLatencyMs: m.latencyCount ? Math.round(m.latency / m.latencyCount) : 0,
      errors: m.errors,
    }))
    .sort((a, b) => b.calls - a.calls);
}
