-- PlantGrowthTrack — Supabase schema
-- Run this in the Supabase dashboard: Project -> SQL Editor -> New query -> paste -> Run.

-- ============ Tables ============

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  species text,
  added_date date not null,
  watering_interval_days int not null default 3,
  cover_photo_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  type text not null check (type in ('water', 'pesticide', 'photo')),
  entry_date date not null,
  note text,
  height_cm numeric,
  health_rating int check (health_rating between 1 and 5),
  photo_path text,
  created_at timestamptz not null default now()
);

create index if not exists entries_plant_id_idx on public.entries(plant_id);
create index if not exists entries_user_id_idx on public.entries(user_id);
create index if not exists plants_user_id_idx on public.plants(user_id);

-- ============ Row Level Security ============
-- Every user can only ever see and modify their own rows.

alter table public.plants enable row level security;
alter table public.entries enable row level security;

create policy "Users can view their own plants"
  on public.plants for select
  using (auth.uid() = user_id);

create policy "Users can insert their own plants"
  on public.plants for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own plants"
  on public.plants for update
  using (auth.uid() = user_id);

create policy "Users can delete their own plants"
  on public.plants for delete
  using (auth.uid() = user_id);

create policy "Users can view their own entries"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own entries"
  on public.entries for update
  using (auth.uid() = user_id);

create policy "Users can delete their own entries"
  on public.entries for delete
  using (auth.uid() = user_id);

-- ============ Storage ============
-- Create a PRIVATE bucket named "plant-photos" first:
--   Dashboard -> Storage -> New bucket -> name: plant-photos -> Public: OFF
-- The app uploads photos under a path like "<user_id>/<plant_id>/<timestamp>.jpg"
-- and reads them back via short-lived signed URLs, so the policies below only
-- need to check that the first folder in the path matches the requesting user.

create policy "Users can upload their own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own photos"
  on storage.objects for select
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own photos"
  on storage.objects for delete
  using (
    bucket_id = 'plant-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
