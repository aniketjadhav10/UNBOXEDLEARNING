import { createClient } from '@supabase/supabase-js';
import { env } from '../utils/env';

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Auth calls will fail until .env.local is configured.');
}

export const supabase = createClient(
  env.supabaseUrl ?? 'https://example.supabase.co',
  env.supabaseAnonKey ?? 'missing-anon-key',
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  },
);

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
