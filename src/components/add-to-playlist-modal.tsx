"use client";

import { Cover } from "@/components/cover";
import { useMusic } from "@/context/music-context";
import type { Song } from "@/lib/types";
import { Check, FolderPlus, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

export function AddToPlaylistModal({
  song,
  isOpen,
  onClose,
}: {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !song) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <AddToPlaylistForm key={song.id} song={song} onClose={onClose} />
    </div>
  );
}

function AddToPlaylistForm({
  song,
  onClose,
}: {
  song: Song;
  onClose: () => void;
}) {
  const { playlists, createPlaylist, addToPlaylist, playlistSongs, getCachedPlaylistSongs } = useMusic();
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [existingPlaylistIds, setExistingPlaylistIds] = useState<Set<string>>(() => {
    // Check instant cache synchronously on initial render
    const initialSet = new Set<string>();
    for (const pl of playlists) {
      const cached = getCachedPlaylistSongs(pl.id);
      if (cached?.some((s) => s.id === song.id)) {
        initialSet.add(pl.id);
      }
    }
    return initialSet;
  });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check playlists in parallel for any uncached items
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const idsWithSong = new Set(existingPlaylistIds);
      const uncached = playlists.filter((pl) => !getCachedPlaylistSongs(pl.id));

      if (uncached.length > 0) {
        await Promise.allSettled(
          uncached.map(async (pl) => {
            try {
              const songsInPl = await playlistSongs(pl.id);
              if (songsInPl.some((s) => s.id === song.id)) {
                idsWithSong.add(pl.id);
              }
            } catch { }
          }),
        );
      }

      if (isMounted) {
        setExistingPlaylistIds(idsWithSong);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [song.id, playlists, playlistSongs, getCachedPlaylistSongs]);

  async function handleAddToPlaylist(playlistId: string, playlistName: string) {
    // 1. Instant optimistic UI feedback (0ms!)
    setExistingPlaylistIds((prev) => new Set([...prev, playlistId]));
    setSuccessMsg(`Added "${song.title}" to "${playlistName}"`);
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch { }
    }
    setTimeout(() => setSuccessMsg(null), 2500);

    // 2. Perform DB mutation in background
    try {
      await addToPlaylist(playlistId, song.id);
    } catch (err) {
      console.error("Failed to add to playlist:", err);
      // Rollback on error
      setExistingPlaylistIds((prev) => {
        const next = new Set(prev);
        next.delete(playlistId);
        return next;
      });
      setSuccessMsg(null);
    }
  }

  async function handleCreateAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlaylistName.trim() || isCreating) return;
    setIsCreating(true);
    setSuccessMsg(null);
    const name = newPlaylistName.trim();
    setNewPlaylistName("");

    try {
      const pl = await createPlaylist(name);
      if (pl) {
        setExistingPlaylistIds((prev) => new Set([...prev, pl.id]));
        setSuccessMsg(`Created playlist "${pl.name}" and added "${song.title}"!`);
        setTimeout(() => setSuccessMsg(null), 2500);
        void addToPlaylist(pl.id, song.id);
      }
    } catch (err) {
      console.error("Failed to create playlist:", err);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-[#1a1a1c] p-6 text-white shadow-2xl sm:p-7">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header & Target Song */}
      <div className="flex items-center gap-3.5 border-b border-white/10 pb-4 pr-8">
        <Cover
          src={song.cover_url || song.album?.cover_url}
          title={song.title}
          className="h-12 w-12 shrink-0 rounded-xl ring-1 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-blue-400">Add to playlist</span>
          <h3 className="truncate font-sans text-base font-bold text-white">{song.title}</h3>
          <p className="truncate text-xs text-zinc-400">{song.artist?.name || "Unknown Artist"}</p>
        </div>
      </div>

      {/* Success toast */}
      {successMsg ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-500/10 px-3.5 py-2 text-xs font-semibold text-blue-300">
          <Check className="h-4 w-4 shrink-0" />
          <span className="truncate">{successMsg}</span>
        </div>
      ) : null}

      {/* Create New Playlist Form */}
      <form onSubmit={handleCreateAndAdd} className="mt-4 flex gap-2">
        <input
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          placeholder="New playlist name..."
          className="flex-1 rounded-full border border-white/10 bg-[#222224] px-4 py-2.5 text-xs text-white outline-none transition placeholder:text-zinc-500 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={isCreating || !newPlaylistName.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-400 active:scale-95 disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
          <span>Create</span>
        </button>
      </form>

      {/* Existing Playlists List */}
      <div className="mt-5">
        <p className="text-xs font-semibold text-zinc-400">
          Your playlists ({playlists.length})
        </p>

        <div className="no-scrollbar mt-2.5 max-h-56 space-y-1.5 overflow-y-auto">
          {playlists.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#222224] p-6 text-center text-xs text-zinc-400">
              <p>No playlists yet.</p>
              <p className="mt-1 text-[11px] text-zinc-500">Create your first playlist using the box above.</p>
            </div>
          ) : (
            playlists.map((pl) => {
              const alreadyInPlaylist = existingPlaylistIds.has(pl.id);
              const isAdding = addingToId === pl.id;

              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => handleAddToPlaylist(pl.id, pl.name)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-2.5 text-left transition ${alreadyInPlaylist
                      ? "border-blue-500/30 bg-blue-500/10 text-white"
                      : "border-white/5 bg-[#222224] text-zinc-300 hover:border-white/15 hover:bg-[#262628] hover:text-white"
                    }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Cover
                      src={pl.cover_url}
                      title={pl.name}
                      className="h-10 w-10 shrink-0 rounded-xl"
                    />
                    <p className="truncate text-sm font-bold text-white">{pl.name}</p>
                  </div>

                  <div className="shrink-0">
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    ) : alreadyInPlaylist ? (
                      <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-1 text-[11px] font-bold text-blue-300">
                        <Check className="h-3 w-3" />
                        <span>Added</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Close */}
      <div className="mt-5 border-t border-white/10 pt-3 text-right">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-white/10 hover:text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}