import { getRedirectResult, signInWithRedirect } from 'firebase/auth'

const AUTH_PENDING_KEY = 'area-book-auth-pending'

/** Facebook Messenger, Instagram, etc. — Apple Sign-In usually fails here. */
export function detectInAppBrowser() {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent || ''
  if (/FBAN|FBAV|FB_IAB|Messenger|Instagram/i.test(ua)) return 'Facebook or Messenger'
  if (/Twitter/i.test(ua)) return 'Twitter'
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn'
  if (/Snapchat/i.test(ua)) return 'Snapchat'
  return null
}

export function markAuthPending(provider) {
  try {
    sessionStorage.setItem(AUTH_PENDING_KEY, provider)
  } catch {
    /* private mode */
  }
}

export function consumeAuthPending() {
  try {
    const value = sessionStorage.getItem(AUTH_PENDING_KEY)
    sessionStorage.removeItem(AUTH_PENDING_KEY)
    return value
  } catch {
    return null
  }
}

/**
 * Full-page redirect sign-in — reliable on desktop, mobile, and Safari.
 * @returns {Promise<'redirect'>}
 */
export async function signInWithOAuth(auth, provider, pending = 'oauth') {
  markAuthPending(pending)
  await signInWithRedirect(auth, provider)
  return 'redirect'
}

/** Finish redirect sign-in; returns error message if redirect did not complete. */
export async function completeRedirectSignIn(auth) {
  const pending = consumeAuthPending()
  let result = null
  let err = null

  try {
    result = await getRedirectResult(auth)
  } catch (error) {
    err = error
  }

  if (result?.user) return { ok: true }

  if (err) {
    return { ok: false, message: err.message || 'Sign-in failed after redirect', pending }
  }

  if (pending && !auth.currentUser) {
    const inApp = detectInAppBrowser()
    if (pending === 'apple' && inApp) {
      return {
        ok: false,
        pending,
        message: `Apple Sign-In does not work inside ${inApp}. Open this page in Safari or Chrome (tap ⋯ → Open in Browser), then try again.`,
      }
    }
    if (pending === 'apple') {
      return {
        ok: false,
        pending,
        message:
          'Apple sign-in did not complete. Try again in Safari, or use Continue with Google instead.',
      }
    }
    return {
      ok: false,
      pending,
      message: 'Sign-in did not complete. Please try again.',
    }
  }

  return { ok: true }
}
