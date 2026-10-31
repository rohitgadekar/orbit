"use client";

import { useTrackEditor } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { SongRow } from "@/components/song-row";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import type { Song } from "@/lib/types";
import { Heart, Play, Shuffle } from "lucide-react";
import Link from "next/link";

export default function FavouritesPage() {
  const { songs, recentFavouriteIds } = useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();
  const { isAdmin } = useAuth();

  const favourites = recentFavouriteIds
    .map((id) => songs.find((song) => song.id === id))
    .filter((song): song is Song => Boolean(song));

  function handleShuffle() {
    if (favourites.length === 0) return;
    const shuffled = [...favourites].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero card */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/5 bg-gradient-to-br from-[#211f24] via-[#1c1b1f] to-[#121114] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-blue-500/15 ring-1 ring-white/10 sm:h-20 sm:w-20 sm:rounded-3xl">
              <Heart className="h-7 w-7 fill-blue-400 text-blue-400 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-400">Curated Loved Tracks</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Favorite Songs
              </h1>
              <p className="mt-1 text-xs text-zinc-500">
                {favourites.length} saved track{favourites.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {favourites[0] ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => playSong(favourites[0], favourites)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:scale-105 hover:bg-blue-400 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Play Favorites</span>
              </button>
              <button
                type="button"
                onClick={handleShuffle}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                <Shuffle className="h-3.5 w-3.5" />
                <span>Shuffle</span>
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {favourites.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          body="Tap the heart icon on any track in Browse or Music. Your favorites are stored per-account."
          action={
            <Link
              href="/home"
              className="rounded-full bg-blue-500 px-5 py-2 text-xs font-bold text-white transition hover:bg-blue-400"
            >
              Browse music
            </Link>
          }
        />
      ) : (
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-bold text-white">Tracks</h2>
            <p className="text-xs text-zinc-500">Most recently favorited first</p>
          </div>

          <div className="space-y-1 rounded-[32px] border border-white/5 bg-[#222224] p-3">
            {favourites.map((song, index) => (
              <SongRow
                key={song.id}
                song={song}
                queue={favourites}
                index={index}
                onEdit={isAdmin ? (songToEdit) => editSong(songToEdit) : undefined}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}