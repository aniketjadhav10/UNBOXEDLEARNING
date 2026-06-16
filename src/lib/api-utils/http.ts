import type { VercelRequest, VercelResponse } from '@vercel/node';

export function allowMethods(req: VercelRequest, res: VercelResponse, methods: string[]) {
  if (!methods.includes(req.method ?? '')) {
    res.setHeader('Allow', methods.join(', '));
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return false;
  }

  return true;
}

export function readString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}

export function sendError(res: VercelResponse, error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  res.status(status).json({ error: message });
}
