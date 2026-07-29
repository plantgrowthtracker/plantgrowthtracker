import { useEffect, useState } from 'react'
import { getPhotoUrl } from '../api'

function TimelinePhoto({ entry, onOpen }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let alive = true
    getPhotoUrl(entry.photo_path).then((u) => { if (alive) setUrl(u) })
    return () => { alive = false }
  }, [entry.photo_path])
  return (
    <img
      className="vine-photo"
      src={url || ''}
      alt=""
      onClick={() => url && onOpen(url)}
    />
  )
}

export default function Timeline({ t, entries, entryPhotos, onOpenLightbox }) {
  const photos = entries
    .filter((e) => e.photo_path)
    .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))

  if (photos.length === 0) {
    return <div className="chart-empty">{t('noPhotosYet')}</div>
  }

  return (
    <div className="vine-entries">
      {photos.map((e) => {
        const extras = (entryPhotos || []).filter((ph) => ph.entry_id === e.id)
        return (
          <div className="vine-entry" key={e.id}>
            <svg className="vine-leaf" viewBox="0 0 26 26">
              <circle cx="13" cy="13" r="11" fill="#E8A23D" opacity="0.85" />
              <path d="M13 19C10 16 8 13 8 10C8 7 10 5 13 5C16 5 18 7 18 10C18 13 16 16 13 19Z" fill="#1E3A2B" />
            </svg>
            <TimelinePhoto entry={e} onOpen={onOpenLightbox} />
            <div className="vine-info">
              <div className="vine-date">{e.entry_date}</div>
              {e.note && <div className="vine-note">{e.note}</div>}
              <div className="vine-tags">
                {e.height_cm != null && <span className="vine-tag">{t('heightLbl')}: {e.height_cm} cm</span>}
                {e.health_rating != null && <span className="vine-tag">{t('healthLbl')}: {e.health_rating}/5</span>}
              </div>
              {extras.length > 0 && (
                <div className="entry-photo-strip">
                  {extras.map((ph) => (
                    <ExtraPhoto key={ph.id} path={ph.photo_path} onOpen={onOpenLightbox} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ExtraPhoto({ path, onOpen }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let alive = true
    getPhotoUrl(path).then((u) => { if (alive) setUrl(u) })
    return () => { alive = false }
  }, [path])
  if (!url) return null
  return <img src={url} alt="" onClick={() => onOpen(url)} />
}
