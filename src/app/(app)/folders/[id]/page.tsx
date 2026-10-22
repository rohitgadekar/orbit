"use client";

import { useTrackEditor } from "@/components/app-shell";
import { Cover } from "@/components/cover";
import { EmptyState } from "@/components/empty-state";
import { SongRow } from "@/components/song-row";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import type { Song } from "@/lib/types";
import { ArrowLeft, Play, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function FolderDetailPage() {
  const params = useParams<{ id: string }>();
  const { playlists, playlistSongs, songs, addToPlaylist, removeFromPlaylist, loading } = useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();
  const [items, setItems] = useState<Song[]>([]);
  const [searchSong, setSearchSong] = useState("");
  const playlist = playlists.find((item) => item.id === params.id);

  const load = useCallback(async () => {
    if (!params.id) return;
    const data = await playlistSongs(params.id);
    setItems(data);
  }, [params.id, playlistSongs]);

  useEffect(() => {
    let active = true;
    playlistSongs(params.id).then((res) => {
      if (active) setItems(res);
    });
    return () => {
      active = false;
    };
  }, [params.id, playlistSongs]);

  if (loading && !playlist) {
    return <div className="h-40 animate-pulse rounded-[28px] bg-zinc-200" />;
  }

  if (!playlist) {
    return (
      <EmptyState
        title="Playlist not found"
        body="It may have been removed or deleted."
        action={
          <Link href="/folders" className="text-xs font-semibold text-zinc-900 underline">
            Back to playlists
          </Link>
        }
      />
    );
  }

  const available = songs.filter(
    (song) =>
      !items.some((item) => item.id === song.id) &&
      (!searchSong.trim() ||
        song.title.toLowerCase().includes(searchSong.toLowerCase()) ||
        song.artist?.name.toLowerCase().includes(searchSong.toLowerCase())),
  );

  const cover = playlist.cover_url || items[0]?.cover_url || items[0]?.album?.cover_url;

  return (
    <div className="space-y-6 pb-12">
      <Link
        href="/folders"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to playlists</span>
      </Link>

      {/* Playlist Hero Banner */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between rounded-[32px] border border-black/5 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Cover
            src={cover}
            title={playlist.name}
            className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl shadow-md shrink-0"
          />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Playlist Collection
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              {playlist.name}
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              {items.length} track{items.length === 1 ? "" : "s"} in this playlist
            </p>
          </div>
        </div>

        {items[0] ? (
          <button
            type="button"
            onClick={() => playSong(items[0], items)}
            className="inline-flex items-center gap-2 rounded-full bg-[#19181b] px-6 py-2.5 text-xs font-bold text-[#dbe878] shadow-md transition hover:scale-105 active:scale-95"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Play Playlist</span>
          </button>
        ) : null}
      </div>

      {/* Playlist Songs List */}
      {items.length === 0 ? (
        <EmptyState
          title="Empty playlist"
          body="Use the search section below to add your favorite songs to this playlist."
        />
      ) : (
        <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-xs space-y-1">
          {items.map((song, index) => (
            <div key={song.id} className="flex items-center">
              <div className="min-w-0 flex-1">
                <SongRow
                  song={song}
                  queue={items}
                  index={index}
                  onEdit={(songToEdit) => editSong(songToEdit)}
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  await removeFromPlaylist(playlist.id, song.id);
                  await load();
                }}
                className="px-3 text-xs font-medium text-zinc-400 transition hover:text-rose-500"
                title="Remove from playlist"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Songs from Library Section */}
      <section className="space-y-3 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Add songs from your library</h2>
            <p className="text-xs text-zinc-500">Select any song to add to &ldquo;{playlist.name}&rdquo;</p>
          </div>

          <div className="relative sm:max-w-xs">
            <input
              value={searchSong}
              onChange={(e) => setSearchSong(e.target.value)}
              placeholder="Search library to add..."
              className="w-full rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 pl-8 text-xs font-medium text-zinc-900 outline-none transition focus:border-zinc-900"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
          </div>
        </div>

        {available.length === 0 ? (
          <p className="rounded-2xl border border-black/5 bg-white p-6 text-center text-xs text-zinc-400">
            {searchSong ? `No available songs matching "${searchSong}".` : "All songs in your library are already in this playlist."}
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-black/5 bg-white p-2 shadow-xs divide-y divide-zinc-100 pr-1">
            {available.map((song) => (
              <div
                key={song.id}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-zinc-50"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Cover
                    src={song.cover_url || song.album?.cover_url}
                    title={song.title}
                    className="h-9 w-9 rounded-lg shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">{song.title}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{song.artist?.name}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await addToPlaylist(playlist.id, song.id);
                    await load();
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-[#dbe878] hover:text-zinc-950 transition ml-3 shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add to playlist</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
