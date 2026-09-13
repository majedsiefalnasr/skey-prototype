// Customer lookup menus (field lookup + nested unit-drawer lookup),
// advanced search, and the nested unit/parent-unit/type-add/location-add
// drawers — moved out of concepts/app/legacy-app.js as part of Task 7.
//
// `createLookups({refs, deps})` owns this behavior as one factory (same
// shape as Task 6's `createContextMenu`/this file's sibling
// `createImagePreview`): it wires its own event listeners once, closes
// over its own `customerLookupState` (the original module-level mutable
// object), and exposes the small set of imperative entry points
// record.js needs (`openLookupMenu`, `openUnitDrawer` for the
// hierarchy-picker "Add Operation Unit" trigger, `dispose`).
//
// `refs` bundles the DOM elements this behavior touches. All of them are
// the SAME page-wide singleton overlay elements the original used
// (#customer-lookup-menu, #customer-lookup-search-scrim, the unit/parent-
// unit/type-add/location-add drawer scrims) — these are not customer-
// record-root-scoped in the original HTML (they're sibling overlay
// scrims, not nested inside `.customer-record-view`), so this module
// keeps querying them directly via `refs`, same as before. The one
// genuinely root-scoped element is `customerRecordCanvas`
// (`#customer-record-canvas`), which the original queried once at
// startup — `refs.recordCanvas` here — since that IS the record page's
// own root and lookup triggers only ever live inside it.
//
// `deps.applyLookupValue(fieldKey, value)` is the callback record.js
// supplies to actually write a chosen value into `customerData` and
// re-render — this module never touches `customerData`/`customerState`
// directly, keeping "shared picker coordination through callbacks" (per
// the brief) rather than reaching into the record's mutable state itself.

export const CUSTOMER_LOOKUP_LABELS = {
  operationUnit: 'Operation Unit',
  customerType: 'Customer Type',
  unitParent: 'Parent Unit',
  unitLocation: 'Geo. Location',
}

export const CUSTOMER_MATCH_LABELS = {
  contains: 'Contains',
  starts: 'Starts with',
  ends: 'Ends with',
}

function customerLookupMatches(value, query, mode) {
  const candidate = value.toLocaleLowerCase()
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return true
  if (mode === 'starts') return candidate.startsWith(needle)
  if (mode === 'ends') return candidate.endsWith(needle)
  return candidate.includes(needle)
}

/**
 * @param {object} refs DOM elements: recordCanvas, lookupMenu,
 * unitLookupMenu, lookupSearchScrim, typeAddScrim, unitDrawerScrim,
 * parentUnitDrawerScrim, locationAddScrim
 * @param {object} deps {encodeHtml, trapFocus, releaseFocus,
 * trapCustomerLayer, releaseCustomerLayer, applyLookupValue,
 * lookupResults (CUSTOMER_LOOKUP_RESULTS), unitRows (UNIT_ROWS)}
 * @returns {{openLookupMenu: Function, openUnitDrawer: Function, dispose: Function}}
 */
export function createLookups({refs, deps}) {
  const {
    recordCanvas,
    lookupMenu,
    unitLookupMenu,
    lookupSearchScrim,
    typeAddScrim,
    unitDrawerScrim,
    parentUnitDrawerScrim,
    locationAddScrim,
  } = refs
  const {encodeHtml, trapFocus, releaseFocus, applyLookupValue, lookupResults, unitRows} = deps

  const state = {
    fieldKey: '',
    trigger: null,
    source: 'customer',
    targetSelectId: '',
    selectedValue: '',
    matchModes: {
      operationUnit: 'contains',
      customerType: 'contains',
      unitParent: 'contains',
      unitLocation: 'contains',
    },
  }
  const layerFocusStack = []

  function trapLayer(box) {
    if (!box) return
    layerFocusStack.push(document.activeElement)
    trapFocus(box)
  }

  function releaseLayer() {
    layerFocusStack.pop()
    const returnTo = parentUnitDrawerScrim.classList.contains('open')
      ? parentUnitDrawerScrim.querySelector('.customer-unit-drawer')
      : unitDrawerScrim.classList.contains('open')
        ? unitDrawerScrim.querySelector('.customer-unit-drawer')
        : null
    if (returnTo && document.contains(returnTo)) returnTo.focus()
    else releaseFocus()
  }

  function closeLookupMenu({restoreFocus = false} = {}) {
    if (lookupMenu.hidden) return
    lookupMenu.hidden = true
    state.trigger?.setAttribute('aria-expanded', 'false')
    if (restoreFocus && document.contains(state.trigger)) state.trigger.focus()
  }

  function closeUnitLookupMenu({restoreFocus = false} = {}) {
    if (unitLookupMenu.hidden) return
    unitLookupMenu.hidden = true
    state.trigger?.setAttribute('aria-expanded', 'false')
    if (restoreFocus && document.contains(state.trigger)) state.trigger.focus()
  }

  function positionMenu(trigger, menu) {
    const rect = trigger.getBoundingClientRect()
    const menuWidth = 252
    const menuHeight = menu.offsetHeight || 250
    const edge = 8
    const preferredLeft = document.documentElement.dir === 'rtl' ? rect.right - menuWidth : rect.left
    const left = Math.min(innerWidth - menuWidth - edge, Math.max(edge, preferredLeft))
    const fitsBelow = rect.bottom + 4 + menuHeight <= innerHeight - edge
    const top = fitsBelow ? rect.bottom + 4 : Math.max(edge, rect.top - menuHeight - 4)
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
  }

  function renderLookupMenu(fieldKey) {
    const matchMode = state.matchModes[fieldKey]
    const addLabel =
      fieldKey === 'operationUnit'
        ? 'Add Operation Unit'
        : fieldKey === 'unitParent'
          ? 'Add Parent Unit'
          : fieldKey === 'unitLocation'
            ? 'Add Geo. Location'
            : 'Add Customer Type'
    lookupMenu.innerHTML = `
            <div class="customer-lookup-menu-label">Search options</div>
            ${Object.entries(CUSTOMER_MATCH_LABELS)
              .map(
                ([key, label]) =>
                  `<button type="button" role="menuitemradio" aria-checked="${key === matchMode}" data-customer-lookup-match="${encodeHtml(key)}"><span>${encodeHtml(label)}</span>${key === matchMode ? '<svg class="customer-lookup-check" width="15" height="15" aria-hidden="true"><use href="#i-check" /></svg>' : ''}</button>`
              )
              .join('')}
            <hr />
            <button type="button" role="menuitem" data-customer-lookup-action="search"><svg width="15" height="15" aria-hidden="true"><use href="#i-search" /></svg><span>Advanced search</span></button>
            <button type="button" role="menuitem" data-customer-lookup-action="add"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus" /></svg><span>${encodeHtml(addLabel)}</span></button>`
  }

  function openLookupMenu(trigger) {
    closeLookupMenu()
    closeUnitLookupMenu()
    state.fieldKey = trigger.dataset.customerLookup
    state.trigger = trigger
    state.source = 'customer'
    state.targetSelectId = ''
    renderLookupMenu(state.fieldKey)
    lookupMenu.hidden = false
    trigger.setAttribute('aria-expanded', 'true')
    positionMenu(trigger, lookupMenu)
    lookupMenu.querySelector('button')?.focus()
  }

  function openUnitLookupMenu(trigger) {
    closeUnitLookupMenu()
    state.fieldKey = trigger.dataset.customerUnitLookup
    state.trigger = trigger
    state.source = 'unit'
    state.targetSelectId = trigger.dataset.customerUnitTarget
    renderLookupMenu(state.fieldKey)
    unitLookupMenu.innerHTML = lookupMenu.innerHTML
    unitLookupMenu.hidden = false
    trigger.setAttribute('aria-expanded', 'true')
    positionMenu(trigger, unitLookupMenu)
    unitLookupMenu.querySelector('button')?.focus()
  }

  function renderLookupSearchResults() {
    const fieldKey = state.fieldKey
    const query = document.getElementById('customer-lookup-search-query').value
    const mode = document.getElementById('customer-lookup-search-mode').value
    const status = document.getElementById('customer-lookup-filter-status')?.value || 'all'
    const country = document.getElementById('customer-lookup-filter-country')?.value || 'all'
    const parent = document.getElementById('customer-lookup-filter-parent')?.value || 'all'
    const type = document.getElementById('customer-lookup-filter-type')?.value || 'all'
    const level = document.getElementById('customer-lookup-filter-level')?.value || 'all'
    const sort = document.getElementById('customer-lookup-filter-sort')?.value || 'name-asc'
    const sourceResults = fieldKey === 'unitParent' ? lookupResults.operationUnit : lookupResults[fieldKey]
    const results = sourceResults
      .filter(item => {
        const searchable =
          fieldKey === 'operationUnit' || fieldKey === 'unitParent'
            ? `${item.value} ${item.code} ${item.parent} ${item.country}`
            : fieldKey === 'unitLocation'
              ? `${item.value} ${item.code} ${item.parent} ${item.level} ${item.type}`
              : `${item.value} ${item.details} ${item.order}`
        return (
          customerLookupMatches(searchable, query, mode) &&
          (status === 'all' || item.status.toLowerCase() === status) &&
          (country === 'all' || item.country === country) &&
          (parent === 'all' || item.parent === parent) &&
          (type === 'all' || item.type === type) &&
          (level === 'all' || item.level === level)
        )
      })
      .sort((a, b) => {
        if (sort === 'name-desc') return b.value.localeCompare(a.value)
        if (sort === 'order-asc') return Number(a.order) - Number(b.order)
        if (sort === 'code-asc') return Number(a.code) - Number(b.code)
        return a.value.localeCompare(b.value)
      })
    document.getElementById('customer-lookup-result-count').textContent =
      `${results.length} ${results.length === 1 ? 'result' : 'results'}`
    if (!results.some(item => item.value === state.selectedValue)) {
      state.selectedValue = ''
    }
    const resultBox = document.getElementById('customer-lookup-search-results')
    if (!results.length) {
      resultBox.innerHTML = `<div class="customer-lookup-empty"><strong>No results found</strong><br />Try another term or clear a filter.</div>`
      document.getElementById('customer-lookup-select').disabled = true
      state.selectedValue = ''
      return
    }
    const headings =
      fieldKey === 'operationUnit' || fieldKey === 'unitParent'
        ? '<th>Operation Unit</th><th>Parent</th><th>Country</th><th>Status</th>'
        : fieldKey === 'unitLocation'
          ? '<th>Location</th><th>Code</th><th>Type</th><th>Level</th>'
          : '<th>Customer Type</th><th>Remarks</th><th>Order</th><th>Status</th>'
    const rows = results
      .map(item => {
        const selected = item.value === state.selectedValue
        const cells =
          fieldKey === 'operationUnit' || fieldKey === 'unitParent'
            ? `<td>${encodeHtml(item.value)}</td><td>${encodeHtml(item.parent)}</td><td>${encodeHtml(item.country)}</td><td><span class="badge ${item.status === 'Active' ? 'ok' : 'gray'}">${encodeHtml(item.status)}</span></td>`
            : fieldKey === 'unitLocation'
              ? `<td>${encodeHtml(item.value)}</td><td>${encodeHtml(item.code)}</td><td>${encodeHtml(item.type)}</td><td>${encodeHtml(item.level)}</td>`
              : `<td>${encodeHtml(item.value)}</td><td>${encodeHtml(item.details)}</td><td>${encodeHtml(item.order)}</td><td><span class="badge ${item.status === 'Active' ? 'ok' : 'gray'}">${encodeHtml(item.status)}</span></td>`
        return `<tr tabindex="0" aria-selected="${selected}" data-customer-lookup-value="${encodeHtml(item.value)}">${cells}</tr>`
      })
      .join('')
    resultBox.innerHTML = `<table><thead><tr>${headings}</tr></thead><tbody>${rows}</tbody></table>`
    document.getElementById('customer-lookup-select').disabled = !state.selectedValue
  }

  function openLookupSearch(fieldKey) {
    state.fieldKey = fieldKey
    state.selectedValue = ''
    const label = CUSTOMER_LOOKUP_LABELS[fieldKey]
    document.getElementById('customer-lookup-search-title').textContent = `Find ${label}`
    document.getElementById('customer-lookup-search-description').textContent =
      `Search and compare ${label.toLowerCase()} records before selecting one.`
    const query = document.getElementById('customer-lookup-search-query')
    query.value = ''
    query.placeholder = `Search ${label.toLowerCase()}`
    const mode = document.getElementById('customer-lookup-search-mode')
    mode.value = state.matchModes[fieldKey]
    document.getElementById('customer-lookup-search-filters').innerHTML = `
            <label class="rec-field"><span>Status</span><select id="customer-lookup-filter-status"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            ${
              fieldKey === 'operationUnit' || fieldKey === 'unitParent'
                ? '<label class="rec-field"><span>Country</span><select id="customer-lookup-filter-country"><option value="all">All countries</option><option>EG - Egypt</option><option>SA - Saudi Arabia</option><option>AE - United Arab Emirates</option></select></label><label class="rec-field"><span>Parent Unit</span><select id="customer-lookup-filter-parent"><option value="all">All parent units</option><option>Head Office</option><option value="No parent">No parent</option></select></label>'
                : fieldKey === 'unitLocation'
                  ? '<label class="rec-field"><span>Type</span><select id="customer-lookup-filter-type"><option value="all">All types</option><option>Country</option><option>Governorate</option><option>City</option><option>District</option></select></label><label class="rec-field"><span>Level</span><select id="customer-lookup-filter-level"><option value="all">All levels</option><option>1</option><option>2</option><option>3</option></select></label>'
                  : ''
            }
            <label class="rec-field"><span>Sort by</span><select id="customer-lookup-filter-sort">${
              fieldKey === 'operationUnit' || fieldKey === 'unitParent'
                ? '<option value="name-asc">Name, A to Z</option><option value="name-desc">Name, Z to A</option><option value="code-asc">Unit code</option>'
                : fieldKey === 'unitLocation'
                  ? '<option value="name-asc">Name, A to Z</option><option value="name-desc">Name, Z to A</option><option value="code-asc">Location code</option>'
                  : '<option value="name-asc">Name, A to Z</option><option value="name-desc">Name, Z to A</option><option value="order-asc">Display order</option>'
            }</select></label>`
    document.getElementById('customer-lookup-select').disabled = true
    renderLookupSearchResults()
    lookupSearchScrim.classList.toggle('is-over-drawer', state.source === 'unit')
    lookupSearchScrim.classList.add('open')
    if (state.source === 'unit') trapLayer(lookupSearchScrim.querySelector('.customer-modal'))
    else trapFocus(lookupSearchScrim.querySelector('.customer-modal'))
    requestAnimationFrame(() => query.focus())
  }

  function closeLookupSearch() {
    const overDrawer = lookupSearchScrim.classList.contains('is-over-drawer')
    lookupSearchScrim.classList.remove('open')
    lookupSearchScrim.classList.remove('is-over-drawer')
    if (overDrawer) releaseLayer()
    else releaseFocus()
  }

  function applyLookupValueInternal(fieldKey, value) {
    if (state.source === 'unit') {
      const select = document.getElementById(state.targetSelectId)
      if (!select) return
      if (![...select.options].some(option => option.value === value)) {
        select.add(new Option(value, value))
      }
      select.value = value
      select.dispatchEvent(new Event('change', {bubbles: true}))
      return
    }
    applyLookupValue(fieldKey, value)
  }

  function openTypeAdd() {
    document.getElementById('customer-type-name').value = ''
    document.getElementById('customer-type-order').value = '10'
    document.getElementById('customer-type-deactivate').checked = false
    document.getElementById('customer-type-remarks').value = ''
    document.getElementById('customer-type-name-error').hidden = true
    typeAddScrim.classList.add('open')
    trapFocus(typeAddScrim.querySelector('.customer-modal'))
    requestAnimationFrame(() => document.getElementById('customer-type-name').focus())
  }

  function closeTypeAdd() {
    typeAddScrim.classList.remove('open')
    releaseFocus()
  }

  function setUnitTab(tabKey, {focus = false} = {}) {
    unitDrawerScrim.querySelectorAll('[data-customer-unit-tab]').forEach(tab => {
      const active = tab.dataset.customerUnitTab === tabKey
      tab.setAttribute('aria-selected', String(active))
      tab.classList.toggle('on', active)
      tab.tabIndex = active ? 0 : -1
      if (active && focus) tab.focus()
    })
    unitDrawerScrim.querySelectorAll('[data-customer-unit-panel]').forEach(panel => {
      panel.hidden = panel.dataset.customerUnitPanel !== tabKey
    })
  }

  function openUnitDrawer() {
    document.getElementById('customer-unit-name').value = ''
    document.getElementById('customer-unit-financial').value = '1'
    document.getElementById('customer-unit-affected').checked = false
    const parentSelect = document.getElementById('customer-unit-parent')
    parentSelect.innerHTML =
      '<option value="">No parent unit</option>' +
      unitRows
        .map(unit => {
          const label = `${unit.code} - ${unit.name}`
          return `<option value="${encodeHtml(label)}">${encodeHtml(label)}</option>`
        })
        .join('')
    document.getElementById('customer-unit-name-error').hidden = true
    unitDrawerScrim.classList.remove('is-page')
    const openPageButton = unitDrawerScrim.querySelector('.customer-unit-open-page')
    openPageButton.setAttribute('aria-pressed', 'false')
    openPageButton.setAttribute('aria-label', 'Open in new tab')
    openPageButton.querySelector('span').textContent = 'Open in new tab'
    openPageButton.title = 'Open in new tab'
    document.getElementById('customer-unit-drawer-description').textContent =
      'Create the unit here, then use it on this customer.'
    setUnitTab('address')
    unitDrawerScrim.classList.add('open')
    trapFocus(unitDrawerScrim.querySelector('.customer-unit-drawer'))
    requestAnimationFrame(() => document.getElementById('customer-unit-name').focus())
  }

  function closeUnitDrawer() {
    closeUnitLookupMenu()
    if (locationAddScrim.classList.contains('open')) closeLocationAdd()
    if (parentUnitDrawerScrim.classList.contains('open')) closeParentUnitDrawer()
    unitDrawerScrim.classList.remove('open')
    unitDrawerScrim.classList.remove('is-page')
    releaseFocus()
  }

  function openParentUnitDrawer() {
    document.getElementById('customer-parent-unit-name').value = ''
    document.getElementById('customer-parent-unit-financial').value = '1'
    document.getElementById('customer-parent-unit-affected').checked = false
    document.getElementById('customer-parent-unit-name-error').hidden = true
    document.getElementById('customer-parent-unit-name').removeAttribute('aria-invalid')
    parentUnitDrawerScrim.classList.add('open')
    trapLayer(parentUnitDrawerScrim.querySelector('.customer-nested-unit-drawer'))
    requestAnimationFrame(() => document.getElementById('customer-parent-unit-name').focus())
  }

  function closeParentUnitDrawer() {
    closeUnitLookupMenu()
    parentUnitDrawerScrim.classList.remove('open')
    releaseLayer()
  }

  function openLocationAdd() {
    ;['code', 'name'].forEach(key => {
      const input = document.getElementById(`customer-location-${key}`)
      const error = document.getElementById(`customer-location-${key}-error`)
      input.value = ''
      input.removeAttribute('aria-invalid')
      input.removeAttribute('aria-describedby')
      error.hidden = true
    })
    document.getElementById('customer-location-parent').value = ''
    document.getElementById('customer-location-level').value = '1'
    document.getElementById('customer-location-type').value = 'Country'
    document.getElementById('customer-location-remarks').value = ''
    locationAddScrim.classList.add('open')
    trapLayer(locationAddScrim.querySelector('.customer-location-modal'))
    requestAnimationFrame(() => document.getElementById('customer-location-code').focus())
  }

  function closeLocationAdd() {
    locationAddScrim.classList.remove('open')
    releaseLayer()
  }

  // --- event wiring (registered once, matching the original) ---

  const onRecordCanvasClick = event => {
    const trigger = event.target.closest('[data-customer-lookup]')
    if (!trigger || trigger.disabled) return
    if (!lookupMenu.hidden && state.trigger === trigger) {
      closeLookupMenu({restoreFocus: true})
      return
    }
    openLookupMenu(trigger)
  }
  recordCanvas.addEventListener('click', onRecordCanvasClick)

  const onUnitLookupTriggerClick = event => {
    const trigger = event.target.closest('[data-customer-unit-lookup]')
    if (!trigger || trigger.disabled) return
    if (!unitLookupMenu.hidden && state.trigger === trigger) {
      closeUnitLookupMenu({restoreFocus: true})
      return
    }
    openUnitLookupMenu(trigger)
  }
  document.addEventListener('click', onUnitLookupTriggerClick)

  const onLookupMenuClick = event => {
    const match = event.target.closest('[data-customer-lookup-match]')
    if (match) {
      state.matchModes[state.fieldKey] = match.dataset.customerLookupMatch
      closeLookupMenu({restoreFocus: true})
      return
    }
    const action = event.target.closest('[data-customer-lookup-action]')?.dataset.customerLookupAction
    if (!action) return
    const fieldKey = state.fieldKey
    const returnTrigger = state.trigger
    closeLookupMenu()
    if (returnTrigger && document.contains(returnTrigger)) returnTrigger.focus({preventScroll: true})
    if (action === 'search') openLookupSearch(fieldKey)
    if (action === 'add') {
      if (fieldKey === 'operationUnit') openUnitDrawer()
      else openTypeAdd()
    }
  }
  lookupMenu.addEventListener('click', onLookupMenuClick)

  const onLookupMenuKeydown = event => {
    const items = [...lookupMenu.querySelectorAll('button')]
    const index = items.indexOf(document.activeElement)
    if (event.key === 'Escape') {
      event.preventDefault()
      closeLookupMenu({restoreFocus: true})
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (index + 1) % items.length
            : (index - 1 + items.length) % items.length
    items[nextIndex].focus()
  }
  lookupMenu.addEventListener('keydown', onLookupMenuKeydown)

  const onUnitLookupMenuClick = event => {
    const match = event.target.closest('[data-customer-lookup-match]')
    if (match) {
      state.matchModes[state.fieldKey] = match.dataset.customerLookupMatch
      closeUnitLookupMenu({restoreFocus: true})
      return
    }
    const action = event.target.closest('[data-customer-lookup-action]')?.dataset.customerLookupAction
    if (!action) return
    const fieldKey = state.fieldKey
    const returnTrigger = state.trigger
    closeUnitLookupMenu()
    if (returnTrigger && document.contains(returnTrigger)) returnTrigger.focus({preventScroll: true})
    if (action === 'search') openLookupSearch(fieldKey)
    if (action === 'add') {
      if (fieldKey === 'unitParent') openParentUnitDrawer()
      if (fieldKey === 'unitLocation') openLocationAdd()
    }
  }
  unitLookupMenu.addEventListener('click', onUnitLookupMenuClick)

  const onUnitLookupMenuKeydown = event => {
    const items = [...unitLookupMenu.querySelectorAll('button')]
    const index = items.indexOf(document.activeElement)
    if (event.key === 'Escape') {
      event.preventDefault()
      closeUnitLookupMenu({restoreFocus: true})
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (index + 1) % items.length
            : (index - 1 + items.length) % items.length
    items[nextIndex].focus()
  }
  unitLookupMenu.addEventListener('keydown', onUnitLookupMenuKeydown)

  const onOutsideClick = event => {
    if (
      !lookupMenu.hidden &&
      !event.target.closest('#customer-lookup-menu') &&
      !event.target.closest('[data-customer-lookup]')
    ) {
      closeLookupMenu()
    }
    if (
      !unitLookupMenu.hidden &&
      !event.target.closest('#customer-unit-lookup-menu') &&
      !event.target.closest('[data-customer-unit-lookup]')
    ) {
      closeUnitLookupMenu()
    }
  }
  document.addEventListener('click', onOutsideClick)

  const onSearchInput = renderLookupSearchResults
  lookupSearchScrim.addEventListener('input', onSearchInput)

  const onSearchChange = event => {
    if (event.target.id === 'customer-lookup-search-mode') {
      state.matchModes[state.fieldKey] = event.target.value
    }
    renderLookupSearchResults()
  }
  lookupSearchScrim.addEventListener('change', onSearchChange)

  const onSearchClick = event => {
    if (event.target.closest('#customer-lookup-clear-filters')) {
      document.getElementById('customer-lookup-search-query').value = ''
      document.getElementById('customer-lookup-search-mode').value = 'contains'
      state.matchModes[state.fieldKey] = 'contains'
      lookupSearchScrim.querySelectorAll('#customer-lookup-search-filters select').forEach(select => {
        select.selectedIndex = 0
      })
      state.selectedValue = ''
      renderLookupSearchResults()
      document.getElementById('customer-lookup-search-query').focus()
      return
    }
    const row = event.target.closest('[data-customer-lookup-value]')
    if (row) {
      state.selectedValue = row.dataset.customerLookupValue
      lookupSearchScrim
        .querySelectorAll('[data-customer-lookup-value]')
        .forEach(item => item.setAttribute('aria-selected', String(item === row)))
      document.getElementById('customer-lookup-select').disabled = false
    }
    if (event.target === lookupSearchScrim || event.target.closest('.customer-lookup-search-close')) {
      closeLookupSearch()
    }
  }
  lookupSearchScrim.addEventListener('click', onSearchClick)

  const onSearchKeydown = event => {
    const row = event.target.closest('[data-customer-lookup-value]')
    if (row && event.key === 'Enter') {
      event.preventDefault()
      row.click()
      return
    }
    if (row && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault()
      const rows = [...lookupSearchScrim.querySelectorAll('[data-customer-lookup-value]')]
      const index = rows.indexOf(row)
      const next = event.key === 'ArrowDown' ? Math.min(rows.length - 1, index + 1) : Math.max(0, index - 1)
      rows[next].focus()
    }
  }
  lookupSearchScrim.addEventListener('keydown', onSearchKeydown)

  const onSearchDblclick = event => {
    const row = event.target.closest('[data-customer-lookup-value]')
    if (!row) return
    row.click()
    document.getElementById('customer-lookup-select').click()
  }
  lookupSearchScrim.addEventListener('dblclick', onSearchDblclick)

  const lookupSelectButton = document.getElementById('customer-lookup-select')
  const onLookupSelectClick = () => {
    if (!state.selectedValue) return
    const fieldKey = state.fieldKey
    const value = state.selectedValue
    closeLookupSearch()
    applyLookupValueInternal(fieldKey, value)
  }
  lookupSelectButton.addEventListener('click', onLookupSelectClick)

  const onTypeAddScrimClick = event => {
    if (event.target === typeAddScrim || event.target.closest('.customer-type-add-close')) {
      closeTypeAdd()
    }
  }
  typeAddScrim.addEventListener('click', onTypeAddScrimClick)

  return {
    openLookupMenu,
    openUnitLookupMenu,
    openUnitDrawer,
    openParentUnitDrawer,
    openLocationAdd,
    openTypeAdd,
    closeUnitDrawer,
    setUnitTab,
    trapLayer,
    releaseLayer,
    dispose() {
      recordCanvas.removeEventListener('click', onRecordCanvasClick)
      document.removeEventListener('click', onUnitLookupTriggerClick)
      lookupMenu.removeEventListener('click', onLookupMenuClick)
      lookupMenu.removeEventListener('keydown', onLookupMenuKeydown)
      unitLookupMenu.removeEventListener('click', onUnitLookupMenuClick)
      unitLookupMenu.removeEventListener('keydown', onUnitLookupMenuKeydown)
      document.removeEventListener('click', onOutsideClick)
      lookupSearchScrim.removeEventListener('input', onSearchInput)
      lookupSearchScrim.removeEventListener('change', onSearchChange)
      lookupSearchScrim.removeEventListener('click', onSearchClick)
      lookupSearchScrim.removeEventListener('keydown', onSearchKeydown)
      lookupSearchScrim.removeEventListener('dblclick', onSearchDblclick)
      lookupSelectButton.removeEventListener('click', onLookupSelectClick)
      typeAddScrim.removeEventListener('click', onTypeAddScrimClick)
    },
  }
}
