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
 * Groups catalog songs by individual artist strictly using dynamic details stored in the database.
 * If a song has multiple artists (e.g. Calvin Harris, Ayah Marar), the song is placed in BOTH artists'
 * discographies. Profile pictures and bio are retrieved directly from the database.
 */
export function getIndividualArtists(
  songs: Song[],
  catalogArtists?: Artist[],
): ParsedArtist[] {
  const map = new Map<string, ParsedArtist>();

  for (const song of songs) {
    const rawArtistName = song.artist?.name || "Unknown Artist";
    const individualNames = splitArtistNames(rawArtistName);

    for (const name of individualNames) {
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

  // Include any catalog artists from database that may have 0 songs currently in library
  if (catalogArtists) {
    for (const artist of catalogArtists) {
      const names = splitArtistNames(artist.name);
      for (const name of names) {
        const key = name.toLowerCase().trim();
        if (!key) continue;

        if (!map.has(key)) {
          map.set(key, {
            id: artist.id,
            name: name,
            image_url: artist.image_url || null,
            songs: [],
            plays: 0,
            trackCount: 0,
            bio: artist.bio || null,
          });
        } else {
          // If artist was already added via songs, make sure database image_url and bio are applied
          const existing = map.get(key)!;
          if (!existing.image_url && artist.image_url) {
            existing.image_url = artist.image_url;
          }
          if (!existing.bio && artist.bio) {
            existing.bio = artist.bio;
          }
          if (artist.id) {
            existing.id = artist.id;
          }
        }
      }
    }
  }

  return Array.from(map.values());
}
