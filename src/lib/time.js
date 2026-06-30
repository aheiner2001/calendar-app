export const GRID_START_HOUR = 7   // 7 AM
export const GRID_END_HOUR = 22    // 10 PM
export const ROW_H = 64            // px per hour — must match --row-h in index.css
export const SNAP_MINUTES = 15

/** Round minutes since midnight to the nearest snap interval (default 15 min). */
export function snapMinutes(minutes, step = SNAP_MINUTES) {
  return Math.round(minutes / step) * step
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
