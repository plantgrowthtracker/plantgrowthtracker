import { useEffect, useState } from 'react'
import * as api from '../api'
import Logo from './Logo'
import { STR } from '../i18n'

function Photo({ token, path, className, onClick }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let alive = true
    api.getSharedPhotoUrl(token, path).then((u) => { if (alive) setUrl(u) })
    return () => { alive = false }
  }, [token, path])
  if (!url) return null
  return <img className={className} src={url} alt="" onClick={onClick ? () => onClick(url) : undefined} />
}

export default function SharedPlantView({ token }) {
  const [lang] = useState('en')
  const t = (key) => STR[lang][key]
  const [plant, setPlant] = useState(undefined) // undefined = loading, null = not found
  const [entries, setEntries] = useState([])
  const [lightboxSrc, setLightboxSrc] = useState(null)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const p = await api.fetchSharedPlant(token)
        if (!alive) return
        setPlant(p)
        if (p) {
          const e = await api.fetchSharedEntries(token)
          if (alive) setEntries(e)
        }
      } catch {
        if (alive) setPlant(null)
      }
    }
    load()
    return () => { alive = false }
  }, [token])

  if (plant === undefined) return null

  if (!plant) {
    return (
      <div className="shared-page">
        <p>{t('sharedNotFound')}</p>
      </div>
    )
  }

  const photoEntries = entries
    .filter((e) => e.photo_path)
    .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))

  return (
    <div className="shared-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Logo className="brand-mark" />
        <h1 style={{ margin: 0, fontSize: 22, color: 'var(--tulsi)' }}>{t('appTitle')}</h1>
      </div>
      <div className="shared-banner">{t('sharedBanner')}</div>

      <h2 style={{ marginBottom: 2 }}>{plant.name}</h2>
      {plant.species && <div className="species" style={{ marginBottom: 16 }}>{plant.species}</div>}

      {plant.cover_photo_path && (
        <Photo token={token} path={plant.cover_photo_path} className="detail-photo" onClick={setLightboxSrc} />
      )}

      <h3 style={{ marginTop: 24 }}>{t('tabTimeline')}</h3>
      {photoEntries.length === 0 ? (
        <div className="chart-empty">{t('noPhotosYet')}</div>
      ) : (
        <div className="vine-entries" style={{ paddingLeft: 0 }}>
          {photoEntries.map((e) => (
            <div className="vine-entry" key={e.id} style={{ position: 'relative' }}>
              <Photo token={token} path={e.photo_path} className="vine-photo" onClick={setLightboxSrc} />
              <div className="vine-info">
                <div className="vine-date">{e.entry_date}</div>
                {e.note && <div className="vine-note">{e.note}</div>}
                <div className="vine-tags">
                  {e.height_cm != null && <span className="vine-tag">{t('heightLbl')}: {e.height_cm} cm</span>}
                  {e.health_rating != null && <span className="vine-tag">{t('healthLbl')}: {e.health_rating}/5</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxSrc && (
        <div className="lightbox show" onClick={() => setLightboxSrc(null)}>
          <button className="lightbox-close" onClick={() => setLightboxSrc(null)}>&times;</button>
          <img src={lightboxSrc} alt="" />
        </div>
      )}
    </div>
  )
}
