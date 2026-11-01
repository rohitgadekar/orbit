"use client";

import { Cover } from "@/components/cover";
import { useOffline } from "@/context/offline-context";
import { usePlayer } from "@/context/player-context";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Disc3,
  Heart,
  Home,
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
  { href: "/home", label: "Home", icon: Home },
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
  const pct = Math.min(
    100,
    ((progress || 0) / (duration || current?.duration_seconds || 1)) * 100,
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden">
      {/* Mini player — floats just above the tab bar */}
      {current ? (
        <div className="pointer-events-auto mx-4 mb-2 overflow-hidden rounded-full border border-white/15 bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-[1.8]">
          <div className="flex items-center justify-between gap-3 px-2.5 py-2">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-transform focus:outline-none active:scale-[0.98]"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                <Cover
                  src={cover}
                  title={current.title}
                  className="h-full w-full object-cover"
                  playing={isPlaying}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[13px] font-semibold tracking-tight text-white">
                    {current.title}
                  </p>
                  {isDownloaded(current.id) && (
                    <span title="Available offline" aria-label="Available offline">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-blue-400" />
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-zinc-400">
                  {current.artist?.name || "Unknown Artist"}
                </p>
              </div>
            </button>

            <div className="flex shrink-0 items-center text-white">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                  if (typeof window !== "undefined" && "vibrate" in navigator) {
                    try {
                      navigator.vibrate(8);
                    } catch { }
                  }
                }}
                className="grid h-10 w-10 place-items-center transition active:scale-90"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="h-5 w-5 translate-x-0.5 fill-current" />
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
                    } catch { }
                  }
                }}
                className="grid h-10 w-10 place-items-center text-zinc-300 transition active:scale-90"
                aria-label="Next track"
                title="Next"
              >
                <SkipForward className="h-5 w-5 fill-current" />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="h-[2px] w-full bg-white/10">
            <div
              className="h-full bg-white/80 transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Tab bar — translucent glass pill; the active tab expands into a blue pill with its label */}
      <nav
        role="tablist"
        className="pointer-events-auto mx-4 mb-[max(env(safe-area-inset-bottom,0px),12px)] flex items-center justify-between gap-1 rounded-full border border-white/15 bg-white/[0.08] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl backdrop-saturate-[1.8]"
      >
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
              aria-label={item.label}
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
                  } catch { }
                }
              }}
              className={cn(
                "flex h-11 select-none items-center justify-center rounded-full transition-all duration-300 active:scale-95",
                active
                  ? "gap-2 bg-blue-500 px-4 text-white shadow-[0_4px_16px_rgba(59,130,246,0.45)]"
                  : "w-11 text-zinc-300 hover:text-white",
              )}
              role="tab"
              aria-selected={active}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
              {active ? (
                <span className="text-[13px] font-bold leading-none tracking-tight">
                  {item.label}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}