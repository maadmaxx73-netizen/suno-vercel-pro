-- Supabase schema for the Suno clone with subscriptions, credits,
-- daily usage tracking, and track storage.

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Profiles table stores user roles, credits, and Stripe customer IDs.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'free',
  credits integer not null default 5,
  stripe_customer_id text,
  pro_until timestamptz
);

-- Tracks table stores generated songs for each user.
create table if not exists public.tracks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  audio_url text,
  created_at timestamptz not null default now()
);

-- Daily usage table keeps track of how many free generations a user has
-- consumed on a given date. Free users are limited to 5 per day.
create table if not exists public.daily_usage (
  id serial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  count integer not null default 0,
  constraint unique_daily_usage unique (user_id, date)
);

-- Row Level Security (RLS) policies to ensure users can only access
-- their own profiles and tracks. Customize these policies as needed.
alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.daily_usage enable row level security;

-- Allow users to select their own profile (read-only)
create policy "select own profile" on public.profiles
  for select using (auth.uid() = id);

-- Allow users to update their own profile
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Allow users to insert and select their own tracks
create policy "select own tracks" on public.tracks
  for select using (auth.uid() = user_id);

create policy "insert own tracks" on public.tracks
  for insert with check (auth.uid() = user_id);

-- Allow users to view their own daily usage
create policy "select own usage" on public.daily_usage
  for select using (auth.uid() = user_id);

-- Allow service role (admin) to update credits/daily usage and manage subscriptions.
