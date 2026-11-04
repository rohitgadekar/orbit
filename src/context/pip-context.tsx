"use client";

import { Cover } from "@/components/cover";
import { useMusic } from "@/context/music-context";
import { usePlayer } from "@/context/player-context";
import { formatTime } from "@/lib/utils";
import {
    Heart,
    Pause,
    Play,
    Repeat,
    Repeat1,
    Shuffle,
    SkipBack,
    SkipForward,
} from "lucide-react";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";

/* Minimal typings for the Document Picture-in-Picture API (Chromium 116+) */
type DocumentPiP = {
    window: Window | null;
    requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>;
};
function getDocPiP(): DocumentPiP | null {
    if (typeof window === "undefined") return null;
    return (window as unknown as { documentPictureInPicture?: DocumentPiP }).documentPictureInPicture ?? null;
}

type PipContextValue = {
    /** True if this browser can show any kind of picture-in-picture */
    supported: boolean;
    isOpen: boolean;
    toggle: () => void;
};

const PipContext = createContext<PipContextValue>({ supported: false, isOpen: false, toggle: () => { } });
export function usePip() {
    return useContext(PipContext);
}

/** Copy the app's CSS into the floating window so Tailwind classes work there. */
function copyStyles(target: Window) {
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            const css = Array.from(sheet.cssRules)
                .map((r) => r.cssText)
                .join("\n");
            const style = target.document.createElement("style");
            style.textContent = css;
            target.document.head.appendChild(style);
        } catch {
            // Cross-origin sheet: link it instead
            if (sheet.href) {
                const link = target.document.createElement("link");
                link.rel = "stylesheet";
                link.href = sheet.href;
                target.document.head.appendChild(link);
            }
        }
    }
}

/* ───────────── What is shown inside the floating window ───────────── */
function PipPlayerView() {
    const { current, isPlaying, progress, duration, shuffle, repeat, toggle, next, prev, seek, toggleShuffle, cycleRepeat } =
        usePlayer();
    const { favouriteIds, toggleFavourite } = useMusic();

    if (!current) {
        return (
            <div className="h-screen w-screen bg-[#121214] p-2">
                <div className="grid h-full place-items-center rounded-[24px] bg-[#1a1a1c] p-6 text-center text-sm text-zinc-400 ring-1 ring-white/5">
                    Nothing is playing
                </div>
            </div>
        );
    }

    const cover = current.cover_url || current.album?.cover_url || current.artist?.image_url;
    const total = duration || current.duration_seconds || 0;
    const pct = total ? Math.min(100, (progress / total) * 100) : 0;
    const isFav = favouriteIds.has(current.id);

    return (
        <div className="h-screen w-screen overflow-hidden bg-[#121214] p-2 text-white">
            <div className="flex h-full flex-col gap-3 overflow-hidden rounded-[24px] bg-[#1a1a1c] p-4 ring-1 ring-white/5">
                {/* Artwork scales with the window; hidden when the window is very short */}
                <div className="flex min-h-0 flex-1 items-center justify-center [@media(max-height:300px)]:hidden">
                    <div className="aspect-square h-full max-h-full max-w-full overflow-hidden rounded-2xl bg-[#2c2c2f] shadow-2xl ring-1 ring-white/10">
                        <Cover src={cover} title={current.title} className="h-full w-full object-cover" playing={isPlaying} />
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold">{current.title}</p>
                        <p className="truncate text-xs text-zinc-400">{current.artist?.name}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void toggleFavourite(current.id)}
                        aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 active:scale-90"
                    >
                        <Heart className={`h-4 w-4 ${isFav ? "fill-blue-500 text-blue-500" : ""}`} />
                    </button>
                </div>

                {/* Same scrubber as the full-screen player */}
                <div className="w-full shrink-0 space-y-2">
                    <input
                        type="range"
                        min={0}
                        max={total || 1}
                        step={0.1}
                        value={Math.min(progress, total || progress)}
                        onChange={(e) => seek(Number(e.target.value))}
                        aria-label="Seek"
                        className="h-1 w-full cursor-pointer appearance-none rounded-full accent-blue-500 [&::-webkit-slider-thumb]:bg-white! [&::-webkit-slider-thumb]:shadow-none! [&::-webkit-slider-thumb:hover]:shadow-none!"
                        style={{
                            background: `linear-gradient(to right,#3b82f6 ${pct}%,rgba(255,255,255,0.25) ${pct}%)`,
                        }}
                    />
                    <div className="flex justify-between text-xs font-semibold tabular-nums text-zinc-400">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(total)}</span>
                    </div>
                </div>

                <div className="flex shrink-0 items-center justify-between px-1 pb-1">
                    <button type="button" onClick={toggleShuffle} aria-label="Shuffle"
                        className={`p-2 transition ${shuffle ? "text-blue-400" : "text-zinc-400 hover:text-white"}`}>
                        <Shuffle className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={prev} aria-label="Previous" className="p-2 transition hover:scale-110 active:scale-95">
                        <SkipBack className="h-5 w-5 fill-current" />
                    </button>
                    <button type="button" onClick={toggle} aria-label={isPlaying ? "Pause" : "Play"}
                        className="grid h-12 w-12 place-items-center rounded-full bg-white text-zinc-950 shadow-lg transition hover:scale-105 active:scale-95">
                        {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 translate-x-0.5 fill-current" />}
                    </button>
                    <button type="button" onClick={next} aria-label="Next" className="p-2 transition hover:scale-110 active:scale-95">
                        <SkipForward className="h-5 w-5 fill-current" />
                    </button>
                    <button type="button" onClick={cycleRepeat} aria-label="Repeat"
                        className={`p-2 transition ${repeat !== "off" ? "text-blue-400" : "text-zinc-400 hover:text-white"}`}>
                        {repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ───────────── Provider ───────────── */
export function PipProvider({ children }: { children: React.ReactNode }) {
    const { current, isPlaying, progress, duration } = usePlayer();
    // Browser capabilities never change at runtime, so read them once (the provider only mounts client-side)
    const [docSupported] = useState(() => Boolean(getDocPiP()));
    const [videoSupported] = useState(
        () => typeof document !== "undefined" && Boolean(document.pictureInPictureEnabled),
    );
    const [pipWindow, setPipWindow] = useState<Window | null>(null);
    const [videoActive, setVideoActive] = useState(false);

    // Fallback (Safari etc.): a <video> fed by a canvas; controls come from the existing Media Session handlers
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const coverImgRef = useRef<HTMLImageElement | null>(null);

    const openDocumentPip = useCallback(async () => {
        const api = getDocPiP();
        if (!api) return;
        if (api.window) {
            api.window.close();
            return;
        }
        const w = await api.requestWindow({ width: 360, height: 540 });
        copyStyles(w);
        w.document.documentElement.className = document.documentElement.className;
        w.document.body.className = document.body.className;
        w.document.body.style.margin = "0";
        w.document.body.style.background = "#121214";
        w.document.documentElement.style.colorScheme = "dark";
        w.addEventListener("pagehide", () => setPipWindow(null));
        setPipWindow(w);
    }, []);

    const drawFrame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !current) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const S = canvas.width;
        ctx.fillStyle = "#1a1a1c";
        ctx.fillRect(0, 0, S, S);
        const img = coverImgRef.current;
        if (img && img.complete && img.naturalWidth > 0) {
            const size = S * 0.62;
            ctx.save();
            ctx.beginPath();
            ctx.roundRect((S - size) / 2, S * 0.08, size, size, 28);
            ctx.clip();
            ctx.drawImage(img, (S - size) / 2, S * 0.08, size, size);
            ctx.restore();
        }
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "700 34px sans-serif";
        ctx.fillText((current.title || "").slice(0, 28), S / 2, S * 0.82);
        ctx.fillStyle = "#a1a1aa";
        ctx.font = "500 24px sans-serif";
        ctx.fillText((current.artist?.name || "").slice(0, 36), S / 2, S * 0.89);
        // progress bar
        const total = duration || current.duration_seconds || 0;
        const pct = total ? Math.min(1, progress / total) : 0;
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(S * 0.12, S * 0.94, S * 0.76, 6);
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(S * 0.12, S * 0.94, S * 0.76 * pct, 6);
    }, [current, duration, progress]);

    const openVideoPip = useCallback(async () => {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
            return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 512;
        canvasRef.current = canvas;
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.srcObject = canvas.captureStream(5);
        video.addEventListener("leavepictureinpicture", () => setVideoActive(false));
        videoRef.current = video;
        drawFrame();
        await video.play();
        await video.requestPictureInPicture();
        setVideoActive(true);
    }, [drawFrame]);

    // Load the cover for the canvas fallback (CORS-friendly hosts only; otherwise text-only frame)
    useEffect(() => {
        if (!videoActive || !current) return;
        const src = current.cover_url || current.album?.cover_url || current.artist?.image_url;
        if (!src) {
            coverImgRef.current = null;
            return;
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            coverImgRef.current = img;
            drawFrame();
        };
        img.onerror = () => {
            coverImgRef.current = null;
        };
        img.src = src;
    }, [videoActive, current, drawFrame]);

    useEffect(() => {
        if (videoActive) drawFrame();
    }, [videoActive, drawFrame, isPlaying]);

    // Close everything if the provider unmounts (e.g. sign-out)
    useEffect(() => {
        return () => {
            getDocPiP()?.window?.close();
            if (typeof document !== "undefined" && document.pictureInPictureElement) {
                void document.exitPictureInPicture().catch(() => { });
            }
        };
    }, []);

    const toggle = useCallback(() => {
        const run = docSupported ? openDocumentPip() : videoSupported ? openVideoPip() : Promise.resolve();
        void run.catch((err) => console.warn("Picture-in-picture failed:", err));
    }, [docSupported, videoSupported, openDocumentPip, openVideoPip]);

    const value = useMemo<PipContextValue>(
        () => ({
            supported: docSupported || videoSupported,
            isOpen: Boolean(pipWindow) || videoActive,
            toggle,
        }),
        [docSupported, videoSupported, pipWindow, videoActive, toggle],
    );

    return (
        <PipContext.Provider value={value}>
            {children}
            {pipWindow ? createPortal(<PipPlayerView />, pipWindow.document.body) : null}
        </PipContext.Provider>
    );
}