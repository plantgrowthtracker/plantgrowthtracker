import { useState } from 'react'
import { supabase } from '../supabaseClient'
import Logo from './Logo'

export default function NewPassword({ t, onDone }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      onDone()
    } catch (err) {
      setError(err.message || t('authError'))
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Logo className="auth-logo" />
        <h2>{t('newPasswordTitle')}</h2>
        <form onSubmit={handleSubmit}>
          <label>{t('newPassword')}</label>
          <input
            type="password"
            value={password}
            required
            minLength={6}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <label>{t('confirmPassword')}</label>
          <input
            type="password"
            value={confirmPassword}
            required
            minLength={6}
            autoComplete="new-password"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <div className="form-error">{error}</div>}
          <button className="btn btn-primary auth-submit" disabled={busy} type="submit">
            {busy ? t('loading') : t('updatePassword')}
          </button>
        </form>
      </div>
    </div>
  )
}
