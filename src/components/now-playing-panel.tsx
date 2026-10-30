"use client";

import { Cover } from "@/components/cover";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { useOffline } from "@/context/offline-context";
import { usePlayer } from "@/context/player-context";
import type { Song } from "@/lib/types";
import { splitArtistNames } from "@/lib/artists";
import { formatTime } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowDownToLine,
  CheckCircle2,
  Heart,
  Loader2,
  Maximize2,
  Pause,
  Pencil,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";

export function NowPlayingPanel({
  onEditTrack,
}: {
  onEditTrack?: (song: Song) => void;
}) {
  const { isAdmin } = useAuth();
  const { isDownloaded, toggleDownloadSong, downloadingSongIds } = useOffline();
  const {
    current,
    isPlaying,
    progress,
    duration,
    queue,
    toggle,
    next,
    prev,
    seek,
    shuffle,
    repeat,
    toggleShuffle,
    cycleRepeat,
    setExpanded,
    playSong,
  } = usePlayer();
  const { favouriteIds, toggleFavourite, songs } = useMusic();

  const activeSong = current ?? songs[0] ?? null;
  const cover = activeSong?.cover_url || activeSong?.album?.cover_url || activeSong?.artist?.image_url;
  const isFav = activeSong ? favouriteIds.has(activeSong.id) : false;

  // Next songs in queue
  const currentIndex = activeSong ? queue.findIndex((s) => s.id === activeSong.id) : -1;
  const upcomingQueue =
    queue.length > 1
      ? queue.slice(currentIndex + 1).concat(queue.slice(0, Math.max(0, currentIndex))).slice(0, 10)
      : songs.filter((s) => s.id !== activeSong?.id).slice(0, 10);

  const handleOpenFullscreen = () => {
    if (!current && activeSong) {
      playSong(activeSong, queue.length > 0 ? queue : songs);
    }
    setExpanded(true);
  };

  if (!activeSong) {
    return (
      <aside className="hidden w-80 shrink-0 flex-col rounded-[32px] bg-[#ede9e2] p-6 lg:flex xl:w-88">
        <div className="flex items-center gap-2">
          <div className="flex items-end gap-0.5">
            <span className="h-3 w-1 rounded-full bg-zinc-700" />
            <span className="h-4 w-1 rounded-full bg-zinc-700" />
            <span className="h-2 w-1 rounded-full bg-zinc-700" />
          </div>
          <h2 className="font-semibold text-zinc-900">Now Playing</h2>
        </div>
        <div className="mt-8 flex flex-1 flex-col items-center justify-center text-center text-zinc-500">
          <p className="text-sm">Select a song to start listening</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-80 shrink-0 flex-col rounded-[32px] bg-[#ede9e2] p-5 shadow-sm lg:flex xl:w-88">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          {/* Waveform / Equalizer icon */}
          <div className="flex items-end gap-[3px]">
            <span className={`w-[3px] rounded-full bg-zinc-800 ${isPlaying ? "eq-bar-1" : "h-3"}`} />
            <span className={`w-[3px] rounded-full bg-zinc-800 ${isPlaying ? "eq-bar-2" : "h-4"}`} />
            <span className={`w-[3px] rounded-full bg-zinc-800 ${isPlaying ? "eq-bar-3" : "h-2"}`} />
            <span className={`w-[3px] rounded-full bg-zinc-800 ${isPlaying ? "eq-bar-4" : "h-3.5"}`} />
          </div>
          <h2 className="text-sm font-bold tracking-tight text-zinc-900">Now Playing</h2>
        </div>

        <div className="flex items-center gap-1">
          {isAdmin && onEditTrack ? (
            <button
              type="button"
              onClick={() => onEditTrack(activeSong)}
              className="rounded-full p-1.5 text-zinc-600 transition hover:bg-black/5 hover:text-zinc-900"
              title="Edit track"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleOpenFullscreen}
            className="rounded-full p-1.5 text-zinc-600 transition hover:bg-black/5 hover:text-zinc-900"
            title="Expand to ambient full-screen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Album Artwork Card */}
      <div className="group relative mt-1 aspect-square w-full shrink-0 overflow-hidden rounded-[26px] bg-zinc-200 shadow-md">
        <Cover
          src={cover}
          title={activeSong.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          playing={isPlaying}
        />
        <button
          type="button"
          onClick={handleOpenFullscreen}
          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 backdrop-blur-[2px] transition group-hover:opacity-100"
        >
          <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-zinc-900 shadow-lg">
            <Maximize2 className="h-3.5 w-3.5" />
            Full Screen
          </span>
        </button>
      </div>

      {/* Song Title & Controls */}
      <div className="mt-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-sans text-base font-bold text-zinc-900">
              {activeSong.title}
            </h3>
            <div className="truncate text-xs font-medium text-zinc-600">
              {splitArtistNames(activeSong.artist?.name).map((name, i, arr) => (
                <span key={name}>
                  <Link
                    href={`/artists/${encodeURIComponent(name)}`}
                    className="hover:text-zinc-950 hover:underline transition"
                  >
                    {name}
                  </Link>
                  {i < arr.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Offline download button */}
            <button
              type="button"
              onClick={() => void toggleDownloadSong(activeSong)}
              disabled={downloadingSongIds[activeSong.id] !== undefined}
              className="rounded-full p-2 text-zinc-400 hover:text-zinc-900 transition"
              title={
                isDownloaded(activeSong.id)
                  ? "Downloaded offline (click to remove)"
                  : downloadingSongIds[activeSong.id] !== undefined
                    ? `Downloading ${downloadingSongIds[activeSong.id]}%`
                    : "Save track offline"
              }
              aria-label="Offline download"
            >
              {downloadingSongIds[activeSong.id] !== undefined ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-700" />
              ) : isDownloaded(activeSong.id) ? (
                <CheckCircle2 className="h-4 w-4 fill-[#dbe878]/60 text-[#54620f]" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => void toggleFavourite(activeSong.id)}
              className="rounded-full p-2 text-zinc-500 hover:text-rose-500 active:scale-75 transition-all"
              aria-label="Favorite"
            >
              <Heart className={`h-4 w-4 transition-transform duration-200 ${isFav ? "fill-rose-500 text-rose-500 scale-110" : ""}`} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 space-y-1">
          <input
            type="range"
            min={0}
            max={duration || activeSong.duration_seconds || 1}
            step={0.1}
            value={Math.min(progress, duration || progress)}
            onChange={(e) => seek(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] font-mono font-medium text-zinc-500">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration || activeSong.duration_seconds || 0)}</span>
          </div>
        </div>

        {/* Playback action buttons */}
        <div className="mt-3 flex items-center justify-between px-2">
          <button
            type="button"
            onClick={toggleShuffle}
            className={`p-1.5 transition ${shuffle ? "text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-900"}`}
          >
            <Shuffle className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={prev}
            className="p-1.5 text-zinc-700 hover:text-zinc-950 active:scale-95"
          >
            <SkipBack className="h-4 w-4 fill-current" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!current && activeSong) {
                playSong(activeSong, queue.length > 0 ? queue : songs);
              } else {
                toggle();
              }
            }}
            className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 text-white shadow-md transition hover:scale-105 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 translate-x-0.5 fill-current" />
            )}
          </button>
          <button
            type="button"
            onClick={next}
            className="p-1.5 text-zinc-700 hover:text-zinc-950 active:scale-95"
          >
            <SkipForward className="h-4 w-4 fill-current" />
          </button>
          <button
            type="button"
            onClick={cycleRepeat}
            className={`p-1.5 transition ${repeat !== "off" ? "text-zinc-950 font-bold" : "text-zinc-500 hover:text-zinc-900"}`}
          >
            {repeat === "one" ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Queue Section matching screenshot */}
      <div className="mt-5 min-h-0 flex-1 flex flex-col border-t border-black/5 pt-4 overflow-hidden">
        <div className="flex items-center justify-between pb-1 shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Next Up</p>
          <span className="text-[10px] text-zinc-400 font-medium">{upcomingQueue.length} tracks</span>
        </div>
        <div className="mt-2 flex-1 min-h-0 space-y-2 overflow-y-auto pr-1 no-scrollbar">
          {upcomingQueue.map((song) => (
            <button
              key={song.id}
              type="button"
              onClick={() => playSong(song, queue.length > 0 ? queue : songs)}
              className="group flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-black/5"
            >
              <Cover
                src={song.cover_url || song.album?.cover_url || song.artist?.image_url}
                title={song.title}
                className="h-10 w-10 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-zinc-900 group-hover:text-black">
                  {song.title}
                </p>
                <p className="truncate text-[11px] text-zinc-500">{song.artist?.name}</p>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                {song.duration_seconds ? formatTime(song.duration_seconds) : "2:40"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
