// Customer record page: model glue, chrome/layout rendering, save/undo/
// guard, and the record's Page-contract lifecycle — moved out of
// concepts/app/legacy-app.js as part of Task 7.
//
// createCustomerRecord({root, footer, deps}) is the actual
// `createCustomerRecord` factory the prior report's plan named: it OWNS the
// mutable `customerData`/`customerState`/`customerSavedSnapshot` bindings
// that used to be module-scoped globals in legacy-app.js, and implements
// the plan's Page contract shape ({id, roots, activate(data), deactivate(),
// dispose()}) so legacy-app.js (and, later, Task 10's real navigator) can
// drive it uniformly.
//
// THE NULL-ROOT FIX (issue 6 groundwork, per the brief + prior report's
// confirmed scoping): the original queried `document.getElementById(
// 'customer-record-chrome')` (and other customer-private elements) fresh on
// every render call. If prototype restoration ever re-ran this code before
// the page's markup was attached to `document` (the exact scenario Task 11
// will wire up), that lookup returns null and throws. Here, every
// customer-private DOM reference is resolved ONCE against `root` (the
// retained `.customer-record-view` element passed into the factory) at
// construction time, stored in a small `refs` bundle, and reused — never
// re-queried from `document` on each render. This removes the anti-pattern
// that CAUSES the null-root exception. It does NOT make the Task 1
// regression test (`tests/lifecycle.spec.mjs`, "customer mode restores
// after reload without a null-root exception") pass — that test needs
// Task 11's restoration wiring (reading saved customer-mode before this
// page initializes, calling `customers.setMode` pre-activation), which does
// not exist yet. The test stays `test.fail()`/expected-failure, per the
// brief's explicit "Keep this test expected-failure until restoration
// wiring is completed in Task 11."
//
// setMode(mode) updates model state even before activation (record.js's own
// module state, not DOM) — DOM rendering only happens once `root` is a
// connected/attached element via activate(), matching the Interfaces
// section's "DOM rendering uses the retained record root."

import {
  CUSTOMER_SECTION_ORDER,
  CUSTOMER_GUIDED_TABS,
  CUSTOMER_REQUIRED_FIELDS,
  CUSTOMER_LOOKUP_KEYS,
  createBlankCustomerData,
  createSavedCustomerData,
  customerSectionKeyForField,
  validateCustomerField,
  validateCustomerRecord,
  customerSectionMeta,
  renderCustomerSectionStatus,
  renderCustomerField,
} from './fields.js'
import {customerImageData, renderCustomerRecordPhoto, createImagePreview} from './images.js'
import {createLookups} from './lookups.js'
import {
  createScrollNavigator,
  renderCustomerGuided,
  renderCustomerFocused,
  renderCustomerCompact,
  renderCustomerScroll,
} from './layouts.js'

const CUSTOMER_RENDERERS = {
  guided: renderCustomerGuided,
  scroll: renderCustomerScroll,
}

/**
 * Resolves every customer-record-private DOM element once, scoped to
 * `root`/`document` at construction time (never re-queried per-render).
 * `root` is `.customer-record-view`; the popover/menu/drawer overlays are
 * page-wide singletons sitting outside it (same reasoning images.js and
 * lookups.js already documented for the image popover and lookup menus),
 * so those are resolved from `document` once here too — still never
 * re-queried inside a render call.
 * @param {HTMLElement} root
 */
function resolveRefs(root) {
  return {
    root,
    canvas: root.querySelector('#customer-record-canvas'),
    chrome: root.querySelector('#customer-record-chrome'),
    footer: root.querySelector('.customer-record-footer'),
    footerPositionLabel: root.querySelector('#customer-record-position'),
    footerNote: root.querySelector('#customer-footer-note'),
    modeSelect: document.getElementById('customer-mode'),
    layoutSelect: document.getElementById('customer-layout'),
    imagePopover: document.getElementById('customer-image-popover'),
    guardScrim: document.getElementById('customer-gscrim'),
    guardMessage: document.getElementById('customer-g-msg'),
    guardWhat: document.getElementById('customer-g-what'),
    lookupMenu: document.getElementById('customer-lookup-menu'),
    unitLookupMenu: document.getElementById('customer-unit-lookup-menu'),
    lookupSearchScrim: document.getElementById('customer-lookup-search-scrim'),
    typeAddScrim: document.getElementById('customer-type-add-scrim'),
    unitDrawerScrim: document.getElementById('customer-unit-drawer-scrim'),
    parentUnitDrawerScrim: document.getElementById('customer-parent-unit-drawer-scrim'),
    locationAddScrim: document.getElementById('customer-location-add-scrim'),
  }
}

/**
 * @param {object} params
 * @param {HTMLElement} params.root - the retained `.customer-record-view` element
 * @param {object} params.deps - page-level facilities: t, encodeHtml, toast,
 *   trapFocus, releaseFocus, showContentView, applyRecordValueDirections,
 *   customerRows (CUSTOMER_ROWS), customerReference (CUSTOMER_REFERENCE),
 *   lookupResults (CUSTOMER_LOOKUP_RESULTS), unitRows (UNIT_ROWS)
 * @returns {object} Page contract: {id, roots, activate, deactivate, dispose,
 *   setMode, setLayout, getModel}
 */
export function createCustomerRecord({root, deps}) {
  const {t, encodeHtml, toast, trapFocus, releaseFocus, showContentView, applyRecordValueDirections, customerRows, customerReference, lookupResults, unitRows} = deps

  const refs = resolveRefs(root)

  const customerState = {
    mode: 'view',
    customerNo: '',
    layout: 'guided',
    activeSection: 'identity',
    expanded: new Set(),
    errors: new Map(),
    dirty: false,
  }
  let customerData = createSavedCustomerData(customerReference.customerNo, customerRows, customerReference)
  let customerSavedSnapshot = structuredClone(customerData)

  let imagePreview = null
  let lookups = null
  let scrollNavigator = null
  let abortController = null
  let guardAfter = null
  let active = false

  const fieldDeps = {t, encodeHtml, customerImageData, renderCustomerRecordPhoto: (photo, deps2) => renderCustomerRecordPhoto(photo, {customerName: customerData.customerName, customerNo: customerData.customerNo}, deps2 || {encodeHtml})}

  function field(fieldDef, options) {
    return renderCustomerField(fieldDef, customerData, customerState, fieldDeps, options)
  }

  function sectionStatus(key) {
    return renderCustomerSectionStatus(key, customerData, customerState, {encodeHtml})
  }

  function sectionMeta(key) {
    return customerSectionMeta(key, customerData, customerState)
  }

  // --- section/body renderers (record-owned; not extracted further, same
  // "genuinely page-owned" reasoning Task 6 applied to callback-shaped
  // renderers with no config-declared generalization to lean on) ---

  function renderSectionBody(key, {CUSTOMER_SECTIONS}) {
    const section = CUSTOMER_SECTIONS[key]
    if (key === 'identity') {
      const photo = section.fields.find(item => item.type === 'photo')
      const linked = section.fields.find(item => item.key === 'linkedBeneficiaries')
      const identityFields = section.fields.filter(item => item !== photo && item.key !== 'linkedBeneficiaries')
      return `<div class="customer-identity-body"><div class="customer-identity-photo">${field(photo)}</div><div class="customer-field-grid">${identityFields.map(item => field(item)).join('')}${field(linked, {asCardToggle: true})}</div></div>`
    }
    if (section.type === 'subledgers') return renderSubLedgers()
    if (section.type === 'empty') {
      return `<div class="customer-empty-state"><svg width="28" height="28" aria-hidden="true"><use href="#i-user" /></svg><h3>No contact details to display</h3><p>The supplied reference does not define contact-detail fields.</p></div>`
    }
    return `<div class="customer-field-grid">${section.fields.map(item => field(item)).join('')}</div>`
  }

  function renderSubLedgers() {
    return `<div class="customer-table-toolbar">
      <button class="ibtn" type="button" aria-label="Add sub ledger" data-customer-action="add-sub-ledger"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus" /></svg></button>
      <div class="sp"></div>
      <label class="customer-table-search"><svg width="15" height="15" aria-hidden="true"><use href="#i-search" /></svg><input type="search" placeholder="Search" aria-label="Search sub ledgers"></label>
    </div>
    <div class="inv-grid-wrap">
      <table class="inv-grid customer-subledger-grid">
        <thead><tr><th>#</th><th>Sub Ledger Type</th><th>Number</th><th>Default</th><th>Deactivate</th></tr></thead>
        <tbody><tr><td colspan="5" class="customer-table-empty">No records to display</td></tr></tbody>
      </table>
      <div class="customer-table-pager">Display 0 to 0 from 0 inputs</div>
    </div>`
  }

  function renderIdentitySection(concept, sectionsDeps) {
    const {CUSTOMER_SECTIONS} = sectionsDeps
    const section = CUSTOMER_SECTIONS.identity
    const meta = sectionMeta('identity')
    const conceptAttribute = concept ? ` data-customer-concept="${encodeHtml(concept)}"` : ''
    return `<section class="customer-section customer-identity-section" data-customer-section="identity"${conceptAttribute} data-customer-has-errors="${meta.hasErrors}"><div class="customer-section-titlebar"><h2><span>${encodeHtml(section.title)}</span>${sectionStatus('identity')}</h2></div><div class="customer-section-body">${renderSectionBody('identity', sectionsDeps)}</div></section>`
  }

  function renderTabSection(key, sectionsDeps) {
    const meta = sectionMeta(key)
    return `<section class="customer-section customer-tab-section" data-customer-section="${encodeHtml(key)}" data-customer-has-errors="${meta.hasErrors}"><div class="customer-section-body">${renderSectionBody(key, sectionsDeps)}</div></section>`
  }

  function renderSection(key, sectionsDeps) {
    const {CUSTOMER_SECTIONS} = sectionsDeps
    const section = CUSTOMER_SECTIONS[key]
    const meta = sectionMeta(key)
    return `<section class="customer-section" data-customer-section="${encodeHtml(key)}" data-customer-has-errors="${meta.hasErrors}"><h2 class="customer-section-titlebar"><span>${encodeHtml(section.title)}</span>${sectionStatus(key)}</h2><div class="customer-section-body">${renderSectionBody(key, sectionsDeps)}</div></section>`
  }

  function renderCollapsible(key, concept, sectionsDeps) {
    const {CUSTOMER_SECTIONS} = sectionsDeps
    const section = CUSTOMER_SECTIONS[key]
    const expanded = customerState.expanded.has(key)
    const meta = sectionMeta(key)
    const bodyId = `customer-${concept}-${key}-body`
    return `<section class="customer-section" data-customer-section="${encodeHtml(key)}" data-customer-concept="${encodeHtml(concept)}" data-customer-has-errors="${meta.hasErrors}"><button class="customer-section-heading" type="button" data-customer-collapse="${encodeHtml(key)}" aria-controls="${encodeHtml(bodyId)}" aria-expanded="${expanded}"><span class="customer-section-label"><span>${encodeHtml(section.title)}</span>${sectionStatus(key)}</span><svg width="14" height="14" aria-hidden="true"><use href="#i-caret" /></svg></button><div class="customer-section-body" id="${encodeHtml(bodyId)}"${expanded ? '' : ' hidden'}>${renderSectionBody(key, sectionsDeps)}</div></section>`
  }

  function layoutRenderDeps({CUSTOMER_SECTIONS}) {
    return {
      encodeHtml,
      CUSTOMER_SECTION_ORDER,
      CUSTOMER_GUIDED_TABS,
      CUSTOMER_SECTIONS,
      renderCustomerIdentitySection: concept => renderIdentitySection(concept, {CUSTOMER_SECTIONS}),
      renderCustomerSectionStatus: sectionStatus,
      renderCustomerTabSection: key => renderTabSection(key, {CUSTOMER_SECTIONS}),
      renderCustomerSection: key => renderSection(key, {CUSTOMER_SECTIONS}),
      renderCustomerCollapsible: (key, concept) => renderCollapsible(key, concept, {CUSTOMER_SECTIONS}),
      renderCustomerSummaryBand: () => (typeof window.renderCustomerSummaryBand === 'function' ? window.renderCustomerSummaryBand() : ''),
    }
  }

  // --- chrome/footer ---

  function renderChrome({CUSTOMER_SECTIONS}) {
    const creating = customerState.mode === 'create'
    const editing = customerState.mode === 'edit' || creating
    const title = creating ? t('New Customer') : `${encodeHtml(customerData.customerNo)} · ${encodeHtml(customerData.customerName)}`
    const viewActions = `<button class="lbtn pri" type="button" data-customer-action="modify"><svg width="15" height="15" aria-hidden="true"><use href="#i-edit" /></svg> ${t('Modify')}</button><span class="vsep"></span><span class="newwrap menu"><button class="lbtn out main" type="button" data-customer-action="new"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus" /></svg> ${t('New')}</button><button class="car" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Other ways to create a customer"><svg width="11" height="11" aria-hidden="true"><use href="#i-caret" /></svg></button><div class="mlist mend" role="menu"><button role="menuitem" type="button" data-customer-action="add-from">${t('Add From')}</button><button role="menuitem" type="button" data-customer-action="new-tab">${t('Open in new tab')}</button></div></span><button class="lbtn out danger" type="button" data-customer-action="delete" disabled><svg width="15" height="15" aria-hidden="true"><use href="#i-trash" /></svg> ${t('Delete')}</button>`
    const editActions = `<button class="lbtn pri" type="button" data-customer-action="save"><svg width="15" height="15" aria-hidden="true"><use href="#i-save" /></svg> ${t('Save')}</button><button class="lbtn out" type="button" data-customer-action="undo"><svg width="15" height="15" aria-hidden="true"><use href="#i-undo" /></svg> ${t('Undo')}</button>`
    // THE null-root fix: refs.chrome was resolved once against `root` at
    // construction time (resolveRefs), never re-queried from `document`.
    refs.chrome.innerHTML = `
    <div class="arow customer-arow" role="toolbar" aria-label="Customer toolbar">
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('Record')} <svg width="12" height="12" aria-hidden="true"><use href="#i-caret" /></svg></button><div class="mlist" role="menu"><button role="menuitem" type="button" data-customer-action="new"><svg width="14" height="14" aria-hidden="true"><use href="#i-plus" /></svg> ${t('New')}</button><button role="menuitem" type="button" data-customer-action="add-from"><svg width="14" height="14" aria-hidden="true"><use href="#i-doc" /></svg> ${t('Add From')}</button><button role="menuitem" type="button" data-customer-action="modify"${editing ? ' disabled' : ''}><svg width="14" height="14" aria-hidden="true"><use href="#i-edit" /></svg> ${t('Modify')}</button><button role="menuitem" type="button" data-customer-action="delete"${editing ? ' disabled' : ''}><svg width="14" height="14" aria-hidden="true"><use href="#i-trash" /></svg> ${t('Delete')}</button><button role="menuitem" type="button" data-customer-action="search"><svg width="14" height="14" aria-hidden="true"><use href="#i-search" /></svg> ${t('Search')}</button></div></div>
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('Procedure')} <svg width="12" height="12" aria-hidden="true"><use href="#i-caret" /></svg></button><div class="mlist" role="menu"><button role="menuitem" type="button" data-customer-action="save"${editing ? '' : ' disabled'}><svg width="14" height="14" aria-hidden="true"><use href="#i-save" /></svg> ${t('Save')}</button><button role="menuitem" type="button" data-customer-action="lock"><svg width="14" height="14" aria-hidden="true"><use href="#i-lock" /></svg> ${t('Lock Screen')}</button><button role="menuitem" type="button" data-customer-action="reports"><svg width="14" height="14" aria-hidden="true"><use href="#i-doc" /></svg> ${t('Reports')}</button><button role="menuitem" type="button" data-customer-action="print"><svg width="14" height="14" aria-hidden="true"><use href="#i-print" /></svg> ${t('Print')}</button><button role="menuitem" type="button" data-customer-action="undo"${editing ? '' : ' disabled'}><svg width="14" height="14" aria-hidden="true"><use href="#i-undo" /></svg> ${t('Undo')}</button></div></div>
      <div class="menu"><button type="button" aria-haspopup="menu" aria-expanded="false">${t('More')} <svg width="12" height="12" aria-hidden="true"><use href="#i-caret" /></svg></button><div class="mlist" role="menu"><button role="menuitem" type="button" data-customer-action="parameters"><svg width="14" height="14" aria-hidden="true"><use href="#i-sliders" /></svg> ${t('Screen Parameters')}</button><button role="menuitem" type="button" data-customer-action="help"><svg width="14" height="14" aria-hidden="true"><use href="#i-help" /></svg> ${t('Help')}</button><hr /><button role="menuitem" type="button" class="dan" data-customer-action="deactivate"><svg width="14" height="14" aria-hidden="true"><use href="#i-lock" /></svg> ${customerData.deactivationFrom ? t('Activate') : t('Deactivate')}</button></div></div>
      <div class="sp"></div>
      <button type="button" class="lbtn" data-customer-action="accounts-movement"><svg width="15" height="15" aria-hidden="true"><use href="#i-flow" /></svg> ${t('Accounts Movement')}</button>
    </div>
    <div class="phead">
      <div class="l">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#">${t('Home')}</a><span class="sep">›</span><button class="customer-back" type="button">${t('Customers')}</button><span class="sep">›</span><span aria-current="page">${creating ? t('New') : t('All')}</span></nav>
        <div class="tline"><h1>${title}</h1><span class="badge ${customerData.deactivationFrom ? 'gray' : 'ok'}">${customerData.deactivationFrom ? t('Inactive') : t('Active')}</span></div>
      </div>
      <div class="r"><span class="recacts">${editing ? editActions : viewActions}</span></div>
    </div>`
    syncFooter()
  }

  function syncFooter() {
    const footer = refs.footer
    if (!footer) return
    const rowIndex = customerRows.findIndex(customer => customer.customerNo === customerData.customerNo)
    const position = Math.max(1, rowIndex + 1)
    const pager = footer.querySelector('.pager')
    const input = pager?.querySelector('.pg-i')
    const total = pager?.querySelector('.tot')
    if (total) total.textContent = `${t('of', 'of')} 72`
    const positionLabel = refs.footerPositionLabel
    const setPosition = value => {
      const next = Math.min(72, Math.max(1, Number(value) || 1))
      input.value = String(next)
      input.dataset.last = String(next)
      pager.querySelector('.pg-f').disabled = next === 1
      pager.querySelector('.pg-p').disabled = next === 1
      pager.querySelector('.pg-n').disabled = next === 72
      pager.querySelector('.pg-l').disabled = next === 72
      positionLabel.textContent = `${t('Record', 'Record')} ${next} ${t('of', 'of')} 72`
    }
    if (input && pager && positionLabel) {
      input.max = '72'
      pager.querySelector('.pg-f').onclick = () => setPosition(1)
      pager.querySelector('.pg-p').onclick = () => setPosition(Number(input.value) - 1)
      pager.querySelector('.pg-n').onclick = () => setPosition(Number(input.value) + 1)
      pager.querySelector('.pg-l').onclick = () => setPosition(72)
      input.onchange = () => setPosition(input.value)
      setPosition(position)
      const creating = customerState.mode === 'create'
      input.readOnly = creating
      if (creating) {
        pager.querySelectorAll('button').forEach(button => (button.disabled = true))
        positionLabel.textContent = 'New customer'
      }
    }
    const note = refs.footerNote
    if (note) {
      const message =
        customerState.mode === 'view'
          ? t('Saved customer. Choose Modify to edit.')
          : customerState.mode === 'create'
            ? t('New customer. Save when complete.')
            : t('Editing customer. Save or Undo your changes.')
      note.lastChild.textContent = ` ${message}`
    }
  }

  // --- layout rendering ---

  function renderLayout({focusSelector = '', preserveScroll = false} = {}, sectionsDeps) {
    const canvas = refs.canvas
    if (!canvas) return
    const scrollTop = canvas.scrollTop
    scrollNavigator?.stopTracking()
    const renderer = CUSTOMER_RENDERERS[customerState.layout] || renderCustomerGuided
    renderer(canvas, customerData, customerState, layoutRenderDeps(sectionsDeps))
    applyRecordValueDirections(canvas)
    if (preserveScroll) canvas.scrollTop = scrollTop
    if (customerState.layout === 'scroll') {
      requestAnimationFrame(() => scrollNavigator?.syncActiveSection())
    }
    if (focusSelector) {
      const target = canvas.querySelector(focusSelector)
      if (target) target.focus({preventScroll: true})
    }
  }

  function renderRecord(options, sectionsDeps) {
    renderChrome(sectionsDeps)
    renderLayout(options, sectionsDeps)
  }

  // sectionsDeps ({CUSTOMER_SECTIONS}) is threaded through every render call
  // rather than imported directly, mirroring fields.js's explicit-params
  // rule — record.js is the one place allowed to reach for the fixture
  // import since it owns the record's actual render orchestration.
  let sectionsDepsRef = null

  function render(options) {
    renderRecord(options, sectionsDepsRef)
  }

  function setMode(mode) {
    customerState.mode = mode
    customerState.dirty = false
    if (mode === 'view') customerState.errors.clear()
    if (refs.modeSelect) refs.modeSelect.value = mode
    if (active) render()
  }

  function setLayout(layout) {
    customerState.layout = layout
    if (active) renderLayout({preserveScroll: true}, sectionsDepsRef)
  }

  function saveCustomer() {
    if (!validateCustomerRecord(customerData, customerState)) {
      const firstError = CUSTOMER_SECTION_ORDER.flatMap(sectionKey =>
        sectionsDepsRef.CUSTOMER_SECTIONS[sectionKey].fields.map(f => ({field: f, sectionKey}))
      ).find(({field: f}) => customerState.errors.has(f.key))
      if (firstError) {
        customerState.expanded.add(firstError.sectionKey)
        if (
          customerState.layout === 'focused' ||
          customerState.layout === 'scroll' ||
          CUSTOMER_GUIDED_TABS.includes(firstError.sectionKey)
        ) {
          customerState.activeSection = firstError.sectionKey
        }
        render({focusSelector: `#customer-field-${firstError.field.key}`})
        refs.canvas.querySelector(`#customer-field-${firstError.field.key}`)?.scrollIntoView({block: 'center'})
      }
      toast({tone: 'bad', title: 'Complete the highlighted customer fields'})
      return false
    }
    customerSavedSnapshot = structuredClone(customerData)
    setMode('view')
    toast({tone: 'ok', title: 'Customer saved'})
    return true
  }

  function undoCustomer() {
    if (customerState.mode === 'create') {
      customerState.dirty = false
      showContentView('customers-list')
      return
    }
    customerData = structuredClone(customerSavedSnapshot)
    setMode('view')
  }

  function restoreView(previousMode) {
    if (previousMode !== 'create' && customerSavedSnapshot?.customerNo) {
      customerData = structuredClone(customerSavedSnapshot)
      customerState.customerNo = customerData.customerNo
      return
    }
    customerState.customerNo = customerReference.customerNo
    customerData = createSavedCustomerData(customerState.customerNo, customerRows, customerReference)
    customerSavedSnapshot = structuredClone(customerData)
  }

  const customerAtRisk = () => customerState.mode === 'create' || (customerState.mode === 'edit' && customerState.dirty)

  function askGuard(after, label) {
    guardAfter = after
    if (refs.guardMessage) {
      refs.guardMessage.textContent =
        customerState.mode === 'create' ? 'This customer has never been saved.' : 'This customer has changes that were never saved.'
    }
    if (refs.guardWhat) refs.guardWhat.textContent = `You were about to: ${label}.`
    refs.guardScrim?.classList.add('open')
    setTimeout(() => trapFocus(refs.guardScrim.querySelector('.guard')), 0)
  }

  function closeGuard() {
    refs.guardScrim?.classList.remove('open')
    releaseFocus()
  }

  function refreshSectionStatus(sectionKey, sectionsDeps) {
    const meta = sectionMeta(sectionKey)
    refs.canvas.querySelectorAll(`[data-customer-status="${sectionKey}"]`).forEach(status => {
      status.textContent = meta.hasErrors ? meta.text : ''
      status.hidden = !meta.hasErrors
      status.classList.toggle('is-error', meta.className === 'is-error')
    })
    refs.canvas.querySelectorAll(`[data-customer-section="${sectionKey}"]`).forEach(section => {
      section.dataset.customerHasErrors = String(meta.hasErrors)
    })
  }

  function refreshFieldError(control, fieldDef) {
    if (!customerState.errors.has(fieldDef.key)) return
    const message = validateCustomerField(fieldDef, customerData)
    if (message) customerState.errors.set(fieldDef.key, message)
    else customerState.errors.delete(fieldDef.key)
    const errorId = `${control.id}-error`
    let error = control.parentElement?.querySelector(`#${CSS.escape(errorId)}`)
    control.toggleAttribute('aria-invalid', Boolean(message))
    if (message) {
      control.setAttribute('aria-describedby', errorId)
      if (!error) {
        error = document.createElement('span')
        error.className = 'customer-field-error'
        error.id = errorId
        control.insertAdjacentElement('afterend', error)
      }
      error.textContent = message
    } else {
      control.removeAttribute('aria-describedby')
      error?.remove()
    }
  }

  function applyLookupValue(fieldKey, value) {
    customerData[fieldKey] = value
    customerState.dirty = true
    render({focusSelector: `#customer-field-${fieldKey}`, preserveScroll: true})
  }

  // --- wiring (registered once per activation, torn down on deactivate) ---

  function wire({CUSTOMER_SECTIONS}) {
    if (abortController) return
    abortController = new AbortController()
    const {signal} = abortController

    const updateField = event => {
      const control = event.target.closest('[data-customer-field]')
      if (!control) return
      const fieldKey = control.dataset.customerField
      customerData[fieldKey] = control.type === 'checkbox' ? control.checked : control.value
      customerState.dirty = true
      const sectionKey = customerSectionKeyForField(fieldKey)
      const fieldDef = CUSTOMER_SECTIONS[sectionKey]?.fields.find(item => item.key === fieldKey)
      if (fieldDef) refreshFieldError(control, fieldDef)
      if (sectionKey) refreshSectionStatus(sectionKey)
    }
    refs.canvas.addEventListener('input', updateField, {signal})
    refs.canvas.addEventListener('change', updateField, {signal})
    refs.canvas.addEventListener(
      'click',
      event => {
        const scrollLink = event.target.closest('[data-customer-scroll-section]')
        if (scrollLink) {
          scrollNavigator?.activateSection(scrollLink.dataset.customerScrollSection)
          return
        }
        const focusedLink = event.target.closest('[data-customer-focus-section]')
        if (focusedLink) {
          customerState.activeSection = focusedLink.dataset.customerFocusSection
          render({
            focusSelector: `[data-customer-focus-section="${customerState.activeSection}"]`,
            preserveScroll: true,
          })
          return
        }
        const tab = event.target.closest('[data-customer-tab]')
        if (tab) {
          customerState.activeSection = tab.dataset.customerTab
          render({
            focusSelector: `[data-customer-tab="${customerState.activeSection}"]`,
            preserveScroll: true,
          })
          return
        }
        const collapse = event.target.closest('[data-customer-collapse]')
        if (collapse) {
          const key = collapse.dataset.customerCollapse
          const expanded = !customerState.expanded.has(key)
          if (expanded) customerState.expanded.add(key)
          else customerState.expanded.delete(key)
          collapse.setAttribute('aria-expanded', String(expanded))
          collapse.nextElementSibling.hidden = !expanded
          if (customerState.layout === 'scroll') {
            requestAnimationFrame(() => scrollNavigator?.syncActiveSection())
          }
          return
        }
        const action = event.target.closest('[data-customer-action]')?.dataset.customerAction
        if (action === 'photo') toast({tone: 'ok', title: 'Photo selection is a prototype'})
        if (action === 'add-sub-ledger') toast({tone: 'ok', title: 'Adding a sub ledger is a prototype'})
      },
      {signal}
    )
    refs.canvas.addEventListener(
      'keydown',
      event => {
        if (
          scrollNavigator?.isNavigating() &&
          ['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', ' '].includes(event.key)
        ) {
          scrollNavigator.stopNavigation({interrupt: true})
        }
        const focusedLink = event.target.closest('[data-customer-focus-section]')
        const scrollLink = event.target.closest('[data-customer-scroll-section]')
        const tab = event.target.closest('[data-customer-tab]')
        const control = focusedLink || scrollLink || tab
        if (!control) return
        const controls = [
          ...control.parentElement.querySelectorAll(
            focusedLink ? '[data-customer-focus-section]' : scrollLink ? '[data-customer-scroll-section]' : '[data-customer-tab]'
          ),
        ]
        const vertical = focusedLink || scrollLink
        const previousKey = vertical ? 'ArrowUp' : 'ArrowLeft'
        const nextKey = vertical ? 'ArrowDown' : 'ArrowRight'
        if (!['Home', 'End', previousKey, nextKey].includes(event.key)) return
        event.preventDefault()
        const index = controls.indexOf(control)
        const nextIndex =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? controls.length - 1
              : event.key === previousKey
                ? (index - 1 + controls.length) % controls.length
                : (index + 1) % controls.length
        controls[nextIndex].click()
      },
      {signal}
    )
    refs.canvas.addEventListener(
      'wheel',
      () => {
        if (scrollNavigator?.isNavigating()) scrollNavigator.stopNavigation({interrupt: true})
      },
      {passive: true, signal}
    )
    refs.canvas.addEventListener(
      'touchstart',
      () => {
        if (scrollNavigator?.isNavigating()) scrollNavigator.stopNavigation({interrupt: true})
      },
      {passive: true, signal}
    )
    refs.chrome.addEventListener(
      'click',
      event => {
        if (event.target.closest('.customer-back')) {
          showContentView('customers-list')
          return
        }
        const actionButton = event.target.closest('[data-customer-action]')
        const action = actionButton?.dataset.customerAction
        if (action === 'new') deps.openCustomerRecord(null, 'create')
        if (action === 'modify') {
          customerSavedSnapshot = structuredClone(customerData)
          setMode('edit')
        }
        if (action === 'save') saveCustomer()
        if (action === 'undo') undoCustomer()
        if (action === 'search') deps.openCustomerSearch?.()
        if (action === 'print') deps.openPrintSettings?.(`${customerData.customerNo || 'New'}`)
        if (
          ['add-from', 'new-tab', 'delete', 'lock', 'reports', 'parameters', 'help', 'accounts-movement', 'deactivate'].includes(action)
        ) {
          toast({tone: 'ok', title: `${encodeHtml(actionButton.textContent.trim())} is a prototype`})
        }
        if (action) deps.closeAllMenus?.()
      },
      {signal}
    )
    if (refs.footer) {
      refs.footer.addEventListener(
        'click',
        event => {
          const action = event.target.closest('[data-customer-footer-action]')
          if (!action) return
          toast({tone: 'ok', title: `${encodeHtml(action.textContent.trim())} is a prototype`})
        },
        {signal}
      )
    }
    if (refs.modeSelect) {
      refs.modeSelect.addEventListener(
        'change',
        event => {
          const mode = event.target.value
          const previousMode = customerState.mode
          customerState.errors.clear()
          if (mode === 'create') {
            customerState.customerNo = ''
            customerData = createBlankCustomerData()
          }
          if (mode === 'edit') customerSavedSnapshot = structuredClone(customerData)
          if (mode === 'view') restoreView(previousMode)
          setMode(mode)
        },
        {signal}
      )
    }
    if (refs.layoutSelect) {
      refs.layoutSelect.addEventListener(
        'change',
        event => {
          setLayout(event.target.value)
        },
        {signal}
      )
    }
    let resizeFrame = 0
    window.addEventListener(
      'resize',
      () => {
        if (customerState.layout !== 'scroll' || root.hidden !== false) return
        cancelAnimationFrame(resizeFrame)
        resizeFrame = requestAnimationFrame(() => {
          scrollNavigator?.startSpy()
          scrollNavigator?.syncActiveSection()
        })
      },
      {signal}
    )
    if (refs.guardScrim) {
      document.getElementById('customer-g-stay')?.addEventListener(
        'click',
        () => {
          guardAfter = null
          closeGuard()
        },
        {signal}
      )
      document.getElementById('customer-g-discard')?.addEventListener(
        'click',
        () => {
          const after = guardAfter
          guardAfter = null
          customerState.dirty = false
          if (customerState.mode === 'edit') customerData = structuredClone(customerSavedSnapshot)
          closeGuard()
          after?.()
        },
        {signal}
      )
      document.getElementById('customer-g-save')?.addEventListener(
        'click',
        () => {
          const after = guardAfter
          if (!saveCustomer()) {
            guardAfter = null
            closeGuard()
            return
          }
          guardAfter = null
          closeGuard()
          after?.()
        },
        {signal}
      )
      refs.guardScrim.addEventListener(
        'click',
        event => {
          if (event.target === refs.guardScrim) document.getElementById('customer-g-stay')?.click()
        },
        {signal}
      )
    }
    document.addEventListener(
      'keydown',
      event => {
        if (event.key === 'Escape' && refs.guardScrim?.classList.contains('open')) {
          document.getElementById('customer-g-stay')?.click()
        }
      },
      {signal}
    )
    document.addEventListener(
      'click',
      event => {
        const destination = event.target.closest('.customer-back, .nc1-item, [data-label], .customer-record-view .pager button')
        if (root.hidden || !destination || !customerAtRisk()) return
        event.preventDefault()
        event.stopImmediatePropagation()
        const backToList = destination.classList.contains('customer-back')
        askGuard(
          () => {
            if (backToList) showContentView('customers-list')
            else destination.click()
          },
          backToList ? 'return to the Customers list' : 'leave this customer record'
        )
      },
      {signal, capture: true}
    )
  }

  function unwire() {
    abortController?.abort()
    abortController = null
  }

  function openRecord(customerNo, mode, sectionsDeps) {
    sectionsDepsRef = sectionsDeps
    customerState.mode = mode
    customerState.customerNo = customerNo || ''
    customerState.dirty = false
    customerState.errors.clear()
    customerState.activeSection = 'identity'
    customerData = mode === 'create' ? createBlankCustomerData() : createSavedCustomerData(customerNo, customerRows, customerReference)
    customerSavedSnapshot = structuredClone(customerData)
    if (refs.modeSelect) refs.modeSelect.value = mode
    if (active) render()
  }

  function activate({sectionsDeps} = {}) {
    if (sectionsDeps) sectionsDepsRef = sectionsDeps
    if (!active) {
      Object.assign(customerState, {expanded: new Set(Object.keys(sectionsDepsRef?.CUSTOMER_SECTIONS || {}))})
      imagePreview = imagePreview || createImagePreview({popover: refs.imagePopover})
      lookups =
        lookups ||
        createLookups({
          refs: {
            recordCanvas: refs.canvas,
            lookupMenu: refs.lookupMenu,
            unitLookupMenu: refs.unitLookupMenu,
            lookupSearchScrim: refs.lookupSearchScrim,
            typeAddScrim: refs.typeAddScrim,
            unitDrawerScrim: refs.unitDrawerScrim,
            parentUnitDrawerScrim: refs.parentUnitDrawerScrim,
            locationAddScrim: refs.locationAddScrim,
          },
          deps: {encodeHtml, trapFocus, releaseFocus, applyLookupValue, lookupResults, unitRows, toast},
        })
      scrollNavigator = createScrollNavigator({root: refs.canvas, sectionOrder: CUSTOMER_SECTION_ORDER, customerState})
      active = true
    }
    wire(sectionsDepsRef)
    render()
  }

  function deactivate() {
    unwire()
    scrollNavigator?.stopTracking()
  }

  function dispose() {
    deactivate()
    imagePreview?.dispose()
    lookups?.dispose()
    imagePreview = null
    lookups = null
    scrollNavigator = null
    active = false
  }

  return {
    id: 'customer-record',
    roots: {root, canvas: refs.canvas},
    activate,
    deactivate,
    dispose,
    setMode,
    setLayout,
    openRecord,
    saveCustomer,
    undoCustomer,
    askGuard,
    closeGuard,
    getModel: () => ({customerData, customerState}),
  }
}
