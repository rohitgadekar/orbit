// Orbit Luxury Audio — PWA Service Worker v3
// Strategy: Cache-first for static assets, offline shell fallback for navigation
const SHELL_CACHE = "orbit-shell-v3";
const STATIC_CACHE = "orbit-static-v3";
const RUNTIME_CACHE = "orbit-runtime-v3";

// ─── Static assets to pre-cache on install ────────────────────────────────────
// We only hard-cache the offline shell and key static files.
// Next.js _next/static/* assets are cached dynamically on first visit.
const PRECACHE_SHELL = ["/offline.html", "/orbit.svg", "/manifest.webmanifest"];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        cache.addAll(PRECACHE_SHELL).catch((err) => {
          console.warn("[SW] Precache warning:", err);
        }),
      )
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const VALID = new Set([SHELL_CACHE, STATIC_CACHE, RUNTIME_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !VALID.has(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass: non-GET, Supabase API, external audio/CDN streams
  if (
    request.method !== "GET" ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("cloudinary.com") ||
    url.hostname.includes("googleapis.com")
  ) {
    return;
  }

  // ── Strategy A: _next/static/** — Cache first, fallback network ──────────
  // These content-hashed chunks never change for a given deploy, so cache wins.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // ── Strategy B: Navigation (HTML pages) — Network first, shell fallback ──
  // Try to get a fresh server-rendered page; if offline serve /offline.html
  // which boots the React SPA from already-cached _next/static bundles.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache a copy so the next offline visit can use it
          if (res.ok) {
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, res.clone()));
          }
          return res;
        })
        .catch(async () => {
          // 1. Try runtime cache (previously visited page while online)
          const runtimeHit = await caches.match(request, { cacheName: RUNTIME_CACHE });
          if (runtimeHit) return runtimeHit;

          // 2. Serve the offline shell — React will boot and show /downloaded
          const shell = await caches.match("/offline.html", { cacheName: SHELL_CACHE });
          return (
            shell ||
            new Response("<h1>Orbit is offline</h1><p>Please reconnect to the internet.</p>", {
              headers: { "Content-Type": "text/html" },
            })
          );
        }),
    );
    return;
  }

  // ── Strategy C: Everything else (fonts, images, SVGs) — Stale-while-revalidate
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const hit = await cache.match(request);
      // Kick off a background refresh regardless
      const freshPromise = fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => null);

      return hit || freshPromise;
    }),
  );
});

// ─── Message: force update ────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
