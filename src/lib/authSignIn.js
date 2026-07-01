import {
  getRedirectResult,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth'

const AUTH_PENDING_KEY = 'area-book-auth-pending'
const REDIRECT_STARTED_KEY = 'area-book-auth-redirect-ts'
const EMAIL_FOR_SIGN_IN_KEY = 'area-book-email-sign-in'

let redirectResultPromise = null

/** In-app browsers (Messenger, Discord, etc.) — OAuth redirects usually fail here. */
export function detectInAppBrowser() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent || ''
  if (/FBAN|FBAV|FB_IAB|Messenger|Instagram/i.test(ua)) return 'Facebook or Messenger'
  if (/Discord/i.test(ua)) return 'Discord'
  if (/Twitter/i.test(ua)) return 'Twitter'
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn'
  if (/Snapchat/i.test(ua)) return 'Snapchat'
  return null
}

export function detectBraveBrowser() {
  if (typeof navigator === 'undefined') return false
  return /Brave/i.test(navigator.userAgent || '')
}

/** True when the URL is a returning email sign-in link. */
export function isEmailLinkSignIn(auth) {
  if (typeof window === 'undefined' || !auth) return false
  const href = window.location.href
  if (!href.includes('oobCode=') || !href.includes('mode=signIn')) return false
  try {
    return isSignInWithEmailLink(auth, href)
  } catch {
    return false
  }
}

export function getAppOriginUrl() {
  if (typeof window === 'undefined') return ''
  const base = import.meta.env.BASE_URL || '/'
  const path = base.endsWith('/') ? base : `${base}/`
  return `${window.location.origin}${path}`
}

export async function copyAppUrl() {
  const url = getAppOriginUrl()
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url)
    return url
  }
  const input = document.createElement('input')
  input.value = url
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
  return url
}

/** Best-effort: open the app in the device browser instead of an in-app WebView. */
export function openInExternalBrowser(url = getAppOriginUrl()) {
  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua)) {
    const stripped = url.replace(/^https?:\/\//, '')
    window.location.href = `intent://${stripped}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.android.chrome;end`
    setTimeout(() => {
      window.open(url, '_blank', 'noopener,noreferrer')
    }, 600)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function sendEmailSignInLink(auth, email) {
  const trimmed = email.trim()
  if (!trimmed) throw new Error('Enter your email address.')
  const actionCodeSettings = {
    url: getAppOriginUrl(),
    handleCodeInApp: true,
  }
  await sendSignInLinkToEmail(auth, trimmed, actionCodeSettings)
  storageSet(EMAIL_FOR_SIGN_IN_KEY, trimmed)
}

export async function finishEmailLinkSignIn(auth, email) {
  if (typeof window === 'undefined' || !auth) return { ok: true }
  const href = window.location.href
  if (!href.includes('oobCode=') || !href.includes('mode=signIn')) return { ok: true }
  let isLink = false
  try {
    isLink = isSignInWithEmailLink(auth, href)
  } catch {
    return { ok: true }
  }
  if (!isLink) return { ok: true }

  const resolved = (email || storageGet(EMAIL_FOR_SIGN_IN_KEY) || '').trim()
  if (!resolved) {
    return {
      ok: false,
      needsEmail: true,
      message: 'Enter the same email address where we sent the sign-in link.',
    }
  }

  try {
    await signInWithEmailLink(auth, resolved, href)
    storageRemove(EMAIL_FOR_SIGN_IN_KEY)
    window.history.replaceState({}, document.title, getAppOriginUrl())
    return { ok: true }
  } catch (error) {
    return { ok: false, message: friendlyAuthError(error) }
  }
}

function storageGet(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    try {
      return sessionStorage.getItem(key)
    } catch {
      return null
    }
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    try {
      sessionStorage.setItem(key, value)
    } catch {
      /* private mode */
    }
  }
}

function storageRemove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function markAuthPending(provider) {
  storageSet(AUTH_PENDING_KEY, provider)
  storageSet(REDIRECT_STARTED_KEY, String(Date.now()))
}

export function peekAuthPending() {
  return storageGet(AUTH_PENDING_KEY)
}

export function clearAuthPending() {
  storageRemove(AUTH_PENDING_KEY)
  storageRemove(REDIRECT_STARTED_KEY)
}

/** Drop leftover pending flags from an abandoned redirect (common after failed sign-in). */
export function clearStaleAuthPending(maxAgeMs = 5 * 60 * 1000) {
  const pending = peekAuthPending()
  if (!pending) return
  const href = typeof window !== 'undefined' ? window.location.href : ''
  const returningFromProvider =
    href.includes('apiKey=') || href.includes('oobCode=') || href.includes('authType=')
  if (returningFromProvider) return
  const started = Number(storageGet(REDIRECT_STARTED_KEY) || 0)
  if (!started || Date.now() - started > maxAgeMs) {
    clearAuthPending()
  }
}

export function consumeAuthPending() {
  const value = storageGet(AUTH_PENDING_KEY)
  clearAuthPending()
  return value
}

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '')
}

function shouldUseRedirect() {
  return isMobileDevice() || Boolean(detectInAppBrowser())
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function friendlyAuthError(err, pending) {
  const code = err?.code || ''
  const message = err?.message || ''

  if (code === 'auth/unauthorized-domain') {
    return 'This site is not authorized for sign-in yet. Ask the app owner to add this domain in Firebase Authentication settings.'
  }
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is not enabled in Firebase yet.'
  }
  if (code === 'auth/invalid-email') {
    return 'That email address looks invalid.'
  }
  if (code === 'auth/missing-email') {
    return 'Enter your email address.'
  }
  if (code === 'auth/argument-error') {
    return message || 'Sign-in could not start. Refresh and try again in Chrome or Safari.'
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with this email using a different sign-in method. Try the other button (Google or Apple).'
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in was cancelled.'
  }
  if (code === 'auth/popup-blocked' || message.includes('popup-blocked')) {
    return 'Sign-in was blocked by your browser. Try again or use a different browser.'
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error during sign-in. Check your connection and try again.'
  }
  if (code === 'auth/invalid-credential' || code === 'auth/invalid-oauth-provider') {
    return 'Sign-in could not be verified. Try again, or use the other provider.'
  }

  const inApp = detectInAppBrowser()
  if (pending === 'apple' && inApp) {
    return `Apple Sign-In does not work inside ${inApp}. Open this page in Safari or Chrome (⋯ → Open in Browser), then try again.`
  }
  if (detectBraveBrowser()) {
    return 'Brave may block sign-in redirects. Try Safari or Chrome, or allow cross-site cookies for this site in Brave settings.'
  }
  if (pending === 'apple') {
    return 'Apple sign-in did not complete. Try Safari or use Continue with Google instead.'
  }
  if (pending === 'google') {
    return 'Google sign-in did not complete. Refresh the page and try again, or use Safari/Chrome if you are in a private or in-app browser.'
  }
  return message || 'Sign-in did not complete. Refresh and try again.'
}

/**
 * Popup when reliable; redirect on mobile and in-app browsers.
 * @returns {Promise<import('firebase/auth').UserCredential | 'redirect'>}
 */
export async function signInWithOAuth(auth, provider, pending = 'oauth') {
  if (!auth) {
    throw new Error('Firebase Auth is not ready. Check your .env Firebase config and refresh.')
  }

  await auth.authStateReady()

  if (!shouldUseRedirect()) {
    try {
      const result = await signInWithPopup(auth, provider)
      clearAuthPending()
      return result
    } catch (err) {
      console.error('Sign-in popup failed:', err)
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request') {
        markAuthPending(pending)
        await signInWithRedirect(auth, provider)
        return 'redirect'
      }
      throw err
    }
  }

  markAuthPending(pending)
  await signInWithRedirect(auth, provider)
  return 'redirect'
}

async function finishRedirectSignIn(auth) {
  if (!auth) return { ok: true }

  clearStaleAuthPending()
  const emailOutcome = await finishEmailLinkSignIn(auth)
  if (emailOutcome.ok && auth.currentUser) {
    clearAuthPending()
    return { ok: true }
  }
  if (!emailOutcome.ok && emailOutcome.needsEmail) {
    return emailOutcome
  }
  if (!emailOutcome.ok && emailOutcome.message) {
    return emailOutcome
  }

  const pending = peekAuthPending()

  await auth.authStateReady()

  let result = null
  let err = null
  try {
    result = await getRedirectResult(auth)
  } catch (error) {
    err = error
    console.error('getRedirectResult failed:', error)
  }

  if (result?.user || auth.currentUser) {
    clearAuthPending()
    return { ok: true }
  }

  if (err) {
    const pendingProvider = consumeAuthPending()
    // Benign argument-error on load when there was no redirect in progress.
    if (err?.code === 'auth/argument-error' && !pendingProvider && !pending) {
      return { ok: true }
    }
    return {
      ok: false,
      message: friendlyAuthError(err, pendingProvider || pending),
      pending: pendingProvider || pending,
    }
  }

  if (pending) {
    // Mobile browsers sometimes apply auth state slightly after getRedirectResult.
    for (const delay of [400, 800, 1200]) {
      await wait(delay)
      await auth.authStateReady()
      if (auth.currentUser) {
        clearAuthPending()
        return { ok: true }
      }
    }
  }

  const pendingProvider = consumeAuthPending()
  if (pendingProvider && !auth.currentUser) {
    return {
      ok: false,
      message: friendlyAuthError(null, pendingProvider),
      pending: pendingProvider,
    }
  }

  return { ok: true }
}

/** Call once on app load; safe if React mounts twice (dev Strict Mode). */
export function completeRedirectSignIn(auth) {
  if (!redirectResultPromise) {
    redirectResultPromise = finishRedirectSignIn(auth)
  }
  return redirectResultPromise
}
