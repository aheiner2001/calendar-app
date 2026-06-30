/** Prevent the page/grid from scrolling while dragging on touch screens. */
export function lockScrollWhileDragging(container) {
  const scrollTop = container?.scrollTop ?? 0

  const prevent = (e) => {
    e.preventDefault()
    if (container) container.scrollTop = scrollTop
  }

  document.addEventListener('touchmove', prevent, { passive: false, capture: true })
  if (container) {
    container.addEventListener('touchmove', prevent, { passive: false })
  }

  return () => {
    document.removeEventListener('touchmove', prevent, { capture: true })
    if (container) container.removeEventListener('touchmove', prevent)
  }
}
