// Shared dialog focus facility — extracted verbatim from the single-file
// legacy application script (concepts/app/legacy-app.js, the "focus: trap
// inside an open overlay, restore it on close" block). Every overlay in the
// app (print settings, appearance, customize, keyboard shortcuts, AI
// assistant drawer, record pager guard, customer nested drawers, etc.)
// calls trapFocus()/releaseFocus() from this one shared instance, exactly
// as before extraction — the algorithm is unchanged, only `document` moved
// from an ambient global read to the constructor parameter.
//
// createDialogFocus(document) returns {trapFocus, releaseFocus, dispose}.

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'

/**
 * @param {Document} document
 */
export function createDialogFocus(document) {
  let focusReturn = null,
    trapped = null

  const trapFocus = box => {
    if (!box) return
    focusReturn = document.activeElement
    trapped = box
    const first = box.querySelector(FOCUSABLE)
    ;(first || box).focus?.()
  }
  const releaseFocus = () => {
    trapped = null
    if (focusReturn && document.contains(focusReturn)) focusReturn.focus()
    focusReturn = null
  }

  const controller = new AbortController()
  document.addEventListener(
    'keydown',
    e => {
      if (e.key !== 'Tab' || !trapped) return
      const items = [...trapped.querySelectorAll(FOCUSABLE)].filter(
        el => el.offsetParent !== null
      )
      if (!items.length) return
      const first = items[0],
        last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    {capture: true, signal: controller.signal}
  )

  function dispose() {
    controller.abort()
    trapped = null
    focusReturn = null
  }

  return {trapFocus, releaseFocus, dispose}
}
