// app/api/push/subscribe/route.ts — save a browser's Web Push subscription
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendError, parseJson } from '@/lib/api-utils/http';
import { createServerSupabase } from '@/lib/supabase/server';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const { endpoint, keys } = await parseJson(req, subscribeSchema);
    const supabase = await createServerSupabase();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Please sign in.' }, { status: 401 });
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' },
    );
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return sendError(error);
  }
}
