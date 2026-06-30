// Sample events used the first time the app runs (no stored data yet).
// They are placed on `dayKey` so the calendar looks alive out of the box.
const PINK = '#c2447a'
const PURPLE = '#8b6fc9'
const YELLOW = '#d9a73d'

export function seedEvents(dayKey) {
  const make = (title, start, end, color, repeat = false) => ({
    id: `seed-${title}-${start}`.replace(/\s+/g, '-').toLowerCase(),
    title,
    day: dayKey,
    start,
    end,
    color,
    repeat,
  })

  return [
    make('Sunday School', 11 * 60 + 40, 12 * 60 + 30, PINK, true),
    make('Sacrament Meeting', 13 * 60, 14 * 60, PINK, true),
    make('Almuerzo', 13 * 60 + 15, 14 * 60, PURPLE, true),
    make('T-Charts', 13 * 60, 14 * 60, PURPLE, true),
    make('Estudio de Idioma', 14 * 60, 15 * 60, PURPLE, true),
    make('Companionship Study', 15 * 60, 16 * 60, PURPLE, true),
    make('David', 16 * 60, 16 * 60 + 30, YELLOW),
    make('Jesus', 17 * 60, 17 * 60 + 30, YELLOW),
    make('Karina, Refugio', 18 * 60, 18 * 60 + 30, YELLOW),
    make('Uncle', 18 * 60 + 30, 19 * 60, YELLOW),
    make('Carlos', 19 * 60 + 30, 20 * 60, YELLOW),
    make('Diana, Luis Fernando, Emily, Silvia', 20 * 60, 21 * 60, YELLOW),
  ]
}
