import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/** Clean track title of common noise that prevents exact lyric matches */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*[\(\[](feat\.|ft\.|with|official|audio|video|lyrics|remastered|version|deluxe|bonus|edit|mix)[^\)\]]*[\)\]]/gi, "")
    .replace(/\.[a-z0-9]{2,4}$/i, "") // file extensions like .mp3
    .trim();
}

/** Tries to find synced lyrics from LRCLIB with fallback to search API. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawTitle = searchParams.get("title")?.trim();
  const rawArtist = searchParams.get("artist")?.trim();
  const duration = searchParams.get("duration"); // in seconds, optional

  if (!rawTitle) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const title = cleanTitle(rawTitle);
  const artist = rawArtist || "";

  const headers = {
    "Lrclib-Client": "Velar/1.0 (https://github.com/rohitgadekar/velar)",
    "User-Agent": "Velar/1.0",
  };

  try {
    // 1. Try exact get first
    const getParams = new URLSearchParams({ track_name: title });
    if (artist) getParams.set("artist_name", artist);
    if (duration) getParams.set("duration", duration);

    let synced: string | null = null;
    let plain: string | null = null;

    try {
      const res = await fetch(`https://lrclib.net/api/get?${getParams.toString()}`, {
        headers,
        signal: AbortSignal.timeout(3500),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          syncedLyrics?: string | null;
          plainLyrics?: string | null;
        };
        synced = data.syncedLyrics || null;
        plain = data.plainLyrics || null;
      }
    } catch {
      // Continue to search fallback
    }

    // 2. If no synced lyrics yet, try search endpoint
    if (!synced) {
      try {
        const searchQuery = `${title} ${artist}`.trim();
        const searchRes = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`,
          {
            headers,
            signal: AbortSignal.timeout(3500),
          },
        );

        if (searchRes.ok) {
          const results = (await searchRes.json()) as Array<{
            syncedLyrics?: string | null;
            plainLyrics?: string | null;
            duration?: number;
          }>;

          if (Array.isArray(results) && results.length > 0) {
            // Find best result: preferably one with syncedLyrics
            const bestSynced = results.find((r) => Boolean(r.syncedLyrics));
            if (bestSynced?.syncedLyrics) {
              synced = bestSynced.syncedLyrics;
            } else if (!plain && results[0]?.plainLyrics) {
              plain = results[0].plainLyrics;
            }
          }
        }
      } catch {
        // Ignore search error
      }
    }

    return NextResponse.json(
      { synced, plain },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
      },
    );
  } catch {
    return NextResponse.json({ synced: null, plain: null }, { status: 200 });
  }
}
