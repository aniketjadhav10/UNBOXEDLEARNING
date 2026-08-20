// ============================================================
// server/ai/tools/index.ts — the shared tool registry
// Consumers: app/api/mcp/route.ts (MCP server) and, next, the
// Gemini chat agent. Add a tool once here; every surface gets it.
// ============================================================
import { readTools } from './readTools';
import { writeTools } from './writeTools';
import type { ToolDef } from './types';

export type { ToolDef, ToolContext } from './types';

/** All tools exposed to AI surfaces. */
export const tools: ToolDef[] = [...readTools, ...writeTools];

export function getTool(name: string): ToolDef | undefined {
  return tools.find((t) => t.name === name);
}
