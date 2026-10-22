"use client";

import { useTrackEditor } from "@/components/app-shell";
import { Cover } from "@/components/cover";
import { EmptyState } from "@/components/empty-state";
import { SongRow } from "@/components/song-row";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import { formatTime } from "@/lib/utils";
import type { Song } from "@/lib/types";
import { ArrowLeft, Disc3, Play, Shuffle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";

export default function AlbumDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rawId = params?.id ? decodeURIComponent(params.id) : "";

  const { songs, loading } = useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();

  // Find all songs that belong to this album by id or title
  const albumData = useMemo(() => {
    if (!rawId) return null;
    const lower = rawId.toLowerCase().trim();

    // 1. Group songs matching either album_id, album.title, or matching album title text
    const albumSongs = songs.filter((s) => {
      if (s.album_id && s.album_id.toLowerCase() === lower) return true;
      if (s.album?.id && s.album.id.toLowerCase() === lower) return true;
      if (s.album?.title && s.album.title.toLowerCase().trim() === lower) return true;
      return false;
    });

    if (albumSongs.length === 0) {
      // Fallback: check if song title itself matches if single release
      const singleMatch = songs.filter((s) => s.title.toLowerCase().trim() === lower);
      if (singleMatch.length > 0) {
        const first = singleMatch[0];
        return {
          title: first.album?.title || first.title,
          artist: first.artist?.name || "Various Artists",
          artistId: first.artist_id || first.artist?.id || null,
          cover: first.cover_url || first.album?.cover_url,
          songs: singleMatch,
        };
      }
      return null;
    }

    const first = albumSongs[0];
    const albumTitle = first.album?.title || rawId;
    const artistName = first.artist?.name || "Various Artists";
    const coverUrl = first.album?.cover_url || first.cover_url;

    return {
      title: albumTitle,
      artist: artistName,
      artistId: first.artist_id || first.artist?.id || null,
      cover: coverUrl,
      songs: albumSongs,
    };
  }, [rawId, songs]);

  if (loading && !albumData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 rounded-[32px] bg-zinc-200" />
        <div className="h-40 rounded-2xl bg-zinc-200" />
      </div>
    );
  }

  if (!albumData) {
    return (
      <div className="space-y-6 pb-12">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Albums</span>
        </button>
        <EmptyState
          title="Album not found"
          body={`No album matching "${rawId}" was found in your library.`}
          action={
            <Link
              href="/music?view=albums"
              className="rounded-full bg-[#19181b] px-5 py-2 text-xs font-bold text-[#dbe878]"
            >
              Browse all albums
            </Link>
          }
        />
      </div>
    );
  }

  const totalDurationSeconds = albumData.songs.reduce(
    (sum, s) => sum + (s.duration_seconds || 0),
    0,
  );
  const totalPlays = albumData.songs.reduce((sum, s) => sum + (s.play_count || 0), 0);

  function handlePlayAll() {
    if (!albumData || albumData.songs.length === 0) return;
    playSong(albumData.songs[0], albumData.songs);
  }

  function handleShufflePlay() {
    if (!albumData || albumData.songs.length === 0) return;
    const shuffled = [...albumData.songs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 shadow-xs transition hover:border-black/20 hover:text-zinc-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>

        <Link
          href="/music?view=albums"
          className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition"
        >
          All Albums
        </Link>
      </div>

      {/* Album Hero Banner */}
      <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#211f24] via-[#1c1b1f] to-[#121114] p-6 text-white shadow-xl sm:p-8 md:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#dbe878]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-8">
          {/* Square Album Cover Artwork */}
          <div className="relative shrink-0">
            <div className="h-44 w-44 sm:h-52 sm:w-52 md:h-56 md:w-56 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
              <Cover
                src={albumData.cover}
                title={albumData.title}
                className="h-full w-full object-cover shadow-inner"
              />
            </div>
          </div>

          {/* Album Information */}
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#dbe878] backdrop-blur-md">
              <Disc3 className="h-3.5 w-3.5" />
              <span>Album</span>
            </div>

            <h1 className="mt-3 font-serif text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
              {albumData.title}
            </h1>

            <p className="mt-3 text-sm font-semibold text-zinc-300">
              By{" "}
              <Link
                href={`/artists/${encodeURIComponent(albumData.artist)}`}
                className="text-[#dbe878] hover:underline"
              >
                {albumData.artist}
              </Link>
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200">
                {albumData.songs.length} track{albumData.songs.length === 1 ? "" : "s"}
              </span>
              {totalDurationSeconds > 0 ? (
                <>
                  <span>•</span>
                  <span>{formatTime(totalDurationSeconds)}</span>
                </>
              ) : null}
              {totalPlays > 0 ? (
                <>
                  <span>•</span>
                  <span>{totalPlays} total play{totalPlays === 1 ? "" : "s"}</span>
                </>
              ) : null}
            </div>

            {/* Play & Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              {albumData.songs.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={handlePlayAll}
                    className="inline-flex items-center gap-2 rounded-full bg-[#dbe878] px-6 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-[#dbe878]/20 transition hover:bg-[#e4ef8f] hover:scale-105 active:scale-95"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Play Album</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShufflePlay}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    <span>Shuffle</span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Tracklist Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-zinc-900">Tracklist</h2>
            <p className="text-xs text-zinc-500">
              {albumData.songs.length} song{albumData.songs.length === 1 ? "" : "s"} in this album
            </p>
          </div>
          {albumData.songs.length > 0 ? (
            <button
              type="button"
              onClick={handlePlayAll}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900"
            >
              Play all
            </button>
          ) : null}
        </div>

        <div className="rounded-[28px] border border-black/5 bg-white p-3 shadow-xs space-y-1">
          {albumData.songs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              queue={albumData.songs}
              index={index}
              onEdit={(songToEdit) => editSong(songToEdit)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
