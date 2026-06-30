import { geminiModel } from './firebase.js'
import { formatEventsForAi, formatPriorityScheduleForAi } from './prioritySchedule.js'
import { dateKey, minutesToLabel } from './time.js'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function friendlyError(err) {
  const msg = err?.message || String(err)
  if (/permission|PERMISSION_DENIED|insufficient/i.test(msg)) {
    return (
      'Permission denied. If App Check is enforced, add VITE_RECAPTCHA_SITE_KEY to .env ' +
      'or set App Check to Monitor only. Run: firebase deploy --only firestore:rules'
    )
  }
  return msg || 'Something went wrong'
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1].trim() : text.trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Could not parse AI response')
  return JSON.parse(raw.slice(start, end + 1))
}

export function colorFromPreset(presets, presetLabel, title) {
  if (presetLabel) {
    const match = presets.find((p) => p.label.toLowerCase() === String(presetLabel).toLowerCase())
    if (match) return match.color
  }
  const lower = (title || '').toLowerCase()
  for (const p of presets) {
    if (lower.includes(p.label.toLowerCase()) || p.label.toLowerCase().includes(lower)) {
      return p.color
    }
  }
  return presets[0]?.color ?? '#2ec4b6'
}

function normalizeDay(value, referenceDate) {
  if (!value || typeof value !== 'string') return dateKey(referenceDate)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const lower = value.toLowerCase()
  const today = new Date(referenceDate)
  if (lower.includes('today')) return dateKey(today)
  if (lower.includes('tomorrow')) {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return dateKey(d)
  }
  for (let i = 0; i < 7; i++) {
    const name = WEEKDAYS[i].toLowerCase()
    if (lower.includes(name.slice(0, 3))) {
      const d = new Date(today)
      let delta = (i - d.getDay() + 7) % 7
      if (delta === 0 && lower.includes('next')) delta = 7
      d.setDate(d.getDate() + delta)
      return dateKey(d)
    }
  }
  return dateKey(referenceDate)
}

function normalizeMinutes(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.min(24 * 60 - 1, Math.round(n)))
}

function normalizeEvent(raw, referenceDate) {
  const start = normalizeMinutes(raw.startMinutes ?? raw.start, 9 * 60)
  let end = normalizeMinutes(raw.endMinutes ?? raw.end, start + 60)
  if (end <= start) end = start + 60
  return {
    title: String(raw.title || 'Untitled').trim() || 'Untitled',
    day: normalizeDay(raw.day, referenceDate),
    start,
    end,
    presetLabel: raw.presetLabel || raw.preset || null,
    calendarId: raw.calendarId || null,
  }
}

function normalizeResult(parsed, referenceDate) {
  const intent = parsed.intent || 'add'
  const events = (Array.isArray(parsed.events) ? parsed.events : parsed.events ? [parsed.events] : []).map(
    (e) => normalizeEvent(e, referenceDate),
  )
  return {
    intent,
    events,
    updates: Array.isArray(parsed.updates) ? parsed.updates : [],
    deletes: Array.isArray(parsed.deletes) ? parsed.deletes : [],
    reschedule: Array.isArray(parsed.reschedule) ? parsed.reschedule : [],
    summary: parsed.summary || parsed.review || '',
    conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
    calendarName: parsed.calendarName || null,
  }
}

export async function runAssistant({
  text,
  referenceDate = new Date(),
  settings,
  events = [],
  calendars = [],
  activeCalendarId,
  personalCalendarId,
}) {
  if (!geminiModel) {
    throw new Error('Enable Firebase AI Logic (Gemini Developer API) in the Firebase console.')
  }

  const today = dateKey(referenceDate)
  const presets = (settings.savedColors || []).map((p) => ({ label: p.label, color: p.color }))
  const existing = formatEventsForAi(events, referenceDate, 14)
  const calList = calendars.map((c) => ({ id: c.id, name: c.name, type: c.type }))
  const activeCal = calendars.find((c) => c.id === activeCalendarId)

  const prompt = `You are a calendar AI assistant. Today is ${today} (${WEEKDAYS[referenceDate.getDay()]}).
User request: "${text.trim()}"

PRESET COLORS (use presetLabel to pick closest):
${presets.map((p) => `- ${p.label}`).join('\n') || '- (none)'}

PRIORITY BASELINE (fixed weekly blocks — never double-book over these; schedule around them):
${formatPriorityScheduleForAi(settings)}

EXISTING EVENTS (next 14 days, JSON):
${JSON.stringify(existing)}

CALENDARS:
${JSON.stringify(calList)}
Active calendar: ${activeCal ? `${activeCal.name} (${activeCal.id})` : 'All calendars → personal'}

Detect intent and respond ONLY with JSON:
{
  "intent": "add" | "edit" | "delete" | "reschedule" | "summarize" | "review" | "import" | "plan",
  "events": [{ "title": "", "day": "YYYY-MM-DD", "startMinutes": 540, "endMinutes": 600, "presetLabel": "Study", "calendarId": null }],
  "updates": [{ "eventId": "optional", "matchTitle": "", "day": "YYYY-MM-DD", "startMinutes": null, "endMinutes": null, "title": null }],
  "deletes": [{ "eventId": "optional", "matchTitle": "", "day": "YYYY-MM-DD" }],
  "reschedule": [{ "eventId": "optional", "matchTitle": "", "fromDay": "YYYY-MM-DD", "toDay": "YYYY-MM-DD", "startMinutes": null, "endMinutes": null }],
  "conflicts": [{ "description": "", "suggestion": "" }],
  "summary": "",
  "calendarName": null
}

INTENT RULES:
- add: create new event(s). Multiple days → multiple events. Work with no time → 9am-5pm (540-1020).
- import: pasted email/agenda text → extract all events.
- plan: fill gaps around priority baseline + existing events; respect presets.
- edit: updates array with matchTitle+day or eventId.
- delete: deletes array ("cancel gym Friday").
- reschedule: reschedule array OR updates; move non-urgent items when user is sick etc.
- summarize: summary only — brief day overview (upcoming, gaps). No events array.
- review: summary only — weekly review (busiest day, free blocks, tips).

SCHEDULING:
- Avoid overlapping existing events and priority baseline times.
- If conflict unavoidable, list in conflicts with suggestion e.g. "${minutesToLabel(15 * 60)} instead".
- For shared calendar requests, set calendarName to match CALENDARS list.

Return valid JSON only.`

  try {
    const result = await geminiModel.generateContent(prompt)
    const raw = result.response.text()
    return normalizeResult(extractJson(raw), referenceDate)
  } catch (err) {
    throw new Error(friendlyError(err))
  }
}

export async function summarizeDay(events, date, settings) {
  const dayKey = dateKey(date)
  const dayEvents = events.filter((e) => e.day === dayKey).sort((a, b) => a.start - b.start)
  const label = date.toDateString()

  if (!geminiModel) {
    if (dayEvents.length === 0) return `Nothing scheduled for ${label}.`
    return dayEvents.map((e) => `${minutesToLabel(e.start)} ${e.title}`).join(' · ')
  }

  const prompt = `Summarize this calendar day in 2-3 friendly sentences for a home screen widget.
Day: ${dayKey} (${label})
Events: ${JSON.stringify(dayEvents.map((e) => ({ title: e.title, start: e.start, end: e.end })))}
Priority baseline: ${formatPriorityScheduleForAi(settings)}
Mention what's next, how busy it is, and any open gaps. Plain text only, no JSON.`

  const result = await geminiModel.generateContent(prompt)
  return result.response.text().trim()
}

/** @deprecated */
export async function parseEventsFromText(text, referenceDate = new Date()) {
  const r = await runAssistant({ text, referenceDate, settings: { savedColors: [], prioritySchedule: [] }, events: [] })
  return r.events
}
