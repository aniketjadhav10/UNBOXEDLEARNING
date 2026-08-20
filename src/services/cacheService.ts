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
