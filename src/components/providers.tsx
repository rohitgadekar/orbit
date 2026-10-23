"use client";

import { AuthProvider } from "@/context/auth-context";
import { MusicProvider } from "@/context/music-context";
import { OfflineProvider } from "@/context/offline-context";
import { PlayerProvider } from "@/context/player-context";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.log("[Orbit SW] Registered, scope:", reg.scope);

        // Force new SW to activate immediately (skip waiting)
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available — tell it to activate now
              newWorker.postMessage("SKIP_WAITING");
            }
          });
        });
      } catch (err) {
        console.warn("[Orbit SW] Registration failed:", err);
      }
    };

    // Register immediately, not just on 'load', so PWA launch has SW available
    void registerSW();

    // Reload page once new SW takes control (seamless update)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
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
