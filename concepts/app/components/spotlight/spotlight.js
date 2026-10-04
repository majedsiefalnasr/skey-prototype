// Reusable Spotlight engine — a vanilla-DOM mirror of Atlassian's
// `@atlaskit/spotlight` for this static prototype (which has no React, so
// the real package cannot be installed here). Mirrors the Atlassian
// anatomy 1:1: Headline / Body / StepCount / Dismiss (X, always first
// focusable) / Primary (Next/Done) + Secondary (Back) actions, static
// placements, no blanket, no scroll-lock, no focus trap — the page stays
// interactive by design.
//
// Kill switch: `setEnabled(false)` disables ALL tour behavior (start,
// trigger, auto-start) and immediately dismisses a running tour. The
// Prototype Controls "Tour" toggle owns this flag; it is prototype
// configuration, never a product setting.
//
// Nothing ever auto-starts: a tour only runs after an explicit start()
// (Help → Take a tour, ?tour=1, or the Prototype Controls Start button).

export const SPOTLIGHT_CARD_ID = 'spotlight-card'
export const SPOTLIGHT_STYLE_ID = 'spotlight-style'
const TARGET_RING_ATTR = 'data-spotlight-target'
const GAP_PX = 8
const VIEWPORT_MARGIN_PX = 12

/* Pulsing target ring: a theme-aware accent outline plus an expanding
   box-shadow pulse. Injected once as a <style> so no build-pipeline
   change is needed; static animation (never follows scroll), silenced
   under prefers-reduced-motion like every other prototype motion. */
const RING_CSS =
  `[${TARGET_RING_ATTR}]{outline:2px solid var(--accent,#1d4ed8)!important;outline-offset:3px;border-radius:6px;` +
  `box-shadow:0 0 0 0 color-mix(in srgb,var(--accent,#1d4ed8) 45%,transparent);animation:spotlight-pulse 1.8s ease-out infinite}` +
  `@keyframes spotlight-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent,#1d4ed8) 45%,transparent)}` +
  `70%{box-shadow:0 0 0 12px transparent}100%{box-shadow:0 0 0 0 transparent}}` +
  `@media (prefers-reduced-motion:reduce){[${TARGET_RING_ATTR}]{animation:none;box-shadow:none}}`

/**
 * Pure helper: mirror a static placement for RTL. `left-*` becomes
 * `right-*` and vice versa; top/bottom are direction-neutral.
 * Exported for unit tests.
 * @param {string} placement
 * @returns {string}
 */
export function flipPlacementForRtl(placement) {
  if (typeof placement !== 'string') return 'bottom'
  if (placement.startsWith('left')) return placement.replace(/^left/, 'right')
  if (placement.startsWith('right')) return placement.replace(/^right/, 'left')
  return placement
}

function viewportOf(doc) {
  const docEl = doc.documentElement || {}
  const w =
    typeof window !== 'undefined' && window.innerWidth
      ? window.innerWidth
      : docEl.clientWidth || 1024
  const h =
    typeof window !== 'undefined' && window.innerHeight
      ? window.innerHeight
      : docEl.clientHeight || 768
  return {w, h}
}

function isVisible(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return false
  if (el.hidden || el.getAttribute?.('aria-hidden') === 'true') return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

/**
 * @param {object} params
 * @param {Document} params.document - injectable for tests; defaults to global document.
 * @param {(key: string) => string} params.t - locale lookup; defaults to identity.
 * @param {() => string} params.getDirection - returns 'rtl'|'ltr'; defaults to document.dir.
 */
export function createSpotlight({document: doc = document, t = key => key, getDirection} = {}) {
  const dir = () => {
    if (typeof getDirection === 'function') return getDirection()
    return doc.documentElement?.dir === 'rtl' ? 'rtl' : 'ltr'
  }

  let enabled = true
  /** @type {Array<object>} */
  let steps = []
  let index = -1
  let card = null
  let targetEl = null
  let invokerEl = null
  let onKeyDown = null
  let onPointerDown = null
  let onReposition = null
  let arrowEl = null
  let primaryBtn = null
  let secondaryBtn = null
  let dismissBtn = null
  let countEl = null
  let headlineEl = null
  let bodyEl = null

  ensureRingStyle()

  const isActive = () => card !== null && index >= 0
  const isEnabled = () => enabled

  function ensureRingStyle() {
    if (typeof doc.createElement !== 'function') return
    if (typeof doc.getElementById === 'function' && doc.getElementById(SPOTLIGHT_STYLE_ID)) return
    const host = doc.head || doc.body
    if (!host || typeof host.appendChild !== 'function') return
    const style = doc.createElement('style')
    style.id = SPOTLIGHT_STYLE_ID
    style.textContent = RING_CSS
    host.appendChild(style)
  }

  function queryTarget(step) {
    if (!step || typeof doc.querySelectorAll !== 'function') return null
    // A step may name several selectors (first visible wins): the record
    // action cluster shows Modify while reading and Save while writing,
    // so the tour stays complete in both modes.
    const selectors = Array.isArray(step.targets) ? step.targets : [step.target]
    for (const selector of selectors) {
      if (!selector) continue
      const hit = [...doc.querySelectorAll(selector)].find(isVisible)
      if (hit) return hit
    }
    return null
  }

  /** First visible step at or after `from` (forward) — skips hidden targets. */
  function forwardVisible(from) {
    for (let i = from; i < steps.length; i++) {
      if (queryTarget(steps[i])) return i
    }
    return -1
  }

  function backwardVisible(from) {
    for (let i = from; i >= 0; i--) {
      if (queryTarget(steps[i])) return i
    }
    return -1
  }

  function buildCard() {
    const el = doc.createElement('div')
    el.id = SPOTLIGHT_CARD_ID
    el.setAttribute('role', 'dialog')
    // Tailwind utilities here are compiled via the tailwind.css
    // `@source "../**/*.js"` scan; geometry goes in inline styles.
    el.className =
      'fixed z-[500] w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-line bg-surface p-4 text-start text-ink shadow-shell'
    el.style.margin = '0'

    const head = doc.createElement('div')
    head.className = 'mb-1 flex items-start justify-between gap-2'

    headlineEl = doc.createElement('h3')
    headlineEl.className = 'm-0 text-[14px] font-semibold leading-5'
    head.appendChild(headlineEl)

    dismissBtn = doc.createElement('button')
    dismissBtn.type = 'button'
    dismissBtn.className =
      'flex size-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-[16px] leading-none text-muted hover:bg-[var(--line-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]'
    dismissBtn.textContent = '×'
    dismissBtn.addEventListener('click', () => dismiss())
    head.appendChild(dismissBtn)
    el.appendChild(head)

    bodyEl = doc.createElement('p')
    bodyEl.className = 'm-0 text-[13px] leading-5 text-muted'
    el.appendChild(bodyEl)

    const foot = doc.createElement('div')
    foot.className = 'mt-3 flex items-center justify-between gap-2'

    countEl = doc.createElement('span')
    countEl.className = 'text-xs text-muted'
    // "N of M" mixes Western digits with prose: pin LTR so RTL locales
    // render "1 من 3", never a bidi-flipped "3 من 1".
    countEl.dir = 'ltr'
    foot.appendChild(countEl)

    const actions = doc.createElement('div')
    actions.className = 'ms-auto flex items-center gap-2'

    secondaryBtn = doc.createElement('button')
    secondaryBtn.type = 'button'
    secondaryBtn.className =
      'inline-flex min-h-[32px] items-center rounded-md border border-line bg-surface px-3 py-1 text-[12.5px] font-semibold text-ink hover:bg-[var(--line-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]'
    secondaryBtn.addEventListener('click', () => back())
    actions.appendChild(secondaryBtn)

    primaryBtn = doc.createElement('button')
    primaryBtn.type = 'button'
    primaryBtn.className =
      'inline-flex min-h-[32px] items-center rounded-md border border-transparent bg-[var(--accent)] px-3 py-1 text-[12.5px] font-semibold text-inverse hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]'
    primaryBtn.addEventListener('click', () => next())
    actions.appendChild(primaryBtn)

    foot.appendChild(actions)
    el.appendChild(foot)

    arrowEl = doc.createElement('div')
    arrowEl.setAttribute('aria-hidden', 'true')
    arrowEl.className = 'absolute size-3 rotate-45 border-line bg-surface'
    el.appendChild(arrowEl)

    return el
  }

  function paintRing(el, on) {
    if (!el) return
    // Visuals live in the injected RING_CSS (pulsing outline); here we
    // only mark the element. setAttribute/removeAttribute — never
    // dataset['data-…'], which throws in real browsers.
    if (on) el.setAttribute?.(TARGET_RING_ATTR, '')
    else el.removeAttribute?.(TARGET_RING_ATTR)
  }

  function position() {
    if (!card || !targetEl) return
    const step = steps[index]
    const placement = dir() === 'rtl' ? flipPlacementForRtl(step.placement || 'bottom') : step.placement || 'bottom'
    const side = placement.split('-')[0]
    const r = targetEl.getBoundingClientRect()
    const {w: vw, h: vh} = viewportOf(doc)
    const cw = card.offsetWidth || 320
    const ch = card.offsetHeight || 160

    let left = r.left + r.width / 2 - cw / 2
    let top = r.bottom + GAP_PX
    if (side === 'top') top = r.top - ch - GAP_PX
    else if (side === 'left') {
      left = r.left - cw - GAP_PX
      top = r.top + r.height / 2 - ch / 2
    } else if (side === 'right') {
      left = r.right + GAP_PX
      top = r.top + r.height / 2 - ch / 2
    }
    if (placement.endsWith('-start')) {
      if (side === 'top' || side === 'bottom') left = r.left
      else top = r.top
    } else if (placement.endsWith('-end')) {
      if (side === 'top' || side === 'bottom') left = r.right - cw
      else top = r.bottom - ch
    }
    left = Math.max(VIEWPORT_MARGIN_PX, Math.min(vw - cw - VIEWPORT_MARGIN_PX, left))
    top = Math.max(VIEWPORT_MARGIN_PX, Math.min(vh - ch - VIEWPORT_MARGIN_PX, top))
    card.style.left = `${left}px`
    card.style.top = `${top}px`

    // Arrow: centered on the card edge facing the target.
    const arrow = 12
    arrowEl.style.borderStyle = 'solid'
    arrowEl.style.borderWidth = '0'
    if (side === 'bottom') {
      arrowEl.style.left = `${Math.max(14, Math.min(cw - 14 - arrow, r.left + r.width / 2 - left - arrow / 2))}px`
      arrowEl.style.top = '-7px'
      arrowEl.style.borderTopWidth = '1px'
      arrowEl.style.borderInlineStartWidth = '1px'
    } else if (side === 'top') {
      arrowEl.style.left = `${Math.max(14, Math.min(cw - 14 - arrow, r.left + r.width / 2 - left - arrow / 2))}px`
      arrowEl.style.top = `${ch - 6}px`
      arrowEl.style.borderBottomWidth = '1px'
      arrowEl.style.borderInlineEndWidth = '1px'
    } else if (side === 'left') {
      arrowEl.style.top = `${Math.max(14, Math.min(ch - 14 - arrow, r.top + r.height / 2 - top - arrow / 2))}px`
      arrowEl.style.left = `${cw - 7}px`
      arrowEl.style.borderTopWidth = '1px'
      arrowEl.style.borderInlineEndWidth = '1px'
    } else {
      arrowEl.style.top = `${Math.max(14, Math.min(ch - 14 - arrow, r.top + r.height / 2 - top - arrow / 2))}px`
      arrowEl.style.left = '-7px'
      arrowEl.style.borderBottomWidth = '1px'
      arrowEl.style.borderInlineStartWidth = '1px'
    }
  }

  function render() {
    const step = steps[index]
    const headline = t(step.headline)
    headlineEl.textContent = headline
    card.setAttribute('aria-label', headline)
    bodyEl.textContent = t(step.body)
    dismissBtn.setAttribute('aria-label', t('Dismiss'))
    const last = index === steps.length - 1
    primaryBtn.textContent = t(last ? 'Done' : step.primary || 'Next')
    const showBack = index > 0 && steps.length > 1
    secondaryBtn.hidden = !showBack
    if (showBack) secondaryBtn.textContent = t('Back')
    if (steps.length > 1) {
      countEl.hidden = false
      countEl.textContent = `${index + 1} ${t('of')} ${steps.length}`
    } else {
      countEl.hidden = true
      countEl.textContent = ''
    }
  }

  function show(i) {
    index = i
    const nextTarget = queryTarget(steps[index])
    if (!nextTarget) {
      // Target vanished mid-tour (e.g. status change hid it) — try onward,
      // otherwise end the tour rather than pointing at nothing.
      const onward = forwardVisible(index + 1)
      if (onward === -1) dismiss()
      else show(onward)
      return
    }
    if (targetEl && targetEl !== nextTarget) paintRing(targetEl, false)
    targetEl = nextTarget
    if (typeof targetEl.scrollIntoView === 'function') {
      try {
        targetEl.scrollIntoView({block: 'nearest', inline: 'nearest'})
      } catch {}
    }
    paintRing(targetEl, true)
    if (!card) {
      card = buildCard()
      doc.body.appendChild(card)
      onKeyDown = e => {
        if (e.key === 'Escape') {
          e.preventDefault()
          dismiss()
        }
      }
      onPointerDown = e => {
        if (card && !card.contains(e.target)) dismiss()
      }
      onReposition = () => position()
      doc.addEventListener('keydown', onKeyDown)
      doc.addEventListener('pointerdown', onPointerDown)
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', onReposition)
        window.addEventListener('scroll', onReposition, true)
      }
    }
    render()
    position()
    dismissBtn.focus?.()
  }

  /**
   * Start a multi-step tour. No-op when the kill switch is OFF, when a
   * tour is already running, or when no step has a visible target.
   * @param {Array<object>} nextSteps
   * @param {HTMLElement} [invoker] - element to return focus to on dismiss.
   * @returns {boolean} true when a tour started.
   */
  function start(nextSteps, invoker) {
    if (!enabled || isActive() || !Array.isArray(nextSteps) || !nextSteps.length) return false
    steps = nextSteps.map(s => ({...s}))
    invokerEl = invoker || doc.activeElement || null
    const first = forwardVisible(0)
    if (first === -1) {
      steps = []
      return false
    }
    show(first)
    return true
  }

  /**
   * Single triggered spotlight (Atlassian's Flag "Show me" pattern).
   * Same gates as start(): disabled when the kill switch is OFF.
   */
  function trigger(step, invoker) {
    return start([step], invoker)
  }

  function next() {
    if (!isActive()) return
    const onward = forwardVisible(index + 1)
    if (onward === -1) dismiss()
    else show(onward)
  }

  function back() {
    if (!isActive()) return
    const prev = backwardVisible(index - 1)
    if (prev !== -1) show(prev)
  }

  function dismiss() {
    if (targetEl) paintRing(targetEl, false)
    targetEl = null
    if (card) {
      if (onKeyDown) doc.removeEventListener('keydown', onKeyDown)
      if (onPointerDown) doc.removeEventListener('pointerdown', onPointerDown)
      if (onReposition && typeof window !== 'undefined') {
        window.removeEventListener('resize', onReposition)
        window.removeEventListener('scroll', onReposition, true)
      }
      onKeyDown = onPointerDown = onReposition = null
      card.remove()
      card = null
      arrowEl = primaryBtn = secondaryBtn = dismissBtn = countEl = headlineEl = bodyEl = null
    }
    index = -1
    steps = []
    const returnTo = invokerEl
    invokerEl = null
    if (returnTo && doc.contains?.(returnTo)) returnTo.focus?.()
  }

  /**
   * Global kill switch (Prototype Controls → Tour). Turning OFF while a
   * tour runs immediately dismisses the active spotlight.
   */
  function setEnabled(on) {
    enabled = Boolean(on)
    if (!enabled && isActive()) dismiss()
  }

  return {start, trigger, next, back, dismiss, isActive, isEnabled, setEnabled}
}
