// Assigns columns to overlapping events so they render side-by-side, like the
// reference mockup. Returns each event annotated with { col, cols } describing its
// column index and how many columns its overlap-cluster needs.
export function layoutEvents(events) {
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end)
  const result = []

  let cluster = []
  let clusterEnd = -1

  const flush = () => {
    if (!cluster.length) return
    const columns = [] // each entry = end time of last event in that column
    cluster.forEach((ev) => {
      let placed = false
      for (let c = 0; c < columns.length; c++) {
        if (ev.start >= columns[c]) {
          columns[c] = ev.end
          ev._col = c
          placed = true
          break
        }
      }
      if (!placed) {
        ev._col = columns.length
        columns.push(ev.end)
      }
    })
    const cols = columns.length
    cluster.forEach((ev) => result.push({ ...ev, col: ev._col, cols }))
    cluster = []
    clusterEnd = -1
  }

  sorted.forEach((ev) => {
    if (cluster.length && ev.start >= clusterEnd) flush()
    cluster.push(ev)
    clusterEnd = Math.max(clusterEnd, ev.end)
  })
  flush()

  return result
}
