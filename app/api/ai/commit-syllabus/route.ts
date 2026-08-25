// ============================================================
// POST /api/ai/commit-syllabus
// Persists a reviewed curriculum draft (from generate-syllabus?preview=true,
// possibly trimmed by the parent). No AI calls — pure DB write via the shared
// persistSyllabusDraft helper, so review-before-save reuses the same pipeline
// as direct generation.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { persistSyllabusDraft, type SyllabusDraft } from '@/server/ai/persistSyllabus';
import { logger } from '@/server/logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const draft = body?.draft as SyllabusDraft | undefined;

  if (!draft || !draft.subject?.name || !Array.isArray(draft.topics)) {
    return NextResponse.json({ error: 'Invalid draft: expected { subject.name, topics[] }' }, { status: 400 });
  }

  const childId  = body?.childId ? String(body.childId) : null;
  const isGlobal = body?.isGlobal === true;

  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await persistSyllabusDraft(supabase, draft, { childId, isGlobal, userId: user.id });
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error({ err: error, message: error?.message }, '[commitSyllabus] Error');
    return NextResponse.json({ error: error?.message || 'Failed to save curriculum' }, { status: 500 });
  }
}
