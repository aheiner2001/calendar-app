import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { auth, db, firebaseEnabled } from '../lib/firebase.js'
import { DEFAULT_SETTINGS } from '../lib/settings.js'
import { seedEvents } from '../lib/seed.js'
import { dateKey } from '../lib/time.js'
import {
  ALL_CALENDARS_ID,
  defaultPersonalCalendar,
  filterEventsByCalendar,
  generateInviteCode,
  inviteUrl,
  personalCalendarId,
} from '../lib/calendars.js'
import { migrate } from '../lib/events.js'
import {
  ACTIVE_CALENDAR_KEY,
  loadLocalCalendars,
  loadLocalInvites,
  saveLocalCalendars,
  saveLocalInvites,
  SETTINGS_KEY,
  STORAGE_KEY,
  THEME_KEY,
  VIEW_KEY,
} from '../lib/storage.js'

const AppContext = createContext(null)

function loadLocalEvents(uid) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw).map((e) => migrate(e, uid))
  } catch {
    /* ignore corrupt storage */
  }
  const seeded = seedEvents(dateKey(new Date())).map((e) => ({
    ...e,
    calendarId: personalCalendarId(uid || 'local'),
  }))
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
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light')
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [calendarView, setCalendarView] = useState(() => localStorage.getItem(VIEW_KEY) || 'day')
  const [settings, setSettings] = useState(loadSettings)
  const [allEvents, setAllEvents] = useState([])
  const [calendars, setCalendars] = useState([])
  const [activeCalendarId, setActiveCalendarId] = useState(
    () => localStorage.getItem(ACTIVE_CALENDAR_KEY) || ALL_CALENDARS_ID,
  )
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(firebaseEnabled)
  const [syncState, setSyncState] = useState(firebaseEnabled ? 'syncing' : 'local')
  const [lastSynced, setLastSynced] = useState(null)
  const toastRef = useRef(null)
  const [toast, setToast] = useState('')

  const uid = user?.uid ?? 'local'
  const personalId = personalCalendarId(uid)

  const events = useMemo(
    () => filterEventsByCalendar(allEvents, activeCalendarId, personalId),
    [allEvents, activeCalendarId, personalId],
  )

  useEffect(() => {
    document.body.classList.remove('dark', 'light')
    document.body.classList.add(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const toggleCalendarView = useCallback(() => {
    setCalendarView((v) => (v === 'day' ? 'week' : 'day'))
  }, [])

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, calendarView)
  }, [calendarView])

  useEffect(() => {
    localStorage.setItem(ACTIVE_CALENDAR_KEY, activeCalendarId)
  }, [activeCalendarId])

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

  useEffect(() => {
    if (!firebaseEnabled) {
      setAuthLoading(false)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
      if (!u) {
        setAllEvents([])
        setCalendars([])
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

  const ensurePersonalCalendar = useCallback(async (u) => {
    const id = personalCalendarId(u.uid)
    const ref = doc(db, 'calendars', id)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        name: 'Personal',
        ownerId: u.uid,
        members: [u.uid],
        type: 'personal',
        createdAt: Date.now(),
      })
    }
  }, [])

  const acceptEmailInvites = useCallback(async (u) => {
    if (!u.email) return
    const q = query(collection(db, 'invites'), where('email', '==', u.email.toLowerCase()))
    const snap = await getDocs(q)
    for (const d of snap.docs) {
      const inv = d.data()
      if (inv.expiresAt && inv.expiresAt < Date.now()) continue
      const calRef = doc(db, 'calendars', inv.calendarId)
      const calSnap = await getDoc(calRef)
      if (!calSnap.exists()) continue
      const members = calSnap.data().members || []
      if (!members.includes(u.uid)) {
        await setDoc(calRef, { members: arrayUnion(u.uid) }, { merge: true })
      }
      await deleteDoc(d.ref)
    }
  }, [])

  useEffect(() => {
    if (!firebaseEnabled) {
      setCalendars(loadLocalCalendars('local'))
      setAllEvents(loadLocalEvents('local'))
      return
    }
    if (!user) return

    let unsubCals = () => {}

    const boot = async () => {
      setSyncState('syncing')
      await ensurePersonalCalendar(user)
      await acceptEmailInvites(user)

      unsubCals = onSnapshot(
        query(collection(db, 'calendars'), where('members', 'array-contains', user.uid)),
        (snapshot) => {
          setCalendars(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        },
        () => setSyncState('error'),
      )
    }

    boot()

    return () => {
      unsubCals()
    }
  }, [user, ensurePersonalCalendar, acceptEmailInvites])

  useEffect(() => {
    if (!firebaseEnabled || !user) return

    const ids = calendars.map((c) => c.id).slice(0, 30)
    if (ids.length === 0) return

    const mergeEvents = (byCalendar, legacy) => {
      const map = new Map()
      legacy.forEach((e) => map.set(e.id, e))
      byCalendar.forEach((e) => map.set(e.id, e))
      setAllEvents([...map.values()])
      setSyncState('synced')
      setLastSynced(new Date())
    }

    let byCalendar = []
    let legacy = []

    const unsubByCalendar = onSnapshot(
      query(collection(db, 'events'), where('calendarId', 'in', ids)),
      (snapshot) => {
        byCalendar = snapshot.docs.map((d) => migrate({ id: d.id, ...d.data() }, user.uid))
        mergeEvents(byCalendar, legacy)
      },
      () => setSyncState('error'),
    )

    const unsubLegacy = onSnapshot(
      query(collection(db, 'events'), where('userId', '==', user.uid)),
      (snapshot) => {
        legacy = snapshot.docs
          .filter((d) => !d.data().calendarId)
          .map((d) => migrate({ id: d.id, ...d.data() }, user.uid))
        mergeEvents(byCalendar, legacy)
      },
      () => {},
    )

    return () => {
      unsubByCalendar()
      unsubLegacy()
    }
  }, [user, calendars])

  useEffect(() => {
    if (!firebaseEnabled) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allEvents))
      saveLocalCalendars(calendars)
    }
  }, [allEvents, calendars])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(''), 2200)
  }, [])

  const writeCalendarId = useCallback(() => {
    if (activeCalendarId === ALL_CALENDARS_ID) return personalId
    return activeCalendarId
  }, [activeCalendarId, personalId])

  const addEvent = useCallback(
    async (event) => {
      const id = event.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const calendarId = event.calendarId || writeCalendarId()
      const record = { ...event, id, calendarId, userId: uid }
      if (firebaseEnabled) {
        if (!user) throw new Error('Not signed in')
        await setDoc(doc(db, 'events', id), record)
      } else {
        setAllEvents((prev) => [...prev, record])
      }
      return record
    },
    [user, uid, writeCalendarId],
  )

  const updateEvent = useCallback(
    async (event) => {
      const calendarId = event.calendarId || writeCalendarId()
      const record = { ...event, calendarId, userId: uid }
      if (firebaseEnabled) {
        if (!user) throw new Error('Not signed in')
        await setDoc(doc(db, 'events', event.id), record)
      } else {
        setAllEvents((prev) => prev.map((e) => (e.id === event.id ? record : e)))
      }
    },
    [user, uid, writeCalendarId],
  )

  const deleteEvent = useCallback(
    async (id) => {
      if (firebaseEnabled) {
        await deleteDoc(doc(db, 'events', id))
      } else {
        setAllEvents((prev) => prev.filter((e) => e.id !== id))
      }
    },
    [user],
  )

  const createSharedCalendar = useCallback(
    async (name) => {
      const trimmed = name.trim() || 'Shared calendar'
      if (!firebaseEnabled || !user) {
        const id = `shared-${Date.now()}`
        const cal = {
          id,
          name: trimmed,
          ownerId: uid,
          members: [uid],
          type: 'shared',
          createdAt: Date.now(),
        }
        setCalendars((prev) => [...prev, cal])
        return cal
      }
      const id = `shared-${Date.now()}`
      const cal = {
        name: trimmed,
        ownerId: user.uid,
        members: [user.uid],
        type: 'shared',
        createdAt: Date.now(),
      }
      await setDoc(doc(db, 'calendars', id), cal)
      return { id, ...cal }
    },
    [user, uid],
  )

  const createInvite = useCallback(
    async (calendarId, email = '') => {
      const cal = calendars.find((c) => c.id === calendarId)
      if (!cal) throw new Error('Calendar not found')
      const code = generateInviteCode()
      const invite = {
        code,
        calendarId,
        calendarName: cal.name,
        createdBy: uid,
        email: email.trim().toLowerCase() || null,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      }
      if (!firebaseEnabled || !user) {
        const invites = loadLocalInvites()
        invites.push({ id: `inv-${Date.now()}`, ...invite })
        saveLocalInvites(invites)
        return { ...invite, url: inviteUrl(code) }
      }
      const id = `inv-${Date.now()}`
      await setDoc(doc(db, 'invites', id), invite)
      return { ...invite, url: inviteUrl(code) }
    },
    [calendars, user, uid],
  )

  const joinByInviteCode = useCallback(
    async (rawCode) => {
      const code = rawCode.trim().toUpperCase()
      if (!code) throw new Error('Enter an invite code')

      if (!firebaseEnabled || !user) {
        const invites = loadLocalInvites()
        const inv = invites.find((i) => i.code === code)
        if (!inv) throw new Error('Invalid or expired invite')
        if (inv.expiresAt < Date.now()) throw new Error('Invite expired')
        setCalendars((prev) => {
          if (prev.some((c) => c.id === inv.calendarId)) return prev
          const existing = loadLocalCalendars(uid).find((c) => c.id === inv.calendarId)
          const cal = existing || {
            id: inv.calendarId,
            name: inv.calendarName,
            ownerId: inv.createdBy,
            members: [inv.createdBy, uid],
            type: 'shared',
            createdAt: Date.now(),
          }
          if (!cal.members.includes(uid)) cal.members.push(uid)
          return [...prev.filter((c) => c.id !== cal.id), cal]
        })
        return inv.calendarName
      }

      const snap = await getDocs(query(collection(db, 'invites'), where('code', '==', code)))
      if (snap.empty) throw new Error('Invalid or expired invite')
      const invDoc = snap.docs[0]
      const inv = invDoc.data()
      if (inv.expiresAt < Date.now()) throw new Error('Invite expired')
      if (inv.email && user.email?.toLowerCase() !== inv.email) {
        throw new Error('This invite was sent to a different email')
      }
      const calRef = doc(db, 'calendars', inv.calendarId)
      const calSnap = await getDoc(calRef)
      if (!calSnap.exists()) throw new Error('Calendar no longer exists')
      const members = calSnap.data().members || []
      if (!members.includes(user.uid)) {
        await setDoc(calRef, { members: arrayUnion(user.uid) }, { merge: true })
      }
      if (!inv.email) await deleteDoc(invDoc.ref)
      return inv.calendarName
    },
    [user, uid],
  )

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      selectedDate,
      setSelectedDate,
      calendarView,
      setCalendarView,
      toggleCalendarView,
      settings,
      addColor,
      updateColor,
      deleteColor,
      events,
      allEvents,
      calendars,
      activeCalendarId,
      setActiveCalendarId,
      personalCalendarId: personalId,
      addEvent,
      updateEvent,
      deleteEvent,
      createSharedCalendar,
      createInvite,
      joinByInviteCode,
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
    [
      theme,
      toggleTheme,
      selectedDate,
      calendarView,
      toggleCalendarView,
      settings,
      addColor,
      updateColor,
      deleteColor,
      events,
      allEvents,
      calendars,
      activeCalendarId,
      personalId,
      addEvent,
      updateEvent,
      deleteEvent,
      createSharedCalendar,
      createInvite,
      joinByInviteCode,
      user,
      authLoading,
      signInWithGoogle,
      signInWithApple,
      signOut,
      syncState,
      lastSynced,
      toast,
      showToast,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
