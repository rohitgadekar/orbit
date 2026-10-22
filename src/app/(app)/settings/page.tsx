"use client";

import { useTrackEditor } from "@/components/app-shell";
import { Cover } from "@/components/cover";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { initials } from "@/lib/utils";
import {
  Check,
  Disc3,
  Loader2,
  LogOut,
  Pencil,
  PlusCircle,
  Sparkles,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const { profile, user, updateProfile, signOut } = useAuth();
  const { songs, addTrack } = useMusic();
  const { editSong } = useTrackEditor();

  const [activeTab, setActiveTab] = useState<"account" | "add-track" | "catalog">("account");

  // Profile Form state
  const [prevProfile, setPrevProfile] = useState(profile);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  if (profile !== prevProfile) {
    setPrevProfile(profile);
    setDisplayName(profile?.display_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? "");
  }

  // Track Form state
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [trackBusy, setTrackBusy] = useState(false);
  const [trackStatus, setTrackStatus] = useState<string | null>(null);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await updateProfile(displayName, avatarUrl);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleSaveTrack(e: React.FormEvent) {
    e.preventDefault();
    setTrackBusy(true);
    setTrackStatus(null);

    try {
      await addTrack({
        title,
        artistName,
        albumTitle,
        audioUrl,
        coverUrl,
        durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
      });
      setTitle("");
      setArtistName("");
      setAlbumTitle("");
      setAudioUrl("");
      setCoverUrl("");
      setDurationSeconds("");
      setTrackStatus("Track added to library catalog successfully!");
      setTimeout(() => setTrackStatus(null), 3500);
    } catch (err) {
      setTrackStatus(err instanceof Error ? err.message : "Failed to add track");
    } finally {
      setTrackBusy(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-500">
          Preferences & Studio Controls
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Settings
        </h1>
      </div>

      {/* Luxury Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition ${
            activeTab === "account"
              ? "bg-[#19181b] text-[#dbe878] shadow-sm"
              : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Account & Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("add-track")}
          className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition ${
            activeTab === "add-track"
              ? "bg-[#19181b] text-[#dbe878] shadow-sm"
              : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900"
          }`}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span>Add Cloudinary Track</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition ${
            activeTab === "catalog"
              ? "bg-[#19181b] text-[#dbe878] shadow-sm"
              : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900"
          }`}
        >
          <Disc3 className="h-3.5 w-3.5" />
          <span>Manage Tracks ({songs.length})</span>
        </button>
      </div>

      {/* Tab 1: Account & Profile */}
      {activeTab === "account" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Live Preview Card */}
          <div className="rounded-[32px] bg-gradient-to-br from-[#19181b] to-[#252428] p-6 text-white shadow-xl lg:col-span-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#dbe878]">
              <Sparkles className="h-3 w-3" />
              Live Identity Preview
            </span>

            <div className="mt-6 flex flex-col items-center text-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-[#dbe878]/30 shadow-xl"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-full bg-[#2a292d] text-2xl font-bold text-[#dbe878] ring-2 ring-white/10">
                  {initials(displayName || user?.email || "U")}
                </div>
              )}

              <h3 className="mt-4 font-serif text-xl font-bold text-white">
                {displayName || "Listener"}
              </h3>
              <p className="text-xs text-zinc-400">{user?.email}</p>
              <span className="mt-3 rounded-full bg-[#dbe878]/20 px-3 py-0.5 text-[10px] font-bold tracking-widest text-[#dbe878]">
                STUDIO MEMBER
              </span>
            </div>

            <div className="mt-8 border-t border-white/10 pt-4 text-xs text-zinc-400">
              <p>Your display name is visible across your profile, now playing, and top bar.</p>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSaveProfile}
            className="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm sm:p-8 lg:col-span-8"
          >
            <h2 className="font-serif text-xl font-bold text-zinc-900">Profile Details</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Changes update immediately across the entire player.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                Display Name
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. The Creator, Miles Davis, etc."
                  className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
                />
              </label>

              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
                Avatar Image URL
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                  className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
                />
              </label>

              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                Registered Email (Read-only)
                <input
                  disabled
                  value={user?.email ?? ""}
                  className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-500 outline-none cursor-not-allowed"
                />
              </label>
            </div>

            {profileSuccess ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">
                <Check className="h-4 w-4" />
                <span>Display name and profile updated successfully!</span>
              </div>
            ) : null}

            {profileError ? (
              <div className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600">
                {profileError}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={profileBusy}
                className="inline-flex items-center gap-2 rounded-full bg-[#19181b] px-6 py-3 text-xs font-bold text-[#dbe878] shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-60"
              >
                {profileBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Profile Changes
              </button>

              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.replace("/login");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Tab 2: Add Track */}
      {activeTab === "add-track" ? (
        <form
          onSubmit={handleSaveTrack}
          className="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="max-w-xl">
            <h2 className="font-serif text-xl font-bold text-zinc-900">Add a Cloudinary Track</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Paste direct audio and artwork HTTPS URLs from Cloudinary or external hosting. Tracks are
              stored directly in your database.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
              Song Title *
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Starboy"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
              />
            </label>

            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
              Artist Name *
              <input
                required
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="e.g. The Weeknd"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
              />
            </label>

            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
              Album Title
              <input
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                placeholder="e.g. Starboy (Deluxe)"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
              />
            </label>

            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600">
              Duration in Seconds
              <input
                type="number"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
                placeholder="e.g. 230"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
              />
            </label>

            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 sm:col-span-2">
              Audio Stream URL *
              <input
                required
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/.../video/upload/....mp3"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
              />
            </label>

            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 sm:col-span-2">
              Artwork Image URL
              <input
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/.../image/upload/....jpg"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
              />
            </label>
          </div>

          {trackStatus ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#dbe878]/30 px-4 py-2.5 text-xs font-semibold text-zinc-900">
              <Check className="h-4 w-4" />
              <span>{trackStatus}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={trackBusy}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#19181b] px-6 py-3 text-xs font-bold text-[#dbe878] shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            {trackBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Add Track to Library
          </button>
        </form>
      ) : null}

      {/* Tab 3: Catalog Track Manager */}
      {activeTab === "catalog" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-zinc-900">Manage Tracks</h2>
              <p className="text-xs text-zinc-500">
                Click the edit button on any track to change metadata, title, artist, audio or cover art.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("add-track")}
              className="inline-flex items-center gap-2 rounded-full bg-[#19181b] px-4 py-2 text-xs font-semibold text-[#dbe878]"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Add Track
            </button>
          </div>

          <div className="rounded-[32px] border border-black/5 bg-white p-4 shadow-sm">
            {songs.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-500">No tracks in library yet.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {songs.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between py-3 px-2 transition hover:bg-zinc-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Cover
                        src={song.cover_url || song.album?.cover_url}
                        title={song.title}
                        className="h-10 w-10 rounded-xl"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-zinc-900">{song.title}</p>
                        <p className="truncate text-[11px] text-zinc-500">
                          {song.artist?.name} {song.album?.title ? `• ${song.album.title}` : ""}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => editSong(song)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-900 hover:text-zinc-900"
                    >
                      <Pencil className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
