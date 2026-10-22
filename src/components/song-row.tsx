"use client";

import { Cover } from "@/components/cover";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import type { Song } from "@/lib/types";
import { splitArtistNames } from "@/lib/artists";
import { cn, formatTime } from "@/lib/utils";
import { Heart, MoreHorizontal, Pause, Play, Plus } from "lucide-react";
import Link from "next/link";

export function SongRow({
  song,
  queue,
  index,
  onMore,
  onEdit,
}: {
  song: Song;
  queue: Song[];
  index?: number;
  onMore?: () => void;
  onEdit?: (song: Song) => void;
}) {
  const { playSong, current, isPlaying, toggle } = usePlayer();
  const { favouriteIds, toggleFavourite } = useMusic();
  const active = current?.id === song.id;
  const fav = favouriteIds.has(song.id);

  const cover = song.cover_url || song.album?.cover_url || song.artist?.image_url;

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition duration-200",
        active
          ? "bg-[#edeae3] shadow-xs"
          : "hover:bg-[#f2efe9]/70",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        {index != null ? (
          <span className="w-5 text-center font-mono text-xs text-zinc-400 group-hover:text-zinc-600">
            {index + 1}
          </span>
        ) : null}

        {/* Artwork Thumbnail */}
        <div className="relative shrink-0">
          <Cover
            src={cover}
            title={song.title}
            className="h-11 w-11 rounded-xl shadow-xs"
            playing={active && isPlaying}
          />
          <button
            type="button"
            onClick={() => (active ? toggle() : playSong(song, queue))}
            className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 backdrop-blur-[1px] transition group-hover:opacity-100"
            aria-label={active && isPlaying ? "Pause" : "Play"}
          >
            {active && isPlaying ? (
              <Pause className="h-4 w-4 fill-white text-white" />
            ) : (
              <Play className="h-4 w-4 fill-white text-white translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Title and Artist */}
        <div className="min-w-0 flex-1 text-left">
          <button
            type="button"
            onClick={() => (active ? toggle() : playSong(song, queue))}
            className="block w-full truncate text-left text-sm font-bold tracking-tight text-zinc-900 transition focus:outline-none"
          >
            <span className={cn(active && "text-[#bf5b30]")}>{song.title}</span>
          </button>
          <div className="truncate text-xs font-medium text-zinc-500">
            {splitArtistNames(song.artist?.name).map((name, i, arr) => (
              <span key={name}>
                <Link
                  href={`/artists/${encodeURIComponent(name)}`}
                  className="hover:text-zinc-950 hover:underline transition"
                >
                  {name}
                </Link>
                {i < arr.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Meta & Actions matching screenshot */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {song.album?.title ? (
          <Link
            href={`/albums/${encodeURIComponent(song.album.title)}`}
            className="hidden max-w-[140px] truncate text-xs font-medium text-zinc-400 hover:text-zinc-900 hover:underline transition lg:block"
            title={song.album.title}
          >
            {song.album.title}
          </Link>
        ) : null}

        <span className="font-mono text-xs font-medium text-zinc-500">
          {song.duration_seconds ? formatTime(song.duration_seconds) : "2:40"}
        </span>

        {/* Favorite Heart */}
        <button
          type="button"
          onClick={() => void toggleFavourite(song.id)}
          className="rounded-full p-1.5 text-zinc-400 transition hover:bg-black/5 hover:text-rose-500"
          aria-label={fav ? "Remove favorite" : "Add to favorites"}
        >
          <Heart
            className={cn("h-4 w-4", fav && "fill-rose-500 text-rose-500")}
          />
        </button>

        {/* Add to Playlist "+" Button matching screenshot */}
        {onMore ? (
          <button
            type="button"
            onClick={onMore}
            className="rounded-full p-1.5 text-zinc-500 transition hover:bg-black/5 hover:text-zinc-900"
            title="Add to folder"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}

        {/* Edit Track button */}
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(song)}
            className="opacity-0 rounded-full p-1.5 text-zinc-400 transition group-hover:opacity-100 hover:bg-black/5 hover:text-zinc-900"
            title="Edit track"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
