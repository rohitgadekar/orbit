"use client";

import { ArtistAvatar } from "@/components/artist-avatar";
import { EditArtistModal } from "@/components/edit-artist-modal";
import { useTrackEditor } from "@/components/app-shell";
import { Cover } from "@/components/cover";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { getIndividualArtists, type ParsedArtist } from "@/lib/artists";
import { formatTime, initials } from "@/lib/utils";
import { getAudioDuration } from "@/lib/audio-duration";
import {
  ArrowRight,
  Check,
  Disc3,
  Layers,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  PlusCircle,
  Search,
  Shield,
  Sparkles,
  Trash2,
  User,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type TrackRowState = {
  id: string;
  title: string;
  audioUrl: string;
  artistName: string;
  durationSeconds: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as
    | "account"
    | "add-album"
    | "add-track"
    | "catalog"
    | "artists"
    | null;

  const { profile, user, updateProfile, signOut, isAdmin, role } = useAuth();
  const { songs, artists, addTrack, addAlbum } = useMusic();
  const { editSong } = useTrackEditor();

  const [activeTab, setActiveTab] = useState<
    "account" | "add-album" | "add-track" | "catalog" | "artists"
  >(isAdmin && requestedTab ? requestedTab : "account");

  const [artistSearch, setArtistSearch] = useState("");
  const [editingArtist, setEditingArtist] = useState<ParsedArtist | null>(null);

  const individualArtists = useMemo(() => getIndividualArtists(songs, artists), [songs, artists]);
  const filteredArtists = useMemo(() => {
    const q = artistSearch.trim().toLowerCase();
    if (!q) return individualArtists;
    return individualArtists.filter((a) => a.name.toLowerCase().includes(q));
  }, [artistSearch, individualArtists]);

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

  // Single Track Form state
  const [title, setTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [trackBusy, setTrackBusy] = useState(false);
  const [trackStatus, setTrackStatus] = useState<string | null>(null);

  // Batch Album Form state
  const [batchAlbumTitle, setBatchAlbumTitle] = useState("");
  const [batchArtistName, setBatchArtistName] = useState("");
  const [batchCoverUrl, setBatchCoverUrl] = useState("");
  const [batchTracks, setBatchTracks] = useState<TrackRowState[]>([
    { id: "1", title: "", audioUrl: "", artistName: "", durationSeconds: "" },
    { id: "2", title: "", audioUrl: "", artistName: "", durationSeconds: "" },
    { id: "3", title: "", audioUrl: "", artistName: "", durationSeconds: "" },
  ]);
  const [albumBusy, setAlbumBusy] = useState(false);
  const [albumStatus, setAlbumStatus] = useState<string | null>(null);
  const [albumCreatedTitle, setAlbumCreatedTitle] = useState<string | null>(null);
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");

  // Duration auto-detect state
  const [detectingSingleDuration, setDetectingSingleDuration] = useState(false);
  const [detectingRowIds, setDetectingRowIds] = useState<Set<string>>(new Set());
  const [batchDetectingAll, setBatchDetectingAll] = useState(false);

  async function autoDetectSingleTrackDuration(urlOverride?: string) {
    const raw = (urlOverride ?? audioUrl).trim();
    const target = raw.replace(/^["']|["']$/g, "").trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) return;
    setDetectingSingleDuration(true);
    try {
      const dur = await getAudioDuration(target);
      if (dur > 0) {
        setDurationSeconds(String(dur));
      }
    } catch (err) {
      console.warn("Failed to auto-detect audio duration:", err);
    } finally {
      setDetectingSingleDuration(false);
    }
  }

  async function detectRowDuration(rowId: string, urlOverride?: string) {
    const raw = (urlOverride ?? "").trim() || (batchTracks.find((r) => r.id === rowId)?.audioUrl ?? "").trim();
    const target = raw.replace(/^["']|["']$/g, "").trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) return;

    setDetectingRowIds((prev) => new Set(prev).add(rowId));
    try {
      const dur = await getAudioDuration(target);
      if (dur > 0) {
        setBatchTracks((prev) =>
          prev.map((r) => (r.id === rowId ? { ...r, durationSeconds: String(dur) } : r)),
        );
      }
    } catch (err) {
      console.warn("Failed to auto-detect row duration:", rowId, err);
    } finally {
      setDetectingRowIds((prev) => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    }
  }

  async function detectAllMissingDurations(rowsToScan?: TrackRowState[]) {
    const currentList = rowsToScan ?? batchTracks;
    const targets = currentList.filter((r) => {
      const clean = r.audioUrl.trim().replace(/^["']|["']$/g, "");
      return (
        (clean.startsWith("http://") || clean.startsWith("https://")) &&
        (!r.durationSeconds || Number(r.durationSeconds) <= 0)
      );
    });
    if (targets.length === 0) return;

    setBatchDetectingAll(true);
    await Promise.allSettled(
      targets.map(async (r) => {
        const clean = r.audioUrl.trim().replace(/^["']|["']$/g, "");
        setDetectingRowIds((prev) => new Set(prev).add(r.id));
        try {
          const dur = await getAudioDuration(clean);
          if (dur > 0) {
            setBatchTracks((prev) =>
              prev.map((item) => (item.id === r.id ? { ...item, durationSeconds: String(dur) } : item)),
            );
          }
        } catch {
          // ignore
        } finally {
          setDetectingRowIds((prev) => {
            const next = new Set(prev);
            next.delete(r.id);
            return next;
          });
        }
      }),
    );
    setBatchDetectingAll(false);
  }

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

  // Batch Album Handlers
  function addTrackRow() {
    setBatchTracks((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        title: "",
        audioUrl: "",
        artistName: "",
        durationSeconds: "",
      },
    ]);
  }

  function addFiveRows() {
    setBatchTracks((prev) => [
      ...prev,
      ...Array.from({ length: 5 }, (_, i) => ({
        id: String(Date.now() + i + Math.random()),
        title: "",
        audioUrl: "",
        artistName: "",
        durationSeconds: "",
      })),
    ]);
  }

  function removeTrackRow(id: string) {
    setBatchTracks((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  function updateTrackRow(
    id: string,
    field: keyof TrackRowState,
    value: string,
  ) {
    setBatchTracks((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
    // NOTE: Auto-detection is intentionally NOT triggered here on every keystroke.
    // Detection is handled by onPaste (immediate full URL) and onBlur (after typing finishes).
  }

  function parseBulkPaste() {
    if (!bulkPasteText.trim()) return;
    const lines = bulkPasteText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const newRows: TrackRowState[] = [];
    for (const line of lines) {
      const parts = line.includes("|")
        ? line.split("|").map((p) => p.trim())
        : line.includes("\t")
        ? line.split("\t").map((p) => p.trim())
        : [line];

      // Remove leading track numbering e.g. "1. ", "01 - "
      let trackTitle = parts[0] || "";
      trackTitle = trackTitle.replace(/^\d+[\.\-\s]+/, "").trim();

      const trackAudioUrl = parts[1] || "";
      const trackArtist = parts[2] || "";
      const trackDur = parts[3] ? String(Number(parts[3]) || "") : "";

      newRows.push({
        id: String(Date.now() + Math.random()),
        title: trackTitle,
        audioUrl: trackAudioUrl,
        artistName: trackArtist,
        durationSeconds: trackDur,
      });
    }

    if (newRows.length > 0) {
      setBatchTracks(newRows);
      setShowBulkPaste(false);
      setBulkPasteText("");
      void detectAllMissingDurations(newRows);
    }
  }

  async function handleSaveBatchAlbum(e: React.FormEvent) {
    e.preventDefault();
    setAlbumBusy(true);
    setAlbumStatus(null);
    setAlbumCreatedTitle(null);

    try {
      const validTracks = batchTracks
        .filter((t) => t.title.trim() && t.audioUrl.trim())
        .map((t) => ({
          title: t.title.trim(),
          audioUrl: t.audioUrl.trim(),
          artistName: t.artistName.trim() || undefined,
          durationSeconds: t.durationSeconds ? Number(t.durationSeconds) : undefined,
        }));

      if (validTracks.length === 0) {
        throw new Error(
          "Please enter at least one track with a valid Title and direct Audio Stream URL.",
        );
      }

      const created = await addAlbum({
        albumTitle: batchAlbumTitle,
        artistName: batchArtistName,
        coverUrl: batchCoverUrl,
        tracks: validTracks,
      });

      setAlbumCreatedTitle(created);
      setAlbumStatus(
        `Album "${created}" with ${validTracks.length} tracks imported successfully!`,
      );

      // Reset form
      setBatchAlbumTitle("");
      setBatchArtistName("");
      setBatchCoverUrl("");
      setBatchTracks([
        { id: "1", title: "", audioUrl: "", artistName: "", durationSeconds: "" },
        { id: "2", title: "", audioUrl: "", artistName: "", durationSeconds: "" },
        { id: "3", title: "", audioUrl: "", artistName: "", durationSeconds: "" },
      ]);
    } catch (err) {
      setAlbumStatus(err instanceof Error ? err.message : "Failed to create album");
    } finally {
      setAlbumBusy(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-500">
          Preferences & Controls
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Settings
        </h1>
      </div>

      {/* Luxury Tabs Bar - Only admin sees catalog & batch album upload tabs */}
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

        {isAdmin ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("add-album")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition ${
                activeTab === "add-album"
                  ? "bg-[#19181b] text-[#dbe878] shadow-sm"
                  : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Add Entire Album (Batch)</span>
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
              <span>Add Single Track</span>
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

            <button
              type="button"
              onClick={() => setActiveTab("artists")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition ${
                activeTab === "artists"
                  ? "bg-[#19181b] text-[#dbe878] shadow-sm"
                  : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900"
              }`}
            >
              <Users2 className="h-3.5 w-3.5" />
              <span>Artist Profiles ({individualArtists.length})</span>
            </button>
          </>
        ) : null}
      </div>

      {/* Tab 1: Account & Profile (Visible to Everyone) */}
      {activeTab === "account" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Live Preview Card */}
          <div className="rounded-[32px] bg-gradient-to-br from-[#19181b] to-[#252428] p-6 text-white shadow-xl lg:col-span-4 flex flex-col justify-between">
            <div>
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
                <p className="text-xs text-zinc-400 font-mono">{user?.email}</p>

                <div className="mt-3 flex items-center gap-1.5 rounded-full bg-[#dbe878]/20 px-3 py-1 text-[10px] font-bold tracking-widest text-[#dbe878]">
                  <Shield className="h-3 w-3" />
                  <span>ROLE: {role.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-4 text-xs text-zinc-400">
              {isAdmin ? (
                <p className="text-emerald-300 font-medium">
                  Administrator role enabled. You have permission to add albums, import tracks, edit metadata, delete tracks, and customize artist profiles.
                </p>
              ) : (
                <p>
                  Listener role active. You can freely explore music, enjoy lossless streaming, and curate your personal playlists.
                </p>
              )}
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSaveProfile}
            className="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm sm:p-8 lg:col-span-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-zinc-900">Profile Details</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Update your display name and avatar image.
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  isAdmin
                    ? "bg-[#19181b] text-[#dbe878]"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {isAdmin ? "Admin Role" : "Listener Role"}
              </span>
            </div>

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

      {/* Tab 2: Add Entire Album (Batch) - Only for Admin */}
      {isAdmin && activeTab === "add-album" ? (
        <form
          onSubmit={handleSaveBatchAlbum}
          className="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm sm:p-8 space-y-8"
        >
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#dbe878]/25 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#576412]">
              <Layers className="h-3.5 w-3.5" />
              <span>Studio Batch Importer</span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-bold text-zinc-900">
              Add Entire Album at Once
            </h2>
            <p className="mt-1 text-xs text-zinc-500 max-w-2xl">
              Specify common album title, artist, and cover artwork once. All tracks will be
              automatically associated with this album and artwork in your library database.
            </p>
          </div>

          {/* Album Information & Cover Live Preview */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Album Title *
                  <input
                    required
                    value={batchAlbumTitle}
                    onChange={(e) => setBatchAlbumTitle(e.target.value)}
                    placeholder="e.g. Random Access Memories"
                    className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
                  />
                </label>

                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Album Artist *
                  <input
                    required
                    value={batchArtistName}
                    onChange={(e) => setBatchArtistName(e.target.value)}
                    placeholder="e.g. Daft Punk"
                    className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
                  />
                </label>
              </div>

              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                Common Cover Artwork Image URL *
                <input
                  required
                  value={batchCoverUrl}
                  onChange={(e) => setBatchCoverUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/.../album_cover.jpg or https://images.unsplash.com/..."
                  className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
                />
                <span className="mt-1 block text-[11px] normal-case font-normal text-zinc-500">
                  This artwork URL will automatically be shared across the album and every track in this batch.
                </span>
              </label>
            </div>

            {/* Live Album Cover Art Preview */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 lg:col-span-4 text-center">
              <Cover
                src={batchCoverUrl}
                title={batchAlbumTitle || "Album Cover"}
                className="h-32 w-32 rounded-2xl shadow-md ring-1 ring-black/10"
              />
              <p className="mt-2.5 font-bold text-xs text-zinc-900 truncate max-w-[200px]">
                {batchAlbumTitle || "Album Title Preview"}
              </p>
              <p className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                {batchArtistName || "Artist Name"}
              </p>
            </div>
          </div>

          {/* Tracks Section Header & Quick-Paste Toggle */}
          <div className="border-t border-zinc-200 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-zinc-900">
                  Album Tracklist ({batchTracks.length} tracks)
                </h3>
                <p className="text-xs text-zinc-500">
                  Add direct audio stream URLs (Cloudinary mp3) for each track on this album.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkPaste(!showBulkPaste)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-900"
                >
                  <span>{showBulkPaste ? "Hide Text Paste" : "Quick Text Paste"}</span>
                </button>
                <button
                  type="button"
                  onClick={addTrackRow}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#19181b] px-3.5 py-1.5 text-xs font-semibold text-[#dbe878] transition hover:scale-105"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Track Row</span>
                </button>
              </div>
            </div>

            {/* Bulk Paste Box (Optional) */}
            {showBulkPaste ? (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
                <p className="text-xs font-bold text-zinc-800">
                  Paste multi-track list (one line per track):
                </p>
                <p className="text-[11px] text-zinc-500">
                  Format: <code className="bg-zinc-200 px-1 py-0.5 rounded">Title | Audio URL | Optional Artist Override | Optional Duration</code>
                </p>
                <textarea
                  rows={4}
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  placeholder={`1. Give Life Back to Music | https://res.cloudinary.com/.../01.mp3 | Daft Punk | 275\n2. The Game of Love | https://res.cloudinary.com/.../02.mp3\n3. Giorgio by Moroder | https://res.cloudinary.com/.../03.mp3`}
                  className="w-full rounded-xl border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-900 outline-none"
                />
                <button
                  type="button"
                  onClick={parseBulkPaste}
                  className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
                >
                  Parse & Fill Table Rows
                </button>
              </div>
            ) : null}

            {/* Track Rows Table */}
            <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[180px]">Track Title *</th>
                    <th className="py-3 px-3 min-w-[260px]">Audio Stream URL *</th>
                    <th className="py-3 px-3 min-w-[160px]">Featured Artist (Optional)</th>
                    <th className="py-3 px-3 w-28">Duration (s)</th>
                    <th className="py-3 px-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {batchTracks.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-zinc-50/70 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-zinc-400 text-center">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          required
                          value={row.title}
                          onChange={(e) => updateTrackRow(row.id, "title", e.target.value)}
                          placeholder={`Track ${idx + 1} title`}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-900"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          required
                          value={row.audioUrl}
                          onChange={(e) => updateTrackRow(row.id, "audioUrl", e.target.value)}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData("text").trim().replace(/^["']|["']$/g, "");
                            if (pasted.startsWith("http://") || pasted.startsWith("https://")) {
                              // Prevent default so we control state; update row state then detect
                              e.preventDefault();
                              setBatchTracks((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, audioUrl: pasted } : r)),
                              );
                              void detectRowDuration(row.id, pasted);
                            }
                          }}
                          onBlur={(e) => {
                            const clean = e.target.value.trim().replace(/^["']|["']$/g, "");
                            if (clean.startsWith("http://") || clean.startsWith("https://")) {
                              void detectRowDuration(row.id, clean);
                            }
                          }}
                          placeholder="https://res.cloudinary.com/.../audio.mp3"
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-900"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          value={row.artistName}
                          onChange={(e) => updateTrackRow(row.id, "artistName", e.target.value)}
                          placeholder={batchArtistName || "Defaults to Album Artist"}
                          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-900"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <input
                            type="number"
                            value={row.durationSeconds}
                            onChange={(e) => updateTrackRow(row.id, "durationSeconds", e.target.value)}
                            placeholder="e.g. 210"
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 pr-7 text-xs font-medium text-zinc-900 outline-none focus:border-zinc-900"
                          />
                          {detectingRowIds.has(row.id) ? (
                            <span className="absolute right-2 top-2.5 text-amber-600">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            </span>
                          ) : row.audioUrl.trim().startsWith("http") ? (
                            <button
                              type="button"
                              onClick={() => void detectRowDuration(row.id)}
                              className="absolute right-2 top-2.5 text-zinc-400 hover:text-amber-600 transition"
                              title="Auto-detect duration from audio URL"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                        {row.durationSeconds && Number(row.durationSeconds) > 0 ? (
                          <span className="mt-0.5 block text-[10px] font-mono text-zinc-500 text-right pr-1">
                            {formatTime(Number(row.durationSeconds))}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeTrackRow(row.id)}
                          className="rounded-full p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Remove row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick row append buttons */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addTrackRow}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-900 transition"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Another Track</span>
                </button>
                <button
                  type="button"
                  onClick={addFiveRows}
                  className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:border-zinc-900 transition"
                >
                  + Add 5 Rows
                </button>
                <button
                  type="button"
                  onClick={() => void detectAllMissingDurations()}
                  disabled={batchDetectingAll}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/80 px-3.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition disabled:opacity-50"
                  title="Auto-detect duration for all tracks from their audio stream URLs"
                >
                  {batchDetectingAll ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 text-amber-600" />
                  )}
                  <span>Auto-Detect Durations</span>
                </button>
              </div>

              <span className="text-xs text-zinc-500 font-medium">
                {batchTracks.filter((t) => t.title.trim() && t.audioUrl.trim()).length} of{" "}
                {batchTracks.length} tracks ready
              </span>
            </div>
          </div>

          {/* Feedback & Submit Button */}
          {albumStatus ? (
            <div className="flex items-center justify-between rounded-xl bg-[#dbe878]/30 px-4 py-3 text-xs font-semibold text-zinc-900">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>{albumStatus}</span>
              </div>
              {albumCreatedTitle ? (
                <Link
                  href={`/albums/${encodeURIComponent(albumCreatedTitle)}`}
                  className="inline-flex items-center gap-1 font-bold underline hover:text-black"
                >
                  <span>View Album Page</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={albumBusy}
              className="inline-flex items-center gap-2 rounded-full bg-[#19181b] px-8 py-3.5 text-xs font-bold text-[#dbe878] shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {albumBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              <span>Import Entire Album ({batchTracks.filter((t) => t.title.trim()).length} tracks)</span>
            </button>
          </div>
        </form>
      ) : null}

      {/* Tab 3: Add Single Cloudinary Track (Only for Admin) */}
      {isAdmin && activeTab === "add-track" ? (
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
              Artist Name(s) *
              <input
                required
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="e.g. Calvin Harris, Ayah Marar"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
              />
              <span className="mt-1 block text-[11px] normal-case font-normal text-zinc-500">
                Multiple artists can be comma-separated (e.g. &ldquo;Calvin Harris, Ayah Marar&rdquo;)
              </span>
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
              <div className="flex items-center justify-between">
                <span>Duration in Seconds</span>
                {durationSeconds && Number(durationSeconds) > 0 ? (
                  <span className="text-[11px] font-mono font-medium text-zinc-500 normal-case">
                    {formatTime(Number(durationSeconds))}
                  </span>
                ) : null}
              </div>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  placeholder="e.g. 230"
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-24 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
                />
                {audioUrl.trim().startsWith("http") ? (
                  <button
                    type="button"
                    onClick={() => void autoDetectSingleTrackDuration()}
                    disabled={detectingSingleDuration}
                    className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 shadow-2xs hover:border-zinc-900 transition disabled:opacity-50"
                    title="Auto-detect duration from audio URL"
                  >
                    {detectingSingleDuration ? (
                      <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                    ) : (
                      <Sparkles className="h-3 w-3 text-amber-600" />
                    )}
                    <span>Auto-detect</span>
                  </button>
                ) : null}
              </div>
            </label>

            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span>Audio Stream URL *</span>
                {detectingSingleDuration ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 lowercase tracking-normal">
                    <Loader2 className="h-3 w-3 animate-spin" /> detecting duration...
                  </span>
                ) : null}
              </div>
              <input
                required
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                onPaste={(e) => {
                  // Use the pasted text directly (state hasn't updated yet at paste time)
                  const pasted = e.clipboardData.getData("text").trim().replace(/^["']|["']$/g, "");
                  if (pasted.startsWith("http://") || pasted.startsWith("https://")) {
                    // Also sync the state with the pasted value immediately
                    e.preventDefault();
                    setAudioUrl(pasted);
                    void autoDetectSingleTrackDuration(pasted);
                  }
                }}
                onBlur={(e) => {
                  const clean = e.target.value.trim().replace(/^["']|["']$/g, "");
                  if (clean.startsWith("http://") || clean.startsWith("https://")) {
                    void autoDetectSingleTrackDuration(clean);
                  }
                }}
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

      {/* Tab 4: Catalog Track Manager (Only for Admin) */}
      {isAdmin && activeTab === "catalog" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-zinc-900">Manage Tracks</h2>
              <p className="text-xs text-zinc-500">
                Click the edit button on any track to change metadata, title, artist, audio or cover art.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("add-album")}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:border-zinc-900"
              >
                <Layers className="h-3.5 w-3.5" />
                Add Album
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("add-track")}
                className="inline-flex items-center gap-2 rounded-full bg-[#19181b] px-4 py-2 text-xs font-semibold text-[#dbe878]"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add Single Track
              </button>
            </div>
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

      {/* Tab 5: Artist Profiles (Only for Admin) */}
      {isAdmin && activeTab === "artists" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-zinc-900">Artist Profiles & Photos</h2>
              <p className="text-xs text-zinc-500">
                Manage profile pictures for all individual artists in your catalog ({individualArtists.length} artists).
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <input
                value={artistSearch}
                onChange={(e) => setArtistSearch(e.target.value)}
                placeholder="Search artists..."
                className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2 pl-9 text-xs font-medium text-zinc-900 outline-none transition focus:border-zinc-900"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            </div>
          </div>

          <div className="rounded-[32px] border border-black/5 bg-white p-6 shadow-sm">
            {filteredArtists.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-500">
                {artistSearch ? `No artists matching "${artistSearch}".` : "No artists in catalog yet."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredArtists.map((artist) => (
                  <div
                    key={artist.name}
                    className="group relative flex flex-col items-center rounded-2xl border border-zinc-200/70 bg-white p-3.5 text-center shadow-2xs transition hover:border-zinc-400 hover:shadow-xs"
                  >
                    {/* Compact Top-Right Edit Button */}
                    <button
                      type="button"
                      onClick={() => setEditingArtist(artist)}
                      className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-[#19181b] hover:text-[#dbe878]"
                      title={`Edit profile picture and bio for ${artist.name}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>

                    <Link
                      href={`/artists/${encodeURIComponent(artist.name)}`}
                      className="flex flex-col items-center focus:outline-none"
                    >
                      <ArtistAvatar
                        name={artist.name}
                        imageUrl={artist.image_url}
                        sizeClassName="w-16 h-16 sm:w-18 sm:h-18"
                      />
                      <p
                        className="mt-2.5 w-full max-w-[120px] truncate px-1 text-xs font-bold text-zinc-900 hover:text-black transition"
                        title={artist.name}
                      >
                        {artist.name}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {artist.songs.length} track{artist.songs.length === 1 ? "" : "s"}
                      </p>
                    </Link>

                    {/* Subtle compact edit trigger */}
                    <button
                      type="button"
                      onClick={() => setEditingArtist(artist)}
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-zinc-50 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600 ring-1 ring-black/5 transition hover:bg-[#19181b] hover:text-[#dbe878]"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Edit Artist Profile Picture Modal */}
      <EditArtistModal
        artist={editingArtist}
        isOpen={Boolean(editingArtist)}
        onClose={() => setEditingArtist(null)}
      />
    </div>
  );
}
