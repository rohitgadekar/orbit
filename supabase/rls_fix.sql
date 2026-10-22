-- Run this in the Supabase SQL editor to ensure all authenticated users
-- (and public/anon if using local or demo sessions) can read, insert, update, and delete
-- tracks, artists, and albums without RLS permission errors.

-- 1. Enable RLS
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.songs enable row level security;

-- 2. Drop existing restrictive policies on artists, albums, and songs
drop policy if exists "artists_read" on public.artists;
drop policy if exists "artists_write" on public.artists;
drop policy if exists "artists_update" on public.artists;
drop policy if exists "artists_delete" on public.artists;
drop policy if exists "artists_all" on public.artists;

drop policy if exists "albums_read" on public.albums;
drop policy if exists "albums_write" on public.albums;
drop policy if exists "albums_update" on public.albums;
drop policy if exists "albums_delete" on public.albums;
drop policy if exists "albums_all" on public.albums;

drop policy if exists "songs_read" on public.songs;
drop policy if exists "songs_write" on public.songs;
drop policy if exists "songs_update" on public.songs;
drop policy if exists "songs_delete" on public.songs;
drop policy if exists "songs_all" on public.songs;

-- 3. Create permissive policies for authenticated users
create policy "artists_all" on public.artists
  for all to authenticated
  using (true)
  with check (true);

create policy "albums_all" on public.albums
  for all to authenticated
  using (true)
  with check (true);

create policy "songs_all" on public.songs
  for all to authenticated
  using (true)
  with check (true);

-- Also allow anon read/write if you test unauthenticated or across roles
create policy "artists_anon_all" on public.artists
  for all to anon
  using (true)
  with check (true);

create policy "albums_anon_all" on public.albums
  for all to anon
  using (true)
  with check (true);

create policy "songs_anon_all" on public.songs
  for all to anon
  using (true)
  with check (true);

-- 4. Grant table privileges to authenticated and anon roles
grant usage on schema public to authenticated, anon;
grant all on public.artists to authenticated, anon;
grant all on public.albums to authenticated, anon;
grant all on public.songs to authenticated, anon;
grant all on public.profiles to authenticated, anon;
grant all on public.playlists to authenticated, anon;
grant all on public.playlist_songs to authenticated, anon;
grant all on public.favourites to authenticated, anon;
grant all on public.play_history to authenticated, anon;
