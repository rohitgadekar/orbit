"use client";

import { Cover } from "@/components/cover";
import { useMusic } from "@/context/music-context";
import type { Song } from "@/lib/types";
import { Check, FolderPlus, Loader2, Music2, Plus, X } from "lucide-react";
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
  const { playlists, createPlaylist, addToPlaylist, playlistSongs } = useMusic();
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [existingPlaylistIds, setExistingPlaylistIds] = useState<Set<string>>(new Set());
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check which playlists already have this song
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const idsWithSong = new Set<string>();
      for (const pl of playlists) {
        try {
          const songsInPl = await playlistSongs(pl.id);
          if (songsInPl.some((s) => s.id === song.id)) {
            idsWithSong.add(pl.id);
          }
        } catch {
          // ignore lookup errors
        }
      }
      if (isMounted) {
        setExistingPlaylistIds(idsWithSong);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [song.id, playlists, playlistSongs]);

  async function handleAddToPlaylist(playlistId: string, playlistName: string) {
    setAddingToId(playlistId);
    setSuccessMsg(null);
    try {
      await addToPlaylist(playlistId, song.id);
      setExistingPlaylistIds((prev) => new Set([...prev, playlistId]));
      setSuccessMsg(`Added "${song.title}" to "${playlistName}"`);
      setTimeout(() => setSuccessMsg(null), 2500);
    } finally {
      setAddingToId(null);
    }
  }

  async function handleCreateAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    setIsCreating(true);
    setSuccessMsg(null);
    try {
      const pl = await createPlaylist(newPlaylistName.trim());
      if (pl) {
        await addToPlaylist(pl.id, song.id);
        setExistingPlaylistIds((prev) => new Set([...prev, pl.id]));
        setSuccessMsg(`Created playlist "${pl.name}" and added "${song.title}"!`);
        setNewPlaylistName("");
        setTimeout(() => setSuccessMsg(null), 2500);
      }
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="relative w-full max-w-md rounded-[32px] border border-white/20 bg-[#1c1b1f] p-6 text-white shadow-2xl sm:p-7">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header & Target Song */}
      <div className="flex items-center gap-3.5 border-b border-white/10 pb-4">
        <Cover
          src={song.cover_url || song.album?.cover_url}
          title={song.title}
          className="h-12 w-12 rounded-xl ring-1 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#dbe878]">
            Add to Playlist
          </span>
          <h3 className="truncate font-sans text-base font-bold text-white">{song.title}</h3>
          <p className="truncate text-xs text-zinc-400">{song.artist?.name || "Unknown Artist"}</p>
        </div>
      </div>

      {/* Success toast */}
      {successMsg ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#dbe878]/15 px-3.5 py-2 text-xs font-semibold text-[#dbe878]">
          <Check className="h-4 w-4" />
          <span className="truncate">{successMsg}</span>
        </div>
      ) : null}

      {/* Create New Playlist Form */}
      <form onSubmit={handleCreateAndAdd} className="mt-4 flex gap-2">
        <input
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          placeholder="Create new playlist name..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none transition focus:border-[#dbe878] focus:bg-white/10"
        />
        <button
          type="submit"
          disabled={isCreating || !newPlaylistName.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#dbe878] px-4 py-2 text-xs font-bold text-zinc-950 transition hover:bg-[#eaf48c] active:scale-95 disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
          <span>Create</span>
        </button>
      </form>

      {/* Existing Playlists List */}
      <div className="mt-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          Select Playlist ({playlists.length})
        </p>

        <div className="mt-2.5 max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {playlists.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 text-center text-xs text-zinc-400">
              <Music2 className="mx-auto mb-2 h-6 w-6 text-zinc-500" />
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
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl p-2.5 text-left transition ${
                    alreadyInPlaylist
                      ? "bg-[#dbe878]/10 text-white ring-1 ring-[#dbe878]/30"
                      : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Cover
                      src={pl.cover_url}
                      title={pl.name}
                      className="h-10 w-10 rounded-xl"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white">{pl.name}</p>
                      <p className="text-[10px] text-zinc-400">Playlist Collection</p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#dbe878]" />
                    ) : alreadyInPlaylist ? (
                      <span className="flex items-center gap-1 rounded-full bg-[#dbe878]/20 px-2.5 py-1 text-[10px] font-bold text-[#dbe878]">
                        <Check className="h-3 w-3" />
                        <span>Added</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-white/20">
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
          className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}
