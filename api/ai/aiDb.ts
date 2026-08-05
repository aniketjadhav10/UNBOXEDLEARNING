/**
 * Reusable Supabase database helpers shared across all AI generation routes.
 *
 * Each function implements the following pipeline:
 *   1. Vector-similarity search (Supabase RPC)
 *   2. Exact name / title fallback
 *   3. Smart merge  — if record found, patch only null/empty fields (non-destructive)
 *   4. Insert       — if no record found, create a new one
 *
 * Every function returns a `MergeResult` that tells callers (and the response
 * payload) exactly what happened: 'created' | 'merged' | 'unchanged'.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getEmbedding, SIMILARITY_THRESHOLD } from './aiClient';

// ---------------------------------------------------------------------------
// Shared result type
// ---------------------------------------------------------------------------
export type MergeAction = 'created' | 'merged' | 'unchanged';

export interface MergeResult {
  id: string;
  action: MergeAction;
}

export interface TaskMergeResult extends MergeResult {
  /** true only when a brand-new DB row was inserted */
  isNew: boolean;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------
export interface SubjectInput {
  name: string;
  description: string;
  childId: string | null;
  userId: string;
  ageGroup?: string;
}

export interface TopicInput {
  subjectId: string;
  title: string;
  description: string;
  difficultyLevel: string;
  ageGroup: string;
  orderIndex: number;
  learningObjectives?: string[];
  estimatedHours?: number;
  bloomLevel?: string;
  keywords?: string[];
}

export interface TaskInput {
  topicId: string;
  name: string;
  description: string;
  orderIndex: number;
  taskType?: string;
  instructions?: string;
  parentGuide?: string;
  materialsNeeded?: string[];
  estimatedMinutes?: number;
  learningObjective?: string;
  assessmentCriteria?: string;
  resources?: Array<{ type: string; url: string; title: string }>;
}

export interface ProgressInput {
  taskId: string;
  childId: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Return only the keys whose incoming value is non-empty and whose stored value is null/empty. */
function buildPatch(
  stored: Record<string, unknown>,
  incoming: Record<string, unknown>,
  fields: string[],
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const field of fields) {
    const storedVal = stored[field];
    const incomingVal = incoming[field];
    const storedEmpty = storedVal === null || storedVal === undefined || storedVal === '';
    const incomingFilled = incomingVal !== null && incomingVal !== undefined && incomingVal !== '';
    if (storedEmpty && incomingFilled) {
      patch[field] = incomingVal;
    }
  }
  return patch;
}

/** Apply a patch object to a Supabase table row. Returns true if anything was updated. */
async function applyPatch(
  supabase: SupabaseClient,
  table: string,
  id: string,
  patch: Record<string, unknown>,
  label: string,
): Promise<boolean> {
  if (Object.keys(patch).length === 0) return false;
  const { error } = await supabase.from(table).update(patch).eq('id', id);
  if (error) {
    console.warn(`[${label}] Patch failed for id=${id}:`, error.message);
    return false;
  }
  console.log(`[${label}] Merged fields [${Object.keys(patch).join(', ')}] into id=${id}`);
  return true;
}

// ---------------------------------------------------------------------------
// Subject
// ---------------------------------------------------------------------------
/**
 * Find an existing subject by vector similarity (or exact name fallback).
 * If found, enrich any null/empty fields with the incoming AI data (smart merge).
 * If not found, insert a new record.
 */
export async function findOrCreateSubject(
  supabase: SupabaseClient,
  input: SubjectInput,
): Promise<MergeResult> {
  const text = `${input.name} ${input.description || ''}`.trim();
  const embedding = await getEmbedding(text);

  // ── 1. Vector similarity search ─────────────────────────────
  if (embedding) {
    const { data: matches, error } = await supabase.rpc('match_subjects', {
      query_embedding: embedding,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: 1,
    });
    if (error) console.warn('[findOrCreateSubject] RPC error:', error.message);

    if (matches && matches.length > 0) {
      const id = matches[0].id as string;
      console.log(`[findOrCreateSubject] Vector match: "${matches[0].name}" (id: ${id})`);
      return mergeSubject(supabase, id, input, embedding);
    }
  }

  // ── 2. Exact name fallback ───────────────────────────────────
  const { data: exact } = await supabase
    .from('subjects')
    .select('id, description, embedding')
    .ilike('name', input.name)
    .maybeSingle();
  if (exact) {
    console.log(`[findOrCreateSubject] Exact match: "${input.name}" (id: ${exact.id})`);
    return mergeSubject(supabase, exact.id as string, input, embedding, exact as Record<string, unknown>);
  }

  // ── 3. Insert new subject ────────────────────────────────────
  console.log(`[findOrCreateSubject] Inserting new subject: "${input.name}"`);
  const { data: inserted, error: insertErr } = await supabase
    .from('subjects')
    .insert({
      name: input.name,
      description: input.description,
      color: 'violet',
      created_by: input.userId,
      is_global: false,
      is_active: true,
      embedding,
    })
    .select()
    .single();
  if (insertErr) throw insertErr;
  return { id: inserted.id as string, action: 'created' };
}

async function mergeSubject(
  supabase: SupabaseClient,
  id: string,
  input: SubjectInput,
  embedding: number[] | null,
  storedRow?: Record<string, unknown>,
): Promise<MergeResult> {
  // Fetch full row if not already provided
  const row = storedRow ?? await fetchRow(supabase, 'subjects', id, ['description', 'embedding']);
  if (!row) return { id, action: 'unchanged' };

  const patch = buildPatch(row, { description: input.description, embedding }, ['description', 'embedding']);
  const patched = await applyPatch(supabase, 'subjects', id, patch, 'findOrCreateSubject');
  return { id, action: patched ? 'merged' : 'unchanged' };
}

// ---------------------------------------------------------------------------
// Topic
// ---------------------------------------------------------------------------
/**
 * Find an existing topic under the given subject by vector similarity (or
 * exact title fallback). Enrich null/empty fields on match. Insert if not found.
 */
export async function findOrCreateTopic(
  supabase: SupabaseClient,
  input: TopicInput,
): Promise<MergeResult> {
  const text = `${input.title} ${input.description || ''}`.trim();
  const embedding = await getEmbedding(text);

  // ── 1. Vector similarity search ─────────────────────────────
  if (embedding) {
    const { data: matches, error } = await supabase.rpc('match_topics', {
      query_embedding: embedding,
      subject_id_filter: input.subjectId,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: 1,
    });
    if (error) console.warn('[findOrCreateTopic] RPC error:', error.message);

    if (matches && matches.length > 0) {
      const id = matches[0].id as string;
      console.log(`[findOrCreateTopic] Vector match: "${matches[0].title}" (id: ${id})`);
      return mergeTopic(supabase, id, input, embedding);
    }
  }

  // ── 2. Exact title fallback ──────────────────────────────────
  const { data: exact } = await supabase
    .from('topics')
    .select('id, description, difficulty_level, age_group, embedding')
    .eq('subject_id', input.subjectId)
    .ilike('title', input.title)
    .maybeSingle();
  if (exact) {
    console.log(`[findOrCreateTopic] Exact match: "${input.title}" (id: ${exact.id})`);
    return mergeTopic(supabase, exact.id as string, input, embedding, exact as Record<string, unknown>);
  }

  // ── 3. Insert new topic ──────────────────────────────────────
  console.log(`[findOrCreateTopic] Inserting new topic: "${input.title}"`);
  const { data: inserted, error: insertErr } = await supabase
    .from('topics')
    .insert({
      subject_id: input.subjectId,
      title: input.title,
      description: input.description,
      difficulty_level: input.difficultyLevel || 'Beginner',
      age_group: input.ageGroup,
      order_index: input.orderIndex,
      learning_objectives: input.learningObjectives ?? null,
      estimated_hours: input.estimatedHours ?? null,
      bloom_level: input.bloomLevel ?? null,
      keywords: input.keywords ?? null,
      embedding,
    })
    .select()
    .single();
  if (insertErr) throw insertErr;
  return { id: inserted.id as string, action: 'created' };
}

async function mergeTopic(
  supabase: SupabaseClient,
  id: string,
  input: TopicInput,
  embedding: number[] | null,
  storedRow?: Record<string, unknown>,
): Promise<MergeResult> {
  const row = storedRow ?? await fetchRow(supabase, 'topics', id, ['description', 'difficulty_level', 'age_group', 'learning_objectives', 'estimated_hours', 'bloom_level', 'keywords', 'embedding']);
  if (!row) return { id, action: 'unchanged' };

  const patch = buildPatch(row, {
    description: input.description,
    difficulty_level: input.difficultyLevel,
    age_group: input.ageGroup,
    learning_objectives: input.learningObjectives,
    estimated_hours: input.estimatedHours,
    bloom_level: input.bloomLevel,
    keywords: input.keywords,
    embedding,
  }, ['description', 'difficulty_level', 'age_group', 'learning_objectives', 'estimated_hours', 'bloom_level', 'keywords', 'embedding']);

  const patched = await applyPatch(supabase, 'topics', id, patch, 'findOrCreateTopic');
  return { id, action: patched ? 'merged' : 'unchanged' };
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------
/**
 * Find an existing task under the given topic by vector similarity (or exact
 * name fallback). Enrich null/empty fields on match. Insert if not found.
 * Returns `isNew: true` only when a brand-new row was inserted.
 */
export async function findOrCreateTask(
  supabase: SupabaseClient,
  input: TaskInput,
): Promise<TaskMergeResult> {
  const text = `${input.name} ${input.description || ''}`.trim();
  const embedding = await getEmbedding(text);

  // ── 1. Vector similarity search ─────────────────────────────
  if (embedding) {
    const { data: matches, error } = await supabase.rpc('match_tasks', {
      query_embedding: embedding,
      topic_id_filter: input.topicId,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: 1,
    });
    if (error) console.warn('[findOrCreateTask] RPC error:', error.message);

    if (matches && matches.length > 0) {
      const id = matches[0].id as string;
      console.log(`[findOrCreateTask] Vector match: "${matches[0].name}" (id: ${id})`);
      const result = await mergeTask(supabase, id, input, embedding);
      return { ...result, isNew: false };
    }
  }

  // ── 2. Exact name fallback ───────────────────────────────────
  const { data: exact } = await supabase
    .from('tasks')
    .select('id, description, embedding')
    .eq('topic_id', input.topicId)
    .ilike('name', input.name)
    .maybeSingle();
  if (exact) {
    console.log(`[findOrCreateTask] Exact match: "${input.name}" (id: ${exact.id})`);
    const result = await mergeTask(supabase, exact.id as string, input, embedding, exact as Record<string, unknown>);
    return { ...result, isNew: false };
  }

  // ── 3. Insert new task ───────────────────────────────────────
  console.log(`[findOrCreateTask] Inserting new task: "${input.name}"`);
  const { data: inserted, error: insertErr } = await supabase
    .from('tasks')
    .insert({
      topic_id: input.topicId,
      name: input.name,
      description: input.description,
      source_type: 'ai_generated',
      order_index: input.orderIndex,
      task_type: input.taskType ?? 'lesson',
      instructions: input.instructions ?? null,
      parent_guide: input.parentGuide ?? null,
      materials_needed: input.materialsNeeded ?? null,
      estimated_minutes: input.estimatedMinutes ?? null,
      learning_objective: input.learningObjective ?? null,
      assessment_criteria: input.assessmentCriteria ?? null,
      resources: input.resources ?? null,
      embedding,
    })
    .select()
    .single();
  if (insertErr) throw insertErr;
  return { id: inserted.id as string, action: 'created', isNew: true };
}

async function mergeTask(
  supabase: SupabaseClient,
  id: string,
  input: TaskInput,
  embedding: number[] | null,
  storedRow?: Record<string, unknown>,
): Promise<MergeResult> {
  const row = storedRow ?? await fetchRow(supabase, 'tasks', id, ['description', 'task_type', 'instructions', 'parent_guide', 'materials_needed', 'estimated_minutes', 'learning_objective', 'assessment_criteria', 'resources', 'embedding']);
  if (!row) return { id, action: 'unchanged' };

  const patch = buildPatch(row, {
    description: input.description,
    task_type: input.taskType,
    instructions: input.instructions,
    parent_guide: input.parentGuide,
    materials_needed: input.materialsNeeded,
    estimated_minutes: input.estimatedMinutes,
    learning_objective: input.learningObjective,
    assessment_criteria: input.assessmentCriteria,
    resources: input.resources,
    embedding
  }, ['description', 'task_type', 'instructions', 'parent_guide', 'materials_needed', 'estimated_minutes', 'learning_objective', 'assessment_criteria', 'resources', 'embedding']);
  const patched = await applyPatch(supabase, 'tasks', id, patch, 'findOrCreateTask');
  return { id, action: patched ? 'merged' : 'unchanged' };
}

// ---------------------------------------------------------------------------
// Task Progress & Enrollment
// ---------------------------------------------------------------------------
export async function enrollChildInSubject(
  supabase: SupabaseClient,
  childId: string,
  subjectId: string,
): Promise<void> {
  const { error } = await supabase.from('child_subjects').upsert(
    { child_id: childId, subject_id: subjectId, is_active: true },
    { onConflict: 'child_id, subject_id' }
  );
  if (error) console.error(`[enrollChildInSubject] Failed for subject ${subjectId}:`, error.message);
}

export async function enrollChildInTopic(
  supabase: SupabaseClient,
  childId: string,
  topicId: string,
): Promise<void> {
  const { error } = await supabase.from('child_topics').upsert(
    { child_id: childId, topic_id: topicId, enrollment_source: 'manual', is_active: true },
    { onConflict: 'child_id, topic_id' }
  );
  if (error) console.error(`[enrollChildInTopic] Failed for topic ${topicId}:`, error.message);
}
/**
 * Insert a task_progress row for a child. Logs but does not throw on error
 * so that a missing progress row never blocks the whole generation flow.
 */
export async function insertTaskProgress(
  supabase: SupabaseClient,
  input: ProgressInput,
): Promise<void> {
  const { error } = await supabase.from('task_progress').insert({
    task_id: input.taskId,
    child_id: input.childId,
    learning_stage: 'Not_Started',
    interest_level: 3,
  });
  if (error) {
    console.error(`[insertTaskProgress] Failed for task ${input.taskId}:`, error.message);
  }
}

// ---------------------------------------------------------------------------
// Private utilities
// ---------------------------------------------------------------------------
async function fetchRow(
  supabase: SupabaseClient,
  table: string,
  id: string,
  fields: string[],
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from(table)
    .select(fields.join(', '))
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.warn(`[fetchRow] Failed to fetch ${table} id=${id}:`, error.message);
    return null;
  }
  return data as Record<string, unknown> | null;
}
