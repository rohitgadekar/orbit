"use client";

import { useTrackEditor } from "@/components/app-shell";
import { ArtistAvatar } from "@/components/artist-avatar";
import { EditArtistModal } from "@/components/edit-artist-modal";
import { EmptyState } from "@/components/empty-state";
import { SongRow } from "@/components/song-row";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import { getIndividualArtists, songCreditsArtist, type ParsedArtist } from "@/lib/artists";
import type { Song } from "@/lib/types";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Disc3,
  Loader2,
  Pencil,
  Play,
  Shuffle,
  Sparkles,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function ArtistDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rawId = params?.id ? decodeURIComponent(params.id) : "";

  const { songs, artists, loading } = useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();
  const { isAdmin } = useAuth();

  const [editingArtist, setEditingArtist] = useState<ParsedArtist | null>(null);
  const [isFetchingInternet, setIsFetchingInternet] = useState(false);
  const [initialModalStatus, setInitialModalStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFetchArtistInfo() {
    if (!artist) return;
    setIsFetchingInternet(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/artist-info?name=${encodeURIComponent(artist.name)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || `Could not find web info for "${artist.name}"`);
      }

      const updatedArtist: ParsedArtist = {
        ...artist,
        image_url: data.imageUrl || artist.image_url,
        bio: data.bio || artist.bio,
      };

      const sourceInfo = data.source ? ` (${data.source})` : "";
      setInitialModalStatus(
        `Found photo & short bio from internet${sourceInfo}! Review and click 'Save to Database'.`,
      );
      setEditingArtist(updatedArtist);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to fetch artist info from internet",
      );
      setTimeout(() => setErrorMessage(null), 6000);
    } finally {
      setIsFetchingInternet(false);
    }
  }

  const individualArtists = useMemo(() => {
    return getIndividualArtists(songs, artists);
  }, [songs, artists]);

  const artist = useMemo(() => {
    if (!rawId) return null;
    const lower = rawId.toLowerCase().trim();
    const matched =
      individualArtists.find(
        (a) =>
          a.id === rawId ||
          a.name.toLowerCase().trim() === lower ||
          encodeURIComponent(a.name).toLowerCase() === lower,
      ) ?? null;

    if (!matched) {
      // Check if rawId matches an artist name directly from catalog or song credits
      const nameMatch = rawId.trim();
      const songsForArtist = songs.filter((s) => songCreditsArtist(s, nameMatch));
      if (songsForArtist.length > 0) {
        const dbArtist = artists.find((a) => a.name.toLowerCase().trim() === lower);
        return {
          id: dbArtist?.id || `artist-${encodeURIComponent(lower)}`,
          name: dbArtist?.name || nameMatch,
          image_url: dbArtist?.image_url || null,
          bio: dbArtist?.bio || null,
          songs: songsForArtist,
          plays: songsForArtist.reduce((sum, s) => sum + (s.play_count || 0), 0),
          trackCount: songsForArtist.length,
        };
      }
      return null;
    }

    // Ensure all songs crediting this artist (including shared songs and featured tracks) are included
    const allCreditedSongs = songs.filter((s) => songCreditsArtist(s, matched.name));
    const finalSongs = allCreditedSongs.length > 0 ? allCreditedSongs : matched.songs;

    return {
      ...matched,
      songs: finalSongs,
      plays: finalSongs.reduce((sum, s) => sum + (s.play_count || 0), 0),
      trackCount: finalSongs.length,
    };
  }, [rawId, individualArtists, songs, artists]);

  if (loading && !artist) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 rounded-[32px] bg-zinc-200" />
        <div className="h-40 rounded-2xl bg-zinc-200" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="space-y-6 pb-12">
        <Link
          href="/music?view=artists"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Artists</span>
        </Link>
        <EmptyState
          title="Artist not found"
          body={`No artist matching "${rawId}" was found in your library.`}
          action={
            <Link
              href="/music?view=artists"
              className="rounded-full bg-[#19181b] px-5 py-2 text-xs font-bold text-[#dbe878]"
            >
              Browse all artists
            </Link>
          }
        />
      </div>
    );
  }

  function handleShufflePlay() {
    if (!artist || artist.songs.length === 0) return;
    const shuffled = [...artist.songs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Navigation */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 shadow-xs transition hover:border-black/20 hover:text-zinc-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFetchArtistInfo}
              disabled={isFetchingInternet}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#19181b] bg-[#19181b] px-4 py-2 text-xs font-semibold text-[#dbe878] shadow-xs transition hover:bg-[#252429] hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isFetchingInternet ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 fill-current" />
              )}
              <span>{isFetchingInternet ? "Fetching Info..." : "Fetch from Internet"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setInitialModalStatus(null);
                setEditingArtist(artist);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 shadow-xs transition hover:border-zinc-900 hover:text-zinc-950"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Details</span>
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}
      </div>

      {/* Artist Hero Banner */}
      <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#19181b] via-[#242228] to-[#121114] p-6 text-white shadow-xl sm:p-8 md:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#dbe878]/10 blur-3xl" />

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          {/* Circular Profile Picture */}
          <div className="relative shrink-0">
            <ArtistAvatar
              name={artist.name}
              imageUrl={artist.image_url}
              sizeClassName="w-32 h-32 sm:w-40 sm:h-40"
              className="ring-4 ring-white/10 shadow-2xl"
            />
          </div>

          {/* Details */}
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#dbe878] backdrop-blur-md">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Catalog Artist</span>
            </div>

            <h1 className="mt-3 font-serif text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
              {artist.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200">
                {artist.songs.length} track{artist.songs.length === 1 ? "" : "s"}
              </span>
              <span>•</span>
              <span>{artist.plays} total play{artist.plays === 1 ? "" : "s"}</span>
            </div>

            {/* Play & Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              {artist.songs.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => playSong(artist.songs[0], artist.songs)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#dbe878] px-6 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-[#dbe878]/20 transition hover:bg-[#e4ef8f] hover:scale-105 active:scale-95"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Play Discography</span>
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

              <button
                type="button"
                onClick={handleFetchArtistInfo}
                disabled={isFetchingInternet}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-[#dbe878] backdrop-blur-md transition hover:bg-white/20 hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isFetchingInternet ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 fill-current" />
                )}
                <span>{isFetchingInternet ? "Fetching..." : "Fetch Info from Internet"}</span>
              </button>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    setInitialModalStatus(null);
                    setEditingArtist(artist);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-4 py-2.5 text-xs font-medium text-zinc-300 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>{artist.image_url ? "Update Photo & Bio" : "Add Profile Photo & Bio"}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Biography Card */}
      <section className="rounded-[32px] border border-black/5 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Artist Biography
            </span>
            <h2 className="font-serif text-xl font-bold text-zinc-900">About {artist.name}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleFetchArtistInfo}
              disabled={isFetchingInternet}
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 disabled:opacity-50"
            >
              {isFetchingInternet ? (
                <Loader2 className="h-3 w-3 animate-spin text-zinc-900" />
              ) : (
                <Sparkles className="h-3 w-3 text-amber-500" />
              )}
              <span>Fetch from Internet</span>
            </button>

            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setInitialModalStatus(null);
                  setEditingArtist(artist);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
              >
                <Pencil className="h-3 w-3" />
                <span>{artist.bio ? "Edit Bio" : "Add Bio"}</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          {artist.bio ? (
            <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-line">
              {artist.bio}
            </p>
          ) : (
            <div className="rounded-2xl bg-zinc-50 p-6 text-center text-xs text-zinc-500">
              <p>No biography has been added to the database for {artist.name} yet.</p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleFetchArtistInfo}
                  disabled={isFetchingInternet}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#19181b] px-4 py-2 text-xs font-semibold text-[#dbe878] transition hover:scale-105 disabled:opacity-50"
                >
                  {isFetchingInternet ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 fill-current" />
                  )}
                  <span>Fetch Bio & Photo from Internet</span>
                </button>

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setInitialModalStatus(null);
                      setEditingArtist(artist);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit Manually</span>
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tracks Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-zinc-900">Tracks</h2>
            <p className="text-xs text-zinc-500">
              Songs featuring {artist.name} in your library ({artist.songs.length})
            </p>
          </div>
          {artist.songs.length > 0 ? (
            <button
              type="button"
              onClick={() => playSong(artist.songs[0], artist.songs)}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900"
            >
              Play all
            </button>
          ) : null}
        </div>

        {artist.songs.length === 0 ? (
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-center text-xs text-zinc-500">
            <Disc3 className="mx-auto mb-2 h-6 w-6 text-zinc-400" />
            <p>No tracks in your library currently credit {artist.name}.</p>
          </div>
        ) : (
          <div className="rounded-[28px] border border-black/5 bg-white p-3 shadow-xs space-y-1">
            {artist.songs.map((song, index) => (
              <SongRow
                key={song.id}
                song={song}
                queue={artist.songs}
                index={index}
                onEdit={isAdmin ? (songToEdit) => editSong(songToEdit) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {/* Edit Artist Modal for Updating Photo PNG URL & Bio */}
      <EditArtistModal
        artist={editingArtist}
        isOpen={Boolean(editingArtist)}
        initialStatus={initialModalStatus}
        onClose={() => {
          setEditingArtist(null);
          setInitialModalStatus(null);
        }}
      />
    </div>
  );
}
