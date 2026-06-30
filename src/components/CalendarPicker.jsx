import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { ALL_CALENDARS_ID } from '../lib/calendars.js'
import { CaretDownIcon } from './icons.jsx'

export default function CalendarPicker() {
  const { calendars, activeCalendarId, setActiveCalendarId, createSharedCalendar, showToast } = useApp()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  const options = [
    { id: ALL_CALENDARS_ID, name: 'All calendars' },
    ...calendars.map((c) => ({ id: c.id, name: c.name })),
  ]
  const current = options.find((o) => o.id === activeCalendarId) ?? options[0]

  const handleCreate = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const cal = await createSharedCalendar(newName)
      setActiveCalendarId(cal.id)
      setNewName('')
      setAdding(false)
      setOpen(false)
      showToast(`Calendar "${cal.name}" created`)
    } catch {
      showToast('Could not create calendar')
    } finally {
      setBusy(false)
    }
  }

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
            <div className="calendar-picker-footer">
              {adding ? (
                <form className="calendar-picker-add-form" onSubmit={handleCreate}>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Calendar name"
                    autoFocus
                  />
                  <div className="calendar-picker-add-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                      Create
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="calendar-picker-add"
                  onClick={() => setAdding(true)}
                >
                  + Add calendar
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
