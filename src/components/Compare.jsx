import { useEffect, useState } from 'react'
import { getPhotoUrl } from '../api'

function CompareCol({ entry }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let alive = true
    getPhotoUrl(entry.photo_path).then((u) => { if (alive) setUrl(u) })
    return () => { alive = false }
  }, [entry.photo_path])
  return (
    <div className="compare-col">
      <img src={url || ''} alt="" />
      <div className="cdate">{entry.entry_date}</div>
      <div className="cnote">{entry.note || ''}{entry.height_cm != null ? ` · ${entry.height_cm} cm` : ''}</div>
    </div>
  )
}

export default function Compare({ t, entries }) {
  const photos = entries
    .filter((e) => e.photo_path)
    .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))

  const [fromIdx, setFromIdx] = useState(0)
  const [toIdx, setToIdx] = useState(Math.max(photos.length - 1, 0))

  if (photos.length < 2) return <div className="chart-empty">{t('needTwo')}</div>

  return (
    <div>
      <div className="compare-selects">
        <div className="field">
          <label>{t('compareFrom')}</label>
          <select value={fromIdx} onChange={(e) => setFromIdx(parseInt(e.target.value))}>
            {photos.map((p, i) => <option key={p.id} value={i}>{p.entry_date}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t('compareTo')}</label>
          <select value={toIdx} onChange={(e) => setToIdx(parseInt(e.target.value))}>
            {photos.map((p, i) => <option key={p.id} value={i}>{p.entry_date}</option>)}
          </select>
        </div>
      </div>
      <div className="compare-view">
        <CompareCol entry={photos[fromIdx]} />
        <CompareCol entry={photos[toIdx]} />
      </div>
    </div>
  )
}
