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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-500">
          Curated Collections
        </p>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Playlists & Folders
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          Create playlists and organize your favorite library tracks into custom collections.
        </p>
      </div>

      {/* Create Playlist Form */}
      <form onSubmit={onCreate} className="flex max-w-md gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New playlist name..."
          className="flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:shadow-xs"
        />
        <button
          disabled={busy || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#19181b] px-5 py-2.5 text-xs font-bold text-[#dbe878] shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          <span>Create Playlist</span>
        </button>
      </form>

      {/* Folders Grid */}
      {playlists.length === 0 ? (
        <EmptyState
          title="No folders yet"
          body="Folders are custom playlists for organizing your songs. Create one above to get started."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-[26px] border border-black/5 bg-white p-3.5 shadow-xs transition duration-300 hover:shadow-md"
            >
              <Link href={`/folders/${playlist.id}`} className="block">
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100">
                  <Cover
                    src={playlist.cover_url}
                    title={playlist.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                </div>
                <h3 className="mt-3 truncate text-xs font-bold text-zinc-900 group-hover:text-black">
                  {playlist.name}
                </h3>
                <p className="text-[11px] font-medium text-zinc-400">View Collection →</p>
              </Link>

              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete folder "${playlist.name}"?`)) {
                    void deletePlaylist(playlist.id);
                  }
                }}
                className="mt-3 flex items-center gap-1 text-[11px] font-medium text-rose-500 opacity-0 transition group-hover:opacity-100 hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
