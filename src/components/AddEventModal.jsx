import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { calendarLabel } from '../lib/storage.js'
import {
  REPEAT_OPTIONS,
  WEEKDAY_LABELS,
  buildRepeatValue,
  parseRepeatForm,
} from '../lib/repeat.js'
import { minutesToTimeString, snapMinutes, timeStringToMinutes } from '../lib/time.js'

export default function AddEventModal({ dayKey, editing, initialStart, initialEnd, onClose, onSaved }) {
  const { settings, addEvent, updateEvent, deleteEvent, writeCalendarId, calendars } = useApp()
  const targetCalendarId = writeCalendarId()
  const targetCalendarName = calendarLabel(calendars, targetCalendarId)
  const isEdit = Boolean(editing)
  const colors = settings.savedColors
  const fallbackColor = colors[0]?.color ?? '#2ec4b6'

  const defaultStart = editing?.start ?? initialStart ?? 9 * 60
  const defaultEnd = editing?.end ?? initialEnd ?? defaultStart + settings.defaultDurationMinutes

  const initialRepeat = parseRepeatForm(editing?.repeat, dayKey)

  const [title, setTitle] = useState(editing?.title ?? '')
  const [color, setColor] = useState(editing?.color ?? fallbackColor)
  const [start, setStart] = useState(minutesToTimeString(snapMinutes(defaultStart)))
  const [end, setEnd] = useState(minutesToTimeString(snapMinutes(defaultEnd)))
  const [repeatMode, setRepeatMode] = useState(initialRepeat.mode)
  const [customRepeat, setCustomRepeat] = useState(initialRepeat.custom)
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [error, setError] = useState('')

  const snapTime = (value) => minutesToTimeString(snapMinutes(timeStringToMinutes(value)))

  const applyPreset = (preset) => {
    setTitle(preset.label)
    setColor(preset.color)
  }

  const toggleWeekday = (day) => {
    setCustomRepeat((prev) => {
      const set = new Set(prev.weekdays)
      if (set.has(day)) {
        if (set.size === 1) return prev
        set.delete(day)
      } else {
        set.add(day)
      }
      return { ...prev, weekdays: [...set].sort((a, b) => a - b) }
    })
  }

  const handleSave = async () => {
    setError('')
    const startMin = snapMinutes(timeStringToMinutes(start))
    let endMin = snapMinutes(timeStringToMinutes(end))
    if (endMin <= startMin) endMin = startMin + settings.defaultDurationMinutes
    const repeat = buildRepeatValue(repeatMode, customRepeat)
    if (repeatMode === 'custom' && !repeat) {
      setError('Pick at least one day for a weekly repeat.')
      return
    }
    if (repeatMode === 'custom' && customRepeat.endMode === 'on' && !customRepeat.until) {
      setError('Pick an end date or choose Never.')
      return
    }
    const record = {
      ...(editing || {}),
      title: title.trim() || 'Untitled',
      day: dayKey,
      start: startMin,
      end: endMin,
      color,
      repeat: repeat || null,
      notes: notes.trim(),
      calendarId: editing?.calendarId || targetCalendarId,
    }
    try {
      if (isEdit) {
        await updateEvent(record)
        onSaved?.('Event updated')
      } else {
        await addEvent(record)
        onSaved?.('Event added')
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save event')
    }
  }

  const handleDelete = async () => {
    await deleteEvent(editing.id)
    onSaved?.('Event deleted')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? 'Edit event' : 'New event'}</h3>
        <p className="settings-hint">Saving to {targetCalendarName}</p>

        {!isEdit && colors.length > 0 && (
          <>
            <label>Quick add</label>
            <div className="preset-row">
              {colors.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-chip${color === preset.color && title === preset.label ? ' selected' : ''}`}
                  onClick={() => applyPreset(preset)}
                >
                  <span className="swatch" style={{ background: preset.color }} />
                  {preset.label}
                </button>
              ))}
            </div>
          </>
        )}

        <label>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          autoFocus
        />

        <label>Color</label>
        <div className="preset-row">
          {colors.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`preset-chip${color === c.color ? ' selected' : ''}`}
              onClick={() => setColor(c.color)}
              aria-label={c.label}
            >
              <span className="swatch" style={{ background: c.color }} />
            </button>
          ))}
        </div>

        <div className="time-fields">
          <div>
            <label>Start</label>
            <input
              type="time"
              step="900"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              onBlur={(e) => setStart(snapTime(e.target.value))}
            />
          </div>
          <div>
            <label>End</label>
            <input
              type="time"
              step="900"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              onBlur={(e) => setEnd(snapTime(e.target.value))}
            />
          </div>
        </div>

        <label>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What to remember for this block…"
          rows={3}
        />

        <label>Repeat</label>
        <select
          value={repeatMode}
          onChange={(e) => {
            setRepeatMode(e.target.value)
            setError('')
          }}
        >
          {REPEAT_OPTIONS.map((opt) => (
            <option key={opt.value || 'none'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {repeatMode === 'custom' && (
          <div className="repeat-custom">
            <div className="repeat-custom-row">
              <span className="repeat-custom-label">Every</span>
              <input
                type="number"
                min={1}
                max={99}
                value={customRepeat.interval}
                onChange={(e) =>
                  setCustomRepeat((prev) => ({
                    ...prev,
                    interval: Math.max(1, Math.min(99, Number(e.target.value) || 1)),
                  }))
                }
              />
              <select
                value={customRepeat.unit}
                onChange={(e) =>
                  setCustomRepeat((prev) => ({
                    ...prev,
                    unit: e.target.value,
                  }))
                }
              >
                <option value="day">day(s)</option>
                <option value="week">week(s)</option>
                <option value="month">month(s)</option>
              </select>
            </div>

            {customRepeat.unit === 'week' && (
              <>
                <span className="repeat-custom-label">On</span>
                <div className="repeat-weekdays">
                  {WEEKDAY_LABELS.map((label, day) => (
                    <button
                      key={day}
                      type="button"
                      className={`repeat-weekday${customRepeat.weekdays.includes(day) ? ' active' : ''}`}
                      onClick={() => toggleWeekday(day)}
                      aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]}
                      aria-pressed={customRepeat.weekdays.includes(day)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="repeat-custom-row">
              <span className="repeat-custom-label">Ends</span>
              <select
                value={customRepeat.endMode}
                onChange={(e) =>
                  setCustomRepeat((prev) => ({
                    ...prev,
                    endMode: e.target.value,
                    until: e.target.value === 'never' ? '' : prev.until,
                  }))
                }
              >
                <option value="never">Never</option>
                <option value="on">On date</option>
              </select>
              {customRepeat.endMode === 'on' && (
                <input
                  type="date"
                  value={customRepeat.until}
                  min={dayKey}
                  onChange={(e) =>
                    setCustomRepeat((prev) => ({
                      ...prev,
                      until: e.target.value,
                    }))
                  }
                />
              )}
            </div>
          </div>
        )}

        {error && <p className="modal-field-error">{error}</p>}

        <div className="modal-actions">
          {isEdit && (
            <button className="btn btn-danger" onClick={handleDelete}>
              Delete
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
