// App-level settings. "Saved colors" double as quick-add activity presets: each has
// a label and a hex color. They're data-driven and editable from the Settings panel,
// and persisted (localStorage today, easy to sync later).

export const DEFAULT_SETTINGS = {
  defaultDurationMinutes: 60,
  snapMinutes: 15,
  savedColors: [
    { id: 'homework', label: 'Homework', color: '#8b6fc9' },
    { id: 'activity', label: 'Activity', color: '#d9a73d' },
    { id: 'meeting', label: 'Meeting', color: '#c2447a' },
    { id: 'study', label: 'Study', color: '#5aa9e6' },
  ],
  // Weekly baseline blocks the AI should respect (days: 0=Sun … 6=Sat)
  prioritySchedule: [
    { id: 'ps-work', label: 'Work', color: '#5aa9e6', days: [1, 2, 3, 4, 5], start: 540, end: 1020 },
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

export function normalizeSettings(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...raw }
  if (!Array.isArray(merged.savedColors)) merged.savedColors = DEFAULT_SETTINGS.savedColors
  if (!Array.isArray(merged.prioritySchedule)) merged.prioritySchedule = []
  return merged
}
