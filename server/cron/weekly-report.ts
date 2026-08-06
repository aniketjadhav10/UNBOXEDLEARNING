import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { renderWeeklyReportEmail } from '../../src/lib/email-templates/weekly-report';

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
    // 2. Calculate date range for the past 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    // 3. Fetch task_progress practiced in the last 7 days
    const { data: progressData, error: progressError } = await supabase
      .from('task_progress')
      .select('task_id, learning_stage, last_practiced_at, interest_level')
      .not('last_practiced_at', 'is', null)
      .gte('last_practiced_at', weekAgoStr)
      .eq('is_active', true);

    if (progressError) throw new Error(progressError.message);

    const activitiesCompleted = progressData?.length ?? 0;

    // 4. If no activities, skip
    if (activitiesCompleted === 0) {
      return res.status(200).json({ message: 'No activities this week. Email skipped.' });
    }

    // 5. Get task details to figure out subject/topic hierarchy
    const taskIds = (progressData ?? []).map((p: any) => p.task_id);

    // tasks -> topics -> subjects
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, topic_id, name')
      .in('id', taskIds);

    const topicIds = [...new Set((tasks ?? []).map((t: any) => t.topic_id))];

    const { data: topics } = await supabase
      .from('topics')
      .select('id, title, subject_id')
      .in('id', topicIds);

    const subjectIds = [...new Set((topics ?? []).map((t: any) => t.subject_id))];

    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .in('id', subjectIds);

    // 6. Count practices per topic to find the most loved
    const topicPracticeCount: Record<string, number> = {};
    (progressData ?? []).forEach((p: any) => {
      const task = (tasks ?? []).find((t: any) => t.id === p.task_id);
      if (!task) return;
      const topic = (topics ?? []).find((t: any) => t.id === task.topic_id);
      if (!topic) return;
      topicPracticeCount[topic.title] = (topicPracticeCount[topic.title] || 0) + 1;
    });

    const mostLovedTopic = Object.entries(topicPracticeCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'N/A';

    // 7. Find subjects NOT practiced this week for "next focus" suggestion
    const { data: allSubjects } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('is_active', true);

    const practicedSubjectIds = new Set(subjectIds);
    const unpracticedSubject = (allSubjects ?? []).find((s: any) => !practicedSubjectIds.has(s.id));
    const suggestedNextWeekFocus = unpracticedSubject?.name ?? (subjects ?? [])[0]?.name ?? 'General Review';

    // 8. Build report data
    const reportData = {
      activitiesCompleted,
      subjectsPracticed: subjectIds.length,
      mostLovedTopic,
      suggestedNextWeekFocus,
    };

    const htmlTemplate = renderWeeklyReportEmail(reportData);

    // 9. Send Email
    console.log(`[${new Date().toISOString()}] [weekly-report] Sending to ${adminEmail}...`);
    await transporter.sendMail({
      from: `"UnBoxed Learning" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `🎉 Weekly Wrap-Up! ${activitiesCompleted} Activities Done`,
      html: htmlTemplate,
    });

    // 10. Log success to DB
    try {
      await supabase.from('email_logs').insert({
        status: 'success',
        error_message: null,
        recipient: adminEmail,
        tasks_learned_count: activitiesCompleted,
        tasks_pending_count: 0,
      });
    } catch (dbErr) {
      console.warn(`[${new Date().toISOString()}] [weekly-report] Failed to write success log:`, dbErr);
    }

    console.log(`[${new Date().toISOString()}] [weekly-report] ✅ Sent successfully.`);
    return res.status(200).json({ success: true, message: 'Weekly report sent successfully.', data: reportData });
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] [weekly-report] ❌ Error:`, error.message);

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
      console.error(`[${new Date().toISOString()}] [weekly-report] Also failed to write failure log:`, dbErr);
    }

    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
