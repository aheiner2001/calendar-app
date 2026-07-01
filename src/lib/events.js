import { normalizeRepeat } from './repeat.js'
import { personalCalendarId } from './calendars.js'

const CATEGORY_TO_COLOR = { pink: '#c2447a', purple: '#8b6fc9', yellow: '#d9a73d' }

export function migrate(event, uid) {
  let e = event
  if (!event.color) e = { ...e, color: CATEGORY_TO_COLOR[event.category] || '#8b6fc9' }
  const repeat = normalizeRepeat(e.repeat)
  if (JSON.stringify(repeat) !== JSON.stringify(e.repeat)) e = { ...e, repeat }
  if (!e.calendarId && uid) e = { ...e, calendarId: personalCalendarId(uid) }
  return e
}

/** Strip undefined fields — Firestore rejects undefined values. */
export function toFirestoreEvent(event, id, calendarId, userId) {
  const record = {
    id,
    title: event.title,
    day: event.day,
    start: event.start,
    end: event.end,
    color: event.color,
    calendarId,
    userId,
  }
  const notes = event.notes?.trim()
  if (notes) record.notes = notes
  const repeat = normalizeRepeat(event.repeat)
  if (repeat) record.repeat = repeat
  return record
}
