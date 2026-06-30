import { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import AddEventModal from '../components/AddEventModal.jsx'
import EventDetailModal from '../components/EventDetailModal.jsx'
import EventCalendarTag from '../components/EventCalendarTag.jsx'
import WeekCalendar from '../components/WeekCalendar.jsx'
import { PlusIcon, RepeatIcon } from '../components/icons.jsx'
import { layoutEvents } from '../lib/layout.js'
import { eventsForDay } from '../lib/repeat.js'
import { colorFill } from '../lib/settings.js'
import { lockScrollWhileDragging } from '../lib/touchScrollLock.js'
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
const CREATE_MIN_DURATION = 30
const LONG_PRESS_MS = 380
const LONG_PRESS_TOUCH_MS = 480

export default function Calendar() {
  const { events, selectedDate, setSelectedDate, settings, updateEvent, deleteEvent, clearDay, showToast, calendarView, setCalendarView, calendars, activeCalendarId, personalCalendarId } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [newSlot, setNewSlot] = useState(null) // { start, end } when adding from grid tap
  const [createDraft, setCreateDraft] = useState(null) // { start, end } while drag-to-create
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
    if (calendarView !== 'day') return
    const measure = () => {
      const row = gridRef.current?.querySelector('.time-row')
      if (row) {
        const h = row.getBoundingClientRect().height
        if (h > 0) setRowH(h)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [calendarView])

  useEffect(() => {
    if (moveId || resizeId || createDraft) {
      document.body.classList.add('calendar-dragging')
    } else {
      document.body.classList.remove('calendar-dragging')
    }
    return () => document.body.classList.remove('calendar-dragging')
  }, [moveId, resizeId, createDraft])

  const dayEvents = useMemo(
    () => layoutEvents(eventsForDay(events, selectedDate)),
    [events, selectedDate],
  )

  const dayEventCount = dayEvents.length
  const hasRepeatingOnDay = useMemo(
    () => eventsForDay(events, selectedDate).some((e) => e.repeat),
    [events, selectedDate],
  )

  const handleClearDay = async () => {
    if (dayEventCount === 0) return
    let msg = `Remove all ${dayEventCount} event${dayEventCount > 1 ? 's' : ''} on this day?`
    if (hasRepeatingOnDay) msg += ' Repeating events will be removed entirely.'
    if (!window.confirm(msg)) return
    try {
      const n = await clearDay(selectedKey)
      showToast(n ? `Cleared ${n} event${n > 1 ? 's' : ''}` : 'Day is already empty')
    } catch (err) {
      showToast(err.message || 'Could not clear day')
    }
  }

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

  const yToMinutesRaw = (clientY) => {
    if (!layerRef.current || rowH <= 0) return GRID_START_HOUR * 60
    const rect = layerRef.current.getBoundingClientRect()
    const offsetY = clientY - rect.top
    const raw = GRID_START_HOUR * 60 + (offsetY / rowH) * 60
    return clampMinutes(raw)
  }

  const placeEvent = (origStart, origEnd, clientY, grabOffset) => {
    const duration = origEnd - origStart
    const minStart = GRID_START_HOUR * 60
    const maxEnd = GRID_END_HOUR * 60

    let start = snapMinutes(yToMinutesRaw(clientY) - grabOffset, snap)
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
    setCreateDraft(null)
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

  const defaultCreateDuration = Math.max(
    CREATE_MIN_DURATION,
    settings.defaultDurationMinutes || 60,
  )

  const buildCreateRange = (anchorStart, clientY, moved) => {
    const maxEnd = GRID_END_HOUR * 60
    if (!moved) {
      return { start: anchorStart, end: Math.min(anchorStart + defaultCreateDuration, maxEnd) }
    }
    let end = snapMinutes(yToMinutesRaw(clientY), snap)
    if (end <= anchorStart) end = anchorStart + CREATE_MIN_DURATION
    if (end - anchorStart < CREATE_MIN_DURATION) end = anchorStart + CREATE_MIN_DURATION
    return { start: anchorStart, end: Math.min(end, maxEnd) }
  }

  const onGridPointerDown = (e) => {
    if (e.button !== 0 || resizeId || moveId || createDraft) return

    const gridEl = gridRef.current
    const startY = e.clientY
    const anchorStart = snapMinutes(yToMinutesRaw(startY), snap)
    const pressMs = e.pointerType === 'touch' ? LONG_PRESS_TOUCH_MS : LONG_PRESS_MS

    const session = {
      pointerId: e.pointerId,
      anchorStart,
      longPressed: false,
      moved: false,
      cancelled: false,
      createActive: false,
      unlockScroll: null,
    }

    const cleanupCreateListeners = () => {
      window.removeEventListener('pointermove', onCreateMove)
      window.removeEventListener('pointerup', onCreateUp)
      window.removeEventListener('pointercancel', onCreateCancel)
      session.unlockScroll?.()
      session.unlockScroll = null
      gridEl?.classList.remove('calendar-dragging')
    }

    const cleanupWaitListeners = () => {
      clearTimeout(session.timer)
      window.removeEventListener('pointermove', onWaitMove)
      window.removeEventListener('pointerup', onWaitUp)
      window.removeEventListener('pointercancel', onWaitCancel)
    }

    const onWaitMove = (me) => {
      if (me.pointerId !== session.pointerId) return
      const dy = Math.abs(me.clientY - startY)
      const dx = Math.abs(me.clientX - e.clientX)
      if (dy > 18 && dy > dx) {
        session.cancelled = true
        cleanupWaitListeners()
      }
    }

    const onCreateMove = (me) => {
      if (me.pointerId !== session.pointerId) return
      me.preventDefault()
      session.moved = true
      setCreateDraft(buildCreateRange(session.anchorStart, me.clientY, true))
    }

    const onCreateUp = (me) => {
      if (me.pointerId !== session.pointerId) return
      cleanupCreateListeners()
      const range = buildCreateRange(session.anchorStart, me.clientY, session.moved)
      setCreateDraft(null)
      openNew(range)
    }

    const onCreateCancel = (me) => {
      if (me.pointerId !== session.pointerId) return
      cleanupCreateListeners()
      setCreateDraft(null)
    }

    const onWaitUp = (me) => {
      if (me.pointerId !== session.pointerId) return
      cleanupWaitListeners()
      if (!session.longPressed && !session.cancelled) {
        openNew(yToHourSlot(startY))
      }
    }

    const onWaitCancel = (me) => {
      if (me.pointerId !== session.pointerId) return
      session.cancelled = true
      cleanupWaitListeners()
    }

    const activateCreate = () => {
      cleanupWaitListeners()
      session.longPressed = true
      session.createActive = true
      gridEl?.classList.add('calendar-dragging')
      session.unlockScroll = lockScrollWhileDragging(gridEl)
      setCreateDraft(buildCreateRange(session.anchorStart, startY, false))
      if (navigator.vibrate) navigator.vibrate(12)
      showToast('Drag to set length')

      window.addEventListener('pointermove', onCreateMove, { passive: false })
      window.addEventListener('pointerup', onCreateUp)
      window.addEventListener('pointercancel', onCreateCancel)
    }

    session.timer = setTimeout(activateCreate, pressMs)
    window.addEventListener('pointermove', onWaitMove, { passive: true })
    window.addEventListener('pointerup', onWaitUp)
    window.addEventListener('pointercancel', onWaitCancel)
  }

  // Short tap -> detail. Hold -> drag or resize handles on release.
  const onEventPointerDown = (e, ev) => {
    if (resizeId === ev.id || e.button !== 0) return

    const el = e.currentTarget
    const gridEl = gridRef.current
    const grabOffset = yToMinutesRaw(e.clientY) - ev.start
    const pressMs = e.pointerType === 'touch' ? LONG_PRESS_TOUCH_MS : LONG_PRESS_MS

    const session = {
      ev,
      el,
      pointerId: e.pointerId,
      grabOffset,
      origStart: ev.start,
      origEnd: ev.end,
      longPressed: false,
      moved: false,
      cancelled: false,
      dragActive: false,
      unlockScroll: null,
    }

    const clearDragVisuals = () => {
      el.classList.remove('hold-active')
      gridEl?.classList.remove('calendar-dragging')
      document.body.classList.remove('calendar-dragging')
      session.unlockScroll?.()
      session.unlockScroll = null
    }

    const cleanupDragListeners = () => {
      window.removeEventListener('pointermove', onDragMove)
      window.removeEventListener('pointerup', onDragUp)
      window.removeEventListener('pointercancel', onDragCancel)
      if (session.dragActive) {
        try {
          el.releasePointerCapture(session.pointerId)
        } catch {
          /* already released */
        }
        session.dragActive = false
      }
      clearDragVisuals()
    }

    const cleanupWaitListeners = () => {
      clearTimeout(session.timer)
      window.removeEventListener('pointermove', onWaitMove)
      window.removeEventListener('pointerup', onWaitUp)
      window.removeEventListener('pointercancel', onWaitCancel)
    }

    const onWaitMove = (me) => {
      if (me.pointerId !== session.pointerId) return
      const dy = Math.abs(me.clientY - e.clientY)
      const dx = Math.abs(me.clientX - e.clientX)
      // Finger moved enough to count as scrolling — don't tap or drag.
      if (dy > 18 && dy > dx) {
        session.cancelled = true
        cleanupWaitListeners()
      }
    }

    const onDragMove = (me) => {
      if (me.pointerId !== session.pointerId) return
      me.preventDefault()
      session.moved = true
      const next = placeEvent(session.origStart, session.origEnd, me.clientY, session.grabOffset)
      setDraft({ id: ev.id, ...next })
    }

    const onDragUp = (me) => {
      if (me.pointerId !== session.pointerId) return
      cleanupDragListeners()

      if (session.moved) {
        const next = placeEvent(session.origStart, session.origEnd, me.clientY, session.grabOffset)
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

    const onDragCancel = (me) => {
      if (me.pointerId !== session.pointerId) return
      cleanupDragListeners()
      setDraft(null)
      setMoveId(null)
    }

    const onWaitUp = (me) => {
      if (me.pointerId !== session.pointerId) return
      cleanupWaitListeners()
      if (!session.longPressed && !session.cancelled) openDetail(ev)
    }

    const onWaitCancel = (me) => {
      if (me.pointerId !== session.pointerId) return
      session.cancelled = true
      cleanupWaitListeners()
    }

    const activateDrag = () => {
      cleanupWaitListeners()
      session.longPressed = true
      session.dragActive = true
      el.classList.add('hold-active')
      gridEl?.classList.add('calendar-dragging')
      document.body.classList.add('calendar-dragging')
      session.unlockScroll = lockScrollWhileDragging(gridEl)
      try {
        el.setPointerCapture(session.pointerId)
      } catch {
        /* ignore */
      }
      setMoveId(ev.id)
      setDraft({ id: ev.id, start: ev.start, end: ev.end })
      if (navigator.vibrate) navigator.vibrate(12)
      showToast('Drag to move')

      window.addEventListener('pointermove', onDragMove, { passive: false })
      window.addEventListener('pointerup', onDragUp)
      window.addEventListener('pointercancel', onDragCancel)
    }

    session.timer = setTimeout(activateDrag, pressMs)
    window.addEventListener('pointermove', onWaitMove, { passive: true })
    window.addEventListener('pointerup', onWaitUp)
    window.addEventListener('pointercancel', onWaitCancel)
  }

  const startHandleDrag = (e, ev, which) => {
    e.stopPropagation()
    e.preventDefault()
    const handle = e.currentTarget
    const gridEl = gridRef.current
    let cur = { start: ev.start, end: ev.end }
    setDraft({ id: ev.id, ...cur })
    gridEl?.classList.add('calendar-dragging')
    document.body.classList.add('calendar-dragging')
    const unlockScroll = lockScrollWhileDragging(gridEl)
    try {
      handle.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }

    const move = (me) => {
      if (me.pointerId !== e.pointerId) return
      me.preventDefault()
      const m = yToMinutes(me.clientY, snap)
      if (which === 'top') {
        cur = { start: Math.min(m, cur.end - MIN_DURATION), end: cur.end }
      } else {
        cur = { start: cur.start, end: Math.max(m, cur.start + MIN_DURATION) }
      }
      setDraft({ id: ev.id, ...cur })
    }
    const endDrag = (me) => {
      if (me.pointerId !== e.pointerId) return
      gridEl?.classList.remove('calendar-dragging')
      document.body.classList.remove('calendar-dragging')
      unlockScroll()
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      try {
        handle.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      const snapped = {
        start: snapMinutes(cur.start, snap),
        end: snapMinutes(cur.end, snap),
      }
      if (snapped.end <= snapped.start) snapped.end = snapped.start + MIN_DURATION
      updateEvent({ ...ev, ...snapped })
      setDraft(null)
      showToast(formatRange(snapped.start, snapped.end))
    }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  }

  return (
    <div className="page">
      <div className="calendar-toolbar">
        <button
          type="button"
          className="btn btn-ghost clear-day-btn"
          onClick={handleClearDay}
          disabled={dayEventCount === 0}
        >
          Clear day{dayEventCount > 0 ? ` (${dayEventCount})` : ''}
        </button>
      </div>

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
          calendars={calendars}
          activeCalendarId={activeCalendarId}
          personalCalendarId={personalCalendarId}
          onSelectDay={(day) => {
            setSelectedDate(new Date(day))
            setCalendarView('day')
          }}
          onEventClick={openDetail}
        />
      ) : (
      <div className={`grid-wrap${moveId || resizeId || createDraft ? ' calendar-dragging' : ''}`} ref={gridRef}>
        <div className="grid-inner">
        {hours.map((h) => (
          <div className="time-row" key={h}>
            <div className="time-label">{minutesToLabel(h * 60).replace(':00', '')}</div>
            <div className="time-content" />
          </div>
        ))}

        <div className="grid-click-layer" onPointerDown={onGridPointerDown} />

        <div className="events-layer" ref={layerRef}>
          {createDraft && (
            <div
              className="event create-preview"
              style={{
                top: `${minutesToTop(createDraft.start)}px`,
                height: `${minutesToHeight(createDraft.start, createDraft.end)}px`,
                left: '0',
                width: 'calc(100% - 6px)',
              }}
            >
              <div className="title">New event</div>
              <div className="time">{formatRange(createDraft.start, createDraft.end)}</div>
            </div>
          )}
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
                <EventCalendarTag
                  event={ev}
                  calendars={calendars}
                  activeCalendarId={activeCalendarId}
                  personalCalendarId={personalCalendarId}
                />
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
      </div>
      )}

      <button className="fab" onClick={() => openNew()} aria-label="Add event">
        <PlusIcon />
      </button>

      {viewing && (
        <EventDetailModal
          event={viewing}
          calendars={calendars}
          activeCalendarId={activeCalendarId}
          personalCalendarId={personalCalendarId}
          onClose={() => setViewing(null)}
          onEdit={() => openEdit(viewing)}
        />
      )}

      {modalOpen && (
        <AddEventModal
          dayKey={editing?.day ?? selectedKey}
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
