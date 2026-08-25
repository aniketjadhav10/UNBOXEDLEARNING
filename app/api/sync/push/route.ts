// app/api/sync/push/route.ts — migrated from server/sync/push.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    }

    const body = await req.json();
    const changes = Array.isArray(body?.changes) ? body.changes : [];
    return NextResponse.json({ accepted: changes.length, syncedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
