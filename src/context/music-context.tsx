"use client";

import { createClient } from "@/lib/supabase/client";
import { splitArtistNames } from "@/lib/artists";
import type { Album, Artist, Playlist, Song } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
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
  favouriteIds: Set<string>;
  recentFavouriteIds: string[];
  recentlyPlayed: Song[];
  refresh: () => Promise<void>;
  toggleFavourite: (songId: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist | null>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  playlistSongs: (playlistId: string) => Promise<Song[]>;
  addTrack: (input: TrackInput) => Promise<void>;
  updateTrack: (songId: string, input: TrackInput) => Promise<void>;
  deleteTrack: (songId: string) => Promise<void>;
  recordPlay: (songId: string) => Promise<void>;
  updateProfile: (displayName: string, avatarUrl?: string) => Promise<void>;
  updateArtistProfile: (
    artistNameOrId: string,
    imageUrl?: string | null,
    bio?: string | null,
  ) => Promise<void>;
};

const MusicContext = createContext<MusicContextValue | null>(null);

const songSelect = `
  id, title, artist_id, album_id, audio_url, cover_url, duration_seconds, play_count, created_at,
  artist:artists!artist_id (*),
  album:albums!album_id (*)
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
 * Resolves a single individual artist name to a DB row.
 * If `name` is compound (e.g. "Calvin Harris, Ayah Marar"), only the
 * first individual name is used — callers are responsible for creating
 * rows for the remaining artists separately.
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
    .insert({
      name: artistName,
      image_url: imageUrl || null,
    })
    .select("*")
    .single();
  if (artistError) throw artistError;
  return data as Artist;
}

/**
 * Given a raw artist credit string (possibly compound, e.g. "Calvin Harris, Ayah Marar"),
 * ensures every individual artist has their own DB row and returns the PRIMARY (first) artist.
 * The primary artist gets the provided imageUrl; secondary artists are created with no image.
 */
async function resolveArtist(
  supabase: ReturnType<typeof createClient>,
  name: string,
  imageUrl?: string,
): Promise<Artist> {
  const individualNames = splitArtistNames(name);
  // Create rows for all secondary artists (no image)
  for (const secondary of individualNames.slice(1)) {
    await resolveOneArtist(supabase, secondary);
  }
  // The primary artist is what we return and store as artist_id on the song
  return resolveOneArtist(supabase, individualNames[0] ?? name.trim(), imageUrl);
}

export function MusicProvider({ children }: { children: ReactNode }) {
  const { user, configured, refreshProfile, updateProfile: authUpdateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [recentFavouriteIds, setRecentFavouriteIds] = useState<string[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);

  const refresh = useCallback(async () => {
    if (!configured || !user) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [songsRes, artistsRes, playlistsRes, favRes, historyRes] =
      await Promise.all([
        supabase
          .from("songs")
          .select(songSelect)
          .order("created_at", { ascending: false }),
        supabase.from("artists").select("*").order("name"),
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
      setError(songsRes.error.message);
      setLoading(false);
      return;
    }

    const catalog = (songsRes.data ?? []).map((row) =>
      normalizeSong(row as Record<string, unknown>),
    );
    setSongs(catalog);
    setArtists((artistsRes.data ?? []) as Artist[]);
    setPlaylists((playlistsRes.data ?? []) as Playlist[]);

    const favRows = favRes.data ?? [];
    setFavouriteIds(new Set(favRows.map((row) => row.song_id as string)));
    setRecentFavouriteIds(favRows.map((row) => row.song_id as string));

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
    setRecentlyPlayed(played);
    setLoading(false);
  }, [configured, user]);

  const toggleFavourite = useCallback(
    async (songId: string) => {
      if (!user) return;
      const supabase = createClient();
      const isFav = favouriteIds.has(songId);
      if (isFav) {
        await supabase
          .from("favourites")
          .delete()
          .eq("user_id", user.id)
          .eq("song_id", songId);
      } else {
        await supabase.from("favourites").insert({
          user_id: user.id,
          song_id: songId,
        });
      }
      await refresh();
    },
    [favouriteIds, refresh, user],
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
      await refresh();
      return data as Playlist;
    },
    [refresh, user],
  );

  const deletePlaylist = useCallback(
    async (id: string) => {
      const supabase = createClient();
      await supabase.from("playlists").delete().eq("id", id);
      await refresh();
    },
    [refresh],
  );

  const addToPlaylist = useCallback(async (playlistId: string, songId: string) => {
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

    // Automatically set playlist cover from song if not already set
    const { data: pl } = await supabase.from("playlists").select("cover_url").eq("id", playlistId).maybeSingle();
    if (!pl?.cover_url) {
      const { data: songData } = await supabase.from("songs").select("cover_url").eq("id", songId).maybeSingle();
      if (songData?.cover_url) {
        await supabase.from("playlists").update({ cover_url: songData.cover_url }).eq("id", playlistId);
      }
    }

    await refresh();
  }, [refresh]);

  const removeFromPlaylist = useCallback(
    async (playlistId: string, songId: string) => {
      const supabase = createClient();
      await supabase
        .from("playlist_songs")
        .delete()
        .eq("playlist_id", playlistId)
        .eq("song_id", songId);
      await refresh();
    },
    [refresh],
  );

  const playlistSongs = useCallback(async (playlistId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("playlist_songs")
      .select(`position, song:songs (${songSelect})`)
      .eq("playlist_id", playlistId)
      .order("position");
    return (data ?? [])
      .map((row) => {
        const raw = Array.isArray(row.song) ? row.song[0] : row.song;
        if (!raw) return null;
        return normalizeSong(raw as unknown as Record<string, unknown>);
      })
      .filter((song): song is Song => Boolean(song?.id));
  }, []);

  const addTrack = useCallback(
    async (input: TrackInput) => {
      if (!user) return;
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
      await refresh();
    },
    [refresh, user],
  );

  const updateTrack = useCallback(
    async (songId: string, input: TrackInput) => {
      if (!user) return;
      const supabase = createClient();
      const song = songs.find((item) => item.id === songId);
      // resolveArtist now splits compound names and returns the primary artist
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

      const { error: songError } = await supabase
        .from("songs")
        .update({
          title: input.title.trim(),
          artist_id: artist.id,
          album_id: albumId,
          audio_url: input.audioUrl.trim(),
          cover_url: input.coverUrl?.trim() || null,
          duration_seconds: input.durationSeconds || null,
        })
        .eq("id", songId);
      if (songError) throw songError;
      await refresh();
    },
    [refresh, songs, user],
  );

  const updateArtistProfile = useCallback(
    async (artistNameOrId: string, imageUrl?: string | null, bio?: string | null) => {
      const supabase = createClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        artistNameOrId,
      );

      const updateData: Record<string, unknown> = {};
      if (imageUrl !== undefined) updateData.image_url = imageUrl;
      if (bio !== undefined) updateData.bio = bio;

      let query = supabase.from("artists").update(updateData);
      if (isUuid) {
        query = query.eq("id", artistNameOrId);
      } else {
        query = query.ilike("name", artistNameOrId.trim());
      }

      const { data, error } = await query.select();
      if (error || !data || data.length === 0) {
        if (!isUuid) {
          await supabase.from("artists").insert({
            name: artistNameOrId.trim(),
            image_url: imageUrl || null,
            bio: bio || null,
          });
        }
      }
      await refresh();
    },
    [refresh],
  );

  const recordPlay = useCallback(
    async (songId: string) => {
      if (!user) return;
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
    [user],
  );

  const deleteTrack = useCallback(
    async (songId: string) => {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("songs").delete().eq("id", songId);
      if (deleteError) throw deleteError;
      await refresh();
    },
    [refresh],
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
      favouriteIds,
      recentFavouriteIds,
      recentlyPlayed,
      refresh,
      toggleFavourite,
      createPlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      playlistSongs,
      addTrack,
      updateTrack,
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
      favouriteIds,
      recentFavouriteIds,
      recentlyPlayed,
      refresh,
      toggleFavourite,
      createPlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      playlistSongs,
      addTrack,
      updateTrack,
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
