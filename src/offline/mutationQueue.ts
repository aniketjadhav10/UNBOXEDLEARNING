// src/offline/mutationQueue.ts — IndexedDB-backed queue for the one write that
// realistically happens while offline: marking a task as practiced today.
// Queued while offline, drained (in order) the moment the browser reconnects.
import { openDB, type DBSchema } from 'idb';

export interface QueuedMarkPracticed {
  id: string;
  taskId: string;
  taskName: string;
  updates: {
    learned_count: number;
    learning_stage?: string;
    next_due_at?: string | null;
  };
  createdAt: string;
}

interface MutationQueueDb extends DBSchema {
  markPracticed: {
    key: string;
    value: QueuedMarkPracticed;
    indexes: { 'by-created': string };
  };
}

let dbPromise: ReturnType<typeof openDB<MutationQueueDb>> | null = null;

function getDb() {
  // Lazy — `idb`/IndexedDB only exist in the browser, and this module is
  // pulled in by hooks that also render during server-side prerendering.
  if (!dbPromise) {
    dbPromise = openDB<MutationQueueDb>('unboxed-mutation-queue', 1, {
      upgrade(db) {
        const store = db.createObjectStore('markPracticed', { keyPath: 'id' });
        store.createIndex('by-created', 'createdAt');
      },
    });
  }
  return dbPromise;
}

export async function enqueueMarkPracticed(item: Omit<QueuedMarkPracticed, 'id' | 'createdAt'>) {
  const db = await getDb();
  await db.put('markPracticed', {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
}

export async function getQueuedMutations(): Promise<QueuedMarkPracticed[]> {
  const db = await getDb();
  return db.getAllFromIndex('markPracticed', 'by-created');
}

export async function removeQueuedMutation(id: string) {
  const db = await getDb();
  await db.delete('markPracticed', id);
}

export async function countQueuedMutations(): Promise<number> {
  const db = await getDb();
  return db.count('markPracticed');
}
