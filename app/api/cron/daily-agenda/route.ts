// app/api/cron/daily-agenda/route.ts — migrated from server/cron/daily-agenda.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { renderDailyAgendaEmail } from '@/src/lib/email-templates/daily-agenda';
import { sendPushToSubscriptions } from '@/server/push';
import { buildCronCtx } from '@/server/ai/cronCtx';
import { narrateDailyAgendaBody } from '@/server/ai/narrateReport';

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
  // Verify Cron Secret (Vercel sets Authorization: Bearer <CRON_SECRET>)
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
    const { data: children, error: childrenError } = await supabase
      .from('children').select('id, name, user_id').order('created_at', { ascending: true });

    if (childrenError) throw new Error(childrenError.message);
    if (!children || children.length === 0) {
      return NextResponse.json({ message: 'No children found. Email skipped.' });
    }

    const childAgendas: Array<{ childName: string; activities: string[] }> = [];

    for (const child of children) {
      const { data: progressRows } = await supabase
        .from('task_progress').select('task_id')
        .eq('child_id', child.id).eq('is_scheduled_this_week', true).eq('is_active', true);

      if (!progressRows || progressRows.length === 0) continue;
      const taskIds = progressRows.map((p: any) => p.task_id);

      const { data: tasks } = await supabase
        .from('tasks').select('id, name').in('id', taskIds)
        .eq('is_active', true).order('order_index', { ascending: true });

      if (!tasks || tasks.length === 0) continue;
      childAgendas.push({ childName: child.name, activities: tasks.map((t: any) => t.name) });
    }

    if (childAgendas.length === 0) {
      return NextResponse.json({ message: 'No scheduled tasks found. Email skipped.' });
    }

    const allActivities = childAgendas.flatMap(ca =>
      ca.activities.map(a => childAgendas.length > 1 ? `[${ca.childName}] ${a}` : a)
    );

    const htmlTemplate = renderDailyAgendaEmail(allActivities);

    await transporter.sendMail({
      from: `"UnBoxed Learning" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `☀️ Good Morning! Today's Agenda (${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })})`,
      html: htmlTemplate,
    });

    await supabase.from('email_logs').insert({
      status: 'success', error_message: null, recipient: adminEmail,
      tasks_learned_count: allActivities.length, tasks_pending_count: 0,
    });

    let pushSent = 0;
    try {
      const { data: subs } = await supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth');
      if (subs && subs.length > 0) {
        const cronCtx = buildCronCtx(supabase, children[0]?.user_id);
        const staticBody = `${allActivities.length} activit${allActivities.length === 1 ? 'y' : 'ies'} scheduled for today.`;
        const narratedBody = cronCtx ? await narrateDailyAgendaBody(cronCtx, allActivities) : null;

        const { sent, staleIds } = await sendPushToSubscriptions(subs, {
          title: "☀️ Today's Agenda",
          body: narratedBody ?? staticBody,
          url: '/',
          tag: 'daily-agenda',
        });
        pushSent = sent;
        if (staleIds.length > 0) {
          await supabase.from('push_subscriptions').delete().in('id', staleIds);
        }
      }
    } catch {
      // Push is best-effort — never fail the cron run (or the email that already sent) over it.
    }

    return NextResponse.json({
      success: true,
      message: `Daily agenda sent with ${allActivities.length} activities.`,
      pushSent,
    });
  } catch (error: any) {
    try {
      await supabase.from('email_logs').insert({
        status: 'failed', error_message: error.message || 'Unknown error',
        recipient: process.env.ADMIN_EMAIL, tasks_learned_count: null, tasks_pending_count: null,
      });
    } catch { /* best-effort logging */ }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Also accept POST for manual triggers
export const POST = GET;
