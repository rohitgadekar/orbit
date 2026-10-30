"use client";

import { Cover } from "@/components/cover";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { useOffline } from "@/context/offline-context";
import { usePlayer } from "@/context/player-context";
import type { Song } from "@/lib/types";
import { splitArtistNames } from "@/lib/artists";
import { cn, formatTime } from "@/lib/utils";
import {
  ArrowDownToLine,
  CheckCircle2,
  Heart,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
} from "lucide-react";
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
  const { isAdmin } = useAuth();
  const { isOnline, isDownloaded, toggleDownloadSong, downloadingSongIds } = useOffline();

  const active = current?.id === song.id;
  const fav = favouriteIds.has(song.id);
  const downloaded = isDownloaded(song.id);
  const isDownloading = downloadingSongIds[song.id] !== undefined;
  const isUnavailableOffline = !isOnline && !downloaded;

  const cover = song.cover_url || song.album?.cover_url || song.artist?.image_url;

  const handlePlay = () => {
    if (isUnavailableOffline) {
      alert(`"${song.title}" is not saved offline. Connect to the internet to listen to this track.`);
      return;
    }
    if (active) {
      toggle();
    } else {
      playSong(song, queue);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition duration-200",
        active
          ? "bg-[#edeae3] shadow-xs"
          : "hover:bg-[#f2efe9]/70",
        isUnavailableOffline && "opacity-40 grayscale-[85%] hover:bg-transparent",
      )}
      title={isUnavailableOffline ? `"${song.title}" is not available offline` : undefined}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
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
            onClick={handlePlay}
            disabled={isUnavailableOffline}
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 backdrop-blur-[1px] transition group-hover:opacity-100",
              isUnavailableOffline && "cursor-not-allowed opacity-0 group-hover:opacity-30",
            )}
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
            onClick={handlePlay}
            className={cn(
              "flex items-center gap-1.5 w-full text-left text-sm font-bold tracking-tight text-zinc-900 transition focus:outline-none",
              isUnavailableOffline && "cursor-not-allowed",
            )}
          >
            <span className={cn("truncate", active && "text-[#bf5b30]")}>{song.title}</span>
            {downloaded && (
              <span title="Available offline" className="shrink-0 inline-flex items-center">
                <CheckCircle2 className="h-3.5 w-3.5 fill-[#dbe878] text-[#3b4707]" />
              </span>
            )}
            {isUnavailableOffline && (
              <span className="shrink-0 rounded-md bg-zinc-200 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">
                Unavailable
              </span>
            )}
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
      <div className="flex items-center justify-end gap-2.5 sm:gap-4">
        {song.album?.title ? (
          <Link
            href={`/albums/${encodeURIComponent(song.album.title)}`}
            className="hidden max-w-[140px] truncate !text-[12px] text-zinc-400 hover:text-zinc-900 hover:underline transition lg:block"
            title={song.album.title}
          >
            {song.album.title}
          </Link>
        ) : null}

        <span className="font-mono hidden md:block text-xs font-medium text-zinc-500">
          {song.duration_seconds ? formatTime(song.duration_seconds) : "2:40"}
        </span>

        {/* Offline Download Button (Spotify/Apple Music style cached listening) */}
        <button
          type="button"
          onClick={() => void toggleDownloadSong(song)}
          disabled={isDownloading}
          className={cn(
            "rounded-full p-1.5 transition hover:bg-black/5 active:scale-90",
            downloaded
              ? "text-[#657319] hover:text-[#4e5812]"
              : "text-zinc-400 hover:text-zinc-800",
          )}
          title={
            downloaded
              ? "Downloaded for offline playback (click to remove)"
              : isDownloading
                ? `Downloading... ${downloadingSongIds[song.id] || 0}%`
                : "Save track for offline playback"
          }
          aria-label={downloaded ? "Remove offline download" : "Save track offline"}
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
          ) : downloaded ? (
            <CheckCircle2 className="h-4 w-4 fill-[#dbe878]/50 text-[#54620f]" />
          ) : (
            <ArrowDownToLine className="h-4 w-4" />
          )}
        </button>

        {/* Favorite Heart with Bouncy Instant Feedback */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggleFavourite(song.id);
          }}
          className="rounded-full p-1.5 text-zinc-400 transition hover:bg-black/5 hover:text-rose-500 active:scale-75"
          aria-label={fav ? "Remove favorite" : "Add to favorites"}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-all duration-200",
              fav ? "fill-rose-500 text-rose-500 scale-110" : "hover:scale-110",
            )}
          />
        </button>

        {/* Add to Playlist "+" Button */}
        {onMore ? (
          <button
            type="button"
            onClick={onMore}
            className="hidden md:block rounded-full p-1.5 text-zinc-500 transition hover:bg-black/5 hover:text-zinc-900"
            title="Add to folder"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}

        {/* Edit Track button - Only visible to Admins */}
        {isAdmin && onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(song)}
            className="hidden md:block rounded-full p-1.5 text-zinc-400 transition group-hover:opacity-100 hover:bg-black/5 hover:text-zinc-900"
            title="Edit track"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
