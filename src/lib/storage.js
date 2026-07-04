import {
  ALL_CALENDARS_ID,
  calendarLabel,
  defaultPersonalCalendar,
  filterEventsByCalendar,
  generateInviteCode,
  inviteUrl,
  personalCalendarId,
} from '../lib/calendars.js'
import { migrate } from '../lib/events.js'

const STORAGE_KEY = 'calendar-events'
const SETTINGS_KEY = 'calendar-settings'
const THEME_KEY = 'calendar-theme'
const VIEW_KEY = 'calendar-view'
const CALENDARS_KEY = 'calendar-calendars'
const INVITES_KEY = 'calendar-invites'
const ACTIVE_CALENDAR_KEY = 'calendar-active-id'
const LOCAL_SESSION_KEY = 'area-book-local-session'
const KNOWN_CALENDAR_IDS_KEY = 'calendar-known-ids'

function isLocalSession() {
  try {
    return localStorage.getItem(LOCAL_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function enableLocalSession() {
  try {
    localStorage.setItem(LOCAL_SESSION_KEY, '1')
  } catch {
    /* private mode */
  }
}

function clearLocalSession() {
  try {
    localStorage.removeItem(LOCAL_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

function cloudCalendarsKey(uid) {
  return `${CALENDARS_KEY}-${uid}`
}

function cloudEventsKey(uid) {
  return `${STORAGE_KEY}-${uid}`
}

function loadLocalCalendars(uid) {
  try {
    const raw = localStorage.getItem(CALENDARS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  const personal = defaultPersonalCalendar(uid || 'local')
  return [personal]
}

function saveLocalCalendars(calendars) {
  localStorage.setItem(CALENDARS_KEY, JSON.stringify(calendars))
}

function loadCloudCalendars(uid) {
  if (!uid || uid === 'local') return null
  try {
    const raw = localStorage.getItem(cloudCalendarsKey(uid))
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return null
}

function saveCloudCalendars(uid, calendars) {
  if (!uid || uid === 'local') return
  localStorage.setItem(cloudCalendarsKey(uid), JSON.stringify(calendars))
}

function clearCloudData(uid) {
  if (!uid || uid === 'local') return
  localStorage.removeItem(cloudCalendarsKey(uid))
  localStorage.removeItem(cloudEventsKey(uid))
  localStorage.removeItem(knownCalendarIdsKey(uid))
}

function knownCalendarIdsKey(uid) {
  return `${KNOWN_CALENDAR_IDS_KEY}-${uid}`
}

function loadKnownCalendarIds(uid) {
  if (!uid || uid === 'local') return []
  try {
    const raw = localStorage.getItem(knownCalendarIdsKey(uid))
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return []
}

function addKnownCalendarId(uid, id) {
  if (!uid || uid === 'local' || !id) return
  const ids = new Set(loadKnownCalendarIds(uid))
  ids.add(id)
  localStorage.setItem(knownCalendarIdsKey(uid), JSON.stringify([...ids]))
}

function removeKnownCalendarId(uid, id) {
  if (!uid || uid === 'local' || !id) return
  const ids = loadKnownCalendarIds(uid).filter((i) => i !== id)
  localStorage.setItem(knownCalendarIdsKey(uid), JSON.stringify(ids))
}

function loadCloudEvents(uid) {
  if (!uid || uid === 'local') return null
  try {
    const raw = localStorage.getItem(cloudEventsKey(uid))
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return null
}

function saveCloudEvents(uid, events) {
  if (!uid || uid === 'local') return
  localStorage.setItem(cloudEventsKey(uid), JSON.stringify(events))
}

function clearLegacyLocalData(uid) {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(CALENDARS_KEY)
  localStorage.removeItem(INVITES_KEY)
  if (uid) clearCloudData(uid)
}

function loadLocalInvites() {
  try {
    const raw = localStorage.getItem(INVITES_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return []
}

function saveLocalInvites(invites) {
  localStorage.setItem(INVITES_KEY, JSON.stringify(invites))
}

export {
  ALL_CALENDARS_ID,
  calendarLabel,
  filterEventsByCalendar,
  personalCalendarId,
  inviteUrl,
  STORAGE_KEY,
  SETTINGS_KEY,
  THEME_KEY,
  VIEW_KEY,
  CALENDARS_KEY,
  INVITES_KEY,
  ACTIVE_CALENDAR_KEY,
  LOCAL_SESSION_KEY,
  isLocalSession,
  enableLocalSession,
  clearLocalSession,
  loadLocalCalendars,
  saveLocalCalendars,
  clearLegacyLocalData,
  loadLocalInvites,
  saveLocalInvites,
  defaultPersonalCalendar,
  generateInviteCode,
}
