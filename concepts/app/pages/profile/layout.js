// Profile page's Scroll Navigator — adapted from pages/customers/layouts.js's
// createScrollNavigator (same IntersectionObserver + smooth-scroll
// algorithm), with profile-scoped DOM hooks (profile-scroll-nav,
// data-profile-scroll-target, #profile-section-<key>) since this page has
// its own root/state independent of the customer record.

function setScrollActiveSection(root, key, sectionOrder, profileState) {
  if (!sectionOrder.includes(key)) return
  profileState.activeSection = key
  root.querySelectorAll('.profile-scroll-nav button').forEach(button => {
    button.setAttribute('aria-current', button.dataset.profileScrollSection === key ? 'page' : 'false')
  })
}

export function createProfileScrollNavigator({root, sectionOrder, profileState}) {
  let observer = null
  let navigationKey = ''
  let navigationTimer = 0
  let navigationId = 0

  function stickyOffset() {
    if (!matchMedia('(max-width: 720px)').matches) return 12
    return (root.querySelector('.profile-scroll-nav')?.getBoundingClientRect().height || 0) + 8
  }

  function scrollContainer() {
    return root.scrollHeight > root.clientHeight + 1 ? root : document.scrollingElement
  }

  function viewportTop(scroller) {
    return scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top
  }

  function syncActiveSection() {
    if (navigationKey) return
    const targets = [...root.querySelectorAll('[data-profile-scroll-target]')]
    if (!targets.length) return
    const scroller = scrollContainer()
    const anchor = viewportTop(scroller) + stickyOffset() + 2
    const activeTarget = targets.reduce((nearest, target) =>
      Math.abs(target.getBoundingClientRect().top - anchor) <
      Math.abs(nearest.getBoundingClientRect().top - anchor)
        ? target
        : nearest
    )
    setScrollActiveSection(root, activeTarget.dataset.profileScrollTarget, sectionOrder, profileState)
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
    root.querySelectorAll('[data-profile-scroll-target]').forEach(section => observer.observe(section))
  }

  function activateSection(key) {
    if (!sectionOrder.includes(key)) return
    stopNavigation()
    const thisNavigationId = navigationId
    navigationKey = key
    setScrollActiveSection(root, key, sectionOrder, profileState)
    const section = root.querySelector(`#profile-section-${key}`)
    if (!section) {
      stopNavigation()
      return
    }
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

  return {startSpy, stopTracking, activateSection, isNavigating: () => Boolean(navigationKey)}
}

// Sidebar list styled after the customer record's "Focused" layout nav
// (pages/customers/layouts.js's customer-focused-nav): a plain vertical
// list, no icons, active item marked by aria-current and a light
// accent-tinted highlight, in its own bordered/shadowed card — matches the
// production Skey ERP customer-detail sidebar rather than the icon-tabbed
// scroll-nav this page used before.
export function renderProfileScrollNav(sectionOrder, sections, activeKey, encodeHtml) {
  const nav = sectionOrder
    .map(key => {
      const current = activeKey === key
      return `<button type="button" data-profile-scroll-section="${encodeHtml(key)}" aria-controls="profile-section-${encodeHtml(key)}"${current ? ' aria-current="page"' : ''} tabindex="${current ? '0' : '-1'}"><span>${encodeHtml(sections[key].title)}</span></button>`
    })
    .join('')
  return `<nav class="profile-scroll-nav [.profile-canvas_&_button:focus-visible]:[outline:2px_solid_var(--accent)] [.profile-canvas_&_button:focus-visible]:[outline-offset:-2px] sticky [top:0] grid [gap:1px] [padding:8px] [border:1px_solid_var(--line)] rounded-lg bg-surface [box-shadow:var(--shadow-1)] [.profile-canvas_&_button]:[min-height:36px] [.profile-canvas_&_button]:[padding:8px_9px] [.profile-canvas_&_button]:[border:0] [.profile-canvas_&_button]:rounded-md [.profile-canvas_&_button]:text-ink [.profile-canvas_&_button]:[background:transparent] [.profile-canvas_&_button]:[font:inherit] [.profile-canvas_&_button]:text-start [.profile-canvas_&_button]:[cursor:pointer] [.profile-canvas_&_button:hover]:bg-[var(--line-2)] [.profile-canvas_&_button[aria-current=page]]:bg-[var(--line-2)] [.profile-canvas_&_button[aria-current=page]]:font-semibold [@media((max-width:720px))]:sticky [@media((max-width:720px))]:[top:0] [@media((max-width:720px))]:[z-index:2] [@media((max-width:720px))]:flex [@media((max-width:720px))]:overflow-x-auto [@media((max-width:720px))]:whitespace-nowrap [@media((max-width:720px))]:[.profile-canvas_&_button]:[flex:none]" aria-label="Profile sections">${nav}</nav>`
}
