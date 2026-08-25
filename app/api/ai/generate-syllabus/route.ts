import { NextRequest, NextResponse } from 'next/server';
import { readString } from '@/lib/api-utils/http';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireGeminiKey } from '@/server/ai/aiClient';
import { enforceRateLimit, RateLimitError } from '@/server/ai/gateway';
import { persistSyllabusDraft } from '@/server/ai/persistSyllabus';
import { assembleSyllabusDraft, assembleSyllabusFromTopicList } from '@/server/ai/generateSyllabus';
import { logger } from '@/server/logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  requireGeminiKey();

  const body = await req.json();

  const topicsInput = Array.isArray(body?.topics)
    ? body.topics.map((x: any) => String(x).trim()).filter((s: string) => s.length > 0)
    : null;
  const isTopicListMode = !!topicsInput && topicsInput.length > 0;

  let sourceText = '';
  let subjectName = '';
  let subjectDescription = '';
  let developmentDomain = '';

  if (isTopicListMode) {
    if (topicsInput!.length > 80) {
      return new NextResponse('Too many topics (max 80).', { status: 400 });
    }
    subjectName = readString(body?.subjectName, 'subjectName');
    subjectDescription = body?.subjectDescription ? String(body.subjectDescription) : '';
    developmentDomain = body?.developmentDomain ? String(body.developmentDomain) : 'academic';
  } else {
    sourceText = readString(body?.sourceText, 'sourceText');
  }

  const age           = Number(body?.age)           || 10;
  const topicsCount   = Number(body?.topicsCount)   || 5;
  const tasksPerTopic = Number(body?.tasksPerTopic) || 3;
  const childId       = body?.childId ? String(body.childId) : null;
  const skillLevel    = body?.skillLevel ? String(body.skillLevel) : 'Beginner';
  const targetGrade   = body?.targetGrade ? String(body.targetGrade) : null;
  const isGlobal      = body?.isGlobal === true;
  // preview: assemble the draft and return it for parent review — do NOT persist.
  const preview       = body?.preview === true;
  const interests     = Array.isArray(body?.interests) ? body.interests.map((x: any) => String(x)) : [];

  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const ctx = { supabase, userId: user.id };
  try {
    await enforceRateLimit(ctx);
  } catch (err) {
    if (err instanceof RateLimitError) return new NextResponse(err.message, { status: 429 });
    return new NextResponse('Rate limit check failed', { status: 500 });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (data: any) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  (async () => {
    try {
      logger.info(`[generateSyllabus] Starting generation (mode=${isTopicListMode ? 'topicList' : 'sourceText'}, preview=${preview}).`);

      const draft = isTopicListMode
        ? await assembleSyllabusFromTopicList({
            subjectName, subjectDescription, developmentDomain,
            topicTitles: topicsInput!, age, skillLevel, tasksPerTopic, interests,
            ctx, onEvent: sendEvent,
          })
        : await assembleSyllabusDraft({
            sourceText, age, skillLevel, targetGrade, topicsCount, tasksPerTopic, interests,
            ctx, onEvent: sendEvent,
          });

      // Review-before-save — hand the draft back, persist nothing yet.
      if (preview) {
        await sendEvent({ status: 'draft', draft, childId, isGlobal, message: 'Draft ready for review.' });
        return;
      }

      // Direct save — persist the whole draft (skills, prerequisites, objectives, tasks).
      await sendEvent({ status: 'linking', message: 'Building the skill roadmap and saving…' });
      const { subjectId, summary } = await persistSyllabusDraft(supabase, draft, { childId, isGlobal, userId: user.id });

      await sendEvent({ status: 'complete', subjectId, summary, message: 'Curriculum generated successfully!' });

    } catch (error: any) {
      logger.error({ err: error, message: error.message }, '[generateSyllabus] Error');
      try {
        await sendEvent({ status: 'error', message: error.message || 'An error occurred during generation' });
      } catch { /* client already gone */ }
    } finally {
      try { await writer.close(); } catch { /* stream already closed/errored */ }
    }
  })().catch((e) => logger.error({ err: e }, '[generateSyllabus] Unhandled stream error'));

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
