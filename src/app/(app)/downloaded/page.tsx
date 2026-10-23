"use client";

import { useTrackEditor } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { SongRow } from "@/components/song-row";
import { useAuth } from "@/context/auth-context";
import { useOffline } from "@/context/offline-context";
import { usePlayer } from "@/context/player-context";
import type { Song } from "@/lib/types";
import {
  ArrowDownToLine,
  HardDrive,
  Play,
  Shuffle,
  Trash2,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

export default function DownloadedPage() {
  const { offlineSongs, stats, clearAll, isOnline } = useOffline();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();
  const { isAdmin } = useAuth();

  const songs: Song[] = useMemo(() => {
    return offlineSongs.map((record) => record.song);
  }, [offlineSongs]);

  function handlePlayAll() {
    if (songs.length === 0) return;
    playSong(songs[0], songs);
  }

  function handleShuffle() {
    if (songs.length === 0) return;
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  }

  async function handleClearAll() {
    if (
      confirm(
        `Are you sure you want to remove all ${songs.length} downloaded tracks (${stats.formattedSize}) from offline storage?`,
      )
    ) {
      await clearAll();
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Offline Status Badge Banner */}
      {!isOnline ? (
        <div className="flex items-center gap-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 px-4 py-3 text-xs font-semibold text-amber-900">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <span className="font-bold">Offline Mode Active:</span> You are currently disconnected
            from the internet. All tracks listed below are stored locally on your device and can be
            played seamlessly without data.
          </div>
        </div>
      ) : null}

      {/* Hero Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.2em] uppercase text-[#677717]">
            <ArrowDownToLine className="h-3.5 w-3.5" />
            <span>Cached Offline Library</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Downloaded Music
          </h1>
          <p className="mt-1 text-xs text-zinc-500 flex items-center gap-2">
            <span>
              {songs.length} track{songs.length === 1 ? "" : "s"} cached locally
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-mono text-zinc-600">
              <HardDrive className="h-3 w-3" />
              {stats.formattedSize}
            </span>
          </p>
        </div>

        {songs.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePlayAll}
              className="inline-flex items-center gap-2 rounded-full bg-[#19181b] px-5 py-2.5 text-xs font-bold text-[#dbe878] shadow-md transition hover:scale-105 active:scale-95"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Play All</span>
            </button>

            <button
              type="button"
              onClick={handleShuffle}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 transition hover:border-zinc-900 shadow-2xs"
            >
              <Shuffle className="h-3.5 w-3.5" />
              <span>Shuffle</span>
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-medium text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
              title="Remove all offline cached tracks to free storage"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Cache</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Content */}
      {songs.length === 0 ? (
        <EmptyState
          title="No offline tracks yet"
          body="Save your favorite tracks or playlists for offline listening just like Spotify or Apple Music. Tap the download icon next to any song to listen without data or Wi-Fi anytime."
          action={
            <Link
              href="/music"
              className="rounded-full bg-[#19181b] px-5 py-2 text-xs font-bold text-[#dbe878]"
            >
              Explore Music Catalog
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-xs space-y-1">
          {songs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              queue={songs}
              index={index}
              onEdit={isAdmin ? (songToEdit) => editSong(songToEdit) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
