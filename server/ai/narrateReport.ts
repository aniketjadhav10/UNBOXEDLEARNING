// ============================================================
// server/ai/narrateReport.ts — natural-language summaries for the report
// emails and daily push notification. Each function returns null on any
// failure (missing key, rate limit, bad response) so callers can fall back
// to their existing static copy without any special-casing — the email/push
// must always send, narrated or not.
// ============================================================
import { generateJson } from './aiClient';
import { extractJson } from './generateSyllabus';
import type { GatewayCtx } from './gateway';

async function narrate(prompt: string, ctx: GatewayCtx, operation: string): Promise<string | null> {
  try {
    const raw = await generateJson(prompt, { ctx, operation });
    const parsed = extractJson(raw);
    const text = typeof parsed?.narration === 'string' ? parsed.narration.trim() : '';
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export async function narrateWeeklySummary(
  ctx: GatewayCtx,
  weeklyStats: Array<{ childName: string; learned: number; practiced: number }>,
): Promise<string | null> {
  if (weeklyStats.length === 0) return null;
  const prompt = `You are writing one short, warm sentence for a homeschool parent's weekly progress email. Use ONLY this data — never mention a number or fact not listed here:
${weeklyStats.map((s) => `- ${s.childName}: ${s.practiced} task(s) practiced, ${s.learned} reached mastery this week`).join('\n')}

Write 1-2 plain-text sentences (no markdown, no HTML) highlighting what stands out — a strong week, a child who practiced little, a big jump in mastery, etc.
Respond with ONLY this JSON object: {"narration": "..."}`;
  return narrate(prompt, ctx, 'narrate_weekly_report');
}

export async function narrateEveningSummary(
  ctx: GatewayCtx,
  childReports: Array<{ childName: string; learnedTasks: string[]; pendingTasks: string[] }>,
): Promise<string | null> {
  if (childReports.every((r) => r.learnedTasks.length === 0 && r.pendingTasks.length === 0)) return null;
  const prompt = `You are writing one short, warm sentence for a homeschool parent's evening progress email. Use ONLY this data — never mention a task or fact not listed here:
${childReports
    .map(
      (r) =>
        `- ${r.childName}: mastered today — ${r.learnedTasks.length > 0 ? r.learnedTasks.join(', ') : 'none'}; still pending — ${r.pendingTasks.length > 0 ? r.pendingTasks.join(', ') : 'none'}`,
    )
    .join('\n')}

Write 1-2 plain-text sentences (no markdown, no HTML) — encouraging if the day went well, gently noting it if a lot is still pending.
Respond with ONLY this JSON object: {"narration": "..."}`;
  return narrate(prompt, ctx, 'narrate_evening_report');
}

export async function narrateDailyAgendaBody(ctx: GatewayCtx, allActivities: string[]): Promise<string | null> {
  if (allActivities.length === 0) return null;
  const prompt = `You are writing a short push-notification body for a homeschool parent, listing today's scheduled learning activities. Use ONLY these activities — never invent one:
${allActivities.join('; ')}

Keep it under 90 characters, plain text, no emoji, no markdown. Prefer naming the single most notable activity if it fits naturally, otherwise summarize the count.
Respond with ONLY this JSON object: {"narration": "..."}`;
  return narrate(prompt, ctx, 'narrate_daily_agenda_push');
}
