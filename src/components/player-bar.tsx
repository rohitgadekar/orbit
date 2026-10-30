"use client";

import { EditTrackModal } from "@/components/edit-track-modal";
import { FullscreenPlayer } from "@/components/fullscreen-player";
import { useAuth } from "@/context/auth-context";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import type { Song } from "@/lib/types";
import { useState } from "react";

export function PlayerBar() {
  const { isAdmin } = useAuth();
  const { songs } = useMusic();
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

  const activeSong = current ?? songs[0] ?? null;

  if (!activeSong) {
    return null;
  }

  const handleToggle = () => {
    if (!current && activeSong) {
      playSong(activeSong, queue.length > 0 ? queue : songs);
    } else {
      toggle();
    }
  };

  return (
    <>
      {/* YouTube Music style dynamic ambient full-screen player */}
      <FullscreenPlayer
        isOpen={expanded}
        onClose={() => setExpanded(false)}
        current={current ?? activeSong}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        volume={volume}
        shuffle={shuffle}
        repeat={repeat}
        queue={queue.length > 0 ? queue : songs}
        toggle={handleToggle}
        next={next}
        prev={prev}
        seek={seek}
        setVolume={setVolume}
        toggleShuffle={toggleShuffle}
        cycleRepeat={cycleRepeat}
        onEditTrack={isAdmin ? (song) => setEditingSong(song) : undefined}
        onPlaySong={(song) => playSong(song, queue.length > 0 ? queue : songs)}
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