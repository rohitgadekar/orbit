"use client";

import { useFullscreen } from "@/components/app-shell";
import { SearchCommandModal } from "@/components/search-command-modal";
import { usePlayer } from "@/context/player-context";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function TopHeader() {
  const router = useRouter();
  const { current, isPlaying, volume, setVolume, toggleMute } = usePlayer();
  const { fullscreen } = useFullscreen();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMac] = useState(
    () =>
      typeof navigator !== "undefined" &&
      /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent),
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const pct = Math.round((volume ?? 1) * 100);

  const audioFormatBadge = useMemo(() => {
    if (!current?.audio_url) return null;
    const url = current.audio_url.toLowerCase();
    if (url.includes(".flac")) return "FLAC • 24-bit";
    if (url.includes(".wav") || url.includes(".alac")) return "Lossless";
    if (url.includes(".m4a") || url.includes(".aac")) return "AAC • 256k";
    return "MP3 • 320k";
  }, [current?.audio_url]);

  return (
    <>
      <header
        className={`sticky top-0 z-30 flex items-center gap-3 px-5 pt-[calc(var(--safe-top)+0.75rem)] pb-3 md:gap-4 md:px-8 md:pt-4 backdrop-blur-xl bg-[#1a1a1c]/80  transition-all${fullscreen ? " min-h-[64px]" : ""
          }`}
      >
        {/* Navigation History Pair */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            title="Back"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => router.forward()}
            aria-label="Go forward"
            title="Forward"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Search Command Pill */}
        <button
          type="button"
          onClick={() => setIsSearchModalOpen(true)}
          title={`Search (${isMac ? "⌘K" : "Ctrl+K"})`}
          className="group flex w-48 items-center justify-between rounded-full border border-white/5 bg-[#222126]/80 px-4 py-2 text-xs text-zinc-400 shadow-sm backdrop-blur-md transition-all hover:border-white/15 hover:bg-[#28272d] hover:text-white sm:w-60 md:w-72"
        >
          <div className="flex items-center gap-2.5">
            <Search className="h-3.5 w-3.5 text-zinc-500 transition group-hover:text-blue-400" />
            <span className="font-medium">Search library...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 group-hover:border-white/20 group-hover:text-zinc-200">
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </button>

        {/* Audio Fidelity Badge */}
        {audioFormatBadge && (
          <div
            className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-blue-400 uppercase"
            title="Detected Audio Fidelity"
          >
            <span>{audioFormatBadge}</span>
          </div>
        )}

        {/* Equalizer */}
        <div className="hidden items-end gap-[3px] md:flex" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`w-[3px] rounded-full bg-zinc-600 ${isPlaying ? `eq-bar-${(i % 4) + 1}` : ""
                }`}
              style={isPlaying ? undefined : { height: [10, 16, 22, 14, 8][i] }}
            />
          ))}
        </div>

        {/* Volume Scrubber with Mute Toggle */}
        <div className="hidden items-center gap-2.5 md:flex">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={volume > 0 ? "Mute" : "Unmute"}
            title={volume > 0 ? "Mute (M)" : "Unmute (M)"}
            className="text-zinc-500 transition hover:text-white active:scale-95"
          >
            {volume > 0 ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4 text-rose-400" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="h-1 w-20 cursor-pointer appearance-none rounded-full accent-[var(--accent)] [&::-webkit-slider-thumb]:bg-white! [&::-webkit-slider-thumb]:shadow-none! [&::-webkit-slider-thumb:hover]:shadow-none!"
            style={{
              background: `linear-gradient(to right,var(--accent,#3b82f6) ${pct}%,rgba(255,255,255,0.25) ${pct}%)`,
            }}
          />
        </div>
      </header>

      <SearchCommandModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </>
  );
}