// Profile page factory — composes the identity header, Scroll Navigator,
// section bodies, security dialogs, and device list into one Page-contract
// object, the same shape pages/customers/record.js's recordPage returns
// (id, roots, activate, deactivate, dispose), registered in main.js's
// pageRegistry and driven by core/navigation.js's real navigator.

import {PROFILE_SECTION_ORDER, PROFILE_SECTIONS} from './fields.js'
import {createProfileScrollNavigator, renderProfileScrollNav} from './layout.js'
import {renderProfileSections} from './sections.js'
import {renderLoginLogTable} from './devices.js'
import {createSecurityDialogs} from './security-dialogs.js'

// Every editable-fields tab (Profile, Employee details, Contact details,
// Account settings) follows the identical save/undo contract: a storage
// key, a map of {field: elementId}, and the shared bar ids sections.js's
// renderSaveBar stamped for that tab (profile-<key>-save/-undo). Appearance
// applies instantly (no bar, no entry here) and Security/Sessions are
// action dialogs and lists, not field forms.
const EDITABLE_TABS = {
  profile: {
    storageKey: 'skey-proto-profile-personal',
    fields: {
      name: 'profile-name',
      jobTitle: 'profile-job-title',
      email: 'profile-email',
      phone: 'profile-phone',
      timezone: 'profile-timezone',
    },
  },
  employee: {
    storageKey: 'skey-proto-profile-employee',
    fields: {
      workPhone: 'profile-employee-work-phone',
      extension: 'profile-employee-extension',
      officeLocation: 'profile-employee-office-location',
    },
  },
  contact: {
    storageKey: 'skey-proto-profile-contact',
    fields: {
      address: 'profile-contact-address',
      addressDetails: 'profile-contact-address-details',
      city: 'profile-contact-city',
      state: 'profile-contact-state',
      country: 'profile-contact-country',
      postalCode: 'profile-contact-postal-code',
      phone: 'profile-contact-phone',
      email: 'profile-contact-email',
      mobile: 'profile-contact-mobile',
      website: 'profile-contact-website',
    },
  },
  account: {
    storageKey: 'skey-proto-profile-account',
    fields: {
      landingPage: 'profile-landing-page',
    },
  },
}

function readSavedFields(storage, storageKey, editableFields) {
  try {
    const saved = JSON.parse(storage.getItem(storageKey) || '{}')
    if (!saved || Array.isArray(saved) || typeof saved !== 'object') return {}
    return Object.fromEntries(
      Object.keys(editableFields)
        .filter(key => typeof saved[key] === 'string')
        .map(key => [key, saved[key]])
    )
  } catch {
    return {}
  }
}

export function createProfile({root, encodeHtml, currentUser, employeeDetails, contactDetails, loginLogRows, activityRows = [], storage, toast, trapFocus, releaseFocus, syncAppearanceControls, bindAppearanceSection, languageControls, applyDataI18n, onSectionChange}) {
  const navMount = root.querySelector('#profile-scroll-nav-mount')
  const contentMount = root.querySelector('#profile-scroll-content')
  const canvas = root.querySelector('#profile-canvas')
  const savedProfileDetails = {...currentUser, ...readSavedFields(storage, EDITABLE_TABS.profile.storageKey, EDITABLE_TABS.profile.fields)}
  const savedEmployeeDetails = {...employeeDetails, ...readSavedFields(storage, EDITABLE_TABS.employee.storageKey, EDITABLE_TABS.employee.fields)}
  const savedContactDetails = {...contactDetails, ...readSavedFields(storage, EDITABLE_TABS.contact.storageKey, EDITABLE_TABS.contact.fields)}
  const savedAccountDetails = {landingPage: 'home', ...readSavedFields(storage, EDITABLE_TABS.account.storageKey, EDITABLE_TABS.account.fields)}

  // render() runs once, on the very first activate() call -- whatever
  // section that first activate({section}) asked for should already be
  // the one visible on first paint (renderProfileSections' activeKey),
  // not always 'profile' with a flash-correction right after.
  let initialSection = 'profile'
  const profileState = {activeSection: 'profile'}
  let scrollNavigator = null
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

  // Same contract on every editable-fields tab (Profile, Employee details,
  // Contact details, Account settings): the Save/Undo bar (sections.js's
  // renderSaveBar) starts disabled, an `input` on any field in the tab
  // enables both buttons, Save persists + disables the bar again, Undo
  // restores the last-saved values + disables the bar. This is the ERP-
  // standard "form is clean until touched" pattern, applied identically
  // everywhere instead of some tabs saving instantly and others not saving
  // at all.
  function bindEditableTab(key, savedDetails) {
    const {fields, storageKey} = EDITABLE_TABS[key]
    const controls = Object.fromEntries(
      Object.entries(fields).map(([field, id]) => [field, document.getElementById(id)])
    )
    const undoButton = document.getElementById(`profile-${key}-undo`)
    const saveButton = document.getElementById(`profile-${key}-save`)

    const setDirty = dirty => {
      undoButton.disabled = !dirty
      saveButton.disabled = !dirty
    }
    const restoreSavedDetails = () => {
      Object.entries(controls).forEach(([field, control]) => {
        control.value = savedDetails[field]
      })
      setDirty(false)
    }

    Object.values(controls).forEach(control =>
      control.addEventListener('input', () => setDirty(true))
    )
    undoButton.addEventListener('click', () => {
      restoreSavedDetails()
      toast({
        tone: 'ok',
        title: 'Changes discarded',
        body: `${PROFILE_SECTIONS[key].title} is back to its last saved values.`,
      })
    })
    saveButton.addEventListener('click', () => {
      const editableDetails = Object.fromEntries(
        Object.entries(controls).map(([field, control]) => [field, control.value.trim()])
      )
      storage.setItem(storageKey, JSON.stringify(editableDetails))
      Object.assign(savedDetails, editableDetails)
      restoreSavedDetails()
      toast({tone: 'ok', title: `${PROFILE_SECTIONS[key].title} saved`})
    })
    setDirty(false)
  }

  function bindEditableTabs() {
    bindEditableTab('profile', savedProfileDetails)
    bindEditableTab('employee', savedEmployeeDetails)
    bindEditableTab('contact', savedContactDetails)
    bindEditableTab('account', savedAccountDetails)
  }

  function render() {
    profileState.activeSection = initialSection
    navMount.innerHTML = renderProfileScrollNav(PROFILE_SECTION_ORDER, PROFILE_SECTIONS, profileState.activeSection, encodeHtml)
    contentMount.innerHTML = renderProfileSections({currentUser: savedProfileDetails, employeeDetails: savedEmployeeDetails, contactDetails: savedContactDetails, accountDetails: savedAccountDetails, encodeHtml, activityRows, activeKey: initialSection, language: languageControls?.getSelected?.() ?? 'en'})

    document.getElementById('profile-login-log').innerHTML = renderLoginLogTable(loginLogRows, encodeHtml)

    securityDialogs = createSecurityDialogs({
      trapFocus,
      releaseFocus,
      toast,
    })
    securityDialogs.bind()
    document.querySelector('[data-profile-open-change-password]').addEventListener('click', () => securityDialogs.openChangePassword())
    document.querySelector('[data-profile-open-set-pin]').addEventListener('click', () => securityDialogs.openSetPin())
    bindEditableTabs()

    // The Language select is not part of the Save/Undo contract: picking a
    // language applies immediately (like Appearance does) through the same
    // selectLanguage() the avatar menu's Language submenu uses, so it never
    // dirties the Account bar. localeControls keeps its value in sync when
    // the language changes anywhere else.
    const languageSelect = document.getElementById('profile-language')
    languageSelect?.addEventListener('change', () => languageControls?.select?.(languageSelect.value))

    navMount.querySelectorAll('[data-profile-scroll-section]').forEach(button =>
      button.addEventListener('click', () => setSection(button.dataset.profileScrollSection))
    )

    bindCardCollapse(contentMount)

    bindAppearanceSection?.()
    syncAppearanceControls?.()
  }

  function setSection(key) {
    if (!PROFILE_SECTION_ORDER.includes(key)) return
    scrollNavigator?.activateSection(key)
    /* Routing v1: explicit section choices are addressable as
       /profile?section=… — the URL follows the selection (history pushes
       are managed by the caller through syncUrl). */
    onSectionChange?.(key)
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
    // The section markup is generated in English, so data-i18n labels only
    // become Arabic when applyDataI18n runs against them: on every
    // activate — including re-activations after the language changed while
    // this view was detached (applyLocale's document walk can't see it).
    applyDataI18n?.()
    // Same detachment caveat for the Language select: while detached,
    // localeControls' syncLanguageControls can't reach it, so re-sync the
    // current selection here instead of trusting the value render() wrote.
    const languageSelect = document.getElementById('profile-language')
    if (languageSelect) languageSelect.value = languageControls?.getSelected?.() ?? 'en'
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
