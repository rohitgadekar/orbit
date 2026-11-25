"use client";

import { createClient } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// Note: text-[16px] is essential for mobile iOS Safari to prevent auto-zooming on input focus.
const inputClass =
  "mt-1.5 w-full rounded-full border border-white/10 bg-[#161619] px-5 py-3 text-[16px] sm:text-sm font-medium text-white outline-none transition placeholder:text-zinc-600 focus:border-white/30 focus:ring-1 focus:ring-white/15";

function AuthScreenContent({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        setMessage("Passkey authenticated! Loading Velar...");
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
        setMessage("A valid invitation code is required to register. Velar is currently invite-only.");
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

        setMessage("Account created! Welcome to Velar.");
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
    <div className="grid min-h-dvh w-full bg-[#080808] text-[#e8e8ea] lg:grid-cols-12 selection:bg-[#e8e8ea] selection:text-[#080808]">
      {/* Left brand panel (visible on large displays) */}
      <aside className="relative hidden overflow-hidden border-r border-white/5 bg-gradient-to-br from-[#0c0c0e] via-[#121215] to-[#080808] p-12 text-white lg:col-span-6 lg:flex lg:flex-col lg:justify-between xl:col-span-7">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-500/[0.035] blur-[140px]" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-indigo-500/[0.03] blur-[150px]" />

        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/orbit-logo.png"
              alt="Velar Logo"
              className="h-8 w-8 object-contain rounded-lg shrink-0 shadow-md transition-transform group-hover:scale-105"
            />
            <span className="text-2xl font-bold tracking-tight text-white">Velar</span>
          </Link>
          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-[11px] font-mono font-bold text-blue-400 uppercase tracking-widest">
            24-Bit FLAC Studio
          </span>
        </div>

        <div className="relative z-10 my-auto py-10 max-w-xl">


          <h2 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Hi-Res 24-Bit Audio. <br />
            <span className="font-serif italic font-normal text-white/90">Hear every detail at no cost</span>.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400 max-w-lg">
            Velar is a private streaming sanctuary for purists. Stream bit-perfect 24-bit FLAC audio up to 192kHz with zero advertising, zero monthly fees, and unthrottled dedicated bandwidth.
          </p>

          {/* Audiophile Specs Quick Cards matching landing page */}
          <div className="mt-8 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm">
              <span className="text-white font-mono font-bold block text-sm">24-Bit / 192kHz</span>
              <span className="text-zinc-400 text-xs mt-0.5 block">Bit-perfect studio FLAC</span>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm">
              <span className="text-white font-bold block text-sm">144 dB Range</span>
              <span className="text-zinc-400 text-xs mt-0.5 block">Zero dynamic compression</span>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm">
              <span className="text-white font-bold block text-sm">100% Free Forever</span>
              <span className="text-zinc-400 text-xs mt-0.5 block">No subscription fees</span>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm">
              <span className="text-white font-mono font-bold block text-sm">Invite Only</span>
              <span className="text-zinc-400 text-xs mt-0.5 block">Dedicated streaming edge</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/5 pt-6 text-xs text-zinc-500">
          <span>© 2026 Velar Music • Private Sanctuary</span>
          <Link href="/" className="hover:text-white transition">
            ← Return to Overview
          </Link>
        </div>
      </aside>

      {/* Right form container (Mobile & Desktop optimized) */}
      <main className="flex items-center justify-center p-4 sm:p-6 md:p-8 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] lg:col-span-6 xl:col-span-5">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-[32px] sm:rounded-[36px] border border-white/10 bg-[#121215] p-6 sm:p-10 shadow-2xl"
        >
          {/* Mobile Header Logo */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/orbit-logo.png"
                alt="Velar Logo"
                className="h-8 w-8 object-contain rounded-lg shrink-0 shadow-md"
              />
              <span className="text-2xl font-bold text-white tracking-tight">Velar</span>
            </Link>
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-mono text-blue-400 uppercase font-semibold">
              24-Bit FLAC
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {mode === "login" ? "Welcome back" : "Join Velar"}
          </h1>
          <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
            {mode === "login"
              ? "Sign in to access your bit-perfect 24-bit library and offline music."
              : "Velar is invite-only. Enter your invitation code to unlock your 24-bit FLAC station at no cost."}
          </p>

          {/* Passkey Sign In Option (on login) */}
          {mode === "login" && hasPasskeySupport && (
            <div className="mt-6">
              <button
                type="button"
                onClick={handlePasskeySignIn}
                disabled={passkeyBusy}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border border-white/10 bg-[#161619] p-3.5 text-xs font-semibold text-white shadow-md transition hover:border-white/20 hover:bg-[#1c1c20] active:scale-[0.98]"
              >
                {passkeyBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                ) : (
                  <Fingerprint className="h-4 w-4 text-zinc-300" />
                )}
                <span>Passkey</span>
              </button>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  or with password
                </span>
                <span className="h-px flex-1 bg-white/5" />
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
                  placeholder="e.g. VELAR-VIP"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className={`${inputClass} tracking-widest uppercase pr-10`}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Ticket className="h-4 w-4" />
                </div>
              </div>
              {!inviteVerified && inviteCode && (
                <p className="mt-1 text-[11px] text-amber-400">
                  Checking invitation code...
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
                autoComplete="name"
                autoCapitalize="words"
                spellCheck={false}
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
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={inputClass}
            />
          </label>

          <label className="mt-4 block text-xs font-semibold text-zinc-400">
            Password
            <div className="relative">
              <input
                required
                minLength={6}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {message ? (
            <div
              className={`mt-4 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-medium ${isError
                ? "border border-rose-500/20 bg-rose-500/10 text-rose-300"
                : "border border-white/10 bg-white/5 text-zinc-300"
                }`}
            >
              {isError ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              )}
              <span>{message}</span>
            </div>
          ) : null}

          <button
            disabled={busy || passkeyBusy}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#e8e8ea] py-3.5 text-xs font-bold text-[#080808] transition hover:bg-white active:scale-[0.98] disabled:opacity-50 shadow-lg"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{mode === "login" ? "Sign In to Station" : "Unlock Station & Register"}</span>
          </button>

          <div className="mt-6 text-center text-xs text-zinc-400 space-y-2">
            <p>
              {mode === "login" ? (
                <>
                  Have an invite code?{" "}
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
                ← Return to Velar Overview
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
        <div className="grid min-h-dvh place-items-center bg-[#080808] text-white">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      }
    >
      <AuthScreenContent mode={mode} />
    </Suspense>
  );
}
