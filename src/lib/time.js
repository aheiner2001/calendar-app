export const GRID_START_HOUR = 7   // 7 AM
export const GRID_END_HOUR = 22    // 10 PM
export const ROW_H = 56            // px per hour — must match --row-h in index.css
export const SNAP_MINUTES = 15
export const CREATE_SNAP_MINUTES = 30

/** Round minutes since midnight to the nearest snap interval (default 15 min). */
export function snapMinutes(minutes, step = SNAP_MINUTES) {
  return Math.round(minutes / step) * step
}

/** Snap down to the previous interval (e.g. 8:29 → 8:00 at 30 min). */
export function snapMinutesFloor(minutes, step = SNAP_MINUTES) {
  return Math.floor(minutes / step) * step
}

/** Snap up to the next interval (e.g. 8:01 → 8:30 at 30 min). */
export function snapMinutesCeil(minutes, step = SNAP_MINUTES) {
  return Math.ceil(minutes / step) * step
}

/** Snap to the hour row clicked (e.g. 9:45 → 9:00–10:00). */
export function snapToHourSlot(minutes) {
  const clamped = Math.max(GRID_START_HOUR * 60, Math.min(GRID_END_HOUR * 60 - 1, minutes))
  const start = Math.floor(clamped / 60) * 60
  const end = Math.min(start + 60, GRID_END_HOUR * 60)
  return { start, end }
}

export function pad(n) {
  return n.toString().padStart(2, '0')
}

// 'YYYY-MM-DD' key in local time
export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

// Sunday-based week containing `date`
export function weekDays(date) {
  const start = addDays(date, -date.getDay())
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export function dowLabel(date) {
  return DOW[date.getDay()]
}

// minutes since midnight -> "1:00 PM"
export function minutesToLabel(min) {
  let h = Math.floor(min / 60)
  const m = min % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${pad(m)} ${ampm}`
}

export function formatRange(start, end) {
  // Drop the AM/PM on the start label when both share it, mirroring the mockup.
  const startAmpm = start >= 720 ? 'PM' : 'AM'
  const endAmpm = end >= 720 ? 'PM' : 'AM'
  const startLabel =
    startAmpm === endAmpm ? minutesToLabel(start).replace(` ${startAmpm}`, '') : minutesToLabel(start)
  return `${startLabel} – ${minutesToLabel(end)}`
}

// "HH:MM" (24h) -> minutes
export function timeStringToMinutes(value) {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

// minutes -> "HH:MM" (24h) for <input type="time">
export function minutesToTimeString(min) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
}

export function gridHours() {
  const hours = []
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) hours.push(h)
  return hours
}

export const WEEK_ROW_H = 24 // px per hour in week overview at default day row height

/** Week overview row height scaled from day-view hour height. */
export function weekRowHeightFromDay(dayRowHeight) {
  return Math.max(12, Math.round(dayRowHeight * (WEEK_ROW_H / ROW_H)))
}

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export function monthLabel(date) {
  return `${MONTHS_FULL[date.getMonth()]} ${date.getFullYear()}`
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** e.g. "Jun 29 – Jul 5" or "Dec 28 – Jan 3, 2026" */
export function weekRangeLabel(date) {
  const week = weekDays(date)
  const start = week[0]
  const end = week[6]
  const sm = MONTHS_SHORT[start.getMonth()]
  const em = MONTHS_SHORT[end.getMonth()]
  if (start.getFullYear() !== end.getFullYear()) {
    return `${sm} ${start.getDate()}, ${start.getFullYear()} – ${em} ${end.getDate()}, ${end.getFullYear()}`
  }
  if (start.getMonth() === end.getMonth()) {
    return `${sm} ${start.getDate()} – ${end.getDate()}`
  }
  return `${sm} ${start.getDate()} – ${em} ${end.getDate()}`
}

const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** e.g. "Today", "Tomorrow", "Wednesday, Jun 30" */
export function dayNavLabel(date) {
  const today = new Date()
  const key = dateKey(date)
  if (key === dateKey(today)) return 'Today'
  if (key === dateKey(addDays(today, 1))) return 'Tomorrow'
  return `${WEEKDAYS_FULL[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`
}

/** 42-day grid (6 weeks) for a month picker, Sunday-first. */
export function monthGrid(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const start = addDays(first, -first.getDay())
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

export function sameDay(a, b) {
  return dateKey(a) === dateKey(b)
}
