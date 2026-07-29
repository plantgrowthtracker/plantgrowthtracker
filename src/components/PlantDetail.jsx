import { useEffect, useState } from 'react'
import { getPhotoUrl } from '../api'
import { waterStatus, lastEntryOfType } from './PlantCard'
import { exportPlantHistoryPdf } from '../exportUtils'
import Timeline from './Timeline'
import CareLog from './CareLog'
import Compare from './Compare'
import GrowthChart from './GrowthChart'
import PlantNotes from './PlantNotes'
import Household from './Household'
import QrCodeModal from './QrCodeModal'

export default function PlantDetail({
  t, plant, entries, entryPhotos, notes, collaborators, show, onClose,
  onQuickLog, onEditEntry, onDeleteEntry, onDelete, onOpenLightbox, onToggleShare,
  onAddNote, onDeleteNote, onInviteCollaborator, onRemoveCollaborator,
}) {
  const [tab, setTab] = useState('timeline')
  const [coverUrl, setCoverUrl] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    if (show) setTab('timeline')
  }, [show, plant?.id])

  useEffect(() => {
    let alive = true
    if (plant?.cover_photo_path) {
      getPhotoUrl(plant.cover_photo_path).then((u) => { if (alive) setCoverUrl(u) })
    } else {
      setCoverUrl(null)
    }
    return () => { alive = false }
  }, [plant?.cover_photo_path])

  if (!show || !plant) return null

  const st = waterStatus(plant, entries)
  const lastW = lastEntryOfType(entries, plant.id, 'water')
  const lastP = lastEntryOfType(entries, plant.id, 'pesticide')
  const shareUrl = plant.share_token ? `${window.location.origin}/share/${plant.share_token}` : null

  function copyShareLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const tabs = [
    ['timeline', 'tabTimeline'],
    ['logs', 'tabLogs'],
    ['journal', 'tabJournal'],
    ['compare', 'tabCompare'],
    ['chart', 'tabChart'],
    ['household', 'tabHousehold'],
  ]

  return (
    <div className="overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal wide">
        <div className="modal-head">
          <h2>{plant.name}</h2>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="detail-top">
            <img className="detail-photo" src={coverUrl || ''} alt="" />
            <div className="detail-info">
              <div className="species">{plant.species || ''}</div>
              <div className="stat-row">
                <div className="stat"><span>{t('statAdded')}</span><b>{plant.added_date}</b></div>
                <div className="stat"><span>{t('statWatered')}</span><b>{lastW ? lastW.entry_date : t('never')}</b></div>
                <div className="stat"><span>{t('statPesticide')}</span><b>{lastP ? lastP.entry_date : t('never')}</b></div>
                <div className="stat"><span>{t('statNext')}</span><b>{st.due}</b></div>
              </div>
              <div className="quick-actions">
                <button className="btn btn-primary btn-sm" onClick={() => onQuickLog('water')}>{t('water')}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => onQuickLog('pesticide')}>{t('pesticide')}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => onQuickLog('photo')}>{t('photo')}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => exportPlantHistoryPdf(plant, entries)}>{t('exportPdf')}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => onToggleShare(plant)}>
                  {plant.share_token ? t('shareOff') : t('shareTurnOn')}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowQr(true)}>{t('qrCode')}</button>
                <button className="btn btn-danger btn-sm" onClick={onDelete}>{t('del')}</button>
              </div>
              {shareUrl && (
                <div>
                  <div className="field-hint" style={{ marginTop: 10 }}>{t('shareOn')}</div>
                  <div className="share-box">
                    <input type="text" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
                    <button className="btn btn-ghost btn-sm" onClick={copyShareLink}>
                      {copied ? t('linkCopied') : t('copyLink')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="tabs">
            {tabs.map(([key, label]) => (
              <div key={key} className={`tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
                {t(label)}
              </div>
            ))}
          </div>

          {tab === 'timeline' && <Timeline t={t} entries={entries} entryPhotos={entryPhotos} onOpenLightbox={onOpenLightbox} />}
          {tab === 'logs' && <CareLog t={t} entries={entries} onEdit={onEditEntry} onDelete={onDeleteEntry} />}
          {tab === 'journal' && <PlantNotes t={t} notes={notes} onAdd={(text) => onAddNote(plant.id, text)} onDelete={onDeleteNote} />}
          {tab === 'compare' && <Compare t={t} entries={entries} />}
          {tab === 'chart' && <GrowthChart t={t} entries={entries} />}
          {tab === 'household' && (
            <Household
              t={t}
              collaborators={collaborators}
              onInvite={(email) => onInviteCollaborator(plant, email)}
              onRemove={onRemoveCollaborator}
            />
          )}
        </div>
      </div>

      <QrCodeModal t={t} plant={plant} show={showQr} onClose={() => setShowQr(false)} />
    </div>
  )
}
