"use client";

import { useMusic } from "@/context/music-context";
import { getIndividualArtists, splitArtistNames } from "@/lib/artists";
import { initials } from "@/lib/utils";
import {
  Disc3,
  FolderArchive,
  Heart,
  Home,
  ListMusic,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export function IconRail() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view");
  const { songs, artists: catalogArtists, recentlyPlayed, favouriteIds } = useMusic();

  // Collapsed state is remembered across sessions
  const [collapsed, setCollapsedRaw] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("orbit_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  function toggleCollapsed() {
    setCollapsedRaw((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("orbit_sidebar_collapsed", String(next));
      } catch { }
      return next;
    });
  }

  const menuItems = [
    { href: "/home", label: "Home", icon: Home, isActive: pathname === "/home" || pathname === "/" },
    { href: "/music?view=albums", label: "Albums", icon: Disc3, isActive: pathname === "/music" && currentView === "albums" },
    { href: "/downloaded", label: "Local Files", icon: FolderArchive, isActive: pathname === "/downloaded" },
    { href: "/favourites", label: "Favorites", icon: Heart, isActive: pathname === "/favourites" },
    { href: "/folders", label: "Playlists", icon: ListMusic, isActive: pathname === "/folders" || pathname.startsWith("/folders/") },
  ];

  type RailItem = { key: string; href: string; title: string; image: string; sub: string; round: boolean };

  // Compute artist listening affinity from recent plays and favourites
  const artistAffinity = useMemo(() => {
    const map = new Map<string, number>();
    recentlyPlayed.forEach((song, idx) => {
      const weight = Math.max(1, 20 - idx);
      for (const name of splitArtistNames(song.artist?.name)) {
        const key = name.toLowerCase().trim();
        map.set(key, (map.get(key) ?? 0) + weight);
      }
    });
    favouriteIds.forEach((id) => {
      const song = songs.find((s) => s.id === id);
      if (!song) return;
      for (const name of splitArtistNames(song.artist?.name)) {
        const key = name.toLowerCase().trim();
        map.set(key, (map.get(key) ?? 0) + 10);
      }
    });
    return map;
  }, [recentlyPlayed, favouriteIds, songs]);

  // Suggested / most-listened artists first, filling out the entire sidebar
  // without empty blank space below
  const artists = useMemo<RailItem[]>(() => {
    const all = getIndividualArtists(songs, catalogArtists);
    return all
      .map((a) => {
        const key = a.name.toLowerCase().trim();
        const affinity = artistAffinity.get(key) ?? 0;
        // Priority 1: dedicated artist image_url, Priority 2: first track cover, Priority 3: album cover
        const cover =
          a.image_url ||
          a.songs.find((s) => Boolean(s.cover_url || s.album?.cover_url))?.cover_url ||
          a.songs.find((s) => Boolean(s.album?.cover_url))?.album?.cover_url ||
          "";

        return {
          key: a.name,
          href: `/artists/${encodeURIComponent(a.name)}`,
          title: a.name,
          image: cover,
          sub: `${a.trackCount} track${a.trackCount === 1 ? "" : "s"}`,
          round: true,
          affinity,
          plays: a.plays,
          trackCount: a.trackCount,
        };
      })
      // Sort by listening affinity first (suggested/most listened), then total plays, then tracks
      .sort((a, b) => b.affinity - a.affinity || b.plays - a.plays || b.trackCount - a.trackCount)
      .slice(0, 40);
  }, [songs, catalogArtists, artistAffinity]);

  // Fallback when no songs or artists: show albums from library
  const albums = useMemo<RailItem[]>(() => {
    const map = new Map<string, RailItem>();
    for (const song of songs) {
      const title = song.album?.title;
      const image = song.cover_url || song.album?.cover_url;
      if (!title || !image || map.has(title)) continue;
      map.set(title, {
        key: title,
        href: `/albums/${encodeURIComponent(title)}`,
        title,
        image,
        sub: song.artist?.name ?? "Various Artists",
        round: false,
      });
      if (map.size >= 25) break;
    }
    return Array.from(map.values());
  }, [songs]);

  const showingArtists = artists.length > 0;
  const rail = showingArtists ? artists : albums;
  const railHeading = showingArtists ? "Top Artists" : "From your library";

  return (
    <aside
      className={`hidden h-full shrink-0 flex-col bg-[#1a1a1c] py-7 text-zinc-300 transition-[width] duration-200 md:flex ${collapsed ? "w-[72px] items-center px-3" : "w-56 px-5 lg:w-60"
        }`}
    >
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between px-1"}`}>
        {!collapsed && <h2 className="text-[22px] font-bold tracking-tight text-white">Menu</h2>}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
          title={collapsed ? "Show sidebar" : "Hide sidebar"}
          className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
        >
          {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </button>
      </div>

      <nav className={`mt-5 space-y-1 ${collapsed ? "w-full" : ""}`}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              prefetch
              onClick={(e) => {
                if (item.isActive) e.preventDefault();
              }}
              className={`group flex items-center rounded-2xl text-[13px] font-semibold transition ${collapsed ? "h-11 w-full justify-center" : "gap-3 px-3 py-2.5"} ${item.isActive ? "bg-[#2c2c2f] text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
            >
              <Icon
                className={`h-[18px] w-[18px] ${item.isActive ? "text-blue-500" : "text-zinc-600 group-hover:text-zinc-300"
                  }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {rail.length > 0 && (
        <>
          {!collapsed ? (
            <h2 className="mt-8 px-1 text-[22px] font-bold tracking-tight text-white">{railHeading}</h2>
          ) : (
            <div className="mt-6 h-px w-8 bg-white/10" />
          )}
          <div
            className={`no-scrollbar min-h-0 flex-1 overflow-y-auto ${collapsed ? "mt-4 space-y-3" : "mt-3 space-y-1"
              }`}
          >
            {rail.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                title={collapsed ? item.title : undefined}
                className={`group flex items-center rounded-2xl transition ${collapsed ? "justify-center" : "gap-3 p-2 hover:bg-white/5"
                  }`}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className={`h-10 w-10 shrink-0 object-cover ring-1 ring-white/10 ${item.round ? "rounded-full" : "rounded-xl"
                      }`}
                  />
                ) : (
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center bg-[#28272d] text-xs font-bold text-white ring-1 ring-white/10 ${item.round ? "rounded-full" : "rounded-xl"
                      }`}
                  >
                    {initials(item.title)}
                  </div>
                )}
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-200 group-hover:text-white">{item.title}</p>
                    <p className="truncate text-[10px] text-zinc-500">{item.sub}</p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}

export function OrbitMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="4" fill="var(--accent, #3b82f6)" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="var(--accent, #3b82f6)" strokeWidth="1.4" opacity="0.6" />
      <ellipse
        cx="16"
        cy="16"
        rx="13"
        ry="7"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        opacity="0.8"
        transform="rotate(-24 16 16)"
      />
    </svg>
  );
}