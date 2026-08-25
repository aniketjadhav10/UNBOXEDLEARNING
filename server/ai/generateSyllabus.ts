// ============================================================
// generateSyllabus — the Director → SME assembly that turns source text into a
// full curriculum draft (subject → topics → skills → prerequisites → objectives
// → tasks). Shared by the interactive generator route and the batch global
// library builder. Persistence lives in persistSyllabus.ts.
// ============================================================
import { generateJson } from './aiClient';
import type { GatewayCtx } from './gateway';
import { buildDirectorPrompt } from './agents/directorAgent';
import { buildSmePrompt } from './agents/smeAgent';
import type { SyllabusDraft } from './persistSyllabus';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Extract the first JSON object from a model response, trimming code fences and
 *  recovering from a truncated tail. */
export function extractJson(text: string): any {
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
      catch {
        str = str.substring(0, str.lastIndexOf('}'));
        const nextBrace = str.lastIndexOf('}');
        if (nextBrace === -1) break;
        str = str.substring(0, nextBrace + 1);
      }
    }
    throw err;
  }
}

export interface AssembleParams {
  sourceText: string;
  age: number;
  skillLevel: string;
  targetGrade: string | null;
  topicsCount: number;
  tasksPerTopic: number;
  interests: string[];
  ctx: GatewayCtx;
  /** optional progress callback (for SSE streaming) */
  onEvent?: (e: Record<string, unknown>) => Promise<void> | void;
}

/**
 * Run the Director agent (subject + topic outline) then the SME agents in
 * parallel (each topic → skill tree + tasks), and assemble the full draft.
 * Persists nothing — the caller decides (preview vs. save vs. global).
 */
export async function assembleSyllabusDraft(p: AssembleParams): Promise<SyllabusDraft> {
  const emit = async (e: Record<string, unknown>) => { await p.onEvent?.(e); };

  // STEP 1: Director — subject + topics
  await emit({ status: 'planning', message: 'Director Agent: planning curriculum structure…' });
  const directorRaw = await generateJson(
    buildDirectorPrompt({
      sourceText: p.sourceText, age: p.age, skillLevel: p.skillLevel,
      targetGrade: p.targetGrade, topicsCount: p.topicsCount, interests: p.interests,
    }),
    { ctx: p.ctx, operation: 'generate_syllabus' },
  );
  const directorData = extractJson(directorRaw);
  const allTopics: any[] = directorData.topics ?? [];

  // STEP 2: chunk topics for parallel SME expansion (max 5 batches)
  const maxChunks = 5;
  const chunkSize = Math.max(Math.ceil(allTopics.length / maxChunks), 2);
  const topicChunks: any[][] = [];
  for (let i = 0; i < allTopics.length; i += chunkSize) {
    topicChunks.push(allTopics.slice(i, i + chunkSize));
  }
  await emit({ status: 'chunking', message: `Expanding ${allTopics.length} topics in ${topicChunks.length} batches…` });

  // STEP 3: SME (parallel) — each topic → skills + tasks
  const chunkResults = await Promise.all(topicChunks.map(async (chunk, idx) => {
    await emit({ status: 'writing', message: `SME Agent: batch ${idx + 1}/${topicChunks.length}…` });
    const smeRaw = await generateJson(
      buildSmePrompt({ topics: chunk, age: p.age, skillLevel: p.skillLevel, tasksPerTopic: p.tasksPerTopic, interests: p.interests }),
      { ctx: p.ctx, operation: 'generate_syllabus' },
    );
    const smeData = extractJson(smeRaw);

    return (smeData.topics ?? []).map((t: any) => {
      const dt = chunk.find((d: any) => d.title === t.title) || chunk[0] || {};
      return {
        title: t.title,
        description: dt.description || t.description || '',
        difficulty_level: dt.difficulty_level || 'Beginner',
        age_group: String(p.age),
        learning_objectives: dt.learning_objectives || [],
        estimated_hours: dt.estimated_hours || 1,
        bloom_level: dt.bloom_level || 'Apply',
        keywords: dt.keywords || [],
        skills: (Array.isArray(t.skills) && t.skills.length > 0)
          ? t.skills
          : [{
              name: t.title,
              description: dt.description || t.description || '',
              level: 1,
              difficulty: dt.difficulty_level || 'Beginner',
              learning_objectives: dt.learning_objectives || [],
              prerequisites: [],
              tasks: t.tasks || [],
            }],
      };
    });
  }));

  return { subject: directorData.subject, topics: chunkResults.flat() };
}
