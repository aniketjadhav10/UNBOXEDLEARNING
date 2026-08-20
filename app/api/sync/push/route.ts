// app/api/sync/push/route.ts — migrated from server/sync/push.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const changes = Array.isArray(body?.changes) ? body.changes : [];
    return NextResponse.json({ accepted: changes.length, syncedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
