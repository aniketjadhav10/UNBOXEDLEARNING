// ============================================================
// lib/api-utils/http.ts — Next.js Route Handler utilities
// ============================================================
import { NextResponse } from 'next/server';
import type { z } from 'zod';

export function methodNotAllowed(allowed: string[]) {
  return NextResponse.json(
    { error: `Method not allowed. Allowed: ${allowed.join(', ')}` },
    {
      status: 405,
      headers: { Allow: allowed.join(', ') },
    }
  );
}

export function readString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

/** Thrown when request input fails validation. Maps to HTTP 400 via sendError. */
export class ValidationError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Parse and validate a JSON request body against a zod schema.
 * Throws ValidationError (→ 400) on malformed JSON or schema failure.
 */
export async function parseJson<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError('Request body must be valid JSON.');
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detail);
  }
  return result.data;
}

export function sendError(error: unknown, status = 500) {
  // Honor a typed status on the error (ValidationError → 400, RateLimitError → 429).
  const errStatus = (error as { status?: unknown })?.status;
  const resolved = typeof errStatus === 'number' ? errStatus : status;
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  return NextResponse.json({ error: message }, { status: resolved });
}
