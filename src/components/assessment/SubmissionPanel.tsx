// ============================================================
// SubmissionPanel — submit a child's work for a task and get it
// graded by AI (POST /api/ai/grade-submission). Shows the latest
// result: score, pass/fail, feedback, and rubric.
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import { Send, Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  createSubmission,
  fetchSubmissions,
  fetchAssessmentResult,
  requestAiGrading,
} from '../../services/submissionService';
import type { DbSubmission, DbAssessmentResult } from '../../types/database';

interface RubricItem { criterion?: string; met?: boolean; note?: string }

export function SubmissionPanel({
  childId,
  taskId,
  onGraded,
}: {
  childId: string;
  taskId: string;
  onGraded?: () => void;
}) {
  const [content, setContent] = useState('');
  const [latest, setLatest] = useState<DbSubmission | null>(null);
  const [result, setResult] = useState<DbAssessmentResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!childId || !taskId) return;
    try {
      const subs = await fetchSubmissions(childId, taskId);
      const top = subs[0] ?? null;
      setLatest(top);
      setResult(top ? await fetchAssessmentResult(top.id) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load submissions');
    }
  }, [childId, taskId]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!content.trim() || !childId) return;
    setSubmitting(true); setError(null);
    try {
      const sub = await createSubmission({ child_id: childId, task_id: taskId, content: content.trim() });
      setContent('');
      setLatest(sub);
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function grade() {
    if (!latest) return;
    setGrading(true); setError(null);
    try {
      const r = await requestAiGrading(latest.id);
      setResult(r);
      onGraded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Grading failed');
    } finally {
      setGrading(false);
    }
  }

  const rubric: RubricItem[] = Array.isArray(result?.rubric) ? (result!.rubric as RubricItem[]) : [];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 shadow-sm">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">📤 Submit Work</p>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        placeholder="Type or paste the child's answer / work here…"
        className="w-full text-sm rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-y"
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={submit}
          disabled={submitting || !content.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Submit
        </button>
        {latest && (
          <button
            onClick={grade}
            disabled={grading}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {grading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Grade with AI
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {latest && !result && (
        <p className="text-xs text-gray-400 mt-3">
          Last submitted {new Date(latest.submitted_at).toLocaleString()} · status: {latest.status}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            {result.passed ? (
              <CheckCircle2 size={18} className="text-emerald-600" />
            ) : (
              <XCircle size={18} className="text-amber-600" />
            )}
            <span className="text-sm font-bold text-gray-900">
              {result.score ?? '—'} / {result.max_score}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              graded by {result.graded_by}
            </span>
          </div>
          {result.feedback && <p className="text-sm text-gray-700 leading-relaxed">{result.feedback}</p>}
          {rubric.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {rubric.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  {r.met ? (
                    <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle size={13} className="text-gray-300 mt-0.5 flex-shrink-0" />
                  )}
                  <span className="text-gray-600">
                    <span className="font-semibold text-gray-700">{r.criterion}</span>
                    {r.note ? ` — ${r.note}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
