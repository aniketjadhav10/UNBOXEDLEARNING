// ============================================================
// lib/api-utils/supabase.ts — Bearer-token Supabase client.
// The app's own route handlers use the cookie-based client
// (lib/supabase/server.ts), matching middleware and pages. This
// Bearer client exists ONLY for the MCP endpoint (app/api/mcp),
// whose external MCP clients authenticate via
// `Authorization: Bearer <access-token>`, not cookies.
// ============================================================
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

export function createBearerSupabase(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase server environment variables are not configured');
  }

  const authorization = req.headers.get('authorization');

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authorization ? { Authorization: authorization } : {},
    },
    auth: {
      persistSession: false,
    },
  });
}
