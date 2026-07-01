import { dateKey } from './time.js'

export const REPEAT_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom…' },
]

export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function dayOfWeekFromKey(key) {
  return parseDayKey(key).getDay()
}

export function defaultCustomRepeat(anchorDayKey) {
  return {
    interval: 1,
    unit: 'week',
    weekdays: [dayOfWeekFromKey(anchorDayKey)],
    endMode: 'never',
    until: '',
  }
}

/** Legacy `true` → weekly; custom objects pass through normalized. */
export function normalizeRepeat(repeat) {
  if (!repeat) return null
  if (typeof repeat === 'object' && repeat.custom) {
    const unit = repeat.unit === 'day' || repeat.unit === 'week' || repeat.unit === 'month' ? repeat.unit : 'week'
    const interval = Math.max(1, Math.min(99, Number(repeat.interval) || 1))
    const out = { custom: true, interval, unit }
    if (unit === 'week') {
      const days = (repeat.weekdays || [])
        .map(Number)
        .filter((d) => d >= 0 && d <= 6)
      out.weekdays = days.length ? [...new Set(days)].sort((a, b) => a - b) : [0]
    }
    if (repeat.until && /^\d{4}-\d{2}-\d{2}$/.test(repeat.until)) out.until = repeat.until
    return out
  }
  if (repeat === true) return 'weekly'
  if (repeat === 'daily' || repeat === 'weekly' || repeat === 'monthly') return repeat
  return null
}

export function isCustomRepeat(repeat) {
  return Boolean(repeat && typeof repeat === 'object' && repeat.custom)
}

export function parseRepeatForm(repeat, anchorDayKey) {
  const normalized = normalizeRepeat(repeat)
  if (isCustomRepeat(normalized)) {
    return {
      mode: 'custom',
      custom: {
        interval: normalized.interval,
        unit: normalized.unit,
        weekdays: normalized.weekdays?.length ? [...normalized.weekdays] : [dayOfWeekFromKey(anchorDayKey)],
        endMode: normalized.until ? 'on' : 'never',
        until: normalized.until || '',
      },
    }
  }
  return {
    mode: typeof normalized === 'string' ? normalized : '',
    custom: defaultCustomRepeat(anchorDayKey),
  }
}

export function buildRepeatValue(mode, custom) {
  if (!mode) return null
  if (mode !== 'custom') return mode

  const unit = custom.unit === 'day' || custom.unit === 'week' || custom.unit === 'month' ? custom.unit : 'week'
  const interval = Math.max(1, Math.min(99, Number(custom.interval) || 1))
  const value = { custom: true, interval, unit }

  if (unit === 'week') {
    const weekdays = (custom.weekdays || [])
      .map(Number)
      .filter((d) => d >= 0 && d <= 6)
    if (!weekdays.length) return null
    value.weekdays = [...new Set(weekdays)].sort((a, b) => a - b)
  }

  if (custom.endMode === 'on' && custom.until) value.until = custom.until
  return value
}

export function repeatLabel(repeat) {
  const normalized = normalizeRepeat(repeat)
  if (isCustomRepeat(normalized)) {
    const { interval, unit, weekdays, until } = normalized
    let label = ''
    if (unit === 'day') {
      label = interval === 1 ? 'Daily' : `Every ${interval} days`
    } else if (unit === 'week') {
      const days = (weekdays || []).map((d) => WEEKDAY_NAMES[d]).join(', ')
      label = interval === 1 ? `Weekly on ${days}` : `Every ${interval} weeks on ${days}`
    } else if (unit === 'month') {
      label = interval === 1 ? 'Monthly' : `Every ${interval} months`
    }
    if (until) {
      const [y, m, d] = until.split('-').map(Number)
      label += ` until ${m}/${d}/${y}`
    }
    return label
  }
  if (!normalized) return null
  return REPEAT_OPTIONS.find((o) => o.value === normalized)?.label ?? null
}

function daysBetween(anchor, target) {
  const a = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((t - a) / (24 * 60 * 60 * 1000))
}

function monthsBetween(anchor, target) {
  return (target.getFullYear() - anchor.getFullYear()) * 12 + (target.getMonth() - anchor.getMonth())
}

function startOfWeek(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function weekIndex(anchor, target) {
  const start = startOfWeek(anchor).getTime()
  const t = startOfWeek(target).getTime()
  return Math.round((t - start) / (7 * 24 * 60 * 60 * 1000))
}

function occursOnCustom(anchor, target, targetKey, custom) {
  if (custom.until && targetKey > custom.until) return false

  const dayDiff = daysBetween(anchor, target)
  if (dayDiff < 0) return false

  const interval = custom.interval || 1

  switch (custom.unit) {
    case 'day':
      return dayDiff % interval === 0
    case 'week': {
      const weekdays = custom.weekdays?.length ? custom.weekdays : [anchor.getDay()]
      if (!weekdays.includes(target.getDay())) return false
      const wi = weekIndex(anchor, target)
      if (wi % interval !== 0) return false
      if (wi === 0 && target.getDay() < anchor.getDay()) return false
      return true
    }
    case 'month': {
      if (target.getDate() !== anchor.getDate()) return false
      const months = monthsBetween(anchor, target)
      return months >= 0 && months % interval === 0
    }
    default:
      return false
  }
}

/** Whether a stored event should appear on the given calendar day. */
export function eventOccursOn(event, date) {
  const anchorKey = event.day
  const targetKey = dateKey(date)
  const anchor = parseDayKey(anchorKey)
  const target = parseDayKey(targetKey)

  const normalized = normalizeRepeat(event.repeat)
  if (isCustomRepeat(normalized)) {
    return occursOnCustom(anchor, target, targetKey, normalized)
  }

  if (!normalized) return anchorKey === targetKey
  if (target < anchor) return false

  switch (normalized) {
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
