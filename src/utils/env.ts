// ============================================================
// utils/env.ts — Validated environment variable access
// Updated for Next.js (uses process.env + NEXT_PUBLIC_ prefix)
// ============================================================

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function validateEnv(): EnvConfig {
  // Next.js exposes NEXT_PUBLIC_* to the browser; also works server-side
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

  const missing: string[] = [];
  if (!url)  missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!key)  missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    const msg = [
      '❌ UnBoxed Learning — Missing environment variables:',
      ...missing.map((v) => `  • ${v}`),
      '',
      'Create a .env.local file in the project root with:',
      '  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co',
      '  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key',
    ].join('\n');

    // Only throw in server-side contexts where process.env.NODE_ENV is defined
    if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
      throw new Error(msg);
    }
    console.error(msg);
  }

  return {
    supabaseUrl:    url    ?? '',
    supabaseAnonKey: key   ?? '',
  };
}

export const env = validateEnv();
