// People Data — people you deal with before (or instead of) them becoming
// a customer, supplier, employee or user. A list + side-panel record with
// bilingual names, repeatable contacts, live duplicate feedback, and a
// "Convert to" action that is simulated: it marks the person as converted
// and never creates or edits Customers (or any other) records.
import {
  escapeHtml,
  icon,
  field,
  textInput,
  textarea,
  setFieldError,
  emptyState,
  GRID_CLASS,
  SECTION_TITLE_CLASS,
  ERROR_CLASS,
  TABLE_CLASS,
  ROW_BUTTON_CLASS,
  VIEW_LIST_CLASS,
  viewRow,
} from '../../components/collab/fields.js'
import {
  toolbarRow,
  menuDetails,
  menuItemRadio,
  menuItemCheck,
  menuGroupLabel,
  filterChip,
  clearFilterButton,
  searchField,
  closeOwnedMenu,
} from '../../components/collab/list-toolbar.js'
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
   lifecycle ("Status"), named in the summary. */
const QUICK_FILTERS = [
  ['', 'All people', 'i-user'],
  ['lead', 'Lead', 'i-spark'],
  ['contact', 'Contact', 'i-check'],
]
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FIELD_LABEL = {mobile: 'mobile', phone: 'phone', email: 'email', name: 'name'}
const SMALL_CONTROL =
  'min-h-8 rounded-md border border-line bg-surface px-2 text-[13px] text-ink focus-visible:outline-none focus-visible:[box-shadow:0_0_0_3px_var(--accent-soft)]'

const primaryOf = (person, kind) =>
  (person.contacts || []).filter(c => (kind === 'email' ? c.kind === 'email' : c.kind !== 'email')).sort((a, b) => Number(b.primary) - Number(a.primary))[0]?.value || ''

export function createPeople({store, toast, panel, related, confirm, goHome}) {
  const view = () => document.querySelector('.people-view')
  const state = {query: '', lifecycle: '', showArchived: false}
  let built = false
  let unsubscribe = null

  function filtered() {
    const query = state.query.trim().toLowerCase()
    return store
      .listEntities('person')
      .filter(p => state.showArchived || !p.archived)
      .filter(p => !state.lifecycle || p.lifecycle === state.lifecycle)
      .filter(p => !query || searchText(p).includes(query))
      .sort((a, b) => titleOf(a).localeCompare(titleOf(b)))
  }

  /** Applied field filters, inline as removable chips like the invoices
   *  list — the quick filter is already named by its own menu. */
  const filterChips = () =>
    (state.showArchived ? [filterChip({attr: 'filter-remove', value: 'archived', label: 'Show archived'})] : []).join('')

  const filterActive = () => Boolean(state.lifecycle || state.showArchived)

  function buildToolbar() {
    const host = view().querySelector('[data-collab-toolbar]')
    /* The shared list-toolbar chrome: quick (Status) menu and "+ Filter"
       with an inline chip on the left, search on the right — People is
       list-only, so there is no view menu. */
    const quick = QUICK_FILTERS.find(([id]) => id === state.lifecycle) || QUICK_FILTERS[0]
    const quickItems = QUICK_FILTERS.map(([id, label, iconName]) =>
      menuItemRadio({attr: 'quick-filter', value: id, label, iconName, checked: state.lifecycle === id})
    ).join('')
    const filterItems = `${menuGroupLabel('Archived')}${menuItemCheck({
      attr: 'filter-archived',
      value: 'archived',
      label: 'Show archived',
      checked: state.showArchived,
      iconName: 'i-eye',
    })}`
    host.innerHTML = `<div class="data-list-controls grid gap-2 mb-2.5">${toolbarRow({
      ariaLabel: 'People table controls',
      left: `${menuDetails({attr: 'quick-menu', iconName: quick[2], label: quick[1], items: quickItems})}${menuDetails({
        attr: 'filter-menu',
        iconName: 'i-plus',
        label: 'Filter',
        items: filterItems,
      })}${filterChips()}${filterActive() ? clearFilterButton({attr: 'clear-filters'}) : ''}`,
      right: `${searchField({attr: 'collab-search', label: 'people', value: state.query})}`,
    })}</div>`
    const refresh = () => {
      buildToolbar()
      renderBody()
    }
    host.querySelectorAll('[data-quick-filter]').forEach(item =>
      item.addEventListener('click', event => {
        state.lifecycle = item.dataset.quickFilter
        closeOwnedMenu(event.currentTarget)
        refresh()
      })
    )
    host.querySelector('[data-filter-archived]')?.addEventListener('click', event => {
      state.showArchived = !state.showArchived
      closeOwnedMenu(event.currentTarget)
      refresh()
    })
    host.querySelectorAll('[data-filter-remove]').forEach(item =>
      item.addEventListener('click', () => {
        if (item.dataset.filterRemove === 'archived') state.showArchived = false
        refresh()
      })
    )
    host.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
      state.lifecycle = ''
      state.showArchived = false
      refresh()
    })
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
      body.innerHTML = state.query.trim()
        ? emptyState({iconName: 'i-search', title: `No people match “${state.query.trim()}”`, body: 'Try a name, company, phone number or email.'})
        : emptyState({iconName: 'i-user', title: 'No people yet', body: 'Add someone with New person — only an English name is required.'})
      return
    }
    body.innerHTML = `<table class="${TABLE_CLASS}">
      <thead><tr><th scope="col">Name</th><th scope="col">Company</th><th scope="col">Mobile / phone</th><th scope="col">Email</th><th scope="col">Status</th></tr></thead>
      <tbody>${people
        .map(
          p => `<tr>
          <td><button type="button" class="${ROW_BUTTON_CLASS}" data-row-open="${escapeHtml(p.id)}"><span class="block" dir="auto">${escapeHtml(p.nameEn)}</span>${p.nameAr ? `<span class="block text-xs font-normal text-muted" dir="rtl" lang="ar">${escapeHtml(p.nameAr)}</span>` : ''}</button></td>
          <td dir="auto">${escapeHtml(p.company || '—')}</td>
          <td dir="ltr" class="text-start">${escapeHtml(primaryOf(p, 'phone') || '—')}</td>
          <td>${escapeHtml(primaryOf(p, 'email') || '—')}</td>
          <td><span class="flex flex-wrap gap-1"><span class="badge gray">${p.lifecycle === 'contact' ? 'Contact' : 'Lead'}</span>${p.convertedTo ? `<span class="badge ok">Converted to ${escapeHtml(conversionLabel(p.convertedTo.target))}</span>` : ''}${p.archived ? '<span class="badge gray">Archived</span>' : ''}</span></td>
        </tr>`
        )
        .join('')}</tbody></table>`
    body.querySelectorAll('[data-row-open]').forEach(button => button.addEventListener('click', () => openPerson(button.dataset.rowOpen)))
  }

  /* ---------- editor ---------- */
  const contactRow = (contact, index) => `<div class="grid gap-1" data-contact-row>
      <div class="flex flex-wrap items-center gap-2">
        <label class="sr-only" for="person-contact-kind-${index}">Contact type</label>
        <select id="person-contact-kind-${index}" class="${SMALL_CONTROL}" data-contact-kind>${CONTACT_KINDS.map(([id, label]) => `<option value="${id}"${id === contact.kind ? ' selected' : ''}>${label}</option>`).join('')}</select>
        <label class="sr-only" for="person-contact-value-${index}">Contact value</label>
        <input id="person-contact-value-${index}" class="${SMALL_CONTROL} min-w-[180px] flex-1" data-contact-value dir="ltr" value="${escapeHtml(contact.value)}" autocomplete="off">
        <label class="inline-flex items-center gap-1 text-xs text-muted"><input type="radio" name="person-primary" data-contact-primary${contact.primary ? ' checked' : ''}> Primary</label>
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
      <details class="mt-5 rounded-md border border-line px-3 py-2"${person.city || person.country ? ' open' : ''}>
        <summary class="cursor-pointer text-[13px] font-medium text-ink">Address</summary>
        <div class="${GRID_CLASS} mt-3">
          ${field({id: 'person-country', label: 'Country', control: textInput({id: 'person-country', value: person.country})})}
          ${field({id: 'person-city', label: 'City', control: textInput({id: 'person-city', value: person.city})})}
        </div>
      </details>
      <div class="mt-5">${field({id: 'person-notes', label: 'Notes', control: textarea({id: 'person-notes', value: person.notes, rows: 3})})}</div>
      ${person.convertedTo ? `<p class="mt-4 rounded-md bg-[var(--line-2)] px-3 py-2 text-[13px] text-ink">${icon('i-check')} Converted to ${escapeHtml(conversionLabel(person.convertedTo.target))} (simulated — no ${escapeHtml(conversionLabel(person.convertedTo.target))} record exists).</p>` : ''}`
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
      ${person.convertedTo ? viewRow('Converted', `${icon('i-check')} ${escapeHtml(conversionLabel(person.convertedTo.target))} (simulated)`) : ''}
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

  function openPerson(id, {edit = false} = {}) {
    const existing = id ? store.getEntity('person', id) : null
    if (id && !existing) {
      toast({tone: 'warn', title: 'This person is no longer available', body: 'The record may have been deleted.'})
      return
    }
    const person = existing || {nameEn: '', nameAr: '', company: '', jobTitle: '', contacts: [], city: '', country: '', lifecycle: 'lead', archived: false, notes: ''}
    const ref = existing ? {type: 'person', id: existing.id} : null
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
          store.createEntity('person', {...values, archived: false})
          toast({tone: 'ok', title: 'Person added', body: values.nameEn})
        }
        return true
      },
      menu: existing
        ? [
            ...CONVERSION_TARGETS.map(([target, label]) => ({label: `Convert to ${label}`, icon: 'i-next', run: () => convert(existing, target)})),
            existing.archived
              ? {label: 'Restore', icon: 'i-undo', run: () => setArchived(existing, false)}
              : {label: 'Archive', icon: 'i-archive', run: () => setArchived(existing, true)},
            {label: 'Delete', icon: 'i-trash', danger: true, run: () => deletePerson(existing)},
          ]
        : [],
      related: ref ? host => related.render(host, ref) : null,
    })
  }

  async function convert(person, target) {
    const label = conversionLabel(target)
    const current = person.convertedTo ? conversionLabel(person.convertedTo.target) : null
    const ok = await confirm({
      title: current ? `Replace conversion to ${current}?` : `Convert ${titleOf(person)} to ${label}?`,
      body: `Prototype: this only marks the person as converted to ${label}. No ${label} record is created and the Customers screens are not changed.${current ? ` The current mark (${current}) is replaced.` : ''}`,
      confirmLabel: 'Convert',
    })
    if (!ok) return
    store.updateEntity('person', person.id, {convertedTo: {target, at: store.now()}, lifecycle: 'contact'})
    await panel.close({force: true})
    toast({tone: 'ok', title: `Marked as converted to ${label}`, body: `${titleOf(person)} — simulated, no ${label} record was created.`})
  }

  async function setArchived(person, archived) {
    store.updateEntity('person', person.id, {archived})
    await panel.close({force: true})
    toast({tone: 'info', title: archived ? 'Person archived' : 'Person restored', body: archived ? 'Hidden from the list. Turn on “Show archived” to find them.' : titleOf(person)})
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
    get roots() {
      return view() ? [view()] : []
    },
    activate({openId} = {}) {
      if (!view()) return
      if (!built) build()
      buildToolbar()
      renderBody()
      unsubscribe?.()
      unsubscribe = store.subscribe(() => {
        if (view() && !view().hidden) renderBody()
      })
      if (openId) openPerson(openId)
    },
    deactivate() {
      unsubscribe?.()
      unsubscribe = null
    },
    dispose() {
      unsubscribe?.()
    },
    /* Exposed so a Related Items row can open the person editor in place. */
    openPerson,
  }
}
