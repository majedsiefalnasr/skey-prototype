// Shared loading facility — extracted verbatim from the single-file legacy
// application script (concepts/app/legacy-app.js): the skeleton-overlay
// block ("Navigation shows a brief loading state by default...") and the
// number-ticker block immediately before it (both under the original's
// "shell services" section). Every function body/algorithm is unchanged;
// only two reads that pointed at page/legacy-app private state became the
// createLoading({getContainer,isSimulationEnabled}) constructor callbacks:
//   - currentSkeletonContainer() read `currentContentViewName`, a
//     legacy-app-private mutable binding tracking which page view is on
//     screen — replaced by the getContainer() callback.
//   - simulateLoadingEnabled() read `#simulate-loading`'s checked state
//     directly — replaced by the isSimulationEnabled() callback.
//
// createLoading({getContainer, isSimulationEnabled}) returns
// {queue, clear, dispose} per the plan's stated contract. `queue` is the
// original's queueSkeletonForCurrentView (debounced-by-rAF skeleton show);
// `clear` is the original's clearSkeletonOverlays; `dispose` cancels any
// pending frame, clears every active overlay, and removes the two event
// listeners this block originally registered (#simulate-loading's change
// listener and the window resize listener) — the original never removed
// them (the IIFE lived for the whole page), this is a mechanical addition
// only so dispose() means something. The ticker helpers move here too (per
// the plan) and are exposed as an additional `initTickers` on the returned
// object, since data-list statistics rendering (legacy-app.js) is their
// only caller and still needs to reach them after this move.

/* Same idea as MagicUI's NumberTicker: count up from 0 to the
   rendered value instead of just painting the final number. Works on the
   already-rendered text (no need to touch each stat renderer's markup) —
   parses "EGP 15,300.00" / "67%" / "8" into prefix + number + suffix,
   animates the number with an ease-out curve, then re-applies the exact
   original formatting (thousands separators, decimal places) each frame. */
function animateNumberTicker(el, {duration = 900, delay = 0} = {}) {
  const raw = el.textContent
  const match = raw.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/)
  if (!match) return
  const [, prefix, numText, suffix] = match
  const target = Number(numText.replace(/,/g, ''))
  if (!Number.isFinite(target)) return
  const decimals = numText.includes('.') ? numText.split('.')[1].length : 0
  const format = value =>
    `${prefix}${value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`
  el.textContent = format(0)
  const start = performance.now() + delay
  const easeOutExpo = p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p))
  const step = now => {
    const elapsed = now - start
    if (elapsed < 0) {
      requestAnimationFrame(step)
      return
    }
    const progress = Math.min(elapsed / duration, 1)
    el.textContent = format(target * easeOutExpo(progress))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
function initNumberTickers(root) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  root
    .querySelectorAll(
      '.data-stat-card strong, .data-stat-operation-value strong, .data-stat-analytical > strong, .data-stat-exception-lead strong, .data-stat-exception-row > output'
    )
    .forEach((el, index) => animateNumberTicker(el, {delay: index * 60}))
}

/* ---- skeleton loading ----
   Navigation shows a brief loading state by default. Prototype controls > Debug
   > Simulate loading holds that state until turned off. Rather than choosing from
   generic templates, the overlay redraws the current view's visible structure. */
const SKELETON_DELAY_MS = 700

function clippedSkeletonBox(bounds, rect, widthScale) {
  const left = Math.max(bounds.left, rect.left)
  const top = Math.max(bounds.top, rect.top)
  const right = Math.min(bounds.right, rect.right)
  const bottom = Math.min(bounds.bottom, rect.bottom)
  return {
    left: left - bounds.left,
    top: top - bounds.top,
    width: Math.max(0, right - left) * widthScale,
    height: Math.max(0, bottom - top),
  }
}

function skeletonShape(overlay, bounds, {rect, kind, radius = 6, widthScale = 1, borderWidths}) {
  const box = clippedSkeletonBox(bounds, rect, widthScale)
  const minimumHeight = kind === 'divider' ? 1 : 4
  if (box.width < 4 || box.height < minimumHeight) return
  const shape = document.createElement('span')
  const animatedClass =
    ' bg-[linear-gradient(90deg,var(--line-2)_25%,color-mix(in_srgb,var(--line-2)_55%,var(--surface))_50%,var(--line-2)_75%)] bg-[length:250%_100%] [animation:skeleton-shimmer_1.4s_ease-in-out_infinite] motion-reduce:animate-none'
  const kindClass = kind === 'surface'
    ? ' bg-[color-mix(in_srgb,var(--line-2)_35%,transparent)] border-0 border-solid border-line'
    : kind === 'divider'
      ? ' min-h-px! rounded-none! bg-line'
      : animatedClass
  shape.className = 'skeleton-shape absolute min-w-[4px] min-h-[4px] rounded-md' + kindClass
  shape.dataset.skeletonKind = kind
  Object.assign(shape.style, {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    borderRadius: `${Math.min(radius, box.height / 2)}px`,
  })
  if (borderWidths) Object.assign(shape.style, borderWidths)
  overlay.appendChild(shape)
}

function skeletonTextLines(overlay, bounds, element, rect) {
  const style = getComputedStyle(element)
  const fontSize = Number.parseFloat(style.fontSize) || 14
  const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.35
  const count = Math.max(1, Math.min(3, Math.round(rect.height / lineHeight)))
  const blockHeight = Math.max(7, Math.min(14, fontSize * 0.72))
  for (let index = 0; index < count; index += 1) {
    const lineTop = rect.top + Math.max(0, (lineHeight - blockHeight) / 2) + index * lineHeight
    const remainingHeight = rect.bottom - lineTop
    if (remainingHeight < 4) break
    const lineRect = {
      left: rect.left,
      right: rect.right,
      top: lineTop,
      bottom: lineTop + Math.min(blockHeight, remainingHeight),
    }
    skeletonShape(overlay, bounds, {
      rect: lineRect,
      kind: 'text',
      radius: blockHeight / 2,
      widthScale: index === count - 1 && count > 1 ? 0.68 : 0.9,
    })
  }
}

function skeletonElementIsVisible(element, bounds) {
  if (element.closest('.skeleton-overlay')) return false
  if (element.checkVisibility && !element.checkVisibility({checkVisibilityCSS: true})) return false
  const closedDetails = element.closest('details:not([open])')
  if (closedDetails && !element.closest('summary')) return false
  const style = getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false
  const rect = element.getBoundingClientRect()
  return (
    rect.width >= 4 &&
    rect.height >= 4 &&
    rect.right > bounds.left &&
    rect.left < bounds.right &&
    rect.bottom > bounds.top &&
    rect.top < bounds.bottom
  )
}

function skeletonSurfaceElements(container, bounds) {
  const seenBoxes = new Set()
  return [...container.querySelectorAll('*')]
    .filter(element => skeletonElementIsVisible(element, bounds))
    .filter(element => !element.matches('button, input, select, textarea, summary, th, td, tr'))
    .filter(element => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some(
        edge => Number.parseFloat(style[`border${edge}Width`]) > 0
      )
      if (!hasBorder || rect.width * rect.height < 1800) return false
      const boxKey = [rect.left, rect.top, rect.width, rect.height]
        .map(value => Math.round(value))
        .join(':')
      if (seenBoxes.has(boxKey)) return false
      seenBoxes.add(boxKey)
      return true
    })
    .slice(0, 64)
}

function addSkeletonSurfaces(container, overlay, bounds) {
  skeletonSurfaceElements(container, bounds).forEach(element => {
    const style = getComputedStyle(element)
    skeletonShape(overlay, bounds, {
      rect: element.getBoundingClientRect(),
      kind: 'surface',
      radius: Number.parseFloat(style.borderRadius) || 0,
      borderWidths: {
        borderTopWidth: style.borderTopWidth,
        borderRightWidth: style.borderRightWidth,
        borderBottomWidth: style.borderBottomWidth,
        borderLeftWidth: style.borderLeftWidth,
      },
    })
  })
}

function addSkeletonTableDividers(container, overlay, bounds) {
  container.querySelectorAll('tr').forEach(row => {
    if (!skeletonElementIsVisible(row, bounds)) return
    const cells = [...row.children]
    const width = Math.max(
      0,
      ...cells.map(cell => Number.parseFloat(getComputedStyle(cell).borderBottomWidth))
    )
    if (!width) return
    const rect = row.getBoundingClientRect()
    skeletonShape(overlay, bounds, {
      rect: {
        left: rect.left,
        right: rect.right,
        top: rect.bottom - width,
        bottom: rect.bottom,
      },
      kind: 'divider',
      radius: 0,
    })
  })
}

function addSkeletonTableText(overlay, bounds, rect) {
  const inset = Math.min(10, rect.width * 0.08)
  const height = Math.min(12, Math.max(7, rect.height * 0.38))
  skeletonShape(overlay, bounds, {
    rect: {
      left: rect.left + inset,
      right: rect.right - inset,
      top: rect.top + (rect.height - height) / 2,
      bottom: rect.top + (rect.height + height) / 2,
    },
    kind: 'text',
    radius: height / 2,
    widthScale: 0.82,
  })
}

function addSkeletonContent(element, overlay, bounds) {
  const rect = element.getBoundingClientRect()
  const compositeControl = element.matches('.lp-tile')
  const control =
    element.matches('button, input, select, textarea, .badge, .stpill') && !compositeControl
  const media = element.matches('img, .email-avatar, .customer-photo-preview')
  const ownerControl = element.closest('button, .badge, .stpill')
  if (!control && !media && ownerControl && !ownerControl.matches('.lp-tile')) return
  if (compositeControl) return
  if (element.matches('label') && element.querySelector('input, select, textarea')) return
  if (element.matches('th, td')) {
    addSkeletonTableText(overlay, bounds, rect)
    return
  }
  if (!control && !media) {
    skeletonTextLines(overlay, bounds, element, rect)
    return
  }
  const kind = media ? 'media' : 'control'
  skeletonShape(overlay, bounds, {
    rect,
    kind,
    radius: Number.parseFloat(getComputedStyle(element).borderRadius) || (media ? 10 : 6),
  })
}

function addSkeletonContentShapes(container, overlay, bounds) {
  const candidates = container.querySelectorAll(
    'button, input, select, textarea, output, img, h1, h2, h3, h4, p, small, strong, label, legend, th, td, a, .badge, .stpill, .pos, .tm, .email-avatar, .customer-photo-preview, .lp-tile-lbl, .lp-tile-desc'
  )
  ;[...candidates]
    .filter(element => skeletonElementIsVisible(element, bounds))
    .forEach(element => addSkeletonContent(element, overlay, bounds))
}

function buildSkeletonFromPage(container, overlay) {
  const bounds = container.getBoundingClientRect()
  addSkeletonSurfaces(container, overlay, bounds)
  addSkeletonTableDividers(container, overlay, bounds)
  addSkeletonContentShapes(container, overlay, bounds)
}

/**
 * @param {{getContainer: () => Element|null, isSimulationEnabled: () => boolean}} deps
 */
export function createLoading({getContainer, isSimulationEnabled}) {
  const activeSkeletons = new Map()
  let frame = 0

  function clearSkeletonOverlay(container) {
    const activeSkeleton = activeSkeletons.get(container)
    if (!activeSkeleton) return
    clearTimeout(activeSkeleton.timeout)
    activeSkeleton.overlay.remove()
    if (activeSkeleton.addedHostClass) container.classList.remove('skeleton-host', 'relative!')
    if (activeSkeleton.previousBusy == null) container.removeAttribute('aria-busy')
    else container.setAttribute('aria-busy', activeSkeleton.previousBusy)
    activeSkeletons.delete(container)
  }

  function clear() {
    ;[...activeSkeletons.keys()].forEach(clearSkeletonOverlay)
  }

  function showSkeletonOverlay(container) {
    if (!container) return
    clear()
    const computedPosition = getComputedStyle(container).position
    const addedHostClass = computedPosition === 'static'
    if (addedHostClass) container.classList.add('skeleton-host', 'relative!')
    const previousBusy = container.getAttribute('aria-busy')
    container.setAttribute('aria-busy', 'true')
    const overlay = document.createElement('div')
    overlay.className = 'skeleton-overlay absolute inset-0 z-40 overflow-hidden bg-surface pointer-events-none [contain:paint]'
    overlay.setAttribute('aria-hidden', 'true')
    buildSkeletonFromPage(container, overlay)
    container.appendChild(overlay)
    const activeSkeleton = {
      overlay,
      addedHostClass,
      previousBusy,
      timeout: 0,
    }
    activeSkeletons.set(container, activeSkeleton)
    if (!isSimulationEnabled()) {
      activeSkeleton.timeout = setTimeout(() => clearSkeletonOverlay(container), SKELETON_DELAY_MS)
    }
  }

  function showSkeletonForCurrentView() {
    showSkeletonOverlay(getContainer())
  }

  function queue() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      frame = 0
      showSkeletonForCurrentView()
    })
  }

  const controller = new AbortController()
  document.getElementById('simulate-loading')?.addEventListener(
    'change',
    event => {
      if (event.target.checked) queue()
      else clear()
    },
    {signal: controller.signal}
  )
  addEventListener(
    'resize',
    () => {
      if (activeSkeletons.size || isSimulationEnabled()) queue()
    },
    {signal: controller.signal}
  )

  function dispose() {
    controller.abort()
    cancelAnimationFrame(frame)
    frame = 0
    clear()
  }

  return {
    queue,
    clear,
    dispose,
    initTickers: initNumberTickers,
  }
}
