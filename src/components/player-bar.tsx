"use client";

import { Cover } from "@/components/cover";
import { EditTrackModal } from "@/components/edit-track-modal";
import { FullscreenPlayer } from "@/components/fullscreen-player";
import { usePlayer } from "@/context/player-context";
import type { Song } from "@/lib/types";
import { Maximize2, Pause, Play } from "lucide-react";
import { useState } from "react";

export function PlayerBar() {
  const {
    current,
    queue,
    isPlaying,
    progress,
    duration,
    volume,
    shuffle,
    repeat,
    expanded,
    setExpanded,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    playSong,
  } = usePlayer();

  const [editingSong, setEditingSong] = useState<Song | null>(null);

  if (!current) {
    return null;
  }

  const cover = current.cover_url || current.album?.cover_url || current.artist?.image_url;

  return (
    <>
      {/* Bottom Mini Player Bar (visible on mobile / tablet or bottom dock) */}
      <div className="z-30 border-t border-black/5 bg-[#ffffff]/90 px-4 py-2.5 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <Cover src={cover} title={current.title} className="h-11 w-11 rounded-xl shadow-xs" playing={isPlaying} />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-zinc-900">{current.title}</span>
              <span className="block truncate text-[11px] text-zinc-500">{current.artist?.name}</span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-white shadow-sm"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 translate-x-0.5 fill-current" />}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-full p-2 text-zinc-600"
              title="Full screen"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mini progress line */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full bg-zinc-900 transition-all duration-150"
            style={{
              width: `${Math.min(100, ((progress || 0) / (duration || current.duration_seconds || 1)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* YouTube Music style dynamic ambient full-screen player */}
      <FullscreenPlayer
        isOpen={expanded}
        onClose={() => setExpanded(false)}
        current={current}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        volume={volume}
        shuffle={shuffle}
        repeat={repeat}
        queue={queue}
        toggle={toggle}
        next={next}
        prev={prev}
        seek={seek}
        setVolume={setVolume}
        toggleShuffle={toggleShuffle}
        cycleRepeat={cycleRepeat}
        onEditTrack={(song) => setEditingSong(song)}
        onPlaySong={(song) => playSong(song, queue)}
      />

      {/* Edit Track Modal */}
      <EditTrackModal
        song={editingSong}
        isOpen={Boolean(editingSong)}
        onClose={() => setEditingSong(null)}
      />
    </>
  );
}
