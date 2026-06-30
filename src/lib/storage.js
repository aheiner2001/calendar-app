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
  loadLocalInvites,
  saveLocalInvites,
  defaultPersonalCalendar,
  generateInviteCode,
}
