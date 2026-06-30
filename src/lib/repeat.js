import { dateKey } from './time.js'

export const REPEAT_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

/** Legacy `true` → weekly; `false` → none. */
export function normalizeRepeat(repeat) {
  if (!repeat) return null
  if (repeat === true) return 'weekly'
  if (repeat === 'daily' || repeat === 'weekly' || repeat === 'monthly') return repeat
  return null
}

export function repeatLabel(repeat) {
  const freq = normalizeRepeat(repeat)
  if (!freq) return null
  return REPEAT_OPTIONS.find((o) => o.value === freq)?.label ?? null
}

function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Whether a stored event should appear on the given calendar day. */
export function eventOccursOn(event, date) {
  const anchorKey = event.day
  const targetKey = dateKey(date)
  const freq = normalizeRepeat(event.repeat)

  if (!freq) return anchorKey === targetKey

  const anchor = parseDayKey(anchorKey)
  const target = parseDayKey(targetKey)
  if (target < anchor) return false

  switch (freq) {
    case 'daily':
      return true
    case 'weekly':
      return target.getDay() === anchor.getDay()
    case 'monthly':
      return target.getDate() === anchor.getDate()
    default:
      return anchorKey === targetKey
  }
}

export function eventsForDay(events, date) {
  return events.filter((e) => eventOccursOn(e, date))
}
