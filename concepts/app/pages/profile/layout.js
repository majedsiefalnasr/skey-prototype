// Profile page's tab navigator — the sidebar behaves like real tabs
// (click a link, only that section's content shows) rather than the
// scroll-spy/smooth-scroll-to-anchor behavior this page used before:
// every section stayed mounted and visible via one long scroll, which
// meant "opening" a section was actually just scrolling to it. Real tabs
// match how most settings pages (including Atlassian's own account
// settings) behave, and avoid the scroll-position ambiguity multi-section
// scroll-spy pages can have.
function setActiveSection(root, key, sectionOrder, profileState) {
  if (!sectionOrder.includes(key)) return
  profileState.activeSection = key
  root.querySelectorAll('.profile-scroll-nav button').forEach(button => {
    const active = button.dataset.profileScrollSection === key
    button.setAttribute('aria-current', active ? 'page' : 'false')
    button.tabIndex = active ? 0 : -1
  })
  root.querySelectorAll('[data-profile-scroll-target]').forEach(section => {
    section.hidden = section.dataset.profileScrollTarget !== key
  })
}

export function createProfileScrollNavigator({root, sectionOrder, profileState}) {
  function activateSection(key) {
    setActiveSection(root, key, sectionOrder, profileState)
  }

  // startSpy/stopTracking are no-ops now (kept so profile.js's existing
  // activate()/deactivate() calls don't need their own conditional) --
  // there's nothing to observe once switching sections is a plain
  // show/hide instead of a scroll position to track.
  return {startSpy: () => {}, stopTracking: () => {}, activateSection, isNavigating: () => false}
}

// Sidebar list styled after the customer record's "Focused" layout nav
// (pages/customers/layouts.js's customer-focused-nav): a plain vertical
// list, no icons, active item marked by aria-current and a light
// accent-tinted highlight, in its own bordered/shadowed card — matches the
// production Skey ERP customer-detail sidebar.
export function renderProfileScrollNav(sectionOrder, sections, activeKey, encodeHtml) {
  const nav = sectionOrder
    .map(key => {
      const current = activeKey === key
      return `<button type="button" id="profile-tab-${encodeHtml(key)}" data-profile-scroll-section="${encodeHtml(key)}" aria-controls="profile-section-${encodeHtml(key)}"${current ? ' aria-current="page"' : ''} tabindex="${current ? '0' : '-1'}"><span>${encodeHtml(sections[key].title)}</span></button>`
    })
    .join('')
  return `<nav class="profile-scroll-nav [.profile-canvas_&_button:focus-visible]:[outline:2px_solid_var(--accent)] [.profile-canvas_&_button:focus-visible]:[outline-offset:-2px] sticky [top:0] grid [gap:1px] [padding:8px] [border:1px_solid_var(--line)] rounded-lg bg-surface [box-shadow:var(--shadow-1)] [.profile-canvas_&_button]:[min-height:36px] [.profile-canvas_&_button]:[padding:8px_9px] [.profile-canvas_&_button]:[border:0] [.profile-canvas_&_button]:rounded-md [.profile-canvas_&_button]:text-ink [.profile-canvas_&_button]:[background:transparent] [.profile-canvas_&_button]:[font:inherit] [.profile-canvas_&_button]:text-start [.profile-canvas_&_button]:[cursor:pointer] [.profile-canvas_&_button:hover]:bg-[var(--line-2)] [.profile-canvas_&_button[aria-current=page]]:bg-[var(--accent-soft)] [.profile-canvas_&_button[aria-current=page]]:text-[var(--accent)] [.profile-canvas_&_button[aria-current=page]]:font-semibold [@media((max-width:720px))]:sticky [@media((max-width:720px))]:[top:0] [@media((max-width:720px))]:[z-index:2] [@media((max-width:720px))]:flex [@media((max-width:720px))]:overflow-x-auto [@media((max-width:720px))]:whitespace-nowrap [@media((max-width:720px))]:[.profile-canvas_&_button]:[flex:none]" aria-label="Profile sections">${nav}</nav>`
}
