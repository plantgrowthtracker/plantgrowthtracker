import { useState } from 'react'

export default function Household({ t, collaborators, onInvite, onRemove }) {
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleInvite() {
    if (!email.trim()) return
    setSaving(true)
    setError('')
    try {
      await onInvite(email.trim())
      setEmail('')
    } catch (err) {
      setError(err.message || '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="field-hint" style={{ marginBottom: 12 }}>{t('householdHint')}</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="email"
          value={email}
          placeholder={t('invitePh')}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" disabled={saving || !email.trim()} onClick={handleInvite}>
          {t('sendInvite')}
        </button>
      </div>
      {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

      {collaborators.length === 0 ? (
        <div className="chart-empty">{t('noCollaboratorsYet')}</div>
      ) : (
        collaborators.map((c) => (
          <div className="log-row" key={c.id}>
            <span>{c.collaborator_email}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="vine-tag">{c.status === 'accepted' ? t('collabAccepted') : t('collabPending')}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => onRemove(c.id)}>{t('removeCollaborator')}</button>
            </span>
          </div>
        ))
      )}
    </div>
  )
}
