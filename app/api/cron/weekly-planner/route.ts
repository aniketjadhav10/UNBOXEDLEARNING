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
      .from('children').select('id, name').order('created_at', { ascending: true });

    if (!children || children.length === 0) {
      return NextResponse.json({ message: 'No children. Email skipped.' });
    }

    // Build a weekly plan for each child
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
