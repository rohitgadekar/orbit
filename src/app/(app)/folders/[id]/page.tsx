"use client";

import { useTrackEditor } from "@/components/app-shell";
import { Cover } from "@/components/cover";
import { EmptyState } from "@/components/empty-state";
import { SongRow } from "@/components/song-row";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { useOffline } from "@/context/offline-context";
import { usePlayer } from "@/context/player-context";
import type { Song } from "@/lib/types";
import {
  ArrowDownToLine,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function FolderDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    playlists,
    playlistSongs,
    getCachedPlaylistSongs,
    songs,
    addToPlaylist,
    removeFromPlaylist,
    loading,
  } = useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();
  const { isAdmin } = useAuth();
  const { isPlaylistDownloaded, toggleDownloadPlaylist, downloadingPlaylistIds } = useOffline();

  // Load from instant cache synchronously on initial render
  const cached = params?.id ? getCachedPlaylistSongs(params.id) : undefined;
  const [items, setItems] = useState<Song[]>(() => cached ?? []);
  const [fetching, setFetching] = useState(() => !cached);
  const [searchSong, setSearchSong] = useState("");
  const playlist = playlists.find((item) => item.id === params.id);

  useEffect(() => {
    let active = true;
    if (!params.id) return;
    playlistSongs(params.id).then((res) => {
      if (active) {
        setItems(res);
        setFetching(false);
      }
    });
    return () => {
      active = false;
    };
  }, [params.id, playlistSongs]);

  if (loading && !playlist) {
    return <div className="h-40 animate-pulse rounded-[28px] border border-white/5 bg-[#222224]" />;
  }

  if (!playlist) {
    return (
      <EmptyState
        title="Playlist not found"
        body="It may have been removed or deleted."
        action={
          <Link href="/folders" className="text-xs font-semibold text-blue-400 underline hover:text-blue-300">
            Back to playlists
          </Link>
        }
      />
    );
  }

  const available = songs.filter(
    (song) =>
      !items.some((item) => item.id === song.id) &&
      (!searchSong.trim() ||
        song.title.toLowerCase().includes(searchSong.toLowerCase()) ||
        song.artist?.name.toLowerCase().includes(searchSong.toLowerCase())),
  );

  const cover = playlist.cover_url || items[0]?.cover_url || items[0]?.album?.cover_url;

  return (
    <div className="space-y-6 pb-12">
      <Link
        href="/folders"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to playlists</span>
      </Link>

      {/* Playlist Hero Banner */}
      <div className="relative flex flex-col gap-6 overflow-hidden rounded-[36px] border border-white/5 bg-gradient-to-br from-[#19181b] via-[#242228] to-[#121114] p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <Cover
            src={cover}
            title={playlist.name}
            className="h-20 w-20 shrink-0 rounded-2xl shadow-2xl ring-1 ring-white/10 sm:h-24 sm:w-24"
          />
          <div>
            <span className="text-xs font-semibold text-blue-400">
              Playlist Collection
            </span>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {playlist.name}
            </h1>
            <p className="mt-1.5 text-xs text-zinc-400">
              {items.length} track{items.length === 1 ? "" : "s"} in this playlist
            </p>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-3">
          {items.length > 0 ? (
            <button
              type="button"
              onClick={() => void toggleDownloadPlaylist(playlist, items)}
              disabled={downloadingPlaylistIds.has(playlist.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition active:scale-95 ${isPlaylistDownloaded(playlist.id)
                ? "border border-blue-400/30 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
                : "border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
                }`}
              title={
                isPlaylistDownloaded(playlist.id)
                  ? "Downloaded for offline listening (click to remove)"
                  : "Download all tracks in this playlist for offline listening"
              }
            >
              {downloadingPlaylistIds.has(playlist.id) ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-300" />
                  <span>Downloading...</span>
                </>
              ) : isPlaylistDownloaded(playlist.id) ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                  <span>Downloaded Offline</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  <span>Download Playlist</span>
                </>
              )}
            </button>
          ) : null}

          {items[0] ? (
            <button
              type="button"
              onClick={() => playSong(items[0], items)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:scale-105 hover:bg-blue-400 active:scale-95"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Play Playlist</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Playlist Songs List */}
      {fetching && items.length === 0 ? (
        <div className="animate-pulse space-y-2 rounded-[28px] border border-white/5 bg-[#222224] p-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3.5 px-3 py-2.5">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-[#2c2c2f]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 rounded bg-[#2c2c2f]" />
                <div className="h-2.5 w-24 rounded bg-[#26262a]" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Empty playlist"
          body="Use the search section below to add your favorite songs to this playlist."
        />
      ) : (
        <div className="space-y-1 rounded-[28px] border border-white/5 bg-[#222224] p-2">
          {items.map((song, index) => (
            <div key={song.id} className="flex items-center">
              <div className="min-w-0 flex-1">
                <SongRow
                  song={song}
                  queue={items}
                  index={index}
                  onEdit={isAdmin ? (songToEdit) => editSong(songToEdit) : undefined}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setItems((prev) => prev.filter((s) => s.id !== song.id));
                  void removeFromPlaylist(playlist.id, song.id);
                }}
                className="px-3 text-xs font-medium text-zinc-500 transition hover:text-rose-400 active:scale-90"
                title="Remove from playlist"
                aria-label="Remove from playlist"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Songs from Library Section */}
      <section className="space-y-3 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Add songs from your library
            </h2>
            <p className="text-xs text-zinc-500">
              Select any song to add to &ldquo;{playlist.name}&rdquo;
            </p>
          </div>

          <div className="relative sm:max-w-xs">
            <input
              value={searchSong}
              onChange={(e) => setSearchSong(e.target.value)}
              placeholder="Search library to add..."
              className="w-full rounded-full bg-[#2a2a2d] px-3.5 py-2 pl-9 text-xs font-medium text-white placeholder:text-zinc-500 outline-none ring-1 ring-transparent transition focus:ring-blue-500/60"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          </div>
        </div>

        {available.length === 0 ? (
          <p className="rounded-2xl border border-white/5 bg-[#222224] p-6 text-center text-xs text-zinc-500">
            {searchSong
              ? `No available songs matching "${searchSong}".`
              : "All songs in your library are already in this playlist."}
          </p>
        ) : (
          <div className="no-scrollbar max-h-64 divide-y divide-white/[0.04] overflow-y-auto rounded-[28px] border border-white/5 bg-[#222224] p-2">
            {available.map((song) => (
              <div
                key={song.id}
                className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-xs transition hover:bg-[#2c2c2f]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Cover
                    src={song.cover_url || song.album?.cover_url}
                    title={song.title}
                    className="h-9 w-9 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{song.title}</p>
                    <p className="truncate text-[11px] text-zinc-500">{song.artist?.name}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    // Instant optimistic UI addition (0ms!)
                    setItems((prev) => [...prev, song]);
                    void addToPlaylist(playlist.id, song.id);
                  }}
                  className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-full bg-[#2c2c2f] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-blue-500 hover:text-white active:scale-95"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add to playlist</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}