import type { Song } from "./types";
import { splitArtistNames } from "./artists";

export type SmartMix = {
  id: string;
  title: string;
  subtitle: string;
  songs: Song[];
  coverUrl?: string;
  gradient: string;
  badge: string;
  accentColor: string;
};

/**
 * Deterministic pseudo-random number generator seeded with a string (e.g. date + mix number)
 */
function pseudoRandom(seedStr: string): () => number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = Math.imul(31, hash) + seedStr.charCodeAt(i) | 0;
  }
  return function () {
    hash = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    hash ^= hash + Math.imul(hash ^ (hash >>> 7), 61 | hash);
    return ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle array deterministically with a random function
 */
function deterministicShuffle<T>(array: T[], rand: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Generates personalized Spotify-style Smart Mixes based on listening habits,
 * play history, favourites, and catalog trends.
 */
export function generateSmartMixes(
  catalogSongs: Song[],
  recentlyPlayed: Song[],
  favouriteIds: Set<string>,
): SmartMix[] {
  if (catalogSongs.length === 0) return [];

  const todayStr = new Date().toISOString().slice(0, 10);
  const byId = new Map(catalogSongs.map((s) => [s.id, s]));

  // 1. Calculate user's artist listening affinities
  const artistAffinity = new Map<string, number>();

  // Weight from play history (higher weight)
  recentlyPlayed.forEach((song, idx) => {
    const names = splitArtistNames(song.artist?.name);
    const weight = Math.max(1, 10 - idx);
    for (const name of names) {
      const key = name.toLowerCase().trim();
      artistAffinity.set(key, (artistAffinity.get(key) || 0) + weight);
    }
  });

  // Weight from favourites
  favouriteIds.forEach((id) => {
    const song = byId.get(id);
    if (song) {
      const names = splitArtistNames(song.artist?.name);
      for (const name of names) {
        const key = name.toLowerCase().trim();
        artistAffinity.set(key, (artistAffinity.get(key) || 0) + 5);
      }
    }
  });

  // Sorted artists by affinity
  const rankedArtists = Array.from(artistAffinity.entries())
    .sort((a, b) => b[1] - a[1])
    .map((e) => e[0]);

  // Group 1: Top Artists for Daily Mix 1
  const mix1Artists = rankedArtists.slice(0, 3);
  // Group 2: Secondary Artists for Daily Mix 2
  const mix2Artists = rankedArtists.slice(3, 7);

  // Helper to filter songs for artist keys
  function songsForArtists(artistKeys: string[]): Song[] {
    if (artistKeys.length === 0) return [];
    return catalogSongs.filter((song) => {
      const names = splitArtistNames(song.artist?.name);
      return names.some((n) => artistKeys.includes(n.toLowerCase().trim()));
    });
  }

  // --- MIX 1: Daily Mix 1 (Primary Artist Focus & High Energy) ---
  const mix1Seed = pseudoRandom(`${todayStr}-dailymix-1`);
  let mix1Songs = songsForArtists(mix1Artists);
  if (mix1Songs.length < 15) {
    // Fill up with top popular catalog tracks
    const popularSongs = [...catalogSongs].sort((a, b) => b.play_count - a.play_count);
    for (const song of popularSongs) {
      if (!mix1Songs.some((s) => s.id === song.id)) {
        mix1Songs.push(song);
      }
      if (mix1Songs.length >= 25) break;
    }
  }
  mix1Songs = deterministicShuffle(mix1Songs.slice(0, 25), mix1Seed);

  const mix1ArtistsNames = Array.from(
    new Set(
      mix1Songs
        .flatMap((s) => splitArtistNames(s.artist?.name))
        .map((n) => n.trim())
        .filter(Boolean),
    ),
  );
  const mix1Primary = mix1ArtistsNames[0];
  const mix1Subtitle =
    mix1ArtistsNames
      .filter((n) => n.toLowerCase() !== mix1Primary?.toLowerCase())
      .slice(0, 6)
      .join(", ") || "Your daily soundtrack updated each morning";

  // --- MIX 2: Daily Mix 2 (Melodic / Alternate Vibes) ---
  const mix2Seed = pseudoRandom(`${todayStr}-dailymix-2`);
  let mix2Songs = songsForArtists(mix2Artists);
  if (mix2Songs.length < 15) {
    // Fill with remaining shuffled catalog tracks
    const extraSongs = deterministicShuffle(catalogSongs, mix2Seed);
    for (const song of extraSongs) {
      if (!mix2Songs.some((s) => s.id === song.id) && !mix1Songs.slice(0, 10).some((s) => s.id === song.id)) {
        mix2Songs.push(song);
      }
      if (mix2Songs.length >= 25) break;
    }
  }
  mix2Songs = deterministicShuffle(mix2Songs.slice(0, 25), mix2Seed);

  const mix2ArtistsNames = Array.from(
    new Set(
      mix2Songs
        .flatMap((s) => splitArtistNames(s.artist?.name))
        .map((n) => n.trim())
        .filter(Boolean),
    ),
  );
  const mix2Primary = mix2ArtistsNames[0];
  const mix2Subtitle =
    mix2ArtistsNames
      .filter((n) => n.toLowerCase() !== mix2Primary?.toLowerCase())
      .slice(0, 6)
      .join(", ") || "Deep cuts, discoveries, and alternate grooves";

  // --- MIX 3: Most Listened / On Repeat ---
  // Rank catalog tracks by personal play history first, then play_count
  const playCounts = new Map<string, number>();
  recentlyPlayed.forEach((song) => {
    playCounts.set(song.id, (playCounts.get(song.id) || 0) + 1);
  });

  const mostListenedSongs = [...catalogSongs]
    .sort((a, b) => {
      const personalA = playCounts.get(a.id) || 0;
      const personalB = playCounts.get(b.id) || 0;
      if (personalB !== personalA) return personalB - personalA;
      return (b.play_count || 0) - (a.play_count || 0);
    })
    .slice(0, 25);

  const mostListenedArtists = Array.from(
    new Set(
      mostListenedSongs
        .flatMap((s) => splitArtistNames(s.artist?.name))
        .map((n) => n.trim())
        .filter(Boolean),
    ),
  );
  const mix3Primary = mostListenedArtists[0];
  const mix3Subtitle =
    mostListenedArtists
      .filter((n) => n.toLowerCase() !== mix3Primary?.toLowerCase())
      .slice(0, 6)
      .join(", ") || "Your most played tracks on Orbit";

  // --- MIX 4: Loved Rewind (Curated from user's favourites) ---
  const lovedSongs = catalogSongs.filter((s) => favouriteIds.has(s.id));

  const mixes: SmartMix[] = [
    {
      id: "mix-daily-1",
      title: mix1Primary || "Daily Mix 1",
      subtitle: mix1Subtitle,
      songs: mix1Songs,
      coverUrl: mix1Songs[0]?.artist?.image_url || mix1Songs[0]?.cover_url || mix1Songs[0]?.album?.cover_url || undefined,
      gradient: "from-[#1e3c72] via-[#2a5298] to-[#111f3d]",
      badge: "MIX",
      accentColor: "#5dade2",
    },
    {
      id: "mix-daily-2",
      title: mix2Primary || "Daily Mix 2",
      subtitle: mix2Subtitle,
      songs: mix2Songs,
      coverUrl: mix2Songs[0]?.artist?.image_url || mix2Songs[0]?.cover_url || mix2Songs[0]?.album?.cover_url || undefined,
      gradient: "from-[#6a11cb] via-[#2575fc] to-[#1a1c4b]",
      badge: "MIX",
      accentColor: "#a569bd",
    },
    {
      id: "mix-most-listened",
      title: mix3Primary || "On Repeat",
      subtitle: mix3Subtitle,
      songs: mostListenedSongs,
      coverUrl: mostListenedSongs[0]?.artist?.image_url || mostListenedSongs[0]?.cover_url || mostListenedSongs[0]?.album?.cover_url || undefined,
      gradient: "from-[#b91d73] via-[#f953c6] to-[#40122e]",
      badge: "MIX",
      accentColor: "#ec407a",
    },
  ];

  if (lovedSongs.length > 0) {
    const lovedArtists = Array.from(
      new Set(
        lovedSongs
          .flatMap((s) => splitArtistNames(s.artist?.name))
          .map((n) => n.trim())
          .filter(Boolean),
      ),
    );
    const lovedPrimary = lovedArtists[0];
    const lovedSubtitle =
      lovedArtists
        .filter((n) => n.toLowerCase() !== lovedPrimary?.toLowerCase())
        .slice(0, 6)
        .join(", ") || `${lovedSongs.length} tracks you love`;
    mixes.push({
      id: "mix-loved",
      title: lovedPrimary || "Loved Rewind",
      subtitle: lovedSubtitle,
      songs: lovedSongs,
      coverUrl: lovedSongs[0]?.artist?.image_url || lovedSongs[0]?.cover_url || lovedSongs[0]?.album?.cover_url || undefined,
      gradient: "from-[#eb3349] via-[#f45c43] to-[#451009]",
      badge: "MIX",
      accentColor: "#f87171",
    });
  }

  return mixes;
}

