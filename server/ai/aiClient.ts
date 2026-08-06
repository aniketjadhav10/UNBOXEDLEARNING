/**
 * Shared Gemini AI client and embedding utility for all AI API routes.
 */
import { GoogleGenAI } from '@google/genai';

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
    const result = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    });
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
export async function generateJson(prompt: string): Promise<string> {
  console.log(`[generateJson] Calling model "${MODEL_NAME}" …`);
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });
  const raw = response.text;
  if (!raw) throw new Error('Gemini returned an empty response');
  return raw;
}

// ---------------------------------------------------------------------------
// API key guard – call at the top of every handler
// ---------------------------------------------------------------------------
export function requireGeminiKey(): void {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
}
