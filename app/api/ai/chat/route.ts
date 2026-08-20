// ============================================================
// app/api/ai/chat/route.ts — AI Chat endpoint
// Migrated from server/ai/chat.ts (Vercel → Next.js Route Handler)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { sendError } from '@/lib/api-utils/http';
import { createServerSupabase } from '@/lib/api-utils/supabase';
import { MODEL_NAME, requireGeminiKey, getEmbedding, generateContentTracked } from '@/server/ai/aiClient';
import { enforceRateLimit, RateLimitError } from '@/server/ai/gateway';
import { tools } from '@/server/ai/tools';
import { toGeminiFunctionDeclarations, dispatchToolCall } from '@/server/ai/tools/gemini';
import { logger } from '@/server/logger';

export async function POST(req: NextRequest) {
  try {
    requireGeminiKey();

    const supabase = createServerSupabase(req);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.warn('Unauthorized access attempt in chat');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = { supabase, userId: user.id };
    await enforceRateLimit(ctx);

    const body = await req.json();
    const { messages = [], sessionId, curriculumContext = false } = body;

    if (!messages.length) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1];
    if (latestMessage.role !== 'user') {
      return NextResponse.json({ error: 'Last message must be from user' }, { status: 400 });
    }

    // 1. Vector Search for Long-Term Memory
    const queryEmbedding = await getEmbedding(latestMessage.content);
    let memoryContext = '';

    if (queryEmbedding) {
      const { data: memories } = await supabase.rpc('match_user_memories', {
        query_embedding: queryEmbedding,
        user_id_filter: user.id,
        match_threshold: 0.7,
        match_count: 5,
      });

      if (memories && memories.length > 0) {
        memoryContext = 'Here are some facts you have previously learned about this user (Long-Term Memory):\n' +
          memories.map((m: any) => `- ${m.content}`).join('\n');
      }
    }

    // 2. Dynamic Curriculum Context
    let dbContext = '';
    if (curriculumContext) {
      const { data: children } = await supabase.from('children').select('id, name, grade_level').eq('user_id', user.id);

      if (children && children.length > 0) {
        dbContext += '\nHere is the current active curriculum state for the user:\n';

        for (const child of children) {
          dbContext += `\n--- Child: ${child.name} (Grade: ${child.grade_level}) ---\n`;

          const { data: progress } = await supabase
            .from('task_progress')
            .select(`
              learning_stage,
              next_due_at,
              notes,
              session_count,
              learned_count,
              parent_rating,
              tasks (
                name,
                description,
                topics (
                  title,
                  subjects (
                    name
                  )
                )
              )
            `)
            .eq('child_id', child.id)
            .eq('is_active', true);

          if (progress && progress.length > 0) {
            const now = new Date();
            const overdue = progress.filter((p: any) => p.next_due_at && new Date(p.next_due_at) < now);
            const inProgress = progress.filter((p: any) => p.learning_stage !== 'Comfortable' && p.learning_stage !== 'Confident' && !overdue.includes(p));

            if (overdue.length > 0) {
              dbContext += `Overdue Tasks:\n`;
              overdue.forEach((p: any) => {
                const t = p.tasks as any;
                dbContext += `- ${t?.name} (Topic: ${t?.topics?.title}, Subject: ${t?.topics?.subjects?.name})\n`;
              });
            }
            if (inProgress.length > 0) {
              dbContext += `In Progress Tasks:\n`;
              inProgress.forEach((p: any) => {
                const t = p.tasks as any;
                let details = `- ${t?.name} (Topic: ${t?.topics?.title}, Subject: ${t?.topics?.subjects?.name}, Stage: ${p.learning_stage})\n`;
                if (p.notes) details += `  Notes: ${p.notes}\n`;
                if (p.session_count > 0) details += `  Sessions: ${p.session_count}, Learned: ${p.learned_count}\n`;
                if (p.parent_rating) details += `  Rating: ${p.parent_rating}/5\n`;
                dbContext += details;
              });
            }
          } else {
            dbContext += `No tasks assigned yet.\n`;
          }
        }
      }
    }

    // 3. System Instruction
    const systemInstruction = `You are a helpful educational AI assistant for a homeschool management app.
Your goal is to assist parents and students with their educational journey.
${memoryContext}
${dbContext}
When you learn an important new fact or preference about the user or their child, you MUST use the "save_user_memory" tool to remember it for future sessions.
If the user asks about completed tasks, all tasks, or searches for a specific topic that isn't in the active curriculum state provided above, you MUST use the "search_curriculum" tool to search the database.
When a user asks to mark a task as completed, practicing, or any other stage, you MUST use the "update_task_stage" tool to update it. If the family has more than one child, pass the child's name as child_name.
Respond nicely and concisely. You MUST format all your responses using Markdown.`;

    // 4. Format Messages
    const formattedMessages = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    // Tools come from the shared registry (server/ai/tools) — the same
    // definitions the MCP server exposes. One source, no duplication.
    const reqConfig: any = {
      systemInstruction,
      tools: [{ functionDeclarations: toGeminiFunctionDeclarations(tools) }],
    };

    logger.info('[chat] Calling Gemini...');
    const response = await generateContentTracked(ctx, {
      model: MODEL_NAME,
      contents: formattedMessages,
      config: reqConfig
    }, 'chat');

    let aiResponseText = response.text || '';
    const functionCalls = response.functionCalls;

    // 5. Handle Function Calls — dispatched through the shared registry.
    if (functionCalls && functionCalls.length > 0) {
      const toolResponses = [];

      for (const call of functionCalls) {
        const result = await dispatchToolCall(
          call.name as string,
          (call.args ?? {}) as Record<string, unknown>,
          { supabase, userId: user.id },
        );
        toolResponses.push({ name: call.name, response: { result } });
      }

      if (!aiResponseText || toolResponses.length > 0) {
        formattedMessages.push({ role: 'model', parts: response.candidates?.[0]?.content?.parts || [] });
        formattedMessages.push({ role: 'user', parts: toolResponses.map(tr => ({ functionResponse: tr })) });
        const followUp = await generateContentTracked(ctx, { model: MODEL_NAME, contents: formattedMessages, config: reqConfig }, 'chat');
        aiResponseText = followUp.text || 'Done!';
      }
    }

    // 6. Save messages to DB if sessionId provided
    if (sessionId) {
      await supabase.from('chat_messages').insert({ session_id: sessionId, role: 'user', content: latestMessage.content });
      await supabase.from('chat_messages').insert({ session_id: sessionId, role: 'model', content: aiResponseText });
    }

    return NextResponse.json({ success: true, text: aiResponseText });
  } catch (error: any) {
    if (error instanceof RateLimitError) return sendError(error, 429);
    logger.error({ err: error, message: error?.message, stack: error?.stack }, '[chat] Request error');
    return sendError(error, 500);
  }
}
