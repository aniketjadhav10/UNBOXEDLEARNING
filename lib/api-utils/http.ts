// ============================================================
// lib/api-utils/http.ts — Next.js Route Handler utilities
// Replaces src/lib/api-utils/http.ts (was Vercel-specific)
// ============================================================
import { NextResponse } from 'next/server';

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

export function sendError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  return NextResponse.json({ error: message }, { status });
}
