"use client";

import { OrbitMark } from "@/components/icon-rail";
import { createClient } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Loader2,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const inputClass =
  "mt-1.5 w-full rounded-full border border-white/10 bg-[#1a1a1c] px-5 py-3 text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500";

function AuthScreenContent({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(() => searchParams.get("invite") || "");
  const [inviteVerified, setInviteVerified] = useState(false);
  const [inviteTier, setInviteTier] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [hasPasskeySupport, setHasPasskeySupport] = useState(false);

  const configured = isConfigured();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasPasskeySupport(
        Boolean(window.PublicKeyCredential && window.navigator?.credentials),
      );
    }
  }, []);

  // Pre-validate invite code if passed in URL
  useEffect(() => {
    const codeInUrl = searchParams.get("invite");
    if (codeInUrl && mode === "signup") {
      void verifyCode(codeInUrl);
    }
  }, [searchParams, mode]);

  async function verifyCode(code: string): Promise<boolean> {
    if (!code.trim()) {
      setInviteVerified(false);
      setInviteTier(null);
      return false;
    }

    try {
      const res = await fetch("/api/invite/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setInviteVerified(true);
        setInviteTier(data.tier || "VIP Member");
        return true;
      } else {
        setInviteVerified(false);
        setInviteTier(null);
        return false;
      }
    } catch {
      setInviteVerified(false);
      setInviteTier(null);
      return false;
    }
  }

  async function handlePasskeySignIn() {
    setMessage(null);
    setIsError(false);
    if (!configured) {
      setMessage("Add your Supabase keys to .env.local first.");
      setIsError(true);
      return;
    }

    setPasskeyBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPasskey();

      if (error) {
        if (error.message.includes("cancelled") || error.message.includes("abort")) {
          setMessage("Passkey authentication was dismissed.");
        } else {
          setMessage(error.message || "Failed to authenticate with passkey.");
        }
        setIsError(true);
        return;
      }

      if (data?.session) {
        setMessage("Passkey authenticated! Loading Orbit...");
        router.replace("/home");
        router.refresh();
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Passkey sign-in failed");
      setIsError(true);
    } finally {
      setPasskeyBusy(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setIsError(false);

    if (!configured) {
      setMessage("Add your Supabase keys to .env.local first.");
      setIsError(true);
      return;
    }

    // If signup mode, enforce invite code requirement
    if (mode === "signup") {
      const valid = await verifyCode(inviteCode);
      if (!valid) {
        setMessage("A valid invitation code is required to register. Orbit is currently invite-only.");
        setIsError(true);
        return;
      }
    }

    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              invite_code: inviteCode.trim().toUpperCase(),
              invite_tier: inviteTier || "VIP Member",
            },
          },
        });
        if (error) throw error;

        setMessage("Account created! Welcome to Orbit.");
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
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh w-full bg-[#121214] lg:grid-cols-12">
      {/* Left brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-white/5 bg-gradient-to-br from-[#121215] via-[#1a1920] to-[#0c0c0e] p-12 text-white lg:col-span-6 lg:flex lg:flex-col lg:justify-between xl:col-span-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <OrbitMark className="h-8 w-8" />
            <span className="text-2xl font-bold tracking-tight text-white">Orbit</span>
          </Link>
        </div>

        <div className="relative z-10 my-auto py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 mb-6">
            <Fingerprint className="h-3.5 w-3.5" />
            <span>Biometric Passkeys Enabled</span>
          </div>

          <h2 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Pure sound, beautifully in orbit.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-400">
            Private bit-perfect lossless audio streaming, ambient full-screen stage, synced lyrics, and offline storage.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-zinc-500">
          <span>© 2026 Orbit Music</span>
          <Link href="/" className="hover:text-white transition">
            Back to Overview
          </Link>
        </div>
      </aside>

      {/* Right form container */}
      <main className="flex items-center justify-center p-6 lg:col-span-6 xl:col-span-5">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-[36px] border border-white/5 bg-[#1b1b1f] p-8 shadow-2xl sm:p-10"
        >
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <OrbitMark className="h-8 w-8" />
              <span className="text-2xl font-bold text-white">Orbit</span>
            </Link>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white">
            {mode === "login" ? "Welcome back" : "Join Orbit"}
          </h1>
          <p className="mt-2 text-xs text-zinc-400">
            {mode === "login"
              ? "Sign in to access your private library and lossless audio vault."
              : "Orbit is private and invite-only. Enter your invitation code to register."}
          </p>

          {/* Passkey Sign In Button (Prominently displayed on login) */}
          {mode === "login" && hasPasskeySupport && (
            <div className="mt-6">
              <button
                type="button"
                onClick={handlePasskeySignIn}
                disabled={passkeyBusy}
                className="group relative flex w-full items-center justify-center gap-2.5 rounded-full border border-blue-500/30 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-blue-600/20 p-3.5 text-xs font-bold text-white shadow-lg shadow-blue-500/10 transition hover:border-blue-400 hover:from-blue-600/30 hover:to-indigo-600/30 active:scale-[0.98]"
              >
                {passkeyBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                ) : (
                  <Fingerprint className="h-4 w-4 text-blue-400 transition group-hover:scale-110" />
                )}
                <span>Sign in with Passkey</span>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300">
                  Touch ID / Face ID
                </span>
              </button>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  or with password
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
            </div>
          )}

          {/* Invitation Code field on signup */}
          {mode === "signup" && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-400">
                  Private Invitation Code
                </label>
                {inviteVerified && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {inviteTier || "Verified"}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  required
                  value={inviteCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setInviteCode(val);
                    void verifyCode(val);
                  }}
                  placeholder="e.g. ORBIT-VIP"
                  className={`${inputClass} tracking-wider uppercase pr-10`}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Ticket className="h-4 w-4" />
                </div>
              </div>
              {!inviteVerified && inviteCode && (
                <p className="mt-1.5 text-[11px] text-amber-400">
                  Checking invitation validity...
                </p>
              )}
            </div>
          )}

          {mode === "signup" ? (
            <label className="mt-4 block text-xs font-semibold text-zinc-400">
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

          <label className="mt-4 block text-xs font-semibold text-zinc-400">
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
            <div
              className={`mt-4 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-medium ${isError
                ? "border border-red-500/20 bg-red-500/10 text-red-300"
                : "border border-blue-500/20 bg-blue-500/10 text-blue-300"
                }`}
            >
              {isError ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-400" />
              )}
              <span>{message}</span>
            </div>
          ) : null}

          <button
            disabled={busy || passkeyBusy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{mode === "login" ? "Sign In" : "Unlock & Register"}</span>
          </button>

          <div className="mt-6 text-center text-xs text-zinc-400 space-y-2">
            <p>
              {mode === "login" ? (
                <>
                  Have an invite code?{"  "}
                  <Link href="/signup" className="font-bold text-white hover:underline">
                    Create an account
                  </Link>
                </>
              ) : (
                <>
                  Already an invited member?{" "}
                  <Link href="/login" className="font-bold text-white hover:underline">
                    Sign in
                  </Link>
                </>
              )}
            </p>
            <p>
              <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition">
                ← Return to Invitation Overview
              </Link>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}

export function AuthScreen({ mode }: { mode: "login" | "signup" }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center bg-[#121214] text-white">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
        </div>
      }
    >
      <AuthScreenContent mode={mode} />
    </Suspense>
  );
}
