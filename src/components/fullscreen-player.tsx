"use client";

import { Cover } from "@/components/cover";
import { useMusic } from "@/context/music-context";
import { useOffline } from "@/context/offline-context";
import { usePip } from "@/context/pip-context";
import type { RepeatMode, Song } from "@/lib/types";
import { useLyrics } from "@/lib/use-lyrics";
import { formatTime } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowDownToLine,
  CheckCircle2,
  ChevronDown,
  Heart,
  ListMusic,
  Loader2,
  Maximize2,
  Minimize2,
  Music2,
  Pause,
  Pencil,
  PictureInPicture2,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  ExtractedColors,
  extractArtworkColors,
  getFallbackColors,
} from "@/lib/cover-colors";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarqueeText } from "./marquee-text";

interface LyricLineItemProps {
  time: number;
  text: string;
  isActive: boolean;
  isPast: boolean;
  accentColor: string;
  onSeek: (time: number) => void;
}

const LyricLineItem = memo(
  forwardRef<HTMLParagraphElement, LyricLineItemProps>(function LyricLineItem(
    { time, text, isActive, isPast, accentColor, onSeek },
    ref
  ) {
    if (!text) {
      return <div className="h-6" />;
    }

    return (
      <p
        ref={ref}
        onClick={() => onSeek(time)}
        className="cursor-pointer select-none transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] py-2.5 text-left active:scale-95 will-change-transform"
        style={{
          fontSize: "clamp(1.85rem, 3.4vw, 2.85rem)",
          fontWeight: 700,
          lineHeight: 1.28,
          letterSpacing: "-0.02em",
          color: isActive
            ? "#ffffff"
            : isPast
              ? "rgba(255, 255, 255, 0.28)"
              : "rgba(255, 255, 255, 0.45)",
          transform: isActive
            ? "scale(1.03) translateX(4px)"
            : "scale(1) translateX(0px)",
          transformOrigin: "left center",
          textShadow: isActive
            ? `0 0 35px ${accentColor || "#3b82f6"}bb, 0 0 70px ${accentColor || "#3b82f6"
            }44`
            : "none",
          filter: isActive ? "none" : isPast ? "blur(0.3px)" : "none",
        }}
      >
        {text}
      </p>
    );
  }),
  (prev, next) => {
    return (
      prev.isActive === next.isActive &&
      prev.isPast === next.isPast &&
      prev.text === next.text &&
      prev.time === next.time &&
      prev.accentColor === next.accentColor &&
      prev.onSeek === next.onSeek
    );
  }
);
LyricLineItem.displayName = "LyricLineItem";

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
  const { isDownloaded, toggleDownloadSong, downloadingSongIds } = useOffline();
  const pip = usePip();
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [rendered, setRendered] = useState(isOpen);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [isPresented, setIsPresented] = useState(false);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen && current) {
      setRendered(true);
    } else {
      setIsPresented(false);
    }
  }
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLParagraphElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Swipe gestures for mobile: swipe down to minimize, swipe left/right to change songs
  const touchStartRef = useRef<{ x: number; y: number; time: number; target: EventTarget | null } | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      target: e.target,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    const targetEl = touchStartRef.current.target as HTMLElement | null;
    if (targetEl && (targetEl.tagName === "INPUT" || targetEl.closest("input"))) {
      return;
    }

    const scrollContainer = targetEl?.closest(".overflow-y-auto");
    if (scrollContainer && scrollContainer.scrollTop > 0) {
      return;
    }

    // Interactive pull-down offset (dampened)
    if (deltaY > 0 && deltaY > Math.abs(deltaX) * 1.1) {
      setDragOffsetY(Math.min(deltaY * 0.7, 180));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;

    const touch = e.changedTouches[0];
    setDragOffsetY(0);
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const elapsed = Date.now() - start.time;

    const targetEl = start.target as HTMLElement | null;
    if (targetEl && (targetEl.tagName === "INPUT" || targetEl.closest("input"))) {
      return;
    }

    const scrollContainer = targetEl?.closest(".overflow-y-auto");
    const isScrolledDown = scrollContainer && scrollContainer.scrollTop > 0;

    // 1. Swipe down to minimize player
    if (!isScrolledDown && deltaY > 55 && deltaY > Math.abs(deltaX) * 1.2) {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(10);
        } catch { }
      }
      onClose();
      return;
    }

    // 2. Swipe horizontal (left = next, right = prev)
    const isQuickSwipe = elapsed < 450 && Math.abs(deltaX) > 40;
    const isLongSwipe = Math.abs(deltaX) > 75;

    if ((isQuickSwipe || isLongSwipe) && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      if (deltaX < 0) {
        // Swipe Left -> Next song
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(12);
          } catch { }
        }
        next();
      } else {
        // Swipe Right -> Previous song
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(12);
          } catch { }
        }
        prev();
      }
    }
  };

  // Up to next 10 songs from the current playing song for fast loading
  const upcomingQueue = useMemo(() => {
    if (!queue || queue.length === 0) return [];
    const currentIdx = current ? queue.findIndex((item) => item.id === current.id) : 0;
    const start = currentIdx >= 0 ? currentIdx : 0;
    // Current song + next 10 songs
    return queue.slice(start, start + 11);
  }, [queue, current]);

  // Smooth slide-up entrance and slide-down exit animation
  useEffect(() => {
    if (isOpen && current) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsPresented(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    } else {
      const timer = setTimeout(() => {
        setRendered(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, current]);

  // Close smoothly on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lyrics — fetched and synced to playback position
  const { state: lyricsState, activeIndex } = useLyrics(
    current?.title,
    current?.artist?.name,
    current?.duration_seconds,
    progress,
  );

  const handleSeekLyric = useCallback(
    (time: number) => {
      seek(time);
    },
    [seek]
  );

  // Auto-scroll active lyric line into center smoothly
  useEffect(() => {
    if (!showLyrics || activeIndex < 0 || !activeLyricRef.current) return;
    activeLyricRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [activeIndex, showLyrics, lyricsState.status]);

  // Reset scroll to top when song changes
  useEffect(() => {
    if (!lyricsContainerRef.current) return;
    lyricsContainerRef.current.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [current?.id]);

  const cover = current?.cover_url || current?.album?.cover_url || current?.artist?.image_url;
  const isFav = current ? favouriteIds.has(current.id) : false;
  const isSavedOffline = current ? isDownloaded(current.id) : false;
  const isCurrentlyDownloading = current ? downloadingSongIds[current.id] !== undefined : false;

  const trackTotal = duration || current?.duration_seconds || 0;
  const trackPct = trackTotal ? Math.min(100, (progress / trackTotal) * 100) : 0;
  const volPct = Math.round((volume ?? 1) * 100);

  // Dynamic colors strictly extracted from album/track cover image
  const [colors, setColors] = useState<ExtractedColors>(() =>
    getFallbackColors(current?.title || "Orbit")
  );

  // Dual-buffered backdrop image for flicker-free cross-fade transitions
  const [layers, setLayers] = useState<{
    active: "A" | "B";
    layerA: { src: string | null; opacity: number };
    layerB: { src: string | null; opacity: number };
  }>({
    active: "A",
    layerA: { src: cover || null, opacity: cover ? 0.65 : 0 },
    layerB: { src: null, opacity: 0 },
  });

  const activeCoverRef = useRef(cover || null);

  // Smooth cross-fade between album artworks on track changes
  useEffect(() => {
    if (cover === activeCoverRef.current) return;
    activeCoverRef.current = cover || null;

    if (!cover) {
      queueMicrotask(() => {
        setLayers((prev) => ({
          ...prev,
          layerA: { ...prev.layerA, opacity: 0 },
          layerB: { ...prev.layerB, opacity: 0 },
        }));
      });
      return;
    }

    let isCancelled = false;
    const img = new Image();
    img.src = cover;

    const crossFade = () => {
      if (isCancelled) return;
      setLayers((prev) => {
        const nextActive = prev.active === "A" ? "B" : "A";
        return {
          active: nextActive,
          layerA:
            nextActive === "A"
              ? { src: cover, opacity: 0.65 }
              : { ...prev.layerA, opacity: 0 },
          layerB:
            nextActive === "B"
              ? { src: cover, opacity: 0.65 }
              : { ...prev.layerB, opacity: 0 },
        };
      });
    };

    if (img.complete) {
      crossFade();
    } else {
      img.onload = crossFade;
      img.onerror = crossFade;
    }

    return () => {
      isCancelled = true;
    };
  }, [cover]);

  // Extract artwork colors without dropping previous colors (eliminates flicker)
  useEffect(() => {
    if (!current) return;
    let isCancelled = false;
    const seed = current.title || "Orbit";

    if (!cover) {
      queueMicrotask(() => {
        if (!isCancelled) {
          setColors(getFallbackColors(seed));
        }
      });
      return;
    }

    void extractArtworkColors(cover, seed).then((extracted) => {
      if (!isCancelled) {
        setColors(extracted);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [cover, current]);

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

  if (!rendered || !current) return null;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden font-sans text-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${isPresented
        ? "translate-y-0 opacity-100 scale-100"
        : "translate-y-full opacity-0 scale-95 pointer-events-none"
        }`}
      style={{
        backgroundColor: colors.ambientBase,
        transform: dragOffsetY > 0 ? `translate3d(0, ${dragOffsetY}px, 0)` : undefined,
      }}
    >
      {/* Dynamic YouTube-style ambient gradient mesh strictly derived from cover image */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Layer 1: Ambient blurred album art mirror with dual-buffer cross-fade */}
        {layers.layerA.src ? (
          <div
            className="ambient-layer absolute inset-[-30%] bg-cover bg-center transition-opacity duration-1000 ease-out"
            style={{
              backgroundImage: `url(${layers.layerA.src})`,
              filter: "blur(90px) saturate(1.75) contrast(1.1)",
              opacity: layers.layerA.opacity,
              transform: "scale(1.2)",
            }}
          />
        ) : null}

        {layers.layerB.src ? (
          <div
            className="ambient-layer absolute inset-[-30%] bg-cover bg-center transition-opacity duration-1000 ease-out"
            style={{
              backgroundImage: `url(${layers.layerB.src})`,
              filter: "blur(90px) saturate(1.75) contrast(1.1)",
              opacity: layers.layerB.opacity,
              transform: "scale(1.2)",
            }}
          />
        ) : null}

        {/* Layer 2: Top-Left Ambient Orb */}
        <div
          className="ambient-layer absolute -top-[25%] -left-[15%] h-[80vw] w-[80vw] rounded-full opacity-65 blur-[120px] transition-colors duration-1000 ease-out"
          style={{ backgroundColor: colors.spatial.topLeft || colors.palette.primary }}
        />

        {/* Layer 3: Top-Right Ambient Orb */}
        <div
          className="ambient-layer absolute -top-[25%] -right-[15%] h-[80vw] w-[80vw] rounded-full opacity-55 blur-[120px] transition-colors duration-1000 ease-out"
          style={{ backgroundColor: colors.spatial.topRight || colors.palette.secondary }}
        />

        {/* Layer 4: Bottom-Left Ambient Orb */}
        <div
          className="ambient-layer absolute -bottom-[25%] -left-[15%] h-[85vw] w-[85vw] rounded-full opacity-60 blur-[130px] transition-colors duration-1000 ease-out"
          style={{ backgroundColor: colors.spatial.bottomLeft || colors.palette.tertiary }}
        />

        {/* Layer 5: Bottom-Right Ambient Orb */}
        <div
          className="ambient-layer absolute -bottom-[25%] -right-[15%] h-[85vw] w-[85vw] rounded-full opacity-55 blur-[130px] transition-colors duration-1000 ease-out"
          style={{ backgroundColor: colors.spatial.bottomRight || colors.palette.quaternary }}
        />

        {/* Layer 6: Center Ambient Core Aura */}
        <div
          className="ambient-layer absolute top-1/2 left-1/2 h-[60vw] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-45 blur-[100px] transition-colors duration-1000 ease-out"
          style={{ backgroundColor: colors.spatial.center || colors.palette.primary }}
        />

        {/* Layer 7: Cinematic Radial Vignette (tinted to the app's #1a1a1c base) */}
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.15) 15%, rgba(26, 26, 28, 0.55) 65%, rgba(20, 20, 22, 0.94) 100%)",
          }}
        />

        {/* Layer 8: Vertical gradient scrim for flawless contrast on text & controls */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0, 0, 0, 0.45) 0%, transparent 18%, transparent 82%, rgba(0, 0, 0, 0.65) 100%)",
          }}
        />
      </div>

      {/* Top Header Navigation */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-[max(20px,var(--safe-top))] pb-4 md:px-12 md:pt-8">
        {/* Mobile pull down handle pill */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-1 w-9 rounded-full bg-white/30 md:hidden pointer-events-none" />

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-zinc-400/80">ORBIT</span>
        </div>

        {/* <div className="hidden md:inline flex flex-col items-center text-center">
          <span className="text-[10px] font-semibold tracking-[0.22em] uppercase text-blue-400">
            Now Playing {" "}
          </span>
          {current.album?.title ? (
            <Link
              href={`/albums/${encodeURIComponent(current.album.title)}`}
              onClick={onClose}
              className="!text-[10px] !font-semibold tracking-[0.22em] uppercase text-zinc-300 hover:text-blue-400 hover:underline"
            // className="!text-[12px] !font-semibold  text-zinc-300 hover:text-blue-400 hover:underline transition uppercase"
            >
              {current.album.title}
            </Link>
          ) : (
            <span className="text-xs font-medium text-zinc-400">Orbit Studio Catalog</span>
          )}
        </div> */}

        <div className="flex items-center gap-2">
          {onEditTrack ? (
            <button
              type="button"
              onClick={() => onEditTrack(current)}
              className="rounded-full   p-2.5 text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white"
              title="Edit track details"
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setShowLyrics(!showLyrics);
              if (showQueue) setShowQueue(false);
            }}
            className={`rounded-full   p-2.5 text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white ${showLyrics ? "bg-blue-500 text-white font-bold" : "text-zinc-300"
              }`}
            title="Lyrics"
          >
            <Music2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowQueue(!showQueue);
              if (showLyrics) setShowLyrics(false);
            }}
            className={`rounded-full   p-2.5 text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white ${showQueue ? "bg-blue-500 text-white font-bold" : "text-zinc-300"
              }`}
            title="Playing Queue"
          >
            <ListMusic className="h-4 w-4" />
          </button>

          {pip.supported ? (
            <button
              type="button"
              onClick={() => {
                pip.toggle();
                if (!pip.isOpen) onClose();
              }}
              className={`hidden rounded-full p-2.5 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white sm:block ${pip.isOpen ? "text-blue-400" : "text-zinc-300"
                }`}
              title={pip.isOpen ? "Close picture-in-picture" : "Picture-in-picture"}
              aria-label="Picture-in-picture"
            >
              <PictureInPicture2 className="h-4 w-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={toggleBrowserFullscreen}
            className="hidden rounded-full  p-2.5 text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white sm:block"
            title="Toggle fullscreen display"
          >
            {isNativeFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Small rounded close button at right just like playlist and edit button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2.5 text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white"
            title="Close full screen player"
            aria-label="Close"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main
        className={`relative z-10 mx-auto flex w-full ${showLyrics ? "max-w-6xl" : "max-w-5xl"
          } flex-1 items-center justify-center px-6 py-4 md:px-10 lg:px-12 transition-all duration-500`}
      >
        <div className="grid w-full items-center gap-8 md:grid-cols-12 md:gap-10 lg:gap-14">
          {/* Column 1: Artwork Showcase (when lyrics off) OR Live Synced Lyrics (when lyrics on) */}
          <div
            className={`flex justify-center ${showLyrics ? "md:col-span-7 lg:col-span-7" : "md:col-span-6 lg:col-span-6"
              } w-full transition-all duration-500`}
          >
            {!showLyrics ? (
              /* Big Album Artwork Showcase */
              <div className="group relative aspect-square w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px]">
                {/* Dynamic ambient art drop-shadow */}
                <div
                  className="absolute inset-4 rounded-[32px] opacity-75 blur-2xl transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
                  style={{ backgroundColor: colors.palette.primary }}
                />

                {/* Cover Container */}
                <div className="relative h-full w-full overflow-hidden rounded-[32px] border border-white/20 bg-black/40 shadow-2xl backdrop-blur-sm">
                  <Cover
                    src={cover}
                    title={current.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    playing={isPlaying}
                  />
                </div>
              </div>
            ) : (
              /* Live Synced Karaoke Lyrics Canvas (on mobile fills screen; on desktop takes left column) */
              <div className="relative h-[68vh] sm:h-[72vh] md:h-[62vh] max-h-[660px] w-full flex flex-col justify-center overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                {lyricsState.status === "loading" && (
                  <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <p className="text-base font-semibold text-zinc-400">Finding lyrics…</p>
                  </div>
                )}

                {lyricsState.status === "not-found" && (
                  <div className="flex flex-col items-center justify-center gap-4 text-center px-6">
                    <div className="grid h-16 w-16 place-items-center rounded-full backdrop-blur-md">
                      <Music2 className="h-7 w-7 text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-white">No lyrics available</h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        Lyrics aren&apos;t available for &ldquo;{current.title}&rdquo;
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLyrics(false)}
                      className="mt-2 rounded-full  px-5 py-2 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md transition hover:bg-white/20 hover:scale-105 active:scale-95"
                    >
                      View Album Art
                    </button>
                  </div>
                )}

                {lyricsState.status === "synced" && lyricsState.lines.length > 0 && (
                  <div
                    ref={lyricsContainerRef}
                    className="h-full w-full overflow-y-auto no-scrollbar py-28 px-3 sm:px-6 overscroll-contain scroll-smooth"
                    style={{
                      maskImage:
                        "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
                    }}
                  >
                    <div className="space-y-4">
                      {lyricsState.lines.map((line, i) => {
                        const isActive = i === activeIndex;
                        const isPast = i < activeIndex;

                        return (
                          <LyricLineItem
                            key={`${i}-${line.time}`}
                            ref={isActive ? activeLyricRef : null}
                            time={line.time}
                            text={line.text}
                            isActive={isActive}
                            isPast={isPast}
                            accentColor={colors.palette.primary || "#3b82f6"}
                            onSeek={handleSeekLyric}
                          />
                        );
                      })}
                      {/* Spacer so the last line can scroll comfortably to center */}
                      <div className="h-44" />
                    </div>
                  </div>
                )}

                {lyricsState.status === "plain" && lyricsState.text && (
                  <div
                    ref={lyricsContainerRef}
                    className="h-full w-full overflow-y-auto no-scrollbar py-20 px-4"
                    style={{
                      maskImage:
                        "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
                    }}
                  >
                    <div className="whitespace-pre-line text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight leading-relaxed text-zinc-200 select-text">
                      {lyricsState.text}
                    </div>
                    <div className="h-32" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 2: Album Art Showcase (when lyrics on) + Details & Controls */}
          <div
            className={`${showLyrics ? "hidden md:flex md:col-span-5 lg:col-span-5" : "flex md:col-span-6 lg:col-span-6"
              } flex-col justify-center transition-all duration-500`}
          >
            <div
              className={`w-full ${showLyrics
                ? "max-w-[300px] lg:max-w-[320px] mx-auto md:ml-auto md:mr-0"
                : "max-w-[480px] mx-auto md:mx-0"
                } flex flex-col justify-center`}
            >
              {/* Title & Artist & Action Buttons */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mt-1.5 w-full min-w-0 max-w-full overflow-hidden">
                    <MarqueeText
                      as="h1"
                      resetKey={`${current.id}-title`}
                      containerClassName={`w-full max-w-full ${showLyrics ? "h-8 sm:h-9 lg:h-10" : "h-9 sm:h-12 md:h-16"} flex items-center`}
                      className={`font-extrabold tracking-tight text-white py-0.5 ${showLyrics
                        ? "text-lg sm:text-xl lg:text-2xl leading-tight"
                        : "text-xl sm:text-3xl md:text-5xl leading-tight"
                        }`}
                    >
                      {current.title}
                    </MarqueeText>
                  </div>

                  {/* Fixed-height and width artist(s) with Spotify/Tidal style marquee */}
                  <div className="mt-0.5 w-full min-w-0 max-w-full overflow-hidden">
                    <MarqueeText
                      as="p"
                      resetKey={`${current.id}-artist`}
                      containerClassName={`w-full max-w-full ${showLyrics ? "h-6 sm:h-7" : "h-6 sm:h-8"} flex items-center`}
                      className={`font-semibold text-zinc-300 py-0.5 ${showLyrics ? "text-xs sm:text-sm leading-snug" : "text-sm sm:text-base leading-snug"
                        }`}
                    >
                      {current.artist?.name || "Unknown Artist"}
                    </MarqueeText>
                  </div>

                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void toggleDownloadSong(current)}
                    disabled={isCurrentlyDownloading}
                    className={`rounded-full  ${showLyrics ? "p-2.5 sm:p-3" : "p-3.5"
                      } backdrop-blur-md transition ${isSavedOffline
                        ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
                        : "text-zinc-300 hover:border-white/30 hover:text-white"
                      }`}
                    aria-label={isSavedOffline ? "Saved offline" : "Save offline"}
                    title={isSavedOffline ? "Saved offline (tap to remove)" : "Save song offline"}
                  >
                    {isCurrentlyDownloading ? (
                      <Loader2 className={`${showLyrics ? "h-4 w-4" : "h-5 w-5"} animate-spin text-blue-400`} />
                    ) : isSavedOffline ? (
                      <CheckCircle2 className={`${showLyrics ? "h-4 w-4" : "h-5 w-5"} fill-blue-500 text-white`} />
                    ) : (
                      <ArrowDownToLine className={`${showLyrics ? "h-4 w-4" : "h-5 w-5"}`} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => void toggleFavourite(current.id)}
                    className={`rounded-full ${showLyrics ? "p-2.5 sm:p-3" : "p-3.5"
                      } backdrop-blur-md transition-all active:scale-75 ${isFav
                        ? "border-rose-500/50 bg-rose-500/20 text-rose-400"
                        : "text-zinc-300 hover:border-white/30 hover:text-white"
                      }`}
                    aria-label={isFav ? "Favorited" : "Add to favorites"}
                  >
                    <Heart className={`${showLyrics ? "h-4 w-4" : "h-5 w-5"} transition-transform duration-200 ${isFav ? "fill-rose-400 scale-110" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Scrubber Progress Bar */}
              <div className={`${showLyrics ? "mt-5" : "mt-8"} w-full space-y-2`}>
                <input
                  type="range"
                  min={0}
                  max={trackTotal || 1}
                  step={0.1}
                  value={Math.min(progress, trackTotal || progress)}
                  onChange={(e) => seek(Number(e.target.value))}
                  aria-label="Seek"
                  className="h-1 w-full cursor-pointer appearance-none rounded-full accent-[var(--accent)] [&::-webkit-slider-thumb]:bg-white! [&::-webkit-slider-thumb]:shadow-none! [&::-webkit-slider-thumb:hover]:shadow-none!"
                  style={{
                    background: `linear-gradient(to right,var(--accent,#3b82f6) ${trackPct}%,rgba(255,255,255,0.25) ${trackPct}%)`,
                  }}
                />
                <div className="flex justify-between text-xs tabular-nums font-semibold text-zinc-400">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(trackTotal)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className={`${showLyrics ? "mt-4" : "mt-6"} flex items-center justify-between gap-4 sm:justify-center ${showLyrics ? "sm:gap-6" : "sm:gap-8"}`}>
                <button
                  type="button"
                  onClick={toggleShuffle}
                  className={`rounded-full p-2.5 transition ${shuffle ? "text-blue-400" : "text-zinc-400 hover:text-white"
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
                  className={`relative grid shrink-0 flex-none ${showLyrics ? "h-16 w-16" : "h-20 w-20"} place-items-center rounded-full bg-white text-zinc-950 shadow-2xl transition hover:scale-105 active:scale-95`}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className={`${showLyrics ? "h-7 w-7" : "h-8 w-8"} fill-zinc-950`} />
                  ) : (
                    <Play className={`${showLyrics ? "h-7 w-7" : "h-8 w-8"} translate-x-0.5 fill-zinc-950`} />
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
                  className={`rounded-full p-2.5 transition ${repeat !== "off" ? "text-blue-400" : "text-zinc-400 hover:text-white"
                    }`}
                  title="Repeat"
                >
                  {repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                </button>
              </div>

              {/* Volume Control (hidden on mobile as mobile devices use hardware buttons) */}
              <div className={`${showLyrics ? "mt-5" : "mt-8"} hidden md:flex items-center justify-center gap-3`}>
                <button
                  type="button"
                  onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
                  className="text-zinc-400 hover:text-white"
                >
                  {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <div className="w-32 sm:w-44">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    aria-label="Volume"
                    className="h-1 w-full cursor-pointer appearance-none rounded-full accent-[var(--accent)] [&::-webkit-slider-thumb]:bg-white! [&::-webkit-slider-thumb]:shadow-none! [&::-webkit-slider-thumb:hover]:shadow-none!"
                    style={{
                      background: `linear-gradient(to right,var(--accent,#3b82f6) ${volPct}%,rgba(255,255,255,0.25) ${volPct}%)`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Queue Sheet Modal — fixed overlay, never shifts layout */}
      {showQueue ? (
        <>
          {/* Backdrop scrim */}
          <div
            className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300"
            onClick={() => setShowQueue(false)}
            aria-hidden="true"
          />

          {/* Sheet panel — absolute within the fixed fullscreen container so overflow-hidden doesn't clip it */}
          <div
            className="absolute inset-x-0 bottom-0 z-40 px-4 sm:px-6 animate-in slide-in-from-bottom-4 duration-300 ease-out"
            style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }}
          >
            <div
              className="mx-auto w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden"
              style={{
                // background: "rgba(26, 26, 28, 0.88)",
                backdropFilter: "blur(48px) saturate(1.6)",
              }}
            >
              {/* Drag handle pill */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-white/25" />
              </div>

              {/* Track list — showing only next 10 songs from current for instant performance */}
              <div className="overflow-y-auto px-3 pt-2 pb-3 no-scrollbar" style={{ maxHeight: "min(55vh, 420px)" }}>
                {upcomingQueue.map((item, idx) => {
                  const isActive = item.id === current.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (onPlaySong) onPlaySong(item);
                        setShowQueue(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-150 ${isActive
                        ? "bg-blue-500/15 text-blue-400"
                        : "text-zinc-300 hover:bg-white/6 active:bg-white/10"
                        }`}
                    >
                      {/* Index or now-playing indicator */}
                      <span className="w-5 shrink-0 text-center">
                        {isActive && isPlaying ? (
                          <span className="flex h-3 items-end gap-[2px] justify-center">
                            <i className="eq-bar-1 inline-block w-[3px] rounded-full bg-blue-500" />
                            <i className="eq-bar-2 inline-block w-[3px] rounded-full bg-blue-500" />
                            <i className="eq-bar-3 inline-block w-[3px] rounded-full bg-blue-500" />
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-600">{idx + 1}</span>
                        )}
                      </span>

                      <Cover
                        src={item.cover_url || item.album?.cover_url}
                        title={item.title}
                        className="h-10 w-10 shrink-0 rounded-xl"
                      />

                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[13px] font-semibold leading-tight ${isActive ? "text-blue-400" : "text-white"
                          }`}>
                          {item.title}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500 mt-0.5">{item.artist?.name}</p>
                      </div>

                      <span className="shrink-0 tabular-nums text-[11px] text-zinc-600">
                        {item.duration_seconds ? formatTime(item.duration_seconds) : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Bottom Footer Details (hidden on mobile for cleaner interface) */}
      <footer className="relative z-10 hidden md:flex items-center justify-center px-6 pb-[max(16px,var(--safe-bottom))] text-[11px] text-zinc-400 md:px-12">
        <div className="hidden md:inline flex flex-col items-center text-center">
          <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-400">
            Now Playing {"● "}
          </span>
          {current.album?.title ? (
            <Link
              href={`/albums/${encodeURIComponent(current.album.title)}`}
              onClick={onClose}
              className="!text-[10px] !font-semibold tracking-[0.22em] uppercase text-zinc-300 hover:text-blue-400 hover:underline"
            >
              {current.album.title}
            </Link>
          ) : (
            <span className="text-xs font-medium text-zinc-400">Orbit Studio Catalog</span>
          )}
        </div>
      </footer>
    </div>
  );
}