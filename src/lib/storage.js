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
  loadLocalCalendars,
  saveLocalCalendars,
  loadCloudCalendars,
  saveCloudCalendars,
  loadCloudEvents,
  saveCloudEvents,
  loadLocalInvites,
  saveLocalInvites,
  defaultPersonalCalendar,
  generateInviteCode,
}
