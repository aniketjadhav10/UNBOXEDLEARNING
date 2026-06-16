import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { CronExpressionParser } from 'cron-parser';

import { renderEveningProgressEmail } from '../../src/lib/email-templates/evening-progress.js';

// Initialize Supabase admin client (requires Service Role Key to bypass RLS)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient((supabaseUrl as string) || 'https://example.supabase.co', (supabaseKey as string) || 'missing-service-key');

// Initialize Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Verify Vercel Cron Secret (Security)
  // Ensure the request comes from Vercel's Cron scheduler
  if (
    process.env.CRON_SECRET &&
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}` &&
    req.query.secret !== process.env.CRON_SECRET
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Fetch dynamic cron schedule
  const { data: settingData } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'daily_email_cron')
    .single();

  const dynamicCron = settingData?.value || '0 17 * * *';

  try {
    const interval = CronExpressionParser.parse(dynamicCron, { tz: 'UTC' });
    const prevRun = interval.prev().toDate();
    const now = new Date();
    
    // Check if the scheduled time occurred within the last 60 minutes
    const diffMinutes = (now.getTime() - prevRun.getTime()) / (1000 * 60);
    
    if ((diffMinutes < 0 || diffMinutes >= 60) && req.query.force !== 'true') {
      return res.status(200).json({ message: `Dynamic schedule (${dynamicCron}) not met at this hour. Skipped.` });
    }
  } catch (err) {
    console.error('Invalid cron expression configured:', dynamicCron);
    return res.status(500).json({ error: 'Invalid dynamic cron expression configured in database.' });
  }

  // 3. Determine recipients
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return res.status(500).json({ error: 'ADMIN_EMAIL is not configured.' });
  }

  try {
    // 4. Fetch data from Supabase
    // Get all scheduled tasks for this week
    const { data: progressData, error: progressError } = await supabase
      .from('task_progress')
      .select('task_id, child_id, learning_stage, learned_count, target_count, last_practiced_at, next_due_at')
      .eq('is_scheduled_this_week', true)
      .eq('is_active', true);

    if (progressError) throw new Error(progressError.message);

    if (!progressData || progressData.length === 0) {
      return res.status(200).json({ message: 'No scheduled tasks found for today. Email skipped.' });
    }

    // Get task details
    const taskIds = progressData.map(p => p.task_id);
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name, topic_id')
      .in('id', taskIds)
      .eq('is_active', true);

    if (tasksError) throw new Error(tasksError.message);

    // Calculate metrics
    const todayStr = new Date().toISOString().split('T')[0];
    
    const tasksWithProgress = (tasks || []).map(task => {
      const progress = progressData.find(p => p.task_id === task.id);
      const isPracticedToday = progress?.last_practiced_at?.split('T')[0] === todayStr;
      
      let isOverdue = false;
      if (progress?.next_due_at) {
        const nextDue = new Date(progress.next_due_at);
        nextDue.setHours(0, 0, 0, 0);
        isOverdue = nextDue < new Date(new Date().setHours(0, 0, 0, 0));
      }

      return {
        ...task,
        progress,
        isPracticedToday,
        isOverdue
      };
    });

    const learnedToday = tasksWithProgress.filter(t => t.isPracticedToday);
    const pending = tasksWithProgress.filter(t => !t.isPracticedToday);
    const overdue = pending.filter(t => t.isOverdue);

    const htmlTemplate = renderEveningProgressEmail(learnedToday, pending, overdue);

    // 5. Send Email
    await transporter.sendMail({
      from: `"UnBoxed Learning" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `Daily Progress: ${learnedToday.length} Learned, ${pending.length} Pending`,
      html: htmlTemplate,
    });

    // Log success
    await supabase.from('email_logs').insert({
      status: 'success',
      error_message: null,
      recipient: adminEmail,
      tasks_learned_count: learnedToday.length,
      tasks_pending_count: pending.length
    });

    return res.status(200).json({ success: true, message: 'Daily report sent successfully.' });
  } catch (error: any) {
    console.error('Error sending daily report:', error);
    
    // Log failure
    try {
      await supabase.from('email_logs').insert({
        status: 'failed',
        error_message: error.message || 'Unknown error',
        recipient: process.env.ADMIN_EMAIL,
        tasks_learned_count: null,
        tasks_pending_count: null
      });
    } catch (dbError) {
      console.error('Also failed to write to email_logs DB:', dbError);
    }

    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
