import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** Tries to find synced lyrics from LRCLIB. Falls back to plain lyrics if not found. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title")?.trim();
  const artist = searchParams.get("artist")?.trim();
  const duration = searchParams.get("duration"); // in seconds, optional

  if (!title || !artist) {
    return NextResponse.json({ error: "Missing title or artist" }, { status: 400 });
  }

  const params = new URLSearchParams({ track_name: title, artist_name: artist });
  if (duration) params.set("duration", duration);

  try {
    const res = await fetch(
      `https://lrclib.net/api/get?${params.toString()}`,
      {
        headers: { "Lrclib-Client": "Orbit/1.0 (https://github.com/rohitgadekar/orbit)" },
        // 4 second timeout
        signal: AbortSignal.timeout(4000),
      },
    );

    if (!res.ok) {
      return NextResponse.json({ synced: null, plain: null }, { status: 200 });
    }

    const data = (await res.json()) as {
      syncedLyrics?: string | null;
      plainLyrics?: string | null;
    };

    return NextResponse.json(
      {
        synced: data.syncedLyrics || null,
        plain: data.plainLyrics || null,
      },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
      },
    );
  } catch {
    return NextResponse.json({ synced: null, plain: null }, { status: 200 });
  }
}
