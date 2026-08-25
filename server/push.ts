// server/push.ts — Web Push (VAPID) send helper, shared by API routes and cron jobs.
import webpush from 'web-push';
import { logger } from './logger';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID keys are not configured.');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Sends one push notification per subscription. Returns the ids of
 * subscriptions that are no longer valid (404/410) so the caller can prune them.
 */
export async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<{ sent: number; staleIds: string[] }> {
  if (subscriptions.length === 0) return { sent: 0, staleIds: [] };
  ensureConfigured();

  let sent = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        } else {
          logger.warn({ err: error, subscriptionId: sub.id }, 'Push notification send failed');
        }
      }
    }),
  );

  return { sent, staleIds };
}
