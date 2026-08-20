// ============================================================
// app/api/ai/grade-submission/route.ts — AI auto-assessment
// Grades a child's submission against the task's assessment_criteria via the
// AI gateway (auth + rate limit + usage logging), records an assessment_results
// row, and advances the child's learning_stage on the task.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { sendError } from '@/lib/api-utils/http';
import { createServerSupabase } from '@/lib/api-utils/supabase';
import { generateJson, requireGeminiKey } from '@/server/ai/aiClient';
import { enforceRateLimit, RateLimitError } from '@/server/ai/gateway';
import { LEARNING_STAGES } from '@/server/ai/tools/writeTools';
import { logger } from '@/server/logger';

function buildGradingPrompt(task: { name?: string; assessment_criteria?: string; learning_objective?: string }, content: string) {
  return `You are an encouraging homeschool assessor. Grade the student's submission for the task below.

Task: ${task.name ?? 'Untitled'}
Learning objective: ${task.learning_objective ?? 'n/a'}
Assessment criteria: ${task.assessment_criteria ?? 'Use general age-appropriate judgment.'}

Student submission:
"""
${content}
"""

Return ONLY valid JSON in exactly this shape:
{
  "score": <number 0-100>,
  "max_score": 100,
  "passed": <boolean>,
  "feedback": "<2-3 sentences, warm and specific, addressed to the parent>",
  "rubric": [{ "criterion": "<string>", "met": <boolean>, "note": "<string>" }],
  "suggested_stage": "<one of: ${LEARNING_STAGES.join(', ')}>"
}`;
}

export async function POST(req: NextRequest) {
  try {
    requireGeminiKey();

    const body = await req.json();
    const submissionId = body?.submission_id ? String(body.submission_id) : '';
    if (!submissionId) {
      return NextResponse.json({ error: 'submission_id is required' }, { status: 400 });
    }

    const supabase = createServerSupabase(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ctx = { supabase, userId: user.id };
    await enforceRateLimit(ctx);

    // RLS scopes this to the caller's own children.
    const { data: submission, error: subErr } = await supabase
      .from('submissions')
      .select('id, child_id, task_id, content, tasks(name, assessment_criteria, learning_objective)')
      .eq('id', submissionId)
      .single();
    if (subErr || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const content = (submission as any).content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: 'This submission has no text content to grade (attachment-only grading is not yet supported).' },
        { status: 400 },
      );
    }

    await supabase.from('submissions').update({ status: 'grading' }).eq('id', submission.id);

    const prompt = buildGradingPrompt((submission as any).tasks ?? {}, content);
    const raw = await generateJson(prompt, { ctx, operation: 'grade_submission' });
    const result = JSON.parse(raw);

    const { data: assessment, error: arErr } = await supabase
      .from('assessment_results')
      .insert({
        submission_id: submission.id,
        score: typeof result.score === 'number' ? result.score : null,
        max_score: typeof result.max_score === 'number' ? result.max_score : 100,
        passed: typeof result.passed === 'boolean' ? result.passed : null,
        feedback: result.feedback ?? null,
        rubric: Array.isArray(result.rubric) ? result.rubric : [],
        graded_by: 'ai',
        grader_id: null,
      })
      .select()
      .single();
    if (arErr) throw arErr;

    await supabase.from('submissions').update({ status: 'graded' }).eq('id', submission.id);

    // Advance the child's mastery if the model suggested a valid stage.
    if (result.suggested_stage && (LEARNING_STAGES as readonly string[]).includes(result.suggested_stage)) {
      await supabase
        .from('task_progress')
        .update({ learning_stage: result.suggested_stage })
        .eq('task_id', submission.task_id)
        .eq('child_id', submission.child_id);
    }

    return NextResponse.json({ success: true, result: assessment });
  } catch (error) {
    if (error instanceof RateLimitError) return sendError(error, 429);
    logger.error({ err: error }, '[grade-submission] failed');
    return sendError(error, 500);
  }
}
