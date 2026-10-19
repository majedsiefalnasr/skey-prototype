/** The shell owns exactly one vertical scrollport per content view:
 *  `.page-content` (see styles/tailwind/shell.css). Page-level containers
 *  — `.canvas`, the record canvases, `[data-collab-body]` — lay their
 *  content out and no longer scroll it, so any code that saves, restores or
 *  jumps a scroll position must ask which element actually scrolls instead
 *  of assuming the container it happens to be rendering into.
 *
 *  Walks up from `start` to the nearest element whose `overflow-y` is
 *  `auto`/`scroll` (a component viewport such as a data table wins if the
 *  walk starts inside one), and falls back to `document.scrollingElement`
 *  so a document that still scrolls at the root keeps working.
 *
 *  @param {Element | null} [start] element whose scroll context is wanted
 *  @returns {Element} the element that owns vertical scrolling
 */
export function resolveScroller(start) {
  let el = start || document.querySelector('.page-content')
  while (el) {
    const overflowY = getComputedStyle(el).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return el
    el = el.parentElement
  }
  return document.scrollingElement
}
