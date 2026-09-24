// Profile page factory — composes the identity header, Scroll Navigator,
// section bodies, security dialogs, and device list into one Page-contract
// object, the same shape pages/customers/record.js's recordPage returns
// (id, roots, activate, deactivate, dispose), registered in main.js's
// pageRegistry and driven by core/navigation.js's real navigator.

import {PROFILE_SECTION_ORDER, PROFILE_SECTIONS} from './fields.js'
import {createProfileScrollNavigator, renderProfileScrollNav} from './layout.js'
import {renderProfileSections, renderAccountSection, renderSecuritySection} from './sections.js'
import {renderLoginLogTable, createDeviceList} from './devices.js'
import {createSecurityDialogs} from './security-dialogs.js'

export function createProfile({root, encodeHtml, currentUser, loginLogRows, deviceRows, activityRows = [], storage, toast, trapFocus, releaseFocus, syncAppearanceControls, bindAppearanceSection}) {
  const navMount = root.querySelector('#profile-scroll-nav-mount')
  const contentMount = root.querySelector('#profile-scroll-content')
  const canvas = root.querySelector('#profile-canvas')

  // render() runs once, on the very first activate() call -- whatever
  // section that first activate({section}) asked for should already be
  // the one visible on first paint (renderProfileSections' activeKey),
  // not always 'profile' with a flash-correction right after.
  let initialSection = 'profile'
  const profileState = {activeSection: 'profile'}
  let scrollNavigator = null
  let deviceList = null
  let securityDialogs = null
  let rendered = false

  // Same collapse contract pages/invoices/record.js wires for its own
  // .rec-card instances: click the header, flip aria-expanded, toggle the
  // body's hidden attribute. Shared so it can be re-applied to a single
  // section's cards after a targeted re-render (refreshAccountAndSecurity),
  // not just once over the whole page on first render().
  function bindCardCollapse(scope) {
    scope.querySelectorAll('.rec-card-hd').forEach(hd => {
      hd.addEventListener('click', () => {
        const open = hd.getAttribute('aria-expanded') === 'true'
        hd.setAttribute('aria-expanded', String(!open))
        hd.nextElementSibling.hidden = open
      })
    })
  }

  function bindDangerZoneButtons(scope) {
    scope.querySelector('#profile-deactivate-account')?.addEventListener('click', () => securityDialogs.openDeactivateAccount())
    scope.querySelector('#profile-delete-account')?.addEventListener('click', () => securityDialogs.openDeleteAccount())
  }

  function bind2faToggle(scope) {
    scope.querySelector('#profile-2fa-toggle')?.addEventListener('click', event => {
      const enabled = event.currentTarget.dataset.profile2faEnabled === 'true'
      if (enabled) securityDialogs.openDisable2fa()
      else securityDialogs.openEnable2fa()
    })
  }

  // Re-renders just the Account and Security section bodies (their state --
  // 2FA on/off, deactivated or not -- changed after a dialog closed) instead
  // of the whole page, which would also reset scroll position, collapsed
  // cards elsewhere, and the Sessions/device list's own render() side
  // effects.
  function refreshAccountAndSecurity() {
    const accountSection = document.getElementById('profile-section-account')
    const securitySection = document.getElementById('profile-section-security')
    if (accountSection) {
      accountSection.innerHTML = `<h2 class="profile-section-heading text-[15px] font-semibold text-ink mb-2.5">${encodeHtml('account')}</h2>${renderAccountSection(currentUser, encodeHtml)}`
      bindCardCollapse(accountSection)
      bindDangerZoneButtons(accountSection)
    }
    if (securitySection) {
      securitySection.innerHTML = `<h2 class="profile-section-heading text-[15px] font-semibold text-ink mb-2.5">${encodeHtml('security')}</h2>${renderSecuritySection(currentUser)}`
      bindCardCollapse(securitySection)
      bind2faToggle(securitySection)
      securitySection.querySelector('[data-profile-open-change-password]')?.addEventListener('click', () => securityDialogs.openChangePassword())
      securitySection.querySelector('[data-profile-open-set-pin]')?.addEventListener('click', () => securityDialogs.openSetPin())
    }
  }

  function render() {
    profileState.activeSection = initialSection
    navMount.innerHTML = renderProfileScrollNav(PROFILE_SECTION_ORDER, PROFILE_SECTIONS, profileState.activeSection, encodeHtml)
    contentMount.innerHTML = renderProfileSections({currentUser, encodeHtml, activityRows, activeKey: initialSection})

    document.getElementById('profile-login-log').innerHTML = renderLoginLogTable(loginLogRows, encodeHtml)

    deviceList = createDeviceList({
      root: document.getElementById('profile-device-list'),
      deviceRows,
      storage,
      toast,
      encodeHtml,
    })
    deviceList.render()

    securityDialogs = createSecurityDialogs({
      trapFocus,
      releaseFocus,
      toast,
      currentUser,
      onAccountStatusChange: refreshAccountAndSecurity,
    })
    securityDialogs.bind()
    document.querySelector('[data-profile-open-change-password]').addEventListener('click', () => securityDialogs.openChangePassword())
    document.querySelector('[data-profile-open-set-pin]').addEventListener('click', () => securityDialogs.openSetPin())
    bind2faToggle(contentMount)
    bindDangerZoneButtons(contentMount)

    navMount.querySelectorAll('[data-profile-scroll-section]').forEach(button =>
      button.addEventListener('click', () => scrollNavigator.activateSection(button.dataset.profileScrollSection))
    )

    bindCardCollapse(contentMount)

    bindAppearanceSection?.()
    syncAppearanceControls?.()
  }

  function setSection(key) {
    if (!PROFILE_SECTION_ORDER.includes(key)) return
    scrollNavigator?.activateSection(key)
  }

  function activate({section} = {}) {
    if (!rendered) {
      if (PROFILE_SECTION_ORDER.includes(section)) initialSection = section
      render()
      scrollNavigator = createProfileScrollNavigator({root: canvas, sectionOrder: PROFILE_SECTION_ORDER, profileState})
      rendered = true
    } else {
      setSection(section || 'profile')
    }
  }

  function deactivate() {
    scrollNavigator?.stopTracking()
  }

  function dispose() {
    deactivate()
    rendered = false
  }

  return {id: 'profile', roots: {root}, activate, deactivate, dispose, setSection}
}
