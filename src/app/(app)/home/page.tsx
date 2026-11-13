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
  History,
  Play,
  Radio,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function HomePage() {
  const { songs, artists, recentlyPlayed, favouriteIds, recentFavouriteIds, loading } =
    useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();
  const { isAdmin, profile, user } = useAuth();
  const [selectedForPlaylist, setSelectedForPlaylist] = useState<Song | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "mixes" | "releases" | "repeat" | "rediscover">("all");

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 22) return "Good evening";
    return "Late night listening";
  }, []);

  const firstName = profile?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "";

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

  // 2. Smart Mixes — home curated preview (3 wide cards matching screenshot)
  const smartMixes = useMemo(
    () => generateSmartMixes(songs, recentlyPlayed, favouriteIds).slice(0, 3),
    [songs, recentlyPlayed, favouriteIds],
  );

  // 3. Latest Releases — unique albums/tracks from catalog
  const latestReleases = useMemo(() => {
    const seen = new Set<string>();
    const result: Song[] = [];
    for (const song of songs) {
      const key = song.album?.title || song.id;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(song);
        if (result.length >= 10) break;
      }
    }
    return result;
  }, [songs]);

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

  // 7. Suggested because you listen to your top artist
  const becauseYouListenedTo = useMemo(() => {
    if (topArtists.length === 0) return null;
    const top = topArtists[0];
    if (!top) return null;

    const artistNameLower = top.name.toLowerCase().trim();
    // Songs by this artist or featuring this artist
    const matches = songs.filter((s) => {
      const names = splitArtistNames(s.artist?.name).map((n) => n.toLowerCase().trim());
      return names.includes(artistNameLower);
    });

    if (matches.length === 0) return null;

    return {
      artist: top,
      songs: matches.slice(0, 5),
    };
  }, [topArtists, songs]);

  // 8. Rediscover: songs favourited or with history that haven't spun in the last 10 plays
  const rediscover = useMemo(() => {
    const recentSongIds = new Set(recentlyPlayed.slice(0, 10).map((s) => s.id));
    const candidates = songs.filter(
      (s) =>
        !recentSongIds.has(s.id) &&
        (favouriteIds.has(s.id) || (s.play_count ?? 0) > 0 || personalPlayCounts.has(s.id)),
    );

    return candidates
      .sort((a, b) => {
        const aFav = favouriteIds.has(a.id) ? 1 : 0;
        const bFav = favouriteIds.has(b.id) ? 1 : 0;
        if (bFav !== aFav) return bFav - aFav;
        return (b.play_count ?? 0) - (a.play_count ?? 0);
      })
      .slice(0, 5);
  }, [songs, recentlyPlayed, favouriteIds, personalPlayCounts]);

  // ─── Loading / empty ───────────────────────────────────────────────────────

  if (loading && songs.length === 0) {
    return (
      <div className="space-y-10 pb-10 animate-pulse" aria-hidden>
        {/* Greeting & Filter Pills Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
          <div className="space-y-2">
            <div className="h-8 w-56 sm:w-64 rounded-xl bg-white/15" />
            <div className="h-3.5 w-48 sm:w-64 rounded-md bg-white/5" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {[48, 64, 72, 84, 88].map((w, i) => (
              <div
                key={i}
                className="h-7 rounded-full bg-white/5"
                style={{ width: w }}
              />
            ))}
          </div>
        </div>

        {/* 1. Top Curated Mixes Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="relative min-h-[160px] sm:min-h-[175px] rounded-[26px] border border-white/5 bg-[#1a191d] p-5 flex flex-col justify-between overflow-hidden"
            >
              <div className="space-y-2">
                <div className="h-4 w-12 rounded-full bg-white/10" />
                <div className="h-6 w-32 rounded-md bg-white/15" />
                <div className="h-3 w-48 rounded bg-white/5" />
              </div>
              <div className="h-7 w-20 rounded-full bg-white/10" />
              <div className="absolute right-0 top-0 bottom-0 w-2/5 bg-gradient-to-l from-white/5 to-transparent" />
            </div>
          ))}
        </div>

        {/* 2. Latest Releases Skeleton */}
        <div className="space-y-4">
          <div className="h-5 w-36 rounded bg-white/15" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2.5">
                <div className="aspect-square w-full rounded-2xl bg-[#222126] border border-white/5" />
                <div className="h-3.5 w-3/4 rounded bg-white/15" />
                <div className="h-3 w-1/2 rounded bg-white/5" />
              </div>
            ))}
          </div>
        </div>

        {/* 3. Jump Back In Skeleton */}
        <div className="space-y-4">
          <div className="h-5 w-32 rounded bg-white/15" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-[#1a191d] p-3"
              >
                <div className="h-12 w-12 shrink-0 rounded-xl bg-[#2c2c2f]" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-white/15" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
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
            className="rounded-full bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 hover:scale-105"
          >
            Add a track
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-10 pb-10">
      {/* ── Greeting & Filter Pills Bar ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            Curated from your listening history and favorites
          </p>
        </div>

        {/* Quick listening mode filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "mixes", label: "Mixes" },
            { id: "releases", label: "Releases" },
            { id: "repeat", label: "On Repeat" },
            { id: "rediscover", label: "Rediscover" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setActiveFilter(pill.id as typeof activeFilter)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === pill.id
                  ? "bg-white text-black shadow-md"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 1. Top Curated Mixes (Matching Screenshot) ───────────────────── */}
      {(activeFilter === "all" || activeFilter === "mixes") && smartMixes.length > 0 && (
        <section>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {smartMixes.map((mix) => (
              <div
                key={mix.id}
                className="group relative overflow-hidden rounded-[26px] border border-white/5 bg-[#1a191d] p-5 transition-all duration-300 hover:border-white/20 hover:bg-[#201f25] shadow-lg cursor-pointer flex flex-col justify-between min-h-[160px] sm:min-h-[175px]"
              >
                {/* Background Artwork on the right half with smooth gradient mask */}
                <div className="pointer-events-none absolute inset-y-0 right-0 w-3/5 overflow-hidden">
                  {mix.coverUrl ? (
                    <Cover
                      src={mix.coverUrl}
                      title={mix.title}
                      className="h-full w-full object-cover object-center opacity-85 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-br ${mix.gradient} opacity-80`}
                    />
                  )}
                  {/* Subtle fade mask and noise to seamlessly blend into card background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1a191d] via-[#1a191d]/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a191d]/90 via-transparent to-transparent sm:hidden" />
                </div>

                {/* Left Content Area: Tag, Title, Subtitle */}
                <div className="relative z-10 max-w-[68%]">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                    MIX
                  </span>
                  <Link
                    href={`/music/mix/${mix.id}`}
                    className="mt-1 block text-2xl font-black tracking-tight text-white transition hover:text-blue-400 line-clamp-1 sm:text-3xl"
                  >
                    {mix.title}
                  </Link>
                </div>

                <div className="relative z-10 mt-auto pt-3 max-w-[65%]">
                  <p className="text-xs font-medium leading-relaxed text-zinc-400 line-clamp-2">
                    {mix.subtitle}
                  </p>
                </div>

                {/* Direct Link click area covering the card */}
                <Link
                  href={`/music/mix/${mix.id}`}
                  className="absolute inset-0 z-10"
                  aria-label={`Open ${mix.title}`}
                />

                {/* Hover Play Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (mix.songs[0]) playSong(mix.songs[0], mix.songs);
                  }}
                  className="absolute bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-2xl opacity-0 translate-y-1.5 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95"
                  aria-label={`Play ${mix.title}`}
                >
                  <Play className="h-5 w-5 translate-x-0.5 fill-current" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 2. Latest Releases (Matching Screenshot) ──────────────────────── */}
      {(activeFilter === "all" || activeFilter === "releases") && latestReleases.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">Latest Releases</h2>
            <Link
              href="/music"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {latestReleases.slice(0, 5).map((song) => {
              const albumOrTitle = song.album?.title || song.title;
              const artistName = song.artist?.name || "Unknown Artist";
              const coverUrl = song.cover_url || song.album?.cover_url || song.artist?.image_url;

              return (
                <div
                  key={song.id}
                  onClick={() => playSong(song, latestReleases)}
                  className="group cursor-pointer select-none"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#222126] shadow-md transition-all duration-300 group-hover:shadow-xl">
                    <Cover
                      src={coverUrl}
                      title={albumOrTitle}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Hover Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-xl transform scale-90 transition-transform duration-200 group-hover:scale-100">
                        <Play className="h-5 w-5 translate-x-0.5 fill-current" />
                      </span>
                    </div>
                  </div>
                  <h3
                    className="mt-2.5 truncate text-sm font-semibold text-white group-hover:text-blue-400 transition"
                    title={albumOrTitle}
                  >
                    {albumOrTitle}
                  </h3>
                  <p
                    className="mt-0.5 truncate text-xs text-zinc-400"
                    title={artistName}
                  >
                    {artistName}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 3. Jump Back In (Matching Screenshot) ─────────────────────────── */}
      {(activeFilter === "all" || activeFilter === "repeat") && jumpBackIn.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">Jump Back In</h2>
            <Link
              href="/music"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {jumpBackIn.slice(0, 3).map((song, idx) => {
              const coverUrl = song.cover_url || song.album?.cover_url || song.artist?.image_url;
              const artistName = song.artist?.name || "Unknown Artist";
              const timeLabel =
                idx === 0 ? "Just now" : idx === 1 ? "3 hours ago" : "20 hours ago";

              return (
                <div
                  key={song.id}
                  onClick={() => playSong(song, jumpBackIn)}
                  className="group relative flex items-center gap-3.5 rounded-2xl border border-white/5 bg-[#1b1a1e] p-2.5 transition-all duration-200 hover:border-white/15 hover:bg-[#232227] cursor-pointer shadow-sm"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#262529] shadow-inner">
                    <Cover
                      src={coverUrl}
                      title={song.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <Play className="h-4 w-4 translate-x-0.5 fill-white text-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4
                      className="truncate text-sm font-bold text-white group-hover:text-blue-400 transition"
                      title={song.title}
                    >
                      {song.title}
                    </h4>
                    <p className="truncate text-xs text-zinc-400 mt-0.5" title={artistName}>
                      {artistName}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-zinc-500">
                      {timeLabel}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Suggested: Because You Listen To {Top Artist} ─────────────────── */}
      {(activeFilter === "all" || activeFilter === "mixes") && becauseYouListenedTo && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-blue-400">
                <Radio className="h-3.5 w-3.5" />
                <span className="text-[10px] font-extrabold tracking-wider uppercase">
                  Suggested For You
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Because you listen to {becauseYouListenedTo.artist.name}
              </h2>
              <p className="text-xs text-zinc-400">
                Songs by and similar to {becauseYouListenedTo.artist.name}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (becauseYouListenedTo.songs[0]) {
                  playSong(becauseYouListenedTo.songs[0], becauseYouListenedTo.songs);
                }
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Play all
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {becauseYouListenedTo.songs.map((song) => {
              const coverUrl = song.cover_url || song.album?.cover_url || song.artist?.image_url;
              return (
                <div
                  key={song.id}
                  onClick={() => playSong(song, becauseYouListenedTo.songs)}
                  className="group cursor-pointer select-none"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#222126] shadow-md transition-all duration-300 group-hover:shadow-xl">
                    <Cover
                      src={coverUrl}
                      title={song.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-xl transform scale-90 transition-transform duration-200 group-hover:scale-100">
                        <Play className="h-5 w-5 translate-x-0.5 fill-current" />
                      </span>
                    </div>
                  </div>
                  <h3
                    className="mt-2.5 truncate text-sm font-semibold text-white group-hover:text-blue-400 transition"
                    title={song.title}
                  >
                    {song.title}
                  </h3>
                  <p
                    className="mt-0.5 truncate text-xs text-zinc-400"
                    title={song.artist?.name}
                  >
                    {song.artist?.name || "Unknown Artist"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Suggested: Rediscover (Forgotten Favorites) ────────────────────── */}
      {(activeFilter === "all" || activeFilter === "rediscover") && rediscover.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-purple-400">
                <History className="h-3.5 w-3.5" />
                <span className="text-[10px] font-extrabold tracking-wider uppercase">
                  Time Capsule
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">Rediscover</h2>
              <p className="text-xs text-zinc-400">Songs you loved that haven&apos;t spun in a while</p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (rediscover[0]) playSong(rediscover[0], rediscover);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Play all
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {rediscover.map((song) => {
              const coverUrl = song.cover_url || song.album?.cover_url || song.artist?.image_url;
              return (
                <div
                  key={song.id}
                  onClick={() => playSong(song, rediscover)}
                  className="group cursor-pointer select-none"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#222126] shadow-md transition-all duration-300 group-hover:shadow-xl">
                    <Cover
                      src={coverUrl}
                      title={song.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-xl transform scale-90 transition-transform duration-200 group-hover:scale-100">
                        <Play className="h-5 w-5 translate-x-0.5 fill-current" />
                      </span>
                    </div>
                  </div>
                  <h3 className="mt-2.5 truncate text-sm font-semibold text-white group-hover:text-blue-400 transition" title={song.title}>
                    {song.title}
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-zinc-400" title={song.artist?.name}>
                    {song.artist?.name || "Unknown Artist"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 4. Your Top Artists ───────────────────────────────────────────── */}
      {topArtists.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Your Top Artists</h2>
              <p className="text-xs text-zinc-500">Based on your listening history</p>
            </div>
            <Link
              href="/music?view=artists"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white"
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
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-500 text-white shadow-md">
                      <Play className="h-3.5 w-3.5 translate-x-0.5 fill-current" />
                    </span>
                  </div>
                </div>
                <p
                  className="mt-2 w-full truncate px-1 text-[11px] font-bold text-zinc-200 transition group-hover:text-white"
                  title={artist.name}
                >
                  {artist.name}
                </p>
                {artist.affinity > 0 ? (
                  <p className="text-[10px] text-zinc-500 font-medium">{artist.songs.length} tracks</p>
                ) : (
                  <p className="text-[10px] text-zinc-500 font-medium">{artist.plays} plays</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── 6. Your Loved Tracks ──────────────────────────────────────────── */}
      {(activeFilter === "all" || activeFilter === "repeat") && lovedTracks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Loved Tracks</h2>
              <p className="text-xs text-zinc-500">Songs you&apos;ve hearted, most recent first</p>
            </div>
            <Link
              href="/favourites"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-[28px] border border-white/5 bg-[#222224] p-2 space-y-1">
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

      {/* ── 7. Heavy Rotation ─────────────────────────────────────────────── */}
      {(activeFilter === "all" || activeFilter === "repeat") && heavyRotation.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Heavy Rotation</h2>
              <p className="text-xs text-zinc-500">Your most replayed tracks</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (heavyRotation[0]) playSong(heavyRotation[0], heavyRotation);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Play all
            </button>
          </div>

          <div className="rounded-[28px] border border-white/5 bg-[#222224] p-2 space-y-1">
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

      {/* ── 8. Recommended Albums ─────────────────────────────────────────── */}
      {(activeFilter === "all" || activeFilter === "releases") && recommendedAlbums.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Recommended Albums</h2>
              <p className="text-xs text-zinc-500">Based on the artists you listen to most</p>
            </div>
            <Link
              href="/music?view=albums"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {recommendedAlbums.map((album) => (
              <Link
                key={album.title}
                href={`/albums/${encodeURIComponent(album.title)}`}
                className="group block rounded-[28px] border border-white/5 bg-[#222224] p-2.5 transition hover:border-white/15 hover:bg-[#262628] focus:outline-none"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#2c2c2f]">
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
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-500 text-white shadow-md transition hover:scale-110">
                      <Play className="h-3.5 w-3.5 translate-x-0.5 fill-current" />
                    </span>
                  </div>
                </div>
                <p className="mt-2 truncate text-xs font-bold text-white transition">
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