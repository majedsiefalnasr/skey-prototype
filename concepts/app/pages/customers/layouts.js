// Customer record layout renderers (guided/focused/compact/scroll) plus the
// Scroll Navigator — moved out of concepts/app/legacy-app.js as part of
// Task 7. Only `guided` and `scroll` are exposed through the record page's
// public `setLayout(layout)` contract (per the brief's Interfaces section:
// "layout values remain `guided`, `scroll` for exposed controls"), but
// `focused`/`compact` renderers are kept here verbatim — "existing other
// renderers are moved, not opportunistically deleted" (brief, same line) —
// in case a later task re-exposes them.
//
// Every renderer here is root-scoped: `root` (the record canvas element,
// `#customer-record-canvas`) is passed in explicitly rather than queried
// from `document`, continuing record.js's single retained-root pattern so
// nothing in the customer surface depends on `document.getElementById`
// finding a live element. The Scroll Navigator's own transient module state
// (observer handle/navigation timers) stays a closure here, created fresh
// each time `createScrollNavigator(...)` is called — record.js owns exactly
// one instance for the lifetime of its page.

/**
 * @param {string} key
 * @param {object} customerState
 * @returns {void}
 */
function setScrollActiveSection(root, key, sectionOrder, customerState) {
  if (!sectionOrder.includes(key)) return
  customerState.activeSection = key
  root.querySelectorAll('.customer-scroll-nav button').forEach(button => {
    button.setAttribute('aria-current', button.dataset.customerScrollSection === key ? 'page' : 'false')
  })
}

/**
 * Owns the Scroll Navigator's IntersectionObserver + smooth-scroll
 * navigation state for one customer record root. record.js creates one
 * instance per page activation and calls `stopTracking()` on
 * layout/deactivate.
 * @param {{root: HTMLElement, sectionOrder: string[], customerState: object}} params
 */
export function createScrollNavigator({root, sectionOrder, customerState}) {
  let observer = null
  let navigationKey = ''
  let navigationTimer = 0
  let navigationId = 0

  function stickyOffset() {
    if (!matchMedia('(max-width: 720px)').matches) return 12
    return (root.querySelector('.customer-scroll-nav')?.getBoundingClientRect().height || 0) + 8
  }

  function scrollContainer() {
    return root.scrollHeight > root.clientHeight + 1 ? root : document.scrollingElement
  }

  function viewportTop(scroller) {
    return scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top
  }

  function syncActiveSection() {
    if (navigationKey) return
    const targets = [...root.querySelectorAll('[data-customer-scroll-target]')]
    if (!targets.length) return
    const scroller = scrollContainer()
    const anchor = viewportTop(scroller) + stickyOffset() + 2
    const activeTarget = targets.reduce((nearest, target) =>
      Math.abs(target.getBoundingClientRect().top - anchor) <
      Math.abs(nearest.getBoundingClientRect().top - anchor)
        ? target
        : nearest
    )
    setScrollActiveSection(root, activeTarget.dataset.customerScrollTarget, sectionOrder, customerState)
  }

  function stopNavigation({interrupt = false} = {}) {
    navigationId += 1
    window.clearTimeout(navigationTimer)
    navigationTimer = 0
    navigationKey = ''
    if (interrupt) {
      const scroller = scrollContainer()
      scroller.scrollTo({top: scroller.scrollTop, behavior: 'auto'})
      syncActiveSection()
    }
  }

  function stopTracking() {
    observer?.disconnect()
    observer = null
    stopNavigation()
  }

  function startSpy() {
    observer?.disconnect()
    observer = null
    if (!('IntersectionObserver' in window)) return
    const scroller = scrollContainer()
    const offset = Math.round(stickyOffset())
    observer = new IntersectionObserver(() => syncActiveSection(), {
      root: scroller === document.scrollingElement ? null : scroller,
      rootMargin: `-${offset}px 0px -65% 0px`,
      threshold: [0, 0.1, 0.5],
    })
    root.querySelectorAll('[data-customer-scroll-target]').forEach(section => observer.observe(section))
  }

  function activateSection(key) {
    if (!sectionOrder.includes(key)) return
    stopNavigation()
    const thisNavigationId = navigationId
    navigationKey = key
    customerState.expanded.add(key)
    setScrollActiveSection(root, key, sectionOrder, customerState)
    const section = root.querySelector(`#customer-section-${key}`)
    if (!section) {
      stopNavigation()
      return
    }
    const body = section.querySelector('.customer-section-body')
    const heading = section.querySelector('.customer-section-heading')
    body.hidden = false
    heading?.setAttribute('aria-expanded', 'true')
    const scroller = scrollContainer()
    const targetTop =
      scroller.scrollTop + section.getBoundingClientRect().top - viewportTop(scroller) - stickyOffset()
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({top: Math.max(0, targetTop), behavior: reducedMotion ? 'auto' : 'smooth'})
    const finishNavigation = () => {
      if (thisNavigationId !== navigationId || navigationKey !== key) return
      window.clearTimeout(navigationTimer)
      navigationTimer = 0
      navigationKey = ''
    }
    scroller.addEventListener('scrollend', finishNavigation, {once: true})
    navigationTimer = window.setTimeout(finishNavigation, reducedMotion ? 0 : 1200)
  }

  return {
    startSpy,
    stopTracking,
    stopNavigation,
    syncActiveSection,
    activateSection,
    isNavigating: () => Boolean(navigationKey),
  }
}

/**
 * Guided (tabbed) layout: identity section up top, remaining sections behind
 * tabs.
 * @param {HTMLElement} root
 * @param {object} customerData
 * @param {object} customerState
 * @param {object} deps {encodeHtml, CUSTOMER_SECTIONS, CUSTOMER_GUIDED_TABS,
 *   renderCustomerIdentitySection, renderCustomerSectionStatus, renderCustomerTabSection}
 */
export function renderCustomerGuided(root, customerData, customerState, deps) {
  const {encodeHtml, CUSTOMER_SECTIONS, CUSTOMER_GUIDED_TABS, renderCustomerIdentitySection, renderCustomerSectionStatus, renderCustomerTabSection} = deps
  const top = renderCustomerIdentitySection('guided')
  const activeKey = CUSTOMER_GUIDED_TABS.includes(customerState.activeSection)
    ? customerState.activeSection
    : 'mainData'
  customerState.activeSection = activeKey
  const tabs = CUSTOMER_GUIDED_TABS.map(key => {
    const selected = activeKey === key
    const section = CUSTOMER_SECTIONS[key]
    return `<button class="rec-tab${selected ? ' on' : ''}" id="customer-tab-${encodeHtml(key)}" type="button" role="tab" data-customer-tab="${encodeHtml(key)}" aria-controls="customer-guided-panel" aria-selected="${selected}" tabindex="${selected ? '0' : '-1'}"><span>${encodeHtml(section.title)}</span>${renderCustomerSectionStatus(key)}</button>`
  }).join('')
  root.innerHTML = `<div class="customer-guided">${top}<div class="customer-guided-details"><div class="rec-tabs" role="tablist" aria-label="Customer details">${tabs}</div><div class="customer-guided-panel" id="customer-guided-panel" role="tabpanel" aria-labelledby="customer-tab-${encodeHtml(activeKey)}">${renderCustomerTabSection(activeKey)}</div></div></div>`
}

/**
 * Focused (single-section) layout — kept verbatim though not currently
 * exposed via `setLayout`.
 */
export function renderCustomerFocused(root, customerData, customerState, deps) {
  const {encodeHtml, CUSTOMER_SECTION_ORDER, CUSTOMER_SECTIONS, renderCustomerSummaryBand, renderCustomerSectionStatus, renderCustomerSection} = deps
  if (!CUSTOMER_SECTION_ORDER.includes(customerState.activeSection)) {
    customerState.activeSection = 'identity'
  }
  const nav = CUSTOMER_SECTION_ORDER.map(key => {
    const current = customerState.activeSection === key
    const label = key === 'identity' ? 'Overview' : CUSTOMER_SECTIONS[key].title
    return `<button type="button" id="customer-focused-${encodeHtml(key)}" data-customer-focus-section="${encodeHtml(key)}" aria-controls="customer-focused-panel"${current ? ' aria-current="page"' : ''} tabindex="${current ? '0' : '-1'}"><span>${encodeHtml(label)}</span>${renderCustomerSectionStatus(key)}</button>`
  }).join('')
  root.innerHTML = `
    ${renderCustomerSummaryBand()}
    <div class="customer-focused">
      <nav class="customer-focused-nav" aria-label="Customer sections">${nav}</nav>
      <div class="customer-focused-panel" id="customer-focused-panel" role="region" aria-labelledby="customer-focused-${encodeHtml(customerState.activeSection)}">${renderCustomerSection(customerState.activeSection)}</div>
    </div>`
}

/**
 * Compact (card grid) layout — kept verbatim though not currently exposed
 * via `setLayout`.
 */
export function renderCustomerCompact(root, customerData, customerState, deps) {
  const {CUSTOMER_SECTION_ORDER, renderCustomerSummaryBand, renderCustomerCollapsible} = deps
  const cards = CUSTOMER_SECTION_ORDER.map(key => {
    const full = ['identity', 'subLedgers', 'contactDetails'].includes(key)
    const wide = ['nationalAddress', 'mainData', 'otherData'].includes(key)
    const spanClass = full ? ' full' : wide ? ' wide' : ''
    return `<div class="customer-compact-card${spanClass}">${renderCustomerCollapsible(key, 'compact')}</div>`
  }).join('')
  root.innerHTML = `
    ${renderCustomerSummaryBand()}
    <div class="customer-compact-grid">${cards}</div>`
}

/**
 * Scroll (single-page, sticky-nav) layout. `scrollNavigator.startSpy()` must
 * be called by the caller after this renders (record.js does so, matching
 * the original's renderCustomerScroll -> startCustomerScrollSpy sequencing).
 */
export function renderCustomerScroll(root, customerData, customerState, deps) {
  const {encodeHtml, CUSTOMER_SECTION_ORDER, CUSTOMER_SECTIONS, renderCustomerIdentitySection, renderCustomerCollapsible} = deps
  if (!CUSTOMER_SECTION_ORDER.includes(customerState.activeSection)) {
    customerState.activeSection = 'identity'
  }
  const nav = CUSTOMER_SECTION_ORDER.map(key => {
    const current = customerState.activeSection === key
    return `<button type="button" data-customer-scroll-section="${encodeHtml(key)}" aria-controls="customer-section-${encodeHtml(key)}" aria-current="${current ? 'page' : 'false'}">${encodeHtml(CUSTOMER_SECTIONS[key].title)}</button>`
  }).join('')
  const sections = CUSTOMER_SECTION_ORDER.map(key => {
    const section = key === 'identity' ? renderCustomerIdentitySection('scroll') : renderCustomerCollapsible(key, 'scroll')
    return `<div id="customer-section-${encodeHtml(key)}" data-customer-scroll-target="${encodeHtml(key)}">${section}</div>`
  }).join('')
  root.innerHTML = `
    <div class="customer-scroll-layout">
      <nav class="customer-scroll-nav" aria-label="Customer sections">${nav}</nav>
      <div class="customer-scroll-content">${sections}</div>
    </div>`
}
