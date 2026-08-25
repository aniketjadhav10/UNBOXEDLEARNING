// ============================================================
// server/ai/cronCtx.ts — GatewayCtx for cron routes
// Cron jobs run on a service-role client with no per-request acting user, but
// generateContentTracked/recordUsage still need a userId to attribute the
// ai_usage row to. Borrow one from the data being processed (e.g. the first
// child's owning profile) — used only for usage attribution, never for RLS,
// since the client passed in is already service-role.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import type { GatewayCtx } from './gateway';

export function buildCronCtx(supabase: SupabaseClient, userId: string | null | undefined): GatewayCtx | null {
  if (!userId) return null;
  return { supabase, userId };
}
