import {uiLocale} from '../../core/locale.js'
import {renderCustomerRecordPhoto} from '../customers/images.js'
import {escapeHtml, field, icon, selectInput, textInput} from '../../components/collab/fields.js'

const {t} = uiLocale

// People Data record layout. The record mirrors the Customer record's card
// structure: a titled identity card with the photo on the inline end, then
// one collapsible card per group of fields. Only the fields the legacy
// People screen exposes are declared here; the editor and the read-only view
// share the same section tree so both modes line up.

export const PERSON_SECTION_CLASS =
  'customer-section overflow-hidden mb-3! [body.density-compact_&]:mb-1.5! [body.density-comfortable_&]:mb-[18px]! [border:1px_solid_var(--line)] rounded-lg bg-surface [box-shadow:var(--shadow-1)]'
// Reuse the Customer record's compiled titlebar and field-grid tokens so the
// two detail surfaces share one visual contract without growing Tailwind.
export const PERSON_TITLEBAR_CLASS =
  'customer-section-titlebar w-full [padding:8px_12px] bg-[var(--line-2)] [font-size:12.5px] font-bold text-start flex gap-2.5 justify-between items-center'
const FIELD_GRID_CLASS = 'customer-field-grid grid [grid-template-columns:repeat(auto-fit,_minmax(260px,_1fr))] [gap:10px_16px] [padding:12px] [gap:4px_8px] [padding:6px] [@media((max-width:720px))]:[grid-template-columns:minmax(0,_1fr)]'
const READ_ONLY_VALUE_CLASS =
  'flex min-h-9 items-center rounded-md border border-line bg-[var(--line-2)] px-2 py-1.5 text-[13px] text-ink [overflow-wrap:anywhere]'
const IDENTITY_BODY_CLASS =
  'customer-identity-body grid gap-5 [grid-template-columns:minmax(0,_1fr)_minmax(150px,_260px)] items-start [@media((max-width:720px))]:[grid-template-columns:minmax(0,_1fr)]'

const text = (key, label, id, extra = {}) => ({key, label, id, type: 'text', ...extra})
const select = (key, label, id, options) => ({key, label, id, type: 'select', options})
const date = (key, label, id) => ({key, label, id, type: 'date'})
const contact = (key, label, id, kind) => ({key, label, id, type: 'contact', kind})

const GENDER_OPTIONS = ['Male', 'Female']
const SOCIAL_STATUS_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed']
const TITLE_OPTIONS = ['Mr.', 'Mrs.', 'Ms.', 'Dr.']
const CITY_OPTIONS = ['Cairo', 'Giza', 'Alexandria']
const STATE_OPTIONS = ['Cairo', 'Giza', 'Alexandria']
const COUNTRY_OPTIONS = ['Egypt']

export const PERSON_SECTIONS = [
  {
    key: 'identity',
    title: 'Personal Details',
    collapsible: false,
    photo: true,
    fields: [
      text('number', 'Number', 'person-number', {inputType: 'number'}),
      text('nameEn', 'Name', 'person-name-en', {required: true}),
      text('nameAr', 'Foreign Name', 'person-name-ar', {dir: 'auto'}),
      text('firstName', 'First Name', 'person-first-name'),
      text('middleName', 'Middle Name', 'person-middle-name'),
      text('thirdName', 'Third Name', 'person-third-name'),
      text('surname', 'Surname', 'person-surname'),
      date('dateOfBirth', 'Date Of Birth', 'person-date-of-birth'),
      date('dealingDate', 'Dealing Date', 'person-dealing-date'),
      select('gender', 'Gender', 'person-gender', GENDER_OPTIONS),
      select('socialStatus', 'Social Status', 'person-social-status', SOCIAL_STATUS_OPTIONS),
      text('childrenCount', 'Children Count', 'person-children-count', {inputType: 'number'}),
      select('title', 'Title', 'person-title', TITLE_OPTIONS),
    ],
  },
  {
    key: 'contact',
    title: 'Contact Info.',
    collapsible: true,
    fields: [
      contact('phone', 'Phone', 'person-phone', 'phone'),
      contact('email', 'E-Mail', 'person-email', 'email'),
      contact('mobile', 'Mobile No.', 'person-mobile', 'mobile'),
      text('website', 'Website', 'person-website', {inputType: 'url'}),
      text('fax', 'Fax', 'person-fax'),
    ],
  },
  {
    key: 'address',
    title: 'Address',
    collapsible: true,
    fields: [
      text('address', 'Address', 'person-address', {wide: true}),
      select('city', 'City', 'person-city', CITY_OPTIONS),
      select('state', 'State', 'person-state', STATE_OPTIONS),
      select('country', 'Country', 'person-country', COUNTRY_OPTIONS),
      text('postalCode', 'Postal Code', 'person-postal-code'),
      text('poBox', 'P.O. Box', 'person-po-box'),
    ],
  },
  {
    key: 'other',
    title: 'Other Data',
    collapsible: true,
    fields: [
      text('jobTitle', 'Job Title', 'person-job'),
      text('company', 'Company Name', 'person-company'),
      text('notes', 'Remarks', 'person-notes', {multiline: true, wide: true}),
    ],
  },
]

export const PERSON_DEFAULTS = Object.freeze(
  PERSON_SECTIONS.flatMap(section => section.fields).reduce(
    (defaults, fieldDef) => ({...defaults, [fieldDef.key]: ''}),
    {photo: null}
  )
)

/** A blank person record shaped like the record page's fields. */
export function createBlankPerson() {
  return {
    ...PERSON_DEFAULTS,
    lifecycle: 'lead',
    archived: false,
    contacts: [],
    photo: null,
  }
}

/**
 * Reads the fixed contact fields back into the store's contact list. The
 * People list, duplicate check and conversion preview all keep using
 * `contacts`, so the fixed Phone / E-Mail / Mobile fields feed that same
 * shape.
 * @param {HTMLElement} body
 */
export function readContacts(body) {
  return [...body.querySelectorAll('[data-contact-row]')]
    .map((row, index) => ({
      kind: row.querySelector('[data-contact-kind]').value,
      value: row.querySelector('[data-contact-value]').value.trim(),
      primary: index === 0,
    }))
    .filter(contact => contact.value)
}

/**
 * Turns a stored person entity into the flat field shape the record renders,
 * pulling the legacy repeatable contacts into the fixed contact fields.
 * @param {object} person
 */
export function personData(person = {}) {
  const contacts = person.contacts || []
  const valueOf = kind => contacts.find(contact => contact.kind === kind)?.value || ''
  return {
    ...createBlankPerson(),
    ...person,
    phone: valueOf('phone'),
    email: valueOf('email'),
    mobile: valueOf('mobile'),
    notes: person.notes ?? '',
    photo: person.photo || null,
  }
}

const optionMarkup = (fieldDef, value) => {
  const options = [...new Set(['', String(value ?? ''), ...(fieldDef.options || [])])]
  return options.map(option => [option, option || '—'])
}

function controlMarkup(fieldDef, value, readOnly) {
  const extra = readOnly ? {disabled: true} : {}
  if (fieldDef.type === 'select') {
    return selectInput({id: fieldDef.id, value, options: optionMarkup(fieldDef, value), extra})
  }
  if (fieldDef.type === 'contact') {
    const kinds = [['phone', 'Phone'], ['email', 'E-Mail'], ['mobile', 'Mobile No.']]
    return `<div class="flex min-w-0 items-center gap-2" data-contact-row>
      <select id="${escapeHtml(fieldDef.id)}-kind" data-contact-kind class="hidden" aria-hidden="true" tabindex="-1">${kinds
        .map(([id, label]) => `<option value="${id}"${id === fieldDef.kind ? ' selected' : ''}>${escapeHtml(label)}</option>`)
        .join('')}</select>
      <input${readOnly ? ' disabled' : ''} id="${escapeHtml(fieldDef.id)}" name="${escapeHtml(fieldDef.id)}" data-contact-value value="${escapeHtml(
        value
      )}" autocomplete="off"${
        fieldDef.kind === 'email' ? ' type="email"' : fieldDef.kind === 'phone' || fieldDef.kind === 'mobile' ? ' type="tel"' : ''
      }>
    </div>`
  }
  return textInput({
    id: fieldDef.id,
    value,
    required: fieldDef.required,
    type: fieldDef.inputType || 'text',
    extra: {...extra, dir: fieldDef.dir || (fieldDef.type === 'text' ? 'auto' : undefined)},
  })
}

function readOnlyMarkup(fieldDef, value) {
  if (fieldDef.type === 'select') {
    if (!value) return `<p class="${READ_ONLY_VALUE_CLASS}">—</p>`
    const option = optionMarkup(fieldDef, value).find(([optionValue]) => optionValue === String(value))
    return `<p class="${READ_ONLY_VALUE_CLASS}">${escapeHtml(option?.[1] || value)}</p>`
  }
  if (fieldDef.multiline) {
    return `<p class="${READ_ONLY_VALUE_CLASS} min-h-20! items-start whitespace-pre-line">${escapeHtml(value || '—')}</p>`
  }
  return `<p class="${READ_ONLY_VALUE_CLASS}"${fieldDef.dir ? ` dir="${fieldDef.dir}"` : ''}>${escapeHtml(value || '—')}</p>`
}

function renderField(fieldDef, person, readOnly) {
  const value = person[fieldDef.key] ?? ''
  const control = readOnly ? readOnlyMarkup(fieldDef, value) : controlMarkup(fieldDef, value, readOnly)
  return field({
    id: fieldDef.id,
    label: fieldDef.label,
    required: fieldDef.required,
    wide: fieldDef.wide,
    control,
  }).replace('sm:col-span-2', '[grid-column:1_/_-1]')
}

export function renderPersonPhotoPreview(person) {
  return renderCustomerRecordPhoto(person.photo, {
    customerName: person.nameEn || t('New person'),
    customerNo: person.number || '—',
  }, {
    encodeHtml: escapeHtml,
    imageData: photo => photo?.src ? {src: photo.src, alt: photo.alt || t('Photo'), fit: photo.fit === 'contain' ? 'contain' : 'cover'} : null,
  })
}

function renderPhoto(person, readOnly) {
  return `<div class="customer-identity-photo [padding:12px_12px_12px_0] [@media((max-width:720px))]:[padding:0_12px_12px]" data-person-photo>
    <div class="rec-field customer-field customer-photo grid [place-items:center] gap-2 [padding:12px] [border:1px_dashed_var(--line)] rounded-lg h-full [min-height:280px] [&_label]:text-xs [&_label]:text-muted [.customer-record-canvas_.customer-identity-photo_&_label]:relative [.customer-record-canvas_.customer-identity-photo_&_label]:[inset:unset] [.customer-record-canvas_.customer-identity-photo_&_label]:[padding:unset]">
      <label for="person-photo-select">${escapeHtml(t('Photo'))}</label>
      <div class="contents" data-person-photo-preview>${renderPersonPhotoPreview(person)}</div>
      ${readOnly ? '' : '<input id="person-photo-input" type="file" accept="image/*" hidden>'}
      <button id="person-photo-select" type="button" class="lbtn out" data-person-photo-select${readOnly ? ' disabled' : ''}>${icon('i-clip', 15)} ${escapeHtml(t(person.photo?.src ? 'Change photo' : 'Select photo'))}</button>
    </div>
  </div>`
}

/**
 * Renders the People record as Customer-style cards.
 * @param {object} person
 * @param {{readOnly?: boolean}} [options]
 */
export function renderPersonSections(person, {readOnly = false} = {}) {
  return PERSON_SECTIONS.map(section => {
    const fields = section.fields.map(fieldDef => renderField(fieldDef, person, readOnly)).join('')
    if (!section.collapsible) {
      const body = section.photo
        ? `<div class="${IDENTITY_BODY_CLASS}">
            <div class="${FIELD_GRID_CLASS}">${fields}</div>
            ${renderPhoto(person, readOnly)}
          </div>`
        : `<div class="${FIELD_GRID_CLASS}">${fields}</div>`
      return `<section class="${PERSON_SECTION_CLASS}" id="person-section-${escapeHtml(section.key)}" data-person-scroll-target="${escapeHtml(section.key)}" data-person-section="${escapeHtml(section.key)}">
        <div class="${PERSON_TITLEBAR_CLASS}"><h2 class="m-0! text-[12.5px] font-bold">${escapeHtml(t(section.title))}</h2></div>
        ${body}
      </section>`
    }
    return `<details class="${PERSON_SECTION_CLASS} group" id="person-section-${escapeHtml(section.key)}" data-person-scroll-target="${escapeHtml(section.key)}" data-person-section="${escapeHtml(section.key)}" open>
      <summary class="${PERSON_TITLEBAR_CLASS} cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span>${escapeHtml(t(section.title))}</span>
        <svg class="flex-none" width="14" height="14" aria-hidden="true"><use href="#i-caret" /></svg>
      </summary>
      <div class="${FIELD_GRID_CLASS} border-t border-line">${fields}</div>
    </details>`
  }).join('')
}
