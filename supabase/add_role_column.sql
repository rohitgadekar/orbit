-- Migration: Add role column to profiles table with default 'user'
-- Run this in the Supabase SQL editor.

-- 1. Add the role column if it doesn't already exist
alter table public.profiles add column if not exists role text not null default 'user';

-- 2. Update the handle_new_user function to populate the role from raw_user_meta_data if present
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

-- 3. Helper to make a user an admin:
-- Replace with your actual user's email or UUID
-- update public.profiles set role = 'admin' where id = 'YOUR_USER_UUID';
-- OR by email:
-- update public.profiles set role = 'admin' where id in (select id from auth.users where email = 'your_email@domain.com');
