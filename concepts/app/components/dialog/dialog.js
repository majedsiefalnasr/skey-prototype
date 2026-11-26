// Shared dialog focus facility, first extracted from the single-file legacy
// application script (concepts/app/legacy-app.js). Every overlay in the app
// (print settings, appearance, customize, keyboard shortcuts, AI assistant
// drawer, record pager guard, customer nested drawers, etc.) calls
// trapFocus()/releaseFocus() from this one shared instance.
//
// Open overlays form a stack (#31), so a dialog opened from another dialog
// hands focus and the Tab trap back to its parent when it closes.
// releaseFocus() releases the topmost overlay its caller has already hidden;
// if every trapped overlay is still rendered, the call is a no-op. Focus
// returns to the element that opened the overlay, or to the last focused
// element when a menu dropped focus to <body> before the overlay opened.
// A menu item hands focus to the button of its outermost menu, because the
// menu closes around it. An element that was re-rendered is matched by id or
// aria-label; a hidden one falls back to the nearest visible opener: the
// details summary, the .menu button, or the [aria-controls] or
// [aria-haspopup] owner. Failing that, focus goes into the parent overlay.
// returnFocus() applies the same fallback for overlays that keep their own
// focus handling, such as the collaboration confirm.
//
// createDialogFocus(document) returns {trapFocus, releaseFocus, dispose}.

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'
const MENU = '[role="menu"], .mlist'

const rendered = element => Boolean(element?.isConnected && element.getClientRects().length)
const isMenuItem = element =>
  element.matches('[role^="menuitem"]') || Boolean(element.parentElement?.closest(MENU))

function openerOf(node, document) {
  if (node.matches('details')) return node.querySelector(':scope > summary')
  if (node.matches('.menu')) return node.querySelector(':scope > button')
  const owners = node.id
    ? [...document.querySelectorAll(`[aria-controls~="${CSS.escape(node.id)}"]`)].filter(rendered)
    : []
  if (owners.length === 1) return owners[0]
  if (node.matches(MENU)) return node.parentElement?.querySelector(':scope > [aria-haspopup]') ?? null
  return null
}

function menuButtonOf(item, document) {
  let button = null
  for (let node = item.parentElement; node && node !== document.body; node = node.parentElement) {
    if (node.matches('[role="dialog"], [role="alertdialog"]')) break
    if (!node.matches(`details, .menu, ${MENU}`)) continue
    const opener = openerOf(node, document)
    if (!opener || opener === item) continue
    button = opener
    if (!isMenuItem(opener)) break
  }
  return button
}

function replacementOf(element, document) {
  if (element.isConnected) return null
  if (element.id) return document.getElementById(element.id)
  const label = element.getAttribute('aria-label')
  if (!label) return null
  const matches = [...document.querySelectorAll(`${element.localName}[aria-label="${CSS.escape(label)}"]`)].filter(rendered)
  return matches.length === 1 ? matches[0] : null
}

function returnCandidates(element, document) {
  if (!element || element === document.body) return []
  const candidates = isMenuItem(element)
    ? [menuButtonOf(element, document), element]
    : [element, replacementOf(element, document)]
  for (let node = element?.parentElement; node && node !== document.body; node = node.parentElement) {
    candidates.push(openerOf(node, document))
  }
  return candidates.filter(Boolean)
}

/**
 * Focus `element`, or its nearest stand-in when it is hidden or gone.
 * @param {Element | null} element
 * @param {Document} document
 * @param {Element | null} [within] only accept a target inside this element
 * @returns {boolean} whether a target took focus
 */
export function returnFocus(element, document, within = null) {
  for (const candidate of returnCandidates(element, document)) {
    if (!rendered(candidate) || (within && !within.contains(candidate))) continue
    candidate.focus()
    if (document.activeElement === candidate) return true
  }
  return false
}

/**
 * @param {Document} document
 */
export function createDialogFocus(document) {
  const stack = []
  let trapped = null,
    lastFocused = null

  const trapFocus = box => {
    if (!box) return
    const existing = stack.findIndex(entry => entry.box === box)
    const active = document.activeElement === document.body ? lastFocused : document.activeElement
    const returnTo = existing === -1 ? active : stack.splice(existing, 1)[0].returnTo
    stack.push({box, returnTo})
    trapped = box
    const first = box.querySelector(FOCUSABLE)
    ;(first || box).focus?.()
  }
  const releaseFocus = () => {
    const index = stack.findLastIndex(entry => !rendered(entry.box))
    if (index === -1) return
    const [{returnTo}] = stack.splice(index, 1)
    if (stack.slice(index).some(entry => rendered(entry.box))) return
    trapped = stack.findLast(entry => rendered(entry.box))?.box ?? null
    if (!returnFocus(returnTo, document, trapped) && trapped) (trapped.querySelector(FOCUSABLE) || trapped).focus?.()
  }

  const controller = new AbortController()
  document.addEventListener(
    'focusin',
    e => {
      lastFocused = e.target
    },
    {signal: controller.signal}
  )
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
    stack.length = 0
  }

  return {trapFocus, releaseFocus, dispose}
}
