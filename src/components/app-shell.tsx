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
import type { Song } from "@/lib/types";
import { WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

type TrackEditorContextType = {
  editSong: (song: Song) => void;
};

const TrackEditorContext = createContext<TrackEditorContextType>({
  editSong: () => { },
});

export function useTrackEditor() {
  return useContext(TrackEditorContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { configured, loading, user } = useAuth();
  const { refresh, error } = useMusic();
  const { isOnline } = useOffline();
  const router = useRouter();
  const pathname = usePathname();
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (user) void refresh();
  }, [refresh, user]);

  if (!configured) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#19181b] p-6 text-white">
        <div className="max-w-lg rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
          <OrbitMark className="h-10 w-10" />
          <h1 className="mt-4 font-serif text-3xl font-bold">Connect Supabase</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Add <code className="text-[#dbe878]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="text-[#dbe878]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
            <code>.env.local</code>, then run the SQL in <code>supabase/schema.sql</code>.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#19181b]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#dbe878]" />
      </div>
    );
  }

  return (
    <TrackEditorContext.Provider value={{ editSong: (song) => setEditingSong(song) }}>
      <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-[#19181b]">
        {/* Left Dark Sidebar with macOS Traffic Dots */}
        <IconRail />

        {/* Center Main White/Ivory Canvas */}
        <div className="md:m-1 flex min-w-0 flex-1 flex-col overflow-hidden md:rounded-3xl bg-[#f7f6f3] shadow-2xl">
          {/* Top Bar Header */}
          <TopHeader />

          {!isOnline ? (
            <div className="mx-4 mb-2.5 flex items-center justify-between rounded-2xl bg-[#dbe878]/25 border border-[#dbe878]/40 px-4 py-2 text-xs font-semibold text-zinc-900 md:mx-8">
              <div className="flex items-center gap-2">
                <WifiOff className="h-3.5 w-3.5 text-zinc-900" />
                <span>Offline Mode — Showing your cached music library</span>
              </div>
              <Link href="/downloaded" className="underline font-bold hover:text-black">
                View Downloads
              </Link>
            </div>
          ) : null}

          {error ? (
            <p className="px-8 pb-2 text-xs font-medium text-rose-500">
              Notice: {error}
            </p>
          ) : null}

          {/* Canvas layout with Right 'Now Playing' panel matching screenshot */}
          <div className="flex min-h-0 flex-1 gap-6 overflow-hidden px-4 pb-4 md:px-8">
            <main
              key={pathname}
              className="no-scrollbar min-h-0 flex-1 overflow-y-auto pr-1 pb-58 md:pb-1"
            >
              {children}
            </main>

            {/* Right Panel Card from Screenshot */}
            <NowPlayingPanel onEditTrack={(song) => setEditingSong(song)} />
          </div>

          {/* Bottom Player for Mobile & Global Ambient Full-screen trigger */}
          <PlayerBar />
          <MobileTabBar />
        </div>

        {/* Global Track Edit Modal */}
        <EditTrackModal
          song={editingSong}
          isOpen={Boolean(editingSong)}
          onClose={() => setEditingSong(null)}
        />
      </div>
    </TrackEditorContext.Provider>
  );
}
