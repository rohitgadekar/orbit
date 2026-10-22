"use client";

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

    const onTime = () => setProgress(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const playAtIndex = useCallback(
    (list: Song[], index: number) => {
      const song = list[index];
      const audio = audioRef.current;
      if (!song || !audio) return;
      setQueue(list);
      setCurrent(song);
      setProgress(0);
      recordedRef.current = null;
      audio.src = song.audio_url;
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
