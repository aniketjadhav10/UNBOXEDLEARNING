import type { LearningTask, TaskStatus } from '../../types';

type TaskRow = Record<string, unknown>;
type ProgressRow = Record<string, unknown> | null | undefined;

const completedStages = new Set(['Comfortable', 'Confident']);

export function createTaskFromBody(body: Record<string, unknown>) {
  const title = readRequired(body.title ?? body.name, 'title');
  const topicId = readRequired(body.topicId ?? body.topic_id, 'topicId');

  return {
    id: crypto.randomUUID(),
    topicId,
    name: title,
    description: readOptional(body.notes ?? body.description),
    difficultyLevel: readOptional(body.difficultyLevel ?? body.difficulty_level),
    ageGroup: readOptional(body.ageGroup ?? body.age_group),
    sourceType: readOptional(body.sourceType ?? body.source_type) ?? 'manual',
    orderIndex: readNumber(body.orderIndex ?? body.order_index) ?? 0,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
  };
}

export function updateTaskFromBody(body: Record<string, unknown>) {
  const id = readRequired(body.id, 'id');

  return {
    id,
    topicId: readOptional(body.topicId ?? body.topic_id),
    name: readOptional(body.title ?? body.name),
    description: readOptional(body.notes ?? body.description),
    difficultyLevel: readOptional(body.difficultyLevel ?? body.difficulty_level),
    ageGroup: readOptional(body.ageGroup ?? body.age_group),
    sourceType: readOptional(body.sourceType ?? body.source_type),
    orderIndex: readNumber(body.orderIndex ?? body.order_index),
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
  };
}

export function taskInsertPayload(task: ReturnType<typeof createTaskFromBody>) {
  return {
    id: task.id,
    topic_id: task.topicId,
    name: task.name,
    description: task.description,
    difficulty_level: task.difficultyLevel,
    age_group: task.ageGroup,
    source_type: task.sourceType,
    order_index: task.orderIndex,
    is_active: task.isActive,
  };
}

export function taskUpdatePayload(task: ReturnType<typeof updateTaskFromBody>) {
  return stripUndefined({
    topic_id: task.topicId,
    name: task.name,
    description: task.description,
    difficulty_level: task.difficultyLevel,
    age_group: task.ageGroup,
    source_type: task.sourceType,
    order_index: task.orderIndex,
    is_active: task.isActive,
  });
}

export function taskFromRow(row: TaskRow, progress?: ProgressRow): LearningTask {
  return {
    id: String(row.id),
    topicId: String(row.topic_id),
    title: String(row.name),
    notes: typeof row.description === 'string' ? row.description : undefined,
    status: statusFromProgress(progress),
    updatedAt: String(row.updated_at),
  };
}

export function statusFromProgress(progress?: ProgressRow): TaskStatus {
  const stage = typeof progress?.learning_stage === 'string' ? progress.learning_stage : 'Not_Started';

  if (completedStages.has(stage)) return 'completed';
  if (stage === 'Not_Started') return 'not_started';
  return 'in_progress';
}

export function readRequired(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }

  return value.trim();
}

function readOptional(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stripUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}
