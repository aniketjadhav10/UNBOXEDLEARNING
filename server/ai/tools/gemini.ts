// ============================================================
// server/ai/tools/gemini.ts — Gemini function-calling adapter
// Bridges the shared tool registry to Gemini: converts each
// ToolDef's zod input shape into a Gemini functionDeclaration and
// dispatches model tool-calls through the registry handlers.
// This is what lets one tool definition serve both MCP and chat.
// ============================================================
import type { ZodRawShape } from 'zod';
import { tools as allTools, getTool, type ToolContext, type ToolDef } from './index';

/** Map a single zod type to a Gemini schema node (small, closed set of types we use). */
function geminiType(zt: any): Record<string, unknown> {
  const typeName = zt?._def?.typeName;
  switch (typeName) {
    case 'ZodString':  return { type: 'STRING' };
    case 'ZodNumber':  return { type: 'NUMBER' };
    case 'ZodBoolean': return { type: 'BOOLEAN' };
    case 'ZodEnum':    return { type: 'STRING', enum: zt._def.values };
    case 'ZodOptional':
    case 'ZodDefault':
    case 'ZodNullable':
      return geminiType(zt._def.innerType);
    default:           return { type: 'STRING' };
  }
}

/** Convert a zod raw shape into a Gemini `parameters` object (OpenAPI-subset). */
function shapeToParameters(shape: ZodRawShape) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [key, zt] of Object.entries(shape)) {
    const typeName = (zt as any)?._def?.typeName;
    const optional = typeName === 'ZodOptional' || typeName === 'ZodDefault' || typeName === 'ZodNullable';
    properties[key] = geminiType(zt);
    if (!optional) required.push(key);
  }
  return { type: 'OBJECT', properties, required };
}

/** Build Gemini functionDeclarations for the given tools (defaults to the whole registry). */
export function toGeminiFunctionDeclarations(toolList: ToolDef[] = allTools) {
  return toolList.map((t) => {
    const params = shapeToParameters(t.inputSchema);
    // Gemini rejects an empty parameters object — omit it for no-arg tools.
    return Object.keys(params.properties).length > 0
      ? { name: t.name, description: t.description, parameters: params }
      : { name: t.name, description: t.description };
  });
}

/** Run a model-requested tool call through the registry. Errors are returned, never thrown. */
export async function dispatchToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const tool = getTool(name);
  if (!tool) return { error: `Unknown tool: ${name}` };
  try {
    return await tool.handler(args ?? {}, ctx);
  } catch (err: any) {
    return { error: err?.message ?? 'tool failed' };
  }
}
