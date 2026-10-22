"use client";

import { AuthProvider } from "@/context/auth-context";
import { MusicProvider } from "@/context/music-context";
import { PlayerProvider } from "@/context/player-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <MusicProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </MusicProvider>
    </AuthProvider>
  );
}
