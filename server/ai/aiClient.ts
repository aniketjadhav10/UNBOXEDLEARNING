/**
 * Shared Gemini AI client and embedding utility for all AI API routes.
 */
import { GoogleGenAI } from '@google/genai';
import { withRetry } from '@/src/utils/retry';
import { recordUsage, type GatewayCtx } from './gateway';

// ---------------------------------------------------------------------------
// Client singleton – re-used across all handlers in the same worker process
// ---------------------------------------------------------------------------
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const EMBEDDING_MODEL = 'gemini-embedding-2';
export const EMBEDDING_DIMENSIONS = 768;
/** Minimum cosine similarity to treat two records as the same concept. */
export const SIMILARITY_THRESHOLD = 0.85;
/** Same threshold used for triggering a merge-patch on matched records.
 *  Kept as a separate constant so it can be tuned independently later. */
export const MERGE_SIMILARITY_THRESHOLD = 0.85;

// ---------------------------------------------------------------------------
// Embedding helper
// ---------------------------------------------------------------------------
/**
 * Generate a vector embedding for the given text using Gemini.
 * Returns `null` if the call fails so callers can gracefully fall back.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const result = await withRetry(
      () => ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: { outputDimensionality: EMBEDDING_DIMENSIONS },
      }),
      { attempts: 3, delayMs: 500 },
    );
    const values = result.embeddings?.[0]?.values;
    if (!values) {
      console.warn('[getEmbedding] No values returned for text:', text.slice(0, 80));
      return null;
    }
    return values;
  } catch (err) {
    console.error('[getEmbedding] Failed to generate embedding:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Gemini content generation helper
// ---------------------------------------------------------------------------
/**
 * Call Gemini to generate JSON content from a prompt.
 * Throws if the model returns an empty response.
 */
export async function generateJson(
  prompt: string,
  meta?: { ctx?: GatewayCtx; operation?: string },
): Promise<string> {
  const start = Date.now();
  const params = {
    model: MODEL_NAME,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  };
  try {
    const response = await withRetry(() => ai.models.generateContent(params), { attempts: 3, delayMs: 800 });
    const raw = response.text;
    if (!raw) throw new Error('Gemini returned an empty response');
    if (meta?.ctx) {
      const u = response.usageMetadata;
      await recordUsage(meta.ctx, {
        operation: meta.operation ?? 'generate_json',
        model: MODEL_NAME,
        promptTokens: u?.promptTokenCount,
        candidateTokens: u?.candidatesTokenCount,
        totalTokens: u?.totalTokenCount,
        latencyMs: Date.now() - start,
        status: 'success',
      });
    }
    return raw;
  } catch (err: any) {
    if (meta?.ctx) {
      await recordUsage(meta.ctx, {
        operation: meta?.operation ?? 'generate_json',
        model: MODEL_NAME,
        latencyMs: Date.now() - start,
        status: 'error',
        error: err?.message,
      });
    }
    throw err;
  }
}

type GenParams = Parameters<typeof ai.models.generateContent>[0];
type GenResponse = Awaited<ReturnType<typeof ai.models.generateContent>>;

/**
 * Retry-wrapped, usage-logged Gemini content call for callers that hold a
 * gateway context (e.g. the chat route). Mirrors ai.models.generateContent.
 */
export async function generateContentTracked(
  ctx: GatewayCtx,
  params: GenParams,
  operation: string,
): Promise<GenResponse> {
  const start = Date.now();
  const model = (params as any)?.model ?? MODEL_NAME;
  try {
    const response = await withRetry(() => ai.models.generateContent(params), { attempts: 3, delayMs: 800 });
    const u = response.usageMetadata;
    await recordUsage(ctx, {
      operation,
      model,
      promptTokens: u?.promptTokenCount,
      candidateTokens: u?.candidatesTokenCount,
      totalTokens: u?.totalTokenCount,
      latencyMs: Date.now() - start,
      status: 'success',
    });
    return response;
  } catch (err: any) {
    await recordUsage(ctx, { operation, model, latencyMs: Date.now() - start, status: 'error', error: err?.message });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// API key guard – call at the top of every handler
// ---------------------------------------------------------------------------
export function requireGeminiKey(): void {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
}
