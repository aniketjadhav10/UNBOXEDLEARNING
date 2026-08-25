// ============================================================
// CacheService — Native IndexedDB Caching Utility
// Provides a persistent client-side cache without external dependencies.
// ============================================================

const DB_NAME = 'unboxed_learning_cache';
const STORE_NAME = 'app_data';
const DB_VERSION = 1;

/**
 * Initializes the IndexedDB database.
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check for SSR/Server environment where indexedDB is not available
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject('Failed to open IndexedDB');
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Saves a serializable value into the cache by key.
 */
export async function setCache<T>(key: string, value: T): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn(`[CacheService] Failed to set cache for ${key}:`, error);
  }
}

/**
 * Retrieves a value from the cache by key.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result as T || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn(`[CacheService] Failed to get cache for ${key}:`, error);
    return null;
  }
}

/**
 * Clears the entire cache store (useful on logout).
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[CacheService] Failed to clear cache:', error);
  }
}

// ============================================================
// Stale-while-revalidate query cache (built on the store above)
// Entries are wrapped as { data, ts }. Read services call cachedQuery;
// mutations call delCache / delByPrefix to invalidate.
// ============================================================

interface CacheEntry<T> { data: T; ts: number; }

const DEFAULT_TTL = 60_000;

/**
 * Return cached data if fresh; if stale, return it immediately and revalidate in
 * the background; if missing, fetch and cache. Cuts repeat DB hits within the TTL.
 */
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { ttlMs?: number; forceRefresh?: boolean },
): Promise<T> {
  const ttlMs = opts?.ttlMs ?? DEFAULT_TTL;
  const entry = opts?.forceRefresh ? null : await getCache<CacheEntry<T>>(key);
  const now = Date.now();

  if (entry && now - entry.ts < ttlMs) {
    return entry.data; // fresh — no DB hit
  }

  if (entry) {
    // stale — serve cached now, refresh cache in the background for next time
    void revalidate(key, fetcher);
    return entry.data;
  }

  // missing (or forced) — fetch and cache
  const data = await fetcher();
  await setCache<CacheEntry<T>>(key, { data, ts: Date.now() });
  return data;
}

async function revalidate<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
  try {
    const data = await fetcher();
    await setCache<CacheEntry<T>>(key, { data, ts: Date.now() });
  } catch (error) {
    console.warn(`[CacheService] Background revalidate failed for ${key}:`, error);
  }
}

/** Delete a single cache key. */
export async function delCache(key: string): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn(`[CacheService] Failed to delete cache for ${key}:`, error);
  }
}

/** Delete every cache key that starts with `prefix` (coarse invalidation). */
export async function delByPrefix(prefix: string): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn(`[CacheService] Failed to delete cache by prefix ${prefix}:`, error);
  }
}
