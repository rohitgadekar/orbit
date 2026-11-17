import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toString().trim().toLowerCase();
    const name = (body?.name || "").toString().trim();
    const note = (body?.note || "").toString().trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required." },
        { status: 400 },
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: "Database configuration is missing." },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Insert into public.waitlist
    const { error } = await supabase.from("waitlist").insert({
      email,
      name: name || null,
      note: note || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Waitlist insert error:", error);

      if (error.code === "42501") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Database permission error: Please run the SQL grants from supabase/invite_codes.sql in your Supabase SQL Editor.",
          },
          { status: 500 },
        );
      }

      if (error.code === "42P01") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Table 'waitlist' does not exist yet. Please run supabase/invite_codes.sql in your Supabase SQL Editor.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { success: false, error: error.message || "Failed to record waitlist entry." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Your invitation request has been recorded. You will be notified as soon as a slot opens.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unable to join waitlist";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
