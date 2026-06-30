import { colorFromPreset } from './gemini.js'
import { findConflicts, suggestAlternateSlot } from './conflicts.js'

export function findEvent(events, { eventId, matchTitle, day, fromDay }) {
  const targetDay = day || fromDay
  if (eventId) return events.find((e) => e.id === eventId)
  if (!matchTitle || !targetDay) return null
  const q = matchTitle.toLowerCase()
  return events.find(
    (e) => e.day === targetDay && (e.title.toLowerCase() === q || e.title.toLowerCase().includes(q)),
  )
}

function resolveCalendarId(result, ctx) {
  if (result.calendarName) {
    const cal = ctx.calendars.find(
      (c) => c.name.toLowerCase() === result.calendarName.toLowerCase() || c.name.toLowerCase().includes(result.calendarName.toLowerCase()),
    )
    if (cal) return cal.id
  }
  for (const e of result.events) {
    if (e.calendarId) return e.calendarId
  }
  return ctx.writeCalendarId()
}

export async function executeAssistantResult(result, ctx) {
  const { addEvent, updateEvent, deleteEvent, events, settings, calendars, writeCalendarId } = ctx
  const outcomes = { added: 0, updated: 0, deleted: 0, rescheduled: 0, messages: [] }

  if (result.intent === 'summarize' || result.intent === 'review') {
    outcomes.messages.push(result.summary || 'No summary generated.')
    return outcomes
  }

  const calendarId = resolveCalendarId(result, { calendars, writeCalendarId })

  for (const d of result.deletes) {
    const ev = findEvent(events, d)
    if (ev) {
      await deleteEvent(ev.id)
      outcomes.deleted++
    }
  }

  for (const u of result.updates) {
    const ev = findEvent(events, u)
    if (!ev) continue
    const patch = { ...ev }
    if (u.title) patch.title = u.title
    if (u.day) patch.day = u.day
    if (u.startMinutes != null) patch.start = Number(u.startMinutes)
    if (u.endMinutes != null) patch.end = Number(u.endMinutes)
    await updateEvent(patch)
    outcomes.updated++
  }

  for (const r of result.reschedule) {
    const ev = findEvent(events, r)
    if (!ev) continue
    const patch = { ...ev }
    if (r.toDay) patch.day = r.toDay
    if (r.startMinutes != null) patch.start = Number(r.startMinutes)
    if (r.endMinutes != null) patch.end = Number(r.endMinutes)
    await updateEvent(patch)
    outcomes.rescheduled++
  }

  const toAdd = result.events.map((e) => ({
    title: e.title,
    day: e.day,
    start: e.start,
    end: e.end,
    color: colorFromPreset(settings.savedColors, e.presetLabel, e.title),
    calendarId: e.calendarId || calendarId,
  }))

  for (const c of conflicts) {
    const idx = toAdd.findIndex((e) => e === c.proposed)
    const alt = suggestAlternateSlot(
      c.proposed.day,
      [...events, ...toAdd.filter((_, i) => i !== idx)],
      c.proposed.end - c.proposed.start,
      c.existing.end,
    )
    if (alt && idx >= 0) {
      outcomes.messages.push(`Adjusted "${c.proposed.title}" to avoid overlap`)
      toAdd[idx] = { ...toAdd[idx], start: alt.start, end: alt.end }
    }
  }

  for (const e of toAdd) {
    await addEvent(e)
    outcomes.added++
  }

  for (const c of result.conflicts) {
    if (c.description) outcomes.messages.push(c.suggestion ? `${c.description} → ${c.suggestion}` : c.description)
  }

  return outcomes
}
