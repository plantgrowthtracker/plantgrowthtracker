import { useRef, useState } from 'react'
import { suggestWateringInterval } from '../speciesData'

function todayStr() { return new Date().toISOString().slice(0, 10) }

export default function PlantFormModal({ t, show, onClose, onSave }) {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [added, setAdded] = useState(todayStr())
  const [interval, setInterval_] = useState(3)
  const [suggestion, setSuggestion] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInput = useRef(null)

  function handleSpeciesChange(value) {
    setSpecies(value)
    setSuggestion(suggestWateringInterval(value))
  }

  function applySuggestion() {
    if (suggestion) setInterval_(suggestion)
  }

  function reset() {
    setName(''); setSpecies(''); setAdded(todayStr()); setInterval_(3); setSuggestion(null)
    setFile(null); setPreview(null); setError(''); setSaving(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  function handleClose() { reset(); onClose() }

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
    if (!name.trim()) { setError(t('validName')); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), species: species.trim(), added, interval: parseInt(interval) || 3, file })
      reset()
    } catch (err) {
      setError(err.message || t('authError'))
      setSaving(false)
    }
  }

  if (!show) return null

  return (
    <div className="overlay show" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="modal">
        <div className="modal-head">
          <h2>{t('modalAddTitle')}</h2>
          <button className="close-x" onClick={handleClose}>&times;</button>
        </div>
        <div className="modal-body">
          <label>{t('lblName')}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />

          <label>{t('lblSpecies')}</label>
          <input type="text" value={species} onChange={(e) => handleSpeciesChange(e.target.value)} />
          {suggestion && (
            <div className="field-hint">
              {t('intervalSuggested').replace('{n}', suggestion)}{' '}
              <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', marginLeft: 6 }} onClick={applySuggestion}>
                {suggestion}d
              </button>
            </div>
          )}

          <div className="row2">
            <div>
              <label>{t('lblAdded')}</label>
              <input type="date" value={added} onChange={(e) => setAdded(e.target.value)} />
            </div>
            <div>
              <label>{t('lblInterval')}</label>
              <input type="number" min="1" value={interval} onChange={(e) => setInterval_(e.target.value)} />
            </div>
          </div>

          <label>{t('lblPhoto')}</label>
          <div className="photo-drop" onClick={() => fileInput.current.click()}>
            <input ref={fileInput} type="file" accept="image/*" onChange={handleFile} />
            <div>{t('photoHint')}</div>
            {preview && <img className="preview" src={preview} alt="" />}
          </div>
          <div className="field-hint">{t('photoNote')}</div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={handleClose}>{t('cancel')}</button>
            <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? t('loading') : t('savePlant')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
