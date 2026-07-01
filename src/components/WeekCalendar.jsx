import { useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { layoutEvents } from '../lib/layout.js'
import { eventsForDay } from '../lib/repeat.js'
import { ALL_CALENDARS_ID, calendarLabel } from '../lib/calendars.js'
import { colorFill } from '../lib/settings.js'
import {
  GRID_START_HOUR,
  dateKey,
  dowLabel,
  gridHours,
  minutesToLabel,
  weekRowHeightFromDay,
} from '../lib/time.js'

export default function WeekCalendar({
  events,
  week,
  selectedDate,
  calendars,
  activeCalendarId,
  personalCalendarId,
  onSelectDay,
  onEventClick,
}) {
  const { settings } = useApp()
  const showCalendarNames = activeCalendarId === ALL_CALENDARS_ID
  const hours = gridHours()
  const weekRowH = weekRowHeightFromDay(settings.hourRowHeight)
  const gridHeight = hours.length * weekRowH
  const selectedKey = dateKey(selectedDate)

  const eventsByDay = useMemo(() => {
    const map = {}
    week.forEach((d) => {
      const key = dateKey(d)
      map[key] = layoutEvents(eventsForDay(events, d))
    })
    return map
  }, [events, week])

  const minutesToTop = (minutes) => ((minutes - GRID_START_HOUR * 60) / 60) * weekRowH
  const minutesToHeight = (start, end) => Math.max(((end - start) / 60) * weekRowH, Math.max(4, Math.round(weekRowH * 0.17)))

  return (
    <div className="week-grid-wrap">
      <div className="week-grid">
        <div className="week-time-col">
          <div className="week-col-header week-time-header" />
          {hours.map((h, i) => (
            <div key={h} className="week-time-label" style={{ height: weekRowH }}>
              {i % 2 === 0 ? minutesToLabel(h * 60).replace(':00', '') : ''}
            </div>
          ))}
        </div>

        {week.map((day) => {
          const key = dateKey(day)
          const active = key === selectedKey
          const dayEvents = eventsByDay[key] || []

          return (
            <div key={key} className={`week-day-col${active ? ' active' : ''}`}>
              <button type="button" className="week-col-header" onClick={() => onSelectDay(day)}>
                <span className="week-col-dow">{dowLabel(day)}</span>
                <span className={`week-col-dom${active ? ' active' : ''}`}>{day.getDate()}</span>
              </button>

              <div className="week-day-grid" style={{ height: gridHeight }}>
                {hours.map((h) => (
                  <div key={h} className="week-hour-line" style={{ height: weekRowH }} />
                ))}

                {dayEvents.map((ev) => {
                  const top = minutesToTop(ev.start)
                  const height = minutesToHeight(ev.start, ev.end)
                  const width = 100 / ev.cols
                  const calName = calendarLabel(calendars, ev.calendarId || personalCalendarId)
                  const tooltip = showCalendarNames ? `${ev.title} · ${calName}` : ev.title
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      className="week-event"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        left: `${ev.col * width}%`,
                        width: `calc(${width}% - 2px)`,
                        background: colorFill(ev.color),
                        borderColor: ev.color,
                      }}
                      title={tooltip}
                      onClick={() => onEventClick(ev)}
                    >
                      {showCalendarNames && height >= 28 && (
                        <span className="week-event-cal">{calName}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
