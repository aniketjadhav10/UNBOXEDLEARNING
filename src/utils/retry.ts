// ============================================================
// utils/retry.ts — Async retry wrapper for Supabase calls
// ============================================================

export interface RetryOptions {
  attempts?: number;  // max attempts (default 3)
  delayMs?: number;   // initial delay in ms (default 500), doubles on each attempt
}

/**
 * Wraps an async function with exponential backoff retry logic.
 * Only retries on network-type errors, not 4xx API errors.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, delayMs = 500 }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Don't retry on Supabase API errors (they have a `code` property)
      if (err instanceof Error && 'code' in err) throw err;
      if (attempt < attempts) {
        await delay(delayMs * attempt);
      }
    }
  }
  throw lastError;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
