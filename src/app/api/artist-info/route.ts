import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MUSIC_KEYWORDS =
  /(band|musician|singer|rapper|songwriter|music|artist|group|duo|trio|quartet|composer|producer|orchestra|dj|record|vocalist|guitarist|drummer|pianist)/i;

interface ArtistFetchResult {
  imageUrl: string | null;
  bio: string | null;
  description?: string | null;
  source?: string | null;
}

/**
 * Clean short bio to avoid excess length or weird references
 */
function cleanBioText(raw: string): string {
  let text = raw.replace(/\[\d+\]/g, "").trim();
  // If bio is longer than 600 characters, truncate cleanly at end of sentence
  if (text.length > 600) {
    const periodIndex = text.indexOf(". ", 350);
    if (periodIndex !== -1 && periodIndex < 650) {
      text = text.slice(0, periodIndex + 1);
    } else {
      text = text.slice(0, 500).trim() + "...";
    }
  }
  return text;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json(
      { success: false, error: "Missing artist name" },
      { status: 400 },
    );
  }

  const result: ArtistFetchResult = {
    imageUrl: null,
    bio: null,
    description: null,
    source: null,
  };

  const headers = {
    "User-Agent": "OrbitMusicApp/1.0 (https://orbitmusic.app; hello@orbitmusic.app)",
    Accept: "application/json",
  };

  // 1. Fetch High-Res Artist Image from Deezer
  try {
    const deezerUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}`;
    const deezerRes = await fetch(deezerUrl, {
      signal: AbortSignal.timeout(4000),
    });

    if (deezerRes.ok) {
      const deezerData = await deezerRes.json();
      const artistsList = (deezerData?.data || []) as Array<{
        name: string;
        picture_xl?: string;
        picture_big?: string;
        picture_medium?: string;
      }>;

      // Find exact or closest match
      const lower = name.toLowerCase();
      const match =
        artistsList.find((a) => a.name.toLowerCase() === lower) ||
        artistsList[0];

      if (match) {
        result.imageUrl =
          match.picture_xl || match.picture_big || match.picture_medium || null;
        if (result.imageUrl) {
          result.source = "Deezer";
        }
      }
    }
  } catch (err) {
    console.warn("Deezer fetch failed:", err instanceof Error ? err.message : err);
  }

  // 2. Fetch Short Bio & Fallback Image from Wikipedia REST API
  try {
    const candidates = [
      name,
      name.replace(/\//g, " "),
      `${name} (band)`,
      `${name} (musician)`,
      `${name} (singer)`,
      `${name} (rapper)`,
      `${name} (group)`,
    ];

    for (const cand of candidates) {
      try {
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cand)}`;
        const wikiRes = await fetch(wikiUrl, {
          headers,
          signal: AbortSignal.timeout(3500),
        });

        if (!wikiRes.ok) continue;

        const wikiData = (await wikiRes.json()) as {
          type?: string;
          title?: string;
          description?: string;
          extract?: string;
          originalimage?: { source?: string };
          thumbnail?: { source?: string };
        };

        if (wikiData.type === "disambiguation") continue;

        const isMusicContext =
          (wikiData.description && MUSIC_KEYWORDS.test(wikiData.description)) ||
          (wikiData.extract && MUSIC_KEYWORDS.test(wikiData.extract));

        // Accept if title has specific suffix or context matches music
        if (cand !== name || isMusicContext) {
          if (wikiData.extract) {
            result.bio = cleanBioText(wikiData.extract);
            result.description = wikiData.description || null;
            result.source = result.source ? `${result.source} + Wikipedia` : "Wikipedia";
          }

          if (!result.imageUrl) {
            result.imageUrl =
              wikiData.originalimage?.source ||
              wikiData.thumbnail?.source ||
              null;
          }

          if (result.bio) break;
        }
      } catch {
        // Try next candidate
      }
    }
  } catch (err) {
    console.warn("Wikipedia fetch failed:", err instanceof Error ? err.message : err);
  }

  // 3. Fallback: MusicBrainz if no bio or no image found yet
  if (!result.bio || !result.imageUrl) {
    try {
      const mbUrl = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(name)}&fmt=json`;
      const mbRes = await fetch(mbUrl, {
        headers,
        signal: AbortSignal.timeout(3500),
      });

      if (mbRes.ok) {
        const mbData = await mbRes.json();
        const topArtist = mbData.artists?.[0];

        if (topArtist) {
          if (!result.bio && topArtist.disambiguation) {
            const country = topArtist.country ? ` (${topArtist.country})` : "";
            const disambig = topArtist.disambiguation;
            result.bio = `${topArtist.name} is a ${disambig}${country}.`;
            result.source = result.source ? `${result.source} + MusicBrainz` : "MusicBrainz";
          }
        }
      }
    } catch (err) {
      console.warn("MusicBrainz fallback failed:", err instanceof Error ? err.message : err);
    }
  }

  if (!result.imageUrl && !result.bio) {
    return NextResponse.json({
      success: false,
      message: `No public profile image or bio found on the internet for "${name}".`,
    });
  }

  return NextResponse.json({
    success: true,
    name,
    imageUrl: result.imageUrl,
    bio: result.bio,
    description: result.description,
    source: result.source,
  });
}
