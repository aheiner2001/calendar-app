import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import AddEventModal from '../components/AddEventModal.jsx'
import EventDetailModal from '../components/EventDetailModal.jsx'
import WeekCalendar from '../components/WeekCalendar.jsx'
import { PlusIcon, RepeatIcon } from '../components/icons.jsx'
import { layoutEvents } from '../lib/layout.js'
import { colorFill } from '../lib/settings.js'
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  ROW_H,
  SNAP_MINUTES,
  dateKey,
  snapMinutes,
  snapToHourSlot,
  dowLabel,
  formatRange,
  gridHours,
  minutesToLabel,
  weekDays,
} from '../lib/time.js'

const MIN_DURATION = 15
const LONG_PRESS_MS = 320
const MOVE_CANCEL_PX = 8

export default function Calendar() {
  const { events, selectedDate, setSelectedDate, settings, updateEvent, showToast, calendarView, setCalendarView } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [newSlot, setNewSlot] = useState(null) // { start, end } when adding from grid tap
  const [resizeId, setResizeId] = useState(null)
  const [moveId, setMoveId] = useState(null)
  const [draft, setDraft] = useState(null) // {id, start, end} live values while dragging

  const layerRef = useRef(null)
  const gridRef = useRef(null)
  const [rowH, setRowH] = useState(ROW_H)

  const week = useMemo(() => weekDays(selectedDate), [selectedDate])
  const selectedKey = dateKey(selectedDate)
  const hours = gridHours()
  const snap = settings.snapMinutes || SNAP_MINUTES

  useLayoutEffect(() => {
    const row = gridRef.current?.querySelector('.time-row')
    if (row) setRowH(row.getBoundingClientRect().height)
  }, [])

  const dayEvents = useMemo(
    () => layoutEvents(events.filter((e) => e.day === selectedKey)),
    [events, selectedKey],
  )

  const clampMinutes = (m) =>
    Math.max(GRID_START_HOUR * 60, Math.min(GRID_END_HOUR * 60, m))

  const yToMinutes = (clientY, step = snap) => {
    const rect = layerRef.current.getBoundingClientRect()
    const offsetY = clientY - rect.top
    const raw = GRID_START_HOUR * 60 + (offsetY / rowH) * 60
    return clampMinutes(snapMinutes(raw, step))
  }

  const minutesToTop = (minutes) => ((minutes - GRID_START_HOUR * 60) / 60) * rowH
  const minutesToHeight = (start, end) => Math.max(((end - start) / 60) * rowH, 22)

  const shiftEvent = (origStart, origEnd, deltaY) => {
    const duration = origEnd - origStart
    const deltaMin = snapMinutes((deltaY / rowH) * 60, snap)
    const minStart = GRID_START_HOUR * 60
    const maxEnd = GRID_END_HOUR * 60

    let start = origStart + deltaMin
    let end = start + duration
    if (start < minStart) {
      start = minStart
      end = start + duration
    }
    if (end > maxEnd) {
      end = maxEnd
      start = end - duration
    }
    start = snapMinutes(start, snap)
    end = snapMinutes(end, snap)
    if (end <= start) end = start + MIN_DURATION
    return { start, end }
  }

  const yToHourSlot = (clientY) => {
    const rect = layerRef.current.getBoundingClientRect()
    const offsetY = clientY - rect.top
    const raw = GRID_START_HOUR * 60 + (offsetY / rowH) * 60
    return snapToHourSlot(raw)
  }

  const openNew = (slot) => {
    setResizeId(null)
    setMoveId(null)
    setViewing(null)
    setEditing(null)
    setNewSlot(slot ?? null)
    setModalOpen(true)
  }

  const openDetail = (ev) => {
    setResizeId(null)
    setMoveId(null)
    setViewing(ev)
    setEditing(null)
    setNewSlot(null)
    setModalOpen(false)
  }

  const openEdit = (ev) => {
    setResizeId(null)
    setMoveId(null)
    setViewing(null)
    setEditing(ev)
    setNewSlot(null)
    setModalOpen(true)
  }

  const handleGridClick = (e) => {
    if (resizeId) {
      setResizeId(null)
      return
    }
    openNew(yToHourSlot(e.clientY))
  }

  // Short tap -> detail view. Hold without moving -> resize handles on release.
  // Hold and drag (finger still down) -> move the whole block.
  const onEventPointerDown = (e, ev) => {
    e.stopPropagation()
    if (resizeId === ev.id) return

    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)

    const session = {
      ev,
      el,
      pointerId: e.pointerId,
      startY: e.clientY,
      origStart: ev.start,
      origEnd: ev.end,
      longPressed: false,
      moved: false,
      cancelled: false,
    }

    const cleanup = () => {
      clearTimeout(session.timer)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      try {
        el.releasePointerCapture(session.pointerId)
      } catch {
        /* already released */
      }
    }

    const onMove = (me) => {
      if (me.pointerId !== session.pointerId) return

      if (!session.longPressed) {
        if (Math.abs(me.clientY - session.startY) > MOVE_CANCEL_PX) {
          clearTimeout(session.timer)
          session.cancelled = true
        }
        return
      }

      session.moved = true
      const next = shiftEvent(session.origStart, session.origEnd, me.clientY - session.startY)
      setDraft({ id: ev.id, ...next })
    }

    const onUp = (me) => {
      if (me.pointerId !== session.pointerId) return
      cleanup()

      if (!session.longPressed) {
        if (!session.cancelled) openDetail(ev)
        return
      }

      if (session.moved) {
        const next = shiftEvent(session.origStart, session.origEnd, me.clientY - session.startY)
        updateEvent({ ...ev, ...next })
        setDraft(null)
        setMoveId(null)
        showToast(formatRange(next.start, next.end))
        return
      }

      setMoveId(null)
      setDraft(null)
      setResizeId(ev.id)
      showToast('Drag the handles to resize')
    }

    session.timer = setTimeout(() => {
      session.longPressed = true
      setMoveId(ev.id)
      setDraft({ id: ev.id, start: ev.start, end: ev.end })
      showToast('Drag to move')
    }, LONG_PRESS_MS)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  const startHandleDrag = (e, ev, which) => {
    e.stopPropagation()
    e.preventDefault()
    let cur = { start: ev.start, end: ev.end }
    setDraft({ id: ev.id, ...cur })

    const move = (me) => {
      const m = yToMinutes(me.clientY, snap)
      if (which === 'top') {
        cur = { start: Math.min(m, cur.end - MIN_DURATION), end: cur.end }
      } else {
        cur = { start: cur.start, end: Math.max(m, cur.start + MIN_DURATION) }
      }
      setDraft({ id: ev.id, ...cur })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const snapped = {
        start: snapMinutes(cur.start, snap),
        end: snapMinutes(cur.end, snap),
      }
      if (snapped.end <= snapped.start) snapped.end = snapped.start + MIN_DURATION
      updateEvent({ ...ev, ...snapped })
      setDraft(null)
      showToast(formatRange(snapped.start, snapped.end))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="page">
      {calendarView === 'day' && (
        <div className="week-strip">
          {week.map((d) => {
            const active = dateKey(d) === selectedKey
            return (
              <button
                key={dateKey(d)}
                className={`day-col${active ? ' active' : ''}`}
                onClick={() => setSelectedDate(new Date(d))}
              >
                <div className="dow">{dowLabel(d)}</div>
                <div className="dom">{d.getDate()}</div>
              </button>
            )
          })}
        </div>
      )}

      {calendarView === 'week' ? (
        <WeekCalendar
          events={events}
          week={week}
          selectedDate={selectedDate}
          onSelectDay={(day) => {
            setSelectedDate(new Date(day))
            setCalendarView('day')
          }}
          onEventClick={openDetail}
        />
      ) : (
      <div className="grid-wrap" ref={gridRef}>
        {hours.map((h) => (
          <div className="time-row" key={h}>
            <div className="time-label">{minutesToLabel(h * 60).replace(':00', '')}</div>
            <div className="time-content" />
          </div>
        ))}

        <div className="grid-click-layer" onClick={handleGridClick} />

        <div className="events-layer" ref={layerRef}>
          {dayEvents.map((ev) => {
            const live = draft && draft.id === ev.id ? draft : ev
            const top = minutesToTop(live.start)
            const height = minutesToHeight(live.start, live.end)
            const width = 100 / ev.cols
            const isResizing = resizeId === ev.id
            const isMoving = moveId === ev.id
            return (
              <div
                key={ev.id}
                className={`event${isResizing ? ' resizing' : ''}${isMoving ? ' dragging' : ''}`}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `${ev.col * width}%`,
                  width: `calc(${width}% - 6px)`,
                  background: colorFill(ev.color),
                  borderColor: ev.color,
                }}
                onPointerDown={(e) => onEventPointerDown(e, ev)}
              >
                {isResizing && (
                  <div
                    className="resize-handle top"
                    onPointerDown={(e) => startHandleDrag(e, ev, 'top')}
                  />
                )}
                <div className="title">
                  {ev.title}
                  {ev.repeat && <RepeatIcon className="repeat-icon" />}
                </div>
                {(height > 30 || isResizing || isMoving) && (
                  <div className="time">{formatRange(live.start, live.end)}</div>
                )}
                {isResizing && (
                  <div
                    className="resize-handle bottom"
                    onPointerDown={(e) => startHandleDrag(e, ev, 'bottom')}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
      )}

      <button className="fab" onClick={() => openNew()} aria-label="Add event">
        <PlusIcon />
      </button>

      {viewing && (
        <EventDetailModal
          event={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => openEdit(viewing)}
        />
      )}

      {modalOpen && (
        <AddEventModal
          dayKey={selectedKey}
          editing={editing}
          initialStart={newSlot?.start}
          initialEnd={newSlot?.end}
          onClose={() => setModalOpen(false)}
          onSaved={(msg) => showToast(msg)}
        />
      )}
    </div>
  )
}
