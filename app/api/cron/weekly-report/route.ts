// app/api/cron/weekly-report/route.ts — migrated from server/cron/weekly-report.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { buildCronCtx } from '@/server/ai/cronCtx';
import { narrateWeeklySummary } from '@/server/ai/narrateReport';

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
    const { data: children } = await supabase
      .from('children').select('id, name, user_id').order('created_at', { ascending: true });

    if (!children || children.length === 0) {
      return NextResponse.json({ message: 'No children. Email skipped.' });
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weeklyStats: Array<{ childName: string; learned: number; practiced: number }> = [];

    for (const child of children) {
      const { data: progressRows } = await supabase
        .from('task_progress')
        .select('learning_stage, last_practiced_at')
        .eq('child_id', child.id)
        .gte('last_practiced_at', weekStart.toISOString());

      if (!progressRows) continue;
      const learned = progressRows.filter((p: any) => ['Comfortable', 'Confident'].includes(p.learning_stage)).length;
      const practiced = progressRows.length;
      weeklyStats.push({ childName: child.name, learned, practiced });
    }

    const cronCtx = buildCronCtx(supabase, children[0]?.user_id);
    const narration = cronCtx ? await narrateWeeklySummary(cronCtx, weeklyStats).catch(() => null) : null;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #4c1d95;">📊 Weekly Progress Report</h1>
        <p style="color: #64748b;">Here's how the week went:</p>
        ${narration ? `<p style="color: #4c1d95; font-style: italic; background: #f5f3ff; padding: 12px 16px; border-radius: 10px;">${narration}</p>` : ''}
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="text-align: left; padding: 10px; color: #1e1b4b;">Child</th>
              <th style="padding: 10px; color: #1e1b4b;">Tasks Practiced</th>
              <th style="padding: 10px; color: #1e1b4b;">Tasks Learned</th>
            </tr>
          </thead>
          <tbody>
            ${weeklyStats.map((s, i) => `
              <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 10px; color: #475569;">${s.childName}</td>
                <td style="padding: 10px; text-align: center; color: #7c3aed; font-weight: 700;">${s.practiced}</td>
                <td style="padding: 10px; text-align: center; color: #059669; font-weight: 700;">${s.learned}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    await transporter.sendMail({
      from: `"UnBoxed Learning" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `📊 Weekly Progress Report — Week of ${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      html,
    });

    await supabase.from('email_logs').insert({
      status: 'success', error_message: null, recipient: adminEmail,
      tasks_learned_count: weeklyStats.reduce((a, s) => a + s.learned, 0),
      tasks_pending_count: 0,
    });

    return NextResponse.json({ success: true, message: 'Weekly report sent.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = GET;
