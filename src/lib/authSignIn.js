import { getRedirectResult, signInWithRedirect } from 'firebase/auth'

/**
 * Full-page redirect sign-in — reliable on desktop, mobile, and Safari.
 * Popups are often blocked and cause auth/popup-blocked errors.
 * @returns {Promise<'redirect'>}
 */
export async function signInWithOAuth(auth, provider) {
  await signInWithRedirect(auth, provider)
  return 'redirect'
}

/** Call once on app load to finish a redirect sign-in flow. */
export async function completeRedirectSignIn(auth) {
  return getRedirectResult(auth)
}
