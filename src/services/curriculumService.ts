// ============================================================
// curriculumService.ts — CRUD + Enrollment for the new Library model
// Schema: subjects (global) + child_subjects/child_topics (enrollment)
// ============================================================
import { supabase } from './supabase';
import type {
  DbSubject,
  DbTopic,
  DbTask,
  DbActivity,
  DbChildSubject,
  DbChildTopic,
  DbTaskWithBreadcrumb,
  DbTopicWithBreadcrumb,
  EnrollmentSource,
} from '../types/database';

export type CurriculumLevel = 'subjects' | 'topics' | 'tasks' | 'activities' | 'children';

// ── Generic CRUD handlers ────────────────────────────────────

export async function createItem<T>(table: CurriculumLevel, payload: any): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data as T;
}

export async function updateItem<T>(table: CurriculumLevel, id: string, payload: any): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as T;
}

export async function deleteItem(table: CurriculumLevel, id: string): Promise<void> {
  // Use soft delete (is_active = false)
  const { error } = await supabase
    .from(table)
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

// ── Global Library Fetchers ──────────────────────────────────

/** Fetch ALL subjects from the global library (for browsing) */
export async function fetchAllSubjectsFromLibrary(): Promise<DbSubject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('is_active', true)
    .eq('is_global', true)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data as DbSubject[];
}

/** Fetch only subjects that a specific child is enrolled in */
export async function fetchSubjects(childId?: string): Promise<DbSubject[]> {
  if (!childId) {
    return fetchAllSubjectsFromLibrary();
  }

  const { data, error } = await supabase
    .from('child_subjects')
    .select(`
      subject_id,
      subjects (*)
    `)
    .eq('child_id', childId)
    .eq('is_active', true);

  if (error) throw error;
  return (data ?? []).map((row: any) => row.subjects as DbSubject).filter(Boolean);
}

export async function fetchSubjectById(id: string): Promise<DbSubject | null> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as DbSubject | null;
}

/** Fetch topics for a subject — optionally filtered to only those a child is enrolled in */
export async function fetchTopics(subjectId?: string, childId?: string): Promise<DbTopic[]> {
  if (childId) {
    // Return only topics this child is enrolled in (via child_topics)
    let query = supabase
      .from('child_topics')
      .select(`
        topic_id,
        topics (*)
      `)
      .eq('child_id', childId)
      .eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    let topics = (data ?? []).map((row: any) => row.topics as DbTopic).filter(Boolean);

    // Optionally filter by subject
    if (subjectId) {
      topics = topics.filter(t => t.subject_id === subjectId);
    }
    return topics.sort((a, b) => a.order_index - b.order_index);
  }

  // No child filter — return all topics for a subject (library browse mode)
  let query = supabase
    .from('topics')
    .select('*')
    .eq('is_active', true);
  if (subjectId) query = query.eq('subject_id', subjectId);

  const { data, error } = await query.order('order_index', { ascending: true });
  if (error) throw error;
  return data as DbTopic[];
}

export async function fetchTopicById(id: string): Promise<DbTopic | null> {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as DbTopic | null;
}

/** Fetch topics with their breadcrumb (subject name + color) — for cross-subject views */
export async function fetchTopicsWithBreadcrumb(childId: string): Promise<DbTopicWithBreadcrumb[]> {
  const { data, error } = await supabase
    .from('child_topics')
    .select(`
      topic_id,
      enrollment_source,
      custom_order,
      target_completion_date,
      topics (
        *,
        subjects ( id, name, color )
      )
    `)
    .eq('child_id', childId)
    .eq('is_active', true)
    .order('custom_order', { ascending: true });

  if (error) throw error;
  return (data ?? [])
    .map((row: any) => {
      const topic = row.topics as any;
      if (!topic) return null;
      return {
        ...topic,
        subject: topic.subjects,
      } as DbTopicWithBreadcrumb;
    })
    .filter((t): t is DbTopicWithBreadcrumb => t !== null);
}

export async function fetchTasksByTopic(topicId: string): Promise<DbTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('topic_id', topicId)
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data as DbTask[];
}

export async function fetchTaskById(id: string): Promise<DbTask | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as DbTask | null;
}

/** Fetch a task with its full breadcrumb: subject > topic > task */
export async function fetchTaskWithBreadcrumb(taskId: string): Promise<DbTaskWithBreadcrumb | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      topics (
        id, title,
        subjects ( id, name, color )
      )
    `)
    .eq('id', taskId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return {
    ...(data as any),
    topic: {
      ...(data as any).topics,
      subject: (data as any).topics?.subjects,
    },
  } as DbTaskWithBreadcrumb;
}

export async function fetchActivitiesByTask(taskId: string): Promise<DbActivity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('task_id', taskId)
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data as DbActivity[];
}

// ── Enrollment Functions ─────────────────────────────────────

/** Enroll a child in a full subject. Auto-enrolls them in ALL topics in that subject. */
export async function enrollInSubject(childId: string, subjectId: string): Promise<void> {
  // 1. Create child_subjects row
  const { error: subjectError } = await supabase
    .from('child_subjects')
    .upsert({ child_id: childId, subject_id: subjectId, is_active: true }, { onConflict: 'child_id,subject_id' });
  if (subjectError) throw subjectError;

  // 2. Fetch all topics in this subject
  const topics = await fetchTopics(subjectId);

  // 3. Enroll in each topic with source = 'subject'
  if (topics.length > 0) {
    const { error: topicsError } = await supabase
      .from('child_topics')
      .upsert(
        topics.map(t => ({
          child_id: childId,
          topic_id: t.id,
          enrollment_source: 'subject' as EnrollmentSource,
          is_active: true,
        })),
        { onConflict: 'child_id,topic_id' }
      );
    if (topicsError) throw topicsError;

    // 4. Enroll in all tasks for these topics
    const topicIds = topics.map(t => t.id);
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id')
      .in('topic_id', topicIds)
      .eq('is_active', true);

    if (tasks && tasks.length > 0) {
      const taskProgressData = tasks.map(t => ({
        task_id: t.id,
        child_id: childId,
        learning_stage: 'Not_Started' as const,
        learned_count: 0,
        target_count: 5,
        repeat_interval: 1,
        is_active: true,
        is_scheduled_this_week: false
      }));

      const { error: tasksError } = await supabase
        .from('task_progress')
        .upsert(taskProgressData, { onConflict: 'child_id,task_id' });

      if (tasksError) throw tasksError;
    }
  }
}

/** Enroll a child in a single topic (cherry-pick). */
export async function enrollInTopic(
  childId: string,
  topicId: string,
  source: EnrollmentSource = 'manual'
): Promise<void> {
  const { error } = await supabase
    .from('child_topics')
    .upsert(
      { child_id: childId, topic_id: topicId, enrollment_source: source, is_active: true },
      { onConflict: 'child_id,topic_id' }
    );
  if (error) throw error;

  // Enroll in all tasks for this topic
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('topic_id', topicId)
    .eq('is_active', true);

  if (tasks && tasks.length > 0) {
    const taskProgressData = tasks.map(t => ({
      task_id: t.id,
      child_id: childId,
      learning_stage: 'Not_Started' as const,
      learned_count: 0,
      target_count: 5,
      repeat_interval: 1,
      is_active: true,
      is_scheduled_this_week: false
    }));

    const { error: tasksError } = await supabase
      .from('task_progress')
      .upsert(taskProgressData, { onConflict: 'child_id,task_id' });

    if (tasksError) throw tasksError;
  }
}

/** Unenroll a child from a single topic (deletes the row). */
export async function unenrollFromTopic(childId: string, topicId: string): Promise<void> {
  const { error } = await supabase
    .from('child_topics')
    .delete()
    .eq('child_id', childId)
    .eq('topic_id', topicId);
  if (error) throw error;
}

/** Unenroll a child from a full subject and all its topics. */
export async function unenrollFromSubject(childId: string, subjectId: string): Promise<void> {
  // 1. Delete subject enrollment
  await supabase.from('child_subjects').delete().eq('child_id', childId).eq('subject_id', subjectId);

  // 2. Fetch all topics of this subject
  const topics = await fetchTopics(subjectId);
  const topicIds = topics.map(t => t.id);

  // 3. Delete all child_topics rows for this subject's topics
  if (topicIds.length > 0) {
    await supabase.from('child_topics').delete().eq('child_id', childId).in('topic_id', topicIds);
  }
}

/** Check if a child is enrolled in a subject */
export async function isEnrolledInSubject(childId: string, subjectId: string): Promise<boolean> {
  const { data } = await supabase
    .from('child_subjects')
    .select('id')
    .eq('child_id', childId)
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .single();
  return !!data;
}

/** Create a new subject in the global library and auto-enroll a child in it */
export async function createSubjectAndEnroll(
  payload: { name: string; description?: string; color?: string; subject_type?: string },
  childId: string
): Promise<DbSubject> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('subjects')
    .insert({
      name: payload.name,
      description: payload.description ?? null,
      color: payload.color ?? '#8b5cf6',
      subject_type: payload.subject_type ?? 'core',
      is_global: false,
      created_by: user.id,
      is_active: true,
    })
    .select('*')
    .single();
  if (error) throw error;

  const subject = data as DbSubject;

  // Auto-enroll the child in this new subject
  await enrollInSubject(childId, subject.id);

  return subject;
}

// ── Stats ────────────────────────────────────────────────────

export async function getTopicStats(topicId: string) {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('topic_id', topicId)
    .eq('is_active', true);

  if (error) return { count: 0 };
  return { count: tasks.length };
}

export async function getTaskProgress(taskId: string, childId: string) {
  const { data, error } = await supabase
    .from('task_progress')
    .select('*')
    .eq('task_id', taskId)
    .eq('child_id', childId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
