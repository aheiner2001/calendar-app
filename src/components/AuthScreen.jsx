import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { auth } from '../lib/firebase.js'
import {
  copyAppUrl,
  detectBraveBrowser,
  detectInAppBrowser,
  isEmailLinkSignIn,
  openInExternalBrowser,
  peekAuthPending,
} from '../lib/authSignIn.js'
import { AppleIcon, GoogleIcon } from './icons.jsx'

export default function AuthScreen() {
  const {
    signInWithGoogle,
    signInWithApple,
    sendSignInEmail,
    completeEmailLink,
    continueWithoutSignIn,
    theme,
    toggleTheme,
    authError,
    firebaseEnabled,
  } = useApp()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const inAppBrowser = detectInAppBrowser()
  const braveBrowser = detectBraveBrowser()
  const emailLinkPending = isEmailLinkSignIn(auth)
  const displayError = error || authError

  const run = async (fn) => {
    if (!auth) {
      setError('Firebase Auth is not ready. Check .env and refresh the page.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const mode = await fn()
      if (mode === 'redirect') {
        window.setTimeout(() => {
          if (!peekAuthPending()) return
          setBusy(false)
          setError('Sign-in did not open. Allow popups, or try Chrome/Safari.')
        }, 10000)
        return
      }
      setBusy(false)
    } catch (err) {
      console.error('Sign-in failed:', err)
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  const handleSendEmail = async () => {
    setError('')
    setBusy(true)
    try {
      await sendSignInEmail(email)
      setEmailSent(true)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const handleFinishEmailLink = async () => {
    setError('')
    setBusy(true)
    try {
      const outcome = await completeEmailLink(email)
      if (!outcome.ok) setBusy(false)
    } catch (err) {
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await copyAppUrl()
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Could not copy link. Long-press the address bar and copy the URL manually.')
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Area Book</h1>
        <p className="auth-sub">Sign in to sync your calendar across devices.</p>

        {!firebaseEnabled && (
          <p className="auth-error">
            Firebase is not configured. Locally: copy <code>.env.example</code> to <code>.env</code>{' '}
            and restart the dev server. On GitHub Pages: add <code>VITE_FIREBASE_*</code> secrets in
            the repo&apos;s Actions settings and redeploy.
          </p>
        )}

        {firebaseEnabled &&
          typeof window !== 'undefined' &&
          window.location.hostname.endsWith('github.io') &&
          !displayError && (
            <p className="auth-hint auth-deploy-hint">
              Live site: use{' '}
              <strong>https://aheiner2001.github.io/calendar-app/</strong> (include the trailing
              slash).
            </p>
          )}

        {!auth && firebaseEnabled && (
          <p className="auth-error">Firebase Auth failed to start. Hard refresh the page.</p>
        )}

        {inAppBrowser && (
          <div className="auth-inapp-panel">
            <p className="auth-inapp-warning">
              You&apos;re in <strong>{inAppBrowser}</strong>. Google and Apple sign-in usually fail
              here. Use one of these options instead:
            </p>
            <div className="auth-inapp-actions">
              <button type="button" className="auth-action-btn" onClick={() => openInExternalBrowser()}>
                Open in browser
              </button>
              <button type="button" className="auth-action-btn auth-action-secondary" onClick={handleCopyLink}>
                {copied ? 'Link copied!' : 'Copy app link'}
              </button>
            </div>
          </div>
        )}

        {braveBrowser && !inAppBrowser && (
          <p className="auth-inapp-warning">
            Brave can block Google/Apple sign-in. If sign-in fails, try Safari or Chrome, or allow
            cross-site cookies for this site in Brave&apos;s settings.
          </p>
        )}

        {(inAppBrowser || emailLinkPending) && (
          <div className="auth-email-block">
            <label className="auth-email-label" htmlFor="auth-email">
              {emailLinkPending
                ? 'Confirm your email to finish signing in'
                : emailSent
                  ? 'Check your email'
                  : 'Sign in with email link'}
            </label>
            {emailSent && !emailLinkPending ? (
              <p className="auth-email-sent">
                We sent a link to <strong>{email}</strong>. Open it from your email app (works even if
                you started in {inAppBrowser || 'an in-app browser'}).
              </p>
            ) : (
              <>
                <input
                  id="auth-email"
                  type="email"
                  className="auth-email-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="auth-action-btn auth-email-submit"
                  disabled={busy || !email.trim()}
                  onClick={emailLinkPending ? handleFinishEmailLink : handleSendEmail}
                >
                  {emailLinkPending ? 'Finish sign-in' : 'Email me a sign-in link'}
                </button>
              </>
            )}
          </div>
        )}

        {!inAppBrowser && !emailLinkPending && (
          <div className="auth-email-block auth-email-optional">
            <label className="auth-email-label" htmlFor="auth-email-opt">
              Or sign in with email
            </label>
            {emailSent ? (
              <p className="auth-email-sent">
                Check your inbox at <strong>{email}</strong> and tap the sign-in link.
              </p>
            ) : (
              <>
                <input
                  id="auth-email-opt"
                  type="email"
                  className="auth-email-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="auth-action-btn auth-action-secondary auth-email-submit"
                  disabled={busy || !email.trim()}
                  onClick={handleSendEmail}
                >
                  Email me a sign-in link
                </button>
              </>
            )}
          </div>
        )}

        <div className={`auth-oauth${inAppBrowser ? ' auth-oauth-muted' : ''}`}>
          {inAppBrowser && <p className="auth-oauth-note">Google / Apple (may not work here)</p>}
          <button
            type="button"
            className="auth-oauth-btn"
            disabled={busy || !auth}
            onClick={() => run(signInWithGoogle)}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            type="button"
            className="auth-oauth-btn auth-oauth-apple"
            disabled={busy || !auth}
            onClick={() => run(signInWithApple)}
          >
            <AppleIcon />
            Continue with Apple
          </button>
        </div>

        {displayError && <p className="auth-error">{displayError}</p>}
        {busy && <p className="auth-busy">Signing in…</p>}

        <button
          type="button"
          className="auth-continue-local"
          disabled={busy}
          onClick={continueWithoutSignIn}
        >
          Continue without signing in
        </button>
        <p className="auth-hint auth-local-hint">
          Your calendar stays on this device only. Sign in later from Sync to enable cloud backup.
        </p>

        <p className="auth-hint">
          {inAppBrowser
            ? 'Email links open in your mail app and usually work when Google/Apple do not.'
            : "You'll be sent to Google or Apple to sign in, then returned here automatically."}
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
    return 'Email sign-in is not enabled yet. Enable Email link in Firebase Authentication, or use Google/Apple in Safari or Chrome.'
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This site is not authorized in Firebase. Add your domain under Authentication → Settings → Authorized domains.'
  }
  if (code === 'auth/invalid-credential' || code === 'auth/invalid-oauth-provider') {
    return 'Apple sign-in could not complete. Confirm Apple is enabled in Firebase and your Return URL is set in Apple Developer.'
  }
  if (code === 'auth/invalid-email') {
    return 'That email address looks invalid.'
  }
  if (code === 'auth/argument-error') {
    return message || 'Sign-in could not start. Refresh and try again in Chrome or Safari.'
  }
  return err?.message || 'Something went wrong. Try again.'
}
