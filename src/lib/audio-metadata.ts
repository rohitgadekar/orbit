import { getAudioDuration } from "@/lib/audio-duration";

export interface AudioMetadataResult {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  coverUrl?: string;
}

const metadataCache = new Map<string, AudioMetadataResult>();

/**
 * Parses client-side fallback metadata directly from the URL when offline or API is unavailable.
 */
function parseClientFallbackFromUrl(rawUrl: string): {
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

    title = title.replace(/^\d+[\.\-\s]+/, "").replace(/[_\+]/g, " ").trim();
    if (title && title === title.toLowerCase()) {
      title = title.replace(/\b[a-z]/g, (c) => c.toUpperCase());
    }

    if (!artist && artistCandidate) {
      artist = artistCandidate;
    }

    // Normalize multiple artists
    if (artist) {
      const splitArtists = artist
        .split(/\s*(?:\/|;|\bfeat\.?|\bft\.?|\bfeaturing\b|\bwith\b|\bx\b|\&)\s*/i)
        .map((a) => a.trim())
        .filter(Boolean);
      artist = Array.from(new Set(splitArtists)).join(", ");
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
 * Detects song title, comma-separated artist name(s), album title, duration, and artwork
 * from an audio stream URL via server ID3 parsing + audio duration + fallback heuristics.
 */
export async function detectAudioMetadata(
  url: string,
  timeoutMs = 9000,
): Promise<AudioMetadataResult> {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid audio stream URL");
  }

  let cleanUrl = url.trim().replace(/^["']|["']$/g, "").trim();
  if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
    throw new Error("URL must begin with http:// or https://");
  }

  if (metadataCache.has(cleanUrl)) {
    return metadataCache.get(cleanUrl)!;
  }

  let result: AudioMetadataResult = {};

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const apiEndpoint = `/api/detect-metadata?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(apiEndpoint, { signal: controller.signal }).finally(() =>
      clearTimeout(timer),
    );

    if (res.ok) {
      const data = (await res.json()) as AudioMetadataResult;
      result = {
        title: data.title,
        artist: data.artist,
        album: data.album,
        duration: data.duration,
        coverUrl: data.coverUrl,
      };
    }
  } catch (err) {
    console.warn("API metadata detection failed, using client fallback:", err);
  }

  // If title or artist missing from API, fill from client-side URL fallback
  if (!result.title || !result.artist || !result.album) {
    const fallback = parseClientFallbackFromUrl(cleanUrl);
    if (!result.title && fallback.title) result.title = fallback.title;
    if (!result.artist && fallback.artist) result.artist = fallback.artist;
    if (!result.album && fallback.album) result.album = fallback.album;
  }

  // If duration missing, detect via HTML5 Audio element
  if (!result.duration || result.duration <= 0) {
    try {
      const dur = await getAudioDuration(cleanUrl, 6000);
      if (dur > 0) {
        result.duration = dur;
      }
    } catch {
      // Audio element duration detection fallback ignored
    }
  }

  metadataCache.set(cleanUrl, result);
  return result;
}
