"use client";

import { createClient } from "@/lib/supabase/client";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Disc,
  Download,
  Headphones,
  Keyboard,
  Layers,
  ListMusic,
  Loader2,
  Lock,
  Maximize2,
  Mic2,
  Music,
  Radio,
  ShieldCheck,
  Sliders,
  Sparkles,
  Ticket,
  Volume2,
  WifiOff,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();

  // Invite code validation state
  const [inviteCode, setInviteCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState<{
    valid: boolean;
    message: string;
    tier?: string;
  } | null>(null);

  // Active member session check
  const [currentUser, setCurrentUser] = useState<{ email?: string } | null>(null);

  // Request invite modal state
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistNote, setWaitlistNote] = useState("");
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const supabase = createClient();
        supabase.auth.getSession().then(({ data }) => {
          if (data?.session?.user) {
            setCurrentUser(data.session.user);
          }
        });
      } catch {
        // Non-fatal
      }
    }
  }, []);

  async function handleVerifyInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setVerifyingCode(true);
    setCodeFeedback(null);

    try {
      const res = await fetch("/api/invite/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        setCodeFeedback({
          valid: true,
          message: data.message || "Invitation verified! Welcome to Velar.",
          tier: data.tier,
        });
        setTimeout(() => {
          router.push(`/signup?invite=${encodeURIComponent(inviteCode.trim().toUpperCase())}`);
        }, 700);
      } else {
        setCodeFeedback({
          valid: false,
          message: data.error || "Invalid invitation code.",
        });
      }
    } catch {
      setCodeFeedback({
        valid: false,
        message: "Failed to verify invitation code. Please try again.",
      });
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!waitlistEmail) return;

    setWaitlistBusy(true);
    setWaitlistError(null);

    try {
      const res = await fetch("/api/invite/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: waitlistEmail,
          name: waitlistName,
          note: waitlistNote,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setWaitlistSuccess(true);
      } else {
        setWaitlistError(data.error || "Failed to submit request.");
      }
    } catch (err: unknown) {
      setWaitlistError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setWaitlistBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#080808] text-[#e8e8ea] selection:bg-[#e8e8ea] selection:text-[#080808]">
      {/* Subtle deep ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-blue-500/[0.03] blur-[150px]" />
        <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-500/[0.025] blur-[140px]" />
        <div className="absolute bottom-10 left-1/4 h-[550px] w-[550px] rounded-full bg-white/[0.02] blur-[160px]" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#080808]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/orbit-logo.png"
              alt="Velar Logo"
              className="h-8 w-8 object-contain rounded-lg shrink-0 shadow-md transition-transform duration-500 group-hover:scale-105"
            />
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight text-white">Velar</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-8 text-xs font-medium text-zinc-400 md:flex">
            <a href="#fidelity" className="transition hover:text-white">
              24-Bit Audio
            </a>
            <a href="#why-flac" className="transition hover:text-white">
              Why FLAC
            </a>
            <a href="#features" className="transition hover:text-white">
              Capabilities
            </a>
            <a href="#formats" className="transition hover:text-white">
              Formats
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <Link
                href="/home"
                className="flex items-center gap-2 rounded-full bg-[#e8e8ea] px-5 py-2 text-xs font-bold text-[#080808] transition hover:bg-white active:scale-95 shadow-lg"
              >
                <span>Open Player</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowWaitlistModal(true)}
                  className="hidden text-xs font-semibold text-zinc-400 transition hover:text-white sm:inline-block"
                >
                  Request Invite
                </button>

                <Link
                  href="/login"
                  className="rounded-full border border-white/10 bg-[#121214] px-4 py-1 text-xs font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-[#1a1a1d] hover:text-white"
                >
                  Sign In
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("invite-box");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-full bg-[#e8e8ea] px-4 py-1 text-xs font-bold text-[#080808] transition hover:bg-white active:scale-95 shadow-md"
                >
                  Enter Code
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-20 md:px-10 md:pt-24 lg:pt-32">
        <div className="flex flex-col items-center text-center">
          {/* Exclusivity & Audio Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#121214] px-4 py-1.5 text-xs font-semibold text-zinc-300 shadow-sm backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-blue-400 font-bold">
              Hi-Res Audio
            </span>
          </div>

          {/* Main Editorial Headline */}
          <h1 className="mt-8 max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[76px] lg:leading-[1.1]">
            Hi-Res 24-Bit FLAC Audio. <br />
            <span className="font-serif italic font-normal text-white/90">Hear Every Detail at No Cost</span>.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Velar is a private, uncompressed audio streaming website built exclusively for purists. No lossy compression, no volume smearing, no commercial tracking, and zero ads. Hear delicate room reverbs, vocal transients, and sub-bass harmonics exactly as mastered in the studio.
          </p>

          {/* Audiophile Specs Quick Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs font-medium text-zinc-400">
            <span className="rounded-full border border-white/10 bg-[#121214] px-3.5 py-1.5 text-zinc-200">
              <span className="text-blue-400 font-mono font-bold mr-1.5">24-Bit</span> / 192kHz Master
            </span>
            <span className="rounded-full border border-white/10 bg-[#121214] px-3.5 py-1.5 text-zinc-200">
              Bit-Perfect FLAC & ALAC
            </span>
            <span className="rounded-full border border-white/10 bg-[#121214] px-3.5 py-1.5 text-zinc-200">
              100% Free Forever
            </span>
            <span className="rounded-full border border-white/10 bg-[#121214] px-3.5 py-1.5 text-zinc-200">
              Zero Ads Ever
            </span>
            <span className="rounded-full border border-white/10 bg-[#121214] px-3.5 py-1.5 text-zinc-200">
              True Offline Cache
            </span>
            <span className="rounded-full border border-white/10 bg-[#121214] px-3.5 py-1.5 text-zinc-200">
              Private Cohort
            </span>
          </div>

          {/* Invitation Code Verification Form */}
          <div id="invite-box" className="mt-10 w-full max-w-lg scroll-mt-32">
            <form
              onSubmit={handleVerifyInvite}
              className="relative flex items-center rounded-full border border-white/10 bg-[#121214] p-1.5 shadow-2xl transition focus-within:border-white/30"
            >
              <div className="pl-4 text-zinc-500">
                <Ticket className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase());
                  setCodeFeedback(null);
                }}
                placeholder="ENTER INVITATION CODE..."
                className="w-full bg-transparent px-3 py-2 text-xs font-mono font-semibold tracking-widest text-white uppercase placeholder:text-zinc-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={verifyingCode || !inviteCode.trim()}
                className="flex shrink-0 items-center gap-2 rounded-full bg-[#e8e8ea] px-5 py-2.5 text-xs font-bold text-[#080808] transition hover:bg-white active:scale-95 disabled:opacity-40"
              >
                {verifyingCode ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Unlock Studio</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Verification Feedback Message */}
            {codeFeedback && (
              <div
                className={`mt-3 flex items-center justify-center gap-2 rounded-2xl p-3 text-xs font-semibold ${codeFeedback.valid
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border border-rose-500/20 bg-rose-500/10 text-rose-300"
                  }`}
              >
                {codeFeedback.valid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>
                      {codeFeedback.message} {codeFeedback.tier && `(${codeFeedback.tier})`} — Opening registration...
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>{codeFeedback.message}</span>
                  </>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-zinc-500">
              <span>Need an invitation?</span>
              <button
                type="button"
                onClick={() => setShowWaitlistModal(true)}
                className="font-medium text-white underline underline-offset-4 hover:text-zinc-300 transition"
              >
                Join Private Waitlist
              </button>
              <span>•</span>
              <Link href="/login" className="text-zinc-400 hover:text-white transition">
                Member Sign In
              </Link>
            </div>
          </div>

          {/* ── Web Music Player Window (Deck) ────────────────────────────── */}
          <div className="relative mt-16 sm:mt-24 w-full max-w-6xl">



            {/* Deck Window Screenshot */}
            <div className="relative aspect-[3164/1904] w-full overflow-hidden">
              <img
                src="/deck.png"
                alt="Velar Deck — Web Music Player Window"
                className="h-full w-full object-cover object-top select-none"
                loading="eager"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Section 1: The 24-Bit FLAC Audiophile Difference */}
      <section id="why-flac" className="relative z-10 border-t border-white/5 bg-[#0a0a0d] py-24 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-blue-400">
              The Acoustic Reality
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Commercial Streaming vs. Velar 24-Bit FLAC
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-zinc-400 sm:text-base">
              Standard commercial platforms aggressively compress audio down to lossy 160–320 kbps MP3/AAC to cut server bandwidth, stripping away subtle micro-harmonics, ambient air, and instrument separation. Velar delivers native, uncompressed 24-bit master recordings with zero dynamic loss.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {/* Standard Compressed Streaming */}
            <div className="rounded-[32px] border border-white/5 bg-[#101013] p-8 md:p-10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Conventional Streaming
                  </span>
                  <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[11px] font-mono font-semibold text-rose-400">
                    Lossy 160–320 kbps
                  </span>
                </div>
                <h3 className="mt-6 text-2xl font-bold text-zinc-300">Compressed & Smeared</h3>
                <ul className="mt-6 space-y-4 text-xs sm:text-sm text-zinc-400">
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 mt-0.5">✕</span>
                    <span>High frequencies clipped above 16kHz to reduce bandwidth</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 mt-0.5">✕</span>
                    <span>Dynamic range squashed through aggressive loudness normalization</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 mt-0.5">✕</span>
                    <span>Acoustic room reflections and vocal breath flattened into digital noise</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-rose-400 mt-0.5">✕</span>
                    <span>Monthly recurring subscription paywalls and promotional interruptions</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 border-t border-white/5 pt-4 text-xs font-mono text-zinc-600">
                16-Bit Capped • Lossy Compression
              </div>
            </div>

            {/* Velar 24-Bit FLAC */}
            <div className="rounded-[32px] border border-blue-500/20 bg-gradient-to-b from-[#121624] to-[#0c0e17] p-8 md:p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-bold">
                    Velar Studio Master
                  </span>
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-[11px] font-mono font-bold text-blue-300">
                    24-Bit / 96–192 kHz FLAC
                  </span>
                </div>
                <h3 className="mt-6 text-2xl font-bold text-white">Hear Every Subtle Detail</h3>
                <ul className="mt-6 space-y-4 text-xs sm:text-sm text-zinc-300">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>144 dB Dynamic Range:</strong> From faint acoustic whispers to thunderous orchestral crests with zero distortion</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>Bit-Perfect DAC Output:</strong> Exact studio master waveform streamed with native HTTP 206 range seeking</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>Razor-Sharp Transients:</strong> Pinpoint instrument placement, string vibrations, and authentic room acoustics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>100% At No Cost:</strong> Zero subscription fees, zero ads, and zero credit cards required</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 border-t border-white/10 pt-4 flex items-center justify-between text-xs font-mono text-blue-300">
                <span>Bit-Perfect Studio Master</span>
                <span>Up to 9,216 kbps</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Core Audiophile Pillars */}
      <section id="fidelity" className="relative z-10 border-t border-white/5 py-24 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              The Velar Ethos
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Engineered For True Purists
            </h2>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              Three founding principles guide every line of code inside Velar.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Pillar 1 */}
            <div className="rounded-[32px] border border-white/5 bg-[#101013] p-8 flex flex-col justify-between">
              <div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-400">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">Hear Every Micro-Detail</h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  Experience acoustic nuances you never knew existed in your favorite tracks. Delicate guitar fret slides, decay of cymbal overtones, room acoustics, and intimate vocal air render with lifelike presence.
                </p>
              </div>
              <div className="mt-8 border-t border-white/5 pt-4 text-xs font-mono text-zinc-500">
                24-bit studio precision
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-[32px] border border-white/5 bg-[#101013] p-8 flex flex-col justify-between">
              <div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">At No Cost, Without Catch</h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  Velar is not a commercial product. There are no paid tiers, no upsells, no feature restrictions, and no advertising. High-fidelity audio is preserved as a private, uncompromised craft for our community.
                </p>
              </div>
              <div className="mt-8 border-t border-white/5 pt-4 text-xs font-mono text-zinc-500">
                Zero fees • 100% free
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-[32px] border border-white/5 bg-[#101013] p-8 flex flex-col justify-between">
              <div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400/10 text-amber-300">
                  <Ticket className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">Private & Invite Only</h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  We purposefully limit membership to a curated cohort. Keeping the network invite-only protects dedicated cloud audio egress, eliminates bandwidth throttling, and prevents commercial bloat.
                </p>
              </div>
              <div className="mt-8 border-t border-white/5 pt-4 text-xs font-mono text-zinc-500">
                Dedicated unthrottled edge
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Core Audio Capabilities */}
      <section id="features" className="relative z-10 border-t border-white/5 bg-[#0a0a0d] py-24 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              Modern Listening Suite
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything An Audiophile Demands
            </h2>
            <p className="mt-4 mx-auto max-w-xl text-sm text-zinc-400">
              Crafted from scratch for uncompromised playback quality and elegant minimalism.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-[32px] border border-white/5 bg-[#111114] p-7 transition hover:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white">
                <Headphones className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Bit-Perfect Audio Engine</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Native HTTP 206 Range seeking ensures instant scrubbing without re-downloading audio chunks. Unaltered FLAC decoded straight to your audio output device.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-[32px] border border-white/5 bg-[#111114] p-7 transition hover:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white">
                <Maximize2 className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Ambient Full-Screen Stage</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Transforms your laptop or studio monitor into an ambient vinyl display with album-matching backlight glow, custom typography, and real-time lyric projection.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-[32px] border border-white/5 bg-[#111114] p-7 transition hover:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white">
                <Mic2 className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Synchronized Millisecond Lyrics</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Sing along or follow the poetic phrasing with line-by-line synchronized LRC lyrics that highlight smoothly in real time with the artist&apos;s cadence.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-[32px] border border-white/5 bg-[#111114] p-7 transition hover:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white">
                <Download className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Lossless Offline Cache</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Save complete albums and tracks locally into browser IndexedDB storage. Experience bit-perfect playback on flights, subways, or remote listening spots.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-[32px] border border-white/5 bg-[#111114] p-7 transition hover:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white">
                <Keyboard className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Keyboard Control & Floating PiP</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Instant desktop hotkeys (Space to toggle, arrows to seek/volume) plus Picture-in-Picture floating audio controls while working in other apps.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-[32px] border border-white/5 bg-[#111114] p-7 transition hover:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white">
                <ListMusic className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Personal Library Curation</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Build custom folders, tag favorites, view high-res artist portraits, and re-listen to your tailored listening mix without algorithmic clutter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Formats & Technical Compatibility */}
      <section id="formats" className="relative z-10 border-t border-white/5 py-24 scroll-mt-20">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              Uncompressed Fidelity
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Supported Audio Formats
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Velar plays your studio master files directly without transcoding or compression.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 text-center">
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
              <span className="text-xl font-bold text-white">FLAC</span>
              <p className="mt-1 text-[11px] font-mono text-blue-400 font-semibold">24-bit / 192kHz</p>
              <p className="mt-2 text-[10px] text-zinc-300">Studio Master</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#111114] p-5">
              <span className="text-xl font-bold text-white">ALAC</span>
              <p className="mt-1 text-[11px] font-mono text-zinc-500">Apple Lossless</p>
              <p className="mt-2 text-[10px] text-zinc-400">Bit-Perfect M4A</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#111114] p-5">
              <span className="text-xl font-bold text-white">WAV</span>
              <p className="mt-1 text-[11px] font-mono text-zinc-500">Linear PCM</p>
              <p className="mt-2 text-[10px] text-zinc-400">Uncompressed Raw</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#111114] p-5">
              <span className="text-xl font-bold text-white">AAC</span>
              <p className="mt-1 text-[11px] font-mono text-zinc-500">Up to 320kbps</p>
              <p className="mt-2 text-[10px] text-zinc-400">High Efficiency</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#111114] p-5">
              <span className="text-xl font-bold text-white">MP3</span>
              <p className="mt-1 text-[11px] font-mono text-zinc-500">320kbps CBR</p>
              <p className="mt-2 text-[10px] text-zinc-400">Universal Legacy</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: How It Works */}
      <section id="how-it-works" className="relative z-10 border-t border-white/5 bg-[#0a0a0d] py-24 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              Simple & Private
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How Velar Works
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Access is straightforward once you have an invitation code.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="rounded-[32px] border border-white/5 bg-[#101013] p-8 text-center">
              <span className="inline-block rounded-full bg-white/5 px-4 py-1 text-xs font-mono font-bold text-zinc-400">
                Step 01
              </span>
              <h3 className="mt-5 text-lg font-bold text-white">Receive an Invitation</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Existing members share private invitation codes with trusted friends and audiophiles, or you can join our private waitlist.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-[32px] border border-white/5 bg-[#101013] p-8 text-center">
              <span className="inline-block rounded-full bg-white/5 px-4 py-1 text-xs font-mono font-bold text-zinc-400">
                Step 02
              </span>
              <h3 className="mt-5 text-lg font-bold text-white">Unlock Your Station</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Enter your code in the unlock box above. Once verified, choose your display name and set up your private account credentials.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-[32px] border border-white/5 bg-[#101013] p-8 text-center">
              <span className="inline-block rounded-full bg-white/5 px-4 py-1 text-xs font-mono font-bold text-zinc-400">
                Step 03
              </span>
              <h3 className="mt-5 text-lg font-bold text-white">Stream at Zero Cost</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Listen ad-free on your laptop, DAC system, phone, or tablet. Install Velar as a native PWA on iOS and Android with offline caching.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: FAQ */}
      <section id="faq" className="relative z-10 border-t border-white/5 bg-[#0a0a0d] py-24 scroll-mt-20">
        <div className="mx-auto max-w-4xl px-6 md:px-10">
          <div className="text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              Questions & Answers
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            {[
              {
                q: "What is Velar?",
                a: "Velar is an invite-only personal music streaming sanctuary engineered for high-resolution 24-bit FLAC audio playback. It gives you a clean, 100% ad-free listening experience with synchronized lyrics, offline downloads, and an ambient player.",
              },
              {
                q: "Why 24-bit FLAC audio?",
                a: "24-bit audio provides up to 144 dB of dynamic range, capturing micro-details such as acoustic instrument reverberations, vocal transients, and room dimensions that commercial 160-320 kbps streaming platforms destroy through lossy compression.",
              },
              {
                q: "Is Velar really at no cost?",
                a: "Yes. Velar is completely free for members. There are no monthly subscription fees, no in-app purchases, and no advertisements.",
              },
              {
                q: "Why is Velar invite-only?",
                a: "Uncompressed 24-bit FLAC files require substantial bandwidth. Keeping Velar invite-only ensures our streaming edge stays lightning fast, non-congested, and buffered-free for every member.",
              },
              {
                q: "How can I get an invite code?",
                a: "Invite codes are distributed by existing members. If you don't have one, submit your details through the 'Join Private Waitlist' button on this page.",
              },
              {
                q: "Does offline mode work on mobile phones?",
                a: "Yes. When you download tracks in Velar, they are saved locally into your device's browser storage using IndexedDB. You can play downloaded songs completely offline without an internet connection.",
              },
              {
                q: "Can I install Velar as an app on my phone?",
                a: "Yes. Velar is a Progressive Web App (PWA). On iPhone/iOS, tap 'Share' -> 'Add to Home Screen'. On Android, tap the three dots in Chrome -> 'Install app'. It will launch like a native application with lock-screen media controls.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-[28px] border border-white/5 bg-[#121215] p-6 transition hover:border-white/10"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between text-left text-sm font-bold text-white"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-zinc-400 transition-transform duration-300 ${openFaq === idx ? "rotate-180" : ""
                      }`}
                  />
                </button>
                {openFaq === idx && (
                  <p className="mt-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: Final Invitation CTA Banner */}
      <section className="relative z-10 border-t border-white/5 py-24">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="rounded-[40px] border border-white/10 bg-gradient-to-b from-[#141418] to-[#0c0c0e] p-10 text-center sm:p-16 shadow-2xl">
            <img
              src="/orbit-logo.png"
              alt="Velar"
              className="mx-auto h-12 w-12 rounded-xl object-contain drop-shadow-xl"
            />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Hear Every Detail?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
              Enter your invitation code to unlock your private 24-bit FLAC audio station.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("invite-box");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-full bg-[#e8e8ea] px-7 py-3.5 text-xs font-bold text-[#080808] transition hover:bg-white active:scale-95 shadow-xl"
              >
                Enter Code Above
              </button>

              <button
                type="button"
                onClick={() => setShowWaitlistModal(true)}
                className="rounded-full border border-white/10 bg-[#161619] px-7 py-3.5 text-xs font-bold text-zinc-200 transition hover:bg-white/10 hover:text-white"
              >
                Request Waitlist Access
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      < footer className="relative z-10 border-t border-white/5 bg-[#080808] py-12 text-xs text-zinc-500" >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row md:px-10">
          <div className="flex items-center gap-3">
            <img src="/orbit-logo.png" alt="Velar Logo" className="h-6 w-6 rounded object-contain" />
            <span className="font-bold text-white">Velar</span>
            <span className="text-zinc-600">•</span>
            <span>Hi-Res 24-Bit FLAC Audio • At No Cost • Invite Only</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition">
              Member Sign In
            </Link>
            <button
              type="button"
              onClick={() => setShowWaitlistModal(true)}
              className="hover:text-white transition"
            >
              Request Access
            </button>
            <span>© 2026 Velar</span>
          </div>
        </div>
      </footer >

      {/* Request Invite Modal */}
      {
        showWaitlistModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-[36px] border border-white/10 bg-[#121215] p-8 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Ticket className="h-5 w-5 text-amber-300" />
                  <h3 className="text-lg font-bold text-white">Join Private Waitlist</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowWaitlistModal(false);
                    setWaitlistError(null);
                  }}
                  className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              {waitlistSuccess ? (
                <div className="mt-6 text-center py-6">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
                  <h4 className="mt-4 text-lg font-bold text-white">You&apos;re on the Private Waitlist</h4>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    Your request has been saved. We will email an invitation code to{" "}
                    <span className="font-semibold text-white">{waitlistEmail}</span> when a slot opens.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowWaitlistModal(false);
                      setWaitlistSuccess(false);
                      setWaitlistEmail("");
                      setWaitlistName("");
                      setWaitlistNote("");
                    }}
                    className="mt-6 rounded-full bg-[#e8e8ea] px-6 py-2.5 text-xs font-bold text-[#080808]"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleWaitlistSubmit} className="mt-6 space-y-4">
                  <p className="text-xs text-zinc-400">
                    Velar is invitation-only to maintain ad-free, unthrottled 24-bit FLAC streaming at no cost. Enter your email to request access.
                  </p>

                  {waitlistError && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                      <span>{waitlistError}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={waitlistName}
                      onChange={(e) => setWaitlistName(e.target.value)}
                      placeholder="e.g. John Coltrane"
                      className="mt-1.5 w-full rounded-full border border-white/10 bg-[#0c0c0e] px-5 py-3 text-xs text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="mt-1.5 w-full rounded-full border border-white/10 bg-[#0c0c0e] px-5 py-3 text-xs text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Note / Audio Setup (Optional)
                    </label>
                    <input
                      type="text"
                      value={waitlistNote}
                      onChange={(e) => setWaitlistNote(e.target.value)}
                      placeholder="e.g. Sennheiser HD650, Schiit DAC, audiophile listener"
                      className="mt-1.5 w-full rounded-full border border-white/10 bg-[#0c0c0e] px-5 py-3 text-xs text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={waitlistBusy || !waitlistEmail}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#e8e8ea] py-3.5 text-xs font-bold text-[#080808] transition hover:bg-white active:scale-95 disabled:opacity-50"
                    >
                      {waitlistBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span>Submit Request</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )
      }
    </div>
  );
}
