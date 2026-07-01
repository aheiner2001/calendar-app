// App-level settings. "Saved colors" double as quick-add activity presets: each has
// a label and a hex color. They're data-driven and editable from the Settings panel,
// and persisted (localStorage today, easy to sync later).

export const HOUR_ROW_HEIGHT_DEFAULT = 56
export const HOUR_ROW_HEIGHT_MIN = 28
export const HOUR_ROW_HEIGHT_MAX = 96

export const DEFAULT_SETTINGS = {
  defaultDurationMinutes: 60,
  snapMinutes: 15,
  hourRowHeight: HOUR_ROW_HEIGHT_DEFAULT,
  savedColors: [
    { id: 'homework', label: 'Homework', color: '#8b6fc9' },
    { id: 'activity', label: 'Activity', color: '#d9a73d' },
    { id: 'meeting', label: 'Meeting', color: '#c2447a' },
    { id: 'study', label: 'Study', color: '#5aa9e6' },
  ],
}

export function colorFill(hex, alpha = 0.22) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function clampHourRowHeight(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return HOUR_ROW_HEIGHT_DEFAULT
  return Math.max(HOUR_ROW_HEIGHT_MIN, Math.min(HOUR_ROW_HEIGHT_MAX, Math.round(n)))
}

export function normalizeSettings(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...raw }
  if (!Array.isArray(merged.savedColors)) merged.savedColors = DEFAULT_SETTINGS.savedColors
  merged.hourRowHeight = clampHourRowHeight(merged.hourRowHeight)
  return merged
}
