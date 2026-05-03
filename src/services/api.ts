import type { LearningTask, Lesson } from '../types';
import { supabase } from './supabase';

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? 'Request failed');
  }

  return body as T;
}

export const api = {
  generateLesson(topic: string) {
    return request<{ lesson: Lesson }>('/api/ai/generateLesson', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    });
  },

  createTask(task: Omit<LearningTask, 'id' | 'updatedAt'>) {
    return request<{ task: LearningTask }>('/api/tasks/create', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  updateTask(task: Partial<LearningTask> & { id: string }) {
    return request<{ task: LearningTask }>('/api/tasks/update', {
      method: 'PATCH',
      body: JSON.stringify(task),
    });
  },

  completeTask(id: string) {
    return request<{ task: LearningTask }>('/api/tasks/complete', {
      method: 'PATCH',
      body: JSON.stringify({ id }),
    });
  },
};
