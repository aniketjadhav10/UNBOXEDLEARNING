// ============================================================
// POST /api/planner/generate
// Admin-triggered "Generate Weekly Plan" (the System Logs button). Rebuilds THIS
// week's roadmap plan for each of the admin's children using the shared planner
// logic — session-authenticated (no CRON_SECRET), RLS-scoped to their family,
// and it does NOT send email. Returns a per-child summary.
// ============================================================
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { mondayOf, generateWeeklyPlan } from '@/server/planner';
import { logger } from '@/server/logger';

export async function POST() {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admins only.
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  try {
    // RLS scopes this to the admin's own / family children.
    const { data: children, error: childErr } = await supabase
      .from('children').select('id, name, user_id').order('created_at', { ascending: true });
    if (childErr) throw new Error(childErr.message);
    if (!children || children.length === 0) {
      return NextResponse.json({ message: 'No children found.', results: [] });
    }

    const weekStart = mondayOf(new Date());
    const nowIso = new Date().toISOString();
    const results: Array<{ child: string; scheduled: number }> = [];

    for (const child of children) {
      // replace:true so the button always rebuilds the current week's plan.
      const { items } = await generateWeeklyPlan(supabase, child, weekStart, nowIso, { replace: true });
      results.push({ child: child.name, scheduled: items.length });
    }

    const total = results.reduce((n, r) => n + r.scheduled, 0);
    return NextResponse.json({
      success: true,
      weekStart,
      total,
      results,
      message: total > 0
        ? `Weekly plan created — ${total} skill session(s) across ${results.length} child(ren).`
        : 'No skills were ready to schedule (add a curriculum or mark prerequisites first).',
    });
  } catch (err) {
    logger.error({ err }, '[planner/generate] Error');
    const message = err instanceof Error ? err.message : 'Failed to generate weekly plan';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
