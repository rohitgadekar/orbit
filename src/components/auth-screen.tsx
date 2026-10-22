"use client";

import { OrbitMark } from "@/components/icon-rail";
import { createClient } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/utils";
import { Disc3, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isConfigured();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!configured) {
      setMessage("Add your Supabase keys to .env.local first.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) throw error;
        setMessage("Account created. Welcome to Orbit!");
        router.replace("/home");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/home");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh w-full lg:grid-cols-12 bg-[#19181b]">
      {/* Left Luxury Editorial Panel */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#19181b] via-[#211f24] to-[#121113] p-12 text-white lg:col-span-6 lg:flex lg:flex-col lg:justify-between xl:col-span-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#dbe878]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-amber-600/15 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <OrbitMark className="h-9 w-9" />
          <span className="font-serif text-2xl font-bold tracking-tight text-white">Orbit</span>
          <span className="rounded-full bg-[#dbe878]/15 px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-[#dbe878]">
            STUDIO
          </span>
        </div>

        <div className="relative z-10 my-auto py-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold tracking-wider uppercase text-[#dbe878]">
            <Sparkles className="h-3.5 w-3.5" />
            High Fidelity Listening Room
          </span>
          <h2 className="mt-5 font-serif text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
            Where audio artistry meets luxury design.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-300">
            Stream your curated Cloudinary collection in full-screen ambient glory with studio quality sound and custom catalog controls.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-300 backdrop-blur-md">
              <Disc3 className="h-4 w-4 text-[#dbe878]" />
              <span>Lossless FLAC & 320kbps MP3</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-300 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Dynamic Ambient Visualizer</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-zinc-400">
          <span>© 2026 Orbit Audio Studio</span>
          <span>Crafted for Connoisseurs</span>
        </div>
      </aside>

      {/* Right Form Container */}
      <main className="flex items-center justify-center bg-[#f7f6f3] p-6 lg:col-span-6 xl:col-span-5">
        <form onSubmit={onSubmit} className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 shadow-xl sm:p-10">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <OrbitMark className="h-8 w-8" />
            <span className="font-serif text-2xl font-bold text-zinc-900">Orbit</span>
          </div>

          <h1 className="font-serif text-3xl font-bold tracking-tight text-zinc-900">
            {mode === "login" ? "Welcome back" : "Join Orbit"}
          </h1>
          <p className="mt-2 text-xs text-zinc-500">
            {mode === "login"
              ? "Sign in to access your curated library, folders, and favourites."
              : "Create an account to start curating your Cloudinary catalog."}
          </p>

          {mode === "signup" ? (
            <label className="mt-6 block text-xs font-bold uppercase tracking-wider text-zinc-600">
              Your Name
              <input
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="e.g. Miles Davis"
                className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
              />
            </label>
          ) : null}

          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-zinc-600">
            Email Address
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@domain.com"
              className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
            />
          </label>

          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-zinc-600">
            Password
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-900 focus:bg-white"
            />
          </label>

          {message ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-2.5 text-xs font-medium text-amber-800">
              {message}
            </p>
          ) : null}

          <button
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#19181b] py-3.5 text-xs font-bold text-[#dbe878] shadow-md transition hover:scale-[1.02] active:scale-98 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{mode === "login" ? "Sign In to Studio" : "Create Studio Account"}</span>
          </button>

          <p className="mt-6 text-center text-xs text-zinc-500">
            {mode === "login" ? (
              <>
                New here?{" "}
                <Link href="/signup" className="font-bold text-zinc-900 hover:underline">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already a member?{" "}
                <Link href="/login" className="font-bold text-zinc-900 hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </form>
      </main>
    </div>
  );
}
