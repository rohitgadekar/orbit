"use client";

import { getOfflineSong } from "@/lib/offline-storage";
import type { RepeatMode, Song } from "@/lib/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMusic } from "./music-context";

type PlayerContextValue = {
  current: Song | null;
  queue: Song[];
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  playSong: (song: Song, queue?: Song[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (value: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { recordPlay } = useMusic();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [current, setCurrent] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [expanded, setExpanded] = useState(false);
  const recordedRef = useRef<string | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    audio.setAttribute("referrerpolicy", "no-referrer");


    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const playAtIndex = useCallback(
    async (list: Song[], index: number) => {
      const song = list[index];
      const audio = audioRef.current;
      if (!song || !audio) return;
      setQueue(list);
      setCurrent(song);
      setProgress(0);
      recordedRef.current = null;

      try {
        const offlineRecord = await getOfflineSong(song.id);
        if (offlineRecord?.audioBlob) {
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
          }
          const blobUrl = URL.createObjectURL(offlineRecord.audioBlob);
          blobUrlRef.current = blobUrl;
          audio.src = blobUrl;
        } else {
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
          }
          if (typeof window !== "undefined" && !navigator.onLine) {
            alert(
              `"${song.title}" is not downloaded for offline playback. Please connect to the internet or choose a downloaded track.`,
            );
            setIsPlaying(false);
            return;
          }
          audio.src = song.audio_url;
        }
      } catch {
        audio.src = song.audio_url;
      }

      audio.volume = volume;
      void audio.play().catch(() => setIsPlaying(false));
    },
    [volume],
  );

  const next = useCallback(() => {
    if (!current || queue.length === 0) return;
    if (repeat === "one") {
      playAtIndex(queue, queue.findIndex((song) => song.id === current.id));
      return;
    }
    const index = queue.findIndex((song) => song.id === current.id);
    if (shuffle && queue.length > 1) {
      let nextIndex = index;
      while (nextIndex === index) {
        nextIndex = Math.floor(Math.random() * queue.length);
      }
      playAtIndex(queue, nextIndex);
      return;
    }
    const nextIndex = index + 1;
    if (nextIndex < queue.length) playAtIndex(queue, nextIndex);
    else if (repeat === "all") playAtIndex(queue, 0);
  }, [current, playAtIndex, queue, repeat, shuffle]);

  const prev = useCallback(() => {
    if (!current || queue.length === 0) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const index = queue.findIndex((song) => song.id === current.id);
    const prevIndex = index <= 0 ? queue.length - 1 : index - 1;
    playAtIndex(queue, prevIndex);
  }, [current, playAtIndex, queue]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => next();
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [next]);

  useEffect(() => {
    if (!current || progress < 8 || recordedRef.current === current.id) return;
    recordedRef.current = current.id;
    void recordPlay(current.id);
  }, [current, progress, recordPlay]);

  // Media Session API for iOS and Android lock screen controls & artwork
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    if (!current) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const cover = current.cover_url || current.album?.cover_url || current.artist?.image_url;
    const artwork: MediaImage[] = [];

    if (cover) {
      // iOS Safari and Android require absolute URLs
      const fullUrl = cover.startsWith("http")
        ? cover
        : `${window.location.origin}${cover.startsWith("/") ? "" : "/"}${cover}`;

      artwork.push(
        { src: fullUrl, sizes: "96x96", type: "image/jpeg" },
        { src: fullUrl, sizes: "128x128", type: "image/jpeg" },
        { src: fullUrl, sizes: "192x192", type: "image/jpeg" },
        { src: fullUrl, sizes: "256x256", type: "image/jpeg" },
        { src: fullUrl, sizes: "384x384", type: "image/jpeg" },
        { src: fullUrl, sizes: "512x512", type: "image/jpeg" },
      );
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist?.name || "Unknown Artist",
        album: current.album?.title || "Orbit Music",
        artwork,
      });
    } catch {
      // Ignore browsers with strict metadata constructors
    }
  }, [current]);

  // Sync playback state with lock screen
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {
      // Ignore
    }
  }, [isPlaying]);

  // Sync position state (progress scrubber) with iOS & Android lock screen
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("mediaSession" in navigator) ||
      !("setPositionState" in navigator.mediaSession) ||
      !duration ||
      duration <= 0
    ) {
      return;
    }

    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: audioRef.current?.playbackRate || 1,
        position: Math.min(progress, duration),
      });
    } catch {
      // Ignore invalid state updates during track transitions
    }
  }, [progress, duration]);

  // Lock screen media key actions (play, pause, next, prev, seek)
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      [
        "play",
        () => {
          const audio = audioRef.current;
          if (audio) void audio.play();
        },
      ],
      [
        "pause",
        () => {
          const audio = audioRef.current;
          if (audio) audio.pause();
        },
      ],
      ["previoustrack", () => prev()],
      ["nexttrack", () => next()],
      [
        "seekto",
        (details) => {
          if (details.seekTime != null) {
            const audio = audioRef.current;
            if (audio) {
              audio.currentTime = details.seekTime;
              setProgress(details.seekTime);
            }
          }
        },
      ],
      [
        "seekbackward",
        (details) => {
          const skipTime = details.seekOffset || 10;
          const audio = audioRef.current;
          if (audio) {
            const target = Math.max(audio.currentTime - skipTime, 0);
            audio.currentTime = target;
            setProgress(target);
          }
        },
      ],
      [
        "seekforward",
        (details) => {
          const skipTime = details.seekOffset || 10;
          const audio = audioRef.current;
          if (audio) {
            const target = Math.min(audio.currentTime + skipTime, audio.duration || 0);
            audio.currentTime = target;
            setProgress(target);
          }
        },
      ],
      [
        "stop",
        () => {
          const audio = audioRef.current;
          if (audio) audio.pause();
        },
      ],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Not all actions are supported by every platform/browser
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore
        }
      }
    };
  }, [next, prev]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.code === "Space") {
        event.preventDefault();
        const audio = audioRef.current;
        if (!audio || !current) return;
        if (audio.paused) void audio.play();
        else audio.pause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  const value = useMemo<PlayerContextValue>(
    () => ({
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
      playSong: (song, list) => {
        const nextQueue = list && list.length > 0 ? list : [song];
        const index = Math.max(
          0,
          nextQueue.findIndex((item) => item.id === song.id),
        );
        playAtIndex(nextQueue, index);
      },
      toggle: () => {
        const audio = audioRef.current;
        if (!audio || !current) return;
        if (audio.paused) void audio.play();
        else audio.pause();
      },
      next,
      prev,
      seek: (time) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = time;
        setProgress(time);
      },
      setVolume: (value) => {
        setVolumeState(value);
        if (audioRef.current) audioRef.current.volume = value;
      },
      toggleShuffle: () => setShuffle((value) => !value),
      cycleRepeat: () =>
        setRepeat((mode) =>
          mode === "off" ? "all" : mode === "all" ? "one" : "off",
        ),
    }),
    [
      current,
      queue,
      isPlaying,
      progress,
      duration,
      volume,
      shuffle,
      repeat,
      expanded,
      playAtIndex,
      next,
      prev,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
