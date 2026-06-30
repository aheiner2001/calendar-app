import { snapMinutes } from './time.js'

export function eventsOverlap(a, b) {
  if (a.day !== b.day) return false
  return a.start < b.end && b.start < a.end
}

export function findConflicts(existing, proposed) {
  const conflicts = []
  for (const p of proposed) {
    for (const e of existing) {
      if (eventsOverlap(e, p)) {
        conflicts.push({ existing: e, proposed: p })
      }
    }
    for (const other of proposed) {
      if (other === p) continue
      if (eventsOverlap(other, p)) {
        conflicts.push({ existing: other, proposed: p, internal: true })
      }
    }
  }
  return conflicts
}

/** Suggest next free slot on the same day after the conflict ends. */
export function suggestAlternateSlot(day, existing, durationMinutes, afterMinutes = 9 * 60) {
  const dayEvents = existing
    .filter((e) => e.day === day)
    .sort((a, b) => a.start - b.start)

  let candidate = snapMinutes(afterMinutes)
  for (const e of dayEvents) {
    if (candidate + durationMinutes <= e.start) return { day, start: candidate, end: candidate + durationMinutes }
    if (candidate < e.end) candidate = snapMinutes(e.end)
  }
  if (candidate + durationMinutes <= 22 * 60) {
    return { day, start: candidate, end: candidate + durationMinutes }
  }
  return null
}
