-- Orbit music catalog + user data
-- Run this in the Supabase SQL editor after creating a project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_id uuid not null references public.artists (id) on delete cascade,
  cover_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_id uuid not null references public.artists (id) on delete cascade,
  album_id uuid references public.albums (id) on delete set null,
  audio_url text not null,
  cover_url text,
  duration_seconds integer,
  play_count integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  cover_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.playlist_songs (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (playlist_id, song_id)
);

create table if not exists public.favourites (
  user_id uuid not null references auth.users (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create table if not exists public.play_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  played_at timestamptz not null default now()
);

create index if not exists songs_play_count_idx on public.songs (play_count desc);
create index if not exists songs_created_at_idx on public.songs (created_at desc);
create index if not exists play_history_user_played_idx on public.play_history (user_id, played_at desc);
create index if not exists favourites_user_created_idx on public.favourites (user_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.increment_play_count(p_song_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.songs
  set play_count = play_count + 1
  where id = p_song_id;
$$;

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.songs enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.favourites enable row level security;
alter table public.play_history enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "artists_read" on public.artists;
create policy "artists_read" on public.artists
  for select to authenticated using (true);

drop policy if exists "artists_write" on public.artists;
create policy "artists_write" on public.artists
  for insert to authenticated with check (true);

drop policy if exists "artists_update" on public.artists;
create policy "artists_update" on public.artists
  for update to authenticated using (true) with check (true);

drop policy if exists "albums_read" on public.albums;
create policy "albums_read" on public.albums
  for select to authenticated using (true);

drop policy if exists "albums_write" on public.albums;
create policy "albums_write" on public.albums
  for insert to authenticated with check (true);

drop policy if exists "albums_update" on public.albums;
create policy "albums_update" on public.albums
  for update to authenticated using (true) with check (true);

drop policy if exists "songs_read" on public.songs;
create policy "songs_read" on public.songs
  for select to authenticated using (true);

drop policy if exists "songs_write" on public.songs;
create policy "songs_write" on public.songs
  for insert to authenticated with check (true);

drop policy if exists "songs_update" on public.songs;
create policy "songs_update" on public.songs
  for update to authenticated using (true) with check (true);

drop policy if exists "playlists_own" on public.playlists;
create policy "playlists_own" on public.playlists
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "playlist_songs_own" on public.playlist_songs;
create policy "playlist_songs_own" on public.playlist_songs
  for all to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "favourites_own" on public.favourites;
create policy "favourites_own" on public.favourites
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "play_history_own" on public.play_history;
create policy "play_history_own" on public.play_history
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update on public.artists, public.albums, public.songs to authenticated;
grant select, insert, update, delete on public.profiles, public.playlists, public.playlist_songs, public.favourites, public.play_history to authenticated;
grant execute on function public.increment_play_count(uuid) to authenticated;
