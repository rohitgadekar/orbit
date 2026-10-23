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

        // Wait for SW to be active then warm the app shell cache
        const warmShell = () => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage("CACHE_SHELL");
          }
        };

        if (reg.active) {
          warmShell();
        } else {
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing ?? reg.waiting ?? reg.active;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "activated") warmShell();
            });
          });
        }
      } catch (err) {
        console.warn("[Orbit SW] Registration failed:", err);
      }
    };

    void registerSW();
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
