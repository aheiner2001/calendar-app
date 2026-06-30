import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db, firebaseEnabled } from '../lib/firebase.js'
import { DEFAULT_SETTINGS, normalizeSettings } from '../lib/settings.js'
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
import { migrate, toFirestoreEvent } from '../lib/events.js'
import { eventsForDay } from '../lib/repeat.js'
import {
  ACTIVE_CALENDAR_KEY,
  clearLegacyLocalData,
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
    if (raw) return normalizeSettings(JSON.parse(raw))
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
  const [cloudReady, setCloudReady] = useState(!firebaseEnabled)
  const [syncError, setSyncError] = useState('')
  const [lastSynced, setLastSynced] = useState(null)
  const toastRef = useRef(null)
  const pendingDeletesRef = useRef(new Set())
  const pendingAddsRef = useRef(new Map())
  const pendingCalendarsRef = useRef(new Map())
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
      if (u) {
        clearLegacyLocalData(u.uid)
        setCloudReady(false)
        setSyncError('')
      } else {
        setAllEvents([])
        setCalendars([])
        setCloudReady(!firebaseEnabled)
        setSyncState('offline')
        setSyncError('')
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
    const uid = auth.currentUser?.uid
    if (uid) clearLegacyLocalData(uid)
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
      return
    }
    const data = snap.data()
    const members = Array.isArray(data.members) ? [...data.members] : []
    if (!members.includes(u.uid)) {
      members.push(u.uid)
      await updateDoc(ref, { members, ownerId: u.uid, type: data.type || 'personal' })
    }
  }, [])

  const syncFromCloud = useCallback(async () => {
    if (!firebaseEnabled || !user) {
      throw new Error('Sign in with Google to sync from the cloud')
    }

    setSyncState('syncing')
    const errors = []

    await user.getIdToken()

    try {
      await ensurePersonalCalendar(user)
    } catch (err) {
      errors.push(`Personal: ${err.message || err.code}`)
    }

    try {
      await acceptEmailInvites(user)
    } catch (err) {
      console.error('Invite accept error:', err)
    }

    let importedCalendars = 0
    let importedEvents = 0

    try {
      const memberQuery = query(
        collection(db, 'calendars'),
        where('members', 'array-contains', user.uid),
      )
      const ownerQuery = query(collection(db, 'calendars'), where('ownerId', '==', user.uid))
      const [memberSnap, ownerSnap] = await Promise.all([
        getDocsFromServer(memberQuery),
        getDocsFromServer(ownerQuery),
      ])

      const serverCals = new Map()
      memberSnap.docs.forEach((d) => serverCals.set(d.id, { id: d.id, ...d.data() }))
      ownerSnap.docs.forEach((d) => serverCals.set(d.id, { id: d.id, ...d.data() }))

      setCalendars((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]))
        const before = map.size
        serverCals.forEach((cal, id) => map.set(id, cal))
        const pid = personalCalendarId(user.uid)
        if (!map.has(pid)) map.set(pid, defaultPersonalCalendar(user.uid))
        importedCalendars = Math.max(0, map.size - before)
        return [...map.values()]
      })
    } catch (err) {
      errors.push(`Calendars: ${err.message || err.code}`)
    }

    try {
      const ownEventsQuery = query(collection(db, 'events'), where('userId', '==', user.uid))
      const eventSnap = await getDocsFromServer(ownEventsQuery)
      const serverEvents = eventSnap.docs.map((d) =>
        migrate({ id: d.id, ...d.data() }, user.uid),
      )

      setAllEvents((prev) => {
        const map = new Map(prev.map((e) => [e.id, e]))
        const before = map.size
        serverEvents.forEach((e) => map.set(e.id, e))
        importedEvents = Math.max(0, map.size - before)
        return [...map.values()]
      })
    } catch (err) {
      errors.push(`Events: ${err.message || err.code}`)
    }

    if (errors.length) {
      const msg = errors.join(' · ')
      setSyncState('error')
      setSyncError(msg)
      throw new Error(msg)
    }

    setSyncState('synced')
    setSyncError('')
    setLastSynced(new Date())
    return { importedCalendars, importedEvents }
  }, [user, ensurePersonalCalendar, acceptEmailInvites])

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
      const calData = calSnap.data()
      const members = Array.isArray(calData.members) ? [...calData.members] : []
      if (!members.includes(u.uid)) {
        members.push(u.uid)
        await updateDoc(calRef, { members })
      }
      await deleteDoc(d.ref)
    }
  }, [])

  useEffect(() => {
    if (!firebaseEnabled) {
      setCalendars(loadLocalCalendars('local'))
      setAllEvents(loadLocalEvents('local'))
      setCloudReady(true)
      return
    }
    if (!user) return

    let cancelled = false
    let unsubMember = () => {}
    let unsubOwner = () => {}
    let unsubEvents = () => {}
    const unsubsShared = []

    const memberQuery = query(
      collection(db, 'calendars'),
      where('members', 'array-contains', user.uid),
    )
    const ownerQuery = query(collection(db, 'calendars'), where('ownerId', '==', user.uid))
    const ownEventsQuery = query(collection(db, 'events'), where('userId', '==', user.uid))

    let memberCals = []
    let ownerCals = []
    let ownEvents = []
    const sharedEvents = new Map()
    let calendarsFromServer = false
    let eventsFromServer = false

    const docToCal = (d) => ({ id: d.id, ...d.data() })
    const docToEvent = (d) => migrate({ id: d.id, ...d.data() }, user.uid)

    const tryReady = () => {
      if (cancelled) return
      if (calendarsFromServer && eventsFromServer) {
        setCloudReady(true)
        setSyncState('synced')
        setLastSynced(new Date())
      }
    }

    const mergeCalendars = () => {
      if (cancelled || !calendarsFromServer) return

      const map = new Map()
      pendingCalendarsRef.current.forEach((cal, id) => map.set(id, cal))
      memberCals.forEach((cal) => map.set(cal.id, cal))
      ownerCals.forEach((cal) => map.set(cal.id, cal))

      memberCals.forEach((cal) => {
        if (pendingCalendarsRef.current.has(cal.id)) pendingCalendarsRef.current.delete(cal.id)
      })
      ownerCals.forEach((cal) => {
        if (pendingCalendarsRef.current.has(cal.id)) pendingCalendarsRef.current.delete(cal.id)
      })

      const pid = personalCalendarId(user.uid)
      if (!map.has(pid)) map.set(pid, defaultPersonalCalendar(user.uid))

      setCalendars([...map.values()])
      tryReady()
    }

    const mergeEvents = () => {
      if (cancelled || !eventsFromServer) return

      const serverIds = new Set()
      ownEvents.forEach((e) => serverIds.add(e.id))
      sharedEvents.forEach((list) => list.forEach((e) => serverIds.add(e.id)))

      for (const id of pendingDeletesRef.current) {
        if (!serverIds.has(id)) pendingDeletesRef.current.delete(id)
      }
      for (const id of pendingAddsRef.current.keys()) {
        if (serverIds.has(id)) pendingAddsRef.current.delete(id)
      }

      const map = new Map()
      ownEvents.forEach((e) => {
        if (!pendingDeletesRef.current.has(e.id)) map.set(e.id, e)
      })
      sharedEvents.forEach((list) => {
        list.forEach((e) => {
          if (!pendingDeletesRef.current.has(e.id)) map.set(e.id, e)
        })
      })
      pendingAddsRef.current.forEach((e, id) => {
        if (!map.has(id)) map.set(id, e)
      })
      setAllEvents([...map.values()])
      tryReady()
    }

    const subscribeSharedEvents = (sharedCals) => {
      unsubsShared.forEach((u) => u())
      unsubsShared.length = 0
      sharedEvents.clear()

      for (const cal of sharedCals) {
        const sharedQuery = query(collection(db, 'events'), where('calendarId', '==', cal.id))
        unsubsShared.push(
          onSnapshot(
            sharedQuery,
            (snapshot) => {
              if (snapshot.metadata.fromCache && snapshot.empty) return
              sharedEvents.set(
                cal.id,
                snapshot.docs.map(docToEvent).filter((e) => e.userId !== user.uid),
              )
              mergeEvents()
            },
            (err) => console.error(`Events listener error (${cal.id}):`, err),
          ),
        )
      }
    }

    const boot = async () => {
      setSyncState('syncing')
      setCloudReady(false)
      setCalendars([])
      setAllEvents([])

      try {
        await user.getIdToken()
        try {
          await ensurePersonalCalendar(user)
        } catch (err) {
          console.error('Personal calendar setup error:', err)
        }
        try {
          await acceptEmailInvites(user)
        } catch (err) {
          console.error('Invite accept error:', err)
        }
        if (cancelled) return

        try {
          const [memberSnap, ownerSnap] = await Promise.all([
            getDocsFromServer(memberQuery),
            getDocsFromServer(ownerQuery),
          ])
          memberCals = memberSnap.docs.map(docToCal)
          ownerCals = ownerSnap.docs.map(docToCal)
          calendarsFromServer = true
          mergeCalendars()
        } catch (err) {
          console.error('Calendar load error:', err)
          calendarsFromServer = true
          mergeCalendars()
          setSyncState('error')
          setSyncError((prev) => prev || `Calendars: ${err.message || err.code}`)
        }

        try {
          const eventSnap = await getDocsFromServer(ownEventsQuery)
          ownEvents = eventSnap.docs.map(docToEvent)
          eventsFromServer = true
          mergeEvents()
        } catch (err) {
          console.error('Events load error:', err)
          eventsFromServer = true
          mergeEvents()
          setSyncState('error')
          setSyncError((prev) => prev || `Events: ${err.message || err.code}`)
        }

        if (cancelled) return

        const sharedCals = [...memberCals, ...ownerCals].filter(
          (c, i, arr) => c.type === 'shared' && arr.findIndex((x) => x.id === c.id) === i,
        )
        subscribeSharedEvents(sharedCals)

        unsubMember = onSnapshot(
          memberQuery,
          (snapshot) => {
            if (snapshot.metadata.fromCache && snapshot.empty) return
            memberCals = snapshot.docs.map(docToCal)
            mergeCalendars()
            const shared = [...memberCals, ...ownerCals].filter(
              (c, i, arr) => c.type === 'shared' && arr.findIndex((x) => x.id === c.id) === i,
            )
            subscribeSharedEvents(shared)
          },
          (err) => {
            console.error('Calendars listener error (members):', err)
            if (!cancelled) {
              setSyncState('error')
              setSyncError(err.message || 'Could not sync calendars')
            }
          },
        )

        unsubOwner = onSnapshot(
          ownerQuery,
          (snapshot) => {
            if (snapshot.metadata.fromCache && snapshot.empty) return
            ownerCals = snapshot.docs.map(docToCal)
            mergeCalendars()
          },
          (err) => {
            console.error('Calendars listener error (owner):', err)
            if (!cancelled) {
              setSyncState('error')
              setSyncError(err.message || 'Could not sync calendars')
            }
          },
        )

        unsubEvents = onSnapshot(
          ownEventsQuery,
          (snapshot) => {
            if (snapshot.metadata.fromCache && snapshot.empty) return
            ownEvents = snapshot.docs.map(docToEvent)
            mergeEvents()
          },
          (err) => {
            console.error('Events listener error:', err)
            if (!cancelled) {
              setSyncState('error')
              setSyncError(err.message || 'Could not sync events')
            }
          },
        )
      } catch (err) {
        console.error('Cloud sync error:', err)
        if (!cancelled) {
          setSyncState('error')
          setSyncError(err.message || 'Could not load data from the cloud')
        }
      } finally {
        if (!cancelled) setCloudReady(true)
      }
    }

    boot()

    return () => {
      cancelled = true
      unsubMember()
      unsubOwner()
      unsubEvents()
      unsubsShared.forEach((u) => u())
    }
  }, [user, ensurePersonalCalendar, acceptEmailInvites])

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
      const record = toFirestoreEvent(event, id, calendarId, uid)
      if (firebaseEnabled) {
        if (!user) throw new Error('Not signed in')
        pendingAddsRef.current.set(id, record)
        setAllEvents((prev) => (prev.some((e) => e.id === id) ? prev : [...prev, record]))
        try {
          await setDoc(doc(db, 'events', id), record)
        } catch (err) {
          pendingAddsRef.current.delete(id)
          setAllEvents((prev) => prev.filter((e) => e.id !== id))
          throw err
        }
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
      const record = toFirestoreEvent(event, event.id, calendarId, uid)
      if (firebaseEnabled) {
        if (!user) throw new Error('Not signed in')
        setAllEvents((prev) => prev.map((e) => (e.id === event.id ? record : e)))
        try {
          await setDoc(doc(db, 'events', event.id), record)
        } catch (err) {
          throw err
        }
      } else {
        setAllEvents((prev) => prev.map((e) => (e.id === event.id ? record : e)))
      }
    },
    [user, uid, writeCalendarId],
  )

  const deleteEvent = useCallback(
    async (id) => {
      pendingDeletesRef.current.add(id)
      setAllEvents((prev) => prev.filter((e) => e.id !== id))
      if (firebaseEnabled) {
        try {
          await deleteDoc(doc(db, 'events', id))
        } catch (err) {
          pendingDeletesRef.current.delete(id)
          throw err
        }
      }
    },
    [user],
  )

  const clearDay = useCallback(
    async (dayKey) => {
      const [y, m, d] = dayKey.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      const visible = filterEventsByCalendar(allEvents, activeCalendarId, personalId)
      const toRemove = eventsForDay(visible, date)
      if (toRemove.length === 0) return 0

      const ids = [...new Set(toRemove.map((e) => e.id))]
      ids.forEach((id) => pendingDeletesRef.current.add(id))
      setAllEvents((prev) => prev.filter((e) => !ids.includes(e.id)))

      try {
        if (firebaseEnabled) {
          for (const id of ids) {
            await deleteDoc(doc(db, 'events', id))
          }
        }
      } catch (err) {
        ids.forEach((id) => pendingDeletesRef.current.delete(id))
        throw err
      }
      return ids.length
    },
    [allEvents, activeCalendarId, personalId, user],
  )

  const createSharedCalendar = useCallback(
    async (name) => {
      const trimmed = name.trim() || 'Shared calendar'
      const shareCode = generateInviteCode()
      if (!firebaseEnabled || !user) {
        const id = `shared-${Date.now()}`
        const cal = {
          id,
          name: trimmed,
          ownerId: uid,
          members: [uid],
          type: 'shared',
          shareCode,
          createdAt: Date.now(),
        }
        setCalendars((prev) => [...prev, cal])
        const invites = loadLocalInvites()
        invites.push({
          id: `inv-${id}`,
          code: shareCode,
          calendarId: id,
          calendarName: trimmed,
          createdBy: uid,
          email: null,
          permanent: true,
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
        })
        saveLocalInvites(invites)
        return cal
      }
      const id = `shared-${Date.now()}`
      const cal = {
        name: trimmed,
        ownerId: user.uid,
        members: [user.uid],
        type: 'shared',
        shareCode,
        createdAt: Date.now(),
      }
      await setDoc(doc(db, 'calendars', id), cal)
      try {
        const verified = await getDocFromServer(doc(db, 'calendars', id))
        if (!verified.exists()) {
          throw new Error('Calendar was not saved to the cloud. Please try again.')
        }
      } catch (err) {
        const msg = String(err?.message || err?.code || '')
        if (msg.includes('permission') || err?.code === 'permission-denied') {
          throw new Error('Could not save calendar. Check that you are signed in and try again.')
        }
        throw err
      }
      await setDoc(doc(db, 'invites', `share-${id}`), {
        code: shareCode,
        calendarId: id,
        calendarName: trimmed,
        createdBy: user.uid,
        email: null,
        permanent: true,
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      })
      const newCal = { id, ...cal }
      pendingCalendarsRef.current.set(id, newCal)
      setCalendars((prev) => (prev.some((c) => c.id === id) ? prev : [...prev, newCal]))
      return newCal
    },
    [user, uid],
  )

  const ensureCalendarShareCode = useCallback(
    async (calendarId) => {
      const cal = calendars.find((c) => c.id === calendarId)
      if (!cal || cal.type !== 'shared') return null

      if (cal.shareCode) {
        return { code: cal.shareCode, url: inviteUrl(cal.shareCode) }
      }

      const shareCode = generateInviteCode()
      if (!firebaseEnabled || !user) {
        setCalendars((prev) =>
          prev.map((c) => (c.id === calendarId ? { ...c, shareCode } : c)),
        )
        const invites = loadLocalInvites()
        invites.push({
          id: `inv-share-${calendarId}`,
          code: shareCode,
          calendarId,
          calendarName: cal.name,
          createdBy: uid,
          email: null,
          permanent: true,
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
        })
        saveLocalInvites(invites)
        return { code: shareCode, url: inviteUrl(shareCode) }
      }

      await setDoc(doc(db, 'calendars', calendarId), { shareCode }, { merge: true })
      await setDoc(doc(db, 'invites', `share-${calendarId}`), {
        code: shareCode,
        calendarId,
        calendarName: cal.name,
        createdBy: user.uid,
        email: null,
        permanent: true,
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      })
      return { code: shareCode, url: inviteUrl(shareCode) }
    },
    [calendars, user, uid],
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
        throw new Error('Sign in with Google to join a shared calendar')
      }

      let calRef = null
      let invDocRef = null
      let invMeta = null

      const calByCode = await getDocs(
        query(collection(db, 'calendars'), where('shareCode', '==', code)),
      )
      if (!calByCode.empty) {
        const calDoc = calByCode.docs[0]
        calRef = calDoc.ref
        invMeta = {
          calendarName: calDoc.data().name,
          createdBy: calDoc.data().ownerId,
        }
      } else {
        const inviteSnap = await getDocs(query(collection(db, 'invites'), where('code', '==', code)))
        if (inviteSnap.empty) throw new Error('Invalid invite code')
        invDocRef = inviteSnap.docs[0].ref
        const inv = inviteSnap.docs[0].data()
        if (inv.expiresAt < Date.now()) throw new Error('Invite expired')
        if (inv.email && user.email?.toLowerCase() !== inv.email) {
          throw new Error('This invite was sent to a different email')
        }
        calRef = doc(db, 'calendars', inv.calendarId)
        invMeta = { calendarName: inv.calendarName, createdBy: inv.createdBy, permanent: inv.permanent }
      }

      const calSnap = await getDoc(calRef)
      if (!calSnap.exists()) throw new Error('Calendar no longer exists')

      const calData = calSnap.data()
      if (calData.type !== 'shared') throw new Error('Not a shared calendar')

      const members = Array.isArray(calData.members) ? [...calData.members] : []
      if (!members.includes(user.uid)) {
        members.push(user.uid)
        try {
          await updateDoc(calRef, { members })
        } catch (err) {
          const msg = String(err?.message || err?.code || '')
          if (msg.includes('permission') || err?.code === 'permission-denied') {
            throw new Error(
              'Permission denied joining calendar. Deploy the latest Firestore rules: firebase deploy --only firestore:rules',
            )
          }
          throw err
        }
      }

      const joinedCal = {
        id: calRef.id,
        ...calData,
        name: calData.name || invMeta.calendarName,
        type: 'shared',
        members,
      }

      pendingCalendarsRef.current.set(joinedCal.id, joinedCal)
      setCalendars((prev) => {
        if (prev.some((c) => c.id === joinedCal.id)) {
          return prev.map((c) => (c.id === joinedCal.id ? joinedCal : c))
        }
        return [...prev, joinedCal]
      })

      if (invDocRef && !invMeta.email && !invMeta.permanent) {
        await deleteDoc(invDocRef)
      }

      return joinedCal.name
    },
    [user],
  )

  const deleteCalendar = useCallback(
    async (calendarId) => {
      const cal = calendars.find((c) => c.id === calendarId)
      if (!cal) throw new Error('Calendar not found')
      if (cal.type === 'personal') throw new Error('Cannot delete your personal calendar')

      const isOwner = cal.ownerId === uid
      const clearActive = () => {
        if (activeCalendarId === calendarId) setActiveCalendarId(ALL_CALENDARS_ID)
      }

      if (!firebaseEnabled || !user) {
        if (isOwner) {
          setCalendars((prev) => prev.filter((c) => c.id !== calendarId))
          setAllEvents((prev) => prev.filter((e) => e.calendarId !== calendarId))
          saveLocalInvites(loadLocalInvites().filter((i) => i.calendarId !== calendarId))
        } else {
          setCalendars((prev) => prev.filter((c) => c.id !== calendarId))
        }
        clearActive()
        return
      }

      if (!isOwner) {
        await setDoc(doc(db, 'calendars', calendarId), { members: arrayRemove(user.uid) }, { merge: true })
        pendingCalendarsRef.current.delete(calendarId)
        setCalendars((prev) => prev.filter((c) => c.id !== calendarId))
        clearActive()
        return
      }

      const [inviteSnap, eventSnap] = await Promise.all([
        getDocs(query(collection(db, 'invites'), where('calendarId', '==', calendarId))),
        getDocs(query(collection(db, 'events'), where('calendarId', '==', calendarId))),
      ])

      await Promise.all([
        ...inviteSnap.docs.map((d) => deleteDoc(d.ref)),
        ...eventSnap.docs.map((d) => deleteDoc(d.ref)),
        deleteDoc(doc(db, 'calendars', calendarId)),
      ])

      setCalendars((prev) => prev.filter((c) => c.id !== calendarId))
      pendingCalendarsRef.current.delete(calendarId)
      setAllEvents((prev) => prev.filter((e) => e.calendarId !== calendarId))
      clearActive()
    },
    [calendars, user, uid, activeCalendarId],
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
      writeCalendarId,
      addEvent,
      updateEvent,
      deleteEvent,
      clearDay,
      createSharedCalendar,
      deleteCalendar,
      createInvite,
      joinByInviteCode,
      ensureCalendarShareCode,
      user,
      authLoading,
      signInWithGoogle,
      signInWithApple,
      signOut,
      syncFromCloud,
      syncState,
      lastSynced,
      cloudReady,
      syncError,
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
      writeCalendarId,
      addEvent,
      updateEvent,
      deleteEvent,
      clearDay,
      createSharedCalendar,
      deleteCalendar,
      createInvite,
      joinByInviteCode,
      ensureCalendarShareCode,
      user,
      authLoading,
      signInWithGoogle,
      signInWithApple,
      signOut,
      syncFromCloud,
      syncState,
      lastSynced,
      cloudReady,
      syncError,
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
