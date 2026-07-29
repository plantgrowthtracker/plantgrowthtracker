import { supabase } from './supabaseClient'
import { compressImage } from './imageUtils'

const PHOTO_BUCKET = 'plant-photos'

/* ---------------- Plants ---------------- */

export async function fetchPlants() {
  const { data, error } = await supabase
    .from('plants')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createPlant({ userId, name, species, addedDate, waterIntervalDays }) {
  const { data, error } = await supabase
    .from('plants')
    .insert({
      user_id: userId,
      name,
      species: species || null,
      added_date: addedDate,
      watering_interval_days: waterIntervalDays,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setPlantCoverPhoto(plantId, photoPath) {
  const { error } = await supabase
    .from('plants')
    .update({ cover_photo_path: photoPath })
    .eq('id', plantId)
  if (error) throw error
}

export async function deletePlant(plantId) {
  // Fetch related entries + entry photos + the plant so we can clean up
  // their storage objects first.
  const { data: entries } = await supabase
    .from('entries')
    .select('id, photo_path')
    .eq('plant_id', plantId)
  const entryIds = (entries || []).map((e) => e.id)
  const { data: extraPhotos } = entryIds.length
    ? await supabase.from('entry_photos').select('photo_path').in('entry_id', entryIds)
    : { data: [] }
  const { data: plant } = await supabase
    .from('plants')
    .select('cover_photo_path')
    .eq('id', plantId)
    .single()

  const paths = [
    ...(entries || []).filter((e) => e.photo_path).map((e) => e.photo_path),
    ...(extraPhotos || []).map((p) => p.photo_path),
  ]
  if (plant?.cover_photo_path) paths.push(plant.cover_photo_path)
  if (paths.length) {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths)
  }

  const { error } = await supabase.from('plants').delete().eq('id', plantId)
  if (error) throw error
}

/* ---------------- Entries (water / pesticide / photo logs) ---------------- */

export async function fetchEntries(plantId) {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('plant_id', plantId)
    .order('entry_date', { ascending: true })
  if (error) throw error
  return data
}

// Note: this fetches every entry the RLS policies let the current user see
// (their own plants' entries, plus any plant they're an accepted household
// collaborator on) — it does NOT filter to "entries I personally logged",
// so collaborators see the full shared care history. The userId param is
// unused now but kept so callers don't need to change.
export async function fetchAllEntriesForUser(_userId) {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
  if (error) throw error
  return data
}

export async function createEntry({
  userId, plantId, type, entryDate, note, heightCm, healthRating, photoPath,
}) {
  const { data, error } = await supabase
    .from('entries')
    .insert({
      user_id: userId,
      plant_id: plantId,
      type,
      entry_date: entryDate,
      note: note || null,
      height_cm: heightCm ?? null,
      health_rating: healthRating ?? null,
      photo_path: photoPath || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Editing intentionally leaves the photo(s) alone — only date/note/height/
// health can change. Only the original logger or the plant's owner can call
// this successfully; RLS enforces that (see migration_v3.sql).
export async function updateEntry(entryId, { entryDate, note, heightCm, healthRating }) {
  const { data, error } = await supabase
    .from('entries')
    .update({
      entry_date: entryDate,
      note: note || null,
      height_cm: heightCm ?? null,
      health_rating: healthRating ?? null,
    })
    .eq('id', entryId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Deletes an entry and cleans up its photo(s) from storage — both the
// single legacy photo_path column and any rows in entry_photos.
export async function deleteEntry(entry) {
  const { data: extraPhotos } = await supabase
    .from('entry_photos')
    .select('photo_path')
    .eq('entry_id', entry.id)

  const paths = [
    ...(entry.photo_path ? [entry.photo_path] : []),
    ...(extraPhotos || []).map((p) => p.photo_path),
  ]
  if (paths.length) {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths)
  }

  const { error } = await supabase.from('entries').delete().eq('id', entry.id)
  if (error) throw error
}

/* ---------------- Entry photos (multiple per entry) ---------------- */

export async function fetchEntryPhotos(entryIds) {
  if (!entryIds || entryIds.length === 0) return []
  const { data, error } = await supabase
    .from('entry_photos')
    .select('*')
    .in('entry_id', entryIds)
  if (error) throw error
  return data
}

export async function addEntryPhoto({ userId, entryId, photoPath }) {
  const { data, error } = await supabase
    .from('entry_photos')
    .insert({ user_id: userId, entry_id: entryId, photo_path: photoPath })
    .select()
    .single()
  if (error) throw error
  return data
}

/* ---------------- Plant notes / journal ---------------- */

export async function fetchPlantNotes(plantId) {
  const { data, error } = await supabase
    .from('plant_notes')
    .select('*')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addPlantNote({ userId, plantId, note }) {
  const { data, error } = await supabase
    .from('plant_notes')
    .insert({ user_id: userId, plant_id: plantId, note })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePlantNote(noteId) {
  const { error } = await supabase.from('plant_notes').delete().eq('id', noteId)
  if (error) throw error
}

/* ---------------- Household collaborators ---------------- */

export async function fetchCollaborators(plantId) {
  const { data, error } = await supabase
    .from('plant_collaborators')
    .select('*')
    .eq('plant_id', plantId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function inviteCollaborator({ plantId, ownerId, email }) {
  const { data, error } = await supabase
    .from('plant_collaborators')
    .insert({ plant_id: plantId, owner_id: ownerId, collaborator_email: email.trim().toLowerCase() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeCollaborator(collaboratorRowId) {
  const { error } = await supabase.from('plant_collaborators').delete().eq('id', collaboratorRowId)
  if (error) throw error
}

// Call once after login — links any pending invites sent to this user's
// email to their account, so shared plants show up for them immediately.
export async function acceptPendingCollaboratorInvites() {
  const { error } = await supabase.rpc('accept_pending_collaborator_invites')
  if (error) throw error
}

/* ---------------- Public share links ---------------- */

export async function setPlantShareToken(plantId, token) {
  const { error } = await supabase
    .from('plants')
    .update({ share_token: token })
    .eq('id', plantId)
  if (error) throw error
}

// These two read through public RPCs (see supabase/migration_v2.sql) that
// bypass RLS but only ever return rows matching the given token, so they
// work for a logged-out visitor on a /share/<token> link.
export async function fetchSharedPlant(token) {
  const { data, error } = await supabase.rpc('get_shared_plant', { token })
  if (error) throw error
  return data?.[0] || null
}

export async function fetchSharedEntries(token) {
  const { data, error } = await supabase.rpc('get_shared_entries', { token })
  if (error) throw error
  return data || []
}

// Photos for a shared plant are served through an Edge Function (the bucket
// itself stays private) — see supabase/functions/get-shared-photo.
export async function getSharedPhotoUrl(token, path) {
  if (!path) return null
  try {
    const { data, error } = await supabase.functions.invoke('get-shared-photo', {
      body: { token, path },
    })
    if (error) return null
    return data?.url || null
  } catch {
    return null
  }
}

/* ---------------- Photo storage ---------------- */

// Uploads a compressed JPEG under the user's own folder so storage RLS
// policies (see supabase/schema.sql) can scope access by user id.
export async function uploadPlantPhoto(userId, plantId, file) {
  const blob = await compressImage(file, 640, 0.72)
  const path = `${userId}/${plantId}/${Date.now()}.jpg`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  return path
}

const signedUrlCache = new Map()

// The bucket is private, so every view gets a short-lived signed URL rather
// than a public one. Cached in memory for the session to avoid re-signing
// the same photo repeatedly while browsing.
export async function getPhotoUrl(path) {
  if (!path) return null
  if (signedUrlCache.has(path)) return signedUrlCache.get(path)
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60)
  if (error) return null
  signedUrlCache.set(path, data.signedUrl)
  return data.signedUrl
}
