-- =========================================================================
-- ORBIT COMPLETE DATABASE SETUP
-- Run this in your new Supabase project:
-- Dashboard -> SQL Editor -> New Query -> Paste this file -> Click Run
-- =========================================================================

-- 1. EXTENSIONS
create extension if not exists pgcrypto;

-- 2. PUBLIC TABLES

-- User Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Artists
create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  bio text,
  created_at timestamptz not null default now()
);

-- Albums
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_id uuid not null references public.artists (id) on delete cascade,
  cover_url text,
  created_at timestamptz not null default now()
);

-- Songs
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

-- Playlists
create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  cover_url text,
  created_at timestamptz not null default now()
);

-- Playlist Songs (Junction)
create table if not exists public.playlist_songs (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (playlist_id, song_id)
);

-- Favourites
create table if not exists public.favourites (
  user_id uuid not null references auth.users (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

-- Play History
create table if not exists public.play_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  played_at timestamptz not null default now()
);

-- Invites (Invite-Only App)
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  tier text default 'VIP Member',
  is_active boolean default true,
  uses_remaining integer default 50,
  created_at timestamptz not null default now()
);

-- Waitlist
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  note text,
  status text default 'pending',
  created_at timestamptz not null default now()
);

-- 3. INDEXES
create index if not exists songs_play_count_idx on public.songs (play_count desc);
create index if not exists songs_created_at_idx on public.songs (created_at desc);
create index if not exists play_history_user_played_idx on public.play_history (user_id, played_at desc);
create index if not exists favourites_user_created_idx on public.favourites (user_id, created_at desc);

-- 4. FUNCTIONS & TRIGGERS

-- Handle New User Registration
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do update
  set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    role = coalesce(public.profiles.role, 'user');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Increment Song Play Count
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

-- Smart Playlists: User Most Listened
create or replace function public.get_user_most_listened(
  p_user_id uuid,
  p_limit integer default 25
)
returns table (
  song_id uuid,
  play_frequency bigint,
  last_played_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select 
    ph.song_id,
    count(ph.id) as play_frequency,
    max(ph.played_at) as last_played_at
  from public.play_history ph
  where ph.user_id = p_user_id
  group by ph.song_id
  order by play_frequency desc, last_played_at desc
  limit p_limit;
$$;

-- 5. ROW LEVEL SECURITY (RLS) & PERMISSIONS
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.songs enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.favourites enable row level security;
alter table public.play_history enable row level security;
alter table public.invites enable row level security;
alter table public.waitlist enable row level security;

-- Public/Catalog Read/Write Policies
create policy "artists_all" on public.artists for all to anon, authenticated, service_role using (true) with check (true);
create policy "albums_all" on public.albums for all to anon, authenticated, service_role using (true) with check (true);
create policy "songs_all" on public.songs for all to anon, authenticated, service_role using (true) with check (true);

-- Profiles
create policy "profiles_select" on public.profiles for select to anon, authenticated, service_role using (true);
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

-- Playlists
create policy "playlists_select" on public.playlists for select to authenticated, anon using (true);
create policy "playlists_all" on public.playlists for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "playlist_songs_all" on public.playlist_songs for all to authenticated using (true) with check (true);

-- Favourites & Play History
create policy "favourites_all" on public.favourites for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "play_history_all" on public.play_history for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Invites & Waitlist
create policy "invites_select" on public.invites for select to anon, authenticated, service_role using (is_active = true);
create policy "waitlist_insert" on public.waitlist for insert to anon, authenticated, service_role with check (true);

-- 6. INITIAL SEED INVITE CODES
insert into public.invites (code, tier, is_active, uses_remaining)
values
  ('ORBIT-VIP', 'Founding Member', true, 100),
  ('ORBIT-2026', 'Private Beta', true, 50),
  ('AUDIOPHILE', 'Audiophile Tier', true, 50),
  ('PRIVATE-ACCESS', 'Private Listener', true, 50)
on conflict (code) do update set is_active = true;
