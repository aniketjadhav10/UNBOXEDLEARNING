// app/api/push/unsubscribe/route.ts — remove a browser's Web Push subscription
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendError, parseJson } from '@/lib/api-utils/http';
import { createServerSupabase } from '@/lib/supabase/server';

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

export async function POST(req: NextRequest) {
  try {
    const { endpoint } = await parseJson(req, unsubscribeSchema);
    const supabase = await createServerSupabase();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return sendError(error);
  }
}
