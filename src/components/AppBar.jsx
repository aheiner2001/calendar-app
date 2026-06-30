import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { CaretDownIcon, SettingsIcon } from './icons.jsx'
import CalendarPicker from './CalendarPicker.jsx'
import DatePickerModal from './DatePickerModal.jsx'
import SettingsModal from './SettingsModal.jsx'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function AppBar() {
  const { selectedDate, theme, toggleTheme, calendarView, toggleCalendarView } = useApp()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const location = useLocation()
  const onCalendar = location.pathname === '/calendar'
  const label = `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}`

  return (
    <div className="app-bar">
      <div className="app-bar-left">
        <button type="button" className="date-select" onClick={() => setDatePickerOpen(true)}>
          {label}
          <CaretDownIcon />
        </button>
      </div>

      <div className="app-bar-center">
        <CalendarPicker />
      </div>

      <div className="app-bar-right">
        {onCalendar && (
          <button
            type="button"
            className="view-toggle-btn"
            onClick={toggleCalendarView}
            aria-label={`Switch to ${calendarView === 'day' ? 'week' : 'day'} view`}
          >
            {calendarView === 'day' ? 'Day' : 'Week'}
          </button>
        )}
        <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
          <SettingsIcon />
        </button>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          <div className="knob">{theme === 'dark' ? '☀' : '🌙'}</div>
        </button>
      </div>

      {datePickerOpen && <DatePickerModal onClose={() => setDatePickerOpen(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
