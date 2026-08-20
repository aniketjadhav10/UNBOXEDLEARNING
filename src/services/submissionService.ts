// ============================================================
// submissionService — child work submissions + their results.
// Client-side, RLS-scoped. Grading itself runs server-side via
// POST /api/ai/grade-submission (AI) — this covers create/read.
// ============================================================
import { supabase } from './supabase';
import type { DbSubmission, DbAssessmentResult, SubmissionStatus } from '../types/database';

export async function createSubmission(payload: {
  child_id: string;
  task_id: string;
  content?: string | null;
  attachment_url?: string | null;
  session_id?: string | null;
  submitted_by?: string | null;
}): Promise<DbSubmission> {
  const { data, error } = await supabase
    .from('submissions')
    .insert({ status: 'submitted', ...payload })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DbSubmission;
}

export async function fetchSubmissions(childId: string, taskId?: string): Promise<DbSubmission[]> {
  let query = supabase
    .from('submissions')
    .select('*')
    .eq('child_id', childId)
    .order('submitted_at', { ascending: false });
  if (taskId) query = query.eq('task_id', taskId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DbSubmission[];
}

export async function fetchAssessmentResult(submissionId: string): Promise<DbAssessmentResult | null> {
  const { data, error } = await supabase
    .from('assessment_results')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false })
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as DbAssessmentResult | null;
}

export async function updateSubmissionStatus(id: string, status: SubmissionStatus): Promise<void> {
  const { error } = await supabase.from('submissions').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Trigger AI grading of a submission (server route). Returns the created result row. */
export async function requestAiGrading(submissionId: string): Promise<DbAssessmentResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const res = await fetch('/api/ai/grade-submission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ submission_id: submissionId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Grading failed');
  return body.result as DbAssessmentResult;
}
