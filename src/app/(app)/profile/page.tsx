"use client";

import { useTrackEditor } from "@/components/app-shell";
import { useFullscreen } from "@/components/app-shell";
import { SongRow } from "@/components/song-row";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import { initials } from "@/lib/utils";
import {
  Award,
  Crown,
  Disc3,
  Heart,
  Maximize2,
  Minimize2,
  Music2,
  Play,
  Settings,
  Share2,
  Sparkles,
} from "lucide-react";
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
      {/* 1. Luxury Editorial Profile Hero Banner */}
      <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#19181b] via-[#242226] to-[#121113] p-6 text-white shadow-2xl sm:p-10">
        {/* Ambient Decorative Gold Glows */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#dbe878]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-amber-600/15 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            {/* Luxury Avatar with Gold Border */}
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-28 w-28 rounded-full object-cover shadow-2xl ring-4 ring-[#dbe878]/40 sm:h-32 sm:w-32"
                />
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-full bg-[#2a292d] text-3xl font-bold text-[#dbe878] shadow-2xl ring-4 ring-[#dbe878]/30 sm:h-32 sm:w-32">
                  {initials(displayName)}
                </div>
              )}
              <span className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-[#dbe878] text-zinc-950 shadow-lg ring-2 ring-[#19181b]">
                <Crown className="h-4 w-4" />
              </span>
            </div>

            {/* Profile Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#dbe878]/15 px-3 py-0.5 text-[10px] font-bold tracking-widest uppercase text-[#dbe878]">
                  <Sparkles className="h-3 w-3" />
                  {isAdmin ? "STUDIO ADMINISTRATOR" : "VIP LISTENER"}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium text-zinc-300">
                  Role: {role.toUpperCase()}
                </span>
              </div>

              <h1 className="mt-2 font-serif text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
                {displayName}
              </h1>
              <p className="mt-1 text-xs text-zinc-400 font-mono">{user?.email}</p>
              <p className="mt-2 text-xs text-zinc-300">
                Curating exquisite soundscapes across Cloudinary & Orbit Studio.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-full bg-[#dbe878] px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-[#dbe878]/20 transition hover:bg-[#eaf48c] active:scale-95"
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
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/10"
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
              className="inline-flex md:hidden lg:hidden items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.1] active:scale-[0.97]"
            >
              <span className={`transition-colors duration-300 ${fullscreen ? "text-[#dbe878]" : "text-white/60"
                }`}>
                {!fullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </span>

              <span
                className={`relative flex h-[22px] w-[40px] shrink-0 items-center rounded-full p-[3px] transition-all duration-300 ${fullscreen
                  ? "bg-[#dbe878] shadow-[0_0_12px_rgba(219,232,120,0.25)]"
                  : "bg-white/20"
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

      {/* 2. Luxury Bento Stats Grid */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Music2}
          label="Library Tracks"
          value={songs.length}
          subtext="In catalog"
          tone="bg-white border border-black/5"
        />
        <StatCard
          icon={Heart}
          label="Favorites"
          value={favouriteIds.size}
          subtext="Loved tracks"
          tone="bg-white border border-black/5"
        />
        <StatCard
          icon={Disc3}
          label="Collections"
          value={playlists.length}
          subtext="Playlists & Folders"
          tone="bg-white border border-black/5"
        />
        <StatCard
          icon={Award}
          label="Total Plays"
          value={totalPlays}
          subtext="Streamed sessions"
          tone="bg-white border border-black/5"
        />
      </section>

      {/* 4. Favorite Tracks Section */}
      {favoriteSongs.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-zinc-900">Favorite Selections</h2>
              <p className="text-xs text-zinc-500">Tracks personally curated and loved by {displayName}</p>
            </div>
            <button
              type="button"
              onClick={() => playSong(favoriteSongs[0], favoriteSongs)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#19181b] px-4 py-1.5 text-xs font-semibold text-[#dbe878]"
            >
              <Play className="h-3 w-3 fill-current" />
              Play All
            </button>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-xs space-y-1">
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

      {/* 5. Recently Played Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-zinc-900">Listening History</h2>
            <p className="text-xs text-zinc-500">Recently streamed records</p>
          </div>
          {recentlyPlayed.length > 0 ? (
            <button
              type="button"
              onClick={() => playSong(recentlyPlayed[0], recentlyPlayed)}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900"
            >
              Play History
            </button>
          ) : null}
        </div>

        {recentlyPlayed.length === 0 ? (
          <div className="rounded-[28px] border border-black/5 bg-white p-8 text-center text-xs text-zinc-500">
            Play any track from the library to populate your listening timeline.
          </div>
        ) : (
          <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-xs space-y-1">
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
  icon: Icon,
  label,
  value,
  subtext,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  subtext: string;
  tone: string;
}) {
  return (
    <div className={`rounded-[28px] p-5 shadow-xs transition hover:shadow-md ${tone}`}>
      <div className="flex items-center justify-between text-zinc-500">
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>
      <p className="mt-3 font-serif text-3xl font-black tracking-tight text-zinc-900">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-zinc-400">{subtext}</p>
    </div>
  );
}
