"use client";

import { Cover } from "@/components/cover";
import { EditTrackModal } from "@/components/edit-track-modal";
import { FullscreenPlayer } from "@/components/fullscreen-player";
import { usePlayer } from "@/context/player-context";
import type { Song } from "@/lib/types";
import { Pause, Play, SkipForward } from "lucide-react";
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
      {/* Floating Bottom Mini Player Bar above the Mobile Tab Bar */}
      <div className="fixed bottom-[74px] left-3 right-3 z-40 mx-auto max-w-md md:hidden pointer-events-auto">
        <div className="relative overflow-hidden rounded-[26px] border border-white/15 bg-[#19181b]/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-2xl text-white">
          <div className="flex items-center justify-between gap-3 px-1">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
            >
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-sm">
                <Cover
                  src={cover}
                  title={current.title}
                  className="h-full w-full object-cover"
                  playing={isPlaying}
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-white tracking-tight">
                  {current.title}
                </span>
                <span className="block truncate text-[11px] font-medium text-zinc-400">
                  {current.artist?.name || "Unknown Artist"}
                </span>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggle}
                className="grid h-9 w-9 place-items-center rounded-full bg-[#dbe878] text-zinc-950 shadow-md transition active:scale-90 hover:bg-[#e4ef8f]"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 translate-x-0.5 fill-current" />
                )}
              </button>
              <button
                type="button"
                onClick={next}
                className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 hover:text-white transition active:scale-90"
                aria-label="Next track"
                title="Next"
              >
                <SkipForward className="h-4 w-4 fill-current" />
              </button>
            </div>
          </div>

          {/* Mini progress line along bottom of pill */}
          <div className="mt-2 h-[2.5px] w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-[#dbe878] transition-all duration-200"
              style={{
                width: `${Math.min(
                  100,
                  ((progress || 0) / (duration || current.duration_seconds || 1)) * 100,
                )}%`,
              }}
            />
          </div>
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
