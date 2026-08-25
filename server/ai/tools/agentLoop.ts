// ============================================================
// server/ai/tools/agentLoop.ts — multi-round Gemini tool-calling loop
// Generalizes the request → dispatch → follow-up shape that used to live
// inline in the chat route into an N-round loop: after each round of tool
// calls, the results go back to Gemini, which can decide to call more tools
// before finally answering in text. Shared by the chat route and the
// weekly-planner agent — one loop implementation, many callers.
// ============================================================
import type { GatewayCtx } from '../gateway';
import { generateContentTracked } from '../aiClient';
import { dispatchToolCall } from './gemini';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface RunToolLoopParams {
  model: string;
  /** Gemini `contents` array — mutated in place as rounds progress. */
  contents: any[];
  /** Gemini generation config, e.g. `{ systemInstruction, tools }`. */
  config: any;
  /** Usage-tracking operation string, passed through to every round's call. */
  operation: string;
  /** Safety cap on tool-calling rounds before forcing a text-only answer. */
  maxRounds?: number;
}

/**
 * Runs Gemini with tool access across multiple rounds: each time the model
 * requests function calls, they're dispatched through the shared tool
 * registry and the results are fed back for another round, until the model
 * answers in text or `maxRounds` is hit (at which point tools are dropped
 * from the config so the model is forced to produce a final text answer).
 */
export async function runToolLoop(
  ctx: GatewayCtx,
  { model, contents, config, operation, maxRounds = 5 }: RunToolLoopParams,
): Promise<{ text: string; rounds: number }> {
  let round = 0;

  while (true) {
    round += 1;
    const forceFinal = round > maxRounds;
    const callConfig = forceFinal ? { ...config, tools: undefined } : config;

    const response = await generateContentTracked(ctx, { model, contents, config: callConfig }, operation);
    const functionCalls = response.functionCalls;

    if (forceFinal || !functionCalls || functionCalls.length === 0) {
      return { text: response.text || 'Done!', rounds: round };
    }

    const toolResponses = [];
    for (const call of functionCalls) {
      const result = await dispatchToolCall(
        call.name as string,
        (call.args ?? {}) as Record<string, unknown>,
        { supabase: ctx.supabase, userId: ctx.userId },
      );
      toolResponses.push({ name: call.name, response: { result } });
    }

    contents.push({ role: 'model', parts: response.candidates?.[0]?.content?.parts || [] });
    contents.push({ role: 'user', parts: toolResponses.map((tr) => ({ functionResponse: tr })) });
  }
}
