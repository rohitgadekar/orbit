"use client";

import { useFullscreen } from "@/components/app-shell";
import { SearchCommandModal } from "@/components/search-command-modal";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import { initials } from "@/lib/utils";
import { Bell, ChevronRight, Search, Settings, Shuffle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function TopHeader() {
  const pathname = usePathname();
  const { profile, user } = useAuth();
  const { songs } = useMusic();
  const { playSong } = usePlayer();
  const { fullscreen } = useFullscreen();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isMac] = useState(() => {
    return (
      typeof navigator !== "undefined" &&
      /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent)
    );
  });

  // Global Command+K or Ctrl+K shortcut to search
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

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Listener";

  // Dynamic breadcrumb matching screenshot "Artists > Top 2023"
  function getBreadcrumb() {
    if (pathname === "/home" || pathname === "/") {
      return { parent: "Artists", current: "Top 2026" };
    }
    if (pathname.startsWith("/music")) {
      return { parent: "Library", current: "All Songs" };
    }
    if (pathname.startsWith("/folders")) {
      return { parent: "Collections", current: "Local Folders" };
    }
    if (pathname === "/favourites") {
      return { parent: "My Music", current: "Favorites" };
    }
    if (pathname === "/profile") {
      return { parent: "Account", current: "Profile" };
    }
    if (pathname === "/settings") {
      return { parent: "Preferences", current: "Settings" };
    }
    return { parent: "Library", current: "Browse" };
  }

  const breadcrumb = getBreadcrumb();

  function handleShufflePlay() {
    if (songs.length === 0) return;
    const randomIndex = Math.floor(Math.random() * songs.length);
    playSong(songs[randomIndex], songs);
  }

  return (
    <>
      <header className={`flex items-center justify-between gap-4 px-6 pt-5 pb-3 md:px-8${fullscreen ? " min-h-[64px]" : ""}`}>
      {/* Breadcrumb Navigation matching screenshot */}
      <div className={`items-center gap-1.5 text-xs font-semibold tracking-wide text-zinc-500${fullscreen ? " hidden md:flex" : " flex"}`}>
        <span className="text-zinc-600 hover:text-zinc-900">{breadcrumb.parent}</span>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
        <span className="font-bold text-zinc-900">{breadcrumb.current}</span>
      </div>

      {/* Middle & Right Header Elements */}
      <div className={`items-center gap-3 sm:gap-4${fullscreen ? " hidden md:flex" : " flex"}`}>
        {/* Desktop Command K Search Button */}
        <button
          type="button"
          onClick={() => setIsSearchModalOpen(true)}
          className="hidden md:flex items-center gap-2.5 rounded-full border border-black/10 bg-white/90 backdrop-blur-md px-3.5 py-1.5 text-xs text-zinc-500 shadow-2xs hover:border-black/25 hover:text-zinc-900 transition active:scale-95 cursor-pointer"
          title={`Search songs, albums, and artists (${isMac ? "⌘K" : "Ctrl+K"})`}
        >
          <Search className="h-3.5 w-3.5 text-zinc-400" />
          <span className="font-medium text-zinc-500">Search library...</span>
          <kbd className="ml-1 flex items-center gap-0.5 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-zinc-600 shadow-2xs">
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </button>

        {/* Mobile Search Icon Button */}
        <button
          type="button"
          onClick={() => setIsSearchModalOpen(true)}
          className="md:hidden rounded-full p-2 text-zinc-600 transition hover:bg-black/5 hover:text-zinc-900"
          title="Search library"
          aria-label="Search library"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Quick Nav Tabs matching screenshot: "New Releases", "New Feed", "Shuffle Play" */}
        <div className="hidden items-center gap-5 text-xs font-semibold text-zinc-600 md:flex">
          <Link
            href="/home"
            className="transition hover:text-zinc-950 hover:underline hover:underline-offset-4"
          >
            New Releases
          </Link>
          <Link
            href="/music"
            className="transition hover:text-zinc-950 hover:underline hover:underline-offset-4"
          >
            New Feed
          </Link>
          <button
            type="button"
            onClick={handleShufflePlay}
            className="flex items-center gap-1.5 text-zinc-600 transition hover:text-zinc-950"
          >
            <Shuffle className="h-3 w-3" />
            <span>Shuffle Play</span>
          </button>
        </div>

        {/* Action icons: Settings & Notification & Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/settings"
            className="rounded-full p-2 text-zinc-600 transition hover:bg-black/5 hover:text-zinc-900"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={() => alert("All streams are up to date.")}
            className="relative rounded-full p-2 text-zinc-600 transition hover:bg-black/5 hover:text-zinc-900"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#dbe878] ring-1 ring-white" />
          </button>

          {/* User Profile Avatar */}
          <Link
            href="/profile"
            className="group relative ml-1 block"
            title={`View Profile: ${displayName}`}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-zinc-300 transition group-hover:ring-zinc-900"
              />
            ) : (
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#19181b] text-[11px] font-bold text-[#dbe878] ring-1 ring-black/10 transition group-hover:scale-105">
                {initials(displayName)}
              </div>
            )}
          </Link>
        </div>
      </div>
    </header>

    {/* Command K / Ctrl K Search Modal */}
    <SearchCommandModal
      isOpen={isSearchModalOpen}
      onClose={() => setIsSearchModalOpen(false)}
    />
  </>
  );
}
