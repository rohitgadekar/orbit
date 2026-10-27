"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** A single time-stamped lyric line. */
export type LyricLine = {
  /** Start time in seconds */
  time: number;
  /** Display text */
  text: string;
};

type LyricsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "synced"; lines: LyricLine[] }
  | { status: "plain"; text: string }
  | { status: "not-found" };

/** Parse an LRC file string into an array of timed lyric lines. */
function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const timeRegex = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

  for (const rawLine of lrc.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip metadata headers like [ti:Title], [ar:Artist], [length:03:30]
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(trimmed)) continue;

    const matches = [...trimmed.matchAll(timeRegex)];
    if (matches.length === 0) continue;

    const text = trimmed.replace(timeRegex, "").trim();
    if (!text) continue;

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      let millis = 0;
      if (match[3]) {
        const fraction = match[3];
        if (fraction.length === 1) millis = parseInt(fraction, 10) * 100;
        else if (fraction.length === 2) millis = parseInt(fraction, 10) * 10;
        else millis = parseInt(fraction.slice(0, 3), 10);
      }
      const time = minutes * 60 + seconds + millis / 1000;
      lines.push({ time, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

/**
 * useLyrics — fetches time-synced (LRC) lyrics from the local API proxy,
 * falls back to plain text, and exposes the active line index given a
 * current playback position.
 */
export function useLyrics(
  title: string | null | undefined,
  artist: string | null | undefined,
  duration: number | null | undefined,
  progress: number,
) {
  const [state, setState] = useState<LyricsState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const keyRef = useRef<string>("");

  useEffect(() => {
    if (!title) {
      setState({ status: "idle" });
      return;
    }

    const key = `${title}::${artist || ""}`;
    if (key === keyRef.current) return; // same song, no re-fetch
    keyRef.current = key;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState({ status: "loading" });

    const params = new URLSearchParams({ title });
    if (artist) params.set("artist", artist);
    if (duration) params.set("duration", String(Math.round(duration)));

    void fetch(`/api/lyrics?${params.toString()}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<{ synced: string | null; plain: string | null }>)
      .then(({ synced, plain }) => {
        if (ctrl.signal.aborted) return;
        if (synced) {
          const lines = parseLRC(synced);
          if (lines.length > 0) {
            setState({ status: "synced", lines });
            return;
          }
        }
        if (plain?.trim()) {
          setState({ status: "plain", text: plain.trim() });
          return;
        }
        setState({ status: "not-found" });
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        setState({ status: "not-found" });
      });

    return () => ctrl.abort();
  }, [title, artist, duration]);

  /** Index of the currently active lyric line based on playback position. */
  const activeIndex = useMemo(() => {
    if (state.status !== "synced") return -1;
    const { lines } = state;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (progress >= lines[i].time) idx = i;
      else break;
    }
    return idx;
  }, [state, progress]);

  return { state, activeIndex };
}
