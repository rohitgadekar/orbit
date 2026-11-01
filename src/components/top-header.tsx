"use client";

import { useFullscreen } from "@/components/app-shell";
import { SearchCommandModal } from "@/components/search-command-modal";
import { usePlayer } from "@/context/player-context";
import { ChevronLeft, Search, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function TopHeader() {
  const router = useRouter();
  const { isPlaying, volume, setVolume } = usePlayer();
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

  // NOTE: assumes volume is 0..1. If yours is 0..100, change max/step and the % maths below.
  const pct = Math.round((volume ?? 1) * 100);

  return (
    <>
      <header
        className={`flex items-center gap-4 px-5 pt-[calc(var(--safe-top)+0.75rem)] pb-4 md:px-8 md:pt-6${fullscreen ? " min-h-[64px]" : ""}`}
      >
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="grid h-7 w-14 place-items-center rounded-full border border-white/15 text-zinc-400 transition hover:border-white/30 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex-1" />

        {/* Search pill */}
        <button
          type="button"
          onClick={() => setIsSearchModalOpen(true)}
          title={`Search (${isMac ? "⌘K" : "Ctrl+K"})`}
          className="flex w-52 items-center justify-between rounded-full bg-[#2a2a2d] px-4 py-2.5 text-xs text-zinc-400 transition hover:text-white md:w-72"
        >
          <span>Search library...</span>
          <Search className="h-4 w-4" />
        </button>

        {/* Equalizer */}
        <div className="hidden items-end gap-[3px] md:flex" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`w-[3px] rounded-full bg-zinc-600 ${isPlaying ? `eq-bar-${(i % 4) + 1}` : ""}`}
              style={isPlaying ? undefined : { height: [10, 16, 22, 14, 8][i] }}
            />
          ))}
        </div>

        {/* Volume */}
        <div className="hidden items-center gap-2.5 md:flex">
          <button
            type="button"
            onClick={() => setVolume(volume > 0 ? 0 : 1)}
            aria-label={volume > 0 ? "Mute" : "Unmute"}
            className="text-zinc-500 transition hover:text-white"
          >
            {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="h-1 w-20 cursor-pointer appearance-none rounded-full accent-blue-500"
            style={{
              background: `linear-gradient(to right,#3b82f6 ${pct}%,#3a3a3d ${pct}%)`,
            }}
          />
        </div>
      </header>

      <SearchCommandModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
    </>
  );
}