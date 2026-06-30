import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { dateKey, monthGrid, monthLabel, sameDay } from '../lib/time.js'

const DOW_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function DatePickerModal({ onClose }) {
  const { selectedDate, setSelectedDate } = useApp()
  const [viewMonth, setViewMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  const today = new Date()
  const days = monthGrid(viewMonth)

  const pick = (day) => {
    setSelectedDate(new Date(day))
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal date-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="date-picker-nav">
          <button type="button" className="date-picker-arrow" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} aria-label="Previous month">
            ‹
          </button>
          <div className="date-picker-month">{monthLabel(viewMonth)}</div>
          <button type="button" className="date-picker-arrow" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} aria-label="Next month">
            ›
          </button>
        </div>

        <div className="date-picker-dow">
          {DOW_SHORT.map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>

        <div className="date-picker-grid">
          {days.map((day) => {
            const inMonth = day.getMonth() === viewMonth.getMonth()
            const selected = sameDay(day, selectedDate)
            const isToday = sameDay(day, today)
            return (
              <button
                key={dateKey(day)}
                type="button"
                className={`date-picker-day${inMonth ? '' : ' other'}${selected ? ' selected' : ''}${isToday ? ' today' : ''}`}
                onClick={() => pick(day)}
              >
                {day.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
