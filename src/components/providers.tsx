"use client";

import { AuthProvider } from "@/context/auth-context";
import { MusicProvider } from "@/context/music-context";
import { OfflineProvider } from "@/context/offline-context";
import { PlayerProvider } from "@/context/player-context";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Velar Service Worker registered:", registration.scope);
          })
          .catch((error) => {
            console.warn("Service Worker registration failed:", error);
          });
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
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
