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
  return `<span class="customer-section-status ${encodeHtml(meta.className)}" data-customer-status="${encodeHtml(key)}">${encodeHtml(meta.text)}</span>`
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
  const requiredMark = required ? '<span class="req" aria-hidden="true">*</span>' : ''
  const errorMarkup = error
    ? `<span class="customer-field-error" id="${id}-error">${encodeHtml(error)}</span>`
    : ''
  if (field.type === 'checkbox') {
    if (asCardToggle) {
      return `<label class="customer-dialog-toggle rec-field customer-field customer-field-wide customer-beneficiary-toggle" for="${id}"><span><strong>${label}</strong></span><input id="${id}" type="checkbox" role="switch" data-customer-field="${key}"${value ? ' checked' : ''}${disabled}><span class="customer-dialog-toggle-track" aria-hidden="true"></span></label>`
    }
    return `<div class="rec-field customer-field customer-check"><label for="${id}"><input id="${id}" type="checkbox" data-customer-field="${key}"${value ? ' checked' : ''}${disabled}> <span>${label}</span></label></div>`
  }
  if (field.type === 'photo') {
    const actionLabel = customerImageData(value) ? 'Change photo' : 'Select photo'
    return `<div class="rec-field customer-field customer-photo"><label for="${id}">${label}</label>${renderCustomerRecordPhoto(value)}<button id="${id}" class="lbtn out" type="button" data-customer-field="${key}" data-customer-action="photo"${disabled}><svg width="15" height="15" aria-hidden="true"><use href="#i-clip" /></svg> ${actionLabel}</button></div>`
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
          ? `<button class="customer-lookup-trigger" type="button" data-unit-picker-open="${id}" aria-haspopup="dialog" aria-label="Choose ${label} from hierarchy"${disabled}><svg width="16" height="16" aria-hidden="true"><use href="#i-flow" /></svg></button>`
          : ''
      return `<div class="rec-field customer-field"><label for="${id}">${label} ${requiredMark}</label><div class="customer-lookup-control"><select id="${id}" data-customer-field="${key}"${required}${invalid}${describedBy}${disabled}>${optionMarkup}</select>${hierarchyTrigger}<button class="customer-lookup-trigger" type="button" data-customer-lookup="${key}" aria-haspopup="menu" aria-controls="customer-lookup-menu" aria-expanded="false" aria-label="More options for ${label}"${disabled}><svg width="16" height="16" aria-hidden="true"><use href="#i-dots" /></svg></button></div>${errorMarkup}</div>`
    }
    return `<div class="rec-field customer-field"><label for="${id}">${label} ${requiredMark}</label><select id="${id}" data-customer-field="${key}"${required}${invalid}${describedBy}${disabled}>${optionMarkup}</select>${errorMarkup}</div>`
  }
  if (field.type === 'textarea') {
    return `<div class="rec-field customer-field customer-field-wide"><label for="${id}">${label} ${requiredMark}</label><textarea id="${id}" rows="3" data-customer-field="${key}" placeholder="${label}"${required}${invalid}${describedBy}${disabled}>${encodeHtml(value)}</textarea>${errorMarkup}</div>`
  }
  return `<div class="rec-field customer-field"><label for="${id}">${label} ${requiredMark}</label><input id="${id}" type="${encodeHtml(field.type)}" value="${encodeHtml(value)}" data-customer-field="${key}" placeholder="${label}"${required}${invalid}${describedBy}${disabled}>${errorMarkup}</div>`
}
