import { ALL_CALENDARS_ID, calendarLabel } from '../lib/calendars.js'

export default function EventCalendarTag({ event, calendars, activeCalendarId, personalCalendarId }) {
  if (activeCalendarId !== ALL_CALENDARS_ID) return null
  const label = calendarLabel(calendars, event.calendarId || personalCalendarId)
  return <div className="event-calendar-tag">{label}</div>
}
