import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
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
  const { events, selectedDate, syncState, firebaseEnabled } = useApp()
  const navigate = useNavigate()

  const todayKey = dateKey(selectedDate)
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  const isToday = dateKey(new Date()) === todayKey

  const todays = useMemo(
    () => eventsForDay(events, selectedDate).sort((a, b) => a.start - b.start),
    [events, selectedDate],
  )

  const upNext = useMemo(() => {
    const future = isToday ? todays.filter((e) => e.end >= nowMinutes) : todays
    return future.slice(0, 3)
  }, [todays, isToday, nowMinutes])

  const syncLabel = !firebaseEnabled ? '●' : syncState === 'synced' ? '✓' : '…'

  return (
    <div className="page">
      <div className="home-page">
        <div className="home-greeting">{greeting(new Date().getHours())} 👋</div>
        <div className="home-sub">
          {WEEKDAYS[selectedDate.getDay()]}, {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
        </div>

        <div className="home-stats">
          <div className="stat-card">
            <div className="num">{todays.length}</div>
            <div className="label">Events today</div>
          </div>
          <div className="stat-card">
            <div className="num">{new Set(todays.map((e) => e.color)).size}</div>
            <div className="label">Categories</div>
          </div>
          <div className="stat-card">
            <div className="num">{syncLabel}</div>
            <div className="label">{firebaseEnabled ? 'Synced' : 'Local'}</div>
          </div>
        </div>

        <div className="home-section-title">Up next</div>
        {upNext.length === 0 && <div className="home-empty">Nothing left today 🎉</div>}
        {upNext.map((ev) => (
          <div key={ev.id} className="home-event-item" onClick={() => navigate('/calendar')}>
            <div className="home-event-dot" style={{ background: ev.color }} />
            <div className="etext">
              <div className="etitle">{ev.title}</div>
              <div className="etime">{formatRange(ev.start, ev.end)}</div>
            </div>
          </div>
        ))}

        <div className="home-section-title" style={{ marginTop: 18 }}>Quick actions</div>
        <div className="home-event-item" onClick={() => navigate('/sync')}>
          <div className="home-event-dot" style={{ background: 'var(--accent)' }} />
          <div className="etext">
            <div className="etitle">Sync calendar</div>
            <div className="etime">{firebaseEnabled ? 'Cloud sync enabled' : 'Local only'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
