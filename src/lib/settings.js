// App-level settings. "Saved colors" double as quick-add activity presets: each has
// a label and a hex color. They're data-driven and editable from the Settings panel,
// and persisted (localStorage today, easy to sync later).

export const DEFAULT_SETTINGS = {
  defaultDurationMinutes: 60,
  // snap granularity (minutes) for tap-to-add and drag-resize
  snapMinutes: 15,
  savedColors: [
    { id: 'homework', label: 'Homework', color: '#8b6fc9' },
    { id: 'activity', label: 'Activity', color: '#d9a73d' },
    { id: 'meeting', label: 'Meeting', color: '#c2447a' },
    { id: 'study', label: 'Study', color: '#5aa9e6' },
  ],
}

// Translucent fill derived from a hex color. Because it composites over the page
// background, the same alpha reads as a dark tint in dark mode and a pale tint in
// light mode — matching the reference look in both themes.
export function colorFill(hex, alpha = 0.22) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
