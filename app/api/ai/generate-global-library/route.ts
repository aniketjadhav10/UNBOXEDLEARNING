// ============================================================
// POST /api/ai/generate-global-library
// One-click batch builder for the shared 3–6 curriculum. Admin-only. Streams
// (SSE) progress as it generates every subject in the blueprint into the GLOBAL
// library (is_global=true, childId=null). Idempotent: findOrCreate* de-dups, so
// re-running merges rather than duplicating. Families then enroll from /library.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireGeminiKey } from '@/server/ai/aiClient';
import { enforceRateLimit, RateLimitError } from '@/server/ai/gateway';
import { assembleSyllabusDraft } from '@/server/ai/generateSyllabus';
import { persistSyllabusDraft } from '@/server/ai/persistSyllabus';
import { GLOBAL_CURRICULUM_BLUEPRINT } from '@/server/ai/globalCurriculumBlueprint';
import { logger } from '@/server/logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const maxDuration = 300; // allow the batch to run (Vercel Pro); dev is unbounded
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  requireGeminiKey();

  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return new NextResponse('Admin only', { status: 403 });

  const ctx = { supabase, userId: user.id };
  try {
    await enforceRateLimit(ctx);
  } catch (err) {
    if (err instanceof RateLimitError) return new NextResponse(err.message, { status: 429 });
    return new NextResponse('Rate limit check failed', { status: 500 });
  }

  // Optional: limit to a slice, e.g. { from: 0, to: 5 } to build in batches.
  const body = await req.json().catch(() => ({}));
  const from = Number.isFinite(body?.from) ? Math.max(0, Number(body.from)) : 0;
  const to = Number.isFinite(body?.to) ? Number(body.to) : GLOBAL_CURRICULUM_BLUEPRINT.length;
  const blueprint = GLOBAL_CURRICULUM_BLUEPRINT.slice(from, to);

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  const send = async (data: any) => { await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); };

  (async () => {
    let done = 0;
    let created = 0;
    try {
      await send({ status: 'start', total: blueprint.length, message: `Building ${blueprint.length} global subjects…` });

      for (let i = 0; i < blueprint.length; i++) {
        const item = blueprint[i];
        await send({ status: 'subject_start', index: i, total: blueprint.length, name: item.name });
        try {
          const draft = await assembleSyllabusDraft({
            sourceText: item.sourceText,
            age: item.age,
            skillLevel: 'Beginner',
            targetGrade: null,
            topicsCount: item.topicsCount,
            tasksPerTopic: item.tasksPerTopic,
            interests: [],
            ctx,
          });
          const { subjectId, summary } = await persistSyllabusDraft(supabase, draft, {
            childId: null, isGlobal: true, userId: user.id,
          });
          done++;
          created += summary.skills.created;
          await send({ status: 'subject_done', index: i, name: item.name, subjectId, summary });
        } catch (err: any) {
          logger.error({ err, subject: item.name }, '[generateGlobalLibrary] subject failed');
          await send({ status: 'subject_error', index: i, name: item.name, message: err?.message || 'Failed' });
        }
      }

      await send({ status: 'complete', built: done, total: blueprint.length, skillsCreated: created,
        message: `Done — ${done}/${blueprint.length} subjects in the shared library.` });
    } catch (error: any) {
      logger.error({ err: error }, '[generateGlobalLibrary] Error');
      try { await send({ status: 'error', message: error?.message || 'Batch failed' }); } catch { /* client gone */ }
    } finally {
      try { await writer.close(); } catch { /* already closed */ }
    }
  })().catch((e) => logger.error({ err: e }, '[generateGlobalLibrary] Unhandled stream error'));

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
