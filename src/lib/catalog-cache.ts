import type { Artist, Playlist, Song } from "@/lib/types";

const DB_NAME = "orbit_catalog_db";
const DB_VERSION = 1;
const STORE_NAME = "catalog_cache";
const CACHE_KEY = "global_catalog";

export type CachedCatalog = {
  songs: Song[];
  artists: Artist[];
  playlists: Playlist[];
  favouriteIds: string[];
  recentlyPlayed: Song[];
  songCount: number;
  cachedAt: number;
};

function openCacheDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Retrieves the cached catalog from IndexedDB (instant, zero network calls).
 */
export async function getCachedCatalog(): Promise<CachedCatalog | null> {
  const db = await openCacheDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(CACHE_KEY);

      req.onsuccess = () => {
        resolve(req.result ? (req.result as CachedCatalog) : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Saves the catalog to IndexedDB for instant future loads.
 */
export async function setCachedCatalog(data: CachedCatalog): Promise<void> {
  const db = await openCacheDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, CACHE_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Clears the cached catalog (e.g., on sign out).
 */
export async function clearCachedCatalog(): Promise<void> {
  const db = await openCacheDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(CACHE_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
