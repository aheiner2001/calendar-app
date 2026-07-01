import { Fragment, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import AddEventModal from '../components/AddEventModal.jsx'
import EventCalendarTag from '../components/EventCalendarTag.jsx'
import { eventsForDay } from '../lib/repeat.js'
import { addDays, dateKey, formatRange } from '../lib/time.js'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const UPCOMING_DAYS = 14

function greeting(h) {
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatDayHeader(date, today) {
  const key = dateKey(date)
  if (key === dateKey(today)) return 'Today'
  if (key === dateKey(addDays(today, 1))) return 'Tomorrow'
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`
}

export default function Home() {
  const { events, showToast, calendars, activeCalendarId, personalCalendarId } = useApp()
  const [addOpen, setAddOpen] = useState(false)

  const today = useMemo(() => new Date(), [])
  const todayKey = dateKey(today)
  const nowMinutes = today.getHours() * 60 + today.getMinutes()

  const upcoming = useMemo(() => {
    const items = []
    const dayStart = new Date(today)
    dayStart.setHours(0, 0, 0, 0)

    for (let i = 0; i < UPCOMING_DAYS; i++) {
      const date = addDays(dayStart, i)
      const dayEvents = eventsForDay(events, date).sort((a, b) => a.start - b.start)
      for (const ev of dayEvents) {
        if (i === 0 && ev.end < nowMinutes) continue
        items.push({
          ev,
          date,
          key: `${ev.id}@${dateKey(date)}`,
        })
      }
    }

    return items
  }, [events, todayKey, nowMinutes, today])

  return (
    <div className="page">
      <div className="home-page">
        <div className="home-header">
          <div className="home-greeting">{greeting(today.getHours())}</div>
          <div className="home-sub">
            {WEEKDAYS[today.getDay()]}, {MONTHS_FULL[today.getMonth()]} {today.getDate()}
          </div>
        </div>

        <div className="home-section-title">Up next · 2 weeks</div>
        <div className="home-upcoming-box">
          {upcoming.length === 0 ? (
            <div className="home-empty">No upcoming events in the next two weeks</div>
          ) : (
            upcoming.map(({ ev, date, key }, index) => {
              const showDay =
                index === 0 || dateKey(date) !== dateKey(upcoming[index - 1].date)
              const isNext = index === 0

              return (
                <Fragment key={key}>
                  {showDay && (
                    <div className="home-upcoming-day">{formatDayHeader(date, today)}</div>
                  )}
                  <div className={`home-event-item${isNext ? ' home-event-item-next' : ''}`}>
                    <div className="home-event-dot" style={{ background: ev.color }} />
                    <div className="etext">
                      {isNext && <div className="home-next-label">Next</div>}
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
                </Fragment>
              )
            })
          )}
        </div>

        <div className="home-footer">
          <div className="home-section-title">Quick actions</div>
          <button type="button" className="home-action-item" onClick={() => setAddOpen(true)}>
            <div className="home-action-icon">+</div>
            <div className="etext">
              <div className="etitle">Add event</div>
              <div className="etime">Create a new event for today</div>
            </div>
          </button>
        </div>
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
