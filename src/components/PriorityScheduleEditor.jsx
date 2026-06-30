import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { DAY_LABELS } from '../lib/prioritySchedule.js'
import { minutesToTimeString, timeStringToMinutes } from '../lib/time.js'

export default function PriorityScheduleEditor() {
  const {
    settings,
    addPriorityBlock,
    updatePriorityBlock,
    deletePriorityBlock,
    applyPriorityToWeek,
    selectedDate,
    showToast,
  } = useApp()
  const [busy, setBusy] = useState(false)
  const blocks = settings.prioritySchedule || []

  const toggleDay = (block, dayIndex) => {
    const days = block.days.includes(dayIndex)
      ? block.days.filter((d) => d !== dayIndex)
      : [...block.days, dayIndex].sort()
    updatePriorityBlock(block.id, { days })
  }

  const handleApplyWeek = async () => {
    setBusy(true)
    try {
      const n = await applyPriorityToWeek(selectedDate)
      showToast(n ? `Added ${n} baseline event${n > 1 ? 's' : ''}` : 'Baseline already on calendar')
    } catch {
      showToast('Could not apply baseline')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h4 className="settings-section-title">Priority schedule</h4>
      <p className="settings-hint">
        Fixed weekly blocks (work, exercise, church). AI schedules around these. Apply to stamp this week on
        your calendar.
      </p>

      {blocks.map((block) => (
        <div key={block.id} className="priority-block">
          <div className="priority-block-header">
            <input
              type="color"
              value={block.color}
              onChange={(e) => updatePriorityBlock(block.id, { color: e.target.value })}
              aria-label={`${block.label} color`}
            />
            <input
              type="text"
              value={block.label}
              onChange={(e) => updatePriorityBlock(block.id, { label: e.target.value })}
              placeholder="Label"
              className="priority-label-input"
            />
            <button type="button" className="del" onClick={() => deletePriorityBlock(block.id)} aria-label="Remove block">
              ×
            </button>
          </div>
          <div className="priority-days">
            {DAY_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                className={`priority-day-btn${block.days.includes(i) ? ' on' : ''}`}
                onClick={() => toggleDay(block, i)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="priority-times">
            <label>
              Start
              <input
                type="time"
                value={minutesToTimeString(block.start)}
                onChange={(e) => updatePriorityBlock(block.id, { start: timeStringToMinutes(e.target.value) })}
              />
            </label>
            <label>
              End
              <input
                type="time"
                value={minutesToTimeString(block.end)}
                onChange={(e) => updatePriorityBlock(block.id, { end: timeStringToMinutes(e.target.value) })}
              />
            </label>
          </div>
        </div>
      ))}

      <button type="button" className="add-color-btn" onClick={addPriorityBlock}>
        + Add baseline block
      </button>
      <button type="button" className="btn btn-ghost priority-apply-btn" onClick={handleApplyWeek} disabled={busy || blocks.length === 0}>
        {busy ? 'Applying…' : 'Apply baseline to this week'}
      </button>
    </>
  )
}
