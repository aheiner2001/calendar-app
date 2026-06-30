import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Boolean(config.apiKey && config.projectId)

const geminiModelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY

let app = null
let db = null
let auth = null
let geminiModel = null

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

  try {
    const ai = getAI(app, { backend: new GoogleAIBackend() })
    geminiModel = getGenerativeModel(ai, { model: geminiModelName })
  } catch (err) {
    console.warn('Firebase AI Logic is not available:', err)
  }
}

export const appCheckEnabled = Boolean(recaptchaSiteKey)
export const aiEnabled = Boolean(geminiModel)
export { db, auth, app, geminiModel }
