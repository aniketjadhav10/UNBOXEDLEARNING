import { openDB, type DBSchema } from 'idb';
import type { AiInboxItem, LearningTask, SyncQueueItem } from '../types';

interface HomeschoolDb extends DBSchema {
  tasks: {
    key: string;
    value: LearningTask;
    indexes: { 'by-topic': string };
  };
  aiInbox: {
    key: string;
    value: AiInboxItem;
    indexes: { 'by-created': string };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: { 'by-created': string };
  };
}

export const dbPromise = openDB<HomeschoolDb>('homeschool-manager', 1, {
  upgrade(db) {
    const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
    taskStore.createIndex('by-topic', 'topicId');

    const inboxStore = db.createObjectStore('aiInbox', { keyPath: 'id' });
    inboxStore.createIndex('by-created', 'createdAt');

    const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
    syncStore.createIndex('by-created', 'createdAt');
  },
});
