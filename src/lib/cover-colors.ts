/**
 * High-accuracy color extractor for album/track artwork.
 * Strictly extracts real colors from image pixels using color quantization,
 * vibrancy weighting, and spatial quadrant sampling.
 */

export interface ExtractedColors {
  palette: {
    primary: string;
    secondary: string;
    tertiary: string;
    quaternary: string;
  };
  spatial: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    center: string;
  };
  ambientBase: string;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function rgbToString({ r, g, b }: Rgb, alpha?: number): string {
  if (alpha !== undefined) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function colorDistance(c1: Rgb, c2: Rgb): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Generates fallback colors deterministically from track title/seed,
 * strictly matching the hue calculation used in coverFallback().
 */
export function getFallbackColors(seed: string): ExtractedColors {
  let hash = 0;
  for (const char of seed || "Orbit") {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }
  const baseHue = Math.abs(hash) % 360;

  const c1 = hslToRgb(baseHue, 65, 48);
  const c2 = hslToRgb((baseHue + 40) % 360, 60, 42);
  const c3 = hslToRgb((baseHue + 80) % 360, 55, 36);
  const c4 = hslToRgb((baseHue + 120) % 360, 50, 30);
  const ambient = hslToRgb(baseHue, 40, 7);

  return {
    palette: {
      primary: rgbToString(c1),
      secondary: rgbToString(c2),
      tertiary: rgbToString(c3),
      quaternary: rgbToString(c4),
    },
    spatial: {
      topLeft: rgbToString(c1),
      topRight: rgbToString(c2),
      bottomLeft: rgbToString(c3),
      bottomRight: rgbToString(c4),
      center: rgbToString(c1),
    },
    ambientBase: rgbToString(ambient),
  };
}

/**
 * Extracts strictly genuine colors from the pixels of an image.
 */
export function extractColorsFromImageData(
  imgData: ImageData,
  width: number,
  height: number
): ExtractedColors {
  const data = imgData.data;

  // 1. Collect pixels and build color buckets (5-bit quantization = 32 levels per channel)
  interface Bucket {
    rSum: number;
    gSum: number;
    bSum: number;
    count: number;
    satSum: number;
  }

  const buckets = new Map<number, Bucket>();
  let totalR = 0, totalG = 0, totalB = 0;
  let totalCount = 0;

  // Quadrant accumulators: [topLeft, topRight, bottomLeft, bottomRight, center]
  const regionAccumulators = {
    topLeft: { rSum: 0, gSum: 0, bSum: 0, wSum: 0 },
    topRight: { rSum: 0, gSum: 0, bSum: 0, wSum: 0 },
    bottomLeft: { rSum: 0, gSum: 0, bSum: 0, wSum: 0 },
    bottomRight: { rSum: 0, gSum: 0, bSum: 0, wSum: 0 },
    center: { rSum: 0, gSum: 0, bSum: 0, wSum: 0 },
  };

  const midX = width / 2;
  const midY = height / 2;
  const centerXMin = width * 0.25;
  const centerXMax = width * 0.75;
  const centerYMin = height * 0.25;
  const centerYMax = height * 0.75;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha < 128) continue; // Skip transparent pixels

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      totalR += r;
      totalG += g;
      totalB += b;
      totalCount++;

      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      const isExtremeDark = r < 18 && g < 18 && b < 18;
      const isExtremeBright = r > 240 && g > 240 && b > 240;

      // Weight vibrant mid-tones higher so they are not drowned out by dark borders or pure white backgrounds
      const weight = isExtremeDark || isExtremeBright ? 0.3 : 1 + (sat / 255) * 2.5;

      // Spatial quadrant categorization
      if (x < midX && y < midY) {
        regionAccumulators.topLeft.rSum += r * weight;
        regionAccumulators.topLeft.gSum += g * weight;
        regionAccumulators.topLeft.bSum += b * weight;
        regionAccumulators.topLeft.wSum += weight;
      } else if (x >= midX && y < midY) {
        regionAccumulators.topRight.rSum += r * weight;
        regionAccumulators.topRight.gSum += g * weight;
        regionAccumulators.topRight.bSum += b * weight;
        regionAccumulators.topRight.wSum += weight;
      } else if (x < midX && y >= midY) {
        regionAccumulators.bottomLeft.rSum += r * weight;
        regionAccumulators.bottomLeft.gSum += g * weight;
        regionAccumulators.bottomLeft.bSum += b * weight;
        regionAccumulators.bottomLeft.wSum += weight;
      } else {
        regionAccumulators.bottomRight.rSum += r * weight;
        regionAccumulators.bottomRight.gSum += g * weight;
        regionAccumulators.bottomRight.bSum += b * weight;
        regionAccumulators.bottomRight.wSum += weight;
      }

      if (x >= centerXMin && x < centerXMax && y >= centerYMin && y < centerYMax) {
        regionAccumulators.center.rSum += r * weight;
        regionAccumulators.center.gSum += g * weight;
        regionAccumulators.center.bSum += b * weight;
        regionAccumulators.center.wSum += weight;
      }

      // 5-bit color quantization bucket: 0..31 per channel
      const qr = Math.floor(r / 8);
      const qg = Math.floor(g / 8);
      const qb = Math.floor(b / 8);
      const key = (qr << 10) | (qg << 5) | qb;

      let bkt = buckets.get(key);
      if (!bkt) {
        bkt = { rSum: 0, gSum: 0, bSum: 0, count: 0, satSum: 0 };
        buckets.set(key, bkt);
      }
      bkt.rSum += r;
      bkt.gSum += g;
      bkt.bSum += b;
      bkt.count++;
      bkt.satSum += sat;
    }
  }

  // 2. Rank color clusters by score (count + saturation)
  const clusters: Array<{ rgb: Rgb; score: number; sat: number; count: number }> = [];

  buckets.forEach((bkt) => {
    const avgR = bkt.rSum / bkt.count;
    const avgG = bkt.gSum / bkt.count;
    const avgB = bkt.bSum / bkt.count;
    const avgSat = bkt.satSum / bkt.count;

    const isNearBlack = avgR < 20 && avgG < 20 && avgB < 20;
    const isNearWhite = avgR > 235 && avgG > 235 && avgB > 235;

    // Dampen score of near-black / near-white unless image is mostly black/white
    const factor = isNearBlack || isNearWhite ? 0.15 : 1 + (avgSat / 255) * 3;
    const score = bkt.count * factor;

    clusters.push({
      rgb: { r: avgR, g: avgG, b: avgB },
      score,
      sat: avgSat,
      count: bkt.count,
    });
  });

  clusters.sort((a, b) => b.score - a.score);

  // 3. Select distinct palette colors (avoid picking slight variations of the same shade)
  const selectedPalette: Rgb[] = [];

  for (const c of clusters) {
    if (selectedPalette.length === 0) {
      selectedPalette.push(c.rgb);
      continue;
    }

    // Check distance against already selected colors
    const minDist = Math.min(...selectedPalette.map((p) => colorDistance(p, c.rgb)));
    if (minDist >= 55) {
      selectedPalette.push(c.rgb);
      if (selectedPalette.length >= 4) break;
    }
  }

  // If fewer than 4 distinct colors, fill with remaining clusters or darkened/harmonized variants of existing colors
  while (selectedPalette.length < 4 && clusters.length > selectedPalette.length) {
    const nextCandidate = clusters[selectedPalette.length];
    if (nextCandidate) {
      selectedPalette.push(nextCandidate.rgb);
    } else {
      break;
    }
  }

  // Safe fallback if the image had zero clusters
  if (selectedPalette.length === 0) {
    selectedPalette.push({ r: 60, g: 60, b: 70 });
  }
  while (selectedPalette.length < 4) {
    const base = selectedPalette[0];
    const [h, s, l] = rgbToHsl(base.r, base.g, base.b);
    const offset = selectedPalette.length * 30;
    selectedPalette.push(hslToRgb((h + offset) % 360, Math.max(20, s), Math.max(15, l - 10)));
  }

  // 4. Resolve spatial quadrant colors
  function resolveRegion(acc: { rSum: number; gSum: number; bSum: number; wSum: number }, fallback: Rgb): Rgb {
    if (acc.wSum === 0) return fallback;
    return {
      r: acc.rSum / acc.wSum,
      g: acc.gSum / acc.wSum,
      b: acc.bSum / acc.wSum,
    };
  }

  const spatialTopLeft = resolveRegion(regionAccumulators.topLeft, selectedPalette[0]);
  const spatialTopRight = resolveRegion(regionAccumulators.topRight, selectedPalette[1] || selectedPalette[0]);
  const spatialBottomLeft = resolveRegion(regionAccumulators.bottomLeft, selectedPalette[2] || selectedPalette[0]);
  const spatialBottomRight = resolveRegion(regionAccumulators.bottomRight, selectedPalette[3] || selectedPalette[1] || selectedPalette[0]);
  const spatialCenter = resolveRegion(regionAccumulators.center, selectedPalette[0]);

  // 5. Calculate deep ambient base tone (low luminance so controls pop)
  const avgImgR = totalCount > 0 ? totalR / totalCount : 20;
  const avgImgG = totalCount > 0 ? totalG / totalCount : 20;
  const avgImgB = totalCount > 0 ? totalB / totalCount : 20;

  const ambientBaseR = Math.min(20, Math.max(8, Math.round(avgImgR * 0.12)));
  const ambientBaseG = Math.min(18, Math.max(8, Math.round(avgImgG * 0.12)));
  const ambientBaseB = Math.min(24, Math.max(10, Math.round(avgImgB * 0.12)));

  return {
    palette: {
      primary: rgbToString(selectedPalette[0]),
      secondary: rgbToString(selectedPalette[1]),
      tertiary: rgbToString(selectedPalette[2]),
      quaternary: rgbToString(selectedPalette[3]),
    },
    spatial: {
      topLeft: rgbToString(spatialTopLeft),
      topRight: rgbToString(spatialTopRight),
      bottomLeft: rgbToString(spatialBottomLeft),
      bottomRight: rgbToString(spatialBottomRight),
      center: rgbToString(spatialCenter),
    },
    ambientBase: `rgb(${ambientBaseR}, ${ambientBaseG}, ${ambientBaseB})`,
  };
}

/**
 * Loads an image from a URL, extracting canvas colors with automatic CORS fallback.
 */
export async function extractArtworkColors(
  imageUrl: string,
  fallbackSeed: string
): Promise<ExtractedColors> {
  const fallback = getFallbackColors(fallbackSeed);
  if (!imageUrl) return fallback;

  return new Promise<ExtractedColors>((resolve) => {
    function tryLoad(src: string, isRetry = false) {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            resolve(fallback);
            return;
          }

          // Sample at 64x64 for optimal speed and accurate spatial/palette resolution
          canvas.width = 64;
          canvas.height = 64;
          ctx.drawImage(img, 0, 0, 64, 64);

          const imgData = ctx.getImageData(0, 0, 64, 64);
          const colors = extractColorsFromImageData(imgData, 64, 64);
          resolve(colors);
        } catch {
          if (!isRetry) {
            // Tainted canvas or CORS security error: retry via local proxy
            tryLoad(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`, true);
          } else {
            resolve(fallback);
          }
        }
      };

      img.onerror = () => {
        if (!isRetry) {
          // Direct load failed (CORS error or blocked): retry via local proxy
          tryLoad(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`, true);
        } else {
          resolve(fallback);
        }
      };

      img.src = src;
    }

    tryLoad(imageUrl, false);
  });
}
