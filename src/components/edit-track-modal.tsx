"use client";

import { Cover } from "@/components/cover";
import { useMusic } from "@/context/music-context";
import { getAudioDuration } from "@/lib/audio-duration";
import { detectAudioMetadata } from "@/lib/audio-metadata";
import type { Song } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { Check, Droplet, Loader2, Trash2, X } from "lucide-react";
import { useState } from "react";

export function EditTrackModal({
  song,
  isOpen,
  onClose,
}: {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !song) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <EditTrackForm key={song.id} song={song} onClose={onClose} />
    </div>
  );
}

function EditTrackForm({
  song,
  onClose,
}: {
  song: Song;
  onClose: () => void;
}) {
  const { updateTrack, deleteTrack } = useMusic();
  const [title, setTitle] = useState(song.title ?? "");
  const [artistName, setArtistName] = useState(song.artist?.name ?? "");
  const [albumTitle, setAlbumTitle] = useState(song.album?.title ?? "");
  const [audioUrl, setAudioUrl] = useState(song.audio_url ?? "");
  const [coverUrl, setCoverUrl] = useState(song.cover_url ?? "");
  const [durationSeconds, setDurationSeconds] = useState(
    song.duration_seconds ? String(song.duration_seconds) : "",
  );
  const [detectingMetadata, setDetectingMetadata] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function autoDetectMetadata(urlOverride?: string, forceOverwrite = false) {
    const target = (urlOverride ?? audioUrl).trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) return;
    setDetectingMetadata(true);
    try {
      const meta = await detectAudioMetadata(target);
      if (meta.title && (forceOverwrite || !title.trim())) setTitle(meta.title);
      if (meta.artist && (forceOverwrite || !artistName.trim())) setArtistName(meta.artist);
      if (meta.album && (forceOverwrite || !albumTitle.trim())) setAlbumTitle(meta.album);
      if (meta.duration && (forceOverwrite || !durationSeconds || durationSeconds === "0")) {
        setDurationSeconds(String(meta.duration));
      }
      if (meta.coverUrl && (forceOverwrite || !coverUrl.trim())) setCoverUrl(meta.coverUrl);
      if (meta.title || meta.artist) {
        setStatus(`✨ Detected: ${meta.title ? `"${meta.title}"` : ""}${meta.artist ? ` by ${meta.artist}` : ""}`);
        setTimeout(() => setStatus(null), 3500);
      }
    } catch {
      // Ignored
    } finally {
      setDetectingMetadata(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await updateTrack(song.id, {
        title,
        artistName,
        albumTitle,
        audioUrl,
        coverUrl,
        durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
      });
      setStatus("Track updated successfully!");
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to update track");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${song.title}" from your library?`)) return;
    setDeleting(true);
    try {
      await deleteTrack(song.id);
      onClose();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to delete track");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="no-scrollbar relative max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/5 bg-[#222224] p-5 text-white shadow-2xl sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-blue-400">Catalog Editor</p>
          <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
            Edit Track Details
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 border-t border-white/5 pt-5">
        <div className="grid gap-5 sm:grid-cols-[176px_1fr] sm:gap-6">
          {/* Left: artwork preview + cover URL */}
          <div className="flex items-start gap-4 sm:flex-col sm:gap-3">
            <Cover
              src={coverUrl || song.cover_url || song.album?.cover_url}
              title={title || "Track"}
              className="h-20 w-20 shrink-0 rounded-2xl shadow-lg ring-1 ring-white/10 sm:aspect-square sm:h-auto sm:w-full"
            />
            <label className="block text-xs font-semibold text-zinc-300 min-w-0 flex-1 sm:w-full sm:flex-none">
              Cover artwork URL
              <input
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://... image link"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#2a2a2d] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/60 font-normal"
              />
            </label>
          </div>

          {/* Right: track fields */}
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Track title
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#2a2a2d] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/60 font-normal"
                />
              </label>
              <label className="block text-xs font-semibold text-zinc-300">
                Artist(s) <span className="font-normal text-zinc-500">(comma separated)</span>
                <input
                  required
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="e.g. Calvin Harris, Ayah Marar"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#2a2a2d] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/60 font-normal"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-zinc-300">
                Album
                <input
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  placeholder="Single / Album Name"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#2a2a2d] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/60 font-normal"
                />
              </label>
              <label className="block text-xs font-semibold text-zinc-300">
                <div className="flex items-center justify-between">
                  <span>Duration <span className="font-normal text-zinc-500">(seconds)</span></span>
                  {durationSeconds && Number(durationSeconds) > 0 ? (
                    <span className="font-mono text-[11px] font-normal text-blue-400">
                      {formatTime(Number(durationSeconds))}
                    </span>
                  ) : null}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(e.target.value)}
                    placeholder="e.g. 215"
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#2a2a2d] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/60 pr-20 font-normal"
                  />
                  {audioUrl.trim().startsWith("http") ? (
                    <button
                      type="button"
                      onClick={() => void autoDetectMetadata()}
                      disabled={detectingMetadata}
                      className="absolute right-2 top-3.5 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-zinc-200 transition hover:border-blue-400/50 hover:text-blue-300 disabled:opacity-50"
                      title="Auto-detect metadata and duration from audio URL"
                    >
                      {detectingMetadata ? (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                      ) : (
                        <Droplet className="h-3 w-3 text-blue-400" />
                      )}
                      <span>Detect</span>
                    </button>
                  ) : null}
                </div>
              </label>
            </div>

            <label className="block text-xs font-semibold text-zinc-300">
              <div className="flex items-center justify-between">
                <span>Audio stream URL</span>
                {detectingMetadata ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-normal text-blue-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> detecting metadata...
                  </span>
                ) : audioUrl.trim().startsWith("http") ? (
                  <button
                    type="button"
                    onClick={() => void autoDetectMetadata(undefined, true)}
                    className="inline-flex items-center gap-1 text-[11px] font-normal text-blue-400 hover:underline"
                  >
                    <Droplet className="h-3 w-3" /> re-detect all
                  </button>
                ) : null}
              </div>
              <input
                required
                value={audioUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setAudioUrl(val);
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text").trim().replace(/^["']|["']$/g, "");
                  if (pasted.startsWith("http://") || pasted.startsWith("https://")) {
                    e.preventDefault();
                    setAudioUrl(pasted);
                    void autoDetectMetadata(pasted);
                  }
                }}
                onBlur={() => {
                  if (audioUrl.trim().startsWith("http") && (!title || !artistName || !durationSeconds)) {
                    void autoDetectMetadata();
                  }
                }}
                placeholder="https://res.cloudinary.com/.../audio.mp3"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#2a2a2d] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/60 font-normal"
              />
            </label>
          </div>
        </div>

        {/* Footer: status + actions on one row */}
        <div className="mt-5 flex flex-col gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              disabled={deleting || busy}
              onClick={handleDelete}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Track
            </button>
            {status ? (
              <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-blue-500/10 px-3.5 py-2 text-xs font-medium text-blue-300">
                <Check className="h-4 w-4 shrink-0" />
                <span className="min-w-0">{status}</span>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-xs font-medium text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:scale-105 hover:bg-blue-400 active:scale-95 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}