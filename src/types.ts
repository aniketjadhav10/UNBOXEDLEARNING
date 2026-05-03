export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export interface Child {
  id: string;
  name: string;
  gradeLevel: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  childId: string;
  name: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
}

export interface LearningTask {
  id: string;
  topicId: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  dueDate?: string;
  updatedAt: string;
}

export interface Lesson {
  title: string;
  summary: string;
  objectives: string[];
  activities: string[];
  assessment: string;
}

export interface AiInboxItem {
  id: string;
  topic: string;
  lesson: Lesson;
  createdAt: string;
  saved: boolean;
}

export interface SyncQueueItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH';
  payload: unknown;
  createdAt: string;
}
