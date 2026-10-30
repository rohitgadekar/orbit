"use client";

import { AddToPlaylistModal } from "@/components/add-to-playlist-modal";
import { useTrackEditor } from "@/components/app-shell";
import { ArtistAvatar } from "@/components/artist-avatar";
import { Cover } from "@/components/cover";
import { EditArtistModal } from "@/components/edit-artist-modal";
import { EmptyState } from "@/components/empty-state";
import { SongRow } from "@/components/song-row";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import { getIndividualArtists, splitArtistNames, type ParsedArtist } from "@/lib/artists";
import { generateSmartMixes, type SmartMix } from "@/lib/mixes";
import { cn } from "@/lib/utils";
import type { Song } from "@/lib/types";
import {
  ArrowRight,
  Check,
  Disc3,
  FolderPlus,
  ListMusic,
  Loader2,
  Music2,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Users2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const NAV_TABS = [
  { key: "curated", label: "Curated", href: "/music", icon: Sparkles },
  { key: "albums", label: "Albums", href: "/music?view=albums", icon: Disc3 },
  { key: "playlists", label: "Playlists", href: "/music?view=playlists", icon: ListMusic },
  { key: "songs", label: "All Songs", href: "/music?view=songs", icon: Music2 },
  { key: "artists", label: "Artists", href: "/music?view=artists", icon: Users2 },
];

export default function MusicPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const rawView = searchParams.get("view");
  // Default to curated view
  const view = rawView || "curated";

  const {
    songs,
    artists,
    playlists,
    recentlyPlayed,
    favouriteIds,
    createPlaylist,
    createPlaylistWithSongs,
  } = useMusic();
  const { playSong } = usePlayer();
  const { editSong } = useTrackEditor();
  const { isAdmin } = useAuth();

  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [selectedForFolder, setSelectedForFolder] = useState<Song | null>(null);
  const [editingArtist, setEditingArtist] = useState<ParsedArtist | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);

  // Synchronize state when initialQuery from searchParams changes without an effect
  if (initialQuery !== prevInitialQuery) {
    setPrevInitialQuery(initialQuery);
    setQuery(initialQuery);
    setVisibleCount(30);
  }

  // States for saving smart mixes as user playlists
  const [savingMixId, setSavingMixId] = useState<string | null>(null);
  const [savedMixIds, setSavedMixIds] = useState<Set<string>>(new Set());

  // State for creating playlist from playlists view
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  // Generate personalized Spotify-style Smart Mixes
  const smartMixes = useMemo(() => {
    return generateSmartMixes(songs, recentlyPlayed, favouriteIds);
  }, [songs, recentlyPlayed, favouriteIds]);

  // Fast in-memory filtering for query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(q) ||
        song.artist?.name.toLowerCase().includes(q) ||
        splitArtistNames(song.artist?.name).some((name) =>
          name.toLowerCase().includes(q),
        ) ||
        song.album?.title.toLowerCase().includes(q),
    );
  }, [query, songs]);

  // Group by album
  const albums = useMemo(() => {
    const map = new Map<string, { title: string; artist: string; cover?: string; songs: Song[] }>();
    for (const song of songs) {
      const albumKey = song.album?.title || song.title;
      if (!map.has(albumKey)) {
        map.set(albumKey, {
          title: albumKey,
          artist: song.artist?.name || "Various Artists",
          cover: song.cover_url || song.album?.cover_url || undefined,
          songs: [],
        });
      }
      map.get(albumKey)!.songs.push(song);
    }
    return Array.from(map.values());
  }, [songs]);

  // Group by individual artist
  const individualArtists = useMemo(() => {
    return getIndividualArtists(songs, artists);
  }, [songs, artists]);

  const filteredArtists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [...individualArtists].sort((a, b) => b.songs.length - a.songs.length || a.name.localeCompare(b.name));
    }
    return individualArtists
      .filter((a) => a.name.toLowerCase().includes(q))
      .sort((a, b) => b.songs.length - a.songs.length || a.name.localeCompare(b.name));
  }, [query, individualArtists]);

  // Handle saving a smart mix to Supabase playlists
  const handleSaveMix = async (mix: SmartMix) => {
    if (savingMixId || savedMixIds.has(mix.id)) return;
    setSavingMixId(mix.id);
    try {
      await createPlaylistWithSongs(
        mix.title,
        mix.songs.map((s) => s.id),
        mix.coverUrl,
      );
      setSavedMixIds((prev) => new Set(prev).add(mix.id));
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(12);
        } catch {}
      }
    } catch (err) {
      console.error("Failed to save mix as playlist:", err);
      alert("Unable to save mix to playlists. Please check your connection.");
    } finally {
      setSavingMixId(null);
    }
  };

  // Handle creating a new playlist
  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim() || creatingPlaylist) return;
    setCreatingPlaylist(true);
    try {
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName("");
    } catch (err) {
      console.error("Failed to create playlist:", err);
    } finally {
      setCreatingPlaylist(false);
    }
  };

  // Paginated songs for smooth performance with 350+ tracks
  const paginatedSongs = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  function clearSearch() {
    setQuery("");
    router.replace(view === "curated" ? "/music" : `/music?view=${view}`);
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header with Catalog info & Admin actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">
            <Sparkles className="h-3 w-3 text-[#dbe878]" />
            <span>Orbit Library</span>
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {view === "albums"
              ? "Albums"
              : view === "playlists"
                ? "Your Playlists"
                : view === "songs"
                  ? "All Songs"
                  : view === "artists"
                    ? "Artists"
                    : "Curated & Mixes"}
          </h1>
          <p className="text-xs text-zinc-500">
            {view === "curated"
              ? `${smartMixes.length} personalized mixes • ${albums.length} albums • ${songs.length} catalog tracks`
              : view === "albums"
                ? `${albums.length} album${albums.length === 1 ? "" : "s"} • ${songs.length} tracks`
                : view === "playlists"
                  ? `${playlists.length} custom playlist${playlists.length === 1 ? "" : "s"}`
                  : view === "artists"
                    ? `${filteredArtists.length} individual artist${filteredArtists.length === 1 ? "" : "s"}`
                    : `${filtered.length} track${filtered.length === 1 ? "" : "s"} available`}
          </p>
        </div>

        {/* Compact Action Buttons Header */}
        <div className="flex items-center gap-2">
          {songs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (view === "curated" && smartMixes[0]?.songs[0]) {
                  playSong(smartMixes[0].songs[0], smartMixes[0].songs);
                } else if (filtered[0]) {
                  playSong(filtered[0], filtered);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#19181b] px-3.5 py-1.5 text-xs font-bold text-[#dbe878] shadow-xs transition hover:scale-105 active:scale-95"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Play All</span>
            </button>
          )}

          {isAdmin && (
            <>
              <Link
                href="/settings?tab=add-album"
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-zinc-900 hover:text-black"
                title="Add entire album at once"
              >
                <Disc3 className="h-3 w-3 text-amber-600" />
                <span className="hidden sm:inline">Add Album</span>
              </Link>

              <Link
                href="/settings?tab=add-track"
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs transition hover:border-zinc-900 hover:text-black"
              >
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">Add Track</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 2. Filter Navigation Pills */}
      <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5">
        {NAV_TABS.map((tab) => {
          const active = view === tab.key;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 select-none",
                active
                  ? "bg-[#19181b] text-[#dbe878] shadow-xs"
                  : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* 3. Search Filter Status (Shown only when user searched from TopHeader) */}
      {query && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-amber-700" />
            <span>
              Searching for <strong>&ldquo;{query}&rdquo;</strong> &bull; {filtered.length} results
            </span>
          </div>
          <button
            type="button"
            onClick={clearSearch}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 underline"
          >
            <X className="h-3 w-3" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* 4. Active Search Results Mode */}
      {query ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <EmptyState
              title="No tracks matched"
              body={`No songs, artists, or albums matching "${query}". Try another search term.`}
            />
          ) : (
            <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-2xs space-y-1">
              {paginatedSongs.map((song, index) => (
                <SongRow
                  key={song.id}
                  song={song}
                  queue={filtered}
                  index={index}
                  onMore={() => setSelectedForFolder(song)}
                  onEdit={isAdmin ? (songToEdit) => editSong(songToEdit) : undefined}
                />
              ))}

              {visibleCount < filtered.length && (
                <div className="pt-2 pb-1 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 30)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-200 active:scale-95"
                  >
                    <span>Load 30 More Tracks</span>
                    <span className="text-zinc-500">
                      ({paginatedSongs.length} of {filtered.length})
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : view === "curated" ? (
        /* Curated View: Daily Mixes, Albums, Playlists */
        <div className="space-y-8">
          {/* Section A: Made For You / Dynamic Mixes (Spotify style) */}
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-zinc-900 sm:text-base">
                Made For You
              </h2>
              <p className="text-[11px] text-zinc-500">
                Daily mixes and heavy rotation generated from your listening
              </p>
            </div>

            {/* Responsive 2-column mobile, 4-column desktop grid for clean proportions */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
              {smartMixes.map((mix) => {
                const isSaving = savingMixId === mix.id;
                const isSaved = savedMixIds.has(mix.id);

                return (
                  <div
                    key={mix.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-black/5 bg-white p-3 shadow-2xs transition hover:border-black/15 hover:shadow-md"
                  >
                    {/* Clickable artwork + metadata area — navigates to mix detail page */}
                    <Link href={`/music/mix/${mix.id}`} className="block">
                      {/* Visual Card Artwork */}
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-900 shadow-inner">
                        {mix.coverUrl ? (
                          <Cover
                            src={mix.coverUrl}
                            title={mix.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div
                            className={`h-full w-full bg-gradient-to-br ${mix.gradient} p-3 flex flex-col justify-between text-white`}
                          >
                            <span className="text-[9px] font-black tracking-widest uppercase opacity-75">
                              {mix.badge}
                            </span>
                            <h3 className="font-serif text-lg font-bold">{mix.title}</h3>
                          </div>
                        )}

                        {/* Floating Badge */}
                        <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[8px] font-black tracking-wider uppercase text-white backdrop-blur-md">
                          {mix.badge}
                        </span>
                      </div>

                      {/* Mix Metadata */}
                      <div className="mt-2.5 min-w-0 flex-1">
                        <h3 className="truncate text-xs font-bold text-zinc-900 group-hover:text-black">
                          {mix.title}
                        </h3>
                        <p className="truncate text-[11px] text-zinc-500">
                          {mix.subtitle}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {mix.songs.length} tracks
                        </p>
                      </div>
                    </Link>

                    {/* Action buttons: Play instantly, Save to Playlist — stopPropagation so they don't navigate */}
                    <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-black/5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (mix.songs[0]) playSong(mix.songs[0], mix.songs);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#19181b] py-1.5 text-[11px] font-bold text-[#dbe878] transition hover:bg-black active:scale-95"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Play</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleSaveMix(mix);
                        }}
                        disabled={isSaving || isSaved}
                        className={cn(
                          "inline-flex items-center justify-center rounded-lg border p-1.5 text-[11px] font-semibold transition active:scale-95",
                          isSaved
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100",
                        )}
                        title={isSaved ? "Saved to Playlists" : "Save as Playlist"}
                        aria-label={isSaved ? "Saved to Playlists" : "Save as Playlist"}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isSaved ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <FolderPlus className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section B: Albums Showcase */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-zinc-900 sm:text-base">
                  Albums
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Full studio releases from the catalog
                </p>
              </div>

              <Link
                href="/music?view=albums"
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-black"
              >
                <span>View all ({albums.length})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {albums.slice(0, 6).map((album) => (
                <Link
                  key={album.title}
                  href={`/albums/${encodeURIComponent(album.title)}`}
                  className="group block rounded-2xl border border-black/5 bg-white p-2.5 shadow-2xs transition hover:shadow-md focus:outline-none"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
                    <Cover
                      src={album.cover}
                      title={album.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (album.songs[0]) playSong(album.songs[0], album.songs);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 cursor-pointer"
                      title={`Play ${album.title}`}
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-zinc-950 shadow-md transition hover:scale-110">
                        <Play className="h-3.5 w-3.5 translate-x-0.5 fill-current" />
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 truncate text-xs font-bold text-zinc-900 group-hover:text-black transition">
                    {album.title}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {album.artist} • {album.songs.length} tracks
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Section C: User Playlists Showcase */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-zinc-900 sm:text-base">
                  Your Playlists
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Custom collections and saved mixes
                </p>
              </div>

              <Link
                href="/music?view=playlists"
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-black"
              >
                <span>View all ({playlists.length})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {playlists.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-4 text-center">
                <p className="text-xs text-zinc-500">
                  No custom playlists yet. Tap the bookmark icon on any Daily Mix to save it!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {playlists.slice(0, 6).map((playlist) => (
                  <Link
                    key={playlist.id}
                    href={`/folders/${playlist.id}`}
                    className="group block rounded-2xl border border-black/5 bg-white p-2.5 shadow-2xs transition hover:shadow-md focus:outline-none"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
                      <Cover
                        src={playlist.cover_url}
                        title={playlist.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-2 truncate text-xs font-bold text-zinc-900 group-hover:text-black transition">
                      {playlist.name}
                    </p>
                    <p className="truncate text-[11px] text-zinc-500">View Collection →</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Section D: Catalog Highlights */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-zinc-900 sm:text-base">
                  Catalog Highlights
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Popular tracks across Orbit
                </p>
              </div>

              <Link
                href="/music?view=songs"
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-black"
              >
                <span>All {songs.length} tracks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-2 shadow-2xs space-y-1">
              {songs.slice(0, 8).map((song, index) => (
                <SongRow
                  key={song.id}
                  song={song}
                  queue={songs}
                  index={index}
                  onMore={() => setSelectedForFolder(song)}
                  onEdit={isAdmin ? (songToEdit) => editSong(songToEdit) : undefined}
                />
              ))}
            </div>
          </section>
        </div>
      ) : view === "albums" ? (
        /* Albums View */
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {albums.map((album) => (
            <Link
              key={album.title}
              href={`/albums/${encodeURIComponent(album.title)}`}
              className="group block rounded-2xl border border-black/5 bg-white p-2.5 shadow-2xs transition hover:shadow-md focus:outline-none"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
                <Cover
                  src={album.cover}
                  title={album.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (album.songs[0]) playSong(album.songs[0], album.songs);
                  }}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100 cursor-pointer"
                  title={`Play ${album.title}`}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-zinc-950 shadow-md transition hover:scale-110">
                    <Play className="h-3.5 w-3.5 translate-x-0.5 fill-current" />
                  </span>
                </div>
              </div>
              <p className="mt-2 truncate text-xs font-bold text-zinc-900 group-hover:text-black transition">
                {album.title}
              </p>
              <p className="truncate text-[11px] text-zinc-500">
                {album.artist} • {album.songs.length} tracks
              </p>
            </Link>
          ))}
        </div>
      ) : view === "playlists" ? (
        /* Playlists View with Create Playlist Form */
        <div className="space-y-5">
          <form onSubmit={handleCreatePlaylist} className="flex max-w-sm gap-2">
            <input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="New playlist name..."
              className="flex-1 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 outline-none transition focus:border-zinc-900"
            />
            <button
              disabled={creatingPlaylist || !newPlaylistName.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#19181b] px-4 py-2 text-xs font-bold text-[#dbe878] shadow-xs transition hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Create</span>
            </button>
          </form>

          {playlists.length === 0 ? (
            <EmptyState
              title="No playlists yet"
              body="Create a custom playlist above or save any Daily Mix from the Curated tab."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {playlists.map((playlist) => (
                <Link
                  key={playlist.id}
                  href={`/folders/${playlist.id}`}
                  className="group block rounded-2xl border border-black/5 bg-white p-2.5 shadow-2xs transition hover:shadow-md"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
                    <Cover
                      src={playlist.cover_url}
                      title={playlist.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <h3 className="mt-2 truncate text-xs font-bold text-zinc-900 group-hover:text-black">
                    {playlist.name}
                  </h3>
                  <p className="text-[11px] text-zinc-500">View Collection →</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : view === "artists" ? (
        /* Artists View */
        filteredArtists.length === 0 ? (
          <EmptyState
            title="No artists found"
            body="No artists matching your catalog query."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredArtists.map((artist) => (
              <div
                key={artist.name}
                className="group relative flex flex-col items-center rounded-2xl border border-black/5 bg-white p-3 text-center shadow-2xs transition hover:border-black/15 hover:shadow-md"
              >
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setEditingArtist(artist);
                    }}
                    className="absolute right-2.5 top-2.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-black/5 text-zinc-500 opacity-0 transition hover:bg-black/10 hover:text-zinc-900 group-hover:opacity-100"
                    title={`Edit profile picture and bio for ${artist.name}`}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}

                <div className="relative">
                  <Link href={`/artists/${encodeURIComponent(artist.name)}`}>
                    <ArtistAvatar
                      name={artist.name}
                      imageUrl={artist.image_url}
                      sizeClassName="w-20 h-20 sm:w-24 sm:h-24"
                    />
                  </Link>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (artist.songs[0]) playSong(artist.songs[0], artist.songs);
                    }}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition group-hover:opacity-100 cursor-pointer"
                    title={`Play ${artist.name}`}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-zinc-950 shadow-md">
                      <Play className="h-3.5 w-3.5 translate-x-0.5 fill-current" />
                    </span>
                  </div>
                </div>

                <Link
                  href={`/artists/${encodeURIComponent(artist.name)}`}
                  className="mt-2 w-full max-w-full text-center focus:outline-none"
                >
                  <p
                    className="w-full truncate px-1 text-xs font-bold text-zinc-900 transition hover:text-black group-hover:text-black"
                    title={artist.name}
                  >
                    {artist.name}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {artist.songs.length} track{artist.songs.length === 1 ? "" : "s"}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        )
      ) : (
        /* "All Songs" View: Progressive rendering with pagination so 350+ tracks never freeze */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-zinc-500">
              Showing {paginatedSongs.length} of {filtered.length} tracks
            </p>
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={() => playSong(filtered[0], filtered)}
                className="text-xs font-bold text-[#9c3e17] hover:underline"
              >
                Play all {filtered.length} tracks
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-1.5 sm:p-2 shadow-2xs space-y-0.5">
            {paginatedSongs.map((song, index) => (
              <SongRow
                key={song.id}
                song={song}
                queue={filtered}
                index={index}
                onMore={() => setSelectedForFolder(song)}
                onEdit={isAdmin ? (songToEdit) => editSong(songToEdit) : undefined}
              />
            ))}

            {visibleCount < filtered.length && (
              <div className="pt-2 pb-1 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 30)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-2xs transition hover:bg-zinc-200 active:scale-95"
                >
                  <span>Load 30 More Tracks</span>
                  <span className="text-zinc-500">
                    ({paginatedSongs.length} of {filtered.length})
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add To Playlist / Create Playlist Modal */}
      <AddToPlaylistModal
        song={selectedForFolder}
        isOpen={Boolean(selectedForFolder)}
        onClose={() => setSelectedForFolder(null)}
      />

      {/* Edit Artist Profile Picture Modal */}
      <EditArtistModal
        artist={editingArtist}
        isOpen={Boolean(editingArtist)}
        onClose={() => setEditingArtist(null)}
      />
    </div>
  );
}
