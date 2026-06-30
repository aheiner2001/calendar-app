import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { CaretDownIcon } from './icons.jsx'

export default function CalendarPicker() {
  const { calendars, activeCalendarId, setActiveCalendarId } = useApp()
  const [open, setOpen] = useState(false)

  const options = [
    { id: 'all', name: 'All calendars' },
    ...calendars.map((c) => ({ id: c.id, name: c.name })),
  ]
  const current = options.find((o) => o.id === activeCalendarId) ?? options[0]

  return (
    <div className="calendar-picker">
      <button
        type="button"
        className="calendar-picker-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="calendar-picker-label">{current.name}</span>
        <CaretDownIcon />
      </button>
      {open && (
        <>
          <button type="button" className="calendar-picker-backdrop" onClick={() => setOpen(false)} />
          <div className="calendar-picker-menu">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`calendar-picker-item${opt.id === activeCalendarId ? ' active' : ''}`}
                onClick={() => {
                  setActiveCalendarId(opt.id)
                  setOpen(false)
                }}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
