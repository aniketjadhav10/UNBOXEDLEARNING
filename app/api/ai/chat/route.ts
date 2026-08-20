// ============================================================
// app/api/ai/chat/route.ts — AI Chat endpoint
// Migrated from server/ai/chat.ts (Vercel → Next.js Route Handler)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { sendError } from '@/lib/api-utils/http';
import { createServerSupabase } from '@/lib/api-utils/supabase';
import { ai, MODEL_NAME, requireGeminiKey, getEmbedding } from '@/server/ai/aiClient';
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
If the user asks about completed tasks, all tasks, or searches for a specific topic that isn't in the active curriculum state provided above, you MUST use the "search_curriculum_tasks" tool to search the database.
When a user asks to mark a task as completed, practicing, or any other stage, you MUST use the "update_task_stage" tool to update it.
Respond nicely and concisely. You MUST format all your responses using Markdown.`;

    // 4. Format Messages
    const formattedMessages = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const reqConfig: any = {
      systemInstruction,
      tools: [{
        functionDeclarations: [
          {
            name: 'save_user_memory',
            description: 'Saves an important fact or preference about the user to their long-term memory.',
            parameters: { type: 'OBJECT', properties: { fact: { type: 'STRING', description: 'The distinct fact to remember.' } }, required: ['fact'] }
          },
          {
            name: 'search_curriculum_tasks',
            description: 'Searches all curriculum tasks in the database for the user using semantic similarity.',
            parameters: { type: 'OBJECT', properties: { query: { type: 'STRING', description: 'The search query or topic to look for.' } }, required: ['query'] }
          },
          {
            name: 'update_task_stage',
            description: 'Updates the learning stage of a specific task progress record.',
            parameters: {
              type: 'OBJECT',
              properties: {
                task_name: { type: 'STRING', description: 'The exact name of the task to update.' },
                new_stage: { type: 'STRING', description: 'The new stage. Must be one of: Not_Started, Introduced, Practicing, Comfortable, Confident, Needs_Practice.' }
              },
              required: ['task_name', 'new_stage']
            }
          }
        ]
      }]
    };

    logger.info('[chat] Calling Gemini...');
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: formattedMessages,
      config: reqConfig
    });

    let aiResponseText = response.text || '';
    const functionCalls = response.functionCalls;

    // 5. Handle Function Calls
    if (functionCalls && functionCalls.length > 0) {
      const toolResponses = [];

      for (const call of functionCalls) {
        if (call.name === 'save_user_memory') {
          const fact = call.args?.fact;
          if (fact) {
            const factEmbedding = await getEmbedding(fact as string);
            await supabase.from('user_memories').insert({ user_id: user.id, content: fact, embedding: factEmbedding });
          }
          toolResponses.push({ name: 'save_user_memory', response: { success: true } });
        } else if (call.name === 'search_curriculum_tasks') {
          const query = call.args?.query;
          let searchResults = 'No results found.';
          if (query) {
            const qEmbedding = await getEmbedding(query as string);
            if (qEmbedding) {
              const { data: matchedTasks } = await supabase.rpc('match_tasks', {
                query_embedding: qEmbedding, p_topic_id: null, match_threshold: 0.6, match_count: 5
              });
              if (matchedTasks && matchedTasks.length > 0) {
                searchResults = matchedTasks.map((t: any) => `- Task: ${t.name}. Desc: ${t.description}`).join('\n');
              }
            }
          }
          toolResponses.push({ name: 'search_curriculum_tasks', response: { results: searchResults } });
        } else if (call.name === 'update_task_stage') {
          const taskName = call.args?.task_name;
          const newStage = call.args?.new_stage;
          let result = 'Failed to update task.';
          const { data: userData } = await supabase.from('children').select('id').eq('user_id', user.id);
          const children = userData || [];
          if (taskName && newStage) {
            const { data: tasks } = await supabase.from('tasks').select('id, name').ilike('name', `%${taskName}%`).limit(1);
            if (tasks && tasks.length > 0) {
              const { error } = await supabase.from('task_progress').update({ learning_stage: newStage }).eq('task_id', tasks[0].id).eq('child_id', children[0]?.id || null);
              if (!error) result = `Successfully updated '${tasks[0].name}' to ${newStage}.`;
            } else {
              result = `Task '${taskName}' not found.`;
            }
          }
          toolResponses.push({ name: 'update_task_stage', response: { results: result } });
        }
      }

      if (!aiResponseText || toolResponses.length > 0) {
        formattedMessages.push({ role: 'model', parts: response.candidates?.[0]?.content?.parts || [] });
        formattedMessages.push({ role: 'user', parts: toolResponses.map(tr => ({ functionResponse: tr })) });
        const followUp = await ai.models.generateContent({ model: MODEL_NAME, contents: formattedMessages, config: reqConfig });
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
    logger.error({ err: error, message: error?.message, stack: error?.stack }, '[chat] Request error');
    return sendError(error, 500);
  }
}
