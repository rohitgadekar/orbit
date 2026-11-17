-- Orbit Invite-Only & Waitlist Schema
-- Run this in your Supabase SQL editor (Dashboard -> SQL Editor -> New Query -> Run)

-- 1. Create Invites Table
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  tier text default 'VIP Member',
  is_active boolean default true,
  uses_remaining integer default 50,
  created_at timestamptz not null default now()
);

-- 2. Create Waitlist Table
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  note text,
  status text default 'pending',
  created_at timestamptz not null default now()
);

-- 3. Grant schema & table permissions to anon & authenticated roles
-- (CRITICAL: Without these grants, Postgres throws 42501 "permission denied for table waitlist")
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.waitlist to anon, authenticated, service_role;
grant all on table public.invites to anon, authenticated, service_role;

-- 4. Enable Row Level Security (RLS)
alter table public.waitlist enable row level security;
alter table public.invites enable row level security;

-- 5. Drop old policies if any to avoid duplicates
drop policy if exists "Allow anon insert waitlist" on public.waitlist;
drop policy if exists "Allow anyone to request invite" on public.waitlist;
drop policy if exists "Allow anon select waitlist" on public.waitlist;
drop policy if exists "Allow anon select invites" on public.invites;
drop policy if exists "Allow public to check valid invite codes" on public.invites;

-- 6. Create RLS Policies for Anon & Authenticated users
create policy "Allow anon insert waitlist"
  on public.waitlist
  for insert
  to anon, authenticated, service_role
  with check (true);

create policy "Allow anon select invites"
  on public.invites
  for select
  to anon, authenticated, service_role
  using (is_active = true);

-- 7. Pre-seed exclusive master codes
insert into public.invites (code, tier, is_active, uses_remaining)
values
  ('ORBIT-VIP', 'Founding Member', true, 100),
  ('ORBIT-2026', 'Private Beta', true, 50),
  ('AUDIOPHILE', 'Audiophile Tier', true, 50),
  ('PRIVATE-ACCESS', 'Private Listener', true, 50)
on conflict (code) do update set is_active = true;
