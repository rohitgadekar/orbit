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
  const { configured, loading, user } = useAuth();
  const { refresh, error } = useMusic();
  const { isOnline } = useOffline();
  const router = useRouter();
  const pathname = usePathname();
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [fullscreen, setFullscreenRaw] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("orbit_fullscreen") === "true";
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
    if (!loading && !user) {
      if (!isOnline) {
        const hasOfflineSession =
          typeof window !== "undefined" &&
          (Boolean(localStorage.getItem("orbit_cached_auth_user")) ||
            Object.keys(localStorage).some((k) => k.startsWith("orbit_profile_")));
        if (hasOfflineSession) return;
      }
      router.replace("/login");
    }
  }, [loading, router, user, isOnline]);

  useEffect(() => {
    if (user) void refresh();
  }, [refresh, user]);

  if (!configured) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#1a1a1c] p-6 text-white">
        <div className="max-w-lg rounded-[32px] border border-white/10 bg-[#1a1a1c] p-8 shadow-2xl">
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

  if (loading || !user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#1a1a1c]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
      </div>
    );
  }

  return (
    <FullscreenContext.Provider value={{ fullscreen, setFullscreen }}>
      <TrackEditorContext.Provider value={{ editSong: (song) => setEditingSong(song) }}>
        <PipProvider>
          {/* Full-bleed app: no outer backdrop or rounded window */}
          <div className="h-dvh w-full bg-[#1a1a1c]">
            <div className="flex h-full min-h-0 w-full overflow-hidden bg-[#1a1a1c] text-zinc-200">
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