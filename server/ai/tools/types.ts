// ============================================================
// server/ai/tools/types.ts — shared AI tool registry
// One tool definition, many consumers (MCP server today; the
// Gemini chat agent next). Every tool runs under the acting
// user's Supabase client so RLS applies.
// ============================================================
import type { ZodRawShape } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Execution context injected into every tool handler. */
export interface ToolContext {
  /** RLS-enforced client bound to the acting user's token. Never the service-role client. */
  supabase: SupabaseClient;
  /** The authenticated user's id. */
  userId: string;
}

/** A single tool: schema + handler, consumable by any AI surface. */
export interface ToolDef {
  name: string;
  description: string;
  /** Zod raw shape (map of field → ZodType), consumed directly by MCP's registerTool. */
  inputSchema: ZodRawShape;
  /** True for tools that only read; false for tools that mutate data. */
  readOnly: boolean;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
}
