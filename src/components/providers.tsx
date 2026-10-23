"use client";

import { AuthProvider } from "@/context/auth-context";
import { MusicProvider } from "@/context/music-context";
import { OfflineProvider } from "@/context/offline-context";
import { PlayerProvider } from "@/context/player-context";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Register SW immediately (not on "load" — avoids delay for returning PWA users)
    navigator.serviceWorker
      .register("/sw.js", {
        // Always check for a new SW version (don't use browser HTTP cache for sw.js itself)
        updateViaCache: "none",
      })
      .then((registration) => {
        // Force the waiting SW to activate immediately when a new version is found
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New SW installed — post a SKIP_WAITING message so it activates now
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((error) => {
        console.warn("Service Worker registration failed:", error);
      });

    // When the SW takes control (after SKIP_WAITING), reload once so the new
    // cached assets are served without needing a manual refresh.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
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
