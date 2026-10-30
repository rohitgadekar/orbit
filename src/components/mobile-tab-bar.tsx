"use client";

import { Cover } from "@/components/cover";
import { useOffline } from "@/context/offline-context";
import { usePlayer } from "@/context/player-context";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Compass,
  Disc3,
  Heart,
  ListMusic,
  Pause,
  Play,
  SkipForward,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const MOBILE_NAV_ITEMS = [
  { href: "/home", label: "Browse", icon: Compass },
  { href: "/music", label: "Songs", icon: Disc3 },
  { href: "/folders", label: "Playlists", icon: ListMusic },
  { href: "/favourites", label: "Loved", icon: Heart },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function MobileTabBar() {
  const pathname = usePathname();
  const { current, isPlaying, toggle, next, setExpanded, progress, duration } = usePlayer();
  const { isDownloaded } = useOffline();

  // Optimistic tab selection for instant 0ms visual response upon tapping
  const [optimisticTab, setOptimisticTab] = useState<string | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Official React pattern for resetting state on prop/navigation change without an effect
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOptimisticTab(null);
  }

  const navItems = MOBILE_NAV_ITEMS;
  const cover = current?.cover_url || current?.album?.cover_url || current?.artist?.image_url;

  return (
    <div className="fixed bottom-2 left-2.5 right-2.5 z-40 mx-auto max-w-md md:hidden pointer-events-auto pb-[env(safe-area-inset-bottom,0px)]">
      <div className="overflow-hidden rounded-[32px] border border-white/[0.12] bg-[#141317]/90 shadow-[0_12px_40px_rgba(0,0,0,0.75)] backdrop-blur-2xl transition-all duration-300">
        {/* iOS / Tidal-inspired Now Playing Mini Player Widget */}
        {current ? (
          <div className="border-b border-white/[0.08]">
            <div className="flex items-center justify-between gap-3 px-3.5 pt-2.5 pb-2">
              {/* Clickable song info card to expand full-screen player */}
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus:outline-none active:scale-[0.98] transition-transform"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-md ring-1 ring-white/15">
                  <Cover
                    src={cover}
                    title={current.title}
                    className="h-full w-full object-cover"
                    playing={isPlaying}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-bold text-white tracking-tight">
                      {current.title}
                    </p>
                    {isDownloaded(current.id) && (
                      <span title="Available offline" aria-label="Available offline">
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-[#dbe878]" />
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] font-medium text-zinc-400">
                    {current.artist?.name || "Unknown Artist"}
                  </p>
                </div>
              </button>

              {/* Minimalist Controls with iOS Spring Feedback */}
              <div className="flex items-center gap-1 shrink-0 text-white">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle();
                    if (typeof window !== "undefined" && "vibrate" in navigator) {
                      try {
                        navigator.vibrate(8);
                      } catch {}
                    }
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full text-white hover:text-[#dbe878] active:scale-85 transition-transform"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="h-4.5 w-4.5 fill-current" />
                  ) : (
                    <Play className="h-4.5 w-4.5 translate-x-0.5 fill-current" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                    if (typeof window !== "undefined" && "vibrate" in navigator) {
                      try {
                        navigator.vibrate(8);
                      } catch {}
                    }
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 hover:text-white active:scale-85 transition-transform"
                  aria-label="Next track"
                  title="Next"
                >
                  <SkipForward className="h-4 w-4 fill-current" />
                </button>
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="h-[2px] w-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#dbe878] to-[#edf79c] transition-all duration-200"
                style={{
                  width: `${Math.min(
                    100,
                    ((progress || 0) / (duration || current.duration_seconds || 1)) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        {/* iOS-Inspired Bottom Navigation Tabs */}
        <nav className="flex items-center justify-around px-2 py-1.5" role="tablist">
          {navItems.map((item) => {
            const currentSelected = optimisticTab ?? pathname;
            const active =
              currentSelected === item.href ||
              (item.href !== "/home" && currentSelected.startsWith(`${item.href}/`));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  if (active) {
                    e.preventDefault();
                    // Scroll to top on active tab tap (native iOS behavior)
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    return;
                  }
                  // Immediate 0ms UI update
                  setOptimisticTab(item.href);
                  if (typeof window !== "undefined" && "vibrate" in navigator) {
                    try {
                      navigator.vibrate(10);
                    } catch {}
                  }
                }}
                className={cn(
                  "group relative flex flex-1 flex-col items-center justify-center py-1 text-center transition-all duration-200 active:scale-85 select-none",
                  active ? "text-[#dbe878]" : "text-zinc-400 hover:text-zinc-200",
                )}
                role="tab"
                aria-selected={active}
              >
                {/* iOS Tab Icon with capsule pill on active */}
                <div
                  className={cn(
                    "relative grid h-8 w-11 place-items-center rounded-full transition-all duration-200",
                    active
                      ? "bg-white/12 text-[#dbe878] shadow-inner shadow-white/5 scale-105"
                      : "text-zinc-400 group-hover:text-zinc-200",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      active && "scale-110",
                    )}
                  />
                  {/* Subtle iOS glowing dot under active icon */}
                  {active && (
                    <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-[#dbe878] shadow-[0_0_6px_#dbe878]" />
                  )}
                </div>

                <span
                  className={cn(
                    "text-[10px] tracking-tight transition-colors mt-0.5",
                    active ? "font-bold text-[#dbe878]" : "font-medium text-zinc-400",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
