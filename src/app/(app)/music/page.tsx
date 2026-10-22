"use client";

import { AddToPlaylistModal } from "@/components/add-to-playlist-modal";
import { useTrackEditor } from "@/components/app-shell";
import { ArtistAvatar } from "@/components/artist-avatar";
import { Cover } from "@/components/cover";
import { EditArtistModal } from "@/components/edit-artist-modal";
import { EmptyState } from "@/components/empty-state";
import { SongRow } from "@/components/song-row";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import { getIndividualArtists, splitArtistNames, type ParsedArtist } from "@/lib/artists";
import type { Song } from "@/lib/types";
import { Disc3, Music2, Pencil, Play, Plus, Search, Users2 } from "lucide-react";
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
  const [editingArtist, setEditingArtist] = useState<ParsedArtist | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(q) ||
        song.artist?.name.toLowerCase().includes(q) ||
        splitArtistNames(song.artist?.name).some((name) =>
          name.toLowerCase().includes(q),
        ) ||
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

  // Group by individual artist if view === 'artists'
  // Ensures multi-artist tracks (e.g. "Calvin Harris, Ayah Marar") are split into individual artists
  const individualArtists = useMemo(() => {
    return getIndividualArtists(songs, artists);
  }, [songs, artists]);

  const filteredArtists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [...individualArtists].sort((a, b) => b.songs.length - a.songs.length || a.name.localeCompare(b.name));
    }
    return individualArtists
      .filter((a) => a.name.toLowerCase().includes(q))
      .sort((a, b) => b.songs.length - a.songs.length || a.name.localeCompare(b.name));
  }, [query, individualArtists]);

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
            {view === "artists"
              ? `${filteredArtists.length} individual artist${filteredArtists.length === 1 ? "" : "s"} • ${songs.length} tracks in catalog`
              : view === "albums"
                ? `${albums.length} album${albums.length === 1 ? "" : "s"} • ${songs.length} tracks in catalog`
                : `${filtered.length} track${filtered.length === 1 ? "" : "s"} in library`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {songs.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (view === "artists" && filteredArtists[0]?.songs[0]) {
                  playSong(filteredArtists[0].songs[0], songs);
                } else if (filtered[0]) {
                  playSong(filtered[0], filtered);
                }
              }}
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
            <Link
              key={album.title}
              href={`/albums/${encodeURIComponent(album.title)}`}
              className="group block rounded-[24px] border border-black/5 bg-white p-3 shadow-xs transition hover:shadow-md focus:outline-none"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100">
                <Cover src={album.cover} title={album.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (album.songs[0]) playSong(album.songs[0], album.songs);
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 cursor-pointer"
                  title={`Play ${album.title}`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-zinc-950 shadow-lg transition hover:scale-110">
                    <Play className="h-4 w-4 translate-x-0.5 fill-current" />
                  </span>
                </div>
              </div>
              <p className="mt-2.5 truncate text-xs font-bold text-zinc-900 group-hover:text-black transition">{album.title}</p>
              <p className="truncate text-[11px] text-zinc-500">{album.artist} • {album.songs.length} tracks</p>
            </Link>
          ))}
        </div>
      ) : view === "artists" ? (
        filteredArtists.length === 0 ? (
          <EmptyState
            title="No artists found"
            body={query ? `No artists matching "${query}".` : "No artists found in your catalog yet."}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filteredArtists.map((artist) => {
              return (
                <div
                  key={artist.name}
                  className="group relative flex flex-col items-center rounded-[24px] border border-black/5 bg-white p-4 text-center shadow-xs transition hover:border-black/15 hover:shadow-md"
                >
                  {/* Edit Artist Profile Picture Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setEditingArtist(artist);
                    }}
                    className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/5 text-zinc-500 opacity-0 transition hover:bg-black/10 hover:text-zinc-900 group-hover:opacity-100"
                    title={`Edit profile picture and bio for ${artist.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  {/* Circular Avatar with Play overlay */}
                  <div className="relative">
                    <Link href={`/artists/${encodeURIComponent(artist.name)}`}>
                      <ArtistAvatar
                        name={artist.name}
                        imageUrl={artist.image_url}
                        sizeClassName="w-24 h-24"
                      />
                    </Link>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (artist.songs[0]) playSong(artist.songs[0], artist.songs);
                      }}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition group-hover:opacity-100 cursor-pointer"
                      title={`Play ${artist.name}`}
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-zinc-950 shadow-lg">
                        <Play className="h-4 w-4 translate-x-0.5 fill-current" />
                      </span>
                    </div>
                  </div>

                  {/* Artist Name & Track count linking to dedicated artist page */}
                  <Link
                    href={`/artists/${encodeURIComponent(artist.name)}`}
                    className="mt-3 w-full max-w-full text-center focus:outline-none"
                  >
                    <p
                      className="w-full truncate px-1 text-xs font-bold text-zinc-900 transition hover:text-black group-hover:text-black"
                      title={artist.name}
                    >
                      {artist.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {artist.songs.length} track{artist.songs.length === 1 ? "" : "s"}
                    </p>
                  </Link>
                </div>
              );
            })}
          </div>
        )
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

      {/* Edit Artist Profile Picture Modal */}
      <EditArtistModal
        artist={editingArtist}
        isOpen={Boolean(editingArtist)}
        onClose={() => setEditingArtist(null)}
      />
    </div>
  );
}
