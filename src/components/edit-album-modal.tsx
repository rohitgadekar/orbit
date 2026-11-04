"use client";

import { Cover } from "@/components/cover";
import { useMusic } from "@/context/music-context";
import type { Song } from "@/lib/types";
import { Loader2, X } from "lucide-react";
import { useState } from "react";

export type EditableAlbum = {
    title: string;
    artist: string;
    cover?: string | null;
    songs: Song[];
};

export function EditAlbumModal({
    album,
    isOpen,
    onClose,
}: {
    album: EditableAlbum | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!isOpen || !album) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <EditAlbumForm key={album.title} album={album} onClose={onClose} />
        </div>
    );
}

function EditAlbumForm({ album, onClose }: { album: EditableAlbum; onClose: () => void }) {
    const { updateAlbum } = useMusic();
    const [title, setTitle] = useState(album.title);
    const [coverUrl, setCoverUrl] = useState(album.cover ?? "");
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

    const first = album.songs[0];
    const albumId = first?.album_id ?? first?.album?.id ?? null;
    const trackCount = album.songs.length;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setStatus(null);
        try {
            await updateAlbum({
                albumId,
                songIds: album.songs.map((s) => s.id),
                title: albumId ? title : undefined,
                coverUrl,
            });
            setStatus({ ok: true, text: `Updated ${trackCount} track${trackCount === 1 ? "" : "s"}.` });
            setTimeout(onClose, 700);
        } catch (err) {
            setStatus({ ok: false, text: err instanceof Error ? err.message : "Failed to update album" });
        } finally {
            setBusy(false);
        }
    }

    const inputClass =
        "mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:bg-white/10";

    return (
        <div
            className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[#1e1d21] p-6 text-white shadow-2xl md:p-8"
            onClick={(e) => e.stopPropagation()}
        >
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
                    src={coverUrl || album.cover}
                    title={title || album.title}
                    className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-lg ring-1 ring-white/10"
                />
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-blue-400">Album editor</p>
                    <h2 className="truncate text-2xl font-bold tracking-tight text-white">Edit album</h2>
                    <p className="truncate text-xs text-zinc-400">
                        {album.artist} • {trackCount} track{trackCount === 1 ? "" : "s"}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {albumId ? (
                    <label className="block text-xs font-medium text-zinc-400">
                        Album title
                        <input
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={inputClass}
                        />
                    </label>
                ) : null}

                <label className="block text-xs font-medium text-zinc-400">
                    Cover image URL
                    <input
                        value={coverUrl}
                        onChange={(e) => setCoverUrl(e.target.value)}
                        placeholder="https://…/cover.jpg"
                        className={inputClass}
                    />
                </label>

                <p className="rounded-xl bg-blue-500/10 px-3.5 py-2.5 text-xs text-blue-300">
                    This cover is applied to the album and all {trackCount} track{trackCount === 1 ? "" : "s"} at
                    once. Leave it empty to clear the cover.
                </p>

                {status ? (
                    <p className={`text-xs font-medium ${status.ok ? "text-emerald-400" : "text-red-400"}`}>
                        {status.text}
                    </p>
                ) : null}

                <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2.5 text-xs font-bold text-white transition hover:bg-blue-400 active:scale-95 disabled:opacity-60"
                    >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        <span>{busy ? "Saving…" : `Save for ${trackCount} track${trackCount === 1 ? "" : "s"}`}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
