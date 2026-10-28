import { NextRequest } from "next/server";

export const runtime = "edge"; // streams the body, avoids serverless size limits

// Only proxy hosts you choose, otherwise anyone can use your server as an open proxy
const ALLOWED_HOSTS = ["pagalnew.com"];

export async function GET(req: NextRequest) {
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

    const allowed = ALLOWED_HOSTS.some(
        (h) => url.hostname === h || url.hostname.endsWith(`.${h}`),
    );
    if (!allowed) return new Response("Host not allowed", { status: 403 });

    const upstream = await fetch(url.toString(), {
        redirect: "follow",
        headers: {
            "User-Agent": "Mozilla/5.0",
            Referer: `${url.origin}/`, // helps with hotlink protection
        },
    });

    if (!upstream.ok || !upstream.body) {
        return new Response("Upstream error", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") || "audio/mpeg";
    // Guard against HTML pages being saved as "audio"
    if (contentType.includes("text/html")) {
        return new Response("URL is a web page, not an audio file", { status: 422 });
    }

    const headers = new Headers({
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
    });
    const len = upstream.headers.get("content-length");
    if (len) headers.set("Content-Length", len); // keeps your progress bar working

    return new Response(upstream.body, { status: 200, headers });
}