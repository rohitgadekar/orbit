"use client";

import { Cover } from "@/components/cover";
import { useMusic } from "@/context/music-context";
import type { RepeatMode, Song } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import Link from "next/link";
import {
  ChevronDown,
  Heart,
  ListMusic,
  Maximize2,
  Minimize2,
  Pause,
  Pencil,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function FullscreenPlayer({
  isOpen,
  onClose,
  current,
  isPlaying,
  progress,
  duration,
  volume,
  shuffle,
  repeat,
  queue,
  toggle,
  next,
  prev,
  seek,
  setVolume,
  toggleShuffle,
  cycleRepeat,
  onEditTrack,
  onPlaySong,
}: {
  isOpen: boolean;
  onClose: () => void;
  current: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: Song[];
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (val: number) => void;
  setVolume: (val: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  onEditTrack?: (song: Song) => void;
  onPlaySong?: (song: Song) => void;
}) {
  const { favouriteIds, toggleFavourite } = useMusic();
  const [showQueue, setShowQueue] = useState(false);
  const [dominantColors, setDominantColors] = useState<{
    primary: string;
    secondary: string;
    accent: string;
  }>({
    primary: "#bf5b30",
    secondary: "#4a1910",
    accent: "#e58a36",
  });
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const cover = current?.cover_url || current?.album?.cover_url || current?.artist?.image_url;
  const isFav = current ? favouriteIds.has(current.id) : false;

  // Extract dynamic colors from album art like YouTube Music
  useEffect(() => {
    if (!cover) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = cover;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = 40;
        canvas.height = 40;
        ctx.drawImage(img, 0, 0, 40, 40);

        const imgData = ctx.getImageData(0, 0, 40, 40).data;
        let rTotal = 0, gTotal = 0, bTotal = 0;
        let maxBrightness = 0;
        let bestR = 191, bestG = 91, bestB = 48;

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          rTotal += r;
          gTotal += g;
          bTotal += b;

          const sat = Math.max(r, g, b) - Math.min(r, g, b);
          if (sat > maxBrightness) {
            maxBrightness = sat;
            bestR = r;
            bestG = g;
            bestB = b;
          }
        }

        const count = imgData.length / 16;
        const avgR = Math.round(rTotal / count);
        const avgG = Math.round(gTotal / count);
        const avgB = Math.round(bTotal / count);

        setDominantColors({
          primary: `rgb(${bestR}, ${bestG}, ${bestB})`,
          secondary: `rgb(${Math.max(15, Math.round(avgR * 0.4))}, ${Math.max(12, Math.round(avgG * 0.4))}, ${Math.max(18, Math.round(avgB * 0.4))})`,
          accent: `rgb(${Math.min(255, Math.round(bestR * 1.2))}, ${Math.min(255, Math.round(bestG * 1.2))}, ${Math.min(255, Math.round(bestB * 1.1))})`,
        });
      } catch {
        // Fallback to warm amber palette if CORS prevents canvas read
        setDominantColors({
          primary: "#c86d38",
          secondary: "#2c150c",
          accent: "#f4a261",
        });
      }
    };
  }, [cover]);

  // Handle native browser full-screen toggle
  function toggleBrowserFullscreen() {
    if (!document.fullscreenElement) {
      void containerRef.current?.requestFullscreen().catch(() => { });
      setIsNativeFullscreen(true);
    } else {
      void document.exitFullscreen().catch(() => { });
      setIsNativeFullscreen(false);
    }
  }

  useEffect(() => {
    function onFsChange() {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (!isOpen || !current) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden text-white transition-all duration-700 animate-in fade-in"
      style={{
        backgroundColor: "#0d0c0e",
      }}
    >
      {/* Dynamic YouTube-style ambient gradient mesh background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Layer 1: Ambient blurred album art mirror */}
        {cover ? (
          <div
            className="ambient-layer absolute inset-[-20%] bg-cover bg-center opacity-45 blur-[120px] filter transition-all duration-1000"
            style={{ backgroundImage: `url(${cover})` }}
          />
        ) : null}

        {/* Layer 2: Dynamic radial glow 1 */}
        <div
          className="ambient-layer absolute -top-[20%] -left-[10%] h-[75vw] w-[75vw] rounded-full opacity-60 blur-[130px] transition-colors duration-1000"
          style={{ backgroundColor: dominantColors.primary }}
        />

        {/* Layer 3: Dynamic radial glow 2 */}
        <div
          className="ambient-layer absolute -bottom-[20%] -right-[10%] h-[80vw] w-[80vw] rounded-full opacity-50 blur-[140px] transition-colors duration-1000"
          style={{ backgroundColor: dominantColors.accent }}
        />

        {/* Layer 4: Deep ambient vignette overlay */}
        <div
          className="absolute inset-0 transition-colors duration-1000"
          style={{
            background: `radial-gradient(circle at 50% 50%, transparent 20%, rgba(10, 9, 12, 0.75) 75%, rgba(6, 6, 8, 0.95) 100%)`,
          }}
        />
      </div>

      {/* Top Header Navigation */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-[max(20px,var(--safe-top))] pb-4 md:px-12 md:pt-8">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-zinc-400/80">ORBIT</span>
        </div>

        <div className="hidden md:inline flex flex-col items-center text-center">
          <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-[#dbe878]">
            Now Playing
          </span>
          {current.album?.title ? (
            <Link
              href={`/albums/${encodeURIComponent(current.album.title)}`}
              onClick={onClose}
              className="text-xs font-medium text-zinc-300 hover:text-[#dbe878] hover:underline transition"
            >
              {current.album.title}
            </Link>
          ) : (
            <span className="text-xs font-medium text-zinc-400">Orbit Studio Catalog</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onEditTrack ? (
            <button
              type="button"
              onClick={() => onEditTrack(current)}
              className="rounded-full border border-white/10 bg-black/20 p-2.5 text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              title="Edit track details"
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setShowQueue(!showQueue)}
            className={`rounded-full border border-white/10 p-2.5 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white ${showQueue ? "bg-[#dbe878] text-zinc-950 font-bold" : "bg-black/20 text-zinc-300"
              }`}
            title="Playing Queue"
          >
            <ListMusic className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={toggleBrowserFullscreen}
            className="hidden rounded-full border border-white/10 bg-black/20 p-2.5 text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white sm:block"
            title="Toggle fullscreen display"
          >
            {isNativeFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Small rounded close button at right just like playlist and edit button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-black/20 p-2.5 text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white"
            title="Close full screen player"
            aria-label="Close"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-6 py-4 md:px-12">
        <div className="grid w-full items-center gap-8 md:grid-cols-12 md:gap-14">
          {/* Artwork Showcase */}
          <div className="flex justify-center md:col-span-6 lg:col-span-6">
            <div className="group relative aspect-square w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px]">
              {/* Dynamic ambient art drop-shadow */}
              <div
                className="absolute inset-4 rounded-[36px] opacity-75 blur-2xl transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
                style={{ backgroundColor: dominantColors.primary }}
              />

              {/* Cover Container */}
              <div className="relative h-full w-full overflow-hidden rounded-[36px] border border-white/20 bg-black/40 shadow-2xl backdrop-blur-sm">
                <Cover
                  src={cover}
                  title={current.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  playing={isPlaying}
                />

                {/* Animated Equalizer Overlay when playing */}
                {isPlaying ? (
                  <div className="absolute bottom-4 right-4 flex items-end gap-1 rounded-full bg-black/60 px-3 py-2 backdrop-blur-md">
                    <span className="eq-bar-1 inline-block w-1 rounded-full bg-[#dbe878]" />
                    <span className="eq-bar-2 inline-block w-1 rounded-full bg-[#dbe878]" />
                    <span className="eq-bar-3 inline-block w-1 rounded-full bg-[#dbe878]" />
                    <span className="eq-bar-4 inline-block w-1 rounded-full bg-[#dbe878]" />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Details & Controls */}
          <div className="flex flex-col justify-center md:col-span-6 lg:col-span-6">
            {/* Title & Artist */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[8px] md:text-[10px] font-semibold tracking-widest uppercase text-[#dbe878] backdrop-blur-sm">
                  Hi-Res Audio • Lossless
                </span>
                <h1 className="mt-3  text-xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                  {current.title}
                </h1>
                <p className="mt-2 text-base font-medium text-zinc-300 sm:text-md">
                  {current.artist?.name || "Unknown Artist"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void toggleFavourite(current.id)}
                className={`rounded-full border border-white/15 p-3.5 backdrop-blur-md transition ${isFav
                  ? "border-rose-500/50 bg-rose-500/20 text-rose-400"
                  : "bg-black/20 text-zinc-300 hover:border-white/30 hover:text-white"
                  }`}
                aria-label={isFav ? "Favorited" : "Add to favorites"}
              >
                <Heart className={`h-5 w-5 ${isFav ? "fill-rose-400" : ""}`} />
              </button>
            </div>

            {/* Scrubber Progress Bar */}
            <div className="fullscreen-range mt-8 w-full space-y-2">
              <input
                type="range"
                min={0}
                max={duration || current.duration_seconds || 1}
                step={0.1}
                value={Math.min(progress, duration || progress)}
                onChange={(e) => seek(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs font-mono font-medium text-zinc-400">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration || current.duration_seconds || 0)}</span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="mt-6 flex items-center justify-between gap-4 sm:justify-center sm:gap-8">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`rounded-full p-2.5 transition ${shuffle ? "text-[#dbe878]" : "text-zinc-400 hover:text-white"
                  }`}
                title="Shuffle"
              >
                <Shuffle className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={prev}
                className="rounded-full p-2.5 text-zinc-300 transition hover:scale-110 hover:text-white active:scale-95"
                title="Previous track"
              >
                <SkipBack className="h-7 w-7 fill-current" />
              </button>

              {/* Luminous Center Play Button */}
              <button
                type="button"
                onClick={toggle}
                className="relative grid h-20 w-20 place-items-center rounded-full bg-white text-zinc-950 shadow-2xl transition hover:scale-105 active:scale-95"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8 fill-zinc-950" />
                ) : (
                  <Play className="h-8 w-8 translate-x-0.5 fill-zinc-950" />
                )}
              </button>

              <button
                type="button"
                onClick={next}
                className="rounded-full p-2.5 text-zinc-300 transition hover:scale-110 hover:text-white active:scale-95"
                title="Next track"
              >
                <SkipForward className="h-7 w-7 fill-current" />
              </button>

              <button
                type="button"
                onClick={cycleRepeat}
                className={`rounded-full p-2.5 transition ${repeat !== "off" ? "text-[#dbe878]" : "text-zinc-400 hover:text-white"
                  }`}
                title="Repeat"
              >
                {repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
              </button>
            </div>

            {/* Volume Control (hidden on mobile as mobile devices use hardware buttons) */}
            <div className="mt-8 hidden md:flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
                className="text-zinc-400 hover:text-white"
              >
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <div className="fullscreen-range w-32 sm:w-44">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Queue Drawer */}
      {showQueue ? (
        <div className="relative z-20 mx-auto mb-6 w-full max-w-2xl px-6">
          <div className="rounded-[28px] border border-white/15 bg-black/60 p-5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-serif text-lg font-bold text-white">Next in Queue</h3>
              <span className="text-xs text-zinc-400">{queue.length} songs</span>
            </div>
            <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
              {queue.map((item, idx) => {
                const isActive = item.id === current.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (onPlaySong) onPlaySong(item);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${isActive ? "bg-white/15 text-[#dbe878]" : "text-zinc-300 hover:bg-white/5"
                      }`}
                  >
                    <span className="w-5 text-xs text-zinc-500">{idx + 1}</span>
                    <Cover
                      src={item.cover_url || item.album?.cover_url}
                      title={item.title}
                      className="h-9 w-9 rounded-lg"
                      playing={isActive && isPlaying}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{item.title}</p>
                      <p className="truncate text-[11px] text-zinc-400">{item.artist?.name}</p>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">
                      {item.duration_seconds ? formatTime(item.duration_seconds) : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Bottom Footer Details (hidden on mobile for cleaner interface) */}
      <footer className="relative z-10 hidden md:flex items-center justify-between px-6 pb-[max(16px,var(--safe-bottom))] text-[11px] text-zinc-400 md:px-12">
        <span>Orbit Audio Master • Studio Quality</span>
        <button
          type="button"
          onClick={() => onEditTrack?.(current)}
          className="text-[#dbe878] hover:underline"
        >
          Edit Track Metadata
        </button>
      </footer>
    </div>
  );
}
