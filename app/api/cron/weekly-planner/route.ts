// app/api/cron/weekly-planner/route.ts — migrated from server/cron/weekly-planner.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL as string) || 'https://example.supabase.co',
  (process.env.SUPABASE_SERVICE_ROLE_KEY as string) || 'missing-service-key'
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

/** ISO date (YYYY-MM-DD) of the Monday of the week containing `d`. */
function mondayOf(d: Date): string {
  const date = new Date(d);
  const day = date.getUTCDay(); // 0=Sun … 6=Sat
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().split('T')[0];
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

/**
 * Persist a weekly lesson plan + scheduled sessions for a child.
 * Idempotent per (child, week): if a plan for this week already exists it is
 * left untouched so re-runs don't duplicate sessions.
 */
async function persistWeeklyPlan(
  child: { id: string; user_id: string | null },
  taskIds: string[],
  weekStart: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('lesson_plans')
    .select('id')
    .eq('child_id', child.id)
    .eq('week_start_date', weekStart)
    .limit(1);
  if (existing && existing.length > 0) return; // plan already generated this week

  const { data: plan, error: planErr } = await supabase
    .from('lesson_plans')
    .insert({
      child_id: child.id,
      title: `Week of ${weekStart}`,
      week_start_date: weekStart,
      status: 'active',
      created_by: child.user_id,
    })
    .select('id')
    .single();
  if (planErr || !plan) return;

  const sessions = taskIds.map((task_id, i) => ({
    plan_id: plan.id,
    child_id: child.id,
    task_id,
    scheduled_date: addDays(weekStart, i % 5), // spread across Mon–Fri
    status: 'planned',
    created_by: child.user_id,
  }));
  await supabase.from('scheduled_sessions').insert(sessions);
}

export async function GET(req: NextRequest) {
  if (
    process.env.CRON_SECRET &&
    req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json({ error: 'ADMIN_EMAIL not configured.' }, { status: 500 });
  }

  try {
    // 1. Select tasks due this week
    const { data: children } = await supabase
      .from('children').select('id, name, user_id').order('created_at', { ascending: true });

    if (!children || children.length === 0) {
      return NextResponse.json({ message: 'No children. Email skipped.' });
    }

    // Build (and persist) a weekly plan for each child
    const weekStart = mondayOf(new Date());
    const weeklyPlans: Array<{ childName: string; tasks: string[] }> = [];

    for (const child of children) {
      const { data: progress } = await supabase
        .from('task_progress')
        .select('task_id, next_due_at, tasks(name)')
        .eq('child_id', child.id)
        .eq('is_active', true)
        .not('learning_stage', 'in', '("Confident")')
        .order('next_due_at', { ascending: true })
        .limit(10);

      if (!progress || progress.length === 0) continue;

      const taskIds = progress.map((p: any) => p.task_id).filter(Boolean);
      await persistWeeklyPlan({ id: child.id, user_id: child.user_id }, taskIds, weekStart);

      weeklyPlans.push({
        childName: child.name,
        tasks: progress.map((p: any) => p.tasks?.name).filter(Boolean),
      });
    }

    if (weeklyPlans.length === 0) {
      return NextResponse.json({ message: 'No tasks due. Email skipped.' });
    }

    // Build simple HTML summary
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #4c1d95;">📅 Weekly Learning Plan</h1>
        <p style="color: #64748b;">Here's the plan for the week ahead:</p>
        ${weeklyPlans.map(plan => `
          <h2 style="color: #1e1b4b;">${plan.childName}</h2>
          <ul style="color: #475569;">
            ${plan.tasks.map(t => `<li style="margin-bottom: 6px;">${t}</li>`).join('')}
          </ul>
        `).join('')}
      </div>
    `;

    await transporter.sendMail({
      from: `"UnBoxed Learning" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `📅 Weekly Learning Plan — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      html,
    });

    return NextResponse.json({ success: true, message: 'Weekly plan sent.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = GET;
