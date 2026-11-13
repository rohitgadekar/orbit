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
  Check,
  FolderPlus,
  ListMusic,
  Loader2,
  Play,
  Shuffle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

export default function MixDetailPage() {
  const params = useParams<{ id: string }>();
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
        <div className="flex flex-col gap-5 rounded-[36px] border border-white/5 bg-[#222224] p-6 sm:flex-row sm:items-center">
          <div className="h-28 w-28 shrink-0 rounded-2xl bg-[#2c2c2f]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-16 rounded bg-[#2c2c2f]" />
            <div className="h-7 w-48 rounded bg-[#2c2c2f]" />
            <div className="h-3 w-32 rounded bg-[#2c2c2f]" />
          </div>
        </div>
        <div className="space-y-2 rounded-[28px] border border-white/5 bg-[#222224] p-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3.5 px-3 py-2.5">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-[#2c2c2f]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-40 rounded bg-[#2c2c2f]" />
                <div className="h-2.5 w-24 rounded bg-[#2c2c2f]" />
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
            className="rounded-full bg-blue-500 px-5 py-2 text-xs font-bold text-white transition hover:bg-blue-400"
          >
            Back to Curated Mixes
          </Link>
        }
      />
    );
  }

  const coverUrl = mix.coverUrl;

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-[36px] border border-white/5 bg-gradient-to-br from-[#19181b] via-[#242228] to-[#121114] p-6 text-white shadow-xl sm:p-8">
        {/* Mix colour wash + soft glow */}
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${mix.gradient} opacity-25`}
        />
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          {/* Cover art */}
          <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-[26px] shadow-2xl ring-1 ring-white/10 sm:h-48 sm:w-48 md:h-52 md:w-52">
            {coverUrl ? (
              <Cover
                src={coverUrl}
                title={mix.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className={`grid h-full w-full place-items-center bg-gradient-to-br ${mix.gradient} text-white`}
              >
                <ListMusic className="h-12 w-12 opacity-80" />
              </div>
            )}
          </div>

          {/* Text metadata */}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <div>
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-400 backdrop-blur-md">
                {mix.badge}
              </span>
            </div>
            <h1 className="mt-2.5 font-sans text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl line-clamp-2">
              {mix.title}
            </h1>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-300">
              {mix.subtitle}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {mix.songs.length} track{mix.songs.length === 1 ? "" : "s"}
            </p>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {mix.songs[0] && (
                <button
                  type="button"
                  onClick={() => playSong(mix.songs[0], mix.songs)}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:scale-105 hover:bg-blue-400 active:scale-95"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Play All</span>
                </button>
              )}

              {mix.songs.length > 1 && (
                <button
                  type="button"
                  onClick={handleShuffle}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  <span>Shuffle</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleSaveAsPlaylist()}
                disabled={savingMix || savedMix}
                className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-xs font-semibold backdrop-blur-md transition active:scale-95 ${savedMix
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/20 bg-white/10 text-white hover:bg-white/20"
                  }`}
              >
                {savingMix ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : savedMix ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
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
        </div>
      </section>

      {/* Track List */}
      <section className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <h2 className="text-lg font-bold tracking-tight text-white">Tracks in this mix</h2>
          <p className="text-xs text-zinc-500">{mix.songs.length} songs</p>
        </div>

        <div className="space-y-1 rounded-[28px] border border-white/5 bg-[#222224] p-2">
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