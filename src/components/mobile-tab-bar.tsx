"use client";

import { Cover } from "@/components/cover";
import { useOffline } from "@/context/offline-context";
import { usePlayer } from "@/context/player-context";
import { cn } from "@/lib/utils";
import {
  ArrowDownToLine,
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
  const { isOnline, isDownloaded } = useOffline();

  const navItems = isOnline
    ? MOBILE_NAV_ITEMS
    : [
        { href: "/home", label: "Browse", icon: Compass },
        { href: "/downloaded", label: "Offline", icon: ArrowDownToLine },
        { href: "/folders", label: "Playlists", icon: ListMusic },
        { href: "/favourites", label: "Loved", icon: Heart },
        { href: "/profile", label: "Profile", icon: UserRound },
      ];

  const cover = current?.cover_url || current?.album?.cover_url || current?.artist?.image_url;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-40 mx-auto max-w-md md:hidden pointer-events-auto">
      <div className="overflow-hidden rounded-[30px] border border-white/12 bg-[#161519]/96 shadow-2xl shadow-black/80 backdrop-blur-2xl transition-all duration-300">
        {/* Tidal-inspired Now Playing Widget inside the dock */}
        {current ? (
          <div className="border-b border-white/10">
            <div className="flex items-center justify-between gap-3 px-3.5 pt-2.5 pb-2">
              {/* Clickable song info to open full-screen player */}
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus:outline-none"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-xs ring-1 ring-white/10">
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

              {/* Minimalist Tidal-style controls */}
              <div className="flex items-center gap-1 shrink-0 text-white">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle();
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full text-white hover:text-[#dbe878] active:scale-90 transition"
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
                  }}
                  className="grid h-9 w-9 place-items-center rounded-full text-zinc-300 hover:text-white active:scale-90 transition"
                  aria-label="Next track"
                  title="Next"
                >
                  <SkipForward className="h-4 w-4 fill-current" />
                </button>
              </div>
            </div>

            {/* Micro progress line */}
            <div className="h-[2px] w-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-[#dbe878] transition-all duration-200"
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

        {/* Navigation Tabs */}
        <nav className="flex items-center justify-around px-2 py-1.5">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/home" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex flex-1 flex-col items-center justify-center py-1 text-center transition-all duration-200 active:scale-95",
                  active ? "text-[#dbe878]" : "text-zinc-400 hover:text-white",
                )}
              >
                <div
                  className={cn(
                    "grid h-8 w-11 place-items-center rounded-full transition-all duration-200",
                    active
                      ? "bg-white/10 text-[#dbe878] shadow-inner"
                      : "text-zinc-400 group-hover:text-zinc-200",
                  )}
                >
                  <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                </div>
                <span
                  className={cn(
                    "text-[10px] tracking-tight font-medium transition-colors mt-0.5",
                    active ? "font-bold text-[#dbe878]" : "text-zinc-400",
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
