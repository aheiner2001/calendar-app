import { normalizeRepeat } from './repeat.js'
import { personalCalendarId } from './calendars.js'

const CATEGORY_TO_COLOR = { pink: '#c2447a', purple: '#8b6fc9', yellow: '#d9a73d' }

export function migrate(event, uid) {
  let e = event
  if (!event.color) e = { ...e, color: CATEGORY_TO_COLOR[event.category] || '#8b6fc9' }
  const repeat = normalizeRepeat(e.repeat)
  if (repeat !== e.repeat) e = { ...e, repeat }
  if (!e.calendarId && uid) e = { ...e, calendarId: personalCalendarId(uid) }
  return e
}
