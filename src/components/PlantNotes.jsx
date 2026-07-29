import { useState } from 'react'

export default function PlantNotes({ t, notes, onAdd, onDelete }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!text.trim()) return
    setSaving(true)
    try {
      await onAdd(text.trim())
      setText('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <textarea
          value={text}
          placeholder={t('journalPh')}
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1, minHeight: 44 }}
        />
        <button className="btn btn-primary btn-sm" disabled={saving || !text.trim()} onClick={handleAdd}>
          {t('addNote')}
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="chart-empty">{t('noNotesYet')}</div>
      ) : (
        notes.map((n) => (
          <div className="log-row" key={n.id}>
            <span>{n.note}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="date">{n.created_at.slice(0, 10)}</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { if (window.confirm(t('confirmDeleteNote'))) onDelete(n.id) }}
              >
                {t('del')}
              </button>
            </span>
          </div>
        ))
      )}
    </div>
  )
}
