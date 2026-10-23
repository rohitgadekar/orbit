"use client";

import { useAuth } from "@/context/auth-context";
import { initials } from "@/lib/utils";
import {
  ArrowDownToLine,
  Compass,
  Disc3,
  FolderArchive,
  Heart,
  History,
  ListMusic,
  Music,
  Radio,
  Settings,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function IconRail() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view");
  const { profile, user, isAdmin, role } = useAuth();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Listener";

  const libraryItems = [
    {
      href: "/home",
      label: "Browse",
      icon: Compass,
      isActive: pathname === "/home" || pathname === "/",
    },
    {
      href: "/music",
      label: "Songs",
      icon: Music,
      isActive: pathname === "/music" && !currentView,
    },
    {
      href: "/music?view=albums",
      label: "Albums",
      icon: Disc3,
      isActive: pathname === "/music" && currentView === "albums",
    },
    {
      href: "/music?view=artists",
      label: "Artists",
      icon: Users2,
      isActive: pathname === "/music" && currentView === "artists",
    },
    {
      href: "/music?view=radio",
      label: "Radio",
      icon: Radio,
      isActive: pathname === "/music" && currentView === "radio",
    },
  ];

  const myMusicItems = [
    {
      href: "/home#recently-played",
      label: "Recently Played",
      icon: History,
      isActive: false,
    },
    {
      href: "/favourites",
      label: "Favorite Songs",
      icon: Heart,
      isActive: pathname === "/favourites",
    },
    {
      href: "/folders",
      label: "Playlists",
      icon: ListMusic,
      isActive: pathname === "/folders" || pathname.startsWith("/folders/"),
    },
    {
      href: "/downloaded",
      label: "Downloaded",
      icon: ArrowDownToLine,
      isActive: pathname === "/downloaded",
    },
  ];

  return (
    <aside className="hidden h-full w-56 shrink-0 flex-col justify-between bg-[#19181b] px-4 py-5 text-zinc-300 md:flex lg:w-60">
      <div className="flex flex-col">


        {/* Library Section */}
        <div>
          <h3 className="mt-8 px-2 text-xs font-semibold tracking-wider text-zinc-400">Library</h3>
          <nav className="mt-2.5 space-y-1">
            {libraryItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-full px-3.5 py-2 text-xs font-medium transition ${item.isActive
                    ? "bg-[#2d2c2f] font-semibold text-[#dbe878] shadow-sm"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                >
                  <Icon className={`h-4 w-4 ${item.isActive ? "text-[#dbe878]" : "text-zinc-400 group-hover:text-white"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* My Music Section */}
        <div className="mt-7">
          <h3 className="px-2 text-xs font-semibold tracking-wider text-zinc-400">My music</h3>
          <nav className="mt-2.5 space-y-1">
            {myMusicItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-full px-3.5 py-2 text-xs font-medium transition ${item.isActive
                    ? "bg-[#2d2c2f] font-semibold text-[#dbe878] shadow-sm"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                    }`}
                >
                  <Icon className={`h-4 w-4 ${item.isActive ? "text-[#dbe878]" : "text-zinc-400 group-hover:text-white"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Footer Profile & Settings */}
      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <Link
          href="/profile"
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2 transition hover:bg-white/5"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-[#dbe878]/30"
            />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#2d2c2f] text-xs font-bold text-[#dbe878] ring-1 ring-white/10">
              {initials(displayName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white group-hover:text-[#dbe878]">
              {displayName}
            </p>
            <p className="truncate text-[10px] text-zinc-400 capitalize">
              {isAdmin ? "Studio Admin" : "Listener"}
            </p>
          </div>
        </Link>
        <Link
          href="/settings"
          className="rounded-full p-1.5 text-zinc-500 hover:bg-white/10 hover:text-white"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}

export function OrbitMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="4" fill="#dbe878" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="#dbe878" strokeWidth="1.4" opacity="0.6" />
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
