import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import { STR } from './i18n'
import * as api from './api'
import { getSavedLocation, saveLocation, getRecentRainfallMm, RAIN_SKIP_THRESHOLD_MM } from './weather'
import { exportAllDataCsv } from './exportUtils'
import { enqueue, syncQueue, queueLength } from './offlineQueue'
import Auth from './components/Auth'
import NewPassword from './components/NewPassword'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import PlantFormModal from './components/PlantFormModal'
import LogModal from './components/LogModal'
import PlantDetail from './components/PlantDetail'
import Lightbox from './components/Lightbox'
import Toast from './components/Toast'

const THEME_KEY = 'pgt-theme'

// A quick-access QR code link (/plant/<id>) is read once at load time — see
// main.jsx for the matching share-link route.
const plantLinkMatch = window.location.pathname.match(/^\/plant\/([a-zA-Z0-9-]+)/)
const deepLinkPlantId = plantLinkMatch ? plantLinkMatch[1] : null

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = not checked yet, null = logged out
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [lang, setLang] = useState('en')
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light')
  const [plants, setPlants] = useState([])
  const [entries, setEntries] = useState([])
  const [entryPhotos, setEntryPhotos] = useState([])
  const [rainfallMm, setRainfallMm] = useState(null)
  const [offlineCount, setOfflineCount] = useState(() => queueLength())

  const [showAddPlant, setShowAddPlant] = useState(false)
  const [activePlantId, setActivePlantId] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [logType, setLogType] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [plantNotes, setPlantNotes] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [toastMsg, setToastMsg] = useState('')

  const deepLinkHandled = useRef(false)

  const t = useCallback((key) => STR[lang][key], [lang])

  useEffect(() => {
    document.body.classList.toggle('hi', lang === 'hi')
  }, [lang])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      setSession(s)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const loc = getSavedLocation()
    if (loc) getRecentRainfallMm(loc).then(setRainfallMm)
  }, [])

  const loadData = useCallback(async () => {
    if (!session) return
    try {
      await api.acceptPendingCollaboratorInvites().catch(() => {})
      const [plantRows, entryRows] = await Promise.all([
        api.fetchPlants(),
        api.fetchAllEntriesForUser(session.user.id),
      ])
      setPlants(plantRows)
      setEntries(entryRows)
      const photoRows = await api.fetchEntryPhotos(entryRows.map((e) => e.id))
      setEntryPhotos(photoRows)
    } catch (err) {
      showToast(err.message)
    }
  }, [session])

  useEffect(() => { loadData() }, [loadData])

  // Open a plant directly if this session started from a /plant/<id> QR link.
  useEffect(() => {
    if (deepLinkPlantId && !deepLinkHandled.current && plants.some((p) => p.id === deepLinkPlantId)) {
      deepLinkHandled.current = true
      setActivePlantId(deepLinkPlantId)
      setShowDetail(true)
      window.history.replaceState(null, '', '/')
    }
  }, [plants])

  // Sync any offline-queued watering/pesticide entries once we're back online.
  const trySync = useCallback(async () => {
    const results = await syncQueue((item) => api.createEntry(item))
    if (results.length > 0) {
      setEntries((prev) => {
        const withoutTemps = prev.filter((e) => !results.some((r) => r.tempId === e.id))
        return [...withoutTemps, ...results.map((r) => r.realEntry)]
      })
      showToast(t('offlineSynced').replace('{n}', results.length))
    }
    setOfflineCount(queueLength())
  }, [t])

  useEffect(() => {
    window.addEventListener('online', trySync)
    if (navigator.onLine) trySync()
    return () => window.removeEventListener('online', trySync)
  }, [trySync])

  // Load notes + collaborators for whichever plant is currently open.
  useEffect(() => {
    if (!showDetail || !activePlantId) {
      setPlantNotes([])
      setCollaborators([])
      return
    }
    let alive = true
    api.fetchPlantNotes(activePlantId).then((rows) => { if (alive) setPlantNotes(rows) }).catch(() => {})
    api.fetchCollaborators(activePlantId).then((rows) => { if (alive) setCollaborators(rows) }).catch(() => {})
    return () => { alive = false }
  }, [showDetail, activePlantId])

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2200)
  }

  function toggleTheme() {
    setTheme((th) => (th === 'dark' ? 'light' : 'dark'))
  }

  async function handleUseMyLocation() {
    if (!navigator.geolocation) { showToast(t('locationError')); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        saveLocation(loc)
        showToast(t('locationSet'))
        const mm = await getRecentRainfallMm(loc)
        setRainfallMm(mm)
      },
      () => showToast(t('locationError'))
    )
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setPlants([])
    setEntries([])
    setEntryPhotos([])
  }

  async function handleSavePlant({ name, species, added, interval, file }) {
    const plant = await api.createPlant({
      userId: session.user.id, name, species, addedDate: added, waterIntervalDays: interval,
    })
    if (file) {
      const path = await api.uploadPlantPhoto(session.user.id, plant.id, file)
      await api.setPlantCoverPhoto(plant.id, path)
      plant.cover_photo_path = path
    }
    setPlants((prev) => [...prev, plant])
    setShowAddPlant(false)
    showToast(t('toastPlantSaved'))
  }

  function openDetail(plantId) {
    setActivePlantId(plantId)
    setShowDetail(true)
  }

  function quickLog(type) {
    setEditingEntry(null)
    setLogType(type)
  }

  function editEntry(entry) {
    setLogType(entry.type)
    setEditingEntry(entry)
  }

  async function handleSaveLog({ date, note, height, health, files }) {
    // Editing an existing entry — no offline path needed since you can only
    // edit something that already made it to the server.
    if (editingEntry) {
      const updated = await api.updateEntry(editingEntry.id, {
        entryDate: date, note, heightCm: height, healthRating: health,
      })
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      setEditingEntry(null)
      setLogType(null)
      showToast(t('toastEntryUpdated'))
      return
    }

    const hasFiles = files && files.length > 0
    const canQueueOffline = !hasFiles && (logType === 'water' || logType === 'pesticide') && !navigator.onLine

    if (canQueueOffline) {
      const action = {
        userId: session.user.id, plantId: activePlantId, type: logType,
        entryDate: date, note, heightCm: height, healthRating: health, photoPath: null,
      }
      const queued = enqueue(action)
      setEntries((prev) => [...prev, {
        id: queued.tempId, plant_id: activePlantId, type: logType, entry_date: date,
        note: note || null, height_cm: height ?? null, health_rating: health ?? null, photo_path: null,
      }])
      setOfflineCount(queueLength())
      setLogType(null)
      showToast(t('offlineQueued'))
      return
    }

    let firstPath = null
    if (hasFiles) {
      firstPath = await api.uploadPlantPhoto(session.user.id, activePlantId, files[0])
    }
    const entry = await api.createEntry({
      userId: session.user.id,
      plantId: activePlantId,
      type: logType,
      entryDate: date,
      note,
      heightCm: height,
      healthRating: health,
      photoPath: firstPath,
    })
    setEntries((prev) => [...prev, entry])

    if (hasFiles && files.length > 1) {
      const extraPhotos = []
      for (const f of files.slice(1)) {
        const path = await api.uploadPlantPhoto(session.user.id, activePlantId, f)
        const row = await api.addEntryPhoto({ userId: session.user.id, entryId: entry.id, photoPath: path })
        extraPhotos.push(row)
      }
      setEntryPhotos((prev) => [...prev, ...extraPhotos])
    }

    setLogType(null)
    showToast(t('toastLogSaved'))
  }

  async function handleDeleteEntry(entry) {
    await api.deleteEntry(entry)
    setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    setEntryPhotos((prev) => prev.filter((ph) => ph.entry_id !== entry.id))
    showToast(t('toastEntryDeleted'))
  }

  async function handleWaterAllDue(duePlantIds) {
    const today = new Date().toISOString().slice(0, 10)
    const newEntries = []
    for (const plantId of duePlantIds) {
      if (!navigator.onLine) {
        const action = { userId: session.user.id, plantId, type: 'water', entryDate: today, note: null, heightCm: null, healthRating: null, photoPath: null }
        const queued = enqueue(action)
        newEntries.push({
          id: queued.tempId, plant_id: plantId, type: 'water', entry_date: today,
          note: null, height_cm: null, health_rating: null, photo_path: null,
        })
      } else {
        const entry = await api.createEntry({ userId: session.user.id, plantId, type: 'water', entryDate: today })
        newEntries.push(entry)
      }
    }
    setEntries((prev) => [...prev, ...newEntries])
    setOfflineCount(queueLength())
    showToast(t('toastBulkWatered').replace('{n}', duePlantIds.length))
  }

  async function handleDeletePlant() {
    if (!window.confirm(t('confirmDelete'))) return
    await api.deletePlant(activePlantId)
    setPlants((prev) => prev.filter((p) => p.id !== activePlantId))
    setEntries((prev) => prev.filter((e) => e.plant_id !== activePlantId))
    setShowDetail(false)
    showToast(t('toastDeleted'))
  }

  async function handleToggleShare(plant) {
    const nextToken = plant.share_token ? null : crypto.randomUUID()
    await api.setPlantShareToken(plant.id, nextToken)
    setPlants((prev) => prev.map((p) => (p.id === plant.id ? { ...p, share_token: nextToken } : p)))
  }

  async function handleAddNote(plantId, text) {
    const note = await api.addPlantNote({ userId: session.user.id, plantId, note: text })
    setPlantNotes((prev) => [note, ...prev])
  }

  async function handleDeleteNote(noteId) {
    await api.deletePlantNote(noteId)
    setPlantNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  async function handleInviteCollaborator(plant, email) {
    const row = await api.inviteCollaborator({ plantId: plant.id, ownerId: session.user.id, email })
    setCollaborators((prev) => [...prev, row])
    showToast(t('toastInviteSent'))
  }

  async function handleRemoveCollaborator(rowId) {
    await api.removeCollaborator(rowId)
    setCollaborators((prev) => prev.filter((c) => c.id !== rowId))
    showToast(t('toastCollaboratorRemoved'))
  }

  function handleExportCsv() {
    exportAllDataCsv(plants, entries)
  }

  if (session === undefined) return null // brief auth check on load

  if (recoveryMode) {
    return <NewPassword t={t} onDone={() => { setRecoveryMode(false); showToast(t('passwordUpdated')) }} />
  }

  if (!session) return <Auth t={t} />

  const activePlant = plants.find((p) => p.id === activePlantId) || null
  const activeEntries = entries.filter((e) => e.plant_id === activePlantId)
  const activeEntryPhotos = entryPhotos.filter((ph) =>
    activeEntries.some((e) => e.id === ph.entry_id)
  )

  return (
    <>
      <Header
        t={t}
        lang={lang}
        setLang={setLang}
        theme={theme}
        onToggleTheme={toggleTheme}
        onAddPlant={() => setShowAddPlant(true)}
        onLogout={handleLogout}
        onExportCsv={handleExportCsv}
        onUseMyLocation={handleUseMyLocation}
        userEmail={session.user.email}
        offlineCount={offlineCount}
      />
      <Dashboard
        t={t}
        plants={plants}
        entries={entries}
        rainfallMm={rainfallMm}
        rainThreshold={RAIN_SKIP_THRESHOLD_MM}
        onOpenPlant={openDetail}
        onAddPlant={() => setShowAddPlant(true)}
        onWaterAllDue={handleWaterAllDue}
      />

      <PlantFormModal
        t={t}
        show={showAddPlant}
        onClose={() => setShowAddPlant(false)}
        onSave={handleSavePlant}
      />

      <PlantDetail
        t={t}
        plant={activePlant}
        entries={activeEntries}
        entryPhotos={activeEntryPhotos}
        notes={plantNotes}
        collaborators={collaborators}
        show={showDetail}
        onClose={() => setShowDetail(false)}
        onQuickLog={quickLog}
        onEditEntry={editEntry}
        onDeleteEntry={handleDeleteEntry}
        onDelete={handleDeletePlant}
        onOpenLightbox={setLightboxSrc}
        onToggleShare={handleToggleShare}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
        onInviteCollaborator={handleInviteCollaborator}
        onRemoveCollaborator={handleRemoveCollaborator}
      />

      <LogModal
        t={t}
        show={!!logType}
        logType={logType}
        editingEntry={editingEntry}
        onClose={() => { setLogType(null); setEditingEntry(null) }}
        onSave={handleSaveLog}
      />

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <Toast message={toastMsg} />
    </>
  )
}
