export const ALL_CALENDARS_ID = 'all'

export const personalCalendarId = (uid) => `personal-${uid}`

export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export function inviteUrl(code) {
  const base = import.meta.env.BASE_URL || '/'
  const path = base.endsWith('/') ? `${base}sync` : `${base}/sync`
  return `${window.location.origin}${path}?join=${code}`
}

export function parseJoinCode(search) {
  const params = new URLSearchParams(search)
  return params.get('join')?.trim().toUpperCase() || ''
}

export function defaultPersonalCalendar(uid, name = 'Personal') {
  return {
    id: personalCalendarId(uid),
    name,
    ownerId: uid,
    members: [uid],
    type: 'personal',
    createdAt: Date.now(),
  }
}

export function calendarLabel(calendars, id) {
  if (id === ALL_CALENDARS_ID) return 'All calendars'
  return calendars.find((c) => c.id === id)?.name ?? 'Calendar'
}

export function filterEventsByCalendar(events, activeId, personalId) {
  if (activeId === ALL_CALENDARS_ID) return events
  return events.filter((e) => (e.calendarId || personalId) === activeId)
}
