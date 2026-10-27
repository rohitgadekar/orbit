"use client";

import { type LyricLine } from "@/lib/use-lyrics";
import { Music2, X } from "lucide-react";
import { useEffect, useRef } from "react";

type LyricsSheetProps = {
  /** Whether the sheet is visible */
  isOpen: boolean;
  /** Close the sheet */
  onClose: () => void;
  /** "loading" | "synced" | "plain" | "not-found" | "idle" */
  status: "idle" | "loading" | "synced" | "plain" | "not-found";
  /** Array of timed lines (when status === "synced") */
  lines?: LyricLine[];
  /** Plain text (when status === "plain") */
  plainText?: string;
  /** Currently active line index (when synced) */
  activeIndex: number;
  /** Song title for display */
  songTitle?: string;
  /** Artist name for display */
  artistName?: string;
  /** Dominant accent color from album art */
  accentColor?: string;
};

export function LyricsSheet({
  isOpen,
  onClose,
  status,
  lines = [],
  plainText,
  activeIndex,
  songTitle,
  artistName,
  accentColor = "#dbe878",
}: LyricsSheetProps) {
  const activeRef = useRef<HTMLParagraphElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active line into view — centered, smooth
  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !activeRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const el = activeRef.current;
    const elTop = el.offsetTop;
    const elHeight = el.offsetHeight;
    const containerHeight = container.clientHeight;
    const target = elTop - containerHeight / 2 + elHeight / 2;
    container.scrollTo({ top: target, behavior: "smooth" });
  }, [activeIndex, isOpen]);

  // Scroll back to top when a new song starts (activeIndex resets to -1 or 0)
  useEffect(() => {
    if (!isOpen || activeIndex > 1) return;
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [isOpen, activeIndex]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-30 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        className="absolute inset-x-0 bottom-0 z-40 px-4 pb-4 sm:px-6 animate-in slide-in-from-bottom-4 duration-300 ease-out"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div
          className="mx-auto w-full max-w-2xl rounded-[32px] border border-white/10 shadow-2xl overflow-hidden"
          style={{
            background: "rgba(10, 8, 14, 0.88)",
            backdropFilter: "blur(56px) saturate(1.7)",
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-white/8">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${accentColor}22`, border: `1px solid ${accentColor}44` }}
              >
                <Music2 className="h-4 w-4" style={{ color: accentColor }} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white tracking-tight truncate">Lyrics</h3>
                {songTitle && (
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                    {songTitle}
                    {artistName ? ` · ${artistName}` : ""}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/8 text-zinc-400 transition hover:bg-white/15 hover:text-white"
              aria-label="Close lyrics"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content area */}
          <div
            ref={containerRef}
            className="overflow-y-auto px-5 pt-4 pb-6 no-scrollbar"
            style={{ maxHeight: "min(58vh, 460px)" }}
          >
            {status === "loading" && <LyricsLoading accentColor={accentColor} />}

            {status === "not-found" && <LyricsNotFound />}

            {status === "idle" && (
              <p className="text-center text-sm text-zinc-500 py-8">
                Play a song to see lyrics
              </p>
            )}

            {status === "synced" && lines.length > 0 && (
              <div className="space-y-0.5">
                {lines.map((line, i) => {
                  const isActive = i === activeIndex;
                  const isPast = i < activeIndex;
                  const isFuture = i > activeIndex;

                  // Empty lines act as spacers
                  if (!line.text) {
                    return <div key={i} className="h-5" />;
                  }

                  return (
                    <p
                      key={i}
                      ref={isActive ? activeRef : null}
                      className="transition-all duration-500 ease-out cursor-default select-text leading-snug"
                      style={{
                        fontSize: isActive ? "1.25rem" : "1rem",
                        fontWeight: isActive ? 700 : 500,
                        color: isActive
                          ? "#ffffff"
                          : isPast
                          ? "rgba(255,255,255,0.28)"
                          : "rgba(255,255,255,0.42)",
                        transform: isActive ? "scale(1.01)" : "scale(1)",
                        transformOrigin: "left center",
                        paddingTop: isActive ? "6px" : "4px",
                        paddingBottom: isActive ? "6px" : "4px",
                        textShadow: isActive ? `0 0 32px ${accentColor}66` : "none",
                        letterSpacing: isActive ? "-0.01em" : "normal",
                      }}
                    >
                      {isActive && (
                        <span
                          className="mr-1.5 inline-block rounded-sm text-[9px] font-black tracking-widest uppercase align-middle"
                          style={{ color: accentColor, opacity: 0.8 }}
                        >
                          ♪
                        </span>
                      )}
                      {line.text}
                    </p>
                  );
                })}
                {/* Bottom padding so last line can scroll to center */}
                <div className="h-24" />
              </div>
            )}

            {status === "plain" && plainText && (
              <div className="whitespace-pre-line text-sm leading-7 text-zinc-300 select-text">
                {plainText}
              </div>
            )}
          </div>

          {/* LRCLIB attribution */}
          {(status === "synced" || status === "plain") && (
            <div className="border-t border-white/6 px-5 py-2.5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-600 tracking-wide">
                Lyrics provided by{" "}
                <a
                  href="https://lrclib.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-500 hover:text-zinc-300 transition"
                >
                  LRCLIB
                </a>
              </span>
              {status === "synced" && (
                <span
                  className="text-[9px] font-semibold tracking-widest uppercase rounded-full px-2 py-0.5"
                  style={{ color: accentColor, backgroundColor: `${accentColor}18` }}
                >
                  Synced
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function LyricsLoading({ accentColor }: { accentColor: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-4">
      {/* Animated bars */}
      <div className="flex items-end gap-1 h-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="inline-block w-1.5 rounded-full animate-pulse"
            style={{
              backgroundColor: accentColor,
              height: `${12 + Math.random() * 20}px`,
              animationDelay: `${i * 0.12}s`,
              animationDuration: "0.8s",
            }}
          />
        ))}
      </div>
      <p className="text-sm text-zinc-500">Finding lyrics…</p>
    </div>
  );
}

function LyricsNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-white/6">
        <Music2 className="h-5 w-5 text-zinc-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-300">No lyrics found</p>
        <p className="mt-1 text-xs text-zinc-600">
          Lyrics aren't available for this track
        </p>
      </div>
    </div>
  );
}
