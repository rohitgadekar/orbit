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
import { getIndividualArtists } from "@/lib/artists";
import type { Song } from "@/lib/types";
import { Heart, Play, User } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function HomePage() {
  const { songs, artists, recentlyPlayed, loading } = useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();
  const { isAdmin } = useAuth();
  const [selectedForPlaylist, setSelectedForPlaylist] = useState<Song | null>(null);

  const heroSong = [...songs].sort((a, b) => b.play_count - a.play_count)[0] ?? songs[0];
  const recentTracks = recentlyPlayed.length > 0 ? recentlyPlayed.slice(0, 8) : songs.slice(0, 8);

  // Compute popular artists strictly from individual artists ranked by total plays in library
  const individualArtists = useMemo(
    () => getIndividualArtists(songs, artists),
    [songs, artists],
  );

  const popularArtists = useMemo(() => {
    return individualArtists
      .filter((a) => a.trackCount > 0)
      .sort((a, b) => b.plays - a.plays || b.trackCount - a.trackCount)
      .slice(0, 10);
  }, [individualArtists]);

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
        body="Add direct Cloudinary audio URLs or catalog tracks in Settings to start listening."
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

  const heroCover =
    heroSong?.cover_url ||
    heroSong?.album?.cover_url ||
    heroSong?.artist?.image_url;

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Curated Playlist Hero Banner */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#9c3e17] via-[#a8441c] to-[#6d270e] p-6 text-white shadow-xl shadow-[#9c3e17]/25 sm:p-8 md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-amber-500/20 blur-3xl" />

        <div className="flex flex-col-reverse justify-between gap-6 md:flex-row md:items-center">
          {/* Left Hero Details */}
          <div className="max-w-md">
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-amber-200/90">
              Curated Playlist
            </span>
            <h1 className="mt-2 font-sans text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
              {heroSong?.title || "Blinding Light"}
            </h1>
            <p className="mt-3 text-xs leading-relaxed text-amber-100/80 sm:text-sm">
              Enjoy vivid emotions with this stunning music album. Each track is a story.
            </p>

            {/* Likes & Track Count Stats */}
            <div className="mt-5 flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-xs font-medium text-amber-200 backdrop-blur-md">
                <Heart className="h-3.5 w-3.5 fill-current text-amber-300" />
                <span>{heroSong?.play_count ? `${heroSong.play_count * 14 + 128} Likes` : "Curated"}</span>
              </span>
              <span className="text-xs font-medium text-amber-200/80">
                • {songs.length} Songs, ~{Math.max(12, Math.round(songs.length * 3.2))} min
              </span>
            </div>

            {/* Play Button */}
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => playSong(heroSong, songs)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-black/20 transition hover:bg-amber-100 hover:scale-105 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Listen Now
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => editSong(heroSong)}
                  className="rounded-full border border-white/20 bg-black/20 px-4 py-2.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/10"
                >
                  Edit Featured Track
                </button>
              ) : null}
            </div>
          </div>

          {/* Right Hero Image */}
          <div className="relative shrink-0">
            <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-[24px] shadow-2xl sm:aspect-square sm:h-52 sm:w-52 md:h-64 md:w-64">
              <Cover
                src={heroCover}
                title={heroSong?.title || "Curated Playlist"}
                className="h-full w-full object-cover shadow-inner"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 right-3 text-right">
                <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-widest text-[#dbe878] backdrop-blur-md">
                  FEATURED
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Popular Artists (Ranked strictly from most played songs) */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">Popular artists</h2>
            <p className="text-xs text-zinc-500">Based on your catalog&apos;s most played songs</p>
          </div>
          {popularArtists.length > 0 ? (
            <Link
              href="/music?view=artists"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900"
            >
              See all
            </Link>
          ) : null}
        </div>

        {popularArtists.length === 0 ? (
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-center text-xs text-zinc-500">
            <User className="mx-auto mb-2 h-6 w-6 text-zinc-400" />
            <p>No artists found in your library yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {popularArtists.map((artist) => (
              <Link
                key={artist.name}
                href={`/artists/${encodeURIComponent(artist.name)}`}
                className="group flex flex-col items-center text-center focus:outline-none"
              >
                <div className="relative">
                  <ArtistAvatar
                    name={artist.name}
                    imageUrl={artist.image_url}
                    sizeClassName="w-20 h-20 sm:w-24 sm:h-24"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (artist.songs[0]) playSong(artist.songs[0], artist.songs);
                    }}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition group-hover:opacity-100"
                    title={`Play ${artist.name}`}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-zinc-950 shadow-md">
                      <Play className="h-3.5 w-3.5 translate-x-0.5 fill-current" />
                    </span>
                  </div>
                </div>
                <p
                  className="mt-2.5 w-full max-w-full truncate px-1 text-xs font-bold text-zinc-800 transition group-hover:text-zinc-950"
                  title={artist.name}
                >
                  {artist.name}
                </p>
                <p className="text-[10px] text-zinc-400 font-medium">
                  {artist.plays} play{artist.plays === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3. Recently Played with Add to Playlist */}
      <section id="recently-played">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">Recently played</h2>
          <Link
            href="/music"
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900"
          >
            See all
          </Link>
        </div>

        <div className="space-y-1 rounded-2xl bg-white p-2 shadow-xs border border-black/5">
          {recentTracks.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              queue={recentTracks}
              index={index}
              onMore={() => setSelectedForPlaylist(song)}
              onEdit={isAdmin ? (songToEdit) => editSong(songToEdit) : undefined}
            />
          ))}
        </div>
      </section>

      {/* Add To Playlist / Create Playlist Modal */}
      <AddToPlaylistModal
        song={selectedForPlaylist}
        isOpen={Boolean(selectedForPlaylist)}
        onClose={() => setSelectedForPlaylist(null)}
      />
    </div>
  );
}
