import { useState } from 'react'
import { supabase } from '../supabaseClient'
import Logo from './Logo'

export default function Auth({ t }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  function switchMode(next) {
    setMode(next); setError(''); setNotice('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')

    if (mode === 'signup' && password !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }

    setBusy(true)
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setNotice(t('resetLinkSent'))
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setNotice(t('checkEmail'))
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message || t('authError'))
    } finally {
      setBusy(false)
    }
  }

  const heading = mode === 'login' ? t('welcomeBack') : mode === 'signup' ? t('createAccount') : t('resetPasswordTitle')
  const tagline = mode === 'forgot' ? t('resetPasswordTagline') : t('authTagline')

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Logo className="auth-logo" />
        <h2>{heading}</h2>
        <div className="sub">{tagline}</div>

        <form onSubmit={handleSubmit}>
          <label>{t('email')}</label>
          <input
            type="email"
            value={email}
            required
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />

          {mode !== 'forgot' && (
            <>
              <label>{t('password')}</label>
              <input
                type="password"
                value={password}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}

          {mode === 'signup' && (
            <>
              <label>{t('confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                required
                minLength={6}
                autoComplete="new-password"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </>
          )}

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: 6 }}>
              <button type="button" className="auth-switch" style={{ display: 'inline' }} onClick={() => switchMode('forgot')}>
                {t('forgotPassword')}
              </button>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
          {notice && <div className="form-note">{notice}</div>}

          <button className="btn btn-primary auth-submit" disabled={busy} type="submit">
            {busy ? t('loading') : mode === 'login' ? t('login') : mode === 'signup' ? t('signup') : t('sendResetLink')}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' && (
            <>{t('noAccount')} <button onClick={() => switchMode('signup')}>{t('signup')}</button></>
          )}
          {mode === 'signup' && (
            <>{t('haveAccount')} <button onClick={() => switchMode('login')}>{t('login')}</button></>
          )}
          {mode === 'forgot' && (
            <button onClick={() => switchMode('login')}>{t('backToLogin')}</button>
          )}
        </div>
      </div>
    </div>
  )
}
