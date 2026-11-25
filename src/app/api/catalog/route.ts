import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// In-memory server cache (15-minute TTL)
let cachedData: {
  songs: unknown[];
  artists: unknown[];
  expiresAt: number;
} | null = null;

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const songSelect = `
  id, title, artist_id, album_id, audio_url, cover_url, duration_seconds, play_count, created_at,
  artist:artists!artist_id (id, name, image_url),
  album:albums!album_id (id, title)
`;

export async function GET(req: NextRequest) {
  const forceFresh = req.nextUrl.searchParams.get("fresh") === "1";
  const now = Date.now();

  if (!forceFresh && cachedData && now < cachedData.expiresAt) {
    return NextResponse.json(
      {
        songs: cachedData.songs,
        artists: cachedData.artists,
        cached: true,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
        },
      },
    );
  }

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const [songsRes, artistsRes] = await Promise.all([
      supabase.from("songs").select(songSelect).order("created_at", { ascending: false }),
      supabase.from("artists").select("id, name, image_url").order("name"),
    ]);

    if (songsRes.error) {
      throw new Error(songsRes.error.message);
    }

    cachedData = {
      songs: songsRes.data || [],
      artists: artistsRes.data || [],
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json(
      {
        songs: cachedData.songs,
        artists: cachedData.artists,
        cached: false,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
        },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
