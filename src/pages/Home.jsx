import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import AddEventModal from '../components/AddEventModal.jsx'
import AiAssistantModal from '../components/AiAssistantModal.jsx'
import { aiEnabled } from '../lib/firebase.js'
import { summarizeDay } from '../lib/gemini.js'
import { eventsForDay } from '../lib/repeat.js'
import { addDays, dateKey, formatRange } from '../lib/time.js'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function greeting(h) {
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const { events, allEvents, settings, selectedDate, showToast } = useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [briefing, setBriefing] = useState('')
  const [briefingLoading, setBriefingLoading] = useState(false)

  const todayKey = dateKey(selectedDate)
  const tomorrow = addDays(new Date(), 1)
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  const isToday = dateKey(new Date()) === todayKey

  const todays = useMemo(
    () => eventsForDay(events, selectedDate).sort((a, b) => a.start - b.start),
    [events, selectedDate],
  )

  const upNext = useMemo(() => {
    const future = isToday ? todays.filter((e) => e.end >= nowMinutes) : todays
    return future
  }, [todays, isToday, nowMinutes])

  const nextEvent = upNext[0]

  useEffect(() => {
    if (!aiEnabled) return
    let cancelled = false
    setBriefingLoading(true)
    summarizeDay(allEvents, tomorrow, settings)
      .then((text) => {
        if (!cancelled) setBriefing(text)
      })
      .catch(() => {
        if (!cancelled) setBriefing('')
      })
      .finally(() => {
        if (!cancelled) setBriefingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [allEvents, settings, dateKey(tomorrow)])

  return (
    <div className="page">
      <div className="home-page">
        <div className="home-greeting">{greeting(new Date().getHours())} </div>
        <div className="home-sub">
          {WEEKDAYS[selectedDate.getDay()]}, {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
        </div>

        <div className="home-section-title">Up next</div>
        {nextEvent ? (
          <div className="home-next-card">
            <div className="home-event-dot" style={{ background: nextEvent.color }} />
            <div className="etext">
              <div className="home-next-label">Next</div>
              <div className="etitle">{nextEvent.title}</div>
              <div className="etime">{formatRange(nextEvent.start, nextEvent.end)}</div>
            </div>
          </div>
        ) : (
          <div className="home-empty">{isToday ? 'Nothing left today 🎉' : 'No events this day'}</div>
        )}

        {upNext.length > 1 && (
          <div className="home-upcoming-list">
            {upNext.slice(1).map((ev) => (
              <div key={ev.id} className="home-event-item">
                <div className="home-event-dot" style={{ background: ev.color }} />
                <div className="etext">
                  <div className="etitle">{ev.title}</div>
                  <div className="etime">{formatRange(ev.start, ev.end)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(briefingLoading || briefing) && (
          <>
            <div className="home-section-title home-section-spaced">Tomorrow</div>
            <div className="home-briefing">
              {briefingLoading ? 'Loading briefing…' : briefing}
            </div>
          </>
        )}

        <div className="home-section-title home-section-spaced">Quick actions</div>
        <button type="button" className="home-action-item" onClick={() => setAddOpen(true)}>
          <div className="home-action-icon">+</div>
          <div className="etext">
            <div className="etitle">Add event</div>
            <div className="etime">Create a new event for today</div>
          </div>
        </button>
        <button type="button" className="home-action-item" onClick={() => setAiOpen(true)}>
          <div className="home-action-icon ai">✦</div>
          <div className="etext">
            <div className="etitle">AI assistant</div>
            <div className="etime">Plan, edit, import, or summarize your schedule</div>
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
      {aiOpen && (
        <AiAssistantModal onClose={() => setAiOpen(false)} onSaved={() => showToast('Done')} />
      )}
    </div>
  )
}
