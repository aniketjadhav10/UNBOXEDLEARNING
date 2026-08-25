import pino from 'pino';
import path from 'path';

const isDev = process.env.NODE_ENV !== 'production';

// IMPORTANT: pino worker-thread transports (pino.transport / pino-pretty /
// pino/file) break when bundled by Next.js + turbopack — thread-stream fails to
// resolve its worker.js (looks under the wrong root on Windows), throwing an
// uncaughtException that crashes the dev server the first time anything logs.
// Use worker-free destinations instead:
//   dev  → console (stdout) + app-local.log via multistream (no workers)
//   prod → JSON to stdout (Vercel collects it)
const level = process.env.LOG_LEVEL || 'info';
const base = { env: process.env.NODE_ENV };

function devLogger() {
  try {
    const fileStream = pino.destination({
      dest: path.join(process.cwd(), 'app-local.log'),
      mkdir: true,
      sync: false,
    });
    return pino(
      { level, base },
      pino.multistream([{ stream: process.stdout }, { stream: fileStream }]),
    );
  } catch {
    // If the file destination can't be opened, fall back to plain stdout.
    return pino({ level, base });
  }
}

export const logger = isDev ? devLogger() : pino({ level, base });
