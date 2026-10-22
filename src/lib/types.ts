export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type Artist = {
  id: string;
  name: string;
  image_url: string | null;
  bio: string | null;
};

export type Album = {
  id: string;
  title: string;
  artist_id: string;
  cover_url: string | null;
};

export type Song = {
  id: string;
  title: string;
  artist_id: string;
  album_id: string | null;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number | null;
  play_count: number;
  created_at: string;
  artist: Artist | null;
  album: Album | null;
};

export type Playlist = {
  id: string;
  user_id: string;
  name: string;
  cover_url: string | null;
  created_at: string;
};

export type RepeatMode = "off" | "all" | "one";
