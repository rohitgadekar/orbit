"use client";

import { Cover } from "@/components/cover";
import { useMusic } from "@/context/music-context";
import type { Song } from "@/lib/types";
import { Check, Loader2, Trash2, X } from "lucide-react";
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
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

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
    <div className="relative w-full max-w-lg rounded-[32px] border border-white/20 bg-[#1e1d21] p-6 text-white shadow-2xl md:p-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-4 border-b border-white/10 pb-5">
        <Cover
          src={coverUrl || song.cover_url || song.album?.cover_url}
          title={title || "Track"}
          className="h-16 w-16 shrink-0 rounded-2xl shadow-lg ring-1 ring-white/10"
        />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#dbe878]">
            Catalog Editor
          </p>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-white">
            Edit Track Details
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Track Title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm normal-case tracking-normal text-white placeholder-zinc-500 outline-none transition focus:border-[#dbe878] focus:bg-white/10"
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Artist(s)
            <input
              required
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="e.g. Calvin Harris, Ayah Marar"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm normal-case tracking-normal text-white placeholder-zinc-500 outline-none transition focus:border-[#dbe878] focus:bg-white/10"
            />
            <span className="mt-1 block text-[10px] normal-case text-zinc-400">
              Multiple artists can be separated with commas (e.g. &ldquo;Calvin Harris, Ayah Marar&rdquo;)
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Album
            <input
              value={albumTitle}
              onChange={(e) => setAlbumTitle(e.target.value)}
              placeholder="Single / Album Name"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm normal-case tracking-normal text-white placeholder-zinc-500 outline-none transition focus:border-[#dbe878] focus:bg-white/10"
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Duration (Seconds)
            <input
              type="number"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
              placeholder="e.g. 215"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm normal-case tracking-normal text-white placeholder-zinc-500 outline-none transition focus:border-[#dbe878] focus:bg-white/10"
            />
          </label>
        </div>

        <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
          Cover Artwork URL
          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://res.cloudinary.com/... or image link"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm normal-case tracking-normal text-white placeholder-zinc-500 outline-none transition focus:border-[#dbe878] focus:bg-white/10"
          />
        </label>

        <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
          Audio Stream URL
          <input
            required
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            placeholder="https://res.cloudinary.com/.../audio.mp3"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm normal-case tracking-normal text-white placeholder-zinc-500 outline-none transition focus:border-[#dbe878] focus:bg-white/10"
          />
        </label>

        {status ? (
          <div className="flex items-center gap-2 rounded-xl bg-[#dbe878]/10 px-3.5 py-2 text-xs font-medium text-[#dbe878]">
            <Check className="h-4 w-4" />
            <span>{status}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between pt-3">
          <button
            type="button"
            disabled={deleting || busy}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete Track
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-medium text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-[#dbe878] px-5 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-[#eaf48c] active:scale-95 disabled:opacity-50 shadow-lg shadow-[#dbe878]/20"
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
