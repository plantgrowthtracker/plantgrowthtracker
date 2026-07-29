-- PlantGrowthTracker — migration v2
-- Run this in the Supabase SQL Editor AFTER schema.sql has already been applied.
-- Adds: multiple photos per log entry, public share links, and RPCs used by the
-- read-only shared plant page.

-- ============ Multiple photos per entry ============

create table if not exists public.entry_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null references public.entries(id) on delete cascade,
  photo_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists entry_photos_entry_id_idx on public.entry_photos(entry_id);

alter table public.entry_photos enable row level security;

create policy "Users can view their own entry photos"
  on public.entry_photos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own entry photos"
  on public.entry_photos for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own entry photos"
  on public.entry_photos for delete
  using (auth.uid() = user_id);

-- ============ Public share links ============
-- A plant with a non-null share_token can be viewed read-only at
-- yourapp.com/share/<token> by anyone with the link, without logging in.

alter table public.plants add column if not exists share_token uuid unique;

-- These two functions run as the table owner (SECURITY DEFINER), which lets
-- them bypass the plants/entries RLS policies above — but only ever return
-- rows that match the given share_token, so nothing else is exposed.

create or replace function public.get_shared_plant(token uuid)
returns setof public.plants
language sql
security definer
set search_path = public
as $$
  select * from public.plants where share_token = token;
$$;

create or replace function public.get_shared_entries(token uuid)
returns setof public.entries
language sql
security definer
set search_path = public
as $$
  select e.* from public.entries e
  join public.plants p on p.id = e.plant_id
  where p.share_token = token;
$$;

grant execute on function public.get_shared_plant(uuid) to anon, authenticated;
grant execute on function public.get_shared_entries(uuid) to anon, authenticated;

-- Note: the plant-photos storage bucket stays private, so photos on a shared
-- page are served through the get-shared-photo Edge Function (see
-- supabase/functions/get-shared-photo), which checks the token server-side
-- before generating a short-lived signed URL. See README.md "Public share
-- links" section for the one-time setup (deploying that function).
