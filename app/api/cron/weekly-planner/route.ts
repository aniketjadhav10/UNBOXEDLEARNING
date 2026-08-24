// app/api/cron/weekly-planner/route.ts
// Roadmap-driven weekly planner (Monday cron): for each child, schedule the
// skills whose spaced-review is DUE plus the AI-recommended NEXT skills, then
// email the parent. Selection/persistence lives in server/planner.ts (shared
// with the admin "Generate Weekly Plan" button). Idempotent per (child, week).
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { mondayOf, generateWeeklyPlan, type PlanItem } from '@/server/planner';

/* eslint-disable @typescript-eslint/no-explicit-any */

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

    const weekStart = mondayOf(new Date());
    const nowIso = new Date().toISOString();
    const weeklyPlans: Array<{ childName: string; items: PlanItem[] }> = [];

    for (const child of children) {
      try {
        const { items, created } = await generateWeeklyPlan(supabase, child, weekStart, nowIso);
        if (created && items.length > 0) weeklyPlans.push({ childName: child.name, items });
      } catch (childErr) {
        console.error(`[weekly-planner] child ${child.id} failed:`, childErr);
      }
    }

    if (weeklyPlans.length === 0) {
      return NextResponse.json({ message: 'No new plans to send (already generated or no skills).' });
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #4c1d95;">📅 Weekly Learning Roadmap</h1>
        <p style="color: #64748b;">Here's each child's plan for the week — 🔁 reviews and 🌱 new skills:</p>
        ${weeklyPlans.map(plan => `
          <h2 style="color: #1e1b4b;">${plan.childName}</h2>
          <ul style="color: #475569;">
            ${plan.items.map(it => `<li style="margin-bottom: 6px;">${it.kind === 'review' ? '🔁' : '🌱'} ${it.name}</li>`).join('')}
          </ul>
        `).join('')}
      </div>
    `;

    await transporter.sendMail({
      from: `"UnBoxed Learning" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `📅 Weekly Learning Roadmap — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      html,
    });

    return NextResponse.json({ success: true, message: 'Weekly roadmap plan sent.', children: weeklyPlans.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = GET;
