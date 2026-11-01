"use client";

import { ArtistAvatar } from "@/components/artist-avatar";
import { Cover } from "@/components/cover";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import { getIndividualArtists } from "@/lib/artists";
import type { Song } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import {
  ArrowRight,
  Disc3,
  Music2,
  Play,
  Search,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export function SearchCommandModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { songs, artists } = useMusic();
  const { playSong } = usePlayer();
  const [query, setQuery] = useState("");
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery("");
    }
  }

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Group songs into albums
  const albums = useMemo(() => {
    const map = new Map<
      string,
      { title: string; artist: string; cover?: string; songs: Song[] }
    >();
    for (const song of songs) {
      const albumKey = song.album?.title || song.title;
      if (!map.has(albumKey)) {
        map.set(albumKey, {
          title: albumKey,
          artist: song.artist?.name || "Various Artists",
          cover: song.cover_url || song.album?.cover_url || undefined,
          songs: [],
        });
      }
      map.get(albumKey)!.songs.push(song);
    }
    return Array.from(map.values());
  }, [songs]);

  // Get individual artists list
  const individualArtists = useMemo(() => {
    return getIndividualArtists(songs, artists);
  }, [songs, artists]);

  // Search filtered results
  const q = query.trim().toLowerCase();

  const matchingSongs = useMemo(() => {
    if (!q) return [];
    return songs
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist?.name.toLowerCase().includes(q) ||
          s.album?.title.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [songs, q]);

  const matchingAlbums = useMemo(() => {
    if (!q) return [];
    return albums
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.artist.toLowerCase().includes(q),
      )
      .slice(0, 4);
  }, [albums, q]);

  const matchingArtists = useMemo(() => {
    if (!q) return [];
    return individualArtists
      .filter((a) => a.name.toLowerCase().includes(q))
      .slice(0, 4);
  }, [individualArtists, q]);

  const hasResults =
    matchingSongs.length > 0 ||
    matchingAlbums.length > 0 ||
    matchingArtists.length > 0;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (query.trim()) {
      onClose();
      router.push(`/music?q=${encodeURIComponent(query.trim())}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 backdrop-blur-md bg-black/45 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-[#222224] shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center border-b border-white/5 px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, albums, artists..."
            className="w-full bg-transparent px-3 text-sm font-medium text-white placeholder:text-zinc-400 outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="mr-2 rounded-full p-1 text-zinc-400 hover:text-zinc-300"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#2c2c2f] px-2 py-0.5 !text-[10px] font-semibold text-zinc-500 hover:bg-white/10"
          >
            ESC
          </button>
        </form>

        {/* Content Body */}
        <div className="max-h-[60vh] overflow-y-auto p-3 no-scrollbar divide-y divide-white/5">
          {!q ? (
            <div className="py-8 text-center text-zinc-400">
              <Search className="mx-auto mb-2 h-7 w-7 text-zinc-300" />
              <p className="text-xs font-medium text-zinc-400">
                Type song title, artist, or album name
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                Quickly search across your entire Orbit music library
              </p>
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center text-zinc-400">
              <p className="text-xs font-semibold text-zinc-400">
                No direct matches for &ldquo;{query}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:scale-105 active:scale-95"
              >
                <span>Search full library for &ldquo;{query}&rdquo;</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Songs Results */}
              {matchingSongs.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-zinc-400">
                    <Music2 className="h-3.5 w-3.5" />
                    <span>Songs</span>
                  </div>
                  <div className="space-y-1">
                    {matchingSongs.map((song) => (
                      <div
                        key={song.id}
                        onClick={() => {
                          playSong(song, songs);
                          onClose();
                        }}
                        className="group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 transition hover:bg-white/5"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Cover
                            src={song.cover_url || song.album?.cover_url}
                            title={song.title}
                            className="h-9 w-9 shrink-0 rounded-lg"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-white group-hover:text-white">
                              {song.title}
                            </p>
                            <p className="truncate text-[11px] text-zinc-500">
                              {song.artist?.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[11px] text-zinc-400">
                            {song.duration_seconds
                              ? formatTime(song.duration_seconds)
                              : ""}
                          </span>
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-500 text-white opacity-0 transition group-hover:opacity-100">
                            <Play className="h-3 w-3 translate-x-0.5 fill-current" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Albums Results */}
              {matchingAlbums.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-zinc-400">
                    <Disc3 className="h-3.5 w-3.5" />
                    <span>Albums</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matchingAlbums.map((album) => (
                      <Link
                        key={album.title}
                        href={`/albums/${encodeURIComponent(album.title)}`}
                        onClick={onClose}
                        className="flex items-center gap-2.5 rounded-xl border border-white/5 p-2 transition hover:bg-white/5 hover:border-white/20"
                      >
                        <Cover
                          src={album.cover}
                          title={album.title}
                          className="h-10 w-10 shrink-0 rounded-lg"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-white">
                            {album.title}
                          </p>
                          <p className="truncate text-[11px] text-zinc-500">
                            {album.artist} • {album.songs.length} tracks
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Artists Results */}
              {matchingArtists.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-zinc-400">
                    <User className="h-3.5 w-3.5" />
                    <span>Artists</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {matchingArtists.map((artist) => (
                      <Link
                        key={artist.name}
                        href={`/artists/${encodeURIComponent(artist.name)}`}
                        onClick={onClose}
                        className="flex flex-col items-center rounded-xl border border-white/5 p-2.5 text-center transition hover:bg-white/5 hover:border-white/20"
                      >
                        <ArtistAvatar
                          name={artist.name}
                          imageUrl={artist.image_url}
                          sizeClassName="w-12 h-12"
                        />
                        <p className="mt-1.5 w-full truncate text-xs font-semibold text-white">
                          {artist.name}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {artist.songs.length} tracks
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        {q ? (
          <div className="flex items-center justify-between border-t border-white/5 bg-black/20 px-4 py-2.5 text-[11px] text-zinc-500">
            <span>Press <kbd className="font-mono font-bold text-zinc-300">↵ Enter</kbd> to see all library results</span>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="font-semibold text-white hover:underline inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}