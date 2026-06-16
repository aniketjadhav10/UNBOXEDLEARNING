import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { renderDailyAgendaEmail } from '../emails/templates/daily-agenda.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(
  (supabaseUrl as string) || 'https://example.supabase.co',
  (supabaseKey as string) || 'missing-service-key'
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Verify Cron Secret
  if (
    process.env.CRON_SECRET &&
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}` &&
    req.query.secret !== process.env.CRON_SECRET
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return res.status(500).json({ error: 'ADMIN_EMAIL is not configured.' });
  }

  try {
    // 2. Fetch all children
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id, name')
      .order('created_at', { ascending: true });

    if (childrenError) throw new Error(childrenError.message);
    if (!children || children.length === 0) {
      return res.status(200).json({ message: 'No children found. Email skipped.' });
    }

    // 3. For each child, fetch today's scheduled tasks joined with their task names
    const childAgendas: Array<{ childName: string; activities: string[] }> = [];

    for (const child of children) {
      // Get task_progress rows scheduled this week for this child
      const { data: progressRows, error: progError } = await supabase
        .from('task_progress')
        .select('task_id')
        .eq('child_id', child.id)
        .eq('is_scheduled_this_week', true)
        .eq('is_active', true);

      if (progError || !progressRows || progressRows.length === 0) continue;

      const taskIds = progressRows.map((p: any) => p.task_id);

      // Get the task names for those task IDs
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, name')
        .in('id', taskIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (tasksError || !tasks || tasks.length === 0) continue;

      childAgendas.push({
        childName: child.name,
        activities: tasks.map((t: any) => t.name),
      });
    }

    if (childAgendas.length === 0) {
      return res.status(200).json({ message: 'No scheduled tasks found for today. Email skipped.' });
    }

    // 4. Build a combined activity list across all children
    const allActivities = childAgendas.flatMap(ca =>
      ca.activities.map(a => childAgendas.length > 1 ? `[${ca.childName}] ${a}` : a)
    );

    const htmlTemplate = renderDailyAgendaEmail(allActivities);

    // 5. Send Email
    console.log(`[${new Date().toISOString()}] [daily-agenda] Sending to ${adminEmail} with ${allActivities.length} activities...`);
    await transporter.sendMail({
      from: `"UnBoxed Learning" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `☀️ Good Morning! Today's Agenda (${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })})`,
      html: htmlTemplate,
    });

    // 6. Log success to DB
    try {
      await supabase.from('email_logs').insert({
        status: 'success',
        error_message: null,
        recipient: adminEmail,
        tasks_learned_count: allActivities.length,
        tasks_pending_count: 0,
      });
    } catch (dbErr) {
      console.warn(`[${new Date().toISOString()}] [daily-agenda] Failed to write success log:`, dbErr);
    }

    console.log(`[${new Date().toISOString()}] [daily-agenda] ✅ Sent successfully.`);
    return res.status(200).json({ success: true, message: `Daily agenda sent with ${allActivities.length} activities.` });
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] [daily-agenda] ❌ Error:`, error.message);

    // Log failure to DB
    try {
      await supabase.from('email_logs').insert({
        status: 'failed',
        error_message: error.message || 'Unknown error',
        recipient: process.env.ADMIN_EMAIL,
        tasks_learned_count: null,
        tasks_pending_count: null,
      });
    } catch (dbErr) {
      console.error(`[${new Date().toISOString()}] [daily-agenda] Also failed to write failure log:`, dbErr);
    }

    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
