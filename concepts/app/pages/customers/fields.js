// Customer record model/validation and field rendering — moved out of
// concepts/app/legacy-app.js as part of Task 7. In the original these
// closed directly over the page-module-scoped `customerData`/`customerState`
// mutable bindings; here they take them as explicit parameters (same
// pattern Task 6 established for the shared data-list renderers), so
// record.js's createCustomerRecord(...) factory — the one place that still
// owns the actual mutable `customerData`/`customerState` — can pass its own
// current state in on every call instead of these functions reaching for a
// module-level global.
import {CUSTOMER_SECTIONS} from '../../prototype/fixtures/customers.js'

export const CUSTOMER_SECTION_ORDER = [
  'identity',
  'deactivation',
  'nationalAddress',
  'defaultContact',
  'mainData',
  'otherData',
  'subLedgers',
  'contactDetails',
]

/* Record contract: the default tab must represent the record's normal
   purpose. Main Data leads; Deactivate is a secondary/destructive action
   and must never be the tab a user lands on when opening a customer. */
export const CUSTOMER_GUIDED_TABS = [
  'mainData',
  'nationalAddress',
  'defaultContact',
  'otherData',
  'subLedgers',
  'contactDetails',
  'deactivation',
]

export const CUSTOMER_REQUIRED_FIELDS = new Set(['customerNo', 'customerName'])
export const CUSTOMER_LOOKUP_KEYS = new Set(['operationUnit', 'customerType'])

/**
 * @returns {object} a blank customer record with every declared field
 * defaulted, plus the fixed defaults the original hardcoded for a new
 * customer (operation unit, currency, empty photo/sub-ledgers/contacts).
 */
export function createBlankCustomerData() {
  const data = {}
  Object.values(CUSTOMER_SECTIONS).forEach(section => {
    section.fields.forEach(field => {
      data[field.key] = field.type === 'checkbox' ? false : ''
    })
  })
  data.operationUnit = '2 - lastchance'
  data.currency = 'EGP - Egyptian Pound'
  data.photo = null
  data.subLedgers = []
  data.contactDetails = []
  return data
}

/**
 * @param {string} customerNo
 * @param {object[]} customerRows CUSTOMER_ROWS (or a filtered/mutated copy)
 * @param {object} customerReference CUSTOMER_REFERENCE
 * @returns {object} a saved customer record populated from the matching row
 */
export function createSavedCustomerData(customerNo, customerRows, customerReference) {
  const row = customerRows.find(customer => customer.customerNo === customerNo) || customerRows[0]
  return {
    ...createBlankCustomerData(),
    ...customerReference,
    customerNo: row.customerNo,
    customerName: row.customerName,
    operationUnit: row.operationUnit,
    customerType: row.customerType,
    customerGroup: row.customerGroup,
    currency: `${row.currency} - Egyptian Pound`,
    otherCountry: row.country,
    contactPhone: row.phone,
    deactivationFrom: row.active ? '' : '2026-08-01',
    photo: row.photo,
  }
}

/**
 * @param {string} fieldKey
 * @returns {string|undefined} the section key that declares this field
 */
export function customerSectionKeyForField(fieldKey) {
  return CUSTOMER_SECTION_ORDER.find(key =>
    CUSTOMER_SECTIONS[key].fields.some(field => field.key === fieldKey)
  )
}

/**
 * @param {object} field
 * @param {object} customerData
 * @returns {string} validation error message, or '' if valid
 */
export function validateCustomerField(field, customerData) {
  const value = String(customerData[field.key] ?? '').trim()
  if (CUSTOMER_REQUIRED_FIELDS.has(field.key) && !value) {
    return `${field.label} is required.`
  }
  if (!value) return ''
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return `Enter a valid ${field.label}.`
  }
  if (field.type === 'url') {
    try {
      const url = new URL(value)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return `Enter a valid ${field.label}.`
      }
    } catch {
      return `Enter a valid ${field.label}.`
    }
  }
  return ''
}

/**
 * Validates every declared field, writing every failure into
 * `customerState.errors` (cleared first). Returns whether the whole record
 * is valid.
 * @param {object} customerData
 * @param {object} customerState
 * @returns {boolean}
 */
export function validateCustomerRecord(customerData, customerState) {
  customerState.errors.clear()
  CUSTOMER_SECTION_ORDER.forEach(sectionKey => {
    CUSTOMER_SECTIONS[sectionKey].fields.forEach(field => {
      const message = validateCustomerField(field, customerData)
      if (message) customerState.errors.set(field.key, message)
    })
  })
  return customerState.errors.size === 0
}

/**
 * @param {string} key
 * @param {object} customerData
 * @param {object} customerState
 * @returns {{text: string, className: string, hasErrors: boolean}}
 */
export function customerSectionMeta(key, customerData, customerState) {
  const section = CUSTOMER_SECTIONS[key]
  const errorCount = section.fields.filter(field => customerState.errors.has(field.key)).length
  if (errorCount) {
    return {
      text: `${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`,
      className: 'is-error',
      hasErrors: true,
    }
  }
  if (section.type === 'subledgers') {
    const count = customerData.subLedgers.length
    return {
      text: `${count} ${count === 1 ? 'record' : 'records'}`,
      className: count ? 'is-complete' : '',
      hasErrors: false,
    }
  }
  if (section.type === 'empty') {
    return {text: 'Not defined', className: '', hasErrors: false}
  }
  const populated = section.fields.filter(field => {
    if (field.type === 'checkbox') return true
    return String(customerData[field.key] ?? '').trim() !== ''
  }).length
  const complete = populated === section.fields.length
  return {
    text: complete ? 'Complete' : `${populated} of ${section.fields.length}`,
    className: complete ? 'is-complete' : '',
    hasErrors: false,
  }
}

/**
 * @param {string} key
 * @param {object} customerData
 * @param {object} customerState
 * @param {{encodeHtml: Function}} deps
 * @returns {string}
 */
export function renderCustomerSectionStatus(key, customerData, customerState, {encodeHtml}) {
  const meta = customerSectionMeta(key, customerData, customerState)
  if (!meta.hasErrors) return ''
  return `<span class="customer-section-status ${encodeHtml(meta.className)} text-muted text-xs font-medium whitespace-nowrap [&.is-complete]:[color:var(--success)] [&.is-error]:[color:var(--danger)] [&.is-error]:font-bold" data-customer-status="${encodeHtml(key)}">${encodeHtml(meta.text)}</span>`
}

/**
 * A single customer field's markup, covering every field type the original
 * supported (checkbox/photo/select-with-lookup/textarea/text). `deps`
 * bundles the small set of page/locale helpers the original closed over
 * directly: `t`, `encodeHtml`, `customerImageData` (images.js),
 * `renderCustomerRecordPhoto` (images.js).
 * @param {object} field
 * @param {object} customerData
 * @param {object} customerState
 * @param {{t: Function, encodeHtml: Function, customerImageData: Function, renderCustomerRecordPhoto: Function}} deps
 * @param {{asCardToggle?: boolean}} [options]
 * @returns {string}
 */
export function renderCustomerField(
  field,
  customerData,
  customerState,
  deps,
  {asCardToggle = false} = {}
) {
  const {t, encodeHtml, customerImageData, renderCustomerRecordPhoto} = deps
  const value = customerData[field.key]
  const disabled = customerState.mode === 'view' ? ' disabled' : ''
  const key = encodeHtml(field.key)
  const label = encodeHtml(t(field.label))
  const id = `customer-field-${key}`
  const required = CUSTOMER_REQUIRED_FIELDS.has(field.key) ? ' required aria-required="true"' : ''
  const error = customerState.errors.get(field.key) || ''
  const invalid = error ? ' aria-invalid="true"' : ''
  const describedBy = error ? ` aria-describedby="${id}-error"` : ''
  const requiredMark = required
    ? '<span class="req [.rfld_label_&]:[color:var(--danger)] [.rec-field_&]:[color:var(--danger)]" aria-hidden="true">*</span>'
    : ''
  const errorMarkup = error
    ? `<span class="customer-field-error block mt-1! [color:var(--danger)] text-xs font-semibold" id="${id}-error">${encodeHtml(error)}</span>`
    : ''
  if (field.type === 'checkbox') {
    if (asCardToggle) {
      return `<label class="customer-dialog-toggle rec-field customer-field customer-field-wide customer-beneficiary-toggle [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)]! [&_input:disabled]:text-muted! [&_select:disabled]:bg-[var(--line-2)]! [&_select:disabled]:text-muted! [&_textarea:disabled]:bg-[var(--line-2)]! [&_textarea:disabled]:text-muted! [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.customer-overlay_label.rec-field:not(&)>span:first-child]:block [.customer-overlay_label.rec-field:not(&)>span:first-child]:[margin-bottom:3px]! [.customer-overlay_label.rec-field:not(&)>span:first-child]:text-muted [.customer-overlay_label.rec-field:not(&)>span:first-child]:text-xs flex [min-height:36px] gap-5 items-center justify-between [padding:2px_10px] [border:1px_solid_var(--line)] rounded-md [&>span:first-child]:block [&_input]:absolute [&_input]:[width:1px] [&_input]:[height:1px] [&_input]:[margin:-1px]! [&_input]:overflow-hidden [&_input]:[clip:rect(0_0_0_0)] [&_input]:[clip-path:inset(50%)] [grid-column:1_/_-1] [grid-column:span_3] [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0" for="${id}"><span><strong>${label}</strong></span><input id="${id}" type="checkbox" role="switch" data-customer-field="${key}"${value ? ' checked' : ''}${disabled} class="peer"><span class="customer-dialog-toggle-track relative flex-none w-[34px] h-5 rounded-full bg-[var(--line)] peer-checked:bg-[var(--accent)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:opacity-60" aria-hidden="true"></span></label>`
    }
    return `<div class="rec-field customer-field customer-check [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)]! [&_input:disabled]:text-muted! [&_select:disabled]:bg-[var(--line-2)]! [&_select:disabled]:text-muted! [&_textarea:disabled]:bg-[var(--line-2)]! [&_textarea:disabled]:text-muted! [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0 [.customer-record-canvas_&_label]:flex [.customer-record-canvas_&_label]:gap-2 [.customer-record-canvas_&_label]:items-center [.customer-record-canvas_&_label]:[min-height:32px] [.customer-record-canvas_&_input]:[width:auto]"><label for="${id}"><input id="${id}" type="checkbox" data-customer-field="${key}"${value ? ' checked' : ''}${disabled}> <span>${label}</span></label></div>`
  }
  if (field.type === 'photo') {
    const actionLabel = customerImageData(value) ? 'Change photo' : 'Select photo'
    return `<div class="rec-field customer-field customer-photo [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)]! [&_input:disabled]:text-muted! [&_select:disabled]:bg-[var(--line-2)]! [&_select:disabled]:text-muted! [&_textarea:disabled]:bg-[var(--line-2)]! [&_textarea:disabled]:text-muted! [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0 grid [place-items:center] gap-2 [min-height:120px] [padding:12px] [border:1px_dashed_var(--line)] rounded-lg h-full [min-height:280px] [.customer-record-canvas_.customer-identity-photo_&_label]:relative [.customer-record-canvas_.customer-identity-photo_&_label]:[inset:unset] [.customer-record-canvas_.customer-identity-photo_&_label]:[padding:unset] [.customer-record-canvas_.customer-identity-photo_&_label]:text-xs"><label for="${id}">${label}</label>${renderCustomerRecordPhoto(value)}<button id="${id}" class="lbtn out" type="button" data-customer-field="${key}" data-customer-action="photo"${disabled}><svg width="15" height="15" aria-hidden="true"><use href="#i-clip" /></svg> ${actionLabel}</button></div>`
  }
  if (field.type === 'select') {
    const options = [...new Set([value, ...field.options])]
    const optionMarkup = options
      .map(option => {
        const optionLabel = option || field.label
        return `<option value="${encodeHtml(option)}"${option === value ? ' selected' : ''}>${encodeHtml(optionLabel)}</option>`
      })
      .join('')
    if (CUSTOMER_LOOKUP_KEYS.has(field.key)) {
      const hierarchyTrigger =
        field.key === 'operationUnit'
          ? `<button class="customer-lookup-trigger inline-grid [flex:none] [place-items:center] [width:34px] [min-height:32px] [margin-inline-start:-1px]! [border:1px_solid_var(--line)] text-muted bg-surface [cursor:pointer] [&:last-child]:[border-start-end-radius:6px] [&:last-child]:[border-end-end-radius:6px] [&:hover:not(:disabled)]:text-ink [&:hover:not(:disabled)]:bg-[var(--line-2)] [&:focus-visible]:relative [&:focus-visible]:[z-index:1] [&:focus-visible]:[outline:2px_solid_var(--accent)] [&:focus-visible]:[outline-offset:1px] [&:disabled]:[color:var(--faint)] [&:disabled]:bg-[var(--line-2)] [&:disabled]:[cursor:default]" type="button" data-unit-picker-open="${id}" aria-haspopup="dialog" aria-label="Choose ${label} from hierarchy"${disabled}><svg width="16" height="16" aria-hidden="true"><use href="#i-flow" /></svg></button>`
          : ''
      return `<div class="rec-field customer-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)]! [&_input:disabled]:text-muted! [&_select:disabled]:bg-[var(--line-2)]! [&_select:disabled]:text-muted! [&_textarea:disabled]:bg-[var(--line-2)]! [&_textarea:disabled]:text-muted! [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0"><label for="${id}">${label} ${requiredMark}</label><div class="customer-lookup-control flex min-w-0 [.customer-record-canvas_&_select]:min-w-0 [.customer-record-canvas_&_select]:[border-start-end-radius:0] [.customer-record-canvas_&_select]:[border-end-end-radius:0] [.customer-overlay_&_select]:min-w-0 [.customer-overlay_&_select]:[border-start-end-radius:0] [.customer-overlay_&_select]:[border-end-end-radius:0]"><select id="${id}" data-customer-field="${key}"${required}${invalid}${describedBy}${disabled}>${optionMarkup}</select>${hierarchyTrigger}<button class="customer-lookup-trigger inline-grid [flex:none] [place-items:center] [width:34px] [min-height:32px] [margin-inline-start:-1px]! [border:1px_solid_var(--line)] text-muted bg-surface [cursor:pointer] [&:last-child]:[border-start-end-radius:6px] [&:last-child]:[border-end-end-radius:6px] [&:hover:not(:disabled)]:text-ink [&:hover:not(:disabled)]:bg-[var(--line-2)] [&:focus-visible]:relative [&:focus-visible]:[z-index:1] [&:focus-visible]:[outline:2px_solid_var(--accent)] [&:focus-visible]:[outline-offset:1px] [&:disabled]:[color:var(--faint)] [&:disabled]:bg-[var(--line-2)] [&:disabled]:[cursor:default]" type="button" data-customer-lookup="${key}" aria-haspopup="menu" aria-controls="customer-lookup-menu" aria-expanded="false" aria-label="More options for ${label}"${disabled}><svg width="16" height="16" aria-hidden="true"><use href="#i-dots" /></svg></button></div>${errorMarkup}</div>`
    }
    return `<div class="rec-field customer-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)]! [&_input:disabled]:text-muted! [&_select:disabled]:bg-[var(--line-2)]! [&_select:disabled]:text-muted! [&_textarea:disabled]:bg-[var(--line-2)]! [&_textarea:disabled]:text-muted! [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0"><label for="${id}">${label} ${requiredMark}</label><select id="${id}" data-customer-field="${key}"${required}${invalid}${describedBy}${disabled}>${optionMarkup}</select>${errorMarkup}</div>`
  }
  if (field.type === 'textarea') {
    return `<div class="rec-field customer-field customer-field-wide [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)]! [&_input:disabled]:text-muted! [&_select:disabled]:bg-[var(--line-2)]! [&_select:disabled]:text-muted! [&_textarea:disabled]:bg-[var(--line-2)]! [&_textarea:disabled]:text-muted! [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0 [grid-column:1_/_-1]"><label for="${id}">${label} ${requiredMark}</label><textarea id="${id}" rows="3" data-customer-field="${key}" placeholder="${label}"${required}${invalid}${describedBy}${disabled}>${encodeHtml(value)}</textarea>${errorMarkup}</div>`
  }
  return `<div class="rec-field customer-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)]! [&_input:disabled]:text-muted! [&_select:disabled]:bg-[var(--line-2)]! [&_select:disabled]:text-muted! [&_textarea:disabled]:bg-[var(--line-2)]! [&_textarea:disabled]:text-muted! [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted [.save-filter-modal_&]:[margin-top:14px]! [.manage-filters-modal_&]:[margin-top:14px]! [.save-filter-modal_&:first-child]:mt-0! [.customer-lookup-filters_&]:min-w-0"><label for="${id}">${label} ${requiredMark}</label><input id="${id}" type="${encodeHtml(field.type)}" value="${encodeHtml(value)}" data-customer-field="${key}" placeholder="${label}"${required}${invalid}${describedBy}${disabled}>${errorMarkup}</div>`
}
