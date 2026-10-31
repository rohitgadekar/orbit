"use client";

import { useFullscreen, useTrackEditor } from "@/components/app-shell";
import { SongRow } from "@/components/song-row";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import { initials } from "@/lib/utils";
import { Maximize2, Minimize2, Play, Settings, Share2 } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { profile, user, isAdmin, role } = useAuth();
  const { songs, favouriteIds, playlists, recentlyPlayed } = useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();
  const { fullscreen, setFullscreen } = useFullscreen();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Listener";
  const avatarUrl = profile?.avatar_url;

  const totalPlays = songs.reduce((sum, s) => sum + (s.play_count || 0), 0);
  const favoriteSongs = songs.filter((s) => favouriteIds.has(s.id));

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Profile hero */}
      <section className="relative overflow-hidden rounded-[36px] border border-white/5 bg-gradient-to-br from-[#19181b] via-[#242228] to-[#121114] p-6 text-white shadow-xl sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            {/* Avatar */}
            <div className="shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-28 w-28 rounded-full object-cover shadow-2xl ring-4 ring-white/10 sm:h-32 sm:w-32"
                />
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-full bg-[#2c2c2f] text-3xl font-bold text-white shadow-2xl ring-4 ring-white/10 sm:h-32 sm:w-32">
                  {initials(displayName)}
                </div>
              )}
            </div>

            {/* Profile info */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-400 backdrop-blur-md">
                  {isAdmin ? "Administrator" : "Listener"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium capitalize text-zinc-300">
                  {role}
                </span>
              </div>

              <h1 className="mt-3 font-sans text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
                {displayName}
              </h1>
              <p className="mt-1.5 font-mono text-xs text-zinc-400">{user?.email}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:scale-105 hover:bg-blue-400 active:scale-95"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) {
                  void navigator.clipboard.writeText(window.location.href);
                  alert("Profile link copied to clipboard!");
                }
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share</span>
            </button>

            {/* Immersive mode toggle — hides the top header nav on mobile to free up space below the status bar */}
            <button
              type="button"
              onClick={() => setFullscreen(!fullscreen)}
              aria-label={fullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode"}
              aria-pressed={fullscreen}
              title={fullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode"}
              className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.1] active:scale-[0.97] md:hidden"
            >
              <span
                className={`transition-colors duration-300 ${fullscreen ? "text-blue-400" : "text-white/60"}`}
              >
                {!fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </span>

              <span
                className={`relative flex h-[22px] w-[40px] shrink-0 items-center rounded-full p-[3px] transition-all duration-300 ${fullscreen ? "bg-blue-500" : "bg-white/20"
                  }`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${fullscreen ? "translate-x-[18px]" : "translate-x-0"
                    }`}
                />
              </span>

              <span className="min-w-[76px] text-left text-xs font-semibold tracking-wide text-white/90">
                {fullscreen ? "Fullscreen" : "Windowed"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Library Tracks" value={songs.length} subtext="In catalog" />
        <StatCard label="Favorites" value={favouriteIds.size} subtext="Loved tracks" />
        <StatCard label="Collections" value={playlists.length} subtext="Playlists & folders" />
        <StatCard label="Total Plays" value={totalPlays} subtext="Across the catalog" />
      </section>

      {/* 3. Favorite tracks */}
      {favoriteSongs.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Favorite Selections</h2>
              <p className="text-xs text-zinc-500">Tracks loved by {displayName}</p>
            </div>
            <button
              type="button"
              onClick={() => playSong(favoriteSongs[0], favoriteSongs)}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-400 active:scale-95"
            >
              <Play className="h-3 w-3 fill-current" />
              Play All
            </button>
          </div>

          <div className="space-y-1 rounded-[28px] border border-white/5 bg-[#222224] p-2">
            {favoriteSongs.slice(0, 5).map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                queue={favoriteSongs}
                index={idx}
                onEdit={isAdmin ? (songToEdit) => editSong(songToEdit) : undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* 4. Recently played */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Listening History</h2>
            <p className="text-xs text-zinc-500">Recently played tracks</p>
          </div>
          {recentlyPlayed.length > 0 ? (
            <button
              type="button"
              onClick={() => playSong(recentlyPlayed[0], recentlyPlayed)}
              className="text-xs font-semibold text-zinc-400 transition hover:text-white"
            >
              Play History
            </button>
          ) : null}
        </div>

        {recentlyPlayed.length === 0 ? (
          <div className="rounded-[28px] border border-white/5 bg-[#222224] p-8 text-center text-xs text-zinc-500">
            Play any track from the library to populate your listening history.
          </div>
        ) : (
          <div className="space-y-1 rounded-[28px] border border-white/5 bg-[#222224] p-2">
            {recentlyPlayed.slice(0, 6).map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                queue={recentlyPlayed}
                index={idx}
                onEdit={isAdmin ? (songToEdit) => editSong(songToEdit) : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: number;
  subtext: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/5 bg-[#222224] p-5 transition hover:border-white/15 hover:bg-[#262628]">
      <span className="text-xs font-semibold text-zinc-400">{label}</span>
      <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-zinc-500">{subtext}</p>
    </div>
  );
}