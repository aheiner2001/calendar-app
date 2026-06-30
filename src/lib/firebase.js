import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Boolean(config.apiKey && config.projectId)

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY

let app = null
let db = null
let auth = null

if (firebaseEnabled) {
  app = initializeApp(config)

  if (import.meta.env.DEV && import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN
  }

  if (recaptchaSiteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  }

  db = getFirestore(app)
  auth = getAuth(app)

  if (!recaptchaSiteKey && import.meta.env.DEV) {
    console.info(
      '[Area Book] No VITE_RECAPTCHA_SITE_KEY — if Firestore returns "missing permissions", ' +
        'set App Check to Monitor (not Enforce) in Firebase Console → App Check.',
    )
  }
}

export const appCheckEnabled = Boolean(recaptchaSiteKey)
export { db, auth, app }
