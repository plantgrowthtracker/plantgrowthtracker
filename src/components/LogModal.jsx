import { useEffect, useRef, useState } from 'react'

function todayStr() { return new Date().toISOString().slice(0, 10) }

export default function LogModal({ t, show, logType, editingEntry, onClose, onSave }) {
  const [date, setDate] = useState(todayStr())
  const [note, setNote] = useState('')
  const [height, setHeight] = useState('')
  const [health, setHealth] = useState('')
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInput = useRef(null)

  const isEditing = !!editingEntry

  useEffect(() => {
    if (editingEntry) {
      setDate(editingEntry.entry_date)
      setNote(editingEntry.note || '')
      setHeight(editingEntry.height_cm != null ? String(editingEntry.height_cm) : '')
      setHealth(editingEntry.health_rating != null ? String(editingEntry.health_rating) : '')
    }
  }, [editingEntry])

  function reset() {
    setDate(todayStr()); setNote(''); setHeight(''); setHealth('')
    setFiles([]); setPreviews([]); setError(''); setSaving(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  function handleClose() { reset(); onClose() }

  function handleFiles(e) {
    const chosen = Array.from(e.target.files || [])
    if (chosen.length === 0) return
    setFiles(chosen)
    setPreviews(chosen.map((f) => URL.createObjectURL(f)))
  }

  async function handleSave() {
    if (!date) { setError(t('validDate')); return }
    setSaving(true)
    try {
      await onSave({
        date, note: note.trim(),
        height: height ? parseFloat(height) : null,
        health: health ? parseInt(health) : null,
        files,
      })
      reset()
    } catch (err) {
      setError(err.message || t('authError'))
      setSaving(false)
    }
  }

  if (!show) return null

  const titles = { water: t('logTitleWater'), pesticide: t('logTitlePesticide'), photo: t('logTitlePhoto') }
  const title = isEditing ? t('editEntry') : (titles[logType] || '')

  return (
    <div className="overlay show" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="close-x" onClick={handleClose}>&times;</button>
        </div>
        <div className="modal-body">
          <label>{t('lblDate')}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <label>{t('lblNote')}</label>
          <textarea value={note} placeholder={t('notePh')} onChange={(e) => setNote(e.target.value)} />

          <div className="row2">
            <div>
              <label>{t('lblHeight')}</label>
              <input type="number" min="0" step="0.5" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
            <div>
              <label>{t('lblHealth')}</label>
              <input type="number" min="1" max="5" value={health} onChange={(e) => setHealth(e.target.value)} />
            </div>
          </div>

          {!isEditing && (
            <>
              <label>{t('lblLogPhoto')}</label>
              <div className="photo-drop" onClick={() => fileInput.current.click()}>
                <input ref={fileInput} type="file" accept="image/*" multiple onChange={handleFiles} />
                <div>{t('logPhotoHint')}</div>
                {previews.length > 0 && (
                  <div className="multi-preview">
                    {previews.map((src, i) => <img key={i} className="preview" src={src} alt="" />)}
                  </div>
                )}
              </div>
              <div className="field-hint">{t('multiPhotoHint')}</div>
            </>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={handleClose}>{t('cancel')}</button>
            <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? t('loading') : isEditing ? t('saveChanges') : t('saveEntry')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
