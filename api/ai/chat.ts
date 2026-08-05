import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, sendError } from '../../src/lib/api-utils/http';
import { createServerSupabase } from '../../src/lib/api-utils/supabase';
import { ai, MODEL_NAME, requireGeminiKey, getEmbedding } from './aiClient';

// Helper to sanitize DB errors
const safeQuery = async <T>(promise: Promise<T>) => {
  try {
    return await promise;
  } catch (err) {
    console.error('DB query error:', err);
    return null;
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    requireGeminiKey();

    const supabase = createServerSupabase(req);

    // Ensure user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messages = [], sessionId, curriculumContext = false } = req.body;
    
    if (!messages.length) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const latestMessage = messages[messages.length - 1];
    if (latestMessage.role !== 'user') {
      return res.status(400).json({ error: 'Last message must be from user' });
    }

    // 1. Vector Search for Long-Term Memory
    const queryEmbedding = await getEmbedding(latestMessage.content);
    let memoryContext = '';
    
    if (queryEmbedding) {
      // Find relevant user memories
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

    // 2. Dynamic Curriculum Context for the current user
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
            if (overdue.length === 0 && inProgress.length === 0) {
               dbContext += `All current tasks are completed! (Comfortable/Confident)\n`;
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
When you learn an important new fact or preference about the user or their child (e.g. learning style, favorite subjects, personal background), you MUST use the "save_user_memory" tool to remember it for future sessions.
If the user asks about completed tasks, all tasks, or searches for a specific topic that isn't in the active curriculum state provided above, you MUST use the "search_curriculum_tasks" tool to search the database.
Respond nicely and concisely.`;

    // 4. Format Messages for Gemini
    const formattedMessages = messages.map((m: any) => ({
      role: m.role,
      parts: [{ text: m.content }]
    }));

    const reqConfig: any = {
      systemInstruction: systemInstruction,
      tools: [
        {
          functionDeclarations: [
            {
              name: 'save_user_memory',
              description: 'Saves an important fact or preference about the user to their long-term memory.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  fact: {
                    type: 'STRING',
                    description: 'The distinct fact to remember (e.g., "User\'s son loves dinosaurs" or "Prefers visual learning").'
                  }
                },
                required: ['fact']
              }
            },
            {
              name: 'search_curriculum_tasks',
              description: 'Searches all curriculum tasks in the database for the user (including completed tasks) using semantic similarity.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  query: {
                    type: 'STRING',
                    description: 'The search query or topic to look for.'
                  }
                },
                required: ['query']
              }
            }
          ]
        }
      ]
    };

    console.log('[chat] Calling Gemini...');
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: formattedMessages,
      config: reqConfig
    });

    let aiResponseText = response.text || '';
    const functionCalls = response.functionCalls;

    // 5. Handle Function Calls (Tool Execution)
    if (functionCalls && functionCalls.length > 0) {
       let toolResponses = [];
       
       for (const call of functionCalls) {
          if (call.name === 'save_user_memory') {
             const fact = call.args?.fact;
             console.log(`[chat] Tool called: save_user_memory. Fact: ${fact}`);
             
             if (fact) {
                const factEmbedding = await getEmbedding(fact);
                await supabase.from('user_memories').insert({
                   user_id: user.id,
                   content: fact,
                   embedding: factEmbedding
                });
             }
             toolResponses.push({
               name: 'save_user_memory',
               response: { success: true }
             });
          }
          else if (call.name === 'search_curriculum_tasks') {
             const query = call.args?.query;
             console.log(`[chat] Tool called: search_curriculum_tasks. Query: ${query}`);
             let searchResults = "No results found.";
             
             if (query) {
                const qEmbedding = await getEmbedding(query);
                if (qEmbedding) {
                   // Search tasks using vector similarity
                   const { data: matchedTasks } = await supabase.rpc('match_tasks', {
                      query_embedding: qEmbedding,
                      topic_id_filter: null,
                      match_threshold: 0.6,
                      match_count: 5
                   });
                   
                   if (matchedTasks && matchedTasks.length > 0) {
                      searchResults = matchedTasks.map((t: any) => `- Task: ${t.name}. Desc: ${t.description}`).join('\n');
                   }
                }
             }
             toolResponses.push({
               name: 'search_curriculum_tasks',
               response: { results: searchResults }
             });
          }
       }
       
       if (!aiResponseText || toolResponses.length > 0) {
           formattedMessages.push({
             role: 'model',
             parts: functionCalls.map(fc => ({ functionCall: fc }))
           });
           
           formattedMessages.push({
             role: 'function',
             parts: toolResponses.map(tr => ({ functionResponse: tr }))
           });

           const followUp = await ai.models.generateContent({
              model: MODEL_NAME,
              contents: formattedMessages,
              config: { systemInstruction } 
           });
           aiResponseText = followUp.text || 'Done!';
       }
    }

    // 6. Save messages to database if a sessionId is provided
    if (sessionId) {
       // Save user message
       await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'user',
          content: latestMessage.content
       });
       
       // Save AI message
       await supabase.from('chat_messages').insert({
          session_id: sessionId,
          role: 'model',
          content: aiResponseText
       });
    }

    res.status(200).json({
      success: true,
      text: aiResponseText,
    });
  } catch (error) {
    console.error('[chat] Error:', error);
    sendError(res, error, 500);
  }
}
