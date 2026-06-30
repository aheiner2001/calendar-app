import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { CaretDownIcon, SearchIcon, SettingsIcon } from './icons.jsx'
import SettingsModal from './SettingsModal.jsx'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function AppBar() {
  const { selectedDate, theme, toggleTheme, showToast } = useApp()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const label = `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}`

  return (
    <div className="app-bar">
      <div className="left">
        <div className="menu-icon">
          <span />
          <span />
          <span />
        </div>
        <div className="date-select" onClick={() => showToast('Open date picker')}>
          {label}
          <CaretDownIcon />
        </div>
      </div>
      <div className="right">
        <button className="icon-btn" onClick={() => showToast('Search events')} aria-label="Search">
          <SearchIcon />
        </button>
        <button className="icon-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
          <SettingsIcon />
        </button>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          <div className="knob">{theme === 'dark' ? '☀' : '🌙'}</div>
        </button>
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
