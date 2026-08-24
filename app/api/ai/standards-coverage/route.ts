// ============================================================
// POST /api/ai/standards-coverage
// AI-assessed standards coverage: for a chosen framework + grade, Gemini lists
// the expected standards for the subject and judges which the child's current
// skills already cover, returning a coverage % and the gaps. Reuses skills read
// (RLS-scoped) + the AI gateway; no static standards catalog required.
//
//   body: { subjectId, framework, grade }
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireGeminiKey, generateJson } from '@/server/ai/aiClient';
import { enforceRateLimit, RateLimitError } from '@/server/ai/gateway';
import { buildStandardsPrompt } from '@/server/ai/prompts/StandardsPrompt';
import { logger } from '@/server/logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

function safeJson(text: string): any {
  try { return JSON.parse(text); } catch { /* fall through */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* ignore */ } }
  throw new Error('AI returned an unparseable response');
}

export async function POST(req: NextRequest) {
  requireGeminiKey();

  const body = await req.json().catch(() => null);
  const subjectId = body?.subjectId ? String(body.subjectId) : '';
  const framework = body?.framework ? String(body.framework) : 'Common Core';
  const grade     = body?.grade ? String(body.grade) : 'Grade 1';
  if (!subjectId) return NextResponse.json({ error: 'subjectId is required' }, { status: 400 });

  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = { supabase, userId: user.id };
  try {
    await enforceRateLimit(ctx);
  } catch (err) {
    if (err instanceof RateLimitError) return NextResponse.json({ error: err.message }, { status: 429 });
    return NextResponse.json({ error: 'Rate limit check failed' }, { status: 500 });
  }

  try {
    // Subject name + the child's current skills (RLS-scoped to accessible content).
    const [{ data: subject }, { data: skills }] = await Promise.all([
      supabase.from('subjects').select('name').eq('id', subjectId).maybeSingle(),
      supabase.from('skills').select('name').eq('subject_id', subjectId).eq('is_active', true),
    ]);

    const prompt = buildStandardsPrompt({
      framework,
      grade,
      subject: subject?.name || 'this subject',
      skillNames: (skills ?? []).map((s: any) => s.name),
    });

    const raw = await generateJson(prompt, { ctx, operation: 'standards_coverage' });
    const parsed = safeJson(raw);

    return NextResponse.json({
      framework,
      grade,
      coverage_pct: Math.max(0, Math.min(100, Math.round(Number(parsed?.coverage_pct) || 0))),
      covered: Array.isArray(parsed?.covered) ? parsed.covered : [],
      gaps: Array.isArray(parsed?.gaps) ? parsed.gaps : [],
    });
  } catch (err: any) {
    logger.error({ err, message: err?.message }, '[standardsCoverage] Error');
    return NextResponse.json({ error: err?.message || 'Failed to analyze standards' }, { status: 500 });
  }
}
