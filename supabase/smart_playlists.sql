-- Supabase SQL functions for Orbit Smart Playlists & Daily Mixes
-- Run this in the Supabase SQL editor to enable server-side personalized mixes.

-- 1. Function: Get User's Most Listened Songs
-- Ranks songs by user's personal play history, falling back to global play count
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

-- 2. Function: Get User's Personalized Daily Mix
-- Combines:
-- a) Tracks from the user's top played artists
-- b) Tracks the user has favourited
-- c) Catalog tracks rotated daily using current_date hash
create or replace function public.get_user_daily_mix(
  p_user_id uuid,
  p_mix_number integer default 1,
  p_limit integer default 25
)
returns table (
  id uuid,
  title text,
  artist_id uuid,
  album_id uuid,
  audio_url text,
  cover_url text,
  duration_seconds integer,
  play_count integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seed float8;
begin
  -- Generate a deterministic seed based on date and mix number
  v_seed := ('0.' || substr(md5(current_date::text || p_mix_number::text || coalesce(p_user_id::text, '')), 1, 8))::float8;

  return query
  with user_favorite_artists as (
    -- Top artists from user's play history and favourites
    select s.artist_id, count(*) as weight
    from public.play_history ph
    join public.songs s on s.id = ph.song_id
    where ph.user_id = p_user_id
    group by s.artist_id
    union all
    select s.artist_id, 3 as weight
    from public.favourites f
    join public.songs s on s.id = f.song_id
    where f.user_id = p_user_id
  ),
  ranked_artists as (
    select artist_id, sum(weight) as total_weight
    from user_favorite_artists
    group by artist_id
    order by total_weight desc
    limit 8
  ),
  candidate_songs as (
    -- Songs by user's top artists
    select s.*, 1 as priority
    from public.songs s
    where s.artist_id in (select artist_id from ranked_artists)
    union
    -- User's favorited songs
    select s.*, 2 as priority
    from public.songs s
    join public.favourites f on f.song_id = s.id
    where f.user_id = p_user_id
    union
    -- Top catalog tracks as fallback
    select s.*, 3 as priority
    from public.songs s
    order by s.play_count desc
    limit 50
  )
  select 
    cs.id,
    cs.title,
    cs.artist_id,
    cs.album_id,
    cs.audio_url,
    cs.cover_url,
    cs.duration_seconds,
    cs.play_count,
    cs.created_at
  from candidate_songs cs
  order by 
    cs.priority asc,
    -- Deterministic pseudo-random shuffle seeded by today's date
    md5(cs.id::text || current_date::text || p_mix_number::text)
  limit p_limit;
end;
$$;

-- 3. Function: Atomic creation of playlist from a generated mix
create or replace function public.create_playlist_from_mix(
  p_user_id uuid,
  p_name text,
  p_cover_url text default null,
  p_song_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_playlist_id uuid;
  v_index integer := 0;
  v_song_id uuid;
begin
  -- 1. Insert playlist
  insert into public.playlists (user_id, name, cover_url)
  values (p_user_id, p_name, p_cover_url)
  returning id into v_playlist_id;

  -- 2. Insert playlist songs in order
  if array_length(p_song_ids, 1) > 0 then
    foreach v_song_id in array p_song_ids loop
      insert into public.playlist_songs (playlist_id, song_id, position)
      values (v_playlist_id, v_song_id, v_index);
      v_index := v_index + 1;
    end loop;
  end if;

  return v_playlist_id;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function public.get_user_most_listened(uuid, integer) to authenticated;
grant execute on function public.get_user_daily_mix(uuid, integer, integer) to authenticated;
grant execute on function public.create_playlist_from_mix(uuid, text, text, uuid[]) to authenticated;

