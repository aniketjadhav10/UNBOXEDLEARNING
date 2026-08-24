// ============================================================
// app/api/cron/adaptive-review/route.ts
// Nightly spaced-review engine. Any mastered skill whose next_review_at has
// passed is dropped to Needs_Practice so it resurfaces in the child's roadmap
// (the "Current" bucket) for a refresher. Secured by the shared CRON_SECRET
// bearer guard; uses the service-role client to sweep across all families.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/server/logger';

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL as string) || 'https://example.supabase.co',
  (process.env.SUPABASE_SERVICE_ROLE_KEY as string) || 'missing-service-key',
);

export async function GET(req: NextRequest) {
  if (
    process.env.CRON_SECRET &&
    req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  try {
    // Mastered skills whose review is due → resurface as Needs_Practice.
    const { data, error } = await supabase
      .from('skill_progress')
      .update({ status: 'Needs_Practice', updated_at: nowIso })
      .lte('next_review_at', nowIso)
      .in('status', ['Comfortable', 'Confident'])
      .eq('is_active', true)
      .select('id');

    if (error) {
      logger.error({ err: error }, '[adaptiveReview] update failed');
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const resurfaced = data?.length ?? 0;
    logger.info(`[adaptiveReview] Resurfaced ${resurfaced} skill(s) for review.`);
    return NextResponse.json({ ok: true, resurfaced });
  } catch (err) {
    logger.error({ err }, '[adaptiveReview] Error');
    return NextResponse.json({ error: 'Adaptive review failed' }, { status: 500 });
  }
}
