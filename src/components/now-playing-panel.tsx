"use client";

import { Cover } from "@/components/cover";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { useOffline } from "@/context/offline-context";
import { usePip } from "@/context/pip-context";
import { usePlayer } from "@/context/player-context";
import { splitArtistNames } from "@/lib/artists";
import type { Song } from "@/lib/types";
import { formatTime, initials } from "@/lib/utils";
import {
  ArrowDownToLine,
  CheckCircle2,
  Heart,
  Loader2,
  Maximize2,
  PictureInPicture2,
  Pause,
  Pencil,
  Play,
  Repeat,
  Repeat1,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import Link from "next/link";

export function NowPlayingPanel({ onEditTrack }: { onEditTrack?: (song: Song) => void }) {
  const { isAdmin, profile, user } = useAuth();
  const pip = usePip();
  const { isDownloaded, toggleDownloadSong, downloadingSongIds } = useOffline();
  const {
    current, isPlaying, progress, duration, queue,
    toggle, next, prev, seek, shuffle, repeat,
    toggleShuffle, cycleRepeat, setExpanded, playSong,
  } = usePlayer();
  const { favouriteIds, toggleFavourite, songs, loading } = useMusic();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Listener";
  const activeSong = current ?? songs[0] ?? null;
  const list = queue.length > 0 ? queue : songs;
  const currentIndex = activeSong ? list.findIndex((s) => s.id === activeSong.id) : -1;
  const upcoming = list.length > 1
    ? list.slice(currentIndex + 1).concat(list.slice(0, Math.max(0, currentIndex))).slice(0, 12)
    : [];

  const coverOf = (s: Song) => s.cover_url || s.album?.cover_url || s.artist?.image_url;
  const isFav = activeSong ? favouriteIds.has(activeSong.id) : false;
  const total = duration || activeSong?.duration_seconds || 0;
  const pct = total ? Math.min(100, (progress / total) * 100) : 0;

  const openFullscreen = () => {
    if (!current && activeSong) playSong(activeSong, list);
    setExpanded(true);
  };

  return (
    <aside className="hidden w-80 shrink-0 flex-col overflow-hidden rounded-[28px] bg-[#222224] p-5 lg:flex xl:w-[22rem]">
      {/* Profile row */}
      <div className="flex items-center justify-between">
        <Link href="/profile" className="flex min-w-0 items-center gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="h-9 w-9 rounded-full object-cover ring-2 ring-white/10" />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-700 text-[11px] font-bold text-white">
              {initials(displayName)}
            </div>
          )}
          <span className="truncate text-xs font-semibold text-white">{displayName}</span>
        </Link>
        <Link
          href="/settings"
          title="Settings"
          className="grid h-8 w-8 place-items-center rounded-full bg-[#2c2c2f] text-zinc-400 transition hover:text-white"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {/* Title */}
      <div className="mt-8 flex items-baseline justify-between px-0.5">
        <h2 className="text-[28px] font-bold leading-none tracking-tight text-white">Coming Up</h2>
        <span className="text-sm text-zinc-400">
          {currentIndex >= 0 ? currentIndex + 1 : 0}/{list.length}
        </span>
      </div>

      {loading && songs.length === 0 ? (
        /* Loading skeleton — mirrors the track card + queue rows */
        <div className="animate-pulse" aria-hidden>
          {/* Current track card */}
          <div className="relative mt-10">
            <div className="absolute -top-7 left-1/2 z-20 h-14 w-14 -translate-x-1/2 rounded-full bg-[#38383b] ring-4 ring-[#222224]" />
            <div className="rounded-[28px] border border-white/5 bg-[#2c2c2f] px-4 pb-5 pt-10">
              <div className="mx-auto h-3.5 w-32 rounded-full bg-[#38383b]" />
              <div className="mx-auto mt-2 h-2.5 w-20 rounded-full bg-[#38383b]" />
              <div className="mt-5 flex items-center justify-center gap-5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`rounded-full bg-[#38383b] ${i === 2 ? "h-6 w-6" : "h-4 w-4"}`}
                  />
                ))}
              </div>
              <div className="mt-5 h-1 w-full rounded-full bg-[#38383b]" />
              <div className="mt-2 flex justify-between">
                <div className="h-2 w-6 rounded-full bg-[#38383b]" />
                <div className="h-2 w-6 rounded-full bg-[#38383b]" />
              </div>
            </div>
          </div>

          {/* Queue rows */}
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#2c2c2f] px-3 py-3"
                style={{ opacity: Math.max(0.35, 1 - i * 0.12) }}
              >
                <div className="h-9 w-9 shrink-0 rounded-xl bg-[#38383b]" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-2.5 w-3/4 rounded-full bg-[#38383b]" />
                  <div className="h-2 w-1/2 rounded-full bg-[#38383b]" />
                </div>
                <div className="h-2 w-6 rounded-full bg-[#38383b]" />
              </div>
            ))}
          </div>
        </div>
      ) : !activeSong ? (
        <p className="mt-10 text-center text-sm text-zinc-500">Select a song to start listening</p>
      ) : (
        <>
          {/* Current track card — blurred cover art as the card background */}
          <div className="relative mt-10">
            <div className="absolute -top-7 left-1/2 z-20 h-14 w-14 -translate-x-1/2 overflow-hidden rounded-full ring-4 ring-[#222224]">
              <Cover src={coverOf(activeSong)} title={activeSong.title} className="h-full w-full object-cover" playing={isPlaying} />
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-white/5 bg-[#2c2c2f] px-4 pb-5 pt-10 text-center">
              {/* Artwork background (player card only) */}
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                {coverOf(activeSong) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverOf(activeSong) ?? undefined}
                    alt=""
                    className="h-full w-full scale-150 object-cover opacity-90 blur-2xl saturate-150"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/45 to-black/65" />
              </div>

              <div className="absolute left-4 top-4 z-10 flex">
                <button
                  type="button"
                  onClick={() => void toggleFavourite(activeSong.id)}
                  aria-label="Favorite"
                  className="text-zinc-300 transition hover:text-white"
                >
                  <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-blue-500 text-blue-500" : ""}`} />
                </button>
              </div>
              <div className="absolute right-4 top-4 z-10 flex items-center gap-2.5 text-zinc-300">
                {isAdmin && onEditTrack ? (
                  <button type="button" onClick={() => onEditTrack(activeSong)} title="Edit track" className="transition hover:text-white">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button type="button" onClick={() => void toggleDownloadSong(activeSong)}
                  disabled={downloadingSongIds[activeSong.id] !== undefined}
                  title={isDownloaded(activeSong.id) ? "Downloaded (click to remove)" : "Save offline"}
                  className="transition hover:text-white">
                  {downloadingSongIds[activeSong.id] !== undefined ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isDownloaded(activeSong.id) ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                  ) : (
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                  )}
                </button>
                {pip.supported ? (
                  <button
                    type="button"
                    onClick={pip.toggle}
                    title={pip.isOpen ? "Close picture-in-picture" : "Picture-in-picture"}
                    aria-label="Picture-in-picture"
                    className={`transition hover:text-white ${pip.isOpen ? "text-blue-400" : ""}`}
                  >
                    <PictureInPicture2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button type="button" onClick={openFullscreen} title="Full screen" className="transition hover:text-white">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="relative z-10">
                <h3 className="truncate text-sm font-bold text-white drop-shadow">{activeSong.title}</h3>
                <div className="mt-0.5 truncate text-[11px] text-zinc-200">
                  {splitArtistNames(activeSong.artist?.name).map((name, i, arr) => (
                    <span key={name}>
                      <Link href={`/artists/${encodeURIComponent(name)}`} className="hover:text-white hover:underline">
                        {name}
                      </Link>
                      {i < arr.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>

                {/* Controls */}
                <div className="mt-4 flex items-center justify-center gap-5">
                  <button type="button" onClick={toggleShuffle} aria-label="Shuffle"
                    className={`grid h-5 w-5 place-items-center rounded-full ${shuffle ? "bg-blue-500 text-white" : "text-zinc-300 hover:text-white"}`}>
                    <Shuffle className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={prev} aria-label="Previous" className="text-zinc-200 hover:text-white active:scale-95">
                    <SkipBack className="h-4 w-4 fill-current" />
                  </button>
                  <button type="button"
                    onClick={() => (!current ? playSong(activeSong, list) : toggle())}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    className="text-white transition hover:scale-110 active:scale-95">
                    {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
                  </button>
                  <button type="button" onClick={next} aria-label="Next" className="text-zinc-200 hover:text-white active:scale-95">
                    <SkipForward className="h-4 w-4 fill-current" />
                  </button>
                  <button type="button" onClick={cycleRepeat} aria-label="Repeat"
                    className={`${repeat !== "off" ? "text-blue-400" : "text-zinc-300 hover:text-white"}`}>
                    {repeat === "one" ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <input
                    type="range"
                    min={0}
                    max={total || 1}
                    step={0.1}
                    value={Math.min(progress, total || progress)}
                    onChange={(e) => seek(Number(e.target.value))}
                    aria-label="Seek"
                    className="h-1 w-full cursor-pointer appearance-none rounded-full accent-[var(--accent)] [&::-webkit-slider-thumb]:bg-white! [&::-webkit-slider-thumb]:shadow-none! [&::-webkit-slider-thumb:hover]:shadow-none!"
                    style={{ background: `linear-gradient(to right,var(--accent,#3b82f6) ${pct}%,rgba(255,255,255,0.25) ${pct}%)` }}
                  />
                  <div className="mt-1 flex justify-between text-[9px] text-zinc-300">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Queue */}
          <div className="no-scrollbar mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
            {upcoming.map((song, i) => (
              <button
                key={song.id}
                type="button"
                onClick={() => playSong(song, list)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-[#2c2c2f] px-3 py-3 text-left transition hover:border-white/15 hover:bg-[#333336]"
                style={{ opacity: Math.max(0.35, 1 - i * 0.12) }}
              >
                <Cover src={coverOf(song)} title={song.title} className="h-9 w-9 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{song.title}</p>
                  <p className="truncate text-[10px] text-zinc-500">{song.artist?.name}</p>
                </div>
                <span className="text-[10px] text-zinc-500">
                  {song.duration_seconds ? formatTime(song.duration_seconds) : ""}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}