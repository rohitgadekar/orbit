"use client";

import { useTrackEditor } from "@/components/app-shell";
import { Cover } from "@/components/cover";
import { EmptyState } from "@/components/empty-state";
import { SongRow } from "@/components/song-row";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import { generateSmartMixes } from "@/lib/mixes";
import {
  ArrowLeft,
  Check,
  FolderPlus,
  Loader2,
  Play,
  Shuffle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function MixDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { songs, recentlyPlayed, favouriteIds, createPlaylistWithSongs } =
    useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();
  const { isAdmin } = useAuth();

  const [savingMix, setSavingMix] = useState(false);
  const [savedMix, setSavedMix] = useState(false);

  // Regenerate smart mixes (deterministic for today — same result as music page)
  const mix = useMemo(() => {
    if (songs.length === 0) return null;
    const mixes = generateSmartMixes(songs, recentlyPlayed, favouriteIds);
    return mixes.find((m) => m.id === params.id) ?? null;
  }, [songs, recentlyPlayed, favouriteIds, params.id]);

  const handleSaveAsPlaylist = async () => {
    if (!mix || savingMix || savedMix) return;
    setSavingMix(true);
    try {
      await createPlaylistWithSongs(
        mix.title,
        mix.songs.map((s) => s.id),
        mix.coverUrl,
      );
      setSavedMix(true);
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(12);
        } catch { }
      }
    } catch (err) {
      console.error("Failed to save mix as playlist:", err);
    } finally {
      setSavingMix(false);
    }
  };

  const handleShuffle = () => {
    if (!mix?.songs.length) return;
    const shuffled = [...mix.songs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  };

  // Loading skeleton while songs haven't been fetched yet
  if (songs.length === 0) {
    return (
      <div className="space-y-6 pb-20 animate-pulse">
        <div className="h-4 w-24 rounded-full bg-zinc-200" />
        <div className="flex flex-col gap-5 rounded-[32px] border border-black/5 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div className="h-24 w-24 rounded-2xl bg-zinc-200 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-16 rounded bg-zinc-100" />
            <div className="h-7 w-48 rounded bg-zinc-200" />
            <div className="h-3 w-32 rounded bg-zinc-100" />
          </div>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-3 shadow-2xs space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3.5 px-3 py-2.5">
              <div className="h-11 w-11 rounded-xl bg-zinc-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 rounded bg-zinc-200" />
                <div className="h-2.5 w-24 rounded bg-zinc-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Not found
  if (!mix) {
    return (
      <EmptyState
        title="Mix not found"
        body="This mix may have expired or isn't available. New mixes are generated fresh each day."
        action={
          <Link
            href="/music"
            className="text-xs font-semibold text-zinc-900 underline"
          >
            Back to Curated Mixes
          </Link>
        }
      />
    );
  }

  const coverUrl = mix.coverUrl;

  return (
    <div className="space-y-6 pb-20">
      {/* Back Link */}
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back</span>
      </button>

      {/* Hero Banner */}
      <div className="overflow-hidden rounded-[32px] border border-black/5 bg-white shadow-sm">
        {/* Gradient accent strip behind the cover */}
        <div className={`bg-gradient-to-br ${mix.gradient} p-6`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            {/* Cover art */}
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl shadow-xl sm:h-36 sm:w-36">
              {coverUrl ? (
                <Cover
                  src={coverUrl}
                  title={mix.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className={`h-full w-full bg-gradient-to-br ${mix.gradient} flex flex-col justify-between p-3 text-white`}
                >
                  <span className="text-[8px] font-black tracking-widest uppercase opacity-75">
                    {mix.badge}
                  </span>
                  <span className="font-serif text-xl font-bold leading-tight">
                    {mix.title}
                  </span>
                </div>
              )}
              {/* Badge overlay */}
              <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[8px] font-black tracking-wider uppercase text-white backdrop-blur-md">
                {mix.badge}
              </span>
            </div>

            {/* Text metadata */}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                Smart Mix
              </span>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {mix.title}
              </h1>
              <p className="mt-1 text-xs text-white/75 leading-relaxed line-clamp-2">
                {mix.subtitle}
              </p>
              <p className="mt-1 text-[11px] text-white/60">
                {mix.songs.length} track{mix.songs.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 border-t border-black/5 px-6 py-4">
          {/* Play All */}
          {mix.songs[0] && (
            <button
              type="button"
              onClick={() => playSong(mix.songs[0], mix.songs)}
              className="inline-flex items-center gap-2 rounded-full bg-[#19181b] px-6 py-2.5 text-xs font-bold text-[#dbe878] shadow-md transition hover:scale-105 active:scale-95"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Play All</span>
            </button>
          )}

          {/* Shuffle */}
          {mix.songs.length > 1 && (
            <button
              type="button"
              onClick={handleShuffle}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-zinc-900 hover:text-black active:scale-95"
            >
              <Shuffle className="h-3.5 w-3.5" />
              <span>Shuffle</span>
            </button>
          )}

          {/* Save as Playlist */}
          <button
            type="button"
            onClick={() => void handleSaveAsPlaylist()}
            disabled={savingMix || savedMix}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition active:scale-95 ${savedMix
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:border-zinc-900 hover:text-black"
              }`}
          >
            {savingMix ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedMix ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Saved to Playlists</span>
              </>
            ) : (
              <>
                <FolderPlus className="h-3.5 w-3.5" />
                <span>Save as Playlist</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Track List */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-zinc-900">Tracks in this mix</h2>
          <p className="text-xs text-zinc-500">{mix.songs.length} songs</p>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-2xs space-y-1">
          {mix.songs.map((song, index) => (
            <SongRow
              key={song.id}
              song={song}
              queue={mix.songs}
              index={index}
              onEdit={isAdmin ? (s) => editSong(s) : undefined}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

