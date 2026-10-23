"use client";

import {
  clearAllOfflineStorage,
  downloadPlaylistOffline,
  downloadSongOffline,
  getAllOfflineSongs,
  getOfflineStats,
  isPlaylistOffline,
  isSongOffline,
  removeOfflinePlaylist,
  removeOfflineSong,
  type OfflineSongRecord,
} from "@/lib/offline-storage";
import type { Playlist, Song } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type OfflineContextValue = {
  isOnline: boolean;
  offlineSongIds: Set<string>;
  offlinePlaylistIds: Set<string>;
  downloadingSongIds: Record<string, number>; // songId -> percent
  downloadingPlaylistIds: Set<string>;
  offlineSongs: OfflineSongRecord[];
  stats: { songCount: number; totalBytes: number; formattedSize: string };
  isDownloaded: (songId: string) => boolean;
  isPlaylistDownloaded: (playlistId: string) => boolean;
  toggleDownloadSong: (song: Song) => Promise<void>;
  toggleDownloadPlaylist: (playlist: Playlist, songs: Song[]) => Promise<void>;
  removeSong: (songId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refreshOffline: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );
  const [offlineSongIds, setOfflineSongIds] = useState<Set<string>>(new Set());
  const [offlinePlaylistIds, setOfflinePlaylistIds] = useState<Set<string>>(new Set());
  const [downloadingSongIds, setDownloadingSongIds] = useState<Record<string, number>>({});
  const [downloadingPlaylistIds, setDownloadingPlaylistIds] = useState<Set<string>>(new Set());
  const [offlineSongs, setOfflineSongs] = useState<OfflineSongRecord[]>([]);
  const [stats, setStats] = useState({ songCount: 0, totalBytes: 0, formattedSize: "0 MB" });

  const refreshOffline = useCallback(async () => {
    try {
      const [allRecords, currentStats] = await Promise.all([
        getAllOfflineSongs(),
        getOfflineStats(),
      ]);
      setOfflineSongs(allRecords);
      setOfflineSongIds(new Set(allRecords.map((r) => r.id)));
      setStats(currentStats);
    } catch (e) {
      console.warn("Failed to refresh offline songs:", e);
    }
  }, []);

  // Monitor online / offline network state
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    void refreshOffline();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshOffline]);

  const isDownloaded = useCallback(
    (songId: string) => offlineSongIds.has(songId),
    [offlineSongIds],
  );

  const isPlaylistDownloaded = useCallback(
    (playlistId: string) => offlinePlaylistIds.has(playlistId),
    [offlinePlaylistIds],
  );

  const toggleDownloadSong = useCallback(
    async (song: Song) => {
      const already = offlineSongIds.has(song.id);
      if (already) {
        // Remove from offline
        await removeOfflineSong(song.id);
        await refreshOffline();
      } else {
        // Start download
        setDownloadingSongIds((prev) => ({ ...prev, [song.id]: 0 }));
        try {
          await downloadSongOffline(song, (pct) => {
            setDownloadingSongIds((prev) => ({ ...prev, [song.id]: pct }));
          });
          await refreshOffline();
        } catch (err) {
          console.error("Failed to download song:", err);
          alert(
            err instanceof Error
              ? `Could not download: ${err.message}`
              : "Failed to download track for offline listening.",
          );
        } finally {
          setDownloadingSongIds((prev) => {
            const next = { ...prev };
            delete next[song.id];
            return next;
          });
        }
      }
    },
    [offlineSongIds, refreshOffline],
  );

  const toggleDownloadPlaylist = useCallback(
    async (playlist: Playlist, songs: Song[]) => {
      const already = await isPlaylistOffline(playlist.id);
      if (already) {
        // Remove playlist record
        await removeOfflinePlaylist(playlist.id);
        setOfflinePlaylistIds((prev) => {
          const next = new Set(prev);
          next.delete(playlist.id);
          return next;
        });
        await refreshOffline();
      } else {
        setDownloadingPlaylistIds((prev) => new Set(prev).add(playlist.id));
        try {
          await downloadPlaylistOffline(playlist, songs, () => {
            // Can update progress if needed
          });
          setOfflinePlaylistIds((prev) => new Set(prev).add(playlist.id));
          await refreshOffline();
        } catch (err) {
          console.error("Failed to download playlist:", err);
          alert("Failed to download all songs in playlist.");
        } finally {
          setDownloadingPlaylistIds((prev) => {
            const next = new Set(prev);
            next.delete(playlist.id);
            return next;
          });
        }
      }
    },
    [refreshOffline],
  );

  const removeSong = useCallback(
    async (songId: string) => {
      await removeOfflineSong(songId);
      await refreshOffline();
    },
    [refreshOffline],
  );

  const clearAll = useCallback(async () => {
    await clearAllOfflineStorage();
    await refreshOffline();
    setOfflinePlaylistIds(new Set());
  }, [refreshOffline]);

  const value = useMemo<OfflineContextValue>(
    () => ({
      isOnline,
      offlineSongIds,
      offlinePlaylistIds,
      downloadingSongIds,
      downloadingPlaylistIds,
      offlineSongs,
      stats,
      isDownloaded,
      isPlaylistDownloaded,
      toggleDownloadSong,
      toggleDownloadPlaylist,
      removeSong,
      clearAll,
      refreshOffline,
    }),
    [
      isOnline,
      offlineSongIds,
      offlinePlaylistIds,
      downloadingSongIds,
      downloadingPlaylistIds,
      offlineSongs,
      stats,
      isDownloaded,
      isPlaylistDownloaded,
      toggleDownloadSong,
      toggleDownloadPlaylist,
      removeSong,
      clearAll,
      refreshOffline,
    ],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider");
  return ctx;
}
