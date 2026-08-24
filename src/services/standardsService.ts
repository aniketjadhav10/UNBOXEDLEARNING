// ============================================================
// standardsService — AI-assessed standards coverage for a subject.
// Calls /api/ai/standards-coverage (on demand — not cached, since it's an
// explicit "analyze" action and depends on framework/grade choices).
// ============================================================
import { supabase } from './supabase';

export interface StandardsCoverage {
  framework: string;
  grade: string;
  coverage_pct: number;
  covered: { standard: string; skill: string }[];
  gaps: string[];
}

export async function analyzeStandards(params: {
  subjectId: string;
  framework: string;
  grade: string;
}): Promise<StandardsCoverage> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/api/ai/standards-coverage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': session ? `Bearer ${session.access_token}` : '',
    },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to analyze standards coverage');
  return json as StandardsCoverage;
}
