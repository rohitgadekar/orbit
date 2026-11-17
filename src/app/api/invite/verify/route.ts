import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Master invite codes available out of the box
const MASTER_INVITE_CODES = [
  "ORBIT-VIP",
  "ORBIT-2026",
  "ORBIT-PASSKEY",
  "AUDIOPHILE",
  "PRIVATE-ACCESS",
  "SOUND-STUDIO",
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawCode = (body?.code || "").toString().trim().toUpperCase();

    if (!rawCode) {
      return NextResponse.json(
        { valid: false, error: "Invitation code is required." },
        { status: 400 },
      );
    }

    // 1. Check master invite codes
    if (MASTER_INVITE_CODES.includes(rawCode)) {
      return NextResponse.json({
        valid: true,
        code: rawCode,
        tier: "VIP Member",
        message: "Invitation code verified. Welcome to Orbit.",
      });
    }

    // 2. Check environment variable codes (comma-separated if provided)
    const envCodes = (process.env.ORBIT_INVITE_CODES || "")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (envCodes.includes(rawCode)) {
      return NextResponse.json({
        valid: true,
        code: rawCode,
        tier: "Private Beta",
        message: "Invitation code verified. Welcome to Orbit.",
      });
    }

    // 3. Check Supabase `invites` table if configured
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
        });

        const { data, error } = await supabase
          .from("invites")
          .select("code, is_active, uses_remaining, tier")
          .eq("code", rawCode)
          .maybeSingle();

        if (!error && data && data.is_active && (data.uses_remaining === null || data.uses_remaining > 0)) {
          return NextResponse.json({
            valid: true,
            code: data.code,
            tier: data.tier || "VIP Member",
            message: "Invitation code verified. Welcome to Orbit.",
          });
        }
      } catch {
        // Fallback gracefully if table does not exist
      }
    }

    return NextResponse.json(
      {
        valid: false,
        error: "Invalid or expired invitation code. Request access to join our waitlist.",
      },
      { status: 400 },
    );
  } catch (err) {
    return NextResponse.json(
      { valid: false, error: "Failed to verify invitation code." },
      { status: 500 },
    );
  }
}
