import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import AddEventModal from '../components/AddEventModal.jsx'
import EventCalendarTag from '../components/EventCalendarTag.jsx'
import { eventsForDay } from '../lib/repeat.js'
import { dateKey, formatRange } from '../lib/time.js'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function greeting(h) {
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const { events, showToast, calendars, activeCalendarId, personalCalendarId } = useApp()
  const [addOpen, setAddOpen] = useState(false)

  const today = new Date()
  const todayKey = dateKey(today)
  const nowMinutes = today.getHours() * 60 + today.getMinutes()

  const todays = useMemo(
    () => eventsForDay(events, today).sort((a, b) => a.start - b.start),
    [events, todayKey],
  )

  const upNext = useMemo(() => todays.filter((e) => e.end >= nowMinutes), [todays, nowMinutes])

  const nextEvent = upNext[0]

  return (
    <div className="page">
      <div className="home-page">
        <div className="home-greeting">{greeting(today.getHours())} </div>
        <div className="home-sub">
          {WEEKDAYS[today.getDay()]}, {MONTHS[today.getMonth()]} {today.getDate()}
        </div>

        <div className="home-section-title">Up next</div>
        {nextEvent ? (
          <div className="home-next-card">
            <div className="home-event-dot" style={{ background: nextEvent.color }} />
            <div className="etext">
              <div className="home-next-label">Next</div>
              <div className="etitle">{nextEvent.title}</div>
              <div className="etime">{formatRange(nextEvent.start, nextEvent.end)}</div>
              <EventCalendarTag
                event={nextEvent}
                calendars={calendars}
                activeCalendarId={activeCalendarId}
                personalCalendarId={personalCalendarId}
              />
            </div>
          </div>
        ) : (
          <div className="home-empty">Nothing left today 🎉</div>
        )}

        {upNext.length > 1 && (
          <div className="home-upcoming-list">
            {upNext.slice(1).map((ev) => (
              <div key={ev.id} className="home-event-item">
                <div className="home-event-dot" style={{ background: ev.color }} />
                <div className="etext">
                  <div className="etitle">{ev.title}</div>
                  <div className="etime">{formatRange(ev.start, ev.end)}</div>
                  <EventCalendarTag
                    event={ev}
                    calendars={calendars}
                    activeCalendarId={activeCalendarId}
                    personalCalendarId={personalCalendarId}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="home-section-title home-section-spaced">Quick actions</div>
        <button type="button" className="home-action-item" onClick={() => setAddOpen(true)}>
          <div className="home-action-icon">+</div>
          <div className="etext">
            <div className="etitle">Add event</div>
            <div className="etime">Create a new event for today</div>
          </div>
        </button>
      </div>

      {addOpen && (
        <AddEventModal
          dayKey={todayKey}
          onClose={() => setAddOpen(false)}
          onSaved={(msg) => showToast(msg)}
        />
      )}
    </div>
  )
}
