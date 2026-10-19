import {uiLocale} from '../../core/locale.js'
import {resolveScroller} from '../../core/scroll.js'
import {createCollabPanel} from '../../components/collab/panel.js'
import {renderDataListColumnControls} from '../../components/data-list/list.js'
import {DATA_LIST_CONFIG} from '../../components/data-list/columns.js'
// People Data — people you deal with before (or instead of) them becoming
// a customer, supplier, employee or user. A list + full-page record with
// bilingual names, repeatable contacts, live duplicate feedback, and a
// Conversion previews map to existing Customers or their normal create
// form. Other target records require their own product/account workflows.
import {
  escapeHtml,
  icon,
  field,
  textInput,
  textarea,
  setFieldError,
  emptyState,
  FIELD_CLASS,
  GRID_CLASS,
  SECTION_TITLE_CLASS,
  ERROR_CLASS,
  ROW_BUTTON_CLASS,
  VIEW_LIST_CLASS,
  viewRow,
} from '../../components/collab/fields.js'
import {
  toolbarRow,
  menuDetails,
  menuItemRadio,
  clearFilterButton,
  searchField,
  viewMenu,
  closeOwnedMenu,
  collabFieldChoices,
  collabFilterChips,
  collabFilterMatches,
  bindCollabFieldFilters,
  restoreCollabFilterFocus,
} from '../../components/collab/list-toolbar.js'
import {DATA_RECORD_CARD_CLASS, DATA_RECORD_CARD_IDENTITY_CLASS} from '../list-cards.js'
import {CONVERSION_TARGETS, conversionLabel, titleOf, searchText, findPersonDuplicates} from '../../components/collab/meta.js'

const CONTACT_KINDS = [
  ['mobile', 'Mobile'],
  ['phone', 'Phone'],
  ['email', 'Email'],
]
const LIFECYCLES = [
  ['lead', 'Lead'],
  ['contact', 'Contact'],
]
/* The quick menu mirrors the other collab pages: a radio group over the
   lifecycle ("Status") plus Archived, named in the summary. */
const QUICK_FILTERS = [
  ['', 'All people', 'i-user'],
  ['lead', 'Lead', 'i-spark'],
  ['contact', 'Contact', 'i-check'],
  ['archived', 'Archived', 'i-archive'],
]
/* The change-view menu mirrors the Customers table: the invoices-style
   list and a card grid over the same rows. */
const VIEW_PRESENTATION = {
  list: {label: 'List', icon: 'i-grid'},
  cards: {label: 'Cards', icon: 'i-panel'},
}
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FIELD_LABEL = {mobile: 'mobile', phone: 'phone', email: 'email', name: 'name'}

const primaryOf = (person, kind) =>
  (person.contacts || []).filter(c => (kind === 'email' ? c.kind === 'email' : c.kind !== 'email')).sort((a, b) => Number(b.primary) - Number(a.primary))[0]?.value || ''

export function createPeople({store, toast, panel: conversionPanel, related, confirm, goHome, navigate, getTable, customers, openCustomer}) {
  const listRoot = document.querySelector('.people-view')
  const view = () => listRoot
  const recordRoot = document.querySelector('.people-record-view')
  const panel = createCollabPanel({root: recordRoot, modal: false, confirm})
  const state = {view: 'list', query: '', lifecycle: '', fieldFilters: []}
  let built = false
  let unsubscribe = null
  let returnToId = null
  let listScroll = {top: 0, tableTop: 0, tableLeft: 0}

  recordRoot.querySelector('[data-people-back]').addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    panel.close()
  })

  const filterFields = () => [
    {
      key: 'name',
      label: 'Name',
      icon: 'i-user',
      type: 'text',
      match: (person, filter) =>
        String(`${person.nameEn} ${person.nameAr || ''}`)
          .toLowerCase()
          .includes(String(filter.value).toLowerCase()),
    },
    {key: 'company', label: 'Company', icon: 'i-grid', type: 'text'},
    {
      key: 'email',
      label: 'Email',
      icon: 'i-mail',
      type: 'text',
      match: (person, filter) => primaryOf(person, 'email').toLowerCase().includes(String(filter.value).toLowerCase()),
    },
  ]

  function filtered() {
    const query = state.query.trim().toLowerCase()
    const fields = filterFields()
    return store
      .listEntities('person')
      .filter(p =>
        state.lifecycle === 'archived'
          ? p.archived
          : !p.archived && (!state.lifecycle || p.lifecycle === state.lifecycle)
      )
      .filter(p => state.fieldFilters.every(filter => collabFilterMatches(p, filter, fields.find(field => field.key === filter.key))))
      .filter(p => !query || searchText(p).includes(query))
      .sort((a, b) => titleOf(a).localeCompare(titleOf(b)))
  }

  const filterActive = () => Boolean(state.lifecycle || state.fieldFilters.length)

  function buildToolbar() {
    const host = view().querySelector('[data-collab-toolbar]')
    const fields = filterFields()
    /* The shared list-toolbar chrome: quick (Status) menu and "+ Filter" —
       the field chooser, like Customers — with editable value chips on the
       left; search and the change-view menu on the right. */
    const quick = QUICK_FILTERS.find(([id]) => id === state.lifecycle) || QUICK_FILTERS[0]
    const quickItems = QUICK_FILTERS.map(([id, label, iconName]) =>
      menuItemRadio({attr: 'quick-filter', value: id, label, iconName, checked: state.lifecycle === id})
    ).join('')
    const filterItems = collabFieldChoices({fields, activeKeys: new Set(state.fieldFilters.map(filter => filter.key))})
    const presentation = VIEW_PRESENTATION[state.view]
    const viewOptions = Object.entries(VIEW_PRESENTATION)
      .map(([id, entry]) =>
        menuItemRadio({attr: 'view-select', value: id, label: `${entry.label} view`, iconName: entry.icon, checked: state.view === id})
      )
      .join('')
    host.innerHTML = `<div class="data-list-controls grid w-full gap-2 mb-2.5">${toolbarRow({
      ariaLabel: 'People table controls',
      left: `${menuDetails({attr: 'quick-menu', iconName: quick[2], label: quick[1], items: quickItems})}${menuDetails({
        attr: 'filter-menu',
        iconName: 'i-plus',
        label: 'Filter',
        items: filterItems,
      })}${collabFilterChips({fields, filters: state.fieldFilters})}${
        filterActive() ? clearFilterButton({attr: 'clear-filters'}) : ''
      }`,
      right: `${searchField({attr: 'collab-search', label: 'people', value: state.query})}${menuDetails({attr: 'people-columns', iconName: 'i-sliders', label: 'Columns', end: true, items: renderDataListColumnControls(DATA_LIST_CONFIG.people, getTable().getState(), {t: uiLocale.t, encodeHtml: escapeHtml}) + `<button type="button" data-people-save-layout>${uiLocale.t('Save layout')}</button><button type="button" data-people-reset-layout>${uiLocale.t('Reset layout')}</button>`})}${viewMenu({
        attr: 'view-menu',
        label: presentation.label,
        iconName: presentation.icon,
        options: viewOptions,
      })}`,
    })}</div>`
    host.querySelector('[data-list-column="nameEn"]').disabled = true
    host.querySelectorAll('[data-list-column]').forEach(input => input.addEventListener('change', () => {
      const table = getTable()
      if (input.checked) table.getState().hiddenColumns.delete(input.dataset.listColumn)
      else table.getState().hiddenColumns.add(input.dataset.listColumn)
      renderBody()
    }))
    host.querySelector('[data-people-save-layout]').addEventListener('click', () => {
      const ok = getTable().model.saveLayout()
      toast({tone: ok ? 'ok' : 'bad', title: ok ? 'Layout saved' : 'Layout could not be saved'})
    })
    host.querySelector('[data-people-reset-layout]').addEventListener('click', () => { getTable().model.resetLayout(); buildToolbar(); renderBody() })
    const refresh = () => {
      buildToolbar()
      renderBody()
    }
    const onChange = ({focusKey = '', caret = null} = {}) => {
      refresh()
      restoreCollabFilterFocus(view().querySelector('[data-collab-toolbar]'), focusKey, caret)
    }
    host.querySelectorAll('[data-quick-filter]').forEach(item =>
      item.addEventListener('click', event => {
        state.lifecycle = item.dataset.quickFilter
        closeOwnedMenu(event.currentTarget)
        refresh()
      })
    )
    bindCollabFieldFilters(host, {fields, filters: state.fieldFilters, onChange})
    host.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
      state.lifecycle = ''
      state.fieldFilters.splice(0, state.fieldFilters.length)
      refresh()
    })
    host.querySelectorAll('[data-view-select]').forEach(item =>
      item.addEventListener('click', event => {
        state.view = item.dataset.viewSelect
        closeOwnedMenu(event.currentTarget)
        refresh()
      })
    )
    const search = host.querySelector('[data-collab-search]')
    const searchClear = host.querySelector('[data-collab-search-clear]')
    search.addEventListener('input', event => {
      state.query = event.target.value
      searchClear.hidden = !state.query
      renderBody()
    })
    searchClear.addEventListener('click', () => {
      state.query = ''
      search.value = ''
      searchClear.hidden = true
      renderBody()
      search.focus()
    })
  }

  function renderBody() {
    const body = view().querySelector('[data-collab-body]')
    const people = filtered()
    if (!people.length) {
      const valued = state.fieldFilters.find(filter => filter.value)
      body.innerHTML = state.query.trim()
        ? emptyState({iconName: 'i-search', title: uiLocale.t("No people match “{v0}”").replace('{v0}', () => uiLocale.t(String(state.query.trim()))), body: 'Try a name, company, phone number or email.'})
        : valued
          ? emptyState({iconName: 'i-search', title: uiLocale.t("No people match “{v0}”").replace('{v0}', () => uiLocale.t(String(valued.value))), body: 'Clear the filter to see every person.'})
          : emptyState({iconName: 'i-user', title: 'No people yet', body: 'Add someone with New person — only an English name is required.'})
      return
    }
    if (state.view === 'cards') {
      getTable().deactivate()
      body.innerHTML = cardsMarkup(people)
      body.querySelectorAll('[data-row-open]').forEach(button => button.addEventListener('click', () => openPerson(button.dataset.rowOpen)))
    } else {
      body.innerHTML = '<div data-people-table></div><div class="mt-2" data-people-table-footer></div>'
      const table = getTable()
      table.getState().hiddenColumns.delete('nameEn')
      table.setRows(people.map(person => ({...person, phone: primaryOf(person, 'phone'), email: primaryOf(person, 'email'), conversionLabel: person.convertedTo ? conversionLabel(person.convertedTo.target) : ''})))
      table.activate({root: body.querySelector('[data-people-table]'), footer: body.querySelector('[data-people-table-footer]')})
      body.querySelector('[data-people-table]').dataset.peopleGrid = ''
    }
  }

  const personFact = ([label, value, dir]) =>
    `<div class="min-w-0"><dt class="mb-0.5! text-[12px] text-muted">${escapeHtml(label)}</dt><dd class="m-0! truncate text-[12.5px] font-semibold text-ink"${
      dir ? ` dir="${dir}"` : ''
    }>${escapeHtml(String(value ?? '—'))}</dd></div>`

  const personCardMarkup = p => {
    const location = [p.city, p.country].filter(Boolean).join(', ')
    return `<article class="${DATA_RECORD_CARD_CLASS} data-record-card-person" role="listitem" data-list-row-key="${escapeHtml(p.id)}">
      <header class="data-record-card-header flex min-w-0 items-center gap-[9px]">
        <span class="data-record-avatar grid size-9 flex-none place-items-center rounded-full bg-[var(--line-2)] text-[12px] font-bold text-ink" aria-hidden="true">${escapeHtml(
          titleOf(p).charAt(0)
        )}</span>
        <button class="${DATA_RECORD_CARD_IDENTITY_CLASS}" type="button" data-row-open="${escapeHtml(p.id)}"><div><strong dir="auto">${escapeHtml(
          titleOf(p)
        )}</strong><span dir="auto">${escapeHtml(p.company || '—')}</span></div></button>
        <span class="badge gray">${p.lifecycle === 'contact' ? 'Contact' : 'Lead'}</span>
      </header>
      <div class="data-record-card-snapshot grid grid-cols-[minmax(0,1fr)_auto] items-end gap-5 rounded-md bg-[var(--line-2)] px-3.5 py-3 [&>div]:min-w-0 [&_small]:block [&_small]:text-[12px] [&_small]:text-muted [&_span]:block [&_span]:text-[12px] [&_span]:text-muted">
        <div><span>Profile</span><strong class="my-0.5! block truncate text-[13px] text-ink" dir="auto">${escapeHtml(
          p.jobTitle || 'No job title'
        )}</strong>${p.nameAr ? `<small dir="rtl" lang="ar">${escapeHtml(p.nameAr)}</small>` : `<small>${escapeHtml(p.lifecycle === 'contact' ? 'Contact' : 'Lead')}</small>`}</div>
        <div class="data-record-card-snapshot-value text-end"><span>Mobile / phone</span><strong class="my-0.5! block truncate text-[14px] text-ink" dir="ltr">${escapeHtml(
          primaryOf(p, 'phone') || '—'
        )}</strong></div>
      </div>
      <dl class="data-record-card-meta m-0! grid grid-cols-2 gap-x-3.5 gap-y-2.5">${[
        ['Email', primaryOf(p, 'email') || '—', 'ltr'],
        ['Converted', p.convertedTo ? `Converted to ${conversionLabel(p.convertedTo.target)}` : '—'],
        ['Address', location || '—'],
        ['Status', p.archived ? 'Archived' : p.lifecycle === 'contact' ? 'Contact' : 'Lead'],
      ]
        .map(personFact)
        .join('')}</dl>
    </article>`
  }

  const cardsMarkup = people =>
    `<div class="data-card-grid grid grid-cols-3 gap-5 rounded-[10px] bg-bg p-3 max-[1240px]:grid-cols-2 max-[720px]:grid-cols-1" role="list" aria-label="People cards">${people
      .map(personCardMarkup)
      .join('')}</div>`

  /* ---------- editor ---------- */
  // The row reuses the editor's field skin (34px controls, drawn select
  // arrow, accent focus ring) so it reads as part of the same form.
  const contactRow = (contact, index) => `<div class="${FIELD_CLASS}" data-contact-row>
      <div class="flex flex-wrap items-center gap-2">
        <label class="sr-only" for="person-contact-kind-${index}">Contact type</label>
        <select id="person-contact-kind-${index}" class="w-32!" data-contact-kind>${CONTACT_KINDS.map(([id, label]) => `<option value="${id}"${id === contact.kind ? ' selected' : ''}>${label}</option>`).join('')}</select>
        <label class="sr-only" for="person-contact-value-${index}">Contact value</label>
        <input id="person-contact-value-${index}" class="w-auto! min-w-[180px] flex-1" data-contact-value dir="ltr" value="${escapeHtml(contact.value)}" autocomplete="off">
        <label class="inline-flex min-h-8 cursor-pointer items-center gap-1.5 text-[13px] text-ink"><input type="radio" class="m-0 size-4 cursor-pointer accent-[var(--accent)]" name="person-primary" data-contact-primary${contact.primary ? ' checked' : ''}> Primary</label>
        <button type="button" class="ibtn" data-contact-remove aria-label="Remove this contact">${icon('i-x')}</button>
      </div>
      <p class="${ERROR_CLASS}" data-contact-error hidden></p>
    </div>`

  function editorMarkup(person) {
    const contacts = person.contacts?.length ? person.contacts : [{kind: 'mobile', value: '', primary: true}]
    return `<div class="mb-3 hidden rounded-md border border-[var(--warn-line)] bg-[var(--warn-bg)] px-3 py-2 text-[13px] text-ink" data-duplicate role="status" aria-live="polite"></div>
      <h3 class="${SECTION_TITLE_CLASS}">Identity</h3>
      <div class="${GRID_CLASS}">
        ${field({id: 'person-name-en', label: 'Name (English)', required: true, control: textInput({id: 'person-name-en', value: person.nameEn, required: true, extra: {autofocus: true}})})}
        ${field({id: 'person-name-ar', label: 'Name (Arabic)', control: textInput({id: 'person-name-ar', value: person.nameAr, extra: {dir: 'rtl', lang: 'ar'}})})}
        ${field({id: 'person-job', label: 'Job title', control: textInput({id: 'person-job', value: person.jobTitle})})}
        ${field({id: 'person-company', label: 'Company', control: textInput({id: 'person-company', value: person.company})})}
        ${field({id: 'person-lifecycle', label: 'Status', control: `<select id="person-lifecycle">${LIFECYCLES.map(([id, label]) => `<option value="${id}"${id === person.lifecycle ? ' selected' : ''}>${label}</option>`).join('')}</select>`})}
      </div>
      <h3 class="${SECTION_TITLE_CLASS} mt-5">Contact</h3>
      <div class="grid gap-2" data-contacts>${contacts.map(contactRow).join('')}</div>
      <button type="button" class="lbtn mt-2" data-contact-add>${icon('i-plus')} Add contact</button>
      <details class="mt-5 rounded-md border border-line bg-surface"${person.city || person.country ? ' open' : ''}>
        <summary class="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2.5 text-[13px] font-medium text-ink hover:bg-[var(--line-2)] [&::-webkit-details-marker]:hidden">${icon('i-location', 14)}<span>Address</span></summary>
        <div class="${GRID_CLASS} border-t border-line px-3 py-3">
          ${field({id: 'person-country', label: 'Country', control: textInput({id: 'person-country', value: person.country})})}
          ${field({id: 'person-city', label: 'City', control: textInput({id: 'person-city', value: person.city})})}
        </div>
      </details>
      <div class="mt-5">${field({id: 'person-notes', label: 'Notes', control: textarea({id: 'person-notes', value: person.notes, rows: 3})})}</div>
      ${person.convertedTo ? `<p class="mt-4 rounded-md bg-[var(--line-2)] px-3 py-2 text-[13px] text-ink">${icon('i-check')} ${uiLocale.t('Converted to')} ${escapeHtml(conversionLabel(person.convertedTo.target))}${person.convertedTo.recordId ? ` · ${escapeHtml(person.convertedTo.recordId)}` : ' (simulated)'}</p>` : ''}`
  }

  /* Read-only twin of the editor; the form waits behind Edit. */
  function viewMarkup(person) {
    const labelOf = (list, id) => list.find(([value]) => value === id)?.[1] ?? id
    const location = [person.city, person.country].filter(Boolean).join(', ')
    return `<dl class="${VIEW_LIST_CLASS}">
      ${viewRow('Name (English)', escapeHtml(titleOf(person)))}
      ${viewRow('Name (Arabic)', person.nameAr ? `<span dir="rtl" lang="ar">${escapeHtml(person.nameAr)}</span>` : '—')}
      ${viewRow('Job title', escapeHtml(person.jobTitle || '—'))}
      ${viewRow('Company', escapeHtml(person.company || '—'))}
      ${viewRow('Status', `<span class="badge gray">${escapeHtml(labelOf(LIFECYCLES, person.lifecycle))}</span>`)}
      ${viewRow('Address', escapeHtml(location || '—'))}
      ${viewRow(
        'Contacts',
        person.contacts?.length
          ? `<ul class="m-0 grid list-none gap-1 p-0">${person.contacts
              .map(
                contact =>
                  `<li class="flex items-baseline gap-2"><span class="text-xs font-semibold uppercase tracking-[.04em] text-faint">${escapeHtml(labelOf(CONTACT_KINDS, contact.kind))}</span><span dir="ltr">${escapeHtml(contact.value)}</span>${contact.primary ? '<span class="badge gray">Primary</span>' : ''}</li>`
              )
              .join('')}</ul>`
          : '—'
      )}
      ${viewRow('Notes', person.notes ? `<span class="whitespace-pre-line" dir="auto">${escapeHtml(person.notes)}</span>` : '—')}
      ${person.convertedTo ? viewRow('Converted', `${icon('i-check')} ${escapeHtml(conversionLabel(person.convertedTo.target))}${person.convertedTo.recordId ? ` · ${escapeHtml(person.convertedTo.recordId)}` : ' (simulated)'}`) : ''}
    </dl>`
  }

  function readContacts(body) {
    return [...body.querySelectorAll('[data-contact-row]')]
      .map(row => ({
        kind: row.querySelector('[data-contact-kind]').value,
        value: row.querySelector('[data-contact-value]').value.trim(),
        primary: row.querySelector('[data-contact-primary]').checked,
      }))
      .filter(contact => contact.value)
  }

  function readEditor(body) {
    return {
      nameEn: body.querySelector('#person-name-en').value.trim(),
      nameAr: body.querySelector('#person-name-ar').value.trim(),
      jobTitle: body.querySelector('#person-job').value.trim(),
      company: body.querySelector('#person-company').value.trim(),
      lifecycle: body.querySelector('#person-lifecycle').value,
      contacts: readContacts(body),
      country: body.querySelector('#person-country').value.trim(),
      city: body.querySelector('#person-city').value.trim(),
      notes: body.querySelector('#person-notes').value,
    }
  }

  function bindEditor(body, personId) {
    const contacts = body.querySelector('[data-contacts]')
    const checkDuplicates = () => {
      const values = readEditor(body)
      const matches = findPersonDuplicates({id: personId, ...values}, store.listEntities('person'))
      const box = body.querySelector('[data-duplicate]')
      box.classList.toggle('hidden', !matches.length)
      box.innerHTML = matches.length
        ? `<p class="flex items-center gap-1.5 font-semibold">${icon('i-warn')} Possible duplicate</p><ul class="mt-1 grid list-none gap-1 p-0">${matches
            .map(
              ({person, field: matched}) =>
                `<li class="flex items-center gap-2"><span class="flex-1" dir="auto">${escapeHtml(titleOf(person))} — same ${FIELD_LABEL[matched]}</span><button type="button" class="lbtn" data-open-duplicate="${escapeHtml(person.id)}">Open</button></li>`
            )
            .join('')}</ul><p class="mt-1 text-xs text-muted">You can still save; check first to avoid two records for one person.</p>`
        : ''
      box.querySelectorAll('[data-open-duplicate]').forEach(button =>
        button.addEventListener('click', async () => {
          if (await panel.close()) openPerson(button.dataset.openDuplicate)
        })
      )
    }
    const bindRow = row => {
      row.querySelector('[data-contact-remove]').addEventListener('click', () => {
        row.remove()
        if (!contacts.querySelector('[data-contact-row]')) addRow()
        checkDuplicates()
        contacts.querySelector('[data-contact-value]')?.focus()
      })
    }
    const addRow = () => {
      const index = Date.now()
      contacts.insertAdjacentHTML('beforeend', contactRow({kind: 'mobile', value: '', primary: !contacts.querySelector('[data-contact-row]')}, index))
      const row = contacts.lastElementChild
      bindRow(row)
      return row
    }
    contacts.querySelectorAll('[data-contact-row]').forEach(bindRow)
    body.querySelector('[data-contact-add]').addEventListener('click', () => addRow().querySelector('[data-contact-value]').focus())
    body.addEventListener('input', event => {
      if (event.target.matches('#person-name-en, [data-contact-value]')) checkDuplicates()
    })
    body.addEventListener('change', event => {
      if (event.target.matches('[data-contact-kind]')) checkDuplicates()
    })
    checkDuplicates()
  }

  function validate(body, values) {
    setFieldError(body, 'person-name-en', values.nameEn ? '' : 'Name (English) is required.')
    let firstInvalid = values.nameEn ? null : body.querySelector('#person-name-en')
    body.querySelectorAll('[data-contact-row]').forEach(row => {
      const kind = row.querySelector('[data-contact-kind]').value
      const input = row.querySelector('[data-contact-value]')
      const value = input.value.trim()
      const error = row.querySelector('[data-contact-error]')
      const message = !value
        ? ''
        : kind === 'email'
          ? EMAIL_PATTERN.test(value) ? '' : 'Enter a valid email address.'
          : value.replace(/\D/g, '').length >= 7 ? '' : 'Enter a valid phone number (at least 7 digits).'
      error.textContent = message
      error.hidden = !message
      input.toggleAttribute('aria-invalid', Boolean(message))
      if (message && !firstInvalid) firstInvalid = input
    })
    firstInvalid?.focus()
    return !firstInvalid
  }

  async function openPerson(id, {edit = false} = {}) {
    if (panel.isOpen() && !(await panel.requestLeave())) return false
    if (listRoot.isConnected && !listRoot.hidden) {
      const body = listRoot.querySelector('[data-collab-body]')
      const table = body.querySelector('.data-table-scroll')
      listScroll = {top: resolveScroller(body).scrollTop, tableTop: table?.scrollTop || 0, tableLeft: table?.scrollLeft || 0}
    }
    return navigate('people-record', {openId: id, edit})
  }

  function showPerson(id, {edit = false} = {}) {
    const existing = id ? store.getEntity('person', id) : null
    if (id && !existing) {
      toast({tone: 'warn', title: 'This person is no longer available', body: 'The record may have been deleted.'})
      // Finish activating the record page before applying its fallback.
      queueMicrotask(() => navigate('people'))
      return
    }
    const person = existing || {nameEn: '', nameAr: '', company: '', jobTitle: '', contacts: [], city: '', country: '', lifecycle: 'lead', archived: false, notes: ''}
    const ref = existing ? {type: 'person', id: existing.id} : null
    let savedId = id
    returnToId = id
    recordRoot.querySelector('[data-person-breadcrumb]').textContent = existing ? titleOf(existing) : uiLocale.t('New person')
    panel.open({
      ref,
      edit,
      status: existing
        ? existing.convertedTo
          ? {label: conversionLabel(existing.convertedTo.target), tone: 'ok'}
          : {label: existing.lifecycle === 'contact' ? 'Contact' : 'Lead', tone: existing.lifecycle === 'contact' ? 'fix' : 'gray'}
        : undefined,
      title: existing ? titleOf(existing) : 'New person',
      description: existing
        ? [existing.company, existing.jobTitle].filter(Boolean).join(' · ')
        : 'Add someone — only a name is required.',
      render: body => {
        body.innerHTML = editorMarkup(person)
        bindEditor(body, existing?.id)
      },
      view: body => {
        body.innerHTML = viewMarkup(person)
      },
      save: body => {
        const values = readEditor(body)
        if (!validate(body, values)) return false
        if (existing) {
          store.updateEntity('person', existing.id, values)
          toast({tone: 'ok', title: 'Person saved', body: values.nameEn})
        } else {
          savedId = store.createEntity('person', {...values, archived: false}).id
          toast({tone: 'ok', title: 'Person added', body: values.nameEn})
        }
        return true
      },
      onSaved: () => showPerson(savedId),
      onClose: () => navigate('people'),
      menu: existing
        ? [
            ...(existing.convertedTo?.target === 'customer' && existing.convertedTo.recordId ? [{label: 'Open customer', icon: 'i-next', run: () => openCustomer(existing.convertedTo.recordId)}] : []),
            ...CONVERSION_TARGETS.map(([target, label]) => ({label: uiLocale.t('Convert to {target}').replace('{target}', uiLocale.t(label)), icon: 'i-next', run: () => convert(existing, target)})),
            existing.archived
              ? {label: 'Restore', icon: 'i-undo', run: () => setArchived(existing, false)}
              : {label: 'Archive', icon: 'i-archive', run: () => setArchived(existing, true)},
            {label: 'Delete', icon: 'i-trash', danger: true, run: () => deletePerson(existing)},
          ]
        : [],
      related: ref ? (host, options) => related.render(host, ref, options) : null,
    })
    if (!edit && existing) recordRoot.querySelector('[data-panel-title]').focus()
  }

  async function convert(person, target) {
    const label = conversionLabel(target)
    let selected = null
    const markConverted = row => {
      if (!store.getEntity('person', person.id)) return
      store.updateEntity('person', person.id, {convertedTo: {target: 'customer', recordId: row.customerNo, at: store.now()}, lifecycle: 'contact'})
      if (recordRoot.isConnected && !recordRoot.hidden) showPerson(person.id)
      toast({tone: 'ok', title: 'Person linked to customer', body: `${person.nameEn} → ${row.customerName} (${row.customerNo})`})
    }
    conversionPanel.open({
      title: `${uiLocale.t('Convert to')} ${label}`,
      description: 'Review the mapping and duplicates before linking or creating a record. The source person and its related items are preserved.',
      saveLabel: target === 'customer' ? 'Continue' : target === 'user' ? 'Open Organization Center' : 'Close preview',
      render: body => {
        body.innerHTML = `<dl class="${VIEW_LIST_CLASS}">${viewRow('Name', escapeHtml(person.nameEn))}${viewRow('Company', escapeHtml(person.company || '—'))}${viewRow('Phone', escapeHtml(primaryOf(person, 'phone') || '—'))}${viewRow('Email', escapeHtml(primaryOf(person, 'email') || '—'))}</dl>
          ${target === 'customer' ? `<label class="mt-4 block text-sm">${uiLocale.t('Conversion action')}<select class="mt-1 w-full rounded border border-line bg-surface p-2 text-ink" data-conversion-mode><option value="link">${uiLocale.t('Link to existing')}</option><option value="create">${uiLocale.t('Create new')}</option></select></label><div class="mt-3" data-conversion-existing><label class="block text-sm">${uiLocale.t('Search customers')}<input type="search" class="mt-1 w-full rounded border border-line bg-surface p-2 text-ink" data-conversion-search></label><div class="mt-2 grid max-h-60 gap-2 overflow-auto" data-conversion-results></div></div><p class="mt-3 text-xs text-muted" data-conversion-hint>${uiLocale.t('Choose an existing customer, or review the prefilled customer form. A new customer is linked only after you save that form.')}</p>` : `<p class="mt-4 rounded border border-line p-3 text-sm text-muted">${uiLocale.t(target === 'user' ? 'User access must be created through Organization Center with its role and permission checks. This action does not create or invite an account.' : 'This target does not have a record form in this prototype. The mapping is available for review; no destination record or conversion mark will be created.')}</p>`}
          <p class="mt-2 text-sm text-[var(--danger)]" role="alert" data-conversion-error></p>`
        if (target !== 'customer') return
        const results = body.querySelector('[data-conversion-results]')
        const renderMatches = () => {
          const query = body.querySelector('[data-conversion-search]').value.trim().toLowerCase()
          const rows = customers().filter(row => !query || `${row.customerName} ${row.customerNo} ${row.phone || ''}`.toLowerCase().includes(query))
          results.innerHTML = rows.length ? rows.map(row => {
            const duplicate = (person.company && row.customerName.toLowerCase() === person.company.toLowerCase()) || (row.phone && row.phone.replace(/\D/g, '').slice(-10) === primaryOf(person, 'phone').replace(/\D/g, '').slice(-10))
            return `<label class="flex items-start gap-2 rounded border border-line p-2 text-sm"><input type="radio" name="conversion-customer" value="${escapeHtml(row.customerNo)}"><span>${escapeHtml(row.customerName)} · ${escapeHtml(row.customerNo)}${duplicate ? `<small class="block text-[var(--warning)]">${uiLocale.t('Possible match — review before creating another customer.')}</small>` : ''}</span></label>`
          }).join('') : `<p class="text-sm text-muted">${uiLocale.t('No matching customers.')}</p>`
        }
        renderMatches()
        body.querySelector('[data-conversion-search]').addEventListener('input', renderMatches)
        body.querySelector('[data-conversion-mode]').addEventListener('change', event => { body.querySelector('[data-conversion-existing]').hidden = event.target.value === 'create' })
      },
      save: async body => {
        if (target !== 'customer') return true
        const mode = body.querySelector('[data-conversion-mode]').value
        const id = body.querySelector('[name="conversion-customer"]:checked')?.value
        const row = customers().find(row => row.customerNo === id)
        if (mode === 'link' && !row) { body.querySelector('[data-conversion-error]').textContent = uiLocale.t('Choose a customer to link.'); return false }
        if (person.convertedTo?.recordId && !(await confirm({title: 'Replace the current customer link?', body: 'The existing customer will not be deleted or changed.', confirmLabel: 'Continue'}))) return false
        selected = {mode, row}
        return true
      },
      onSaved: async () => {
        await conversionPanel.close({force: true})
        if (target === 'user') navigate('organization', {section: 'users'})
        else if (target === 'customer' && selected?.mode === 'create') openCustomer(null, person, markConverted)
        else if (selected?.row) markConverted(selected.row)
      },
    })
  }

  async function setArchived(person, archived) {
    store.updateEntity('person', person.id, {archived})
    await panel.close({force: true})
    toast({tone: 'info', title: archived ? 'Person archived' : 'Person restored', body: archived ? 'Hidden from the list. Pick “Archived” in the quick menu to find them.' : titleOf(person)})
  }

  async function deletePerson(person) {
    const ok = await confirm({
      title: 'Delete this person?',
      body: 'The record is removed. Linked items keep the link and show it as unavailable until someone removes it.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    store.deleteEntity('person', person.id)
    await panel.close({force: true})
    toast({tone: 'info', title: 'Person deleted', body: titleOf(person)})
  }

  function build() {
    const root = view()
    root.querySelector('[data-collab-new]').addEventListener('click', () => openPerson(null))
    root.querySelector('[data-collab-home]').addEventListener('click', event => {
      event.preventDefault()
      goHome()
    })
    built = true
  }

  return {
    id: 'people',
    refreshLocale() {
      if (built) { buildToolbar(); renderBody() }
      if (!recordRoot.hidden && panel.currentRef()) {
        // Preserve unsaved user input while translating the page's chrome.
        recordRoot.querySelector('[data-person-breadcrumb]').textContent = titleOf(store.getEntity('person', panel.currentRef().id))
      }
    },
    get roots() {
      return view() ? [view()] : []
    },
    activate({openId} = {}) {
      if (!view()) return
      if (!built) build()
      buildToolbar()
      renderBody()
      const body = listRoot.querySelector('[data-collab-body]')
      resolveScroller(body).scrollTop = listScroll.top
      const table = body.querySelector('.data-table-scroll')
      if (table) {
        table.scrollTop = listScroll.tableTop
        table.scrollLeft = listScroll.tableLeft
      }
      unsubscribe?.()
      unsubscribe = store.subscribe(() => {
        if (view() && !view().hidden) renderBody()
      })
      if (openId) openPerson(openId)
      else if (returnToId) {
        view().querySelector(`[data-row-open="${CSS.escape(returnToId)}"]`)?.focus({preventScroll: true})
      }
    },
    deactivate() {
      getTable().deactivate()
      unsubscribe?.()
      unsubscribe = null
    },
    dispose() {
      unsubscribe?.()
    },
    /* Related Items uses the same full-page person navigation as the list. */
    openPerson,
    recordPage: {
      id: 'people-record',
      get roots() { return [recordRoot] },
      activate({openId, edit = false} = {}) { showPerson(openId, {edit}) },
      requestLeave: () => panel.requestLeave(),
      deactivate() { panel.close({force: true, notify: false}) },
      dispose() { panel.close({force: true, notify: false}) },
    },
  }
}
