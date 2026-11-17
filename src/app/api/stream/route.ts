import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// In-memory cache for songId -> audio_url to avoid repeating DB hits on audio chunking / range requests
const audioUrlCache = new Map<string, { url: string; expiresAt: number }>();

// Periodic cleanup of cache
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of audioUrlCache.entries()) {
    if (now >= value.expiresAt) {
      audioUrlCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

/**
 * Checks whether the audio source host is an allowed provider.
 * Supports any Cloudinary and ImageKit accounts / subdomains, plus local/fallback hosts.
 */
function isAllowedAudioHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "res.cloudinary.com" ||
    h.endsWith(".cloudinary.com") ||
    h === "ik.imagekit.io" ||
    h.endsWith(".imagekit.io") ||
    h === "pagalnew.com" ||
    h.endsWith(".pagalnew.com")
  );
}

/**
 * Validates request origin, referer, and browser security headers.
 * Blocks cross-origin embedding, foreign sites, and hotlinking.
 */
function getAllowedOrigin(req: NextRequest): string | null {
  const host = req.headers.get("host"); // e.g., "orbit.app" or "localhost:3000"
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const secFetchSite = req.headers.get("sec-fetch-site");

  // 1. If modern browser marks the request as cross-site, strictly deny
  if (secFetchSite === "cross-site") {
    return null;
  }

  // 2. Validate Origin header (sent on CORS fetch / media requests)
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (
        parsed.protocol === "capacitor:" ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1"
      ) {
        return origin;
      }
      if (host && (parsed.host === host || parsed.host.endsWith(`.${host}`))) {
        return origin;
      }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (appUrl) {
        const parsedApp = new URL(appUrl);
        if (parsed.host === parsedApp.host) {
          return origin;
        }
      }
      // Any other external origin is blocked
      return null;
    } catch {
      return null;
    }
  }

  // 3. Validate Referer header (sent when <audio src="..."> plays)
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (
        parsed.protocol === "capacitor:" ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1"
      ) {
        return parsed.origin;
      }
      if (host && (parsed.host === host || parsed.host.endsWith(`.${host}`))) {
        return parsed.origin;
      }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (appUrl) {
        const parsedApp = new URL(appUrl);
        if (parsed.host === parsedApp.host) {
          return parsed.origin;
        }
      }
      // Referer from foreign domain is blocked
      return null;
    } catch {
      return null;
    }
  }

  // 4. If Sec-Fetch-Site is same-origin or same-site, allow
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
    return host ? `https://${host}` : "*";
  }

  // Default to allowing internal requests where origin/referer may be omitted (e.g. Capacitor / mobile)
  return host ? `https://${host}` : "*";
}

/**
 * Handle OPTIONS preflight for CORS
 */
export async function OPTIONS(req: NextRequest) {
  const allowedOrigin = getAllowedOrigin(req);
  if (!allowedOrigin) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type, Accept",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * Main audio streaming handler supporting HTTP 206 Partial Content (Range requests)
 */
export async function GET(req: NextRequest) {
  const allowedOrigin = getAllowedOrigin(req);
  if (!allowedOrigin) {
    return new Response(
      JSON.stringify({ error: "Access denied: Cross-origin playback is blocked." }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { searchParams } = req.nextUrl;
  const songId = searchParams.get("id");
  const targetUrl = searchParams.get("url");

  if (!songId && !targetUrl) {
    return new Response("Missing id or url parameter", { status: 400 });
  }

  let audioUrl = "";

  if (songId) {
    // 1. Fast cache check
    const cached = audioUrlCache.get(songId);
    if (cached && Date.now() < cached.expiresAt) {
      audioUrl = cached.url;
    } else {
      if (!supabaseUrl || !supabaseKey) {
        return new Response("Database configuration missing", { status: 500 });
      }

      const { data, error } = await supabase
        .from("songs")
        .select("audio_url")
        .eq("id", songId)
        .single();

      if (error || !data?.audio_url) {
        return new Response("Song not found", { status: 404 });
      }

      audioUrl = data.audio_url;
      audioUrlCache.set(songId, {
        url: audioUrl,
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
      });
    }
  } else if (targetUrl) {
    audioUrl = targetUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(audioUrl);
  } catch {
    return new Response("Invalid audio URL", { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return new Response("Invalid protocol", { status: 400 });
  }

  if (!isAllowedAudioHost(parsed.hostname)) {
    return new Response("Audio host not allowed", { status: 403 });
  }

  // Forward Range header if requested by audio player
  const upstreamHeaders: HeadersInit = {
    "User-Agent": "Orbit-Streamer/1.0",
    Referer: `${parsed.origin}/`,
  };

  const range = req.headers.get("range");
  if (range) {
    upstreamHeaders["Range"] = range;
  }

  const upstream = await fetch(parsed.toString(), {
    headers: upstreamHeaders,
    redirect: "follow",
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Upstream playback error: ${upstream.statusText}`, {
      status: upstream.status,
    });
  }

  const contentType = upstream.headers.get("content-type") || "audio/mpeg";
  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=3600");

  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
  headers.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

export async function HEAD(req: NextRequest) {
  const allowedOrigin = getAllowedOrigin(req);
  if (!allowedOrigin) {
    return new Response(null, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const songId = searchParams.get("id");
  const targetUrl = searchParams.get("url");

  if (!songId && !targetUrl) {
    return new Response(null, { status: 400 });
  }

  let audioUrl = targetUrl || "";
  if (songId) {
    const cached = audioUrlCache.get(songId);
    if (cached) {
      audioUrl = cached.url;
    } else {
      const { data } = await supabase
        .from("songs")
        .select("audio_url")
        .eq("id", songId)
        .single();
      if (data?.audio_url) audioUrl = data.audio_url;
    }
  }

  if (!audioUrl) return new Response(null, { status: 404 });

  try {
    const parsed = new URL(audioUrl);
    if (!isAllowedAudioHost(parsed.hostname)) {
      return new Response(null, { status: 403 });
    }

    const upstream = await fetch(parsed.toString(), {
      method: "HEAD",
      headers: {
        "User-Agent": "Orbit-Streamer/1.0",
        Referer: `${parsed.origin}/`,
      },
    });

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    headers.set("Accept-Ranges", "bytes");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
    headers.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");

    return new Response(null, {
      status: upstream.status,
      headers,
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}
