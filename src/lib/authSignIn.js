import { getRedirectResult, signInWithPopup, signInWithRedirect } from 'firebase/auth'

/** Mobile, Safari, and installed PWAs handle full-page redirect better than popups. */
export function prefersAuthRedirect() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPR\//i.test(ua)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  return isIOS || isSafari || isStandalone || window.innerWidth < 768
}

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
])

/**
 * Sign in with popup when possible; fall back to full-page redirect if blocked.
 * @returns {Promise<'popup'|'redirect'>}
 */
export async function signInWithOAuth(auth, provider, { preferRedirect = prefersAuthRedirect() } = {}) {
  if (preferRedirect) {
    await signInWithRedirect(auth, provider)
    return 'redirect'
  }

  try {
    await signInWithPopup(auth, provider)
    return 'popup'
  } catch (err) {
    if (POPUP_FALLBACK_CODES.has(err?.code)) {
      await signInWithRedirect(auth, provider)
      return 'redirect'
    }
    throw err
  }
}

/** Call once on app load to finish a redirect sign-in flow. */
export async function completeRedirectSignIn(auth) {
  return getRedirectResult(auth)
}
