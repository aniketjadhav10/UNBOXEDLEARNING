import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { renderWeeklyPlannerEmail } from '../../src/lib/email-templates/weekly-planner';

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

  console.log(`[${new Date().toISOString()}] [weekly-planner] Handler triggered. force=${req.query.force}`);

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return res.status(500).json({ error: 'ADMIN_EMAIL is not configured.' });
  }

  try {
    // 2. Calculate the current week's Monday-Sunday range for the email subject
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const weekStart = fmt(monday);
    const weekEnd = fmt(sunday);

    // 3. Fetch all children
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id, name')
      .order('created_at', { ascending: true });

    if (childrenError) throw new Error(childrenError.message);
    if (!children || children.length === 0) {
      return res.status(200).json({ message: 'No children found. Email skipped.' });
    }

    let totalActivities = 0;

    // 4. For each child, fetch scheduled tasks and join with topic/subject
    for (const child of children) {
      const { data: progressRows } = await supabase
        .from('task_progress')
        .select('task_id')
        .eq('child_id', child.id)
        .eq('is_scheduled_this_week', true)
        .eq('is_active', true);

      if (!progressRows || progressRows.length === 0) continue;

      const taskIds = progressRows.map((p: any) => p.task_id);

      // Fetch tasks with their full hierarchy: task→topic→subject
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          description,
          topic_id,
          topics (
            id,
            title,
            subjects (
              id,
              name
            )
          )
        `)
        .in('id', taskIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (!tasks || tasks.length === 0) continue;

      // 5. Build structured activity list for the template
      const activities = tasks.map((t: any) => ({
        subject: t.topics?.subjects?.name ?? 'General',
        topic: t.topics?.title ?? 'Miscellaneous',
        name: t.name,
        durationMins: 20, // Default — activities table doesn't have per-task duration
        learningGoal: t.description ?? undefined,
      }));

      totalActivities += activities.length;

      const plannerData = {
        childName: child.name,
        weekStart,
        weekEnd,
        activities,
      };

      const htmlTemplate = renderWeeklyPlannerEmail(plannerData);

      // 6. Send one email per child
      console.log(`[${new Date().toISOString()}] [weekly-planner] Sending planner for ${child.name} (${activities.length} activities)...`);
      await transporter.sendMail({
        from: `"UnBoxed Learning" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `📅 ${child.name}'s Weekly Learning Plan — ${weekStart} to ${weekEnd}`,
        html: htmlTemplate,
      });

      // 7. Log each send to DB
      try {
        await supabase.from('email_logs').insert({
          status: 'success',
          error_message: null,
          recipient: adminEmail,
          tasks_learned_count: activities.length,
          tasks_pending_count: 0,
        });
      } catch (dbErr) {
        console.warn(`[${new Date().toISOString()}] [weekly-planner] Failed to write success log for ${child.name}:`, dbErr);
      }
    }

    if (totalActivities === 0) {
      return res.status(200).json({ message: 'No scheduled tasks found for this week. Email skipped.' });
    }

    console.log(`[${new Date().toISOString()}] [weekly-planner] ✅ Done. ${totalActivities} activities across ${children.length} child(ren).`);
    return res.status(200).json({ success: true, message: `Weekly planner sent for ${children.length} child(ren) with ${totalActivities} total activities.` });
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] [weekly-planner] ❌ Error:`, error.message);

    try {
      await supabase.from('email_logs').insert({
        status: 'failed',
        error_message: error.message || 'Unknown error',
        recipient: process.env.ADMIN_EMAIL,
        tasks_learned_count: null,
        tasks_pending_count: null,
      });
    } catch (dbErr) {
      console.error(`[${new Date().toISOString()}] [weekly-planner] Also failed to write failure log:`, dbErr);
    }

    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
