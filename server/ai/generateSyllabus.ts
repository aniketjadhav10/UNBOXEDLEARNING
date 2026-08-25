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
import { checkExistingSubject, checkExistingTopic } from './aiDb';
import { logger } from '../logger';

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

interface ExpandTopicsParams {
  topics: any[]; // {title, description, difficulty_level, age_group, learning_objectives, estimated_hours, bloom_level, keywords}
  age: number;
  skillLevel: string;
  tasksPerTopic: number;
  interests: string[];
  ctx: GatewayCtx;
  onEvent?: (e: Record<string, unknown>) => Promise<void> | void;
  /** ai_usage operation string for the SME calls — defaults to 'generate_syllabus'. */
  operation?: string;
}

/**
 * Chunk a topic outline into ≤5 batches and expand each in parallel via the
 * SME agent (topic → skill tree + tasks), merging the result back onto each
 * topic's Director-provided (or synthesized) metadata. Shared by the
 * Director-driven path and the explicit-topic-list path below.
 */
async function expandTopicsWithSme(p: ExpandTopicsParams): Promise<any[]> {
  const emit = async (e: Record<string, unknown>) => { await p.onEvent?.(e); };
  const allTopics = p.topics;
  const operation = p.operation ?? 'generate_syllabus';

  const maxChunks = 5;
  const chunkSize = Math.max(Math.ceil(allTopics.length / maxChunks), 2);
  const topicChunks: any[][] = [];
  for (let i = 0; i < allTopics.length; i += chunkSize) {
    topicChunks.push(allTopics.slice(i, i + chunkSize));
  }
  await emit({ status: 'chunking', message: `Expanding ${allTopics.length} topics in ${topicChunks.length} batches…` });

  const chunkResults = await Promise.all(topicChunks.map(async (chunk, idx) => {
    await emit({ status: 'writing', message: `SME Agent: batch ${idx + 1}/${topicChunks.length}…` });
    const smeRaw = await generateJson(
      buildSmePrompt({ topics: chunk, age: p.age, skillLevel: p.skillLevel, tasksPerTopic: p.tasksPerTopic, interests: p.interests }),
      { ctx: p.ctx, operation },
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

  return chunkResults.flat();
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

  // STEP 2+3: chunk + SME expansion (shared with the explicit-topic-list path)
  const topics = await expandTopicsWithSme({
    topics: allTopics, age: p.age, skillLevel: p.skillLevel, tasksPerTopic: p.tasksPerTopic,
    interests: p.interests, ctx: p.ctx, onEvent: p.onEvent,
  });

  return { subject: directorData.subject, topics };
}

export interface AssembleFromTopicListParams {
  subjectName: string;
  subjectDescription: string;
  developmentDomain: string;
  topicTitles: string[];
  age: number;
  skillLevel: string;
  tasksPerTopic: number;
  interests: string[];
  ctx: GatewayCtx;
  onEvent?: (e: Record<string, unknown>) => Promise<void> | void;
}

/**
 * Skip the Director agent entirely — the caller supplies the subject and the
 * exact topic list. Before generating anything, checks the given subject and
 * each given topic against what already exists (same vector-similarity
 * matching as the persist-time dedup) so AI generation only runs for what's
 * actually missing. Each remaining topic is expanded 1:1 by the SME agent
 * (which already guarantees title fidelity) — never renamed, merged,
 * dropped, or added.
 */
export async function assembleSyllabusFromTopicList(
  p: AssembleFromTopicListParams,
): Promise<SyllabusDraft & { skippedExisting: string[] }> {
  const emit = async (e: Record<string, unknown>) => { await p.onEvent?.(e); };

  await emit({ status: 'checking', message: 'Checking for existing subject and topics…' });

  const existingSubject = await checkExistingSubject(p.ctx.supabase, p.subjectName, p.subjectDescription);

  // Only compare topics if the subject itself already exists — a brand-new
  // subject can't have any existing topics to match against.
  let missingTitles = p.topicTitles;
  let skippedExisting: string[] = [];
  if (existingSubject) {
    const results = await Promise.all(
      p.topicTitles.map(async (title) => ({
        title,
        match: await checkExistingTopic(p.ctx.supabase, existingSubject.id, title),
      })),
    );
    missingTitles = results.filter((r) => !r.match).map((r) => r.title);
    skippedExisting = results.filter((r) => r.match).map((r) => r.title);
  }

  if (skippedExisting.length > 0) {
    await emit({
      status: 'checking',
      message: `${skippedExisting.length} of ${p.topicTitles.length} topics already exist and will be skipped.`,
    });
  }

  const subject = existingSubject
    ? {
        name: existingSubject.name,
        description: existingSubject.description ?? '',
        development_domain: existingSubject.development_domain ?? p.developmentDomain,
      }
    : { name: p.subjectName, description: p.subjectDescription, development_domain: p.developmentDomain };

  if (missingTitles.length === 0) {
    return { subject, topics: [], skippedExisting };
  }

  const seedTopics = missingTitles.map((title) => ({
    title,
    description: '',
    difficulty_level: 'Beginner',
    age_group: String(p.age),
    learning_objectives: [],
    estimated_hours: 1,
    bloom_level: 'Understand',
    keywords: [],
  }));

  const topics = await expandTopicsWithSme({
    topics: seedTopics, age: p.age, skillLevel: p.skillLevel, tasksPerTopic: p.tasksPerTopic,
    interests: p.interests, ctx: p.ctx, onEvent: p.onEvent, operation: 'generate_syllabus_topics',
  });

  // Fidelity check on the topics that WERE sent to SME (independent of the
  // existing-content skip above) — SME's title-preservation is a prompted
  // instruction, not a hard guarantee, so log (don't fail) if it drops one.
  const gotTitles = new Set(topics.map((t) => t.title));
  const missingAfterSme = missingTitles.filter((t) => !gotTitles.has(t));
  if (missingAfterSme.length > 0) {
    logger.warn(`[assembleSyllabusFromTopicList] SME dropped ${missingAfterSme.length} topic(s): ${missingAfterSme.join(', ')}`);
  }

  return { subject, topics, skippedExisting };
}
