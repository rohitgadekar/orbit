"use client";

import { ArtistAvatar } from "@/components/artist-avatar";
import { useMusic } from "@/context/music-context";
import type { ParsedArtist } from "@/lib/artists";
import { Check, Image as ImageIcon, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function EditArtistModal({
  artist,
  isOpen,
  onClose,
}: {
  artist: ParsedArtist | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !artist) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <EditArtistForm key={artist.name} artist={artist} onClose={onClose} />
    </div>
  );
}

function EditArtistForm({
  artist,
  onClose,
}: {
  artist: ParsedArtist;
  onClose: () => void;
}) {
  const { updateArtistProfile } = useMusic();
  const [imageUrl, setImageUrl] = useState(artist.image_url ?? "");
  const [bio, setBio] = useState(artist.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setImageUrl(artist.image_url ?? "");
    setBio(artist.bio ?? "");
  }, [artist]);

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
    <div className="relative w-full max-w-md rounded-[32px] border border-white/20 bg-[#1e1d21] p-6 text-white shadow-2xl md:p-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Header with Live Avatar Preview */}
      <div className="flex flex-col items-center border-b border-white/10 pb-6 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#dbe878]">
          Database Artist Profile
        </span>
        <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white">
          {artist.name}
        </h2>

        {/* Live Circular Avatar Preview */}
        <div className="mt-4 flex flex-col items-center">
          <ArtistAvatar
            name={artist.name}
            imageUrl={imageUrl}
            sizeClassName="w-28 h-28"
            className="ring-4 ring-[#dbe878]/30 shadow-xl"
          />
          <p className="mt-2 text-[11px] text-zinc-400">
            {artist.trackCount} track{artist.trackCount === 1 ? "" : "s"} in Orbit library
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
            Profile Picture URL (Direct PNG / JPG)
          </label>
          <div className="relative mt-1.5">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://.../artist-photo.png"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 pl-9 text-xs text-white placeholder-zinc-500 outline-none transition focus:border-[#dbe878] focus:bg-white/10"
            />
            <ImageIcon className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-400" />
          </div>
          <p className="mt-1 text-[10px] text-zinc-400">
            Paste a direct PNG or image URL to store as this artist&apos;s profile picture in the database.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
            Artist Biography (Bio text)
          </label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write or paste bio for this artist to store in database..."
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition focus:border-[#dbe878] focus:bg-white/10 leading-relaxed"
          />
          <p className="mt-1 text-[10px] text-zinc-400">
            Stored in database and displayed on this artist&apos;s dedicated page.
          </p>
        </div>

        {status ? (
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-medium text-[#dbe878]">
            <Check className="h-4 w-4 shrink-0" />
            <span>{status}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-[#dbe878] px-5 py-2 text-xs font-bold text-zinc-950 shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save to Database
          </button>
        </div>
      </form>
    </div>
  );
}
