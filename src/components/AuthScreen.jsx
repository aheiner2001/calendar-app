import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { detectInAppBrowser } from '../lib/authSignIn.js'
import { AppleIcon, GoogleIcon } from './icons.jsx'

export default function AuthScreen() {
  const { signInWithGoogle, signInWithApple, theme, toggleTheme, authError } = useApp()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inAppBrowser = detectInAppBrowser()
  const displayError = error || authError

  const run = async (fn) => {
    setError('')
    setBusy(true)
    try {
      const mode = await fn()
      if (mode === 'redirect') return
      setBusy(false)
    } catch (err) {
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Area Book</h1>
        <p className="auth-sub">Sign in to sync your calendar across devices.</p>

        {inAppBrowser && (
          <p className="auth-inapp-warning">
            You&apos;re viewing this inside {inAppBrowser}. Apple Sign-In usually only works in Safari
            or Chrome — use <strong>Open in Browser</strong> from the menu (⋯) if Apple sign-in fails.
          </p>
        )}

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

        {displayError && <p className="auth-error">{displayError}</p>}
        {busy && <p className="auth-busy">Signing in…</p>}

        <p className="auth-hint">
          You&apos;ll be sent to Google or Apple to sign in, then returned here automatically.
        </p>

        <button className="theme-toggle auth-theme" onClick={toggleTheme} aria-label="Toggle theme">
          <div className="knob">{theme === 'dark' ? '☀' : '🌙'}</div>
        </button>
      </div>
    </div>
  )
}

function friendlyError(err) {
  const code = err?.code || ''
  const message = err?.message || ''
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in was cancelled.'
  }
  if (code === 'auth/popup-blocked' || message.includes('popup-blocked')) {
    return 'Sign-in was blocked. Refresh the page and try again.'
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Sign-in was interrupted. Wait a moment and try again.'
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with this email using a different sign-in method. Try Google if you used Apple before, or vice versa.'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is not enabled in Firebase yet.'
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This site is not authorized in Firebase. Add your domain under Authentication → Settings → Authorized domains.'
  }
  if (code === 'auth/invalid-credential' || code === 'auth/invalid-oauth-provider') {
    return 'Apple sign-in could not complete. Confirm Apple is enabled in Firebase and your Return URL is set in Apple Developer.'
  }
  return err?.message || 'Something went wrong. Try again.'
}
