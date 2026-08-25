// ============================================================
// app/api/mcp/route.ts — Model Context Protocol server
// Exposes the shared tool registry (server/ai/tools) over MCP's
// Streamable-HTTP transport. Stateless: a fresh server+transport
// per request (correct for serverless / Vercel).
//
// Auth: this route is public to middleware.ts (like /api/cron) and
// authenticates the caller here via their Supabase access token
// (Authorization: Bearer <token>). Every tool then runs under that
// user's RLS-enforced client — never the service-role client.
// ============================================================
import type { NextRequest } from 'next/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createBearerSupabase } from '@/lib/api-utils/supabase';
import { tools, type ToolContext } from '@/server/ai/tools';
import { logger } from '@/server/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authenticate(req: NextRequest): Promise<ToolContext | null> {
  const supabase = createBearerSupabase(req);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, userId: user.id };
}

function buildServer(ctx: ToolContext): McpServer {
  const server = new McpServer({ name: 'unboxed-learning', version: '0.1.0' });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.inputSchema },
      async (args: Record<string, unknown>) => {
        try {
          const result = await tool.handler(args ?? {}, ctx);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        } catch (err: any) {
          logger.warn({ tool: tool.name, err: err?.message }, '[mcp] tool error');
          return {
            content: [{ type: 'text' as const, text: `Error: ${err?.message ?? 'tool failed'}` }],
            isError: true,
          };
        }
      },
    );
  }

  return server;
}

async function handle(req: NextRequest): Promise<Response> {
  const ctx = await authenticate(req);
  if (!ctx) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const server = buildServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
