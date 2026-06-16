import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

export function createServerSupabase(req: VercelRequest) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase server environment variables are not configured');
  }

  const authorization = req.headers.authorization;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authorization ? { Authorization: authorization } : {},
    },
    auth: {
      persistSession: false,
    },
  });
}
