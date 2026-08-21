import { NextRequest, NextResponse } from 'next/server';
import { readString } from '@/lib/api-utils/http';
import { createServerSupabase } from '@/lib/supabase/server';
import { generateJson, requireGeminiKey } from '@/server/ai/aiClient';
import { enforceRateLimit, RateLimitError } from '@/server/ai/gateway';
import {
  findOrCreateSubject,
  findOrCreateTopic,
  findOrCreateTask,
  insertTaskProgress,
  enrollChildInSubject,
  enrollChildInTopic,
  syncActivities,
} from '@/server/ai/aiDb';
import type { MergeAction } from '@/server/ai/aiDb';
import { buildDirectorPrompt } from '@/server/ai/agents/directorAgent';
import { buildSmePrompt } from '@/server/ai/agents/smeAgent';
import { logger } from '@/server/logger';

interface ActionSummary { created: number; merged: number; unchanged: number; }
function emptySummary(): ActionSummary { return { created: 0, merged: 0, unchanged: 0 }; }
function tally(s: ActionSummary, a: MergeAction) { s[a]++; }

function extractJson(text: string) {
  let clean = text;
  if (clean.includes('```json')) {
    clean = clean.split('```json')[1].split('```')[0];
  } else if (clean.includes('```')) {
    const parts = clean.split('```');
    if (parts.length >= 3) clean = parts[1];
  }
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response.');
  
  try {
    return JSON.parse(match[0]);
  } catch (err) {
    let str = match[0];
    while (str.lastIndexOf('}') > 0) {
      try { return JSON.parse(str); } 
      catch (e) {
        str = str.substring(0, str.lastIndexOf('}'));
        const nextBrace = str.lastIndexOf('}');
        if (nextBrace === -1) break;
        str = str.substring(0, nextBrace + 1);
      }
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  requireGeminiKey();
  
  const body = await req.json();
  const sourceText    = readString(body?.sourceText, 'sourceText');
  const age           = Number(body?.age)           || 10;
  const topicsCount   = Number(body?.topicsCount)   || 5;
  const tasksPerTopic = Number(body?.tasksPerTopic) || 3;
  const childId       = body?.childId ? String(body.childId) : null;
  const skillLevel    = body?.skillLevel ? String(body.skillLevel) : 'Beginner';
  const targetGrade   = body?.targetGrade ? String(body.targetGrade) : null;
  const isGlobal      = body?.isGlobal === true;

  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const ctx = { supabase, userId: user.id };
  try {
    await enforceRateLimit(ctx);
  } catch (err) {
    if (err instanceof RateLimitError) return new NextResponse(err.message, { status: 429 });
    return new NextResponse('Rate limit check failed', { status: 500 });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (data: any) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Run the generation asynchronously
  (async () => {
    try {
      logger.info(`[generateSyllabus] Starting multi-agent generation for ${topicsCount} topics.`);
      
      // STEP 1: Director Agent
      await sendEvent({ status: 'planning', message: 'Director Agent: Planning high-level curriculum structure...' });
      const directorPrompt = buildDirectorPrompt({ sourceText, age, skillLevel, targetGrade, topicsCount });
      const directorRaw = await generateJson(directorPrompt, { ctx, operation: 'generate_syllabus' });
      const directorData = extractJson(directorRaw);

      const subjectSummary = emptySummary();
      const topicSummary   = emptySummary();
      const taskSummary    = emptySummary();

      // Save Subject
      const subjectResult = await findOrCreateSubject(supabase, {
        name: directorData.subject.name,
        description: directorData.subject.description,
        childId,
        userId: user.id,
        is_global: isGlobal,
        developmentDomain: directorData.subject.development_domain,
      });
      tally(subjectSummary, subjectResult.action);
      const subjectId = subjectResult.id;
      if (childId) await enrollChildInSubject(supabase, childId, subjectId);

      const allTopics = directorData.topics;
      
      // STEP 2: Divide and chunk topics (User requested 4-5 parts if topics count is large)
      // E.g., if 50 topics, 5 chunks of 10. If 10 topics, maybe 2 chunks of 5.
      // Let's divide into 5 chunks max, or chunk size of ~3-5.
      const maxChunks = 5;
      const chunkSize = Math.max(Math.ceil(allTopics.length / maxChunks), 2); 
      
      const topicChunks = [];
      for (let i = 0; i < allTopics.length; i += chunkSize) {
        topicChunks.push(allTopics.slice(i, i + chunkSize));
      }

      await sendEvent({ status: 'chunking', message: `Dividing ${allTopics.length} topics into ${topicChunks.length} parallel batches...` });

      // STEP 3: SME Agent (Parallel execution for each chunk)
      let topicsProcessed = 0;
      const chunkPromises = topicChunks.map(async (chunk, chunkIndex) => {
        await sendEvent({ status: 'writing', message: `SME Agent: Writing detailed lessons for batch ${chunkIndex + 1}/${topicChunks.length}...` });
        
        const smePrompt = buildSmePrompt({ topics: chunk, age, skillLevel, tasksPerTopic });
        const smeRaw = await generateJson(smePrompt, { ctx, operation: 'generate_syllabus' });
        const smeData = extractJson(smeRaw);
        
        // Save each topic in this chunk
        for (const t of smeData.topics) {
          // Find original director topic for additional fields
          const directorTopic = chunk.find((dt: any) => dt.title === t.title) || chunk[0];
          
          const topicResult = await findOrCreateTopic(supabase, {
            subjectId, 
            title: t.title, 
            description: directorTopic.description || t.description || '',
            difficultyLevel: directorTopic.difficulty_level || 'Beginner', 
            ageGroup: String(age),
            orderIndex: topicsProcessed++, 
            learningObjectives: directorTopic.learning_objectives || [],
            estimatedHours: directorTopic.estimated_hours || 1, 
            bloomLevel: directorTopic.bloom_level || 'Apply', 
            keywords: directorTopic.keywords || [],
          });
          tally(topicSummary, topicResult.action);
          if (childId) await enrollChildInTopic(supabase, childId, topicResult.id);

          let taskOrderIndex = 0;
          for (const task of (t.tasks || [])) {
            const taskResult = await findOrCreateTask(supabase, {
              topicId: topicResult.id, name: task.title, description: task.description,
              orderIndex: taskOrderIndex++, taskType: task.task_type, instructions: task.instructions,
              parentGuide: task.parent_guide, materialsNeeded: task.materials_needed,
              estimatedMinutes: task.estimated_minutes, learningObjective: task.learning_objective,
              assessmentCriteria: task.assessment_criteria, resources: task.resources,
            });
            tally(taskSummary, taskResult.action);

            if (taskResult.isNew && childId) await insertTaskProgress(supabase, { taskId: taskResult.id, childId });
            if (task.activities && task.activities.length > 0) await syncActivities(supabase, taskResult.id, task.activities);
          }
        }
      });

      await Promise.all(chunkPromises);

      const summary = { subjects: subjectSummary, topics: topicSummary, tasks: taskSummary };
      await sendEvent({ status: 'complete', subjectId, summary, message: 'Curriculum generated successfully!' });
      
    } catch (error: any) {
      logger.error({ err: error, message: error.message }, '[generateSyllabus] Error');
      await sendEvent({ status: 'error', message: error.message || 'An error occurred during generation' });
    } finally {
      await writer.close();
    }
  })();

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
