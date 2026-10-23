// Orbit PWA Service Worker — Offline-First
// Bumping CACHE_VERSION forces the SW to reinstall when you deploy new code.
const CACHE_VERSION = "v3";
const SHELL_CACHE = `orbit-shell-${CACHE_VERSION}`;
const PAGES_CACHE = `orbit-pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `orbit-assets-${CACHE_VERSION}`;

// Critical pages to pre-cache on install so offline navigation always works
const PRECACHE_PAGES = [
  "/home",
  "/music",
  "/folders",
  "/favourites",
  "/profile",
  "/downloaded",
  "/settings",
];

// Critical shell files to pre-cache
const PRECACHE_SHELL = [
  "/manifest.webmanifest",
  "/orbit.svg",
];

// ─── SKIP WAITING (allow prompt-less instant updates) ─────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── INSTALL ─────────────────────────────────────────────────────────────────
// Pre-cache pages and shell assets. Don't wait on failures so bad URLs don't
// block the SW from installing.
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) =>
        cache.addAll(PRECACHE_SHELL).catch(() => {})
      ),
      caches.open(PAGES_CACHE).then((cache) =>
        Promise.all(
          PRECACHE_PAGES.map((url) =>
            cache.add(url).catch(() => {})
          )
        )
      ),
    ]).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ────────────────────────────────────────────────────────────────
// Delete all caches not matching the current version.
self.addEventListener("activate", (event) => {
  const VALID = new Set([SHELL_CACHE, PAGES_CACHE, ASSETS_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !VALID.has(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ───────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests on the same origin (or CDN-adjacent paths)
  if (request.method !== "GET") return;

  // ── Skip: Supabase API calls (auth, DB) — never cache these ──────────────
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("supabase.in") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/rest/") ||
    url.pathname.startsWith("/realtime/")
  ) {
    return; // fall through to browser default (no SW intercept)
  }

  // ── Skip: External media / CDN (audio/images) — handled by IndexedDB ─────
  if (
    url.hostname.includes("cloudinary.com") ||
    url.hostname.includes("res.cloudinary") ||
    (url.hostname !== self.location.hostname &&
     !url.pathname.startsWith("/_next/"))
  ) {
    return;
  }

  // ── Strategy 1: Next.js static chunks — Cache First (immutable hashes) ────
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image")
  ) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return cached ?? new Response("Offline", { status: 503 });
        }
      })
    );
    return;
  }

  // ── Strategy 2: HTML Navigation — Network first, cache fallback ────────────
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          // Cache every page we successfully load
          if (response.ok) {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          // Offline — try exact URL match first
          const pagesCache = await caches.open(PAGES_CACHE);
          const exact = await pagesCache.match(request);
          if (exact) return exact;

          // Try matching the pathname without query string
          const pathnameMatch = await pagesCache.match(url.pathname);
          if (pathnameMatch) return pathnameMatch;

          // Fallback to /home shell so the SPA can boot
          const home = await pagesCache.match("/home");
          if (home) return home;

          // Last resort — return a minimal offline page
          return new Response(
            `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Orbit — Offline</title>
<style>
  body{background:#0b0614;color:#dbe878;font-family:system-ui,sans-serif;
       display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
  h1{font-size:2rem;font-weight:700;margin-bottom:0.5rem}
  p{color:#a1a1aa;margin-bottom:1.5rem}
  a{display:inline-block;padding:.75rem 2rem;background:#dbe878;color:#0b0614;
    font-weight:700;border-radius:9999px;text-decoration:none;font-size:.95rem}
</style>
</head>
<body>
<div>
  <h1>🎵 Orbit</h1>
  <p>You appear to be offline.<br>Connect to the internet and reload, or listen to your downloaded music.</p>
  <a href="/downloaded">Downloaded Songs</a>
</div>
</body>
</html>`,
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      })()
    );
    return;
  }

  // ── Strategy 3: Other same-origin assets — Stale-While-Revalidate ─────────
  event.respondWith(
    caches.open(ASSETS_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached ?? new Response("Offline", { status: 503 }));
      return cached ?? fetchPromise;
    })
  );
});
