// ============================================================
// POST /api/ai/extract-source
// Turns a PDF, photo, or URL into plain curriculum text for the syllabus
// generator. PDFs/images go to Gemini (natively multimodal); URLs are fetched
// and stripped to text server-side. Returns { sourceText }.
//
//   multipart/form-data  → field "file" (application/pdf or image/*)
//   application/json     → { url: "https://..." }
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { requireGeminiKey, generateContentTracked, MODEL_NAME } from '@/server/ai/aiClient';
import { enforceRateLimit, RateLimitError } from '@/server/ai/gateway';
import { logger } from '@/server/logger';

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB (Vercel request body headroom)
const MAX_URL_CHARS = 20_000;

const EXTRACT_PROMPT =
  'You are digitizing curriculum source material. Extract ALL educational content from ' +
  'this document — headings, topics, subtopics, learning points, examples and any structure ' +
  '— as clean, readable plain text suitable for building a syllabus. Preserve ordering and ' +
  'hierarchy with simple indentation or numbering. Do not summarize or add commentary.';

/** Strip an HTML document down to readable text. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_URL_CHARS);
}

export async function POST(req: NextRequest) {
  requireGeminiKey();

  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = { supabase, userId: user.id };
  try {
    await enforceRateLimit(ctx);
  } catch (err) {
    if (err instanceof RateLimitError) return NextResponse.json({ error: err.message }, { status: 429 });
    return NextResponse.json({ error: 'Rate limit check failed' }, { status: 500 });
  }

  const contentType = req.headers.get('content-type') || '';

  try {
    // ── URL ingestion ────────────────────────────────────────
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null);
      const url = body?.url ? String(body.url) : '';
      if (!/^https?:\/\//i.test(url)) {
        return NextResponse.json({ error: 'Provide a valid http(s) URL' }, { status: 400 });
      }
      const res = await fetch(url, { headers: { 'User-Agent': 'UnBoxedLearning/1.0' } });
      if (!res.ok) return NextResponse.json({ error: `Could not fetch URL (${res.status})` }, { status: 400 });
      const html = await res.text();
      const sourceText = htmlToText(html);
      if (!sourceText) return NextResponse.json({ error: 'No readable text found at that URL' }, { status: 400 });
      return NextResponse.json({ sourceText });
    }

    // ── File (PDF / image) ingestion via Gemini ──────────────
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const blob = file as File;
    const mimeType = blob.type || 'application/octet-stream';
    const isPdf = mimeType === 'application/pdf';
    const isImage = mimeType.startsWith('image/');
    if (!isPdf && !isImage) {
      return NextResponse.json({ error: 'Only PDF or image files are supported' }, { status: 400 });
    }
    if (blob.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 8 MB)' }, { status: 400 });
    }

    const dataBase64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
    const params: any = {
      model: MODEL_NAME,
      contents: [{
        role: 'user',
        parts: [
          { text: EXTRACT_PROMPT },
          { inlineData: { mimeType, data: dataBase64 } },
        ],
      }],
    };

    const response = await generateContentTracked(ctx, params, 'extract_source');
    const sourceText = (response.text || '').trim();
    if (!sourceText) return NextResponse.json({ error: 'Could not extract text from the file' }, { status: 422 });
    return NextResponse.json({ sourceText });

  } catch (err: any) {
    logger.error({ err, message: err?.message }, '[extractSource] Error');
    return NextResponse.json({ error: err?.message || 'Failed to extract source' }, { status: 500 });
  }
}
