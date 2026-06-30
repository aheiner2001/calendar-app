import { useMemo } from 'react'
import { layoutEvents } from '../lib/layout.js'
import { colorFill } from '../lib/settings.js'
import {
  GRID_START_HOUR,
  WEEK_ROW_H,
  dateKey,
  dowLabel,
  gridHours,
  minutesToLabel,
} from '../lib/time.js'

export default function WeekCalendar({ events, week, selectedDate, onSelectDay, onEventClick }) {
  const hours = gridHours()
  const gridHeight = hours.length * WEEK_ROW_H
  const selectedKey = dateKey(selectedDate)

  const eventsByDay = useMemo(() => {
    const map = {}
    week.forEach((d) => {
      const key = dateKey(d)
      map[key] = layoutEvents(events.filter((e) => e.day === key))
    })
    return map
  }, [events, week])

  const minutesToTop = (minutes) => ((minutes - GRID_START_HOUR * 60) / 60) * WEEK_ROW_H
  const minutesToHeight = (start, end) => Math.max(((end - start) / 60) * WEEK_ROW_H, 4)

  return (
    <div className="week-grid-wrap">
      <div className="week-grid">
        <div className="week-time-col">
          <div className="week-col-header week-time-header" />
          {hours.map((h, i) => (
            <div key={h} className="week-time-label" style={{ height: WEEK_ROW_H }}>
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
                  <div key={h} className="week-hour-line" style={{ height: WEEK_ROW_H }} />
                ))}

                {dayEvents.map((ev) => {
                  const top = minutesToTop(ev.start)
                  const height = minutesToHeight(ev.start, ev.end)
                  const width = 100 / ev.cols
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
                      title={ev.title}
                      onClick={() => onEventClick(ev)}
                    />
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
