// Orbit Luxury Audio PWA Service Worker — Offline & Shell Caching
const CACHE_NAME = "orbit-app-cache-v4";

const APP_SHELL_URLS = [
  "/",
  "/home",
  "/downloaded",
  "/music",
  "/folders",
  "/favourites",
  "/profile",
  "/settings",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/orbit-32.png",
  "/orbit-16.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
];

// Install: Cache all critical app routes safely without atomic failure
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Fetch each URL individually so one failure does not abort the whole precache
      await Promise.allSettled(
        APP_SHELL_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { credentials: "same-origin" });
            if (response && (response.status === 200 || response.type === "opaque")) {
              await cache.put(url, response);
            }
          } catch (e) {
            // Silently continue for other URLs
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip Supabase API, external streams (Cloudinary), or non-GET requests
  // Audio files and covers are cached separately in IndexedDB by orbit-offline-db
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("cloudinary.com") ||
    request.method !== "GET"
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline navigation fallback: try exact route, then /downloaded, then /home, then /
          const cached = await caches.match(request);
          if (cached) return cached;

          const downloadedFallback = await caches.match("/downloaded");
          if (downloadedFallback) return downloadedFallback;

          const homeFallback = await caches.match("/home");
          if (homeFallback) return homeFallback;

          const rootFallback = await caches.match("/");
          if (rootFallback) return rootFallback;

          return new Response(
            "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Orbit Offline</title></head><body style='background:#18171a;color:#fff;font-family:sans-serif;padding:2rem;text-align:center;'><h2>Orbit is Offline</h2><p>Please connect to the internet or reopen the app.</p></body></html>",
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // 2. Next.js RSC (React Server Component) payloads & data fetches
  const isRSC =
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    url.pathname.includes("/_next/data/");

  if (isRSC) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline and RSC payload is cached, return it
          const cached = await caches.match(request);
          if (cached) return cached;

          // If not in cache, try matching without query params
          const cleanUrl = url.origin + url.pathname;
          const cleanCached = await caches.match(cleanUrl);
          if (cleanCached) return cleanCached;

          // Return empty 204 response so Next.js doesn't crash or hard reload
          return new Response(null, { status: 204, statusText: "Offline Cached Data" });
        })
    );
    return;
  }

  // 3. Static Assets: JS bundles (_next/static/*), CSS, fonts, SVG icons
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname === "/manifest.webmanifest";

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background when online
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response("", { status: 408, statusText: "Offline" });
          });
      })
    );
    return;
  }

  // 4. Default: Network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
