"use client";

import { AddToPlaylistModal } from "@/components/add-to-playlist-modal";
import { useTrackEditor } from "@/components/app-shell";
import { Cover } from "@/components/cover";
import { EmptyState } from "@/components/empty-state";
import { SongRow } from "@/components/song-row";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import type { Song } from "@/lib/types";
import { Disc3, Music2, Play, Plus, Search, Users2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function MusicPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const view = searchParams.get("view") ?? "songs";

  const { songs, artists } = useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();

  const [query, setQuery] = useState(initialQuery);
  const [selectedForFolder, setSelectedForFolder] = useState<Song | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(q) ||
        song.artist?.name.toLowerCase().includes(q) ||
        song.album?.title.toLowerCase().includes(q),
    );
  }, [query, songs]);

  // Group by album if view === 'albums'
  const albums = useMemo(() => {
    const map = new Map<string, { title: string; artist: string; cover?: string; songs: Song[] }>();
    for (const song of songs) {
      const albumKey = song.album?.title || song.title;
      if (!map.has(albumKey)) {
        map.set(albumKey, {
          title: albumKey,
          artist: song.artist?.name || "Various",
          cover: song.cover_url || song.album?.cover_url || undefined,
          songs: [],
        });
      }
      map.get(albumKey)!.songs.push(song);
    }
    return Array.from(map.values());
  }, [songs]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-500">
            Orbit Catalog
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {view === "albums" ? "Albums" : view === "artists" ? "Artists" : "Music Library"}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {filtered.length} track{filtered.length === 1 ? "" : "s"} in library
          </p>
        </div>

        <div className="flex items-center gap-3">
          {filtered.length > 0 ? (
            <button
              type="button"
              onClick={() => playSong(filtered[0], filtered)}
              className="inline-flex items-center gap-2 rounded-full bg-[#19181b] px-5 py-2.5 text-xs font-bold text-[#dbe878] shadow-md transition hover:scale-105 active:scale-95"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Play All</span>
            </button>
          ) : null}

          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 transition hover:border-zinc-900"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Track</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/music"
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              view === "songs"
                ? "bg-[#19181b] text-[#dbe878]"
                : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900"
            }`}
          >
            <Music2 className="h-3.5 w-3.5" />
            <span>Songs</span>
          </Link>
          <Link
            href="/music?view=albums"
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              view === "albums"
                ? "bg-[#19181b] text-[#dbe878]"
                : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900"
            }`}
          >
            <Disc3 className="h-3.5 w-3.5" />
            <span>Albums</span>
          </Link>
          <Link
            href="/music?view=artists"
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              view === "artists"
                ? "bg-[#19181b] text-[#dbe878]"
                : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900"
            }`}
          >
            <Users2 className="h-3.5 w-3.5" />
            <span>Artists</span>
          </Link>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, artists, albums..."
            className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2 pl-9 text-xs font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:shadow-xs"
          />
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
        </div>
      </div>

      {/* Main Content by View */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No tracks found"
          body={query ? `No matching tracks for "${query}".` : "Add Cloudinary audio URLs from Settings to populate your library."}
          action={
            <Link
              href="/settings"
              className="rounded-full bg-[#19181b] px-5 py-2 text-xs font-bold text-[#dbe878]"
            >
              Add a track
            </Link>
          }
        />
      ) : view === "albums" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {albums.map((album) => (
            <div
              key={album.title}
              onClick={() => playSong(album.songs[0], album.songs)}
              className="group cursor-pointer rounded-[24px] border border-black/5 bg-white p-3 shadow-xs transition hover:shadow-md"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100">
                <Cover src={album.cover} title={album.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-zinc-950 shadow-lg">
                    <Play className="h-4 w-4 translate-x-0.5 fill-current" />
                  </span>
                </div>
              </div>
              <p className="mt-2.5 truncate text-xs font-bold text-zinc-900">{album.title}</p>
              <p className="truncate text-[11px] text-zinc-500">{album.artist} • {album.songs.length} tracks</p>
            </div>
          ))}
        </div>
      ) : view === "artists" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {artists.map((artist) => {
            const artistSongs = songs.filter((s) => s.artist_id === artist.id);
            return (
              <div
                key={artist.id}
                onClick={() => {
                  if (artistSongs[0]) playSong(artistSongs[0], artistSongs);
                }}
                className="group flex cursor-pointer flex-col items-center rounded-[24px] border border-black/5 bg-white p-4 text-center shadow-xs transition hover:shadow-md"
              >
                <div className="relative aspect-square w-24 overflow-hidden rounded-full ring-2 ring-zinc-100 transition duration-300 group-hover:scale-105 group-hover:ring-zinc-900">
                  <Cover src={artist.image_url} title={artist.name} className="h-full w-full object-cover" />
                </div>
                <p className="mt-3 truncate text-xs font-bold text-zinc-900">{artist.name}</p>
                <p className="text-[11px] text-zinc-500">{artistSongs.length} track{artistSongs.length === 1 ? "" : "s"}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-xs space-y-1">
          {filtered.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              queue={filtered}
              index={index}
              onMore={() => setSelectedForFolder(song)}
              onEdit={(songToEdit) => editSong(songToEdit)}
            />
          ))}
        </div>
      )}

      {/* Add To Playlist / Create Playlist Modal */}
      <AddToPlaylistModal
        song={selectedForFolder}
        isOpen={Boolean(selectedForFolder)}
        onClose={() => setSelectedForFolder(null)}
      />
    </div>
  );
}
