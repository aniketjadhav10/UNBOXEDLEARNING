import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, sendError } from '../../src/lib/api-utils/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    const changes = Array.isArray(req.body?.changes) ? req.body.changes : [];

    res.status(200).json({
      accepted: changes.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    sendError(res, error, 500);
  }
}
