// Profile page factory — composes the identity header, Scroll Navigator,
// section bodies, security dialogs, and device list into one Page-contract
// object, the same shape pages/customers/record.js's recordPage returns
// (id, roots, activate, deactivate, dispose), registered in main.js's
// pageRegistry and driven by core/navigation.js's real navigator.

import {PROFILE_SECTION_ORDER, PROFILE_SECTIONS} from './fields.js'
import {createProfileScrollNavigator, renderProfileScrollNav} from './layout.js'
import {renderProfileSections, renderProfileIdentityHeader} from './sections.js'
import {renderLoginLogTable, createDeviceList} from './devices.js'
import {createSecurityDialogs} from './security-dialogs.js'

export function createProfile({root, encodeHtml, currentUser, loginLogRows, deviceRows, storage, toast, trapFocus, releaseFocus, syncAppearanceControls}) {
  const identityMount = root.querySelector('#profile-identity-mount')
  const navMount = root.querySelector('#profile-scroll-nav-mount')
  const contentMount = root.querySelector('#profile-scroll-content')
  const canvas = root.querySelector('#profile-canvas')

  const profileState = {activeSection: 'profile'}
  let scrollNavigator = null
  let deviceList = null
  let securityDialogs = null
  let rendered = false

  function render() {
    identityMount.innerHTML = renderProfileIdentityHeader(currentUser, encodeHtml)
    navMount.innerHTML = renderProfileScrollNav(PROFILE_SECTION_ORDER, PROFILE_SECTIONS, profileState.activeSection, encodeHtml)
    contentMount.innerHTML = renderProfileSections({currentUser, encodeHtml})

    document.getElementById('profile-login-log').innerHTML = renderLoginLogTable(loginLogRows, encodeHtml)

    deviceList = createDeviceList({
      root: document.getElementById('profile-device-list'),
      deviceRows,
      storage,
      toast,
      encodeHtml,
    })
    deviceList.render()

    securityDialogs = createSecurityDialogs({trapFocus, releaseFocus, toast})
    securityDialogs.bind()
    document.querySelector('[data-profile-open-change-password]').addEventListener('click', () => securityDialogs.openChangePassword())
    document.querySelector('[data-profile-open-set-pin]').addEventListener('click', () => securityDialogs.openSetPin())

    navMount.querySelectorAll('[data-profile-scroll-section]').forEach(button =>
      button.addEventListener('click', () => scrollNavigator.activateSection(button.dataset.profileScrollSection))
    )

    syncAppearanceControls?.()
  }

  function setSection(key) {
    if (!PROFILE_SECTION_ORDER.includes(key)) return
    scrollNavigator?.activateSection(key)
  }

  function activate({section} = {}) {
    if (!rendered) {
      render()
      scrollNavigator = createProfileScrollNavigator({root: canvas, sectionOrder: PROFILE_SECTION_ORDER, profileState})
      rendered = true
    }
    scrollNavigator.startSpy()
    setSection(section || 'profile')
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
