"use client";

import { Cover } from "@/components/cover";
import { useMusic } from "@/context/music-context";
import { useOffline } from "@/context/offline-context";
import {
  ExtractedColors,
  extractArtworkColors,
  getFallbackColors,
} from "@/lib/cover-colors";
import type { RepeatMode, Song } from "@/lib/types";
import { useLyrics } from "@/lib/use-lyrics";
import { formatTime } from "@/lib/utils";
import {
  ArrowDownToLine,
  CheckCircle2,
  ChevronDown,
  Heart,
  Loader2,
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
import Link from "next/link";
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarqueeText } from "./marquee-text";

type View = "player" | "lyrics" | "queue";

/* ───────────────────────── Lyric line ───────────────────────── */

interface LyricLineItemProps {
  time: number;
  text: string;
  isActive: boolean;
  isPast: boolean;
  glow: string;
  onSeek: (time: number) => void;
}

const LyricLineItem = memo(
  forwardRef<HTMLParagraphElement, LyricLineItemProps>(function LyricLineItem(
    { time, text, isActive, isPast, glow, onSeek },
    ref,
  ) {
    if (!text) return <div className="h-5" />;
    return (
      <p
        ref={ref}
        onClick={() => onSeek(time)}
        className="cursor-pointer select-none py-2 text-left font-bold leading-[1.25] tracking-tight transition-all duration-500 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.98]"
        style={{
          fontSize: "clamp(1.45rem, 2.6vw, 2.35rem)",
          color: isActive ? "#ffffff" : isPast ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.5)",
          transform: isActive ? "scale(1.02) translateX(3px)" : "none",
          transformOrigin: "left center",
          textShadow: isActive ? `0 0 32px ${glow}99` : "none",
        }}
      >
        {text}
      </p>
    );
  }),
  (a, b) =>
    a.isActive === b.isActive &&
    a.isPast === b.isPast &&
    a.text === b.text &&
    a.time === b.time &&
    a.glow === b.glow &&
    a.onSeek === b.onSeek,
);
LyricLineItem.displayName = "LyricLineItem";

/* ───────────────────────── Player ───────────────────────── */

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

  // "player" is the mobile-only main view. On desktop, "player" falls back to lyrics in the side panel.
  const [view, setView] = useState<View>("player");
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [rendered, setRendered] = useState(isOpen);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [isPresented, setIsPresented] = useState(false);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen && current) setRendered(true);
    else setIsPresented(false);
  }

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lyricsScrollRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLParagraphElement | null>(null);

  /* ── Swipe gestures (mobile): down = minimise, left/right = next/prev ── */
  const touchStartRef = useRef<{ x: number; y: number; time: number; target: EventTarget | null } | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const buzz = (ms: number) => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
    } catch { }
  };
  const isInteractive = (t: HTMLElement | null) => !!t && (t.tagName === "INPUT" || !!t.closest("input, button, a"));

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now(), target: e.target };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const s = touchStartRef.current;
    if (!s || e.touches.length !== 1) return;
    const el = s.target as HTMLElement | null;
    if (isInteractive(el)) return;
    const sc = el?.closest(".overflow-y-auto");
    if (sc && sc.scrollTop > 0) return;
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    if (dy > 0 && dy > Math.abs(dx) * 1.1) setDragOffsetY(Math.min(dy * 0.7, 180));
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const s = touchStartRef.current;
    touchStartRef.current = null;
    setDragOffsetY(0);
    const t = e.changedTouches[0];
    if (!s || !t) return;
    const el = s.target as HTMLElement | null;
    if (isInteractive(el)) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    const elapsed = Date.now() - s.time;
    const sc = el?.closest(".overflow-y-auto");
    const scrolled = sc && sc.scrollTop > 0;

    if (!scrolled && dy > 55 && dy > Math.abs(dx) * 1.2) {
      buzz(10);
      onClose();
      return;
    }
    // Horizontal swipes only change track on the main player view (lyrics/queue scroll instead)
    if (view !== "player") return;
    const quick = elapsed < 450 && Math.abs(dx) > 40;
    const long = Math.abs(dx) > 75;
    if ((quick || long) && Math.abs(dx) > Math.abs(dy) * 1.25) {
      buzz(12);
      if (dx < 0) next();
      else prev();
    }
  };

  /* ── Queue: current + next 30 ── */
  const upcomingQueue = useMemo(() => {
    if (!queue || queue.length === 0) return [];
    const idx = current ? queue.findIndex((s) => s.id === current.id) : 0;
    const start = idx >= 0 ? idx : 0;
    return queue.slice(start, start + 31);
  }, [queue, current]);
  const queuePosition = useMemo(() => {
    if (!current) return 0;
    const idx = queue.findIndex((s) => s.id === current.id);
    return idx >= 0 ? idx + 1 : 0;
  }, [queue, current]);

  /* ── Enter / exit animation ── */
  useEffect(() => {
    if (isOpen && current) {
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setIsPresented(true)));
      return () => cancelAnimationFrame(raf);
    }
    const timer = setTimeout(() => setRendered(false), 500);
    return () => clearTimeout(timer);
  }, [isOpen, current]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  /* ── Lyrics ── */
  const { state: lyricsState, activeIndex } = useLyrics(
    current?.title,
    current?.artist?.name,
    current?.duration_seconds,
    progress,
  );
  const handleSeekLyric = useCallback((t: number) => seek(t), [seek]);

  // Lyrics are only offered when this track actually has them; otherwise "Up next" is shown instead.
  const hasLyrics =
    (lyricsState.status === "synced" && lyricsState.lines.length > 0) ||
    (lyricsState.status === "plain" && Boolean(lyricsState.text));
  const effView: View = view === "lyrics" && !hasLyrics ? "queue" : view;

  // Centre the active line inside the lyrics scroller (does not scroll ancestors).
  // Lyrics state and playback position keep updating while the player is minimised, so when
  // the scroller is freshly mounted (reopen, or switching tabs) we jump straight to the
  // current line instead of animating down from the top.
  const lastScrollBoxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const box = lyricsScrollRef.current;
    const el = activeLyricRef.current;
    if (!box) {
      lastScrollBoxRef.current = null;
      return;
    }
    if (!el || activeIndex < 0) return;
    const freshlyMounted = box !== lastScrollBoxRef.current;
    lastScrollBoxRef.current = box;
    box.scrollTo({
      top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2,
      behavior: freshlyMounted ? "instant" : "smooth",
    });
  }, [activeIndex, effView, lyricsState.status, rendered, isPresented]);

  // New song: start the (new) lyrics from the top
  useEffect(() => {
    lyricsScrollRef.current?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [current?.id]);

  /* ── Artwork, colours, cross-fading backdrop ── */
  const cover = current?.cover_url || current?.album?.cover_url || current?.artist?.image_url;
  const isFav = current ? favouriteIds.has(current.id) : false;
  const isSavedOffline = current ? isDownloaded(current.id) : false;
  const isDownloading = current ? downloadingSongIds[current.id] !== undefined : false;

  const [colors, setColors] = useState<ExtractedColors>(() => getFallbackColors(current?.title || "Orbit"));
  const [layers, setLayers] = useState<{
    active: "A" | "B";
    layerA: { src: string | null; opacity: number };
    layerB: { src: string | null; opacity: number };
  }>({
    active: "A",
    layerA: { src: cover || null, opacity: cover ? 0.6 : 0 },
    layerB: { src: null, opacity: 0 },
  });
  const activeCoverRef = useRef(cover || null);

  useEffect(() => {
    if (cover === activeCoverRef.current) return;
    activeCoverRef.current = cover || null;
    if (!cover) {
      queueMicrotask(() =>
        setLayers((p) => ({ ...p, layerA: { ...p.layerA, opacity: 0 }, layerB: { ...p.layerB, opacity: 0 } })),
      );
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.src = cover;
    const fade = () => {
      if (cancelled) return;
      setLayers((p) => {
        const n = p.active === "A" ? "B" : "A";
        return {
          active: n,
          layerA: n === "A" ? { src: cover, opacity: 0.6 } : { ...p.layerA, opacity: 0 },
          layerB: n === "B" ? { src: cover, opacity: 0.6 } : { ...p.layerB, opacity: 0 },
        };
      });
    };
    if (img.complete) fade();
    else {
      img.onload = fade;
      img.onerror = fade;
    }
    return () => {
      cancelled = true;
    };
  }, [cover]);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    const seed = current.title || "Orbit";
    if (!cover) {
      queueMicrotask(() => !cancelled && setColors(getFallbackColors(seed)));
      return;
    }
    void extractArtworkColors(cover, seed).then((c) => !cancelled && setColors(c));
    return () => {
      cancelled = true;
    };
  }, [cover, current]);

  /* ── Native fullscreen ── */
  function toggleBrowserFullscreen() {
    if (!document.fullscreenElement) void containerRef.current?.requestFullscreen().catch(() => { });
    else void document.exitFullscreen().catch(() => { });
  }
  useEffect(() => {
    const onFs = () => setIsNativeFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  if (!rendered || !current) return null;

  const total = duration || current.duration_seconds || 0;
  const pct = total ? Math.min(100, (progress / total) * 100) : 0;
  const volPct = Math.round(volume * 100);
  const glow = colors.palette.primary || "#3b82f6";
  const panelView: "lyrics" | "queue" = effView === "queue" || !hasLyrics ? "queue" : "lyrics";

  /* ── Shared pieces ── */
  const iconBtn =
    "grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/25 text-zinc-300 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white";

  const renderSegmented = ({ options, value, onChange, className = "" }: {
    options: { id: View; label: string }[];
    value: View;
    onChange: (v: View) => void;
    className?: string;
  }) => (
    <div className={`items-center gap-1 rounded-full border border-white/10 bg-black/25 p-1 backdrop-blur-md ${className}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${value === o.id ? "bg-white text-zinc-950" : "text-zinc-300 hover:text-white"
            }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const renderScrubber = (className = "") => (
    <div className={`fullscreen-range w-full ${className}`}>
      <input
        type="range"
        min={0}
        max={total || 1}
        step={0.1}
        value={Math.min(progress, total || progress)}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="Seek"
        className="h-1 w-full cursor-pointer"
        style={{ background: `linear-gradient(to right,#ffffff ${pct}%,rgba(255,255,255,0.22) ${pct}%)` }}
      />
      <div className="mt-2 flex justify-between text-[11px] font-medium tabular-nums text-zinc-400">
        <span>{formatTime(progress)}</span>
        <span>{formatTime(total)}</span>
      </div>
    </div>
  );

  /* ── Lyrics panel body ── */
  const lyricsBody = (
    <div className="relative min-h-0 flex-1">
      {lyricsState.status === "loading" && (
        <p className="absolute inset-0 grid place-items-center text-sm font-semibold text-zinc-400">Finding lyrics…</p>
      )}
      {lyricsState.status === "synced" && lyricsState.lines.length > 0 && (
        <div
          ref={lyricsScrollRef}
          className="no-scrollbar relative h-full overflow-y-auto overscroll-contain px-5 py-[30%] sm:px-8"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
          }}
        >
          {lyricsState.lines.map((line, i) => (
            <LyricLineItem
              key={`${i}-${line.time}`}
              ref={i === activeIndex ? activeLyricRef : null}
              time={line.time}
              text={line.text}
              isActive={i === activeIndex}
              isPast={i < activeIndex}
              glow={glow}
              onSeek={handleSeekLyric}
            />
          ))}
        </div>
      )}
      {lyricsState.status === "plain" && lyricsState.text && (
        <div
          ref={lyricsScrollRef}
          className="no-scrollbar h-full overflow-y-auto overscroll-contain px-5 py-10 sm:px-8"
        >
          <div className="select-text whitespace-pre-line text-lg font-bold leading-relaxed text-zinc-200 sm:text-xl lg:text-2xl">
            {lyricsState.text}
          </div>
        </div>
      )}
    </div>
  );

  /* ── Queue panel body ── */
  const queueBody = (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 sm:px-3">
      {upcomingQueue.map((item, idx) => {
        const active = item.id === current.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onPlaySong?.(item);
              if (typeof window !== "undefined" && window.innerWidth < 1024) setView("player");
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-white/10" : "hover:bg-white/5 active:bg-white/10"
              }`}
          >
            <span className="w-5 shrink-0 text-center">
              {active && isPlaying ? (
                <span className="flex h-3 items-end justify-center gap-[2px]">
                  <i className="eq-bar-1 inline-block w-[3px] rounded-full bg-blue-400" />
                  <i className="eq-bar-2 inline-block w-[3px] rounded-full bg-blue-400" />
                  <i className="eq-bar-3 inline-block w-[3px] rounded-full bg-blue-400" />
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500">{idx + 1}</span>
              )}
            </span>
            <Cover
              src={item.cover_url || item.album?.cover_url || item.artist?.image_url}
              title={item.title}
              className="h-11 w-11 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-semibold ${active ? "text-blue-400" : "text-white"}`}>{item.title}</p>
              <p className="truncate text-xs text-zinc-400">{item.artist?.name}</p>
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">
              {item.duration_seconds ? formatTime(item.duration_seconds) : ""}
            </span>
          </button>
        );
      })}
    </div>
  );

  /* ───────────────────────── Render ───────────────────────── */
  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`fixed inset-0 z-50 flex flex-col overflow-hidden text-white transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${isPresented ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-full scale-95 opacity-0"
        }`}
      style={{
        backgroundColor: colors.ambientBase,
        transform: dragOffsetY > 0 ? `translate3d(0, ${dragOffsetY}px, 0)` : undefined,
      }}
    >
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[layers.layerA, layers.layerB].map((l, i) =>
          l.src ? (
            <div
              key={i}
              className="ambient-layer absolute inset-[-30%] bg-cover bg-center transition-opacity duration-1000 ease-out"
              style={{
                backgroundImage: `url(${l.src})`,
                filter: "blur(90px) saturate(1.7) contrast(1.1)",
                opacity: l.opacity,
                transform: "scale(1.2)",
              }}
            />
          ) : null,
        )}
        <div
          className="ambient-layer absolute -left-[15%] -top-[25%] h-[80vw] w-[80vw] rounded-full opacity-60 blur-[120px] transition-colors duration-1000"
          style={{ backgroundColor: colors.spatial.topLeft || colors.palette.primary }}
        />
        <div
          className="ambient-layer absolute -bottom-[25%] -right-[15%] h-[85vw] w-[85vw] rounded-full opacity-55 blur-[130px] transition-colors duration-1000"
          style={{ backgroundColor: colors.spatial.bottomRight || colors.palette.quaternary }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgba(0,0,0,0.15) 10%, rgba(6,6,9,0.6) 65%, rgba(4,4,6,0.94) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 18%, transparent 78%, rgba(0,0,0,0.6) 100%)",
          }}
        />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(14px,var(--safe-top))] sm:px-6 lg:px-10 lg:pt-6">
        <div className="pointer-events-none absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-white/30 lg:hidden" />

        <button type="button" onClick={onClose} className={iconBtn} title="Minimise player" aria-label="Close player">
          <ChevronDown className="h-5 w-5" />
        </button>

        {/* Mobile / tablet view switcher */}
        {renderSegmented({
          className: "flex lg:hidden",
          value: effView,
          onChange: setView,
          options: [
            { id: "player", label: "Player" },
            ...(hasLyrics ? [{ id: "lyrics" as const, label: "Lyrics" }] : []),
            { id: "queue", label: "Up next" },
          ],
        })}

        {/* Desktop: playing-from label */}
        <div className="hidden min-w-0 flex-col items-center text-center lg:flex">
          <span className="text-[11px] font-semibold text-zinc-400">Now playing</span>
          {current.album?.title ? (
            <Link
              href={`/albums/${encodeURIComponent(current.album.title)}`}
              onClick={onClose}
              className="max-w-[320px] truncate text-sm font-semibold text-white hover:underline"
            >
              {current.album.title}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-white">Orbit</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onEditTrack ? (
            <button type="button" onClick={() => onEditTrack(current)} className={iconBtn} title="Edit track" aria-label="Edit track">
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggleBrowserFullscreen}
            className={`${iconBtn} hidden sm:grid`}
            title="Toggle fullscreen"
            aria-label="Toggle fullscreen"
          >
            {isNativeFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col px-4 sm:px-6 lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:gap-10 lg:px-10 xl:gap-16">
        {/* Left: artwork + info + controls */}
        <section
          className={`no-scrollbar min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(16px,3dvh,32px)] overflow-y-auto pb-[max(16px,var(--safe-bottom))] pt-2 lg:flex lg:pb-6 ${effView === "player" ? "flex" : "hidden"
            }`}
        >
          {/* Artwork */}
          <div className="group relative aspect-square w-[min(76vw,34dvh)] shrink-0 sm:w-[min(60vw,36dvh)] lg:w-[min(30vw,42dvh)] xl:w-[min(28vw,46dvh)]">
            <div
              className="absolute inset-4 rounded-[28px] opacity-70 blur-2xl transition-all duration-700 group-hover:opacity-100"
              style={{ backgroundColor: colors.palette.primary }}
            />
            <div className="relative h-full w-full overflow-hidden rounded-[22px] border border-white/15 bg-black/40 shadow-2xl sm:rounded-[28px]">
              <Cover
                src={cover}
                title={current.title}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                playing={isPlaying}
              />
            </div>
          </div>

          {/* Info + controls */}
          <div className="w-full max-w-[440px] shrink-0 lg:max-w-[480px]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <MarqueeText
                  as="h1"
                  resetKey={`${current.id}-title`}
                  containerClassName="w-full max-w-full h-8 sm:h-10 flex items-center"
                  className="py-0.5 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl"
                >
                  {current.title}
                </MarqueeText>
                <MarqueeText
                  as="p"
                  resetKey={`${current.id}-artist`}
                  containerClassName="w-full max-w-full h-6 sm:h-7 flex items-center"
                  className="py-0.5 text-sm font-medium leading-snug text-zinc-300 sm:text-base"
                >
                  {current.artist?.name || "Unknown Artist"}
                </MarqueeText>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleDownloadSong(current)}
                  disabled={isDownloading}
                  className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-md transition ${isSavedOffline
                    ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
                    : "border-white/15 bg-black/25 text-zinc-300 hover:border-white/30 hover:text-white"
                    }`}
                  aria-label={isSavedOffline ? "Saved offline" : "Save offline"}
                  title={isSavedOffline ? "Saved offline (tap to remove)" : "Save offline"}
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  ) : isSavedOffline ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ArrowDownToLine className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleFavourite(current.id)}
                  className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-md transition active:scale-90 ${isFav
                    ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
                    : "border-white/15 bg-black/25 text-zinc-300 hover:border-white/30 hover:text-white"
                    }`}
                  aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart className={`h-4 w-4 ${isFav ? "fill-blue-400" : ""}`} />
                </button>
              </div>
            </div>

            {renderScrubber("mt-[clamp(14px,2.6dvh,28px)]")}

            {/* Transport */}
            <div className="mt-[clamp(12px,2.4dvh,28px)] flex items-center justify-between sm:justify-center sm:gap-7">
              <button
                type="button"
                onClick={toggleShuffle}
                className={`p-2.5 transition ${shuffle ? "text-blue-400" : "text-zinc-400 hover:text-white"}`}
                title="Shuffle"
                aria-label="Shuffle"
              >
                <Shuffle className="h-5 w-5" />
              </button>
              <button type="button" onClick={prev} className="p-2.5 text-white transition hover:scale-110 active:scale-95" title="Previous" aria-label="Previous">
                <SkipBack className="h-7 w-7 fill-current" />
              </button>
              <button
                type="button"
                onClick={toggle}
                className="grid h-[clamp(60px,9dvh,76px)] w-[clamp(60px,9dvh,76px)] shrink-0 place-items-center rounded-full bg-white text-zinc-950 shadow-2xl transition hover:scale-105 active:scale-95"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 translate-x-0.5 fill-current" />}
              </button>
              <button type="button" onClick={next} className="p-2.5 text-white transition hover:scale-110 active:scale-95" title="Next" aria-label="Next">
                <SkipForward className="h-7 w-7 fill-current" />
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                className={`p-2.5 transition ${repeat !== "off" ? "text-blue-400" : "text-zinc-400 hover:text-white"}`}
                title="Repeat"
                aria-label="Repeat"
              >
                {repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
              </button>
            </div>

            {/* Volume (hidden on touch-sized screens; they use hardware buttons) */}
            <div className="fullscreen-range mt-[clamp(20px,4dvh,40px)] hidden items-center justify-center gap-3 md:flex">
              <button
                type="button"
                onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
                className="text-zinc-400 transition hover:text-white"
                aria-label={volume === 0 ? "Unmute" : "Mute"}
              >
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="h-1 w-40 cursor-pointer"
                style={{ background: `linear-gradient(to right,#ffffff ${volPct}%,rgba(255,255,255,0.22) ${volPct}%)` }}
              />
            </div>
          </div>
        </section>

        {/* Right: lyrics / queue panel (full view on mobile, side card on desktop) */}
        <section
          className={`min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-black/25 backdrop-blur-xl lg:mb-6 lg:flex lg:flex-none ${effView === "player" ? "hidden" : "flex"
            }`}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white">{panelView === "lyrics" ? "Lyrics" : "Up next"}</h2>
              {panelView === "queue" ? (
                <p className="text-[11px] text-zinc-400">
                  {queuePosition}/{queue.length} in queue
                </p>
              ) : null}
            </div>
            {hasLyrics
              ? renderSegmented({
                className: "hidden lg:flex",
                value: panelView,
                onChange: setView,
                options: [
                  { id: "lyrics", label: "Lyrics" },
                  { id: "queue", label: "Up next" },
                ],
              })
              : null}
          </div>

          {panelView === "lyrics" ? lyricsBody : queueBody}

          {/* Mobile mini-player so playback stays controllable off the main view */}
          <div className="flex shrink-0 items-center gap-3 border-t border-white/10 bg-black/30 px-3 pb-[max(12px,var(--safe-bottom))] pt-3 lg:hidden">
            <Cover src={cover} title={current.title} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{current.title}</p>
              <p className="truncate text-xs text-zinc-400">{current.artist?.name}</p>
            </div>
            <button type="button" onClick={prev} className="p-2 text-zinc-200" aria-label="Previous">
              <SkipBack className="h-5 w-5 fill-current" />
            </button>
            <button
              type="button"
              onClick={toggle}
              className="grid h-10 w-10 place-items-center rounded-full bg-white text-zinc-950"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 translate-x-0.5 fill-current" />}
            </button>
            <button type="button" onClick={next} className="p-2 text-zinc-200" aria-label="Next">
              <SkipForward className="h-5 w-5 fill-current" />
            </button>
          </div>
        </section>
      </main>
    </div >
  );
}