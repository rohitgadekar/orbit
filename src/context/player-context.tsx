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
import { useAuth } from "./auth-context";
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
  crossfade: number;
  setCrossfade: (value: number) => void;
  setExpanded: (value: boolean) => void;
  playSong: (song: Song, queue?: Song[]) => void;
  toggle: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

function fadeAudio(
  audio: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    if (durationMs <= 0) {
      audio.volume = Math.max(0, Math.min(1, to));
      resolve();
      return;
    }
    const steps = 10;
    const stepTime = Math.max(10, durationMs / steps);
    const stepDelta = (to - from) / steps;
    let step = 0;
    audio.volume = Math.max(0, Math.min(1, from));
    const interval = setInterval(() => {
      step++;
      const nextVol = from + stepDelta * step;
      audio.volume = Math.max(0, Math.min(1, nextVol));
      if (step >= steps) {
        clearInterval(interval);
        audio.volume = Math.max(0, Math.min(1, to));
        resolve();
      }
    }, stepTime);
  });
}

function getPlaybackUrl(song: Song): string {
  // Routes playback through our server-side streaming proxy.
  // In DevTools inspect, the user only sees `/api/stream?id=...`,
  // keeping Cloudinary & ImageKit account and bucket URLs completely protected.
  if (song.id) {
    return `/api/stream?id=${encodeURIComponent(song.id)}`;
  }
  if (song.audio_url) {
    return `/api/stream?url=${encodeURIComponent(song.audio_url)}`;
  }
  return "";
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
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

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    }
    if (blobUrlRef.current) {
      try {
        URL.revokeObjectURL(blobUrlRef.current);
      } catch {}
      blobUrlRef.current = null;
    }
    setIsPlaying(false);
    setCurrent(null);
    setQueue([]);
    setProgress(0);
    setDuration(0);
    setExpanded(false);

    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = "none";
        navigator.mediaSession.metadata = null;
      } catch {}
    }
    if (typeof document !== "undefined") {
      document.title = "Velar - Web Player";
    }
  }, []);

  // Stop playback immediately when user signs out or has no active session
  useEffect(() => {
    if (!authLoading && !user) {
      stop();
    }
  }, [authLoading, user, stop]);

  // Listen for global signout events
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleSignOut = () => stop();
    window.addEventListener("velar:signout", handleSignOut);
    window.addEventListener("orbit:signout", handleSignOut);
    return () => {
      window.removeEventListener("velar:signout", handleSignOut);
      window.removeEventListener("orbit:signout", handleSignOut);
    };
  }, [stop]);

  const [crossfade, setCrossfadeState] = useState<number>(() => {
    if (typeof window === "undefined") return 2;
    try {
      const saved = localStorage.getItem("orbit_crossfade");
      return saved !== null ? Number(saved) : 2;
    } catch {
      return 2;
    }
  });

  const setCrossfade = useCallback((seconds: number) => {
    setCrossfadeState(seconds);
    try {
      localStorage.setItem("orbit_crossfade", String(seconds));
    } catch {}
  }, []);

  const prevVolumeRef = useRef(0.85);
  const fadingOutRef = useRef(false);
  const crossfadeRef = useRef(crossfade);
  useEffect(() => {
    crossfadeRef.current = crossfade;
  }, [crossfade]);

  const toggleMute = useCallback(() => {
    setVolumeState((prev) => {
      const audio = audioRef.current;
      if (prev > 0) {
        prevVolumeRef.current = prev;
        if (audio) audio.volume = 0;
        return 0;
      } else {
        const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.85;
        if (audio) audio.volume = restored;
        return restored;
      }
    });
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTime = () => {
      setProgress(audio.currentTime);
      // Auto-crossfade fadeout when reaching the end of the song
      if (
        crossfadeRef.current > 0 &&
        audio.duration > 15 &&
        audio.duration - audio.currentTime <= crossfadeRef.current &&
        !fadingOutRef.current
      ) {
        fadingOutRef.current = true;
        void fadeAudio(audio, audio.volume, 0, crossfadeRef.current * 1000).finally(() => {
          fadingOutRef.current = false;
        });
      }
    };
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

      // Smooth ramp down if audio is currently playing and crossfade is enabled
      if (!audio.paused && audio.currentTime > 0 && crossfade > 0) {
        await fadeAudio(audio, audio.volume, 0, Math.min(crossfade * 200, 350));
      }

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
          audio.src = getPlaybackUrl(song);
        }
      } catch {
        audio.src = getPlaybackUrl(song);
      }

      if (crossfade > 0) {
        audio.volume = 0;
        try {
          await audio.play();
          await fadeAudio(audio, 0, volume, Math.min(crossfade * 250, 450));
        } catch {
          setIsPlaying(false);
        }
      } else {
        audio.volume = volume;
        void audio.play().catch(() => setIsPlaying(false));
      }
    },
    [volume, crossfade],
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
        album: current.album?.title || "Velar Music",
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

  // Sync document tab title with playback state
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (current && isPlaying) {
      document.title = `${current.title} • ${current.artist?.name || "Unknown Artist"} | Velar - Web Player`;
    } else {
      document.title = "Velar - Web Player";
    }
  }, [current, isPlaying]);

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
      // Guard against inputs, textareas, contenteditable elements
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          active.isContentEditable ||
          active.getAttribute("role") === "textbox"
        ) {
          return;
        }
      }

      const audio = audioRef.current;

      // Space: Toggle Play / Pause
      if (event.code === "Space") {
        event.preventDefault();
        if (!audio || !current) return;
        if (audio.paused) void audio.play();
        else audio.pause();
        return;
      }

      // Next / Previous: Shift + ArrowRight / ArrowLeft or Cmd/Ctrl + ArrowRight / ArrowLeft
      if (
        (event.shiftKey || event.metaKey || event.ctrlKey) &&
        (event.key === "ArrowRight" || event.key === "ArrowLeft")
      ) {
        event.preventDefault();
        if (event.key === "ArrowRight") next();
        else prev();
        return;
      }

      // Seek ±5s: ArrowRight / ArrowLeft
      if (event.key === "ArrowRight" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        if (!audio) return;
        const target = Math.min(audio.currentTime + 5, audio.duration || 0);
        audio.currentTime = target;
        setProgress(target);
        return;
      }

      if (event.key === "ArrowLeft" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        if (!audio) return;
        const target = Math.max(audio.currentTime - 5, 0);
        audio.currentTime = target;
        setProgress(target);
        return;
      }

      // M: Toggle Mute
      if (event.code === "KeyM" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        toggleMute();
        return;
      }

      // F: Toggle Fullscreen
      if (event.code === "KeyF" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setExpanded((prev) => !prev);
        return;
      }

      // S: Toggle Shuffle
      if (event.code === "KeyS" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setShuffle((v) => !v);
        return;
      }

      // R: Cycle Repeat
      if (event.code === "KeyR" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setRepeat((mode) => (mode === "off" ? "all" : mode === "all" ? "one" : "off"));
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, next, prev, toggleMute]);

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
      crossfade,
      setCrossfade,
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
      stop,
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
        if (value > 0) prevVolumeRef.current = value;
        if (audioRef.current) audioRef.current.volume = value;
      },
      toggleMute,
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
      crossfade,
      setCrossfade,
      playAtIndex,
      next,
      prev,
      stop,
      toggleMute,
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
