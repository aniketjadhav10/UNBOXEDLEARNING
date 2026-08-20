// app/api/cron/evening-report/route.ts — migrated from server/cron/evening-report.ts
// Pattern is identical to daily-agenda — delegates to original handler logic
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { renderEveningProgressEmail } from '@/src/lib/email-templates/evening-progress';

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
    return NextResponse.json({ error: 'ADMIN_EMAIL is not configured.' }, { status: 500 });
  }

  try {
    // Fetch children and their today's session progress
    const { data: children, error: childrenError } = await supabase
      .from('children').select('id, name').order('created_at', { ascending: true });

    if (childrenError) throw new Error(childrenError.message);
    if (!children || children.length === 0) {
      return NextResponse.json({ message: 'No children found. Email skipped.' });
    }

    const childReports: Array<{ childName: string; learnedTasks: string[]; pendingTasks: string[] }> = [];

    for (const child of children) {
      // Get tasks practiced today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: learnedProgress } = await supabase
        .from('task_progress')
        .select('task_id, tasks(name)')
        .eq('child_id', child.id)
        .gte('last_practiced_at', today.toISOString())
        .in('learning_stage', ['Comfortable', 'Confident']);

      const { data: pendingProgress } = await supabase
        .from('task_progress')
        .select('task_id, tasks(name)')
        .eq('child_id', child.id)
        .eq('is_scheduled_this_week', true)
        .eq('is_active', true)
        .not('learning_stage', 'in', '("Comfortable","Confident")');

      childReports.push({
        childName: child.name,
        learnedTasks: (learnedProgress || []).map((p: any) => p.tasks?.name).filter(Boolean),
        pendingTasks: (pendingProgress || []).map((p: any) => p.tasks?.name).filter(Boolean),
      });
    }

    if (childReports.every(r => r.learnedTasks.length === 0 && r.pendingTasks.length === 0)) {
      return NextResponse.json({ message: 'No activity data. Email skipped.' });
    }

    // Flatten per-child reports into the flat arrays the email template expects,
    // labelling each task with the child's name when there is more than one child.
    const multiChild = childReports.length > 1;
    const label = (childName: string, name: string) => (multiChild ? `[${childName}] ${name}` : name);
    const learnedToday = childReports.flatMap(r => r.learnedTasks.map(name => ({ name: label(r.childName, name) })));
    const pending = childReports.flatMap(r => r.pendingTasks.map(name => ({ name: label(r.childName, name) })));
    const htmlTemplate = renderEveningProgressEmail(learnedToday, pending, []);

    await transporter.sendMail({
      from: `"UnBoxed Learning" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `🌙 Evening Summary — ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}`,
      html: htmlTemplate,
    });

    await supabase.from('email_logs').insert({
      status: 'success', error_message: null, recipient: adminEmail,
      tasks_learned_count: childReports.reduce((acc, r) => acc + r.learnedTasks.length, 0),
      tasks_pending_count: childReports.reduce((acc, r) => acc + r.pendingTasks.length, 0),
    });

    return NextResponse.json({ success: true, message: 'Evening report sent.' });
  } catch (error: any) {
    try {
      await supabase.from('email_logs').insert({
        status: 'failed', error_message: error.message, recipient: process.env.ADMIN_EMAIL,
        tasks_learned_count: null, tasks_pending_count: null,
      });
    } catch { /* best-effort logging */ }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = GET;
