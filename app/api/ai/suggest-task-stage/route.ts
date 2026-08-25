// app/api/ai/suggest-task-stage/route.ts — on-demand, advisory stage suggestion
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendError, parseJson } from '@/lib/api-utils/http';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireGeminiKey } from '@/server/ai/aiClient';
import { enforceRateLimit, RateLimitError } from '@/server/ai/gateway';
import { suggestStageAdjustment } from '@/server/ai/suggestTaskStage';

export async function POST(req: NextRequest) {
  try {
    requireGeminiKey();

    const { task_id, child_id } = await parseJson(
      req,
      z.object({ task_id: z.string().uuid(), child_id: z.string().uuid() }),
    );

    const supabase = await createServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    }

    const ctx = { supabase, userId: user.id };
    await enforceRateLimit(ctx);

    const suggestion = await suggestStageAdjustment(ctx, task_id, child_id);
    return NextResponse.json({ suggestion });
  } catch (error) {
    if (error instanceof RateLimitError) return sendError(error, 429);
    return sendError(error);
  }
}
