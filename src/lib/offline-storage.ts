import type { Playlist, Song } from "./types";

const DB_NAME = "orbit_offline_db";
const DB_VERSION = 1;
const STORE_SONGS = "songs";
const STORE_PLAYLISTS = "playlists";

export type OfflineSongRecord = {
  id: string;
  title: string;
  artistName: string;
  albumTitle: string | null;
  audioBlob: Blob;
  coverBlob?: Blob;
  coverUrl?: string | null;
  durationSeconds: number | null;
  song: Song;
  sizeBytes: number;
  downloadedAt: number;
};

export type OfflinePlaylistRecord = {
  id: string;
  name: string;
  coverUrl?: string | null;
  songIds: string[];
  downloadedAt: number;
};

async function fetchWithProxyFallback(url: string): Promise<Response> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (res.ok) return res;
  } catch {
    // CORS blocked or network error, fall through to proxy
  }
  return fetch(`/api/proxy-audio?url=${encodeURIComponent(url)}`);
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1000) {
    return `${mb.toFixed(1)} MB`;
  }
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

/**
 * Opens or upgrades the IndexedDB instance for Orbit Offline Library.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SONGS)) {
        db.createObjectStore(STORE_SONGS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Downloads a song's audio stream and artwork, storing them in IndexedDB.
 */
export async function downloadSongOffline(
  song: Song,
  onProgress?: (progressPercent: number) => void,
): Promise<void> {
  const db = await openDB();

  // 1. Fetch the audio stream through our server-side secure stream endpoint
  const streamUrl = song.id
    ? `/api/stream?id=${encodeURIComponent(song.id)}`
    : `/api/proxy-audio?url=${encodeURIComponent(song.audio_url)}`;
  const audioResponse = await fetch(streamUrl);

  if (!audioResponse.ok) {
    throw new Error(
      `Failed to download audio for "${song.title}" (HTTP ${audioResponse.status})`,
    );
  }

  const contentLength = Number(audioResponse.headers.get("content-length") || 0);
  let audioBlob: Blob;

  if (contentLength > 0 && audioResponse.body && onProgress) {
    const reader = audioResponse.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        receivedBytes += value.length;
        const pct = Math.min(99, Math.round((receivedBytes / contentLength) * 100));
        onProgress(pct);
      }
    }
    // Combine chunks into ArrayBuffer
    const combined = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    audioBlob = new Blob([combined], {
      type: audioResponse.headers.get("content-type") || "audio/mpeg",
    });
  } else {
    audioBlob = await audioResponse.blob();
  }

  onProgress?.(99);

  // 2. Fetch the cover artwork if present
  let coverBlob: Blob | undefined;
  const coverUrl = song.cover_url || song.album?.cover_url || song.artist?.image_url;
  if (coverUrl) {
    try {
      const coverRes = await fetch(coverUrl, { mode: "cors", credentials: "omit" });
      if (coverRes.ok) {
        coverBlob = await coverRes.blob();
      }
    } catch {
      // Non-fatal: if cover fails CORS, audio is still preserved
    }
  }

  // 3. Store record in IndexedDB
  const record: OfflineSongRecord = {
    id: song.id,
    title: song.title,
    artistName: song.artist?.name || "Unknown Artist",
    albumTitle: song.album?.title || null,
    audioBlob,
    coverBlob,
    coverUrl,
    durationSeconds: song.duration_seconds,
    song,
    sizeBytes: audioBlob.size + (coverBlob?.size || 0),
    downloadedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SONGS, "readwrite");
    const store = tx.objectStore(STORE_SONGS);
    const putRequest = store.put(record);

    putRequest.onsuccess = () => {
      onProgress?.(100);
      resolve();
    };
    putRequest.onerror = () => reject(putRequest.error);
  });
}

/**
 * Removes a downloaded song from the offline storage.
 */
export async function removeOfflineSong(songId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SONGS, STORE_PLAYLISTS], "readwrite");
    const songStore = tx.objectStore(STORE_SONGS);
    songStore.delete(songId);

    // Also remove from any playlist's cached songIds list
    const plStore = tx.objectStore(STORE_PLAYLISTS);
    const cursorReq = plStore.openCursor();
    cursorReq.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const pl = cursor.value as OfflinePlaylistRecord;
        if (pl.songIds.includes(songId)) {
          pl.songIds = pl.songIds.filter((id) => id !== songId);
          cursor.update(pl);
        }
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Checks whether a song is saved in offline storage.
 */
export async function isSongOffline(songId: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SONGS, "readonly");
      const store = tx.objectStore(STORE_SONGS);
      const req = store.get(songId);
      req.onsuccess = () => resolve(Boolean(req.result));
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Retrieves a single offline song record.
 */
export async function getOfflineSong(songId: string): Promise<OfflineSongRecord | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SONGS, "readonly");
      const store = tx.objectStore(STORE_SONGS);
      const req = store.get(songId);
      req.onsuccess = () => resolve((req.result as OfflineSongRecord) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Retrieves all offline songs.
 */
export async function getAllOfflineSongs(): Promise<OfflineSongRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SONGS, "readonly");
      const store = tx.objectStore(STORE_SONGS);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = (req.result as OfflineSongRecord[]) || [];
        // Sort newest downloaded first
        results.sort((a, b) => b.downloadedAt - a.downloadedAt);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Downloads all songs in a playlist for offline playback.
 */
export async function downloadPlaylistOffline(
  playlist: Playlist,
  songs: Song[],
  onProgress?: (completed: number, total: number) => void,
): Promise<void> {
  const db = await openDB();
  const total = songs.length;
  let completed = 0;

  for (const song of songs) {
    const alreadySaved = await isSongOffline(song.id);
    if (!alreadySaved) {
      await downloadSongOffline(song);
    }
    completed += 1;
    onProgress?.(completed, total);
  }

  const plRecord: OfflinePlaylistRecord = {
    id: playlist.id,
    name: playlist.name,
    coverUrl: playlist.cover_url || songs[0]?.cover_url || songs[0]?.album?.cover_url,
    songIds: songs.map((s) => s.id),
    downloadedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, "readwrite");
    const store = tx.objectStore(STORE_PLAYLISTS);
    const req = store.put(plRecord);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Removes an offline playlist record and optionally removes songs.
 */
export async function removeOfflinePlaylist(
  playlistId: string,
  removeSongsToo = false,
): Promise<void> {
  const db = await openDB();
  return new Promise(async (resolve, reject) => {
    try {
      const tx = db.transaction([STORE_PLAYLISTS, STORE_SONGS], "readwrite");
      const plStore = tx.objectStore(STORE_PLAYLISTS);
      const songStore = tx.objectStore(STORE_SONGS);

      if (removeSongsToo) {
        const getReq = plStore.get(playlistId);
        getReq.onsuccess = () => {
          const pl = getReq.result as OfflinePlaylistRecord | undefined;
          if (pl?.songIds) {
            for (const sId of pl.songIds) {
              songStore.delete(sId);
            }
          }
        };
      }

      plStore.delete(playlistId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Checks if a playlist is saved offline.
 */
export async function isPlaylistOffline(playlistId: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PLAYLISTS, "readonly");
      const store = tx.objectStore(STORE_PLAYLISTS);
      const req = store.get(playlistId);
      req.onsuccess = () => resolve(Boolean(req.result));
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Retrieves total storage stats used by offline music.
 */
export async function getOfflineStats(): Promise<{
  songCount: number;
  totalBytes: number;
  formattedSize: string;
}> {
  try {
    const songs = await getAllOfflineSongs();
    const totalBytes = songs.reduce((sum, s) => sum + (s.sizeBytes || 0), 0);
    return {
      songCount: songs.length,
      totalBytes,
      formattedSize: formatBytes(totalBytes),
    };
  } catch {
    return { songCount: 0, totalBytes: 0, formattedSize: "0 MB" };
  }
}

/**
 * Clears all cached offline songs and playlists.
 */
export async function clearAllOfflineStorage(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SONGS, STORE_PLAYLISTS], "readwrite");
    tx.objectStore(STORE_SONGS).clear();
    tx.objectStore(STORE_PLAYLISTS).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
