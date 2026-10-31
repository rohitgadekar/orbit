"use client";

import { OrbitMark } from "@/components/icon-rail";
import { createClient } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const inputClass =
  "mt-1.5 w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500";

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
    <div className="grid min-h-dvh w-full bg-[#1a1a1c] lg:grid-cols-12">
      {/* Left brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-white/5 bg-gradient-to-br from-[#19181b] via-[#242228] to-[#121114] p-12 text-white lg:col-span-6 lg:flex lg:flex-col lg:justify-between xl:col-span-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="text-2xl font-bold tracking-tight text-white">Orbit</span>
        </div>

        <div className="relative z-10 my-auto py-12">
          <h2 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Your music, beautifully in orbit.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-400">
            Stream your curated collection with full-screen ambient playback, synced lyrics and
            offline downloads.
          </p>
        </div>

        <div className="relative z-10 border-t border-white/10 pt-6 text-xs text-zinc-500">
          <span>© 2026 Orbit</span>
        </div>
      </aside>

      {/* Right form container */}
      <main className="flex items-center justify-center p-6 lg:col-span-6 xl:col-span-5">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-[36px] border border-white/5 bg-[#222224] p-8 shadow-2xl sm:p-10"
        >
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <OrbitMark className="h-8 w-8" />
            <span className="text-2xl font-bold text-white">Orbit</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white">
            {mode === "login" ? "Welcome back" : "Join Orbit"}
          </h1>
          <p className="mt-2 text-xs text-zinc-400">
            {mode === "login"
              ? "Sign in to access your library, playlists and favourites."
              : "Create an account to start building your library."}
          </p>

          {mode === "signup" ? (
            <label className="mt-6 block text-xs font-semibold text-zinc-400">
              Your name
              <input
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="e.g. Miles Davis"
                className={inputClass}
              />
            </label>
          ) : null}

          <label className={`${mode === "signup" ? "mt-4" : "mt-6"} block text-xs font-semibold text-zinc-400`}>
            Email address
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@domain.com"
              className={inputClass}
            />
          </label>

          <label className="mt-4 block text-xs font-semibold text-zinc-400">
            Password
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </label>

          {message ? (
            <p className="mt-4 rounded-2xl bg-blue-500/10 px-4 py-2.5 text-xs font-medium text-blue-300">
              {message}
            </p>
          ) : null}

          <button
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-500 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
          </button>

          <p className="mt-6 text-center text-xs text-zinc-400">
            {mode === "login" ? (
              <>
                New here?{" "}
                <Link href="/signup" className="font-bold text-white hover:underline">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already a member?{" "}
                <Link href="/login" className="font-bold text-white hover:underline">
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