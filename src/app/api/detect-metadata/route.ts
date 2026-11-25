import { NextResponse } from "next/server";
import { parseBuffer } from "music-metadata";

export const dynamic = "force-dynamic";

/**
 * Normalizes artist names:
 * - Handles array of artists
 * - Splits by collaboration markers: feat, ft, featuring, with, x, /, ;, &
 * - Extracts featured artists from title: e.g. "Song Name (feat. Kendrick Lamar)"
 * - Returns clean comma-separated list: e.g. "Drake, Kendrick Lamar"
 */
function normalizeArtists(
  artistInput?: string | string[],
  titleInput?: string,
): { artistString: string; cleanedTitle: string } {
  const artists: string[] = [];

  function addArtist(name?: string) {
    if (!name) return;
    const clean = name.trim().replace(/^["']|["']$/g, "").trim();
    if (!clean) return;
    // Prevent duplicate artists (case-insensitive)
    const lower = clean.toLowerCase();
    if (!artists.some((a) => a.toLowerCase() === lower)) {
      artists.push(clean);
    }
  }

  // 1. Process artists list or string
  const rawList = Array.isArray(artistInput) ? artistInput : [artistInput];
  for (const item of rawList) {
    if (!item) continue;
    // Split by collab markers: feat, ft, featuring, with, x, /, ;, &
    const parts = String(item).split(
      /\s*(?:\/|;|\bfeat\.?|\bft\.?|\bfeaturing\b|\bwith\b|\bx\b|\&)\s*/i,
    );
    for (const p of parts) {
      const subParts = p.split(/\s*,\s*/);
      for (const sp of subParts) {
        addArtist(sp);
      }
    }
  }

  // 2. Also check song title for (feat. ...) or [ft. ...]
  let cleanedTitle = (titleInput || "").trim();
  if (cleanedTitle) {
    const featMatch = cleanedTitle.match(
      /[\(\[]\s*(?:feat\.?|ft\.?|featuring)\s+([^\)\]]+)[\)\]]/i,
    );
    if (featMatch && featMatch[1]) {
      const featParts = featMatch[1].split(
        /\s*(?:,|&|\band\b|\bfeat\.?|\bft\.?|\bfeaturing\b|\bwith\b|\bx\b|\/|;)\s*/i,
      );
      for (const fp of featParts) {
        addArtist(fp);
      }
      cleanedTitle = cleanedTitle
        .replace(/[\(\[]\s*(?:feat\.?|ft\.?|featuring)\s+[^\)\]]+[\)\]]/i, "")
        .trim();
    }
  }

  return {
    artistString: artists.join(", "),
    cleanedTitle,
  };
}

/**
 * Intelligent fallback parser from URL / filename
 */
function parseMetadataFromUrl(rawUrl: string): {
  title?: string;
  artist?: string;
  album?: string;
} {
  try {
    const urlObj = new URL(rawUrl);
    const pathname = decodeURIComponent(urlObj.pathname);
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return {};

    const last = segments[segments.length - 1];
    const filename = last.replace(
      /\.(mp3|m4a|flac|wav|ogg|aac|webm|opus|aiff|alac)$/i,
      "",
    );

    let albumCandidate = "";
    let artistCandidate = "";

    if (segments.length >= 2) {
      const prev = segments[segments.length - 2];
      if (!/^(upload|video|music|audio|tracks|files|media|v\d+|\d+)$/i.test(prev)) {
        albumCandidate = prev.replace(/[_\+]/g, " ").trim();
      }
    }

    if (segments.length >= 3) {
      const prevPrev = segments[segments.length - 3];
      if (!/^(upload|video|music|audio|tracks|files|media|v\d+|\d+)$/i.test(prevPrev)) {
        artistCandidate = prevPrev.replace(/[_\+]/g, " ").trim();
      }
    }

    // Split filename by hyphen
    const parts = filename.split(/\s*-\s*/);
    let title = "";
    let artist = "";
    let album = albumCandidate;

    if (parts.length >= 3) {
      artist = parts[0];
      if (/^\d+$/.test(parts[1].trim())) {
        title = parts.slice(2).join(" - ");
      } else {
        album = parts[1];
        title = parts.slice(2).join(" - ");
      }
    } else if (parts.length === 2) {
      if (/^\d+$/.test(parts[0].trim())) {
        title = parts[1];
      } else {
        artist = parts[0];
        title = parts[1];
      }
    } else {
      title = filename;
    }

    // Clean track numbering e.g. "01 ", "01. ", "1 - "
    title = title.replace(/^\d+[\.\-\s]+/, "").replace(/[_\+]/g, " ").trim();

    // Auto title-case if entirely lowercase
    if (title && title === title.toLowerCase()) {
      title = title.replace(/\b[a-z]/g, (c) => c.toUpperCase());
    }

    if (!artist && artistCandidate) {
      artist = artistCandidate;
    }

    return {
      title: title || undefined,
      artist: artist || undefined,
      album: album || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Reads up to maxBytes (512KB) from a streaming response
 */
async function readFirstChunk(response: Response, maxBytes = 524288): Promise<Buffer> {
  if (!response.body) {
    const ab = await response.arrayBuffer();
    return Buffer.from(ab.slice(0, maxBytes));
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      totalBytes += value.length;
      if (totalBytes >= maxBytes) break;
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Ignore cancellation error
    }
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(combined);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url")?.trim();

  if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
    return NextResponse.json(
      { error: "Invalid audio URL. Must begin with http:// or https://" },
      { status: 400 },
    );
  }

  // Pre-calculate URL heuristic fallbacks
  const urlParsed = parseMetadataFromUrl(targetUrl);

  let id3Title: string | undefined;
  let id3Artists: string[] = [];
  let id3Album: string | undefined;
  let id3Duration: number | undefined;
  let id3Cover: string | undefined;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    const audioResp = await fetch(targetUrl, {
      headers: {
        Range: "bytes=0-524287",
        "User-Agent": "OrbitMusicStreamDetector/1.0",
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (audioResp.ok || audioResp.status === 206) {
      const contentType = audioResp.headers.get("content-type") || undefined;
      const buffer = await readFirstChunk(audioResp, 524288);

      if (buffer.length > 0) {
        try {
          const meta = await parseBuffer(buffer, {
            mimeType: contentType,
            path: targetUrl,
          });

          if (meta.common.title) id3Title = meta.common.title.trim();
          if (meta.common.artists && meta.common.artists.length > 0) {
            id3Artists = meta.common.artists;
          } else if (meta.common.artist) {
            id3Artists = [meta.common.artist];
          }
          if (meta.common.album) id3Album = meta.common.album.trim();

          if (meta.format.duration && Number.isFinite(meta.format.duration) && meta.format.duration > 0) {
            id3Duration = Math.round(meta.format.duration);
          }

          // Embedded cover artwork extraction (omit oversized base64 to prevent database bloat)
          if (meta.common.picture && meta.common.picture.length > 0) {
            const pic = meta.common.picture[0];
            if (pic.data && pic.data.length <= 40000) {
              const base64 = Buffer.from(pic.data).toString("base64");
              const mime = pic.format || "image/jpeg";
              id3Cover = `data:${mime};base64,${base64}`;
            }
          }
        } catch {
          // Stream parsing error; fallback to URL parser
        }
      }
    }
  } catch (fetchErr) {
    console.warn("Server audio metadata fetch warning:", fetchErr);
  }

  // Combine ID3 metadata with URL heuristics
  const rawTitle = id3Title || urlParsed.title || "";
  const rawArtistList =
    id3Artists.length > 0
      ? id3Artists
      : urlParsed.artist
      ? [urlParsed.artist]
      : [];
  const rawAlbum = id3Album || urlParsed.album || "";

  // Normalize artists (comma separated) and clean title
  const { artistString, cleanedTitle } = normalizeArtists(rawArtistList, rawTitle);

  // Search high-res CDN cover artwork from iTunes (avoids storing massive base64 in Supabase)
  if (cleanedTitle || rawTitle) {
    try {
      const searchTerm = encodeURIComponent(`${cleanedTitle || rawTitle} ${artistString || ""}`.trim());
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${searchTerm}&entity=song&limit=1`,
        { signal: AbortSignal.timeout(3500) },
      );
      if (itunesRes.ok) {
        const itunesData = await itunesRes.json();
        if (itunesData.results?.[0]?.artworkUrl100) {
          id3Cover = itunesData.results[0].artworkUrl100.replace("100x100bb", "600x600bb");
        }
      }
    } catch {
      // Non-fatal fallback
    }
  }

  return NextResponse.json({
    title: cleanedTitle || rawTitle || undefined,
    artist: artistString || undefined,
    album: rawAlbum || undefined,
    duration: id3Duration || undefined,
    coverUrl: id3Cover || undefined,
  });
}
