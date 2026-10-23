"use client";

import { useTrackEditor } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { SongRow } from "@/components/song-row";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import type { Song } from "@/lib/types";
import { Heart, Play } from "lucide-react";
import Link from "next/link";

export default function FavouritesPage() {
  const { songs, recentFavouriteIds } = useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();
  const { isAdmin } = useAuth();

  const favourites = recentFavouriteIds
    .map((id) => songs.find((song) => song.id === id))
    .filter((song): song is Song => Boolean(song));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.2em] uppercase text-rose-500">
            <Heart className="h-3.5 w-3.5 fill-current" />
            <span>Curated Loved Tracks</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Favorite Songs
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {favourites.length} saved track{favourites.length === 1 ? "" : "s"}
          </p>
        </div>

        {favourites[0] ? (
          <button
            type="button"
            onClick={() => playSong(favourites[0], favourites)}
            className="inline-flex items-center gap-2 rounded-full bg-[#19181b] px-5 py-2.5 text-xs font-bold text-[#dbe878] shadow-md transition hover:scale-105 active:scale-95"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Play Favorites</span>
          </button>
        ) : null}
      </div>

      {favourites.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          body="Tap the heart icon on any track in Browse or Music. Your favorites are stored per-account."
          action={
            <Link
              href="/home"
              className="rounded-full bg-[#19181b] px-5 py-2 text-xs font-bold text-[#dbe878]"
            >
              Browse music
            </Link>
          }
        />
      ) : (
        <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-xs space-y-1">
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
      )}
    </div>
  );
}
