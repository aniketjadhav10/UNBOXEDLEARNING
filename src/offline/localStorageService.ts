import type { AiInboxItem, LearningTask, SyncQueueItem } from '../types';
import { dbPromise } from './db';

export async function saveTaskOffline(task: LearningTask) {
  const db = await dbPromise;
  await db.put('tasks', task);
}

export async function getOfflineTasks() {
  const db = await dbPromise;
  return db.getAll('tasks');
}

export async function saveAiInboxItem(item: AiInboxItem) {
  const db = await dbPromise;
  await db.put('aiInbox', item);
}

export async function getAiInboxItems() {
  const db = await dbPromise;
  return db.getAllFromIndex('aiInbox', 'by-created');
}

export async function enqueueSync(item: Omit<SyncQueueItem, 'id' | 'createdAt'>) {
  const db = await dbPromise;
  await db.put('syncQueue', {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
}

export async function getSyncQueue() {
  const db = await dbPromise;
  return db.getAllFromIndex('syncQueue', 'by-created');
}

export async function removeSyncQueueItem(id: string) {
  const db = await dbPromise;
  await db.delete('syncQueue', id);
}
