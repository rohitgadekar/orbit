# 🪐 Orbit

<p align="center">
  <strong>A modern, full-screen music streaming app & audio workstation built with Next.js 16, React 19, Supabase, and Tailwind CSS v4.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Capacitor-iOS_%26_Android-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <img src="https://res.cloudinary.com/ipmbe0zp/image/upload/v1794886709/Screenshot_2026-11-17_at_9.06.29_AM.png" alt="Orbit Homepage" width="100%" />
</p>

---

## 📸 Screenshots & Showcase

| **🏠 Algorithmic Discovery Homepage** |
|:---:|
| ![Homepage](https://res.cloudinary.com/ipmbe0zp/image/upload/v1794886709/Screenshot_2026-11-17_at_9.06.29_AM.png) |

| **🎙️ Synced Lyrics Sheet** | **🌟 Cinema-Grade Fullscreen Player** |
|:---:|:---:|
| ![Synced Lyrics](https://res.cloudinary.com/ipmbe0zp/image/upload/v1794886710/Screenshot_2026-11-17_at_9.07.44_AM.png) | ![Fullscreen Player](https://res.cloudinary.com/ipmbe0zp/image/upload/v1794886710/Screenshot_2026-11-17_at_9.07.28_AM.png) |

---

## ✨ Overview

Orbit is a production-grade personal music streaming application engineered for audiophiles and design enthusiasts. It features a borderless dark-mode aesthetic with fluid glassmorphic chrome, real-time synchronized lyrics, algorithmic discovery mixes, picture-in-picture playback, and client-side offline storage.

There is no fake or static mock catalog — every song, artist, album, playlist, and play count is persisted and streamed live from your own **Supabase** backend and audio storage (Cloudinary, S3, or direct URLs).

---

## 🚀 Key Features

### 🎧 Audiophile Playback Engine
- **Persistent Global Audio Engine**: Seamless audio continuity across routes with zero lag or stutter.
- **Queue Management**: Drag, reorder, append, shuffle, and toggle track repeat (`Off` / `All` / `One`).
- **Real-Time Play Tracking**: Automatic play frequency tracking, recent playback history, and play counter increments via PostgreSQL RPCs.

### 🌟 Fullscreen Vinyl & Ambient Glow
- **Cinema-Grade Visualizer**: Fullscreen vinyl presentation with dynamic color extraction derived from the active track's cover art.
- **Synced Lyrics Sheet**: Real-time synchronized lyrics engine powered by LRCLIB with line-by-line smooth autoscroll.

### 🖼️ Picture-in-Picture (PiP) Player
- **Native Canvas PiP Mode**: Stream audio while working in other apps. Renders live album art, track titles, artist names, and interactive playback status directly inside an OS-native Picture-in-Picture canvas window.

### 🧠 Algorithmic Mixes & Discovery
- **Contextual Greetings**: Dynamic time-of-day greetings ("Good morning", "Good afternoon", "Good evening").
- **Smart Filter Chips**: Instant category filtering (`All`, `Mixes`, `Releases`, `On Repeat`, `Rediscover`).
- **"Because You Listen To..."**: Dynamic artist radio shelves spotlighting deep catalog cuts based on your top-played artists.
- **"Rediscover (Time Capsule)"**: Algorithmic rediscovery shelf highlighting loved tracks you haven't spun recently.
- **Daily Mixes**: Hash-rotated personalized daily mixes generated directly via Supabase functions.

### 💾 Offline Mode (IndexedDB)
- Download your favorite tracks directly to the browser via IndexedDB for instant, zero-network offline playback anywhere.

### 🎨 1-File Centralized Theme Engine
- Effortlessly brand your music app. Customize the entire palette — primary accent, background depths, borders, glows, and hover states — in **one single file**: `src/config/theme.css`.

### ⚡ Zero-Layout-Shift Skeleton Architecture
- Exact-dimension skeleton loaders across the desktop sidebar and homepage bento grids to eliminate hydration layout jumps.
- **Affinity-Ranked Artist Rail**: Dynamic sidebar loading up to 40 of your most listened-to artists with circular avatars to ensure no awkward blank spaces.

### 📂 Automatic ID3 Metadata & Ingestion
- Upload single tracks or bulk albums: Orbit automatically parses ID3 tags, artist names, album titles, cover art, and precise audio durations using client-side Web Audio & `music-metadata`.

### ⌨️ Studio Keyboard Shortcuts
- Complete desktop hotkey suite with an interactive **Keyboard Shortcuts Cheatsheet & Tester** located in the Settings view.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **UI Library** | [React 19](https://react.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + CSS Variables |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, Row-Level Security, RPCs) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Metadata Parser** | [music-metadata](https://github.com/Borewit/music-metadata) |
| **Mobile Runtime** | [Capacitor 8](https://capacitorjs.com/) (iOS & Android) |
| **Desktop Runtime** | [Electron](https://www.electronjs.org/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |

---

## ⌨️ Keyboard Shortcuts Reference

Press `?` anywhere in the app or navigate to **Settings → Keyboard Shortcuts** to test:

| Key | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Play / Pause |
| <kbd>Shift</kbd> + <kbd>→</kbd> | Next Track |
| <kbd>Shift</kbd> + <kbd>←</kbd> | Previous Track |
| <kbd>→</kbd> | Fast-Forward 5 seconds |
| <kbd>←</kbd> | Rewind 5 seconds |
| <kbd>↑</kbd> | Volume Up (+5%) |
| <kbd>↓</kbd> | Volume Down (-5%) |
| <kbd>M</kbd> | Mute / Unmute Audio |
| <kbd>F</kbd> | Toggle Fullscreen Player |
| <kbd>S</kbd> | Toggle Shuffle Mode |
| <kbd>R</kbd> | Cycle Repeat Mode (Off → All → One) |
| <kbd>P</kbd> | Toggle Picture-in-Picture (PiP) Window |
| <kbd>L</kbd> | Toggle Synced Lyrics Sheet |
| <kbd>⌘</kbd> + <kbd>K</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Open Global Search Bar |
| <kbd>Esc</kbd> | Close Modal / Exit Fullscreen |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **npm** or **pnpm**
- A free [Supabase](https://supabase.com) account
- Audio file hosting (Cloudinary, Supabase Storage, AWS S3, or any public HTTPS MP3/AAC URL)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/orbit.git
cd orbit
npm install
```

---

### Step 2: Supabase Database Setup

1. Create a new project at [database.new](https://database.new).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Run the schema migrations in order:
   - Copy and execute [`supabase/schema.sql`](supabase/schema.sql) (creates tables, foreign keys, triggers, and RLS policies).
   - Copy and execute [`supabase/smart_playlists.sql`](supabase/smart_playlists.sql) (enables daily mixes and play frequency aggregation).
4. *(Optional)* In **Authentication → Providers → Email**, turn off **"Confirm email"** for instant local signup.

---

### Step 3: Configure Environment Variables

Duplicate the example environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
```

---

### Step 4: Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser. Create your user account and start curating your library!

---

## 🎨 Theme Customization

Orbit utilizes a centralized theme configuration file located at:

```
src/config/theme.css
```

To switch from the default **Electric Blue** to Emerald, Violet, Rose, or Amber, change the CSS variables in `src/config/theme.css`:

```css
:root {
  /* Change accent color (Default: Electric Blue #3b82f6) */
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --accent-muted: rgba(59, 130, 246, 0.15);
  --accent-glow: rgba(59, 130, 246, 0.35);

  /* Deep space background tones */
  --bg-app: #08090c;
  --bg-card: rgba(18, 20, 26, 0.7);
  --border-subtle: rgba(255, 255, 255, 0.08);
}
```

All buttons, sliders, progress bars, active indicators, and ambient glows update instantly across the entire application without hunting down class names.

---

## 🎵 Adding Music to Your Library

Orbit provides two seamless methods for uploading and managing tracks:

### 1. In-App Auto-Extraction (Recommended)
1. Navigate to **Settings** in the sidebar.
2. Under **"Add a Track"**, paste an audio URL or select a local audio file.
3. Orbit's embedded ID3 parser (`music-metadata`) will automatically populate the track title, artist name, album, duration, and cover image.
4. Click **Save Track**.

### 2. Direct Supabase Ingestion
You can bulk-insert rows into `public.artists`, `public.albums`, and `public.songs` using SQL or the Supabase Table Editor:

```sql
INSERT INTO public.artists (name, image_url) 
VALUES ('Daft Punk', 'https://example.com/daft-punk.jpg')
RETURNING id;

INSERT INTO public.songs (title, artist_id, audio_url, cover_url, duration_seconds)
VALUES (
  'Get Lucky',
  'ARTIST_UUID_HERE',
  'https://res.cloudinary.com/demo/video/upload/sample.mp3',
  'https://example.com/random-access-memories.jpg',
  248
);
```

---

## 📱 Mobile & Desktop Builds

### iOS & Android (Capacitor)
Orbit includes preconfigured Capacitor 8 bindings:

```bash
# Build web assets
npm run build

# Sync assets to native project folders
npx cap sync

# Open in Xcode or Android Studio
npx cap open ios
npx cap open android
```

### Desktop (Electron)
```bash
# Launch Orbit in Electron desktop shell
npx electron .
```

---

## 📁 Project Structure

```text
orbit/
├── src/
│   ├── app/                    # Next.js App Router (pages & API routes)
│   │   ├── (app)/              # Authenticated app shell routes
│   │   │   ├── home/           # Personalized home bento grid
│   │   │   ├── music/          # Song library & track table
│   │   │   ├── folders/        # Playlists & collections
│   │   │   ├── downloaded/     # IndexedDB offline music player
│   │   │   ├── artists/        # Artist catalog & details
│   │   │   ├── albums/         # Album catalog & tracklists
│   │   │   └── settings/       # Ingestion, keyboard cheatsheet, config
│   │   └── globals.css         # Global styles & Tailwind directives
│   ├── components/             # Reusable UI components
│   │   ├── app-shell.tsx       # Dynamic full-bleed shell with zero-shift skeleton
│   │   ├── player-bar.tsx      # Persistent bottom audio controls
│   │   ├── fullscreen-player.tsx# Fullscreen vinyl player & ambient glow
│   │   ├── lyrics-sheet.tsx    # Synced LRCLIB lyrics sheet
│   │   └── song-row.tsx        # High-performance virtualized song row
│   ├── config/
│   │   └── theme.css           # Centralized 1-file design system tokens
│   ├── context/
│   │   ├── player-context.tsx  # Global audio engine & queue state
│   │   ├── pip-context.tsx     # Native Picture-in-Picture canvas manager
│   │   ├── offline-context.tsx # IndexedDB offline synchronization
│   │   └── auth-context.tsx    # Supabase session lifecycle
│   └── lib/
│       ├── audio-metadata.ts   # Client-side ID3 metadata extractor
│       ├── offline-storage.ts  # IndexedDB blob storage manager
│       └── supabase/           # Supabase client & server wrappers
├── supabase/
│   ├── schema.sql              # Database DDL, RLS policies, triggers
│   └── smart_playlists.sql     # Personalized discovery & mix RPCs
├── capacitor.config.ts         # Mobile packaging config
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Crafted with care for high-fidelity music listening. 🪐
</p>
