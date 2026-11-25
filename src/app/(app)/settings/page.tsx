"use client";

import { ArtistAvatar } from "@/components/artist-avatar";
import { EditArtistModal } from "@/components/edit-artist-modal";
import { useTrackEditor } from "@/components/app-shell";
import { Cover } from "@/components/cover";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { getIndividualArtists, type ParsedArtist } from "@/lib/artists";
import { formatTime, initials } from "@/lib/utils";
import { detectAudioMetadata } from "@/lib/audio-metadata";
import {
  ArrowRight,
  Check,
  Fingerprint,
  Keyboard,
  KeyRound,
  Loader2,
  LogOut,
  Pencil,
  Play,
  Plus,
  Search,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Volume2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
    | "shortcuts"
    | "add-album"
    | "add-track"
    | "catalog"
    | "artists"
    | null;

  const { profile, user, updateProfile, signOut, isAdmin, role } = useAuth();
  const { songs, artists, addTrack, addAlbum } = useMusic();
  const { editSong } = useTrackEditor();

  const [activeTab, setActiveTab] = useState<
    "account" | "shortcuts" | "add-album" | "add-track" | "catalog" | "artists"
  >(() => {
    if (requestedTab === "shortcuts") return "shortcuts";
    if (isAdmin && requestedTab) return requestedTab;
    return "account";
  });

  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);

  // Platform detection for Mac (⌘) vs Windows/Linux (Ctrl)
  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return true;
    return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
  }, []);

  // Listen to keyboard shortcut presses when on shortcuts tab
  useEffect(() => {
    if (activeTab !== "shortcuts") return;
    const onKeyTest = (e: KeyboardEvent) => {
      const parts: string[] = [];
      if (e.metaKey) parts.push("⌘");
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      if (e.code === "Space") parts.push("Space");
      else if (e.key === "ArrowRight") parts.push("→");
      else if (e.key === "ArrowLeft") parts.push("←");
      else if (e.key === "ArrowUp") parts.push("↑");
      else if (e.key === "ArrowDown") parts.push("↓");
      else if (e.key === "Escape") parts.push("Esc");
      else if (!["Meta", "Control", "Shift", "Alt"].includes(e.key)) {
        parts.push(e.key.toUpperCase());
      }
      setLastKeyPressed(parts.join(" + "));
    };
    window.addEventListener("keydown", onKeyTest);
    return () => window.removeEventListener("keydown", onKeyTest);
  }, [activeTab]);

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

  // Passkeys & Biometric Security state
  type PasskeyItem = {
    id: string;
    friendly_name?: string;
    created_at: string;
    last_used_at?: string;
  };

  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);
  const [passkeyFeedback, setPasskeyFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (activeTab === "account") {
      void loadPasskeys();
    }
  }, [activeTab]);

  async function loadPasskeys() {
    setLoadingPasskeys(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.passkey.list();
      if (!error && Array.isArray(data)) {
        setPasskeys(data as unknown as PasskeyItem[]);
      }
    } catch {
      // Non-fatal
    } finally {
      setLoadingPasskeys(false);
    }
  }

  async function handleRegisterPasskey() {
    setRegisteringPasskey(true);
    setPasskeyFeedback(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.registerPasskey();
      if (error) {
        if (error.message.includes("cancelled") || error.message.includes("abort")) {
          setPasskeyFeedback({ type: "error", message: "Passkey setup was cancelled." });
        } else {
          setPasskeyFeedback({ type: "error", message: error.message || "Failed to register passkey." });
        }
        return;
      }
      setPasskeyFeedback({
        type: "success",
        message: "Passkey registered successfully! You can now sign in with Touch ID / Face ID.",
      });
      void loadPasskeys();
    } catch (err: unknown) {
      setPasskeyFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Passkey registration failed",
      });
    } finally {
      setRegisteringPasskey(false);
    }
  }

  async function handleDeletePasskey(id: string) {
    try {
      const supabase = createClient();
      await supabase.auth.passkey.delete({ passkeyId: id });
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      setPasskeyFeedback({ type: "success", message: "Passkey removed." });
    } catch {
      setPasskeyFeedback({ type: "error", message: "Failed to delete passkey." });
    }
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

  // Metadata auto-detect state
  const [detectingSingleMetadata, setDetectingSingleMetadata] = useState(false);
  const [detectingRowIds, setDetectingRowIds] = useState<Set<string>>(new Set());
  const [batchDetectingAll, setBatchDetectingAll] = useState(false);

  async function autoDetectSingleTrackMetadata(urlOverride?: string, forceOverwrite = false) {
    const raw = (urlOverride ?? audioUrl).trim();
    const target = raw.replace(/^["']|["']$/g, "").trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) return;
    setDetectingSingleMetadata(true);
    try {
      const meta = await detectAudioMetadata(target);
      if (meta.title && (forceOverwrite || !title.trim())) {
        setTitle(meta.title);
      }
      if (meta.artist && (forceOverwrite || !artistName.trim())) {
        setArtistName(meta.artist);
      }
      if (meta.album && (forceOverwrite || !albumTitle.trim())) {
        setAlbumTitle(meta.album);
      }
      if (meta.duration && (forceOverwrite || !durationSeconds.trim() || durationSeconds === "0")) {
        setDurationSeconds(String(meta.duration));
      }
      if (meta.coverUrl && (forceOverwrite || !coverUrl.trim())) {
        setCoverUrl(meta.coverUrl);
      }
      if (meta.title || meta.artist) {
        setTrackStatus(
          `Detected: ${meta.title ? `"${meta.title}"` : ""}${meta.artist ? ` by ${meta.artist}` : ""}${meta.album ? ` (${meta.album})` : ""}`,
        );
        setTimeout(() => setTrackStatus(null), 4500);
      }
    } catch (err) {
      console.warn("Failed to auto-detect track metadata:", err);
    } finally {
      setDetectingSingleMetadata(false);
    }
  }

  // Alias for backward compatibility if called from duration button
  async function autoDetectSingleTrackDuration(urlOverride?: string) {
    return autoDetectSingleTrackMetadata(urlOverride, false);
  }

  async function detectRowMetadata(rowId: string, urlOverride?: string, forceOverwrite = false) {
    const raw = (urlOverride ?? "").trim() || (batchTracks.find((r) => r.id === rowId)?.audioUrl ?? "").trim();
    const target = raw.replace(/^["']|["']$/g, "").trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) return;

    setDetectingRowIds((prev) => new Set(prev).add(rowId));
    try {
      const meta = await detectAudioMetadata(target);
      setBatchTracks((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          return {
            ...r,
            title: meta.title && (forceOverwrite || !r.title.trim()) ? meta.title : r.title,
            artistName: meta.artist && (forceOverwrite || !r.artistName.trim()) ? meta.artist : r.artistName,
            durationSeconds:
              meta.duration && (forceOverwrite || !r.durationSeconds.trim() || r.durationSeconds === "0")
                ? String(meta.duration)
                : r.durationSeconds,
          };
        }),
      );

      // Auto-populate album fields if they are still empty
      if (meta.album && !batchAlbumTitle.trim()) {
        setBatchAlbumTitle(meta.album);
      }
      if (meta.artist && !batchArtistName.trim()) {
        setBatchArtistName(meta.artist);
      }
      if (meta.coverUrl && !batchCoverUrl.trim()) {
        setBatchCoverUrl(meta.coverUrl);
      }
    } catch (err) {
      console.warn("Failed to auto-detect row metadata:", rowId, err);
    } finally {
      setDetectingRowIds((prev) => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    }
  }

  async function detectAllMissingMetadata(rowsToScan?: TrackRowState[]) {
    const currentList = rowsToScan ?? batchTracks;
    const targets = currentList.filter((r) => {
      const clean = r.audioUrl.trim().replace(/^["']|["']$/g, "");
      return (
        (clean.startsWith("http://") || clean.startsWith("https://")) &&
        (!r.title.trim() || !r.artistName.trim() || !r.durationSeconds || Number(r.durationSeconds) <= 0)
      );
    });
    if (targets.length === 0) return;

    setBatchDetectingAll(true);
    await Promise.allSettled(
      targets.map(async (r) => {
        const clean = r.audioUrl.trim().replace(/^["']|["']$/g, "");
        await detectRowMetadata(r.id, clean);
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

      let trackTitle = "";
      let trackAudioUrl = "";
      let trackArtist = "";
      let trackDur = "";

      if (parts.length === 1) {
        const single = parts[0].trim();
        if (single.startsWith("http://") || single.startsWith("https://")) {
          trackAudioUrl = single;
        } else {
          trackTitle = single.replace(/^\d+[\.\-\s]+/, "").trim();
        }
      } else {
        trackTitle = (parts[0] || "").replace(/^\d+[\.\-\s]+/, "").trim();
        trackAudioUrl = parts[1] || "";
        trackArtist = parts[2] || "";
        trackDur = parts[3] ? String(Number(parts[3]) || "") : "";
      }

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
      void detectAllMissingMetadata(newRows);
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
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Settings
        </h1>
      </div>

      {/* Luxury Tabs Bar - Only admin sees catalog & batch album upload tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("account")}
          className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition ${activeTab === "account"
            ? "bg-blue-500 text-white shadow-sm"
            : "bg-[#222224] text-zinc-400 hover:bg-[#2c2c2f] hover:text-white"
            }`}
        >
          <span>Account & Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shortcuts")}
          className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition ${activeTab === "shortcuts"
            ? "bg-blue-500 text-white shadow-sm"
            : "bg-[#222224] text-zinc-400 hover:bg-[#2c2c2f] hover:text-white"
            }`}
        >
          <Keyboard className="h-3.5 w-3.5" />
          <span>Keyboard Shortcuts</span>
        </button>

        {isAdmin ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("add-album")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition ${activeTab === "add-album"
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-[#222224] text-zinc-400 hover:bg-[#2c2c2f] hover:text-white"
                }`}
            >
              <span>Add Album</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("add-track")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition ${activeTab === "add-track"
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-[#222224] text-zinc-400 hover:bg-[#2c2c2f] hover:text-white"
                }`}
            >
              <span>Add Single Track</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition ${activeTab === "catalog"
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-[#222224] text-zinc-400 hover:bg-[#2c2c2f] hover:text-white"
                }`}
            >
              <span>Manage Tracks ({songs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("artists")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition ${activeTab === "artists"
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-[#222224] text-zinc-400 hover:bg-[#2c2c2f] hover:text-white"
                }`}
            >
              <span>Artist Profiles ({individualArtists.length})</span>
            </button>
          </>
        ) : null}
      </div>

      {/* Tab 1: Account & Profile (Visible to Everyone) */}
      {activeTab === "account" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Live Preview Card */}
          <div className="rounded-[36px] border border-white/5 bg-gradient-to-br from-[#19181b] via-[#242228] to-[#121114] p-6 text-white shadow-xl lg:col-span-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-blue-400">Preview</span>

              <div className="mt-6 flex flex-col items-center text-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-white/10 shadow-xl"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-[#2c2c2f] text-2xl font-bold text-white ring-2 ring-white/10">
                    {initials(displayName || user?.email || "U")}
                  </div>
                )}

                <h3 className="mt-4 text-xl font-bold text-white">
                  {displayName || "Listener"}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">{user?.email}</p>

                <div className="mt-3 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold capitalize text-blue-400">{role}</div>
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-4 text-xs text-zinc-400">
              {isAdmin ? (
                <p className="font-medium">
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
            className="rounded-[36px] border border-white/5 bg-[#222224] p-6 sm:p-8 lg:col-span-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white">Profile Details</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Update your display name and avatar image.
                </p>
              </div>

              <span className={`rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ${isAdmin ? "text-blue-400" : "text-zinc-300"}`}>
                {isAdmin ? "Administrator" : "Listener"}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-xs font-semibold text-zinc-400">
                Display Name
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. The Creator, Miles Davis, etc."
                  className="mt-1.5 w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
                />
              </label>

              <label className="block text-xs font-semibold text-zinc-400">
                Avatar Image URL
                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                  className="mt-1.5 w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
                />
              </label>

              <label className="block text-xs font-semibold text-zinc-400">
                Registered Email (Read-only)
                <input
                  disabled
                  value={user?.email ?? ""}
                  className="mt-1.5 w-full rounded-full border border-white/5 bg-[#1a1a1c]/50 px-5 py-3 text-sm font-medium text-zinc-500 outline-none cursor-not-allowed"
                />
              </label>
            </div>

            {profileSuccess ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-400">
                <Check className="h-4 w-4" />
                <span>Display name and profile updated successfully!</span>
              </div>
            ) : null}

            {profileError ? (
              <div className="mt-4 rounded-xl bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-400">
                {profileError}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={profileBusy}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-xs font-bold text-black shadow-md transition hover:bg-blue-500 active:scale-95 disabled:opacity-50"
              >
                {profileBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Changes
              </button>

              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.replace("/login");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-white/30 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </form>

          {/* Passkeys & Biometric Security Card */}
          <div className="rounded-[36px] border border-white/5 bg-[#222224] p-6 sm:p-8 lg:col-span-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
                  <Fingerprint className="h-3.5 w-3.5" />
                  <span>Passkey Biometric Security</span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-white">Registered Passkeys</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Authenticate instantly with Touch ID, Face ID, or Windows Hello. No passwords required.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRegisterPasskey}
                disabled={registeringPasskey}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-bold text-black  transition hover:bg-blue-500 active:scale-95 disabled:opacity-50"
              >
                {registeringPasskey ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Register Passkey</span>
              </button>
            </div>

            {passkeyFeedback && (
              <div
                className={`mt-4 rounded-xl p-3 text-xs font-semibold ${passkeyFeedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-rose-500/10 text-rose-400"
                  }`}
              >
                {passkeyFeedback.message}
              </div>
            )}

            <div className="mt-6 space-y-3">
              {loadingPasskeys ? (
                <div className="flex items-center gap-2 py-4 text-xs text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span>Loading registered passkeys...</span>
                </div>
              ) : passkeys.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
                  <KeyRound className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                  <p className="font-semibold text-zinc-400">No passkeys registered yet</p>
                  <p className="mt-1">
                    Click &ldquo;Register Device Passkey&rdquo; above to link your Touch ID, Face ID, or security key.
                  </p>
                </div>
              ) : (
                passkeys.map((pk) => (
                  <div
                    key={pk.id}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#1a1a1c] p-4 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-blue-400">
                        <Fingerprint className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white">
                          {pk.friendly_name || "Biometric Passkey"}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Added: {new Date(pk.created_at).toLocaleDateString()}
                          {pk.last_used_at &&
                            ` • Last used: ${new Date(pk.last_used_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePasskey(pk.id)}
                      className="rounded-full p-2 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                      title="Delete Passkey"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab: Keyboard Shortcuts */}
      {activeTab === "shortcuts" ? (
        <div className="space-y-6">
          {/* Header banner */}
          <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-gradient-to-br from-[#1d1b22] via-[#222127] to-[#161519] p-6 sm:p-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
                <Keyboard className="h-3.5 w-3.5" />
                <span>Productivity & Control</span>
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Keyboard Shortcuts
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                Control playback, scrub tracks, and navigate your Velar library without leaving your keyboard.
                Shortcuts are enabled anywhere on desktop when you are not typing into a search or text field.
              </p>
            </div>

            {/* Interactive Key Detection Badge */}
            <div className="mt-6 flex flex-wrap items-center gap-3 pt-2">
              <span className="text-xs font-semibold text-zinc-500">Live Key Press Test:</span>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-mono font-bold text-white shadow-inner">
                {lastKeyPressed ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
                    <span>{lastKeyPressed}</span>
                  </>
                ) : (
                  <span className="text-zinc-500 font-sans font-normal">Press any key to test</span>
                )}
              </div>
            </div>
          </div>

          {/* Shortcuts Grid: Categorized */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Category 1: Playback Controls */}
            <div className="rounded-[28px] border border-white/5 bg-[#201f24] p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-blue-400">
                <Play className="h-4 w-4 fill-current" />
                <h3 className="text-sm font-bold tracking-tight text-white">Playback & Scrubbing</h3>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-bold text-white">Play / Pause</p>
                    <p className="text-[11px] text-zinc-500">Toggle active track</p>
                  </div>
                  <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold font-mono text-zinc-200 shadow-sm">
                    Space
                  </kbd>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-bold text-white">Next Track</p>
                    <p className="text-[11px] text-zinc-500">Skip forward in queue</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold font-mono text-zinc-200">
                      Shift
                    </kbd>
                    <span className="text-xs text-zinc-500">+</span>
                    <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold font-mono text-zinc-200">
                      →
                    </kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-bold text-white">Previous Track</p>
                    <p className="text-[11px] text-zinc-500">Restart or go to previous</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold font-mono text-zinc-200">
                      Shift
                    </kbd>
                    <span className="text-xs text-zinc-500">+</span>
                    <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold font-mono text-zinc-200">
                      ←
                    </kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-bold text-white">Seek ±5 Seconds</p>
                    <p className="text-[11px] text-zinc-500">Jump forward or back</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold font-mono text-zinc-200">
                      ←
                    </kbd>
                    <span className="text-xs text-zinc-500">/</span>
                    <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold font-mono text-zinc-200">
                      →
                    </kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Category 2: Audio Modes & Controls */}
            <div className="rounded-[28px] border border-white/5 bg-[#201f24] p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-blue-400">
                <Volume2 className="h-4 w-4" />
                <h3 className="text-sm font-bold tracking-tight text-white">Modes & Audio</h3>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-bold text-white">Mute / Unmute</p>
                    <p className="text-[11px] text-zinc-500">Silences and remembers volume</p>
                  </div>
                  <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold font-mono text-zinc-200 shadow-sm">
                    M
                  </kbd>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-bold text-white">Shuffle Mode</p>
                    <p className="text-[11px] text-zinc-500">Randomize queue order</p>
                  </div>
                  <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold font-mono text-zinc-200 shadow-sm">
                    S
                  </kbd>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-bold text-white">Cycle Repeat</p>
                    <p className="text-[11px] text-zinc-500">Off → All → Repeat One</p>
                  </div>
                  <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold font-mono text-zinc-200 shadow-sm">
                    R
                  </kbd>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-bold text-white">Toggle Fullscreen</p>
                    <p className="text-[11px] text-zinc-500">Immersive vinyl & lyrics player</p>
                  </div>
                  <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold font-mono text-zinc-200 shadow-sm">
                    F
                  </kbd>
                </div>
              </div>
            </div>

            {/* Category 3: Navigation & Commands */}
            <div className="rounded-[28px] border border-white/5 bg-[#201f24] p-5 sm:p-6 space-y-4 md:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 text-blue-400">
                <Search className="h-4 w-4" />
                <h3 className="text-sm font-bold tracking-tight text-white">Navigation & Search</h3>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-bold text-white">Quick Search</p>
                    <p className="text-[11px] text-zinc-500">Command palette for library</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold font-mono text-zinc-200">
                      {isMac ? "⌘" : "Ctrl"}
                    </kbd>
                    <span className="text-xs text-zinc-500">+</span>
                    <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-xs font-bold font-mono text-zinc-200">
                      K
                    </kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3 border border-white/[0.04]">
                  <div>
                    <p className="text-xs font-bold text-white">Dismiss / Close</p>
                    <p className="text-[11px] text-zinc-500">Close modals or fullscreen</p>
                  </div>
                  <kbd className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold font-mono text-zinc-200 shadow-sm">
                    Esc
                  </kbd>
                </div>

                <div className="rounded-2xl border border-blue-500/10 bg-blue-500/5 p-3.5">
                  <p className="text-xs font-bold text-blue-300">Pro Tip</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Press <kbd className="rounded border border-white/10 bg-white/5 px-1 font-mono text-[10px] text-zinc-300">F</kbd> anytime a song is playing to enter the cinema-grade full-screen player with live synced lyrics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab 2: Add Entire Album (Batch) - Only for Admin */}
      {isAdmin && activeTab === "add-album" ? (
        <form
          onSubmit={handleSaveBatchAlbum}
          className="rounded-[36px] border border-white/5 bg-[#222224] p-6 sm:p-8 space-y-8"
        >
          <div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
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
                <label className="block text-xs font-semibold text-zinc-400">
                  Album Title *
                  <input
                    required
                    value={batchAlbumTitle}
                    onChange={(e) => setBatchAlbumTitle(e.target.value)}
                    placeholder="e.g. Random Access Memories"
                    className="mt-1.5 w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
                  />
                </label>

                <label className="block text-xs font-semibold text-zinc-400">
                  Album Artist *
                  <input
                    required
                    value={batchArtistName}
                    onChange={(e) => setBatchArtistName(e.target.value)}
                    placeholder="e.g. Daft Punk"
                    className="mt-1.5 w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
                  />
                </label>
              </div>

              <label className="block text-xs font-semibold text-zinc-400">
                Common Cover Artwork Image URL *
                <input
                  required
                  value={batchCoverUrl}
                  onChange={(e) => setBatchCoverUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/.../album_cover.jpg or https://images.unsplash.com/..."
                  className="mt-1.5 w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
                />
                <span className="mt-1 block text-[11px] normal-case font-normal text-zinc-500">
                  This artwork URL will automatically be shared across the album and every track in this batch.
                </span>
              </label>
            </div>

            {/* Live Album Cover Art Preview */}
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-white/5 bg-[#1a1a1c] p-4 lg:col-span-4 text-center">
              <Cover
                src={batchCoverUrl}
                title={batchAlbumTitle || "Album Cover"}
                className="h-32 w-32 rounded-2xl shadow-md ring-1 ring-white/10"
              />
              <p className="mt-2.5 font-bold text-xs text-white truncate max-w-[200px]">
                {batchAlbumTitle || "Album Title Preview"}
              </p>
              <p className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                {batchArtistName || "Artist Name"}
              </p>
            </div>
          </div>

          {/* Tracks Section Header & Quick-Paste Toggle */}
          <div className="border-t border-white/10 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Album Tracklist ({batchTracks.length} tracks)
                </h3>
                <p className="text-xs text-zinc-500">
                  Add direct audio stream URLs (Cloudinary mp3) for each track on this album.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void detectAllMissingMetadata()}
                  disabled={batchDetectingAll}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#2c2c2f] px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-white/30 disabled:opacity-50"
                  title="Auto-detect title, artist, and duration for all tracks"
                >
                  {batchDetectingAll ? (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                  ) : (
                    <RefreshCw className="h-3 w-3 text-blue-400" />
                  )}
                  <span>{batchDetectingAll ? "Detecting..." : "Fetch"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkPaste(!showBulkPaste)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#2c2c2f] px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-white/30"
                >
                  <span>{showBulkPaste ? "Hide Text Paste" : "Quick Text Paste"}</span>
                </button>
                <button
                  type="button"
                  onClick={addTrackRow}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:scale-105"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Track Row</span>
                </button>
              </div>
            </div>

            {/* Bulk Paste Box (Optional) */}
            {showBulkPaste ? (
              <div className="mt-4 rounded-2xl border border-white/5 bg-[#1a1a1c] p-4 space-y-2">
                <p className="text-xs font-bold text-zinc-200">
                  Paste multi-track list (one line per track):
                </p>
                <p className="text-[11px] text-zinc-500">
                  Format: <code className="bg-white/10 text-zinc-200 px-1 py-0.5 rounded">Audio Stream URL</code> OR <code className="bg-white/10 text-zinc-200 px-1 py-0.5 rounded">Title | Audio URL | Optional Artist Override | Optional Duration</code>
                </p>
                <textarea
                  rows={4}
                  value={bulkPasteText}
                  onChange={(e) => setBulkPasteText(e.target.value)}
                  placeholder={`https://res.cloudinary.com/.../01%20-%20God's%20Plan.mp3\nhttps://res.cloudinary.com/.../02%20-%20Poetic%20Justice%20ft.%20Kendrick%20Lamar.mp3`}
                  className="w-full rounded-xl border border-white/10 bg-[#222224] p-3 font-mono text-xs text-white outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={parseBulkPaste}
                  className="rounded-full bg-blue-500 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-blue-400"
                >
                  Parse & Auto-Fill Tracks
                </button>
              </div>
            ) : null}

            {/* Track Rows Table */}
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/5 bg-[#1a1a1c]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/5 bg-white/[0.03] text-zinc-400 font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[180px]">Track Title *</th>
                    <th className="py-3 px-3 min-w-[260px]">Audio Stream URL *</th>
                    <th className="py-3 px-3 min-w-[160px]">Featured Artist (Optional)</th>
                    <th className="py-3 px-3 w-28">Duration (s)</th>
                    <th className="py-3 px-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {batchTracks.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-white/[0.03] transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-zinc-400 text-center">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          required
                          value={row.title}
                          onChange={(e) => updateTrackRow(row.id, "title", e.target.value)}
                          placeholder={`Track ${idx + 1} title`}
                          className="w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 py-2 text-xs font-medium text-white outline-none placeholder:text-zinc-400 focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <input
                            required
                            value={row.audioUrl}
                            onChange={(e) => updateTrackRow(row.id, "audioUrl", e.target.value)}
                            onPaste={(e) => {
                              const pasted = e.clipboardData.getData("text").trim().replace(/^["']|["']$/g, "");
                              if (pasted.startsWith("http://") || pasted.startsWith("https://")) {
                                e.preventDefault();
                                setBatchTracks((prev) =>
                                  prev.map((r) => (r.id === row.id ? { ...r, audioUrl: pasted } : r)),
                                );
                                void detectRowMetadata(row.id, pasted);
                              }
                            }}
                            onBlur={(e) => {
                              const clean = e.target.value.trim().replace(/^["']|["']$/g, "");
                              if (clean.startsWith("http://") || clean.startsWith("https://")) {
                                void detectRowMetadata(row.id, clean);
                              }
                            }}
                            placeholder="https://res.cloudinary.com/.../audio.mp3"
                            className="w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 py-2 pr-7 text-xs font-medium text-white outline-none placeholder:text-zinc-400 focus:border-blue-500"
                          />
                          {detectingRowIds.has(row.id) ? (
                            <span className="absolute right-2 top-2.5 text-blue-400" title="Detecting track metadata...">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            </span>
                          ) : row.audioUrl.trim().startsWith("http") ? (
                            <button
                              type="button"
                              onClick={() => void detectRowMetadata(row.id, undefined, true)}
                              className="absolute right-2 top-2.5 text-zinc-400 hover:text-blue-400 transition"
                              title="Auto-detect title, artist, and duration from audio URL"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          value={row.artistName}
                          onChange={(e) => updateTrackRow(row.id, "artistName", e.target.value)}
                          placeholder={batchArtistName || "Defaults to Album Artist"}
                          className="w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 py-2 text-xs font-medium text-white outline-none placeholder:text-zinc-400 focus:border-blue-500"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <input
                            type="number"
                            value={row.durationSeconds}
                            onChange={(e) => updateTrackRow(row.id, "durationSeconds", e.target.value)}
                            placeholder="e.g. 210"
                            className="w-full rounded-xl border border-white/10 bg-[#1a1a1c] px-3 py-2 text-xs font-medium text-white outline-none placeholder:text-zinc-400 focus:border-blue-500"
                          />
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
                          className="rounded-full p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 transition"
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
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#2c2c2f] px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-white/30 transition"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Another Track</span>
                </button>
                <button
                  type="button"
                  onClick={addFiveRows}
                  className="rounded-full border border-white/10 bg-[#2c2c2f] px-3.5 py-1.5 text-xs font-semibold text-zinc-400 hover:border-white/30 transition"
                >
                  + Add 5 Rows
                </button>
                <button
                  type="button"
                  onClick={() => void detectAllMissingMetadata()}
                  disabled={batchDetectingAll}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#2c2c2f] px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:border-white/30 hover:text-white transition disabled:opacity-50"
                  title="Auto-detect titles, artists, and duration for all tracks"
                >
                  {batchDetectingAll ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 text-blue-400" />
                  )}
                  <span>Auto-Detect All Details</span>
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
            <div className="flex items-center justify-between rounded-xl bg-blue-500/10 px-4 py-3 text-xs font-semibold text-blue-300">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>{albumStatus}</span>
              </div>
              {albumCreatedTitle ? (
                <Link
                  href={`/albums/${encodeURIComponent(albumCreatedTitle)}`}
                  className="inline-flex items-center gap-1 font-bold underline hover:text-white"
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
              className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-8 py-3.5 text-xs font-bold text-white shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              {albumBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Import Entire Album ({batchTracks.filter((t) => t.title.trim()).length} tracks)</span>
            </button>
          </div>
        </form>
      ) : null}

      {/* Tab 3: Add Single Cloudinary Track (Only for Admin) */}
      {isAdmin && activeTab === "add-track" ? (
        <form
          onSubmit={handleSaveTrack}
          className="rounded-[36px] border border-white/5 bg-[#222224] p-6 sm:p-8"
        >
          <div className="max-w-xl">
            <h2 className="text-lg font-bold tracking-tight text-white">Add a Cloudinary Track</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Paste direct audio and artwork HTTPS URLs from Cloudinary or external hosting. Tracks are
              stored directly in your database.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-zinc-400">
              Song Title *
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Starboy"
                className="mt-1.5 w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
              />
            </label>

            <label className="block text-xs font-semibold text-zinc-400">
              Artist Name(s) *
              <input
                required
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="e.g. Calvin Harris, Ayah Marar"
                className="mt-1.5 w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
              />
              <span className="mt-1 block text-[11px] normal-case font-normal text-zinc-500">
                Multiple artists can be comma-separated (e.g. &ldquo;Calvin Harris, Ayah Marar&rdquo;)
              </span>
            </label>

            <label className="block text-xs font-semibold text-zinc-400">
              Album Title
              <input
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                placeholder="e.g. Starboy (Deluxe)"
                className="mt-1.5 w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
              />
            </label>

            <label className="block text-xs font-semibold text-zinc-400">
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
                  className="w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 pr-24 text-sm font-medium text-white outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
                />
                {audioUrl.trim().startsWith("http") ? (
                  <button
                    type="button"
                    onClick={() => void autoDetectSingleTrackMetadata(undefined, true)}
                    disabled={detectingSingleMetadata}
                    className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#2c2c2f] px-2.5 py-1 text-[11px] font-semibold text-zinc-200 hover:border-white/30 transition disabled:opacity-50"
                    title="Auto-detect song details from audio URL"
                  >
                    {detectingSingleMetadata ? (
                      <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                    ) : (
                      <RefreshCw className="h-3 w-3 text-blue-400" />
                    )}
                    <span>Auto-detect</span>
                  </button>
                ) : null}
              </div>
            </label>

            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span>Audio Stream URL *</span>
                {detectingSingleMetadata ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 lowercase tracking-normal">
                    <Loader2 className="h-3 w-3 animate-spin" /> detecting metadata & duration...
                  </span>
                ) : audioUrl.trim().startsWith("http") ? (
                  <button
                    type="button"
                    onClick={() => void autoDetectSingleTrackMetadata(undefined, true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 lowercase tracking-normal hover:text-blue-300 transition"
                  >
                    <RefreshCw className="h-3 w-3" /> re-detect all
                  </button>
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
                    e.preventDefault();
                    setAudioUrl(pasted);
                    void autoDetectSingleTrackMetadata(pasted);
                  }
                }}
                onBlur={(e) => {
                  const clean = e.target.value.trim().replace(/^["']|["']$/g, "");
                  if (clean.startsWith("http://") || clean.startsWith("https://")) {
                    void autoDetectSingleTrackMetadata(clean);
                  }
                }}
                placeholder="https://res.cloudinary.com/.../video/upload/....mp3"
                className="mt-1.5 w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
              />
            </label>

            <label className="block text-xs font-semibold text-zinc-400 sm:col-span-2">
              Artwork Image URL
              <input
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/.../image/upload/....jpg"
                className="mt-1.5 w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-400 focus:border-blue-500"
              />
            </label>
          </div>

          {trackStatus ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-500/10 px-4 py-2.5 text-xs font-semibold text-blue-300">
              <Check className="h-4 w-4" />
              <span>{trackStatus}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={trackBusy}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-3 text-xs font-bold text-white shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-60"
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
              <h2 className="text-lg font-bold tracking-tight text-white">Manage Tracks</h2>
              <p className="text-xs text-zinc-500">
                Click the edit button on any track to change metadata, title, artist, audio or cover art.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("add-album")}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#2c2c2f] px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:border-white/30"
              >
                Add Album
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("add-track")}
                className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-xs font-semibold text-white"
              >
                Add Single Track
              </button>
            </div>
          </div>

          <div className="rounded-[36px] border border-white/5 bg-[#222224] p-4">
            {songs.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-500">No tracks in library yet.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {songs.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between py-3 px-2 transition hover:bg-white/[0.04] rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Cover
                        src={song.cover_url || song.album?.cover_url}
                        title={song.title}
                        className="h-10 w-10 rounded-xl"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white">{song.title}</p>
                        <p className="truncate text-[11px] text-zinc-500">
                          {song.artist?.name} {song.album?.title ? `• ${song.album.title}` : ""}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => editSong(song)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-white/30 hover:text-white"
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
              <h2 className="text-lg font-bold tracking-tight text-white">Artist Profiles & Photos</h2>
              <p className="text-xs text-zinc-500">
                Manage profile pictures for all individual artists in your catalog ({individualArtists.length} artists).
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <input
                value={artistSearch}
                onChange={(e) => setArtistSearch(e.target.value)}
                placeholder="Search artists..."
                className="w-full rounded-full border border-white/10 bg-[#2c2c2f] px-4 py-2 pl-9 text-xs font-medium text-white outline-none transition focus:border-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            </div>
          </div>

          <div className="rounded-[36px] border border-white/5 bg-[#222224] p-6">
            {filteredArtists.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-500">
                {artistSearch ? `No artists matching "${artistSearch}".` : "No artists in catalog yet."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredArtists.map((artist) => (
                  <div
                    key={artist.name}
                    className="group relative flex flex-col items-center rounded-[28px] border border-white/5 bg-[#1a1a1c] p-3.5 text-center transition hover:border-white/15 hover:bg-[#262628]"
                  >
                    {/* Compact Top-Right Edit Button */}
                    <button
                      type="button"
                      onClick={() => setEditingArtist(artist)}
                      className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-white/10 text-zinc-300 transition hover:bg-blue-500 hover:text-white"
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
                        className="mt-2.5 w-full max-w-[120px] truncate px-1 text-xs font-bold text-white hover:text-white transition"
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
                      className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-300 transition hover:bg-blue-500 hover:text-white"
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