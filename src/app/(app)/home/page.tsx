"use client";

import { AddToPlaylistModal } from "@/components/add-to-playlist-modal";
import { useTrackEditor } from "@/components/app-shell";
import { ArtistAvatar } from "@/components/artist-avatar";
import { Cover } from "@/components/cover";
import { EmptyState } from "@/components/empty-state";
import { SongRow } from "@/components/song-row";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import { getIndividualArtists, splitArtistNames } from "@/lib/artists";
import { generateSmartMixes } from "@/lib/mixes";

import type { Song } from "@/lib/types";
import {
  ArrowRight,
  Clock,
  Heart,
  Play,
  Shuffle,
  Lens,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function HomePage() {
  const { songs, artists, recentlyPlayed, favouriteIds, recentFavouriteIds, loading } =
    useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();
  const { isAdmin } = useAuth();
  const [selectedForPlaylist, setSelectedForPlaylist] = useState<Song | null>(null);

  // ─── Derived personalisation signals ───────────────────────────────────────

  // Personal play count from history (how many times the user has played each song)
  const personalPlayCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const song of recentlyPlayed) {
      map.set(song.id, (map.get(song.id) ?? 0) + 1);
    }
    return map;
  }, [recentlyPlayed]);

  // Artist affinity: weighted from history + favourites
  const artistAffinity = useMemo(() => {
    const map = new Map<string, number>();
    recentlyPlayed.forEach((song, idx) => {
      const weight = Math.max(1, 10 - idx);
      for (const name of splitArtistNames(song.artist?.name)) {
        const key = name.toLowerCase().trim();
        map.set(key, (map.get(key) ?? 0) + weight);
      }
    });
    favouriteIds.forEach((id) => {
      const song = songs.find((s) => s.id === id);
      if (!song) return;
      for (const name of splitArtistNames(song.artist?.name)) {
        const key = name.toLowerCase().trim();
        map.set(key, (map.get(key) ?? 0) + 5);
      }
    });
    return map;
  }, [recentlyPlayed, favouriteIds, songs]);

  // ─── Section data ───────────────────────────────────────────────────────────

  // 1. Jump back in: deduplicated recently played, 6 most recent
  const jumpBackIn = useMemo(() => {
    const seen = new Set<string>();
    const result: Song[] = [];
    for (const song of recentlyPlayed) {
      if (!seen.has(song.id)) {
        seen.add(song.id);
        result.push(song);
        if (result.length >= 6) break;
      }
    }
    return result;
  }, [recentlyPlayed]);

  // 2. Smart Mixes — top 2 only for the home preview
  const smartMixes = useMemo(
    () => generateSmartMixes(songs, recentlyPlayed, favouriteIds).slice(0, 2),
    [songs, recentlyPlayed, favouriteIds],
  );

  // 3. Top artists for this user (affinity-ranked)
  const individualArtists = useMemo(
    () => getIndividualArtists(songs, artists),
    [songs, artists],
  );

  const topArtists = useMemo(() => {
    return individualArtists
      .map((a) => ({
        ...a,
        affinity: artistAffinity.get(a.name.toLowerCase().trim()) ?? 0,
      }))
      .sort((a, b) => b.affinity - a.affinity || b.plays - a.plays)
      .slice(0, 8);
  }, [individualArtists, artistAffinity]);

  // 4. Loved tracks — most recently favourited first
  const lovedTracks = useMemo(() => {
    const lovedInOrder = recentFavouriteIds
      .map((id) => songs.find((s) => s.id === id))
      .filter((s): s is Song => !!s);
    // Fallback: alphabetically from favouriteIds if no history
    if (lovedInOrder.length === 0) {
      return songs.filter((s) => favouriteIds.has(s.id)).slice(0, 8);
    }
    return lovedInOrder.slice(0, 8);
  }, [recentFavouriteIds, songs, favouriteIds]);

  // 5. Heavy Rotation: personal replay first, then by global play_count
  const heavyRotation = useMemo(() => {
    return [...songs]
      .sort((a, b) => {
        const pa = personalPlayCounts.get(a.id) ?? 0;
        const pb = personalPlayCounts.get(b.id) ?? 0;
        if (pb !== pa) return pb - pa;
        return (b.play_count ?? 0) - (a.play_count ?? 0);
      })
      .slice(0, 8);
  }, [songs, personalPlayCounts]);

  // 6. Recommended albums: prefer albums that contain user's favourited/played artists
  const recommendedAlbums = useMemo(() => {
    const albumMap = new Map<
      string,
      { title: string; artist: string; cover?: string; songs: Song[]; score: number }
    >();
    for (const song of songs) {
      const albumKey = song.album?.title ?? song.title;
      if (!albumMap.has(albumKey)) {
        const artistKey = (song.artist?.name ?? "").toLowerCase().trim();
        const score = artistAffinity.get(artistKey) ?? 0;
        albumMap.set(albumKey, {
          title: albumKey,
          artist: song.artist?.name ?? "Various Artists",
          cover: song.cover_url ?? song.album?.cover_url ?? undefined,
          songs: [],
          score,
        });
      }
      albumMap.get(albumKey)!.songs.push(song);
    }
    return Array.from(albumMap.values())
      .sort((a, b) => b.score - a.score || b.songs.length - a.songs.length)
      .slice(0, 8);
  }, [songs, artistAffinity]);

  // ─── Hero: last played song (most personal) ────────────────────────────────
  const heroSong = jumpBackIn[0] ?? songs[0];
  const heroCover =
    heroSong?.cover_url ?? heroSong?.album?.cover_url ?? heroSong?.artist?.image_url;

  // ─── Loading / empty ───────────────────────────────────────────────────────

  if (loading && songs.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 rounded-[32px] bg-zinc-200" />
        <div className="h-28 rounded-2xl bg-zinc-200" />
        <div className="h-64 rounded-2xl bg-zinc-200" />
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <EmptyState
        title="Your Orbit library is empty"
        body="Add tracks in Settings to start listening."
        action={
          <Link
            href="/settings"
            className="rounded-full bg-[#19181b] px-6 py-2.5 text-xs font-semibold text-[#dbe878] shadow-md transition hover:scale-105"
          >
            Add a track
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-10 pb-10">

      {/* ── 1. Hero ─ Last played / Most personal ────────────────────────── */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#9c3e17] via-[#a8441c] to-[#6d270e] p-6 text-white shadow-xl shadow-[#9c3e17]/25 sm:p-8 md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-amber-500/20 blur-3xl" />

        <div className="flex flex-col-reverse justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-md">
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-amber-200/90">
              {recentlyPlayed.length > 0 ? "Pick up where you left off" : "Featured Track"}
            </span>
            <h1 className="mt-2 font-sans text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl line-clamp-2">
              {heroSong?.title ?? "Orbit Music"}
            </h1>
            <p className="mt-1.5 text-sm font-medium text-amber-200/80">
              {heroSong?.artist?.name ?? ""}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-amber-100/70 sm:text-sm">
              {heroSong?.album?.title
                ? `From the album "${heroSong.album.title}"`
                : "Your personal music, right where you left it."}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-amber-200 backdrop-blur-md">
                <Heart className="h-3.5 w-3.5 fill-current text-amber-300" />
                <span>
                  {favouriteIds.size > 0
                    ? `${favouriteIds.size} loved track${favouriteIds.size === 1 ? "" : "s"}`
                    : "Curated for you"}
                </span>
              </span>
              <span className="text-xs font-medium text-amber-200/80">
                • {songs.length} Songs
              </span>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => heroSong && playSong(heroSong, jumpBackIn.length > 0 ? jumpBackIn : songs)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-black/20 transition hover:bg-amber-100 hover:scale-105 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {recentlyPlayed.length > 0 ? "Resume" : "Listen Now"}
              </button>

              <button
                type="button"
                onClick={() => {
                  const shuffled = [...songs].sort(() => Math.random() - 0.5);
                  if (shuffled[0]) playSong(shuffled[0], shuffled);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-2.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/10 active:scale-95"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Shuffle
              </button>

              {isAdmin && heroSong && (
                <button
                  type="button"
                  onClick={() => editSong(heroSong)}
                  className="hidden rounded-full border border-white/20 bg-black/20 px-4 py-2.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/10 sm:inline-flex"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="relative shrink-0">
            <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-[24px] shadow-2xl sm:aspect-square sm:h-52 sm:w-52 md:h-64 md:w-64">
              <Cover
                src={heroCover}
                title={heroSong?.title ?? "Featured"}
                className="h-full w-full object-cover shadow-inner"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 right-3 text-right">
                <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-widest text-[#dbe878] backdrop-blur-md">
                  {recentlyPlayed.length > 0 ? "LAST PLAYED" : "FEATURED"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Jump Back In ───────────────────────────────────────────────── */}
      {jumpBackIn.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900">
                <Clock className="h-4 w-4 text-zinc-400" />
                Jump Back In
              </h2>
              <p className="text-xs text-zinc-500">Pick up from your recent listening</p>
            </div>
            <Link
              href="/music"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-xs space-y-1">
            {jumpBackIn.map((song, index) => (
              <SongRow
                key={song.id}
                song={song}
                queue={jumpBackIn}
                index={index}
                onMore={() => setSelectedForPlaylist(song)}
                onEdit={isAdmin ? (s) => editSong(s) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 3. Made For You (Smart Mixes preview) ─────────────────────────── */}
      {smartMixes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900">
                <Lens className="h-4 w-4 text-[#dbe878]" />
                Made For You
              </h2>
              <p className="text-xs text-zinc-500">Daily mixes from your listening habits</p>
            </div>
            <Link
              href="/music"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
            >
              All mixes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {smartMixes.map((mix) => (
              <Link
                key={mix.id}
                href={`/music/mix/${mix.id}`}
                className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-3 shadow-2xs transition hover:border-black/15 hover:shadow-md"
              >
                {/* Artwork */}
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-900">
                  {mix.coverUrl ? (
                    <Cover
                      src={mix.coverUrl}
                      title={mix.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-br ${mix.gradient} flex flex-col justify-between p-3 text-white`}
                    >
                      <span className="text-[9px] font-black tracking-widest uppercase opacity-75">
                        {mix.badge}
                      </span>
                      <span className="font-serif text-lg font-bold">{mix.title}</span>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[8px] font-black tracking-wider uppercase text-white backdrop-blur-md">
                    {mix.badge}
                  </span>
                  {/* Play overlay on hover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (mix.songs[0]) playSong(mix.songs[0], mix.songs);
                    }}
                    className="absolute right-2.5 bottom-2.5 grid h-9 w-9 place-items-center rounded-full bg-[#19181b] text-[#dbe878] shadow-lg opacity-0 transition group-hover:opacity-100 hover:scale-110 active:scale-95"
                    aria-label={`Play ${mix.title}`}
                  >
                    <Play className="h-4 w-4 translate-x-0.5 fill-current" />
                  </button>
                </div>
                {/* Metadata */}
                <div className="mt-2.5">
                  <p className="truncate text-xs font-bold text-zinc-900">{mix.title}</p>
                  <p className="truncate text-[11px] text-zinc-500">{mix.subtitle}</p>
                  <p className="text-[10px] text-zinc-400">{mix.songs.length} tracks</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. Your Top Artists ───────────────────────────────────────────── */}
      {topArtists.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900">Your Top Artists</h2>
              <p className="text-xs text-zinc-500">Based on your listening history</p>
            </div>
            <Link
              href="/music?view=artists"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {topArtists.map((artist) => (
              <Link
                key={artist.name}
                href={`/artists/${encodeURIComponent(artist.name)}`}
                className="group flex flex-col items-center text-center focus:outline-none"
              >
                <div className="relative">
                  <ArtistAvatar
                    name={artist.name}
                    imageUrl={artist.image_url}
                    sizeClassName="w-16 h-16 sm:w-20 sm:h-20"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (artist.songs[0]) playSong(artist.songs[0], artist.songs);
                    }}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition group-hover:opacity-100 cursor-pointer"
                    title={`Play ${artist.name}`}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-zinc-950 shadow-md">
                      <Play className="h-3.5 w-3.5 translate-x-0.5 fill-current" />
                    </span>
                  </div>
                </div>
                <p
                  className="mt-2 w-full truncate px-1 text-[11px] font-bold text-zinc-800 transition group-hover:text-zinc-950"
                  title={artist.name}
                >
                  {artist.name}
                </p>
                {artist.affinity > 0 ? (
                  <p className="text-[10px] text-zinc-400 font-medium">{artist.songs.length} tracks</p>
                ) : (
                  <p className="text-[10px] text-zinc-400 font-medium">{artist.plays} plays</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 5. Your Loved Tracks ──────────────────────────────────────────── */}
      {lovedTracks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900">
                <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                Loved Tracks
              </h2>
              <p className="text-xs text-zinc-500">Songs you've hearted, most recent first</p>
            </div>
            <Link
              href="/favourites"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-xs space-y-1">
            {lovedTracks.map((song, index) => (
              <SongRow
                key={song.id}
                song={song}
                queue={lovedTracks}
                index={index}
                onMore={() => setSelectedForPlaylist(song)}
                onEdit={isAdmin ? (s) => editSong(s) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 6. Heavy Rotation ─────────────────────────────────────────────── */}
      {heavyRotation.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900">Heavy Rotation</h2>
              <p className="text-xs text-zinc-500">Your most replayed tracks</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (heavyRotation[0]) playSong(heavyRotation[0], heavyRotation);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Play all
            </button>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-xs space-y-1">
            {heavyRotation.map((song, index) => (
              <SongRow
                key={song.id}
                song={song}
                queue={heavyRotation}
                index={index}
                onMore={() => setSelectedForPlaylist(song)}
                onEdit={isAdmin ? (s) => editSong(s) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── 7. Recommended Albums ─────────────────────────────────────────── */}
      {recommendedAlbums.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-zinc-900">Recommended Albums</h2>
              <p className="text-xs text-zinc-500">Based on the artists you listen to most</p>
            </div>
            <Link
              href="/music?view=albums"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {recommendedAlbums.map((album) => (
              <Link
                key={album.title}
                href={`/albums/${encodeURIComponent(album.title)}`}
                className="group block rounded-2xl border border-black/5 bg-white p-2.5 shadow-2xs transition hover:shadow-md focus:outline-none"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
                  <Cover
                    src={album.cover}
                    title={album.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (album.songs[0]) playSong(album.songs[0], album.songs);
                    }}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 cursor-pointer"
                    title={`Play ${album.title}`}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-zinc-950 shadow-md transition hover:scale-110">
                      <Play className="h-3.5 w-3.5 translate-x-0.5 fill-current" />
                    </span>
                  </div>
                </div>
                <p className="mt-2 truncate text-xs font-bold text-zinc-900 group-hover:text-black transition">
                  {album.title}
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {album.artist} • {album.songs.length} tracks
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        song={selectedForPlaylist}
        isOpen={Boolean(selectedForPlaylist)}
        onClose={() => setSelectedForPlaylist(null)}
      />
    </div>
  );
}
