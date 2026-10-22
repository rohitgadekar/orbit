import type { Artist, Song } from "./types";

const PRESERVED_BAND_NAMES = new Set([
  "simon & garfunkel",
  "earth, wind & fire",
  "above & beyond",
  "crosby, stills, nash & young",
  "hall & oates",
  "brooks & dunn",
  "dan + shay",
]);

/**
 * Splits raw artist credit strings (e.g., "Calvin Harris, Ayah Marar", "2 Chainz, Wiz Khalifa",
 * "Gotye feat. Kimbra", "Internet Money, Gunna, Don Toliver") into distinct, cleaned artist names.
 */
export function splitArtistNames(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  if (PRESERVED_BAND_NAMES.has(lower)) {
    return [trimmed];
  }

  // Normalize delimiters: features, ampersands, slashes
  const normalized = trimmed
    .replace(/\s+(feat\.?|ft\.?|featuring|with)\s+/gi, ", ")
    .replace(/\s+&\s+/g, ", ")
    .replace(/\s*\/\s*/g, ", ");

  const parts = normalized
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Return unique artist names preserving order
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(part);
    }
  }

  return result.length > 0 ? result : [trimmed];
}

export type ParsedArtist = {
  id: string;
  name: string;
  image_url: string | null;
  songs: Song[];
  plays: number;
  trackCount: number;
  bio?: string | null;
};

/**
 * Extracts featured artist names from track titles (e.g. "We Don't Talk Anymore (feat. Selena Gomez)").
 */
export function extractArtistsFromTitle(title: string | null | undefined): string[] {
  if (!title) return [];
  const matches = title.match(/(?:\(|\[)?\s*(?:feat\.?|ft\.?|featuring|with)\s+([^\]\)]+)(?:\)|\])?/gi);
  if (!matches) return [];

  const results: string[] = [];
  for (const match of matches) {
    const cleaned = match
      .replace(/^[(\[]?\s*(?:feat\.?|ft\.?|featuring|with)\s+/i, "")
      .replace(/[)\]]$/, "")
      .trim();
    if (cleaned) {
      results.push(...splitArtistNames(cleaned));
    }
  }
  return results;
}

/**
 * Returns true if a song credits the given artist (in the artist field, title features, or artist_id).
 */
export function songCreditsArtist(song: Song, artistNameOrId: string): boolean {
  if (!artistNameOrId || !song) return false;
  const target = artistNameOrId.toLowerCase().trim();
  if (!target) return false;

  // Direct ID check if UUID
  if (song.artist_id && song.artist_id.toLowerCase() === target) return true;
  if (song.artist?.id && song.artist.id.toLowerCase() === target) return true;

  // Direct artist name check
  const rawArtist = (song.artist?.name || "").toLowerCase().trim();
  if (rawArtist === target) return true;

  // Check split artist names
  const creditedNames = splitArtistNames(song.artist?.name);
  if (creditedNames.some((n) => n.toLowerCase().trim() === target)) return true;

  // Check title featured artists
  const titleArtists = extractArtistsFromTitle(song.title);
  if (titleArtists.some((n) => n.toLowerCase().trim() === target)) return true;

  // Check word boundary match in raw artist name (e.g. "Selena Gomez" inside "Wiz Khalifa, Selena Gomez")
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(^|[,/&+]|\\bfeat\\.?|\\bft\\.?|\\bwith\\b)\\s*${escaped}\\s*($|[,/&+]|\\bfeat\\.?|\\bft\\.?|\\bwith\\b)`, "i");
  if (regex.test(rawArtist)) return true;

  return false;
}

/**
 * Groups catalog songs by individual artist strictly using dynamic details stored in the database.
 * If a song credits multiple artists (e.g. Calvin Harris & Ayah Marar, or Wiz Khalifa and Selena Gomez),
 * the song is placed in EVERY credited artist's discography.
 */
export function getIndividualArtists(
  songs: Song[],
  catalogArtists?: Artist[],
): ParsedArtist[] {
  const map = new Map<string, ParsedArtist>();

  // 1. Process all songs and collect every credited artist
  for (const song of songs) {
    const rawArtistName = song.artist?.name || "Unknown Artist";
    const creditedNames = new Set<string>([
      ...splitArtistNames(rawArtistName),
      ...extractArtistsFromTitle(song.title),
    ]);

    for (const name of creditedNames) {
      const key = name.toLowerCase().trim();
      if (!key) continue;

      if (!map.has(key)) {
        // Find if this artist exists in Supabase catalog
        const catalogMatch = catalogArtists?.find(
          (a) => a.name.toLowerCase().trim() === key,
        );

        map.set(key, {
          id: catalogMatch?.id || `artist-${encodeURIComponent(key)}`,
          name: catalogMatch?.name || name,
          image_url: catalogMatch?.image_url || null,
          songs: [],
          plays: 0,
          trackCount: 0,
          bio: catalogMatch?.bio || null,
        });
      }

      const entry = map.get(key)!;
      // Ensure we don't add duplicate song references
      if (!entry.songs.some((s) => s.id === song.id)) {
        entry.songs.push(song);
        entry.plays += song.play_count || 0;
        entry.trackCount += 1;
      }
    }
  }

  // 2. Include any catalog artists from database that may have 0 songs currently in library
  if (catalogArtists) {
    for (const artist of catalogArtists) {
      const names = splitArtistNames(artist.name);
      const isSingleArtist = names.length === 1;

      for (const name of names) {
        const key = name.toLowerCase().trim();
        if (!key) continue;

        if (!map.has(key)) {
          map.set(key, {
            // Only assign the DB UUID if this was an individual artist row or if no conflict
            id: isSingleArtist ? artist.id : `artist-${encodeURIComponent(key)}`,
            name: name,
            image_url: isSingleArtist ? (artist.image_url || null) : null,
            songs: [],
            plays: 0,
            trackCount: 0,
            bio: isSingleArtist ? (artist.bio || null) : null,
          });
        } else {
          // If artist was already added via songs, make sure database image_url and bio are applied
          const existing = map.get(key)!;
          if (isSingleArtist) {
            if (artist.image_url) existing.image_url = artist.image_url;
            if (artist.bio) existing.bio = artist.bio;
            if (artist.id) existing.id = artist.id;
          } else {
            // Compound row: only use image/bio if individual doesn't have one yet
            if (!existing.image_url && artist.image_url) {
              existing.image_url = artist.image_url;
            }
            if (!existing.bio && artist.bio) {
              existing.bio = artist.bio;
            }
          }
        }
      }
    }
  }

  // 3. Ensure any song that credits the artist (even if edge case formatting) is included
  for (const entry of map.values()) {
    for (const song of songs) {
      if (!entry.songs.some((s) => s.id === song.id)) {
        if (songCreditsArtist(song, entry.name)) {
          entry.songs.push(song);
          entry.plays += song.play_count || 0;
          entry.trackCount += 1;
        }
      }
    }
  }

  return Array.from(map.values());
}
