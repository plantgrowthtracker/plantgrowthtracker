import { useEffect, useState } from 'react'
import { getPhotoUrl } from '../api'

const dayMs = 86400000
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / dayMs)
}

export function waterStatus(plant, entries) {
  const waterEntries = entries
    .filter((e) => e.plant_id === plant.id && e.type === 'water')
    .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
  const last = waterEntries[0]
  const baseline = last ? last.entry_date : plant.added_date
  const due = new Date(baseline)
  due.setDate(due.getDate() + plant.watering_interval_days)
  const todayStr = new Date().toISOString().slice(0, 10)
  const diff = daysBetween(todayStr, due.toISOString().slice(0, 10))
  return { diff, due: due.toISOString().slice(0, 10), last }
}

export function lastEntryOfType(entries, plantId, type) {
  const list = entries
    .filter((e) => e.plant_id === plantId && e.type === type)
    .sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date))
  return list[0] || null
}

export default function PlantCard({ plant, entries, t, onOpen, rainfallMm, rainThreshold }) {
  const [photoUrl, setPhotoUrl] = useState(null)
  const st = waterStatus(plant, entries)
  const lastW = lastEntryOfType(entries, plant.id, 'water')
  const lastP = lastEntryOfType(entries, plant.id, 'pesticide')
  const showRainHint = st.diff <= 0 && rainfallMm != null && rainfallMm >= rainThreshold

  useEffect(() => {
    let alive = true
    if (plant.cover_photo_path) {
      getPhotoUrl(plant.cover_photo_path).then((url) => { if (alive) setPhotoUrl(url) })
    }
    return () => { alive = false }
  }, [plant.cover_photo_path])

  let chipClass = 'status-ok'
  let chipText
  if (st.diff < 0) { chipClass = 'status-overdue'; chipText = `${Math.abs(st.diff)} ${t('overdue')}` }
  else if (st.diff === 0) { chipClass = 'status-soon'; chipText = t('dueToday') }
  else { chipText = `${t('inDays')} ${st.diff} ${t('days')}` }

  return (
    <div className="card" onClick={() => onOpen(plant.id)}>
      <div className="card-photo">
        <div className={`status-chip ${chipClass}`}>{chipText}</div>
        {photoUrl ? (
          <img src={photoUrl} alt={plant.name} />
        ) : (
          <svg className="placeholder" viewBox="0 0 48 48" fill="none">
            <path d="M24 40C18 34 14 26 14 20C14 13 18.5 9 24 9C29.5 9 34 13 34 20C34 26 30 34 24 40Z" fill="none" stroke="#9CB39A" strokeWidth="2" />
            <path d="M24 40V16" stroke="#9CB39A" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div className="card-body">
        <h3>{plant.name}</h3>
        {plant.species && <div className="species">{plant.species}</div>}
        <div className="card-meta"><span>{t('statWatered')}: {lastW ? lastW.entry_date : t('never')}</span></div>
        <div className="card-meta"><span>{t('statPesticide')}: {lastP ? lastP.entry_date : t('never')}</span></div>
        {showRainHint && <span className="rain-hint">{t('rainHint')}</span>}
      </div>
    </div>
  )
}
