// Orbit Luxury Audio — PWA Service Worker v4
// Full SPA offline strategy: cache the real app shell, not a static page
const SHELL_CACHE = "orbit-shell-v4";
const STATIC_CACHE = "orbit-static-v4";
const RUNTIME_CACHE = "orbit-runtime-v4";

// The URL that produces our real app HTML (any page works since Next.js hydrates the same root)
const APP_SHELL_URL = "/home";

// ─── Install: pre-cache static files only (not pages, handled at runtime) ────
self.addEventListener("install", (event) => {
  // Skip waiting immediately so updated SW activates ASAP
  self.skipWaiting();

  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.allSettled([
        cache.add("/orbit.svg"),
        cache.add("/manifest.webmanifest"),
      ]),
    ),
  );
});

// ─── Activate: delete old caches ─────────────────────────────────────────────
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

  // ── Bypass: non-GET, Supabase, audio streams, external CDN ───────────────
  if (
    request.method !== "GET" ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("cloudinary.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    // Don't intercept Next.js server actions or RSC payloads
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1"
  ) {
    return;
  }

  // ── Strategy 1: Next.js static assets → Cache-first (content-hashed, safe) ─
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

  // ── Strategy 2: Navigation requests (HTML pages) ──────────────────────────
  // Network-first. On failure, serve the real cached app shell so React boots
  // and client-side routing can navigate to /downloaded without the server.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            // Cache every successfully loaded page as a potential shell
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));

            // Also update our app shell with the freshest HTML
            if (url.pathname === APP_SHELL_URL || url.pathname === "/home") {
              caches.open(SHELL_CACHE).then((cache) =>
                cache.put(new Request(APP_SHELL_URL), res.clone()),
              );
            }
          }
          return res;
        })
        .catch(async () => {
          // 1. Try the exact page they wanted (previously cached while online)
          const exactHit = await caches.match(request, { cacheName: RUNTIME_CACHE });
          if (exactHit) return exactHit;

          // 2. Serve the real app shell — React will boot and Next.js client
          //    router will handle navigating to the correct route offline.
          //    This is exactly how Spotify/Apple Music PWAs work offline.
          const shellHit = await caches.match(APP_SHELL_URL, { cacheName: SHELL_CACHE });
          if (shellHit) {
            // Clone and return — the JS bundles are in STATIC_CACHE and will load
            return shellHit.clone();
          }

          // 3. Last resort: any cached navigation page
          const anyPage = await caches.match("/", { cacheName: RUNTIME_CACHE });
          if (anyPage) return anyPage;

          // 4. Absolute fallback: minimal response
          return new Response(
            `<!DOCTYPE html><html><head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <meta name="theme-color" content="#181719">
              <title>Orbit — Offline</title>
              <style>
                body{font-family:system-ui;background:#0e0c11;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem;gap:1rem;margin:0}
                h1{font-size:1.5rem;font-weight:800}
                p{color:#7c7a85;font-size:0.9rem;max-width:280px}
                a{display:inline-block;margin-top:1rem;padding:0.75rem 2rem;background:#dbe878;color:#0e0c11;border-radius:99px;font-weight:700;text-decoration:none;font-size:0.875rem}
              </style>
            </head><body>
              <h1>🎵 Orbit</h1>
              <p>You're offline. Open the app once while connected to enable full offline support.</p>
              <p style="font-size:0.75rem;color:#555">Make sure to visit Orbit online first so assets can be cached.</p>
            </body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }),
    );
    return;
  }

  // ── Strategy 3: Everything else (fonts, images, icons) — Stale-while-revalidate
  if (
    url.pathname.includes("/fonts/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".ico")
  ) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        // Revalidate in background
        const fresh = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => null);

        return hit || fresh;
      }),
    );
    return;
  }

  // ── All other same-origin requests: network with cache fallback ───────────
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, res.clone()));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(request);
        return hit || new Response("", { status: 408, statusText: "Offline" });
      }),
  );
});

// ─── Message handler ──────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  // Allow the page to trigger a cache of the app shell
  if (event.data === "CACHE_SHELL") {
    fetch(APP_SHELL_URL).then((res) => {
      if (res.ok) {
        caches.open(SHELL_CACHE).then((cache) => {
          cache.put(new Request(APP_SHELL_URL), res);
        });
      }
    });
  }
});
