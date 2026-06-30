import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { REPEAT_OPTIONS, normalizeRepeat } from '../lib/repeat.js'
import { minutesToTimeString, snapMinutes, timeStringToMinutes } from '../lib/time.js'

export default function AddEventModal({ dayKey, editing, initialStart, initialEnd, onClose, onSaved }) {
  const { settings, addEvent, updateEvent, deleteEvent } = useApp()
  const isEdit = Boolean(editing)
  const colors = settings.savedColors
  const fallbackColor = colors[0]?.color ?? '#2ec4b6'

  const defaultStart = editing?.start ?? initialStart ?? 9 * 60
  const defaultEnd = editing?.end ?? initialEnd ?? defaultStart + settings.defaultDurationMinutes

  const [title, setTitle] = useState(editing?.title ?? '')
  const [color, setColor] = useState(editing?.color ?? fallbackColor)
  const [start, setStart] = useState(minutesToTimeString(snapMinutes(defaultStart)))
  const [end, setEnd] = useState(minutesToTimeString(snapMinutes(defaultEnd)))
  const [repeat, setRepeat] = useState(() => normalizeRepeat(editing?.repeat) || '')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [error, setError] = useState('')

  const snapTime = (value) => minutesToTimeString(snapMinutes(timeStringToMinutes(value)))

  const applyPreset = (preset) => {
    setTitle(preset.label)
    setColor(preset.color)
  }

  const handleSave = async () => {
    setError('')
    const startMin = snapMinutes(timeStringToMinutes(start))
    let endMin = snapMinutes(timeStringToMinutes(end))
    if (endMin <= startMin) endMin = startMin + settings.defaultDurationMinutes
    const record = {
      ...(editing || {}),
      title: title.trim() || 'Untitled',
      day: dayKey,
      start: startMin,
      end: endMin,
      color,
      repeat: repeat || null,
      notes: notes.trim(),
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
        <select value={repeat} onChange={(e) => setRepeat(e.target.value)}>
          {REPEAT_OPTIONS.map((opt) => (
            <option key={opt.value || 'none'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {error && <p className="ai-assistant-error">{error}</p>}

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
