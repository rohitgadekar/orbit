"use client";

import { AuthProvider } from "@/context/auth-context";
import { MusicProvider } from "@/context/music-context";
import { OfflineProvider } from "@/context/offline-context";
import { PlayerProvider } from "@/context/player-context";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Orbit Service Worker registered successfully:", registration.scope);
          })
          .catch((error) => {
            console.warn("Service Worker registration failed:", error);
          });
      });
    }
  }, []);

  return (
    <AuthProvider>
      <MusicProvider>
        <OfflineProvider>
          <PlayerProvider>{children}</PlayerProvider>
        </OfflineProvider>
      </MusicProvider>
    </AuthProvider>
  );
}
