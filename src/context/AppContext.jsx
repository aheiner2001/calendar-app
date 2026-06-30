import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { auth, db, firebaseEnabled } from '../lib/firebase.js'
import { DEFAULT_SETTINGS } from '../lib/settings.js'
import { seedEvents } from '../lib/seed.js'
import { dateKey } from '../lib/time.js'

const AppContext = createContext(null)

const STORAGE_KEY = 'calendar-events'
const SETTINGS_KEY = 'calendar-settings'
const THEME_KEY = 'calendar-theme'

// Legacy events stored a named category; map it to a hex color.
const CATEGORY_TO_COLOR = { pink: '#c2447a', purple: '#8b6fc9', yellow: '#d9a73d' }
function migrate(event) {
  if (event.color) return event
  return { ...event, color: CATEGORY_TO_COLOR[event.category] || '#8b6fc9' }
}

function loadLocalEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw).map(migrate)
  } catch {
    /* ignore corrupt storage */
  }
  const seeded = seedEvents(dateKey(new Date()))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  return seeded
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS
}

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark')
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [settings, setSettings] = useState(loadSettings)
  const [events, setEvents] = useState([])
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(firebaseEnabled)
  const [syncState, setSyncState] = useState(firebaseEnabled ? 'syncing' : 'local')
  const [lastSynced, setLastSynced] = useState(null)
  const toastRef = useRef(null)
  const [toast, setToast] = useState('')

  // --- Theme ---
  useEffect(() => {
    document.body.classList.remove('dark', 'light')
    document.body.classList.add(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  // --- Settings persistence ---
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const addColor = useCallback(() => {
    const id = `c-${Date.now()}`
    setSettings((s) => ({
      ...s,
      savedColors: [...s.savedColors, { id, label: 'New color', color: '#2ec4b6' }],
    }))
    return id
  }, [])

  const updateColor = useCallback((id, patch) => {
    setSettings((s) => ({
      ...s,
      savedColors: s.savedColors.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
  }, [])

  const deleteColor = useCallback((id) => {
    setSettings((s) => ({ ...s, savedColors: s.savedColors.filter((c) => c.id !== id) }))
  }, [])

  // --- Auth ---
  useEffect(() => {
    if (!firebaseEnabled) {
      setAuthLoading(false)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
      if (!u) {
        setEvents([])
        setSyncState('offline')
      }
    })
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, new GoogleAuthProvider())
  }, [])

  const signInWithApple = useCallback(async () => {
    const provider = new OAuthProvider('apple.com')
    provider.addScope('email')
    provider.addScope('name')
    await signInWithPopup(auth, provider)
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [])

  // --- Events persistence ---
  useEffect(() => {
    if (!firebaseEnabled) {
      setEvents(loadLocalEvents())
      return
    }
    if (!user) return

    setSyncState('syncing')
    const q = query(collection(db, 'events'), where('userId', '==', user.uid))
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setEvents(snapshot.docs.map((d) => migrate({ id: d.id, ...d.data() })))
        setSyncState('synced')
        setLastSynced(new Date())
      },
      () => setSyncState('error'),
    )
    return unsub
  }, [user])

  useEffect(() => {
    if (!firebaseEnabled) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
    }
  }, [events])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 1800)
  }, [])

  const addEvent = useCallback(async (event) => {
    const id = event.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const record = { ...event, id }
    if (firebaseEnabled) {
      if (!user) throw new Error('Not signed in')
      await setDoc(doc(db, 'events', id), { ...record, userId: user.uid })
    } else {
      setEvents((prev) => [...prev, record])
    }
    return record
  }, [user])

  const updateEvent = useCallback(async (event) => {
    if (firebaseEnabled) {
      if (!user) throw new Error('Not signed in')
      await setDoc(doc(db, 'events', event.id), { ...event, userId: user.uid })
    } else {
      setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)))
    }
  }, [user])

  const deleteEvent = useCallback(async (id) => {
    if (firebaseEnabled) {
      await deleteDoc(doc(db, 'events', id))
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== id))
    }
  }, [])

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      selectedDate,
      setSelectedDate,
      settings,
      addColor,
      updateColor,
      deleteColor,
      events,
      addEvent,
      updateEvent,
      deleteEvent,
      user,
      authLoading,
      signInWithGoogle,
      signInWithApple,
      signOut,
      syncState,
      lastSynced,
      firebaseEnabled,
      toast,
      showToast,
    }),
    [theme, toggleTheme, selectedDate, settings, addColor, updateColor, deleteColor, events, addEvent, updateEvent, deleteEvent, user, authLoading, signInWithGoogle, signInWithApple, signOut, syncState, lastSynced, toast, showToast],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
