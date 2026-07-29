-- PlantGrowthTracker — migration v3
-- Run this in the Supabase SQL Editor AFTER schema.sql and migration_v2.sql.
-- Adds: a free-form notes/journal table per plant, and household collaborators
-- (multiple people logging care on the same plant). Editing/deleting entries
-- needs no schema change — it reuses the existing update/delete policies
-- below, just extended to also cover collaborators.

-- ============ Plant notes / journal ============
-- Separate from care-log entries — for things like "moved to a sunnier
-- spot" or "bought from X nursery" that aren't a watering/pesticide/photo.

create table if not exists public.plant_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists plant_notes_plant_id_idx on public.plant_notes(plant_id);

alter table public.plant_notes enable row level security;

-- ============ Household collaborators ============
-- A plant's owner can invite another person (by email) to log care on it
-- too. Invited-but-not-yet-signed-up people get a "pending" row that turns
-- "accepted" automatically the first time they log in with that email.

create table if not exists public.plant_collaborators (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  collaborator_email text not null,
  collaborator_user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (plant_id, collaborator_email)
);

create index if not exists plant_collaborators_plant_id_idx on public.plant_collaborators(plant_id);
create index if not exists plant_collaborators_email_idx on public.plant_collaborators(collaborator_email);

alter table public.plant_collaborators enable row level security;

-- Helper used by the policies below: true if the current user owns the
-- plant OR is an accepted collaborator on it. SECURITY DEFINER so it can
-- read plant_collaborators regardless of the caller's own RLS visibility
-- into that table.
create or replace function public.is_plant_member(p_plant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.plants where id = p_plant_id and user_id = auth.uid()
  ) or exists (
    select 1 from public.plant_collaborators
    where plant_id = p_plant_id
      and collaborator_user_id = auth.uid()
      and status = 'accepted'
  );
$$;

-- Called once after login (see src/App.jsx) — links any pending invites
-- sent to the logged-in user's email address to their actual account.
create or replace function public.accept_pending_collaborator_invites()
returns void
language sql
security definer
set search_path = public
as $$
  update public.plant_collaborators
  set collaborator_user_id = auth.uid(), status = 'accepted'
  where lower(collaborator_email) = lower(auth.email())
    and status = 'pending';
$$;

grant execute on function public.is_plant_member(uuid) to authenticated;
grant execute on function public.accept_pending_collaborator_invites() to authenticated;

-- ---- plant_notes policies: any plant member can read/add; only the
-- ---- person who wrote a note (or the plant owner) can delete it.
create policy "Plant members can view notes"
  on public.plant_notes for select
  using (public.is_plant_member(plant_id));

create policy "Plant members can add notes"
  on public.plant_notes for insert
  with check (public.is_plant_member(plant_id) and user_id = auth.uid());

create policy "Note author or plant owner can delete notes"
  on public.plant_notes for delete
  using (
    user_id = auth.uid()
    or exists (select 1 from public.plants where id = plant_id and user_id = auth.uid())
  );

-- ---- plant_collaborators policies
create policy "Owner can view their plant's collaborators"
  on public.plant_collaborators for select
  using (owner_id = auth.uid() or collaborator_user_id = auth.uid());

create policy "Owner can invite collaborators"
  on public.plant_collaborators for insert
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.plants where id = plant_id and user_id = auth.uid())
  );

create policy "Owner can remove collaborators"
  on public.plant_collaborators for delete
  using (owner_id = auth.uid());

-- ============ Extend existing policies to cover collaborators ============
-- Plants: owners keep full control; collaborators can view (not edit/delete).
drop policy if exists "Users can view their own plants" on public.plants;
create policy "Owners and collaborators can view plants"
  on public.plants for select
  using (public.is_plant_member(id));

-- Entries: any plant member can view/add; only the original logger or the
-- plant owner can edit/delete a given entry.
drop policy if exists "Users can view their own entries" on public.entries;
create policy "Plant members can view entries"
  on public.entries for select
  using (public.is_plant_member(plant_id));

drop policy if exists "Users can insert their own entries" on public.entries;
create policy "Plant members can insert entries"
  on public.entries for insert
  with check (public.is_plant_member(plant_id) and user_id = auth.uid());

drop policy if exists "Users can update their own entries" on public.entries;
create policy "Entry author or plant owner can update entries"
  on public.entries for update
  using (
    user_id = auth.uid()
    or exists (select 1 from public.plants where id = plant_id and user_id = auth.uid())
  );

drop policy if exists "Users can delete their own entries" on public.entries;
create policy "Entry author or plant owner can delete entries"
  on public.entries for delete
  using (
    user_id = auth.uid()
    or exists (select 1 from public.plants where id = plant_id and user_id = auth.uid())
  );

-- entry_photos: same shape as entries above.
drop policy if exists "Users can view their own entry photos" on public.entry_photos;
create policy "Plant members can view entry photos"
  on public.entry_photos for select
  using (public.is_plant_member((select plant_id from public.entries where id = entry_id)));

drop policy if exists "Users can insert their own entry photos" on public.entry_photos;
create policy "Plant members can insert entry photos"
  on public.entry_photos for insert
  with check (
    public.is_plant_member((select plant_id from public.entries where id = entry_id))
    and user_id = auth.uid()
  );

drop policy if exists "Users can delete their own entry photos" on public.entry_photos;
create policy "Photo author or plant owner can delete entry photos"
  on public.entry_photos for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.entries e
      join public.plants p on p.id = e.plant_id
      where e.id = entry_id and p.user_id = auth.uid()
    )
  );

-- ============ Storage: allow plant members to view/upload shared photos ============
-- Photos are stored at "<uploader_user_id>/<plant_id>/<timestamp>.jpg", so the
-- original per-uploader-folder policies (from schema.sql) block a collaborator
-- from viewing photos the plant owner uploaded, and vice versa. Replace them
-- with policies keyed off the plant_id segment (2nd folder) and plant
-- membership instead.

drop policy if exists "Users can upload their own photos" on storage.objects;
create policy "Plant members can upload photos"
  on storage.objects for insert
  with check (
    bucket_id = 'plant-photos'
    and public.is_plant_member(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "Users can view their own photos" on storage.objects;
create policy "Plant members can view photos"
  on storage.objects for select
  using (
    bucket_id = 'plant-photos'
    and public.is_plant_member(((storage.foldername(name))[2])::uuid)
  );

drop policy if exists "Users can delete their own photos" on storage.objects;
create policy "Uploader or plant owner can delete photos"
  on storage.objects for delete
  using (
    bucket_id = 'plant-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.plants
        where id = ((storage.foldername(name))[2])::uuid and user_id = auth.uid()
      )
    )
  );

-- Note: fetchAllEntriesForUser in src/api.js now fetches by plant membership
-- rather than by "entries I personally logged" — see the updated api.js for
-- how the client queries this so collaborators see the full shared history.
