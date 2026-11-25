"use client";

import { createClient } from "@/lib/supabase/client";
import { splitArtistNames } from "@/lib/artists";
import { getCachedCatalog, setCachedCatalog, clearCachedCatalog } from "@/lib/catalog-cache";
import type { Album, Artist, BatchAlbumInput, Playlist, Song } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";

type TrackInput = {
  title: string;
  artistName: string;
  albumTitle?: string;
  audioUrl: string;
  coverUrl?: string;
  artistImageUrl?: string;
  durationSeconds?: number;
};

type MusicContextValue = {
  loading: boolean;
  error: string | null;
  songs: Song[];
  artists: Artist[];
  playlists: Playlist[];
  playlistSongsCache: Record<string, Song[]>;
  favouriteIds: Set<string>;
  recentFavouriteIds: string[];
  recentlyPlayed: Song[];
  refresh: (force?: boolean) => Promise<void>;
  toggleFavourite: (songId: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist | null>;
  createPlaylistWithSongs: (
    name: string,
    songIds: string[],
    coverUrl?: string,
  ) => Promise<Playlist | null>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  playlistSongs: (playlistId: string) => Promise<Song[]>;
  getCachedPlaylistSongs: (playlistId: string) => Song[] | undefined;
  addTrack: (input: TrackInput) => Promise<void>;
  addAlbum: (input: BatchAlbumInput) => Promise<string>;
  updateTrack: (songId: string, input: TrackInput) => Promise<void>;
  updateAlbum: (input: {
    albumId?: string | null;
    songIds: string[];
    title?: string;
    coverUrl?: string;
  }) => Promise<void>;
  deleteTrack: (songId: string) => Promise<void>;
  recordPlay: (songId: string) => Promise<void>;
  updateProfile: (displayName: string, avatarUrl?: string) => Promise<void>;
  updateArtistProfile: (
    artistNameOrId: string,
    imageUrl?: string | null,
    bio?: string | null,
    preferredId?: string | null,
  ) => Promise<void>;
};

const MusicContext = createContext<MusicContextValue | null>(null);

const songSelect = `
  id, title, artist_id, album_id, audio_url, cover_url, duration_seconds, play_count, created_at,
  artist:artists!artist_id (id, name, image_url),
  album:albums!album_id (id, title)
`;

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeSong(row: Record<string, unknown>): Song {
  return {
    ...(row as unknown as Song),
    artist: one(row.artist as Artist | Artist[] | null),
    album: one(row.album as Album | Album[] | null),
  };
}

/**
 * Resolves or creates an artist row in the database.
 */
async function resolveOneArtist(
  supabase: ReturnType<typeof createClient>,
  name: string,
  imageUrl?: string,
): Promise<Artist> {
  const artistName = name.trim();

  const { data: existingArtist } = await supabase
    .from("artists")
    .select("*")
    .ilike("name", artistName)
    .maybeSingle();

  if (existingArtist) {
    const artist = existingArtist as Artist;
    if (imageUrl && imageUrl !== artist.image_url) {
      await supabase.from("artists").update({ image_url: imageUrl }).eq("id", artist.id);
      return { ...artist, image_url: imageUrl };
    }
    return artist;
  }

  const { data, error: artistError } = await supabase
    .from("artists")
    .upsert(
      {
        name: artistName,
        image_url: imageUrl || null,
      },
      { onConflict: "name" },
    )
    .select("*")
    .single();

  if (artistError) {
    const { data: retry } = await supabase
      .from("artists")
      .select("*")
      .ilike("name", artistName)
      .maybeSingle();
    if (retry) return retry as Artist;
    throw artistError;
  }
  return data as Artist;
}

/**
 * Given a raw artist credit string (e.g. "Major Lazer, Nicki Minaj"):
 * 1. Ensures an individual artist row exists in `artists` for each individual artist
 *    (e.g. "Major Lazer" and "Nicki Minaj") so each artist can have their own profile
 *    picture, biography, and dedicated artist page.
 * 2. If it's a multi-artist track, also resolves the full credit row (e.g. "Major Lazer, Nicki Minaj")
 *    and links the song to it. This preserves the complete collaboration credit on the song record
 *    so all artists appear on the track and the song is indexed under each artist's discography.
 */
async function resolveArtist(
  supabase: ReturnType<typeof createClient>,
  name: string,
  imageUrl?: string,
): Promise<Artist> {
  const trimmed = name.trim();
  const individualNames = splitArtistNames(trimmed);

  // 1. Ensure each individual artist has their own row in the database for their profile/bio
  for (const indName of individualNames) {
    await resolveOneArtist(supabase, indName);
  }

  // 2. If multiple artists are credited, save the full collaboration credit on the song
  if (individualNames.length > 1) {
    return resolveOneArtist(supabase, trimmed);
  }

  // 3. For single artist, return that individual artist's row
  return resolveOneArtist(supabase, individualNames[0] ?? trimmed, imageUrl);
}

// One-time cleanup: remove stale localStorage cache keys from previous versions
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("orbit_cached_catalog");
    localStorage.removeItem("orbit_cached_playlist_songs");
  } catch {
    // Ignore
  }
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const { user, configured, refreshProfile, updateProfile: authUpdateProfile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistSongsCache, setPlaylistSongsCache] = useState<Record<string, Song[]>>({});
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [recentFavouriteIds, setRecentFavouriteIds] = useState<string[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);

  // 1. Instant Cache Hydration on mount (0ms delay, 0 Supabase calls)
  useEffect(() => {
    let mounted = true;
    getCachedCatalog().then((cached) => {
      if (mounted && cached && cached.songs.length > 0) {
        setSongs(cached.songs);
        setArtists(cached.artists);
        setPlaylists(cached.playlists);
        setFavouriteIds(new Set(cached.favouriteIds));
        setRecentFavouriteIds(cached.favouriteIds);
        setRecentlyPlayed(cached.recentlyPlayed);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const refresh = useCallback(async (force = false) => {
    if (!configured || !user) return;
    setError(null);
    const supabase = createClient();

    try {
      // 2. Intelligent SWR Cache Check
      const cached = await getCachedCatalog();
      const now = Date.now();
      const isCacheFresh = !force && cached && cached.songs.length > 0 && now - cached.cachedAt < 20 * 60 * 1000;

      let shouldFetchCatalog = true;

      if (isCacheFresh) {
        // Lightweight 0-row HEAD count check: consumes only ~150 bytes of HTTP headers!
        const { count, error: countErr } = await supabase
          .from("songs")
          .select("id", { count: "exact", head: true });

        if (!countErr && typeof count === "number" && count === cached.songCount) {
          shouldFetchCatalog = false;
        }
      }

      if (!shouldFetchCatalog && cached) {
        // Songs have not changed! Only fetch user-specific personal data (tiny, a few bytes)
        const [playlistsRes, favRes, historyRes] = await Promise.all([
          supabase
            .from("playlists")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("favourites")
            .select("song_id, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("play_history")
            .select("song_id, played_at")
            .eq("user_id", user.id)
            .order("played_at", { ascending: false })
            .limit(24),
        ]);

        const playlistsList = (playlistsRes.data ?? []) as Playlist[];
        const favRows = favRes.data ?? [];
        const favIdList = favRows.map((row) => row.song_id as string);

        const byId = new Map(cached.songs.map((song) => [song.id, song]));
        const played: Song[] = [];
        const seen = new Set<string>();
        for (const row of historyRes.data ?? []) {
          const song = byId.get(row.song_id as string);
          if (song && !seen.has(song.id)) {
            seen.add(song.id);
            played.push(song);
          }
        }

        setSongs(cached.songs);
        setArtists(cached.artists);
        setPlaylists(playlistsList);
        setFavouriteIds(new Set(favIdList));
        setRecentFavouriteIds(favIdList);
        setRecentlyPlayed(played);
        setLoading(false);
        return;
      }

      // If songs are not yet displayed, set loading
      if (songs.length === 0) setLoading(true);

      // 3. Optimized Catalog Query: Only essential columns, no over-fetching
      const [songsRes, artistsRes, playlistsRes, favRes, historyRes] =
        await Promise.all([
          supabase
            .from("songs")
            .select(songSelect)
            .order("created_at", { ascending: false }),
          supabase.from("artists").select("id, name, image_url").order("name"),
          supabase
            .from("playlists")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("favourites")
            .select("song_id, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("play_history")
            .select("song_id, played_at")
            .eq("user_id", user.id)
            .order("played_at", { ascending: false })
            .limit(24),
        ]);

      if (songsRes.error) {
        throw new Error(songsRes.error.message);
      }

      const catalog = (songsRes.data ?? []).map((row) =>
        normalizeSong(row as Record<string, unknown>),
      );
      const artistsList = (artistsRes.data ?? []) as Artist[];
      const playlistsList = (playlistsRes.data ?? []) as Playlist[];
      const favRows = favRes.data ?? [];
      const favIdList = favRows.map((row) => row.song_id as string);

      const byId = new Map(catalog.map((song) => [song.id, song]));
      const played: Song[] = [];
      const seen = new Set<string>();
      for (const row of historyRes.data ?? []) {
        const song = byId.get(row.song_id as string);
        if (song && !seen.has(song.id)) {
          seen.add(song.id);
          played.push(song);
        }
      }

      setSongs(catalog);
      setArtists(artistsList);
      setPlaylists(playlistsList);
      setFavouriteIds(new Set(favIdList));
      setRecentFavouriteIds(favIdList);
      setRecentlyPlayed(played);

      // Save to IndexedDB cache
      void setCachedCatalog({
        songs: catalog,
        artists: artistsList,
        playlists: playlistsList,
        favouriteIds: favIdList,
        recentlyPlayed: played,
        songCount: catalog.length,
        cachedAt: Date.now(),
      });
    } catch (err) {
      console.error("Catalog fetch failed:", err);
      setError(err instanceof Error ? err.message : "Failed to load music catalog");
    } finally {
      setLoading(false);
    }
  }, [configured, user, songs.length]);

  const toggleFavourite = useCallback(
    async (songId: string) => {
      if (!user) return;
      const supabase = createClient();
      const isFav = favouriteIds.has(songId);

      // Snapshot previous state for rollback on error
      const prevFavSet = new Set(favouriteIds);
      const prevRecentList = [...recentFavouriteIds];

      // Optimistic instant state update (0ms UI latency)
      const nextFavSet = new Set(favouriteIds);
      let nextRecentList = [...recentFavouriteIds];

      if (isFav) {
        nextFavSet.delete(songId);
        nextRecentList = nextRecentList.filter((id) => id !== songId);
      } else {
        nextFavSet.add(songId);
        nextRecentList = [songId, ...nextRecentList.filter((id) => id !== songId)];
      }

      setFavouriteIds(nextFavSet);
      setRecentFavouriteIds(nextRecentList);

      // Haptic feedback on mobile if supported
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(12);
        } catch { }
      }

      // Background DB sync without blocking the UI or triggering slow full refreshes
      try {
        if (isFav) {
          const { error } = await supabase
            .from("favourites")
            .delete()
            .eq("user_id", user.id)
            .eq("song_id", songId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("favourites").insert({
            user_id: user.id,
            song_id: songId,
          });
          if (error) throw error;
        }
      } catch (err) {
        console.error("Failed to sync favourite with database:", err);
        // Rollback state if network failed
        setFavouriteIds(prevFavSet);
        setRecentFavouriteIds(prevRecentList);
      }
    },
    [favouriteIds, recentFavouriteIds, user],
  );

  const createPlaylist = useCallback(
    async (name: string) => {
      if (!user) return null;
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("playlists")
        .insert({ user_id: user.id, name })
        .select("*")
        .single();
      if (insertError) throw insertError;
      const newPlaylist = data as Playlist;
      setPlaylists((prev) => [newPlaylist, ...prev]);

      return newPlaylist;
    },
    [user],
  );

  const createPlaylistWithSongs = useCallback(
    async (name: string, songIds: string[], coverUrl?: string) => {
      if (!user) return null;
      const supabase = createClient();

      try {
        // Try calling the Supabase smart playlist RPC if installed
        try {
          const { data: rpcId, error: rpcErr } = await supabase.rpc(
            "create_playlist_from_mix",
            {
              p_user_id: user.id,
              p_name: name,
              p_cover_url: coverUrl || null,
              p_song_ids: songIds,
            },
          );
          if (!rpcErr && rpcId) {
            const newPl: Playlist = {
              id: rpcId as string,
              user_id: user.id,
              name,
              cover_url: coverUrl || null,
              created_at: new Date().toISOString(),
            };
            setPlaylists((prev) => [newPl, ...prev]);

            if (songIds.length > 0) {
              const addedSongs = songs.filter((s) => songIds.includes(s.id));
              setPlaylistSongsCache((prev) => ({
                ...prev,
                [newPl.id]: addedSongs,
              }));
            }

            return newPl;
          }
        } catch {
          // Fall through to standard batch insertion
        }

        // Standard batch creation: 1. Insert playlist row
        const { data, error: insertError } = await supabase
          .from("playlists")
          .insert({
            user_id: user.id,
            name,
            cover_url: coverUrl || null,
          })
          .select("*")
          .single();

        if (insertError) throw insertError;
        const newPlaylist = data as Playlist;

        // 2. Batch insert playlist_songs
        if (songIds.length > 0) {
          const rows = songIds.map((sid, idx) => ({
            playlist_id: newPlaylist.id,
            song_id: sid,
            position: idx,
          }));
          await supabase.from("playlist_songs").upsert(rows);

          const addedSongs = songs.filter((s) => songIds.includes(s.id));
          setPlaylistSongsCache((prev) => ({
            ...prev,
            [newPlaylist.id]: addedSongs,
          }));
        }

        setPlaylists((prev) => [newPlaylist, ...prev]);

        return newPlaylist;
      } catch (err) {
        console.error("Failed to create playlist with songs:", err);
        throw err;
      }
    },
    [user, songs],
  );

  const deletePlaylist = useCallback(
    async (id: string) => {
      const prevPlaylists = [...playlists];
      const prevCache = { ...playlistSongsCache };

      // 1. Optimistic UI update (0ms)
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      setPlaylistSongsCache((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      // Haptic feedback
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(10);
        } catch { }
      }

      // 2. Background DB deletion without slow refresh()
      try {
        const supabase = createClient();
        await supabase.from("playlists").delete().eq("id", id);
      } catch (err) {
        console.error("Failed to delete playlist in Supabase:", err);
        // Rollback on failure
        setPlaylists(prevPlaylists);
        setPlaylistSongsCache(prevCache);
      }
    },
    [playlists, playlistSongsCache],
  );

  const addToPlaylist = useCallback(
    async (playlistId: string, songId: string) => {
      const targetSong = songs.find((s) => s.id === songId);
      if (!targetSong) return;

      const prevCachedList = playlistSongsCache[playlistId] || [];

      // 1. Optimistic UI update (0ms instant response)
      setPlaylistSongsCache((prev) => {
        const currentSongs = prev[playlistId] || [];
        if (currentSongs.some((s) => s.id === songId)) return prev;
        const nextSongs = [...currentSongs, targetSong];
        return { ...prev, [playlistId]: nextSongs };
      });

      // Optimistically set playlist cover if empty
      setPlaylists((prev) => {
        const pl = prev.find((p) => p.id === playlistId);
        if (pl && !pl.cover_url && targetSong.cover_url) {
          return prev.map((p) =>
            p.id === playlistId ? { ...p, cover_url: targetSong.cover_url } : p,
          );
        }
        return prev;
      });

      // Haptic feedback
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(10);
        } catch { }
      }

      // 2. Background DB upsert without blocking UI or triggering slow full refresh()
      try {
        const supabase = createClient();
        const { count } = await supabase
          .from("playlist_songs")
          .select("*", { count: "exact", head: true })
          .eq("playlist_id", playlistId);

        await supabase.from("playlist_songs").upsert({
          playlist_id: playlistId,
          song_id: songId,
          position: count ?? 0,
        });

        const { data: pl } = await supabase
          .from("playlists")
          .select("cover_url")
          .eq("id", playlistId)
          .maybeSingle();

        if (!pl?.cover_url && targetSong.cover_url) {
          await supabase
            .from("playlists")
            .update({ cover_url: targetSong.cover_url })
            .eq("id", playlistId);
        }
      } catch (err) {
        console.error("Failed to add to playlist in Supabase:", err);
        // Rollback cache on error
        setPlaylistSongsCache((prev) => ({
          ...prev,
          [playlistId]: prevCachedList,
        }));
      }
    },
    [songs, playlistSongsCache],
  );

  const removeFromPlaylist = useCallback(
    async (playlistId: string, songId: string) => {
      const prevSongs = playlistSongsCache[playlistId] || [];

      // 1. Optimistic UI update (0ms instant removal)
      setPlaylistSongsCache((prev) => {
        const currentSongs = prev[playlistId] || [];
        const nextSongs = currentSongs.filter((s) => s.id !== songId);
        return { ...prev, [playlistId]: nextSongs };
      });

      // Haptic feedback
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(10);
        } catch { }
      }

      // 2. Background DB deletion without slow refresh()
      try {
        const supabase = createClient();
        await supabase
          .from("playlist_songs")
          .delete()
          .eq("playlist_id", playlistId)
          .eq("song_id", songId);
      } catch (err) {
        console.error("Failed to remove from playlist in Supabase:", err);
        // Rollback on failure
        setPlaylistSongsCache((prev) => ({
          ...prev,
          [playlistId]: prevSongs,
        }));
      }
    },
    [playlistSongsCache],
  );

  const playlistSongs = useCallback(
    async (playlistId: string): Promise<Song[]> => {
      const cached = playlistSongsCache[playlistId];

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("playlist_songs")
          .select(`position, song:songs (${songSelect})`)
          .eq("playlist_id", playlistId)
          .order("position");

        if (error) throw error;

        const freshSongs = (data ?? [])
          .map((row) => {
            const raw = Array.isArray(row.song) ? row.song[0] : row.song;
            if (!raw) return null;
            return normalizeSong(raw as unknown as Record<string, unknown>);
          })
          .filter((song): song is Song => Boolean(song?.id));

        // Update in-memory cache
        setPlaylistSongsCache((prev) => ({
          ...prev,
          [playlistId]: freshSongs,
        }));

        return freshSongs;
      } catch (err) {
        console.warn("Using cached playlist songs:", err);
        return cached || [];
      }
    },
    [playlistSongsCache],
  );

  const getCachedPlaylistSongs = useCallback(
    (playlistId: string): Song[] | undefined => {
      return playlistSongsCache[playlistId];
    },
    [playlistSongsCache],
  );

  const addTrack = useCallback(
    async (input: TrackInput) => {
      if (!user) return;
      if (!isAdmin) throw new Error("Administrator role required to add catalog tracks.");
      const supabase = createClient();
      // resolveArtist now splits compound names and returns the primary artist
      const artist = await resolveArtist(
        supabase,
        input.artistName,
        input.artistImageUrl,
      );

      let albumId: string | null = null;
      if (input.albumTitle?.trim()) {
        const { data: album, error: albumError } = await supabase
          .from("albums")
          .insert({
            title: input.albumTitle.trim(),
            artist_id: artist.id,
            cover_url: input.coverUrl || null,
          })
          .select("id")
          .single();
        if (albumError) throw albumError;
        albumId = album.id;
      }

      const { error: songError } = await supabase.from("songs").insert({
        title: input.title.trim(),
        artist_id: artist.id,
        album_id: albumId,
        audio_url: input.audioUrl.trim(),
        cover_url: input.coverUrl?.trim() || null,
        duration_seconds: input.durationSeconds || null,
        created_by: user.id,
      });
      if (songError) throw songError;
      await refresh(true);
    },
    [isAdmin, refresh, user],
  );

  const addAlbum = useCallback(
    async (input: BatchAlbumInput): Promise<string> => {
      if (!user) throw new Error("Please log in to add albums.");
      if (!isAdmin) throw new Error("Administrator role required to add albums.");

      const albumTitle = input.albumTitle.trim();
      if (!albumTitle) throw new Error("Album title is required.");
      if (!input.tracks || input.tracks.length === 0) {
        throw new Error("Please add at least one track to the album.");
      }

      const validTracks = input.tracks.filter(
        (t) => t.title.trim() && t.audioUrl.trim(),
      );
      if (validTracks.length === 0) {
        throw new Error("At least one track must have a title and audio URL.");
      }

      const supabase = createClient();
      const mainArtist = await resolveArtist(supabase, input.artistName);

      const { data: existingAlbum } = await supabase
        .from("albums")
        .select("id")
        .eq("artist_id", mainArtist.id)
        .ilike("title", albumTitle)
        .maybeSingle();

      let albumId: string;
      if (existingAlbum) {
        albumId = existingAlbum.id;
        if (input.coverUrl?.trim()) {
          await supabase
            .from("albums")
            .update({ cover_url: input.coverUrl.trim() })
            .eq("id", albumId);
        }
      } else {
        const { data: newAlbum, error: albumError } = await supabase
          .from("albums")
          .insert({
            title: albumTitle,
            artist_id: mainArtist.id,
            cover_url: input.coverUrl?.trim() || null,
          })
          .select("id")
          .single();
        if (albumError) throw albumError;
        albumId = newAlbum.id;
      }

      for (const track of validTracks) {
        const trackArtist =
          track.artistName?.trim() &&
            track.artistName.trim().toLowerCase() !== input.artistName.trim().toLowerCase()
            ? await resolveArtist(supabase, track.artistName)
            : mainArtist;

        const { error: songError } = await supabase.from("songs").insert({
          title: track.title.trim(),
          artist_id: trackArtist.id,
          album_id: albumId,
          audio_url: track.audioUrl.trim(),
          cover_url: input.coverUrl?.trim() || null,
          duration_seconds: track.durationSeconds || null,
          created_by: user.id,
        });
        if (songError) throw songError;
      }

      await refresh(true);
      return albumTitle;
    },
    [isAdmin, refresh, user],
  );

  const updateTrack = useCallback(
    async (songId: string, input: TrackInput) => {
      if (!isAdmin) throw new Error("Administrator role required to edit catalog tracks.");
      const supabase = createClient();
      const song = songs.find((item) => item.id === songId);
      // resolveArtist splits compound names and returns the primary artist
      const artist = await resolveArtist(
        supabase,
        input.artistName,
        input.artistImageUrl,
      );

      let albumId = song?.album_id ?? null;
      const albumTitle = input.albumTitle?.trim() ?? "";
      if (albumTitle) {
        if (albumId) {
          const { error: albumError } = await supabase
            .from("albums")
            .update({
              title: albumTitle,
              artist_id: artist.id,
              cover_url: input.coverUrl?.trim() || null,
            })
            .eq("id", albumId);
          if (albumError) throw albumError;
        } else {
          const { data: album, error: albumError } = await supabase
            .from("albums")
            .insert({
              title: albumTitle,
              artist_id: artist.id,
              cover_url: input.coverUrl || null,
            })
            .select("id")
            .single();
          if (albumError) throw albumError;
          albumId = album.id;
        }
      } else {
        albumId = null;
      }

      const { data: updatedSongs, error: songError } = await supabase
        .from("songs")
        .update({
          title: input.title.trim(),
          artist_id: artist.id,
          album_id: albumId,
          audio_url: input.audioUrl.trim(),
          cover_url: input.coverUrl?.trim() || null,
          duration_seconds: input.durationSeconds || null,
        })
        .eq("id", songId)
        .select();

      if (songError) throw songError;
      if (!updatedSongs || updatedSongs.length === 0) {
        throw new Error(
          "Track could not be updated in database. Please verify your Supabase RLS policies permit update for authenticated users on public.songs.",
        );
      }

      // Optimistically update local songs state
      setSongs((current) =>
        current.map((s) => {
          if (s.id === songId) {
            return {
              ...s,
              title: input.title.trim(),
              artist_id: artist.id,
              artist: artist,
              album_id: albumId,
              audio_url: input.audioUrl.trim(),
              cover_url: input.coverUrl?.trim() || null,
              duration_seconds: input.durationSeconds || null,
            };
          }
          return s;
        }),
      );

      await refresh(true);
    },
    [isAdmin, refresh, songs],
  );

  // Bulk-edit an album: cover (and optionally title) applied to the album row and every track in it
  const updateAlbum = useCallback(
    async (input: {
      albumId?: string | null;
      songIds: string[];
      title?: string;
      coverUrl?: string;
    }) => {
      if (!isAdmin) throw new Error("Administrator role required to edit albums.");
      if (input.songIds.length === 0) throw new Error("This album has no tracks to update.");

      const supabase = createClient();
      const coverUrl = input.coverUrl?.trim() || null;
      const title = input.title?.trim();

      if (input.albumId) {
        const patch: { cover_url: string | null; title?: string } = { cover_url: coverUrl };
        if (title) patch.title = title;
        const { error: albumError } = await supabase
          .from("albums")
          .update(patch)
          .eq("id", input.albumId);
        if (albumError) throw albumError;
      }

      const { data: updatedSongs, error: songError } = await supabase
        .from("songs")
        .update({ cover_url: coverUrl })
        .in("id", input.songIds)
        .select("id");
      if (songError) throw songError;
      if (!updatedSongs || updatedSongs.length === 0) {
        throw new Error(
          "Tracks could not be updated. Please verify your Supabase RLS policies permit update on public.songs.",
        );
      }

      // Optimistic local update so every view changes instantly
      const ids = new Set(input.songIds);
      setSongs((current) =>
        current.map((s) =>
          ids.has(s.id)
            ? {
              ...s,
              cover_url: coverUrl,
              album: s.album
                ? { ...s.album, cover_url: coverUrl, ...(title ? { title } : {}) }
                : s.album,
            }
            : s,
        ),
      );

      await refresh(true);
    },
    [isAdmin, refresh],
  );

  const updateArtistProfile = useCallback(
    async (
      artistNameOrId: string,
      imageUrl?: string | null,
      bio?: string | null,
      preferredId?: string | null,
    ) => {
      if (!isAdmin) throw new Error("Administrator role required to update artist profiles.");
      const supabase = createClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        artistNameOrId,
      );

      const updateData: Record<string, unknown> = {};
      if (imageUrl !== undefined) updateData.image_url = imageUrl;
      if (bio !== undefined) updateData.bio = bio;

      let updated = false;

      // 1. If preferredId is a valid UUID, try updating that row directly
      const targetId = isUuid ? artistNameOrId : preferredId;
      if (
        targetId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)
      ) {
        const { data, error } = await supabase
          .from("artists")
          .update(updateData)
          .eq("id", targetId)
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          updated = true;
        }
      }

      // 2. Try updating by exact name matching
      if (!updated && !isUuid) {
        const trimmed = artistNameOrId.trim();
        const { data, error } = await supabase
          .from("artists")
          .update(updateData)
          .ilike("name", trimmed)
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          updated = true;
        }
      }

      // 3. Upsert if not found
      if (!updated && !isUuid) {
        const trimmed = artistNameOrId.trim();
        const { error: upsertError } = await supabase
          .from("artists")
          .upsert(
            {
              name: trimmed,
              image_url: imageUrl || null,
              bio: bio || null,
            },
            { onConflict: "name" },
          );
        if (upsertError) throw upsertError;
      }

      // Optimistically update local artists state
      setArtists((prev) =>
        prev.map((a) => {
          if (
            (isUuid && a.id === artistNameOrId) ||
            (preferredId && a.id === preferredId) ||
            a.name.toLowerCase().trim() === artistNameOrId.toLowerCase().trim()
          ) {
            return {
              ...a,
              image_url: imageUrl !== undefined ? imageUrl : a.image_url,
              bio: bio !== undefined ? bio : a.bio,
            };
          }
          return a;
        }),
      );

      await refresh(true);
    },
    [isAdmin, refresh],
  );

  const recordPlay = useCallback(
    async (songId: string) => {
      if (!user) return;

      // Optimistically update recentlyPlayed immediately
      setRecentlyPlayed((prev) => {
        const playedSong = songs.find((s) => s.id === songId);
        if (!playedSong) return prev;
        return [playedSong, ...prev.filter((s) => s.id !== songId)].slice(0, 30);
      });

      const supabase = createClient();
      await Promise.all([
        supabase.from("play_history").insert({
          user_id: user.id,
          song_id: songId,
        }),
        supabase.rpc("increment_play_count", { p_song_id: songId }),
      ]);
      setSongs((current) =>
        current.map((song) =>
          song.id === songId
            ? { ...song, play_count: song.play_count + 1 }
            : song,
        ),
      );
    },
    [user, songs],
  );

  const deleteTrack = useCallback(
    async (songId: string) => {
      if (!isAdmin) throw new Error("Administrator role required to delete catalog tracks.");
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("songs").delete().eq("id", songId);
      if (deleteError) throw deleteError;
      await refresh(true);
    },
    [isAdmin, refresh],
  );

  const updateProfile = useCallback(
    async (displayName: string, avatarUrl?: string) => {
      await authUpdateProfile(displayName, avatarUrl);
      await refreshProfile();
    },
    [authUpdateProfile, refreshProfile],
  );

  const value = useMemo<MusicContextValue>(
    () => ({
      loading,
      error,
      songs,
      artists,
      playlists,
      playlistSongsCache,
      favouriteIds,
      recentFavouriteIds,
      recentlyPlayed,
      refresh,
      toggleFavourite,
      createPlaylist,
      createPlaylistWithSongs,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      playlistSongs,
      getCachedPlaylistSongs,
      addTrack,
      addAlbum,
      updateTrack,
      updateAlbum,
      deleteTrack,
      recordPlay,
      updateProfile,
      updateArtistProfile,
    }),
    [
      loading,
      error,
      songs,
      artists,
      playlists,
      playlistSongsCache,
      favouriteIds,
      recentFavouriteIds,
      recentlyPlayed,
      refresh,
      toggleFavourite,
      createPlaylist,
      createPlaylistWithSongs,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      playlistSongs,
      getCachedPlaylistSongs,
      addTrack,
      addAlbum,
      updateTrack,
      updateAlbum,
      deleteTrack,
      recordPlay,
      updateProfile,
      updateArtistProfile,
    ],
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}
