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
//
// Also owns the four drawers' own Save buttons (type-add/unit-drawer/
// parent-unit-drawer/location-add), since those write into
// `deps.lookupResults` (CUSTOMER_LOOKUP_RESULTS) and then call back into
// this module's own `applyLookupValueInternal` — genuinely lookup-owned,
// not record-owned. `deps.toast` is the page-wide toast facility these save
// handlers use for confirmation messages. A document-wide Escape listener
// closes whichever of this module's own four drawers/dialogs is open even
// when focus sits on a plain button inside them (not one of the elements
// with their own keydown handler) — scoped to only this module's overlays;
// geo/kanban/export overlays keep their own Escape handling in
// legacy-app.js.

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
  const {encodeHtml, trapFocus, releaseFocus, applyLookupValue, lookupResults, unitRows, toast} = deps

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
            <div class="customer-lookup-menu-label [padding:6px_8px_4px] text-muted text-xs font-semibold">Search options</div>
            ${Object.entries(CUSTOMER_MATCH_LABELS)
              .map(
                ([key, label]) =>
                  `<button type="button" role="menuitemradio" aria-checked="${key === matchMode}" data-customer-lookup-match="${encodeHtml(key)}"><span>${encodeHtml(label)}</span>${key === matchMode ? '<svg class="customer-lookup-check ms-auto! text-accent" width="15" height="15" aria-hidden="true"><use href="#i-check" /></svg>' : ''}</button>`
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
      resultBox.innerHTML = `<div class="customer-lookup-empty [padding:28px_16px] text-muted text-center"><strong>No results found</strong><br />Try another term or clear a filter.</div>`
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
            <label class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0"><span>Status</span><select id="customer-lookup-filter-status"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            ${
              fieldKey === 'operationUnit' || fieldKey === 'unitParent'
                ? '<label class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0"><span>Country</span><select id="customer-lookup-filter-country"><option value="all">All countries</option><option>EG - Egypt</option><option>SA - Saudi Arabia</option><option>AE - United Arab Emirates</option></select></label><label class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0"><span>Parent Unit</span><select id="customer-lookup-filter-parent"><option value="all">All parent units</option><option>Head Office</option><option value="No parent">No parent</option></select></label>'
                : fieldKey === 'unitLocation'
                  ? '<label class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0"><span>Type</span><select id="customer-lookup-filter-type"><option value="all">All types</option><option>Country</option><option>Governorate</option><option>City</option><option>District</option></select></label><label class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0"><span>Level</span><select id="customer-lookup-filter-level"><option value="all">All levels</option><option>1</option><option>2</option><option>3</option></select></label>'
                  : ''
            }
            <label class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0"><span>Sort by</span><select id="customer-lookup-filter-sort">${
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
    if (state.source === 'unit') trapLayer(lookupSearchScrim.querySelector('.dlg'))
    else trapFocus(lookupSearchScrim.querySelector('.dlg'))
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
    trapFocus(typeAddScrim.querySelector('.dlg'))
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

  const typeAddSaveButton = document.getElementById('customer-type-add-save')
  const onTypeAddSaveClick = () => {
    const nameInput = document.getElementById('customer-type-name')
    const name = nameInput.value.trim()
    const error = document.getElementById('customer-type-name-error')
    if (!name) {
      error.textContent = 'Name is required.'
      error.hidden = false
      nameInput.setAttribute('aria-invalid', 'true')
      nameInput.setAttribute('aria-describedby', error.id)
      nameInput.focus()
      return
    }
    error.hidden = true
    nameInput.removeAttribute('aria-invalid')
    nameInput.removeAttribute('aria-describedby')
    const inactive = document.getElementById('customer-type-deactivate').checked
    const existing = lookupResults.customerType.find(
      item => item.value.toLocaleLowerCase() === name.toLocaleLowerCase()
    )
    if (!existing) {
      lookupResults.customerType.push({
        value: name,
        status: inactive ? 'Inactive' : 'Active',
        order: Number(document.getElementById('customer-type-order').value) || 0,
        details: document.getElementById('customer-type-remarks').value.trim() || 'No remarks',
      })
    }
    closeTypeAdd()
    if (inactive) {
      toast({tone: 'ok', title: 'Customer type added as inactive'})
    } else {
      applyLookupValueInternal('customerType', name)
      toast({tone: 'ok', title: 'Customer type added and selected'})
    }
  }
  typeAddSaveButton.addEventListener('click', onTypeAddSaveClick)

  const onUnitDrawerScrimClick = event => {
    if (event.target === unitDrawerScrim || event.target.closest('.customer-unit-drawer-close')) {
      closeUnitDrawer()
      return
    }
    const openPageButton = event.target.closest('.customer-unit-open-page')
    if (openPageButton) {
      const pageMode = !unitDrawerScrim.classList.contains('is-page')
      unitDrawerScrim.classList.toggle('is-page', pageMode)
      openPageButton.setAttribute('aria-pressed', String(pageMode))
      openPageButton.setAttribute('aria-label', pageMode ? 'Return to drawer' : 'Open in new tab')
      openPageButton.querySelector('span').textContent = pageMode ? 'Return to drawer' : 'Open in new tab'
      openPageButton.title = pageMode ? 'Return to drawer' : 'Open in new tab'
      document.getElementById('customer-unit-drawer-description').textContent = pageMode
        ? 'Full page view for creating a new operation unit.'
        : 'Create the unit here, then use it on this customer.'
      return
    }
    const unitTab = event.target.closest('[data-customer-unit-tab]')
    if (unitTab) {
      setUnitTab(unitTab.dataset.customerUnitTab)
      return
    }
    const editorTab = event.target.closest('.customer-unit-editor-tabs button')
    if (editorTab) {
      editorTab.parentElement.querySelectorAll('button').forEach(button => {
        const active = button === editorTab
        button.setAttribute('aria-pressed', String(active))
        button.classList.toggle('pri', active)
        button.classList.toggle('out', !active)
      })
    }
    if (event.target.closest('.customer-unit-photo')) {
      toast({tone: 'ok', title: 'Unit photo selection is a prototype'})
    }
  }
  unitDrawerScrim.addEventListener('click', onUnitDrawerScrimClick)

  const onUnitDrawerScrimKeydown = event => {
    const tab = event.target.closest('[data-customer-unit-tab]')
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const tabs = [...unitDrawerScrim.querySelectorAll('[data-customer-unit-tab]')]
    const index = tabs.indexOf(tab)
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % tabs.length
            : (index - 1 + tabs.length) % tabs.length
    setUnitTab(tabs[nextIndex].dataset.customerUnitTab, {focus: true})
  }
  unitDrawerScrim.addEventListener('keydown', onUnitDrawerScrimKeydown)

  const unitDrawerSaveButton = document.getElementById('customer-unit-drawer-save')
  const onUnitDrawerSaveClick = () => {
    const nameInput = document.getElementById('customer-unit-name')
    const name = nameInput.value.trim()
    const error = document.getElementById('customer-unit-name-error')
    if (!name) {
      error.textContent = 'Unit Name is required.'
      error.hidden = false
      nameInput.setAttribute('aria-invalid', 'true')
      nameInput.setAttribute('aria-describedby', error.id)
      nameInput.focus()
      return
    }
    error.hidden = true
    nameInput.removeAttribute('aria-invalid')
    nameInput.removeAttribute('aria-describedby')
    const nextCode = Math.max(...lookupResults.operationUnit.map(item => Number(item.code) || 0)) + 1
    const value = `${nextCode} - ${name}`
    lookupResults.operationUnit.push({
      value,
      code: String(nextCode),
      country: document.getElementById('customer-unit-country').value,
      parent: document.getElementById('customer-unit-parent').value || 'No parent',
      status: 'Active',
    })
    closeUnitDrawer()
    applyLookupValueInternal('operationUnit', value)
    toast({tone: 'ok', title: 'Operation unit added and selected'})
  }
  unitDrawerSaveButton.addEventListener('click', onUnitDrawerSaveClick)

  const onParentUnitDrawerScrimClick = event => {
    if (
      event.target === parentUnitDrawerScrim ||
      event.target.closest('.customer-parent-unit-drawer-close')
    ) {
      closeParentUnitDrawer()
    }
  }
  parentUnitDrawerScrim.addEventListener('click', onParentUnitDrawerScrimClick)

  const parentUnitDrawerSaveButton = document.getElementById('customer-parent-unit-drawer-save')
  const onParentUnitDrawerSaveClick = () => {
    const nameInput = document.getElementById('customer-parent-unit-name')
    const name = nameInput.value.trim()
    const error = document.getElementById('customer-parent-unit-name-error')
    if (!name) {
      error.textContent = 'Unit Name is required.'
      error.hidden = false
      nameInput.setAttribute('aria-invalid', 'true')
      nameInput.setAttribute('aria-describedby', error.id)
      nameInput.focus()
      return
    }
    error.hidden = true
    nameInput.removeAttribute('aria-invalid')
    nameInput.removeAttribute('aria-describedby')
    const nextCode = Math.max(...lookupResults.operationUnit.map(item => Number(item.code) || 0)) + 1
    const value = `${nextCode} - ${name}`
    lookupResults.operationUnit.push({
      value,
      code: String(nextCode),
      country: document.getElementById('customer-parent-unit-country').value,
      parent: document.getElementById('customer-parent-unit-parent').value || 'No parent',
      status: 'Active',
    })
    const parentSelect = document.getElementById('customer-unit-parent')
    parentSelect.add(new Option(value, value))
    parentSelect.value = value
    closeParentUnitDrawer()
    toast({tone: 'ok', title: 'Parent unit added and selected'})
  }
  parentUnitDrawerSaveButton.addEventListener('click', onParentUnitDrawerSaveClick)

  const onLocationAddScrimClick = event => {
    if (event.target === locationAddScrim || event.target.closest('.customer-location-add-close')) {
      closeLocationAdd()
    }
  }
  locationAddScrim.addEventListener('click', onLocationAddScrimClick)

  const locationAddSaveButton = document.getElementById('customer-location-add-save')
  const onLocationAddSaveClick = () => {
    const required = ['code', 'name']
    let firstInvalid = null
    required.forEach(key => {
      const input = document.getElementById(`customer-location-${key}`)
      const error = document.getElementById(`customer-location-${key}-error`)
      const missing = !input.value.trim()
      error.textContent = missing ? `${key === 'code' ? 'Location Code' : 'Location Name'} is required.` : ''
      error.hidden = !missing
      input.toggleAttribute('aria-invalid', missing)
      if (missing) input.setAttribute('aria-describedby', error.id)
      else input.removeAttribute('aria-describedby')
      if (missing && !firstInvalid) firstInvalid = input
    })
    if (firstInvalid) {
      firstInvalid.focus()
      return
    }
    const code = document.getElementById('customer-location-code').value.trim()
    const name = document.getElementById('customer-location-name').value.trim()
    const location = {
      value: name,
      code,
      parent: document.getElementById('customer-location-parent').value || 'No parent',
      level: document.getElementById('customer-location-level').value || '1',
      type: document.getElementById('customer-location-type').value,
      status: 'Active',
    }
    const existing = lookupResults.unitLocation.find(
      item => item.value.toLocaleLowerCase() === name.toLocaleLowerCase()
    )
    if (!existing) lookupResults.unitLocation.push(location)
    const targetId = state.targetSelectId
    closeLocationAdd()
    state.source = 'unit'
    state.targetSelectId = targetId
    applyLookupValueInternal('unitLocation', name)
    toast({tone: 'ok', title: 'Geo. Location added and selected'})
  }
  locationAddSaveButton.addEventListener('click', onLocationAddSaveClick)

  // Document-wide Escape covers these four drawers/dialogs even when focus
  // sits on a plain button inside them (not one of the elements with their
  // own keydown handler above) — same as the original's single consolidated
  // Escape listener, scoped here to only this module's own overlays; geo/
  // kanban/export overlays keep their own Escape handling in legacy-app.js.
  const onDocumentKeydown = event => {
    if (event.key !== 'Escape') return
    if (!lookupMenu.hidden) closeLookupMenu({restoreFocus: true})
    else if (!unitLookupMenu.hidden) closeUnitLookupMenu({restoreFocus: true})
    else if (locationAddScrim.classList.contains('open')) closeLocationAdd()
    else if (lookupSearchScrim.classList.contains('open')) closeLookupSearch()
    else if (parentUnitDrawerScrim.classList.contains('open')) closeParentUnitDrawer()
    else if (typeAddScrim.classList.contains('open')) closeTypeAdd()
    else if (unitDrawerScrim.classList.contains('open')) closeUnitDrawer()
  }
  document.addEventListener('keydown', onDocumentKeydown)

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
      typeAddSaveButton.removeEventListener('click', onTypeAddSaveClick)
      unitDrawerScrim.removeEventListener('click', onUnitDrawerScrimClick)
      unitDrawerScrim.removeEventListener('keydown', onUnitDrawerScrimKeydown)
      unitDrawerSaveButton.removeEventListener('click', onUnitDrawerSaveClick)
      parentUnitDrawerScrim.removeEventListener('click', onParentUnitDrawerScrimClick)
      parentUnitDrawerSaveButton.removeEventListener('click', onParentUnitDrawerSaveClick)
      locationAddScrim.removeEventListener('click', onLocationAddScrimClick)
      locationAddSaveButton.removeEventListener('click', onLocationAddSaveClick)
      document.removeEventListener('keydown', onDocumentKeydown)
    },
  }
}
