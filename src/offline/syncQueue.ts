import { getSyncQueue, removeSyncQueueItem } from './localStorageService';

export async function syncPendingChanges() {
  if (!navigator.onLine) return { synced: 0 };

  const queue = await getSyncQueue();
  let synced = 0;

  for (const item of queue) {
    const response = await fetch(item.endpoint, {
      method: item.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.payload),
    });

    if (!response.ok) break;

    await removeSyncQueueItem(item.id);
    synced += 1;
  }

  return { synced };
}
