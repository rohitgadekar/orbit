"use client";

import { Cover } from "@/components/cover";
import { EmptyState } from "@/components/empty-state";
import { useMusic } from "@/context/music-context";
import { FolderPlus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function FoldersPage() {
  const { playlists, createPlaylist, deletePlaylist } = useMusic();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createPlaylist(name.trim());
      setName("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-blue-400">Curated Collections</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Playlists & Folders
        </h1>
        <p className="mt-1.5 text-xs text-zinc-500">
          Create playlists and organize your favorite library tracks into custom collections.
        </p>
      </div>

      {/* Create Playlist Form */}
      <form onSubmit={onCreate} className="flex max-w-md gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New playlist name..."
          className="min-w-0 flex-1 rounded-full bg-[#2a2a2d] px-4 py-2.5 text-xs font-medium text-white placeholder:text-zinc-500 outline-none ring-1 ring-transparent transition focus:ring-blue-500/60"
        />
        <button
          disabled={busy || !name.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:scale-105 hover:bg-blue-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          <span>Create</span>
        </button>
      </form>

      {/* Folders Grid */}
      {playlists.length === 0 ? (
        <EmptyState
          title="No folders yet"
          body="Folders are custom playlists for organizing your songs. Create one above to get started."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="group relative rounded-[32px] border border-white/5 bg-[#222224] p-3 transition duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-[#262628]"
            >
              <Link href={`/folders/${playlist.id}`} className="block">
                <div className="relative aspect-square w-full overflow-hidden rounded-[24px] bg-[#2c2c2f] shadow-lg shadow-black/20">
                  <Cover
                    src={playlist.cover_url}
                    title={playlist.name}
                    className="h-full w-full rounded-none object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                </div>

                <div className="px-1.5 pb-1 pt-3">
                  <h3 className="truncate text-sm font-bold text-white">{playlist.name}</h3>
                  <p className="mt-0.5 text-[11px] text-zinc-500 transition group-hover:text-blue-400">
                    View collection →
                  </p>
                </div>
              </Link>

              {/* Delete: round icon on the cover (always visible on touch, hover on desktop) */}
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete folder "${playlist.name}"?`)) {
                    void deletePlaylist(playlist.id);
                  }
                }}
                aria-label={`Delete ${playlist.name}`}
                title="Delete folder"
                className="absolute right-5 top-5 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-rose-300 backdrop-blur-md transition hover:bg-rose-500 hover:text-white focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}