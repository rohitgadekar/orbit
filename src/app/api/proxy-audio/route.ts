import { NextRequest } from "next/server";

export const runtime = "edge"; // streams the body, avoids serverless size limits

function isAllowedHost(hostname: string): boolean {
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

function getAllowedOrigin(req: NextRequest): string | null {
  const host = req.headers.get("host");
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const secFetchSite = req.headers.get("sec-fetch-site");

  if (secFetchSite === "cross-site") {
    return null;
  }

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
      return null;
    } catch {
      return null;
    }
  }

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
      return null;
    } catch {
      return null;
    }
  }

  return host ? `https://${host}` : "*";
}

export async function GET(req: NextRequest) {
  const allowedOrigin = getAllowedOrigin(req);
  if (!allowedOrigin) {
    return new Response("Access denied: Cross-origin proxy blocked", { status: 403 });
  }

  const target = req.nextUrl.searchParams.get("url");
  if (!target) return new Response("Missing url", { status: 400 });

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return new Response("Bad protocol", { status: 400 });
  }

  if (!isAllowedHost(url.hostname)) {
    return new Response("Host not allowed", { status: 403 });
  }

  const upstreamHeaders: HeadersInit = {
    "User-Agent": "Orbit-Proxy/1.0",
    Referer: `${url.origin}/`,
  };

  const range = req.headers.get("range");
  if (range) {
    upstreamHeaders["Range"] = range;
  }

  const upstream = await fetch(url.toString(), {
    redirect: "follow",
    headers: upstreamHeaders,
  });

  if (!upstream.ok && upstream.status !== 206) {
    const snippet = (await upstream.text().catch(() => "")).slice(0, 300);
    console.error("Upstream failed", upstream.status, upstream.url, snippet);
    return new Response(
      `Upstream ${upstream.status} from ${upstream.url}\n${snippet}`,
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") || "audio/mpeg";
  if (contentType.includes("text/html")) {
    return new Response("URL is a web page, not an audio file", { status: 422 });
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=3600",
    "Accept-Ranges": "bytes",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  });

  const contentRange = upstream.headers.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);

  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);

  return new Response(upstream.body, { status: upstream.status, headers });
}
