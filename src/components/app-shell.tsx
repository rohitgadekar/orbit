"use client";

import { EditTrackModal } from "@/components/edit-track-modal";
import { IconRail, OrbitMark } from "@/components/icon-rail";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { NowPlayingPanel } from "@/components/now-playing-panel";
import { PlayerBar } from "@/components/player-bar";
import { TopHeader } from "@/components/top-header";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { useOffline } from "@/context/offline-context";
import { PipProvider } from "@/context/pip-context";
import type { Song } from "@/lib/types";
import { WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

type TrackEditorContextType = { editSong: (song: Song) => void };
const TrackEditorContext = createContext<TrackEditorContextType>({ editSong: () => { } });
export function useTrackEditor() {
  return useContext(TrackEditorContext);
}

type FullscreenContextType = { fullscreen: boolean; setFullscreen: (v: boolean) => void };
const FullscreenContext = createContext<FullscreenContextType>({ fullscreen: false, setFullscreen: () => { } });
export function useFullscreen() {
  return useContext(FullscreenContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { configured, loading: authLoading, user } = useAuth();
  const { refresh, error, loading: musicLoading, songs } = useMusic();
  const { isOnline } = useOffline();
  const router = useRouter();
  const pathname = usePathname();
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [fullscreen, setFullscreenRaw] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("orbit_fullscreen") === "true";
  });
  const [sidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("orbit_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const mainRef = useRef<HTMLElement | null>(null);

  function setFullscreen(v: boolean) {
    setFullscreenRaw(v);
    try {
      localStorage.setItem("orbit_fullscreen", String(v));
    } catch { }
  }

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  useEffect(() => {
    if (!authLoading && !user) {
      if (!isOnline) {
        const hasOfflineSession =
          typeof window !== "undefined" &&
          (Boolean(localStorage.getItem("orbit_cached_auth_user")) ||
            Object.keys(localStorage).some((k) => k.startsWith("orbit_profile_")));
        if (hasOfflineSession) return;
      }
      router.replace("/login");
    }
  }, [authLoading, router, user, isOnline]);

  useEffect(() => {
    if (user) void refresh();
  }, [refresh, user]);

  if (!configured) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--bg-app,#1a1a1c)] p-6 text-white">
        <div className="max-w-lg rounded-[32px] border border-white/10 bg-[var(--bg-app,#1a1a1c)] p-8 shadow-2xl">
          <OrbitMark className="h-10 w-10" />
          <h1 className="mt-4 text-3xl font-bold">Connect Supabase</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Add <code className="text-blue-400">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-blue-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
            <code>.env.local</code>, then run the SQL in <code>supabase/schema.sql</code>.
          </p>
        </div>
      </div>
    );
  }

  // Uniform initial loading: wait until both auth AND initial music catalog are ready
  // so the sidebar, header, main content, right panel, and player bar all appear together
  const isInitialLoading = authLoading || !user || (musicLoading && songs.length === 0);

  if (isInitialLoading) {
    return (
      <div className="h-dvh w-full bg-[var(--bg-app,#1a1a1c)]">
        <div className="flex h-full min-h-0 w-full overflow-hidden bg-[var(--bg-app,#1a1a1c)] text-zinc-200">
          {/* Sidebar / IconRail skeleton — exact dimensions matching icon-rail.tsx */}
          <aside
            className={`hidden h-full shrink-0 flex-col bg-[var(--bg-app,#1a1a1c)] py-7 text-zinc-300 md:flex ${
              sidebarCollapsed ? "w-[72px] items-center px-3" : "w-56 px-5 lg:w-60"
            } animate-pulse`}
          >
            {/* Menu Header */}
            <div className={`flex items-center w-full ${sidebarCollapsed ? "justify-center" : "justify-between px-1"}`}>
              {!sidebarCollapsed && <div className="h-7 w-16 rounded-lg bg-white/20" />}
              <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/5 shrink-0" />
            </div>

            {/* Nav items (Home, Albums, Local Files, Favorites, Playlists) */}
            <nav className={`mt-5 space-y-1 ${sidebarCollapsed ? "w-full" : ""}`}>
              {[
                { w: "w-11", active: true },
                { w: "w-14", active: false },
                { w: "w-20", active: false },
                { w: "w-16", active: false },
                { w: "w-14", active: false },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center rounded-2xl ${
                    sidebarCollapsed ? "h-11 w-full justify-center" : "gap-3 px-3 py-2.5"
                  } ${item.active ? "bg-[#2c2c2f]" : "bg-transparent"}`}
                >
                  <div
                    className={`h-[18px] w-[18px] rounded-md shrink-0 ${
                      item.active ? "bg-blue-500/40" : "bg-white/10"
                    }`}
                  />
                  {!sidebarCollapsed && (
                    <div className={`h-3.5 rounded-md ${item.w} bg-white/15`} />
                  )}
                </div>
              ))}
            </nav>

            {/* Suggested Artists heading */}
            {!sidebarCollapsed ? (
              <div className="mt-8 px-1">
                <div className="h-7 w-28 rounded-lg bg-white/20" />
              </div>
            ) : (
              <div className="mt-6 h-px w-8 bg-white/10" />
            )}

            {/* Artist items — full height scroll container matching real sidebar */}
            <div
              className={`no-scrollbar min-h-0 flex-1 overflow-hidden ${
                sidebarCollapsed ? "mt-4 space-y-3" : "mt-3 space-y-1"
              }`}
            >
              {[
                { titleW: "w-24", subW: "w-14" },
                { titleW: "w-20", subW: "w-12" },
                { titleW: "w-28", subW: "w-16" },
                { titleW: "w-16", subW: "w-10" },
                { titleW: "w-26", subW: "w-14" },
                { titleW: "w-22", subW: "w-12" },
                { titleW: "w-32", subW: "w-16" },
                { titleW: "w-18", subW: "w-10" },
                { titleW: "w-24", subW: "w-14" },
                { titleW: "w-28", subW: "w-12" },
                { titleW: "w-20", subW: "w-14" },
                { titleW: "w-24", subW: "w-10" },
              ].map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center rounded-2xl ${
                    sidebarCollapsed ? "justify-center" : "gap-3 p-2"
                  }`}
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-white/10 ring-1 ring-white/10" />
                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className={`h-3.5 rounded-md ${row.titleW} bg-white/15`} />
                      <div className={`h-2.5 rounded-md ${row.subW} bg-white/5`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* Center Canvas */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-white/[0.04]">
            {/* TopHeader Skeleton */}
            <header className="sticky top-0 z-30 flex items-center gap-3 px-5 pt-[calc(var(--safe-top)+0.75rem)] pb-3 md:gap-4 md:px-8 md:pt-4 backdrop-blur-xl bg-[var(--bg-app,#1a1a1c)]/80 animate-pulse">
              {/* Navigation History Pair */}
              <div className="flex items-center gap-1.5">
                <div className="h-8 w-8 rounded-full border border-white/10 bg-white/5" />
                <div className="h-8 w-8 rounded-full border border-white/10 bg-white/5" />
              </div>

              <div className="flex-1" />

              {/* Search Command Pill */}
              <div className="flex w-48 items-center justify-between rounded-full border border-white/5 bg-[#222126]/80 px-4 py-2 sm:w-60 md:w-72">
                <div className="flex items-center gap-2.5">
                  <div className="h-3.5 w-3.5 rounded-full bg-white/10" />
                  <div className="h-3 w-24 rounded bg-white/10" />
                </div>
                <div className="hidden sm:block h-4 w-8 rounded border border-white/10 bg-white/5" />
              </div>

              {/* Equalizer Placeholder */}
              <div className="hidden items-end gap-[3px] md:flex">
                {[10, 16, 22, 14, 8].map((h, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-white/10"
                    style={{ height: h }}
                  />
                ))}
              </div>

              {/* Volume Scrubber Placeholder */}
              <div className="hidden items-center gap-2.5 md:flex">
                <div className="h-4 w-4 rounded-full bg-white/10" />
                <div className="h-1 w-20 rounded-full bg-white/10" />
              </div>
            </header>

            {/* Main Content Area Skeleton */}
            <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-58 md:px-8 md:pb-6 animate-pulse">
              <div className="space-y-10 pb-10 pt-4">
                {/* Greeting & Filter Pills Skeleton */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
                  <div className="space-y-2">
                    <div className="h-8 w-56 sm:w-64 rounded-xl bg-white/15" />
                    <div className="h-3.5 w-48 sm:w-64 rounded-md bg-white/5" />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                    {[48, 64, 72, 84, 88].map((w, i) => (
                      <div
                        key={i}
                        className="h-7 rounded-full bg-white/5"
                        style={{ width: w }}
                      />
                    ))}
                  </div>
                </div>

                {/* Top Curated Mixes (3 cards) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="relative min-h-[160px] sm:min-h-[175px] rounded-[26px] border border-white/5 bg-[#1a191d] p-5 flex flex-col justify-between overflow-hidden"
                    >
                      <div className="space-y-2">
                        <div className="h-4 w-12 rounded-full bg-white/10" />
                        <div className="h-6 w-32 rounded-md bg-white/15" />
                        <div className="h-3 w-48 rounded bg-white/5" />
                      </div>
                      <div className="h-7 w-20 rounded-full bg-white/10" />
                      <div className="absolute right-0 top-0 bottom-0 w-2/5 bg-gradient-to-l from-white/5 to-transparent" />
                    </div>
                  ))}
                </div>

                {/* Latest Releases */}
                <div className="space-y-4">
                  <div className="h-5 w-36 rounded bg-white/15" />
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="space-y-2.5">
                        <div className="aspect-square w-full rounded-2xl bg-[#222126] border border-white/5" />
                        <div className="h-3.5 w-3/4 rounded bg-white/15" />
                        <div className="h-3 w-1/2 rounded bg-white/5" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Jump Back In */}
                <div className="space-y-4">
                  <div className="h-5 w-32 rounded bg-white/15" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-[#1a191d] p-3"
                      >
                        <div className="h-12 w-12 shrink-0 rounded-xl bg-[#2c2c2f]" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="h-3.5 w-3/4 rounded bg-white/15" />
                          <div className="h-3 w-1/2 rounded bg-white/5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </main>


          </div>

          {/* Right NowPlayingPanel skeleton */}
          <div className="hidden p-3 lg:flex">
            <aside className="hidden w-80 shrink-0 flex-col overflow-hidden rounded-[28px] bg-[#222224] p-5 lg:flex xl:w-[22rem] animate-pulse">
              {/* Profile row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#38383b]" />
                  <div className="h-3 w-20 rounded-full bg-[#38383b]" />
                </div>
                <div className="h-8 w-8 rounded-full bg-[#2c2c2f]" />
              </div>

              {/* Title */}
              <div className="mt-8 flex items-baseline justify-between px-0.5">
                <div className="h-7 w-32 rounded-lg bg-[#38383b]" />
                <div className="h-4 w-8 rounded bg-[#38383b]" />
              </div>

              {/* Current track card */}
              <div className="relative mt-10">
                <div className="absolute -top-7 left-1/2 z-20 h-14 w-14 -translate-x-1/2 rounded-full bg-[#38383b] ring-4 ring-[#222224]" />
                <div className="rounded-[28px] border border-white/5 bg-[#2c2c2f] px-4 pb-5 pt-10">
                  <div className="mx-auto h-3.5 w-32 rounded-full bg-[#38383b]" />
                  <div className="mx-auto mt-2 h-2.5 w-20 rounded-full bg-[#38383b]" />
                  <div className="mt-5 flex items-center justify-center gap-5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`rounded-full bg-[#38383b] ${i === 2 ? "h-6 w-6" : "h-4 w-4"}`}
                      />
                    ))}
                  </div>
                  <div className="mt-5 h-1 w-full rounded-full bg-[#38383b]" />
                  <div className="mt-2 flex justify-between">
                    <div className="h-2 w-6 rounded-full bg-[#38383b]" />
                    <div className="h-2 w-6 rounded-full bg-[#38383b]" />
                  </div>
                </div>
              </div>

              {/* Queue rows */}
              <div className="mt-4 space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#2c2c2f] px-3 py-3"
                    style={{ opacity: Math.max(0.35, 1 - i * 0.12) }}
                  >
                    <div className="h-9 w-9 shrink-0 rounded-xl bg-[#38383b]" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="h-2.5 w-3/4 rounded-full bg-[#38383b]" />
                      <div className="h-2 w-1/2 rounded-full bg-[#38383b]" />
                    </div>
                    <div className="h-2 w-6 rounded-full bg-[#38383b]" />
                  </div>
                ))}
              </div>
            </aside>
          </div>

          {/* Mobile Tab Bar Skeleton */}
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden animate-pulse">
            <div className="mx-4 mb-3 rounded-full border border-white/10 bg-[#1e1e20]/90 px-3 py-2 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-around py-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="h-5 w-5 rounded-full bg-white/10" />
                    <div className="h-1.5 w-7 rounded bg-white/10" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FullscreenContext.Provider value={{ fullscreen, setFullscreen }}>
      <TrackEditorContext.Provider value={{ editSong: (song) => setEditingSong(song) }}>
        <PipProvider>
          {/* Full-bleed app: no outer backdrop or rounded window */}
          <div className="h-dvh w-full bg-[var(--bg-app,#1a1a1c)]">
            <div className="flex h-full min-h-0 w-full overflow-hidden bg-[var(--bg-app,#1a1a1c)] text-zinc-200">
              <IconRail />

              {/* Center canvas */}
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-white/[0.04]">
                <TopHeader />

                {!isOnline ? (
                  <div className="mx-4 mb-2.5 flex items-center justify-between rounded-xl bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-300 md:mx-8">
                    <div className="flex items-center gap-2">
                      <WifiOff className="h-3.5 w-3.5" />
                      <span>Offline mode — downloaded songs are ready to play; others are dimmed</span>
                    </div>
                    <Link href="/music" className="ml-2 shrink-0 font-bold underline hover:text-white">
                      Browse songs
                    </Link>
                  </div>
                ) : null}

                {error ? <p className="px-8 pb-2 text-xs font-medium text-rose-400">Notice: {error}</p> : null}

                <main
                  ref={mainRef}
                  className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-58 md:px-8 md:pb-6"
                >
                  {children}
                </main>

                <PlayerBar />
                <MobileTabBar />
              </div>

              {/* Right "Play queue" panel — full height, inset from the window edge */}
              <div className="hidden p-3 lg:flex">
                <NowPlayingPanel onEditTrack={(song) => setEditingSong(song)} />
              </div>

              <EditTrackModal
                song={editingSong}
                isOpen={Boolean(editingSong)}
                onClose={() => setEditingSong(null)}
              />
            </div>
          </div>
        </PipProvider>
      </TrackEditorContext.Provider>
    </FullscreenContext.Provider>
  );
}