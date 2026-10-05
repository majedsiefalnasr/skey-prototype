// Spotlight tours, powered by driver.js (vendored at
// ../../third-party/driver.js/driver.js.mjs, v1.9.0, MIT) and restyled to the
// Atlassian spotlight anatomy (see driver-style.js: surface card,
// headline/body, step count, Back/Next-Done, X dismiss).
//
// Why the library: page-level overlay + popover (immune to nested
// scroll/overflow clipping), intelligent side/align auto-fit, target
// scroll-into-view, focus trap, and Esc/arrow-key handling — all behaviors
// the hand-built engine reimplemented by hand.
//
// Public API is unchanged from the hand-built engine, so triggers
// (Help → Take a tour, Prototype Controls, ?tour=) and tour.js need no
// changes: start/trigger/next/back/dismiss/isActive/isEnabled/setEnabled.
//
// Kill switch: `setEnabled(false)` disables ALL tour behavior (start,
// trigger, auto-start) and immediately dismisses a running tour. The
// Prototype Controls "Tour" toggle owns this flag; it is prototype
// configuration, never a product setting.
//
// Nothing ever auto-starts: a tour only runs after an explicit start().
// Steps whose target has no VISIBLE element are filtered up front —
// driver.js would otherwise render those as center-screen modals.

import {driver as createDriverJs} from '../../third-party/driver.js/driver.js.mjs'
import {DRIVER_BASE_CSS, ATLASSIAN_SPOTLIGHT_CSS} from './driver-style.js'

export const SPOTLIGHT_STYLE_ID = 'spotlight-style'
export const SPOTLIGHT_POPOVER_CLASS = 'skey-spotlight'

/**
 * Pure helper: mirror a requested popover side for RTL. driver.js sides
 * are physical, so `left-*` becomes `right-*` and vice versa;
 * top/bottom are direction-neutral. Exported for unit tests.
 * @param {string} placement
 * @returns {string}
 */
export function flipPlacementForRtl(placement) {
  if (typeof placement !== 'string') return 'bottom'
  if (placement.startsWith('left')) return placement.replace(/^left/, 'right')
  if (placement.startsWith('right')) return placement.replace(/^right/, 'left')
  return placement
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
 * @param {(config: object) => object} params.createDriver - driver.js factory; inject a fake in tests.
 */
export function createSpotlight({document: doc = document, t = key => key, getDirection, createDriver} = {}) {
  const makeDriver = createDriver || createDriverJs
  const dir = () => {
    if (typeof getDirection === 'function') return getDirection()
    return doc.documentElement?.dir === 'rtl' ? 'rtl' : 'ltr'
  }

  let enabled = true
  let active = false
  let driverObj = null
  let invokerEl = null

  ensureStyle()

  const isActive = () => active
  const isEnabled = () => enabled

  function ensureStyle() {
    if (typeof doc.createElement !== 'function') return
    if (typeof doc.getElementById === 'function' && doc.getElementById(SPOTLIGHT_STYLE_ID)) return
    const host = doc.head || doc.body
    if (!host || typeof host.appendChild !== 'function') return
    const style = doc.createElement('style')
    style.id = SPOTLIGHT_STYLE_ID
    style.textContent = `${DRIVER_BASE_CSS}\n${ATLASSIAN_SPOTLIGHT_CSS}`
    host.appendChild(style)
  }

  // First visible element across a step's selectors. The record action
  // cluster shows Modify while reading and Save while writing, and
  // section-bound targets only exist on their own section — first
  // visible wins so tours stay complete across modes and sections.
  function resolveElement(step) {
    if (!step || typeof doc.querySelectorAll !== 'function') return null
    const selectors = Array.isArray(step.targets) ? step.targets : [step.target]
    for (const selector of selectors) {
      if (!selector) continue
      const hit = [...doc.querySelectorAll(selector)].find(isVisible)
      if (hit) return hit
    }
    return null
  }

  function toDriverStep(step) {
    const placement = dir() === 'rtl' ? flipPlacementForRtl(step.placement || 'bottom') : step.placement || 'bottom'
    const [side, align = 'center'] = placement.split('-')
    return {
      element: resolveElement(step),
      popover: {
        title: t(step.headline),
        description: t(step.body),
        side,
        align,
      },
    }
  }

  function start(nextSteps, invoker, {showProgress = true} = {}) {
    if (!enabled || active || !Array.isArray(nextSteps) || !nextSteps.length) return false
    const driverSteps = nextSteps.map(toDriverStep).filter(step => step.element)
    if (!driverSteps.length) return false
    invokerEl = invoker || doc.activeElement || null
    driverObj = makeDriver({
      animate: true,
      allowClose: true,
      overlayClickBehavior: 'close',
      allowKeyboardControl: true,
      stagePadding: 6,
      stageRadius: 8,
      popoverOffset: 10,
      overlayOpacity: 0.55,
      showProgress,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: t('Next'),
      prevBtnText: t('Back'),
      doneBtnText: t('Done'),
      closeBtnLabel: t('Dismiss'),
      progressText: `{{current}} ${t('of')} {{total}}`,
      popoverClass: SPOTLIGHT_POPOVER_CLASS,
      steps: driverSteps,
      onDestroyed: () => {
        // Backup path: driver-initiated destroys (overlay click, Esc,
        // Done) funnel here since dismiss() wasn't called. Idempotent
        // with dismiss() — flags are already clear and focus may schedule
        // twice on the same element, which is a visual no-op.
        active = false
        driverObj = null
        const returnTo = invokerEl
        invokerEl = null
        if (returnTo && doc.contains?.(returnTo)) {
          setTimeout(() => {
            if (doc.contains?.(returnTo)) returnTo.focus?.()
          }, 0)
        }
      },
    })
    active = true
    driverObj.drive()
    return true
  }

  /**
   * Single triggered spotlight (Atlassian's Flag "Show me" pattern): one
   * step, no step count, Done dismisses. Same gates as start().
   */
  function trigger(step, invoker) {
    return start([step], invoker, {showProgress: false})
  }

  function next() {
    if (active && driverObj) driverObj.moveNext()
  }

  function back() {
    if (active && driverObj) driverObj.movePrevious()
  }

  function dismiss() {
    if (!active) return
    // Clear first: driver.js skips onDestroyed when destroyed mid-transition
    // (its __activeStep/__activeElement land only after the enter animation),
    // so the kill switch must never depend on the hook firing.
    const obj = driverObj
    const returnTo = invokerEl
    driverObj = null
    invokerEl = null
    active = false
    try {
      obj.destroy()
    } catch {}
    // driver.js restores focus to its own captured element on destroy;
    // defer so the tour invoker (Help item, Start button) wins.
    if (returnTo && doc.contains?.(returnTo)) {
      setTimeout(() => {
        if (doc.contains?.(returnTo)) returnTo.focus?.()
      }, 0)
    }
  }

  /**
   * Global kill switch (Prototype Controls → Tour). Turning OFF while a
   * tour runs immediately dismisses the active spotlight.
   */
  function setEnabled(on) {
    enabled = Boolean(on)
    if (!enabled) dismiss()
  }

  return {start, trigger, next, back, dismiss, isActive, isEnabled, setEnabled}
}
