import {uiLocale, encodeHtml} from '../../core/locale.js'
import {renderCustomerField, validateCustomerField} from './fields.js'
import {renderCustomerRecordPhoto, dataRecordInitials} from './images.js'
import {renderToggle} from '../../components/toggle.js'
import {emptyState, FIELD_CLASS, selectInput} from '../../components/collab/fields.js'
import {searchField} from '../../components/collab/list-toolbar.js'
import {DATA_RECORD_CARD_CLASS} from '../list-cards.js'
import {blankContact, CONTACT_TYPES} from './contacts-model.js'

const t = value => uiLocale.t(value)
const icon = name => `<svg width="15" height="15" aria-hidden="true"><use href="#${name}" /></svg>`
const GROUP_CLASS = 'grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3'
const definitions = [
  ['name', 'Name'], ['classification', 'Classification', 'select', ['Work', 'Personal', 'Other']],
  ['title', 'Title', 'select', ['', 'Mr.', 'Mrs.', 'Ms.', 'Dr.']], ['jobTitle', 'Job Title'], ['remarks', 'Remarks', 'textarea'],
  ['address', 'Address'], ['addressDetails', 'Address Details'],
  ['city', 'City', 'select', ['', 'Cairo', 'Giza', 'Alexandria']],
  ['state', 'State', 'select', ['', 'Cairo', 'Giza', 'Alexandria']],
  ['country', 'Country', 'select', ['', 'EG - Egypt']], ['postalCode', 'Postal Code'],
  ['phone', 'Phone', 'tel'], ['mobile', 'Mobile', 'tel'], ['email', 'E-Mail', 'email'],
  ['website', 'Website', 'url'], ['fax', 'Fax'], ['poBox', 'P.O. Box'],
  ['whatsapp', 'WhatsApp'], ['telegram', 'Telegram'], ['facebook', 'Facebook', 'url'],
  ['twitter', 'Twitter', 'url'], ['youtube', 'YouTube', 'url'], ['order', 'Order', 'number'],
].map(([key, label, type = 'text', options]) => ({key, label, type, options}))

function contactAction(contact, action, glyph, label, danger = false) {
  return `<button type="button" class="ibtn${danger ? ' text-[var(--danger)]' : ''}" data-contact-${action}="${encodeHtml(contact.id)}" aria-label="${encodeHtml(t(label))}: ${encodeHtml(contact.name)}">${icon(glyph)}<span class="tip end-0! start-auto! [translate:0_0]!">${encodeHtml(t(label))}</span></button>`
}

export function renderContactCards(customer, editing) {
  const contacts = [...(customer.contactDetails || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
  const addButton = editing ? `<button type="button" class="lbtn pri flex-none" data-contact-add>${icon('i-plus')} ${encodeHtml(t('Add contact info'))}</button>` : ''
  if (!contacts.length) return `<div class="p-4 [&_h3]:m-0! [&_p]:m-0!" data-contact-empty>${emptyState({
    iconName: 'i-user', title: 'No contact details yet',
    body: 'Add a contact for this customer. Set a default to keep Default Contact Info. up to date.',
    action: addButton,
  })}</div>`
  const cards = contacts.map(contact => {
    const avatar = contact.photo?.src ? `<img class="size-full object-cover" src="${encodeHtml(contact.photo.src)}" alt="">` : encodeHtml(dataRecordInitials(contact.name))
    return `<article class="${DATA_RECORD_CARD_CLASS} flex! flex-wrap items-center gap-3! cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]" tabindex="0" role="listitem" aria-label="${encodeHtml(t('View contact'))}: ${encodeHtml(contact.name)}" data-customer-contact-card="${encodeHtml(contact.id)}">
      <header class="flex min-w-[140px] flex-1 items-center gap-3">
        <span class="data-record-avatar grid size-9 flex-none place-items-center overflow-hidden rounded-full bg-[var(--line-2)] text-xs font-semibold text-muted" aria-hidden="true">${avatar}</span>
        <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h3 class="m-0! text-sm font-semibold [overflow-wrap:anywhere]">${encodeHtml(contact.name)}</h3>${contact.isDefault ? `<span class="badge ok">${encodeHtml(t('Default'))}</span>` : ''}</div><p class="mt-1! mb-0! text-xs text-muted">${encodeHtml([contact.title, contact.jobTitle].filter(Boolean).join(' · '))}</p></div>
      </header>
      <div class="ms-auto flex min-w-0 max-w-full items-center gap-2" data-contact-actions>
        ${editing ? `<div class="w-[140px] min-w-0 [&>label]:gap-2! [&>label]:border-0 [&>label]:px-0">${renderToggle({id: `customer-contact-default-${contact.id}`, label: t('Default contact'), checked: contact.isDefault, attributes: `data-contact-default="${encodeHtml(contact.id)}"`})}</div>` : ''}
        <div class="flex flex-none items-center gap-1${editing ? ' border-s border-line ps-2' : ''}">
          ${contactAction(contact, 'view', 'i-eye', 'View contact')}
          ${editing ? contactAction(contact, 'edit', 'i-edit', 'Edit contact') + contactAction(contact, 'remove', 'i-trash', 'Remove contact', true) : ''}
        </div>
      </div>
    </article>`
  }).join('')
  return `<div class="flex flex-wrap items-center justify-between gap-3 p-3" data-contact-toolbar><span class="text-xs font-medium text-muted">${contacts.length} ${encodeHtml(t(contacts.length === 1 ? 'contact' : 'contacts'))}</span>${addButton}</div>
    <div class="grid grid-cols-1 items-start gap-3 p-3 pt-0" role="list">${cards}</div>
    <div class="flex items-start gap-2 border-t border-line bg-[var(--line-2)] px-3 py-2.5 text-xs leading-5 text-muted" data-contact-sync-note><span class="mt-0.5 flex-none" aria-hidden="true">${icon('i-info')}</span><p class="m-0!">${encodeHtml(t('The default contact stays in sync with Default Contact Info.'))}</p></div>`
}

export function createContactDialog({trapFocus, releaseFocus, onSave}) {
  const scrim = document.getElementById('customer-contact-dialog')
  const form = scrim.querySelector('form')
  const body = scrim.querySelector('[data-contact-dialog-body]')
  const errors = scrim.querySelector('[data-contact-errors]')
  const controller = new AbortController()
  const {signal} = controller
  let draft = null
  let readOnly = false
  let uploadVersion = 0
  let photoLoading = false
  const fieldKey = key => `contactEditor_${key}`
  const inputFor = key => body.querySelector(`[data-customer-field="${fieldKey(key)}"]`)

  function field(def) {
    const key = fieldKey(def.key)
    const options = def.options ? [...new Set([...def.options, draft[def.key] || ''])] : undefined
    const markup = renderCustomerField({...def, key, options}, {[key]: draft[def.key]}, {mode: readOnly ? 'view' : 'edit', errors: new Map()}, {
      t, encodeHtml, customerImageData: photo => photo?.src ? photo : null,
      renderCustomerRecordPhoto: photo => renderCustomerRecordPhoto(photo, {customerName: draft.name || t('New contact'), customerNo: ''}, {
        encodeHtml, imageData: image => image?.src ? {...image, fit: image.fit || 'cover'} : null,
      }),
    })
    return ['address', 'addressDetails'].includes(def.key) ? markup.replace('class="rec-field', 'class="[grid-column:1_/_-1] rec-field') : markup
  }

  const group = keys => `<div class="${GROUP_CLASS}">${keys.map(key => field(definitions.find(def => def.key === key))).join('')}</div>`

  function read() {
    for (const def of definitions) draft[def.key] = inputFor(def.key)?.value.trim() || ''
    draft.order = Math.max(0, Number(draft.order) || 0)
    draft.isDefault = body.querySelector('[data-contact-is-default]').checked
    draft.connections = [...body.querySelectorAll('[data-contact-connection]')].map(row => ({
      type: row.querySelector('[data-connection-type]').value,
      description: row.querySelector('[data-connection-description]').value.trim(),
      remarks: row.querySelector('[data-connection-remarks]').value.trim(),
    }))
  }

  function visibleConnectionSelections() {
    return [...body.querySelectorAll('[data-contact-connection]')].filter(row => !row.hidden).map(row => row.querySelector('[data-connection-selected]'))
  }

  function syncConnectionSelection() {
    const all = body.querySelector('[data-connection-select-all]')
    const rows = visibleConnectionSelections()
    all.checked = rows.length > 0 && rows.every(input => input.checked)
    all.indeterminate = rows.some(input => input.checked) && !all.checked
    all.disabled = readOnly || !rows.length
  }

  function renderConnections() {
    const query = (body.querySelector('[data-connection-search]')?.value || '').toLowerCase()
    const rows = draft.connections.map((connection, index) => `<tr data-contact-connection data-connection-index="${index}"${query && !Object.values(connection).join(' ').toLowerCase().includes(query) ? ' hidden' : ''}>
      <td class="data-row-select-cell"><label class="contents [@media(pointer:coarse)]:grid [@media(pointer:coarse)]:size-11 [@media(pointer:coarse)]:cursor-pointer [@media(pointer:coarse)]:place-items-center"><input class="m-0! size-[15px] accent-accent" type="checkbox" data-connection-selected aria-label="${encodeHtml(t('Select'))} ${index + 1}"${readOnly ? ' disabled' : ''}></label></td><td>${index + 1}</td>
      <td><div class="${FIELD_CLASS}">${selectInput({id: `contact-connection-type-${index}`, value: connection.type, options: CONTACT_TYPES.map(type => [type, type]), extra: {disabled: readOnly, 'data-connection-type': '', 'aria-label': `${t('Contact type')} ${index + 1}`}})}</div></td>
      <td><input class="w-full rounded-md border border-line bg-surface p-2 text-ink" data-connection-description${readOnly ? ' disabled' : ''} value="${encodeHtml(connection.description)}" aria-label="${encodeHtml(t('Description'))} ${index + 1}"></td>
      <td><input class="w-full rounded-md border border-line bg-surface p-2 text-ink" data-connection-remarks${readOnly ? ' disabled' : ''} value="${encodeHtml(connection.remarks)}" aria-label="${encodeHtml(t('Remarks'))} ${index + 1}"></td></tr>`).join('')
    const matches = draft.connections.some(connection => !query || Object.values(connection).join(' ').toLowerCase().includes(query))
    const empty = matches ? '' : `<tr data-connection-empty><td colspan="5"><div class="[&_[data-empty]]:my-5! [&_h3]:m-0! [&_p]:m-0!">${emptyState({
      iconName: query ? 'i-search' : 'i-clip',
      title: query ? 'No matching connections' : 'No connections yet',
      body: query ? 'Try another search or clear it to see all connections.' : 'Add additional ways to reach this contact.',
    })}</div></td></tr>`
    body.querySelector('[data-contact-connections]').innerHTML = rows + empty
    syncConnectionSelection()
  }

  function open(contact, {first = false, readOnly: viewing = false} = {}) {
    readOnly = viewing
    uploadVersion += 1
    draft = {...blankContact(), ...structuredClone(contact || {})}
    draft.isDefault ||= first
    photoLoading = false
    errors.textContent = ''
    scrim.querySelector('[data-contact-dialog-title]').textContent = t(readOnly ? 'View contact' : contact?.id ? 'Edit contact' : 'Add contact info')
    body.innerHTML = `<div class="customer-identity-body grid items-start gap-5 [grid-template-columns:minmax(0,_1fr)_minmax(150px,_260px)] [@media((max-width:720px))]:[grid-template-columns:minmax(0,_1fr)]">
      <div class="min-w-0">${group(['name', 'title', 'jobTitle', 'classification', 'remarks'])}</div>
      <div class="customer-identity-photo">${field({key: 'photo', label: 'Photo', type: 'photo'})}<input type="file" accept="image/*" hidden data-contact-photo-input></div>
    </div>
    <section class="mt-5 border-t border-line pt-4"><h4 class="mb-3! text-sm font-semibold">${encodeHtml(t('Address'))}</h4>${group(['address', 'addressDetails', 'city', 'state', 'country', 'postalCode'])}</section>
    <section class="mt-5 border-t border-line pt-4">${group(['phone', 'mobile', 'email', 'website', 'fax', 'poBox', 'whatsapp', 'telegram', 'facebook', 'twitter', 'youtube', 'order'])}
      <div class="mt-3">${renderToggle({id: 'contact-editor-default', label: t('Default contact'), checked: draft.isDefault, disabled: readOnly || first || Boolean(contact?.isDefault), attributes: 'data-contact-is-default'})}</div>
    </section>
    <section class="mt-5 border-t border-line pt-4"><h4 class="mb-3! text-sm font-semibold">${encodeHtml(t('Contact connections'))}</h4>
      <div class="flex flex-wrap items-center gap-2 pb-3" data-connection-toolbar>${searchField({attr: 'connection-search', label: 'connections', value: ''})}<div class="ms-auto flex flex-wrap items-center gap-2"><button type="button" class="lbtn out" data-connection-add${readOnly ? ' hidden' : ''}>${icon('i-plus')} ${encodeHtml(t('Add connection'))}</button><button type="button" class="lbtn out" data-connection-remove${readOnly ? ' hidden' : ''}>${icon('i-trash')} ${encodeHtml(t('Remove selected'))}</button></div></div>
      <div class="inv-grid-wrap overflow-x-auto rounded-lg border border-line"><table class="inv-grid w-full text-[13px] [&_th]:bg-[var(--line-2)] [&_th]:p-2 [&_th]:text-start [&_th]:text-xs [&_th]:text-muted [&_td]:border-t [&_td]:border-line [&_td]:p-2"><thead><tr><th class="data-row-select-cell"><label class="contents [@media(pointer:coarse)]:grid [@media(pointer:coarse)]:size-11 [@media(pointer:coarse)]:place-items-center"><input class="m-0! size-[15px] accent-accent" type="checkbox" data-connection-select-all aria-label="${encodeHtml(t('Select all connections'))}"></label></th><th>#</th><th>${encodeHtml(t('Contact type'))}</th><th>${encodeHtml(t('Description'))}</th><th>${encodeHtml(t('Remarks'))}</th></tr></thead><tbody data-contact-connections></tbody></table></div>
    </section>`
    inputFor('name').required = true
    inputFor('classification').required = true
    // The shared input renderer retains the app's label and required-marker style.
    for (const key of ['name', 'classification']) body.querySelector(`label[for="${inputFor(key).id}"]`).insertAdjacentHTML('beforeend', ' <span class="text-[var(--danger)]" aria-hidden="true">*</span>')
    inputFor('order').min = '0'
    renderConnections()
    form.querySelector('button[type="submit"]').hidden = readOnly
    const cancel = form.querySelector('[data-contact-close]')
    cancel.dataset.i18n = readOnly ? 'Close' : 'Cancel'
    cancel.textContent = t(cancel.dataset.i18n)
    const description = scrim.querySelector('#customer-contact-dialog-description')
    description.dataset.i18n = readOnly ? 'View this contact’s details.' : 'Add the contact details, then save the customer to keep your changes.'
    description.textContent = t(description.dataset.i18n)
    scrim.classList.add('open')
    trapFocus(scrim.querySelector('.dlg'))
    if (!readOnly) inputFor('name').focus()
  }

  function close() {
    if (!scrim.classList.contains('open')) return
    uploadVersion += 1
    draft = null
    scrim.classList.remove('open')
    releaseFocus()
  }

  scrim.addEventListener('click', event => {
    if (event.target === scrim || event.target.closest('[data-contact-close]')) { close(); return }
    if (readOnly && event.target.closest('[data-customer-action="photo"], [data-connection-add], [data-connection-remove]')) return
    if (event.target.closest('[data-customer-action="photo"]')) {
      event.stopPropagation()
      body.querySelector('[data-contact-photo-input]').click()
    }
    if (event.target.closest('[data-connection-search-clear]')) {
      const search = body.querySelector('[data-connection-search]')
      search.value = ''
      event.target.closest('[data-connection-search-clear]').hidden = true
      read()
      renderConnections()
      search.focus()
    }
    if (event.target.closest('[data-connection-add]')) {
      read()
      draft.connections.push({type: 'Mobile', description: '', remarks: ''})
      renderConnections()
    }
    if (event.target.closest('[data-connection-remove]')) {
      read()
      const selected = new Set([...body.querySelectorAll('[data-contact-connection]:has([data-connection-selected]:checked)')].map(row => Number(row.dataset.connectionIndex)))
      draft.connections = draft.connections.filter((_, index) => !selected.has(index))
      renderConnections()
    }
  }, {signal})
  body.addEventListener('input', event => {
    if (event.target.matches('[data-connection-search]')) {
      body.querySelector('.data-search-clear').hidden = !event.target.value
      read(); renderConnections()
    }
    event.target.setCustomValidity?.('')
    event.target.removeAttribute('aria-invalid')
  }, {signal})
  body.addEventListener('change', event => {
    if (event.target.matches('[data-connection-select-all]') && !readOnly) {
      visibleConnectionSelections().forEach(input => { input.checked = event.target.checked })
      syncConnectionSelection()
      return
    }
    if (event.target.matches('[data-connection-selected]')) { syncConnectionSelection(); return }
    if (readOnly || !event.target.matches('[data-contact-photo-input]')) return
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { errors.textContent = t('Choose an image file.'); return }
    const version = ++uploadVersion
    photoLoading = true
    const reader = new FileReader()
    reader.onload = () => {
      if (version !== uploadVersion || !draft) return
      photoLoading = false
      read()
      draft.photo = {src: String(reader.result), alt: draft.name || t('Contact photo'), fit: 'cover'}
      const host = body.querySelector('.customer-identity-photo .customer-photo')
      host.outerHTML = field({key: 'photo', label: 'Photo', type: 'photo'})
      errors.textContent = ''
    }
    reader.onerror = () => { if (version === uploadVersion) { photoLoading = false; errors.textContent = t('Could not read this image. Try another file.') } }
    reader.readAsDataURL(file)
  }, {signal})
  form.addEventListener('submit', event => {
    event.preventDefault()
    if (!draft || readOnly) return
    if (photoLoading) { errors.textContent = t('Wait for the photo to finish loading.'); return }
    read()
    // Validation must be able to reveal and focus a filtered connection row.
    const search = body.querySelector('[data-connection-search]')
    if (search.value) { search.value = ''; body.querySelector('.data-search-clear').hidden = true; renderConnections() }
    for (const def of definitions) {
      const message = validateCustomerField(def, draft)
      inputFor(def.key).setCustomValidity(message)
      if (message) inputFor(def.key).setAttribute('aria-invalid', 'true')
    }
    if (!draft.name.trim()) inputFor('name').setCustomValidity(t('Name is required.'))
    for (const row of body.querySelectorAll('[data-contact-connection]')) {
      const index = Number(row.dataset.connectionIndex)
      const connection = draft.connections[index]
      const control = row.querySelector('[data-connection-description]')
      control.setCustomValidity('')
      if (!connection.description) control.setCustomValidity(t('Description is required.'))
      else if (connection.type === 'E-mail' || connection.type === 'Website') control.setCustomValidity(validateCustomerField({key: 'description', label: connection.type, type: connection.type === 'E-mail' ? 'email' : 'url'}, connection))
    }
    if (!form.reportValidity()) return
    const saved = structuredClone(draft)
    close()
    onSave(saved)
  }, {signal})
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && scrim.classList.contains('open')) { event.preventDefault(); event.stopImmediatePropagation(); close() }
  }, {signal, capture: true})
  return {open, close, dispose() { close(); controller.abort() }}
}
