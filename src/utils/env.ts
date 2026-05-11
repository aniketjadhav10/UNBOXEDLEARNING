// ============================================================
// utils/env.ts — Validated environment variable access
// ============================================================

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function validateEnv(): EnvConfig {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  const missing: string[] = [];
  if (!url)  missing.push('VITE_SUPABASE_URL');
  if (!key)  missing.push('VITE_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    const msg = [
      '❌ UnBoxed Learning — Missing environment variables:',
      ...missing.map((v) => `  • ${v}`),
      '',
      'Create a .env.local file in the project root with:',
      '  VITE_SUPABASE_URL=https://your-project.supabase.co',
      '  VITE_SUPABASE_ANON_KEY=your-anon-key',
    ].join('\n');
    
    // In development, throw to surface the problem immediately
    if (import.meta.env.DEV) {
      throw new Error(msg);
    }
    // In production, log and use empty strings (Supabase calls will 401 gracefully)
    console.error(msg);
  }

  return {
    supabaseUrl:    url    ?? '',
    supabaseAnonKey: key   ?? '',
  };
}

export const env = validateEnv();
