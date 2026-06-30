import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { AppleIcon, GoogleIcon } from './icons.jsx'

export default function AuthScreen() {
  const { signInWithGoogle, signInWithApple, theme, toggleTheme } = useApp()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = async (fn) => {
    setError('')
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Area Book</h1>
        <p className="auth-sub">Sign in to sync your calendar across devices.</p>

        <div className="auth-oauth">
          <button
            type="button"
            className="auth-oauth-btn"
            disabled={busy}
            onClick={() => run(signInWithGoogle)}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            type="button"
            className="auth-oauth-btn auth-oauth-apple"
            disabled={busy}
            onClick={() => run(signInWithApple)}
          >
            <AppleIcon />
            Continue with Apple
          </button>
        </div>

        {error && <p className="auth-error">{error}</p>}
        {busy && <p className="auth-busy">Signing in…</p>}

        <button className="theme-toggle auth-theme" onClick={toggleTheme} aria-label="Toggle theme">
          <div className="knob">{theme === 'dark' ? '☀' : '🌙'}</div>
        </button>
      </div>
    </div>
  )
}

function friendlyError(err) {
  const code = err?.code || ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Sign-in was cancelled.'
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with this email using a different sign-in method.'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is not enabled in Firebase yet.'
  }
  return err?.message || 'Something went wrong. Try again.'
}
