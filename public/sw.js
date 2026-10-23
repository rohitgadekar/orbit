// Orbit Luxury Audio PWA Service Worker
const CACHE_NAME = "orbit-app-shell-v1";

const APP_SHELL_URLS = [
  "/",
  "/home",
  "/music",
  "/folders",
  "/favourites",
  "/profile",
  "/settings",
  "/manifest.webmanifest",
  "/orbit.svg",
];

// Install: Cache critical app shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_URLS).catch((err) => {
        console.warn("Service worker precache partial error:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
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

// Fetch: Network first with cache fallback for navigation, cache first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Don't intercept Supabase API requests or external media directly in SW (handled by IndexedDB)
  if (
    request.url.includes("supabase.co") ||
    request.url.includes("cloudinary.com") ||
    request.method !== "GET"
  ) {
    return;
  }

  // Navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const homeFallback = await caches.match("/home");
          if (homeFallback) return homeFallback;
          return caches.match("/");
        })
    );
    return;
  }

  // Static assets (_next, static files, fonts, images)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (stale-while-revalidate)
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
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (request.url.includes("/_next/") || request.url.includes("/orbit.svg"))
          ) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // If totally offline and resource isn't cached
          return new Response("", { status: 408, statusText: "Offline" });
        });
    })
  );
});
