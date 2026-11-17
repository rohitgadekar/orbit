"use client";

import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Compass,
  Download,
  FolderHeart,
  HardDrive,
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
  Shield,
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
          message: data.message || "Invitation verified! Welcome to Orbit.",
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
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-white/[0.025] blur-[150px]" />
        <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-white/[0.02] blur-[140px]" />
        <div className="absolute bottom-10 left-1/4 h-[550px] w-[550px] rounded-full bg-white/[0.02] blur-[160px]" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#080808]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/orbit-logo.png"
              alt="Orbit Logo"
              className="h-8 w-8 object-contain rounded-lg shrink-0 shadow-md transition-transform duration-500 group-hover:scale-105"
            />
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight text-white">Orbit</span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:inline-block">
                Private Music
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-8 text-xs font-medium text-zinc-400 md:flex">
            <a href="#about" className="transition hover:text-white">
              About
            </a>
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-white">
              How It Works
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
                  className="rounded-full border border-white/10 bg-[#121214] px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/20 hover:bg-[#1a1a1d] hover:text-white"
                >
                  Sign In
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("invite-box");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-full bg-[#e8e8ea] px-4 py-2 text-xs font-bold text-[#080808] transition hover:bg-white active:scale-95 shadow-md"
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
          {/* Exclusivity Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#121214] px-4 py-1.5 text-xs font-semibold text-zinc-300 shadow-sm backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
              100% Ad-Free
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs font-medium text-white">Private & Invite Only</span>
          </div>

          {/* Main Editorial Headline */}
          <h1 className="mt-8 max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[76px] lg:leading-[1.1]">
            A Private Sanctuary for <br />
            <span className="font-serif italic font-normal text-white/90">Your Music</span>.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Orbit is a quiet, personal music streaming app built exclusively for a private circle of listeners. No ads, no commercial tracking, no algorithmic noise. Just your personal library streaming seamlessly to all your devices.
          </p>

          {/* Feature Badges Row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-zinc-400">
            <span className="rounded-full border border-white/5 bg-[#121214] px-3.5 py-1.5">
              Zero Ads Ever
            </span>
            <span className="rounded-full border border-white/5 bg-[#121214] px-3.5 py-1.5">
              Invite Only
            </span>
            <span className="rounded-full border border-white/5 bg-[#121214] px-3.5 py-1.5">
              Lossless High Fidelity
            </span>
            <span className="rounded-full border border-white/5 bg-[#121214] px-3.5 py-1.5">
              Offline Storage
            </span>
            <span className="rounded-full border border-white/5 bg-[#121214] px-3.5 py-1.5">
              Synced Lyrics
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
                    <span>Unlock</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Verification Feedback Message */}
            {codeFeedback && (
              <div
                className={`mt-3 flex items-center justify-center gap-2 rounded-2xl p-3 text-xs font-semibold ${
                  codeFeedback.valid
                    ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border border-rose-500/20 bg-rose-500/10 text-rose-300"
                }`}
              >
                {codeFeedback.valid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>
                      {codeFeedback.message} {codeFeedback.tier && `(${codeFeedback.tier})`} — Redirecting to registration...
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
        </div>
      </section>

      {/* Section 1: The Private Music Experience */}
      <section id="about" className="relative z-10 border-t border-white/5 bg-[#0a0a0d] py-24 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              Personal & Quiet
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Why We Built a Private Music App
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-zinc-400 sm:text-base">
              Music listening was meant to be intimate and uninterrupted. Orbit is designed from the ground up as a private home for music collectors and listeners who value quiet focus, uncompressed audio quality, and zero advertising.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Pillar 1 */}
            <div className="rounded-[32px] border border-white/5 bg-[#101013] p-8 flex flex-col justify-between">
              <div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white">
                  <Volume2 className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">100% Ad-Free, Forever</h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  No promotional audio ads interrupting between tracks, no sponsored banner feeds, and no marketing popups. You press play, and your music simply plays.
                </p>
              </div>
              <div className="mt-8 border-t border-white/5 pt-4 text-xs font-mono text-zinc-500">
                Pure listening focus
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-[32px] border border-white/5 bg-[#101013] p-8 flex flex-col justify-between">
              <div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">Invite-Only Access</h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  We maintain a capped, private cohort. Keeping the service invite-only ensures dedicated server resources, instant streaming with no buffering, and complete privacy for our members.
                </p>
              </div>
              <div className="mt-8 border-t border-white/5 pt-4 text-xs font-mono text-zinc-500">
                Dedicated streaming edge
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-[32px] border border-white/5 bg-[#101013] p-8 flex flex-col justify-between">
              <div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-white">
                  <FolderHeart className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-white">Your Personal Collection</h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  Organize albums, artists, custom playlists, and favourite tracks in a clean, elegant library. Your collection belongs to you, accessible from any browser or mobile device.
                </p>
              </div>
              <div className="mt-8 border-t border-white/5 pt-4 text-xs font-mono text-zinc-500">
                Personal cloud catalog
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Core Capabilities Grid */}
      <section id="features" className="relative z-10 border-t border-white/5 py-24 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              Designed For Listening
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything You Need in a Music Player
            </h2>
            <p className="mt-4 mx-auto max-w-xl text-sm text-zinc-400">
              Thoughtfully built features crafted specifically for music lovers.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-[32px] border border-white/5 bg-[#111114] p-7 transition hover:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white">
                <Headphones className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">High Fidelity Streaming</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Support for 24-bit FLAC, ALAC, WAV, and high-bitrate AAC/MP3. Stream with native HTTP 206 Range seeking for instant scrub.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-[32px] border border-white/5 bg-[#111114] p-7 transition hover:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white">
                <Maximize2 className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Ambient Full-Screen Stage</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Turn your laptop or monitor into an ambient vinyl display with album-matching glow, beautiful typography, and lyrics.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-[32px] border border-white/5 bg-[#111114] p-7 transition hover:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white">
                <Mic2 className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Synchronized Lyrics</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Follow along with line-by-line synchronized LRC lyrics that highlight smoothly in real time as the song plays.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-[32px] border border-white/5 bg-[#111114] p-7 transition hover:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white">
                <Download className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">True Offline Storage</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Download tracks and albums directly into your browser via IndexedDB. Play songs on flights or road trips with no cellular signal.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-[32px] border border-white/5 bg-[#111114] p-7 transition hover:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white">
                <Keyboard className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Keyboard Shortcuts & Mini-Player</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Full desktop keyboard control (Space to toggle, arrows to seek/volume) plus Picture-in-Picture floating audio controls.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-[32px] border border-white/5 bg-[#111114] p-7 transition hover:border-white/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-white">
                <ListMusic className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">Playlists & Personal Curation</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Create unlimited custom playlists with custom artwork, reorder tracks, and quickly access recently played history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: How It Works */}
      <section id="how-it-works" className="relative z-10 border-t border-white/5 bg-[#0a0a0d] py-24 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              Simple & Private
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How Orbit Works
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Getting started is straightforward once you have an invitation.
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
                Existing members share private invitation codes with trusted friends and purists, or you can join our private waitlist.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-[32px] border border-white/5 bg-[#101013] p-8 text-center">
              <span className="inline-block rounded-full bg-white/5 px-4 py-1 text-xs font-mono font-bold text-zinc-400">
                Step 02
              </span>
              <h3 className="mt-5 text-lg font-bold text-white">Unlock Your Account</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Enter your code in the unlock box above. Once verified, set up your display name and sign in credentials.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-[32px] border border-white/5 bg-[#101013] p-8 text-center">
              <span className="inline-block rounded-full bg-white/5 px-4 py-1 text-xs font-mono font-bold text-zinc-400">
                Step 03
              </span>
              <h3 className="mt-5 text-lg font-bold text-white">Stream Anywhere</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Listen ad-free on your laptop, phone, or tablet. Install Orbit as a native app on iOS and Android with offline caching.
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
              Audio Fidelity
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Supported Audio Formats
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Orbit plays your files directly without transcoding or quality loss.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 text-center">
            <div className="rounded-2xl border border-white/5 bg-[#111114] p-5">
              <span className="text-xl font-bold text-white">FLAC</span>
              <p className="mt-1 text-[11px] font-mono text-zinc-500">24-bit / 192kHz</p>
              <p className="mt-2 text-[10px] text-zinc-400">Lossless Master</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#111114] p-5">
              <span className="text-xl font-bold text-white">ALAC</span>
              <p className="mt-1 text-[11px] font-mono text-zinc-500">Apple Lossless</p>
              <p className="mt-2 text-[10px] text-zinc-400">Bit-Perfect</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#111114] p-5">
              <span className="text-xl font-bold text-white">WAV</span>
              <p className="mt-1 text-[11px] font-mono text-zinc-500">Linear PCM</p>
              <p className="mt-2 text-[10px] text-zinc-400">Uncompressed</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#111114] p-5">
              <span className="text-xl font-bold text-white">AAC</span>
              <p className="mt-1 text-[11px] font-mono text-zinc-500">Up to 320kbps</p>
              <p className="mt-2 text-[10px] text-zinc-400">High Efficiency</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#111114] p-5">
              <span className="text-xl font-bold text-white">MP3</span>
              <p className="mt-1 text-[11px] font-mono text-zinc-500">320kbps CBR</p>
              <p className="mt-2 text-[10px] text-zinc-400">Universal</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: FAQ */}
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
                q: "What is Orbit?",
                a: "Orbit is a private, invite-only personal music streaming app. It gives you a clean, ad-free listening experience with high-fidelity audio playback, synchronized lyrics, offline downloads, and an ambient player.",
              },
              {
                q: "Are there any ads on Orbit?",
                a: "Never. Orbit is 100% ad-free. There are no audio commercials, banner ads, tracking scripts, or promoted recommendations.",
              },
              {
                q: "Why is Orbit invite-only?",
                a: "We choose to keep Orbit private and small to ensure dedicated streaming bandwidth, zero congestion, fast playback, and a quiet, distraction-free environment for our members.",
              },
              {
                q: "How can I get an invite code?",
                a: "Invite codes are shared by existing members. If you do not have one, you can join our private waitlist using the form on this page.",
              },
              {
                q: "Does offline mode work on mobile phones?",
                a: "Yes. When you download tracks in Orbit, they are saved locally into your device's browser storage using IndexedDB. You can play downloaded songs completely offline without an internet connection.",
              },
              {
                q: "Can I install Orbit as an app on my phone?",
                a: "Yes. Orbit is a Progressive Web App (PWA). On iPhone/iOS, tap 'Share' -> 'Add to Home Screen'. On Android, tap the three dots in Chrome -> 'Install app'. It will launch like a native application with lock-screen media controls.",
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
                    className={`h-4 w-4 text-zinc-400 transition-transform duration-300 ${
                      openFaq === idx ? "rotate-180" : ""
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

      {/* Section 6: Final Invitation CTA Banner */}
      <section className="relative z-10 border-t border-white/5 py-24">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="rounded-[40px] border border-white/10 bg-gradient-to-b from-[#141418] to-[#0c0c0e] p-10 text-center sm:p-16 shadow-2xl">
            <img
              src="/orbit-logo.png"
              alt="Orbit"
              className="mx-auto h-12 w-12 rounded-xl object-contain drop-shadow-xl"
            />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Have an Invitation Code?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
              Enter your code to unlock your private station and begin listening.
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
      <footer className="relative z-10 border-t border-white/5 bg-[#080808] py-12 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row md:px-10">
          <div className="flex items-center gap-3">
            <img src="/orbit-logo.png" alt="Orbit Logo" className="h-6 w-6 rounded object-contain" />
            <span className="font-bold text-white">Orbit</span>
            <span className="text-zinc-600">•</span>
            <span>Private Ad-Free Music</span>
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
            <span>© 2026 Orbit</span>
          </div>
        </div>
      </footer>

      {/* Request Invite Modal */}
      {showWaitlistModal && (
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
                  Orbit is currently invitation-only to maintain ad-free, unthrottled streaming. Please enter your email to request access.
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
                    Note / Referral (Optional)
                  </label>
                  <input
                    type="text"
                    value={waitlistNote}
                    onChange={(e) => setWaitlistNote(e.target.value)}
                    placeholder="e.g. Referred by Miles, audiophile listener"
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
      )}
    </div>
  );
}
