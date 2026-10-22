# Orbit

A pastel, full-screen music app built with Next.js, Supabase, and Cloudinary URLs. There is no dummy catalog — every track comes from your `songs` table.

## Setup

1. Create a Supabase project.
2. In **Authentication → Providers**, keep Email enabled. For local testing you can turn off **Confirm email**.
3. Run `supabase/schema.sql` in the SQL editor.
4. Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, then add tracks in **Settings**.

## Adding songs

Upload audio (and optional cover art) to Cloudinary, copy the HTTPS URLs, then either:

- Use **Settings → Add a Cloudinary track** in the app, or
- Insert rows into `public.songs` (and `artists`) in Supabase.

The player streams `audio_url` directly. Covers use `cover_url`.

## What is wired

- Email signup / login
- Home bento: featured track, trending by play count, top artists, recent favourites
- Library search and playback
- Folders (playlists)
- Favourites
- Profile stats and recently played
- Persistent player with shuffle, repeat, queue, and play history
- Full-screen player chrome: desktop sidebar, mobile bottom tabs, persistent player bar
