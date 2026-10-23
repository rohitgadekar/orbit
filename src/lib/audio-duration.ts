// Audio duration detection via HTML5 Audio metadata

const durationCache = new Map<string, number>();

/**
 * Detects the duration of an audio stream from its URL via HTML5 Audio metadata.
 * Returns the duration in seconds rounded to the nearest integer.
 */
export function getAudioDuration(url: string, timeoutMs = 12000): Promise<number> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !url || typeof url !== "string") {
      reject(new Error("Invalid audio URL"));
      return;
    }

    // Strip whitespace and any surrounding quotes (e.g. from copy-pasting JSON or code)
    let cleanUrl = url.trim();
    if (
      (cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) ||
      (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))
    ) {
      cleanUrl = cleanUrl.slice(1, -1).trim();
    }

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      reject(new Error("URL must begin with http:// or https://"));
      return;
    }

    if (durationCache.has(cleanUrl)) {
      resolve(durationCache.get(cleanUrl)!);
      return;
    }

    const audio = new Audio();
    audio.preload = "metadata";

    let timer: ReturnType<typeof setTimeout> | null = null;
    let finished = false;

    const cleanup = () => {
      finished = true;
      if (timer) clearTimeout(timer);
      audio.onloadedmetadata = null;
      audio.ondurationchange = null;
      audio.oncanplay = null;
      audio.onloadeddata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
    };

    const tryResolveDuration = (): boolean => {
      if (finished) return false;
      const dur = audio.duration;
      if (Number.isFinite(dur) && dur > 0) {
        const seconds = Math.round(dur);
        durationCache.set(cleanUrl, seconds);
        cleanup();
        resolve(seconds);
        return true;
      }
      return false;
    };

    audio.onloadedmetadata = () => {
      if (!tryResolveDuration()) {
        // If duration is Infinity or NaN on initial stream metadata, attempt to seek to calculate duration
        if (audio.duration === Infinity) {
          try {
            audio.currentTime = 1e101;
            audio.ontimeupdate = () => {
              audio.ontimeupdate = null;
              audio.currentTime = 0;
              tryResolveDuration();
            };
          } catch {
            // Ignore seek errors
          }
        }
      }
    };

    audio.ondurationchange = () => {
      tryResolveDuration();
    };

    audio.oncanplay = () => {
      tryResolveDuration();
    };

    audio.onloadeddata = () => {
      tryResolveDuration();
    };

    audio.onerror = (e) => {
      if (finished) return;
      console.warn("Audio metadata load error for:", cleanUrl, e);
      cleanup();
      reject(new Error("Failed to load audio stream metadata"));
    };

    timer = setTimeout(() => {
      if (finished) return;
      if (tryResolveDuration()) return;
      cleanup();
      reject(new Error("Timed out reading audio duration"));
    }, timeoutMs);

    audio.src = cleanUrl;
    audio.load();
  });
}
