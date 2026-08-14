import pino from 'pino';
import path from 'path';

const isDev = process.env.NODE_ENV !== 'production';

// In development, write to a local file and pretty-print to the console.
// In production, just output JSON to stdout (which Vercel automatically collects).
const transport = isDev
  ? pino.transport({
      targets: [
        {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
        {
          target: 'pino/file',
          options: {
            destination: path.join(process.cwd(), 'app-local.log'),
            mkdir: true,
          },
        },
      ],
    })
  : undefined; // Defaults to standard stdout in production

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: {
      env: process.env.NODE_ENV,
    },
  },
  transport as any
);
