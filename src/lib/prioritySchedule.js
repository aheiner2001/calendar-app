import { dateKey, minutesToLabel, weekDays } from './time.js'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function blocksForDay(settings, date) {
  const dow = date.getDay()
  return (settings.prioritySchedule || []).filter((b) => b.days?.includes(dow))
}

export function formatPriorityScheduleForAi(settings) {
  const blocks = settings.prioritySchedule || []
  if (blocks.length === 0) return 'No priority baseline configured.'
  return blocks
    .map((b) => {
      const days = (b.days || []).map((d) => DAY_LABELS[d]).join(', ')
      return `- ${b.label}: ${days} ${minutesToLabel(b.start)}–${minutesToLabel(b.end)}`
    })
    .join('\n')
}

export function formatEventsForAi(events, fromDate, dayCount = 14) {
  const start = new Date(fromDate)
  const end = new Date(start)
  end.setDate(end.getDate() + dayCount)
  const startKey = dateKey(start)
  const endKey = dateKey(end)

  return events
    .filter((e) => e.day >= startKey && e.day <= endKey)
    .sort((a, b) => a.day.localeCompare(b.day) || a.start - b.start)
    .map((e) => ({
      id: e.id,
      title: e.title,
      day: e.day,
      start: e.start,
      end: e.end,
      color: e.color,
    }))
}

export function weekRange(date) {
  return weekDays(date)
}

export { DAY_LABELS }
