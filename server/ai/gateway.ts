// ============================================================
// server/ai/gateway.ts — AI gateway: rate limiting + usage/cost logging
// Every AI route authenticates, calls enforceRateLimit(ctx), then runs
// generation through the aiClient helpers which record usage here.
// Both checks are fail-soft: a logging-table hiccup never breaks the product.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../logger';

export interface GatewayCtx {
  /** RLS-enforced client bound to the acting user's token. */
  supabase: SupabaseClient;
  userId: string;
}

/** Thrown when a user exceeds their AI request budget. Routes map this to HTTP 429. */
export class RateLimitError extends Error {
  readonly status = 429;
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

const DEFAULT_MAX = Number(process.env.AI_RATE_LIMIT_MAX) || 30;
const DEFAULT_WINDOW_SECONDS = Number(process.env.AI_RATE_LIMIT_WINDOW_SECONDS) || 60;

/**
 * Reject the request if the user has made too many AI calls in the recent window.
 * Fails open (allows) if the usage table can't be read, so an infra issue never
 * hard-blocks the product — it just temporarily disables enforcement.
 */
export async function enforceRateLimit(
  ctx: GatewayCtx,
  opts?: { max?: number; windowSeconds?: number },
): Promise<void> {
  const max = opts?.max ?? DEFAULT_MAX;
  const windowSeconds = opts?.windowSeconds ?? DEFAULT_WINDOW_SECONDS;
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await ctx.supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ctx.userId)
    .gte('created_at', since);

  if (error) {
    logger.warn({ err: error.message }, '[gateway] rate-limit check failed; allowing request');
    return;
  }

  if ((count ?? 0) >= max) {
    throw new RateLimitError(
      `AI request limit reached (${max} per ${windowSeconds}s). Please wait a moment and try again.`,
    );
  }
}

export interface UsageRecord {
  operation: string;
  model: string;
  promptTokens?: number;
  candidateTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  status: 'success' | 'error';
  error?: string | null;
}

/** Best-effort insert of one usage row. Never throws. */
export async function recordUsage(ctx: GatewayCtx, data: UsageRecord): Promise<void> {
  const { error } = await ctx.supabase.from('ai_usage').insert({
    user_id: ctx.userId,
    operation: data.operation,
    model: data.model,
    prompt_tokens: data.promptTokens ?? null,
    candidate_tokens: data.candidateTokens ?? null,
    total_tokens: data.totalTokens ?? null,
    latency_ms: data.latencyMs ?? null,
    status: data.status,
    error: data.error ?? null,
  });
  if (error) logger.warn({ err: error.message }, '[gateway] usage record failed');
}
