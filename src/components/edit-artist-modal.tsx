"use client";

import { ArtistAvatar } from "@/components/artist-avatar";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import type { ParsedArtist } from "@/lib/artists";
import { Check, Globe, Image as ImageIcon, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function EditArtistModal({
  artist,
  isOpen,
  onClose,
  initialStatus,
}: {
  artist: ParsedArtist | null;
  isOpen: boolean;
  onClose: () => void;
  initialStatus?: string | null;
}) {
  const { isAdmin } = useAuth();

  if (!isOpen || !artist || !isAdmin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <EditArtistForm
        key={artist.name}
        artist={artist}
        onClose={onClose}
        initialStatus={initialStatus}
      />
    </div>
  );
}

function EditArtistForm({
  artist,
  onClose,
  initialStatus,
}: {
  artist: ParsedArtist;
  onClose: () => void;
  initialStatus?: string | null;
}) {
  const { updateArtistProfile } = useMusic();
  const [imageUrl, setImageUrl] = useState(artist.image_url ?? "");
  const [bio, setBio] = useState(artist.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [fetchingInternet, setFetchingInternet] = useState(false);
  const [status, setStatus] = useState<string | null>(initialStatus ?? null);

  useEffect(() => {
    setImageUrl(artist.image_url ?? "");
    setBio(artist.bio ?? "");
    setStatus(initialStatus ?? null);
  }, [artist, initialStatus]);

  async function handleFetchInternet() {
    setFetchingInternet(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/artist-info?name=${encodeURIComponent(artist.name)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "No artist info found on the internet");
      }

      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
      }
      if (data.bio) {
        setBio(data.bio);
      }

      const sourceInfo = data.source ? ` (${data.source})` : "";
      setStatus(`Found photo & short bio from internet${sourceInfo}! Review and click 'Save to Database'.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to fetch artist details");
    } finally {
      setFetchingInternet(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await updateArtistProfile(artist.name, imageUrl.trim() || null, bio.trim() || null, artist.id);
      setStatus("Artist details saved to database!");
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to update artist profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-scrollbar relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/5 bg-[#222224] p-5 text-white shadow-2xl sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-blue-400">Database Artist Profile</span>
          <h2 className="mt-0.5 truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
            {artist.name}
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
        <div className="grid gap-5 sm:grid-cols-[168px_1fr] sm:gap-6">
          {/* Left: live preview + internet lookup */}
          <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:gap-3 sm:text-center">
            <ArtistAvatar
              name={artist.name}
              imageUrl={imageUrl}
              sizeClassName="w-20 h-20 sm:w-28 sm:h-28"
              className="shrink-0 ring-4 ring-white/10 shadow-xl"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:w-full sm:flex-none">
              <p className="text-[11px] text-zinc-400">
                {artist.trackCount} track{artist.trackCount === 1 ? "" : "s"} in Velar library
              </p>
              <button
                type="button"
                onClick={handleFetchInternet}
                disabled={fetchingInternet || busy}
                title="Fetch HD photo & bio from the web"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 disabled:opacity-50"
              >
                {fetchingInternet ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Globe className="h-3.5 w-3.5 text-blue-400" />
                )}
                <span>{fetchingInternet ? "Fetching..." : "Fetch"}</span>
              </button>
            </div>
          </div>

          {/* Right: fields */}
          <div className="min-w-0 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300">
                Profile picture URL <span className="font-normal text-zinc-500">(direct PNG / JPG)</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://.../artist-photo.png"
                  className="w-full rounded-xl border border-white/10 bg-[#2a2a2d] px-3.5 py-2.5 pl-9 text-xs text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/60"
                />
                <ImageIcon className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300">
                Biography <span className="font-normal text-zinc-500">(shown on the artist page)</span>
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write or paste a bio for this artist..."
                className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-[#2a2a2d] px-3.5 py-2.5 text-xs leading-relaxed text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/60"
              />
            </div>
          </div>
        </div>

        {/* Footer: status + actions on one row */}
        <div className="mt-5 flex flex-col gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            {status ? (
              <div className="flex items-center gap-2 rounded-2xl bg-blue-500/10 px-3.5 py-2 text-xs font-medium text-blue-300">
                <Check className="h-4 w-4 shrink-0" />
                <span className="min-w-0">{status}</span>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:scale-105 hover:bg-blue-400 active:scale-95 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save to Database
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}