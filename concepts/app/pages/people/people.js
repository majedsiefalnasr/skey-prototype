import {uiLocale} from '../../core/locale.js'
import {resolveScroller} from '../../core/scroll.js'
import {createScrollNavigator} from '../customers/layouts.js'
import {createCollabPanel} from '../../components/collab/panel.js'
import {renderDataListColumnControls} from '../../components/data-list/list.js'
import {DATA_LIST_CONFIG} from '../../components/data-list/columns.js'
import {renderDataListGroupTrigger} from '../../components/data-list/statistics.js'
// People Data — people you deal with before (or instead of) them becoming
// a customer, supplier, employee or user. A list + full-page record with
// bilingual names, fixed contact fields, live duplicate feedback, and
// conversion previews. The record groups its fields into Customer-style
// cards so both Help Screens detail surfaces read the same way.
import {
  escapeHtml,
  icon,
  setFieldError,
  emptyState,
  ROW_BUTTON_CLASS,
  VIEW_LIST_CLASS,
  viewRow,
} from '../../components/collab/fields.js'
import {
  PERSON_SECTIONS,
  createBlankPerson,
  personData,
  readContacts,
  renderPersonSections,
  renderPersonPhotoPreview,
} from './sections.js'
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
const DUPLICATE_REASON = {mobile: 'Same mobile number', phone: 'Same phone number', email: 'Same email address', name: 'Same name'}
const isHttpUrl = value => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const primaryOf = (person, kind) =>
  (person.contacts || []).filter(c => (kind === 'email' ? c.kind === 'email' : c.kind !== 'email')).sort((a, b) => Number(b.primary) - Number(a.primary))[0]?.value || ''

export function createPeople({store, toast, panel: conversionPanel, confirm, goHome, navigate, getTable, customers, openCustomer}) {
  const listRoot = document.querySelector('.people-view')
  const view = () => listRoot
  const recordRoot = document.querySelector('.people-record-view')
  const panel = createCollabPanel({root: recordRoot, modal: false, confirm})
  /* The list pager lives in the shell's `.page-footer` slot (shell.js). */
  const listFooter = document.querySelector('[data-people-list-fnav]')
  const state = {view: 'list', query: '', lifecycle: '', fieldFilters: []}
  let built = false
  let unsubscribe = null
  let returnToId = null
  let listScroll = {top: 0, tableTop: 0, tableLeft: 0}

  const recordFooter = document.querySelector('.page-footer [data-page-footer="people-record"]')
  recordFooter.querySelector('[data-person-pager]').append(document.querySelector('#t-pager').content.cloneNode(true))
  const sectionNav = recordRoot.querySelector('[data-person-section-nav]')
  const recordCanvas = recordRoot.querySelector('[data-person-content]')
  const sectionOrder = PERSON_SECTIONS.map(section => section.key)
  const scrollState = {activeSection: 'identity', expanded: new Set(sectionOrder)}
  const scrollNavigator = createScrollNavigator({root: recordCanvas, sectionOrder, customerState: scrollState, prefix: 'person'})
  let currentPersonId = null
  let recordEditing = false

  function renderSectionNav() {
    sectionNav.innerHTML = PERSON_SECTIONS.map(section =>
      `<button type="button" data-person-scroll-section="${section.key}" aria-controls="person-section-${section.key}" aria-current="${section.key === scrollState.activeSection ? 'page' : 'false'}">${escapeHtml(uiLocale.t(section.title))}</button>`
    ).join('')
  }

  function recordOrder() {
    const visible = filtered()
    const tableRows = state.view === 'list' ? getTable().model.rowsInView() : []
    const visibleIds = new Set(visible.map(person => person.id))
    const ordered = tableRows.filter(person => visibleIds.has(person.id)).map(person => store.getEntity('person', person.id)).filter(Boolean)
    const inView = ordered.length === visible.length ? ordered : visible
    return inView.some(person => person.id === currentPersonId) ? inView : store.listEntities('person')
  }

  function syncRecordChrome() {
    const people = recordOrder()
    const position = people.findIndex(person => person.id === currentPersonId) + 1
    const locked = recordEditing || !position
    const pager = recordFooter.querySelector('.pager')
    const input = pager.querySelector('.pg-i')
    input.value = position || ''
    input.max = String(people.length)
    input.readOnly = locked
    pager.querySelector('.tot').textContent = `${uiLocale.t('of')} ${people.length}`
    for (const [selector, boundary] of [['.pg-f', position <= 1], ['.pg-p', position <= 1], ['.pg-n', position >= people.length], ['.pg-l', position >= people.length]]) {
      pager.querySelector(selector).disabled = locked || boundary
    }
    recordFooter.querySelector('[data-person-position]').textContent = position
      ? `${uiLocale.t('Record')} ${position} ${uiLocale.t('of')} ${people.length}`
      : uiLocale.t('New person')
    recordRoot.querySelector('[data-person-new]').hidden = recordEditing
    renderSectionNav()
  }

  function trackSections(editing) {
    recordEditing = editing
    scrollNavigator.stopTracking()
    syncRecordChrome()
    requestAnimationFrame(() => {
      if (recordRoot.hidden) return
      scrollNavigator.startSpy()
      scrollNavigator.syncActiveSection()
    })
  }

  const goRecord = value => {
    if (recordEditing) return
    const people = recordOrder()
    const index = Math.min(people.length, Math.max(1, Number(value) || 1)) - 1
    if (people[index]) openPerson(people[index].id)
  }
  const currentPosition = () => recordOrder().findIndex(person => person.id === currentPersonId) + 1
  recordFooter.querySelector('.pg-f').addEventListener('click', () => goRecord(1))
  recordFooter.querySelector('.pg-p').addEventListener('click', () => goRecord(currentPosition() - 1))
  recordFooter.querySelector('.pg-n').addEventListener('click', () => goRecord(currentPosition() + 1))
  recordFooter.querySelector('.pg-l').addEventListener('click', () => goRecord(recordOrder().length))
  recordFooter.querySelector('.pg-i').addEventListener('change', event => goRecord(event.target.value))
  recordRoot.querySelector('[data-person-new]').addEventListener('click', () => openPerson(null))
  sectionNav.addEventListener('click', event => {
    const button = event.target.closest('[data-person-scroll-section]')
    if (button) scrollNavigator.activateSection(button.dataset.personScrollSection)
  })
  sectionNav.addEventListener('keydown', event => {
    const vertical = !matchMedia('(max-width: 720px)').matches
    const previous = vertical ? 'ArrowUp' : document.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    const next = vertical ? 'ArrowDown' : document.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    if (![previous, next, 'Home', 'End'].includes(event.key)) return
    const buttons = [...sectionNav.querySelectorAll('button:not([hidden])')]
    const index = buttons.indexOf(document.activeElement)
    if (index < 0) return
    event.preventDefault()
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === next ? 1 : -1) + buttons.length) % buttons.length
    buttons[target].focus()
    scrollNavigator.activateSection(buttons[target].dataset.personScrollSection)
  })
  const recordScroller = resolveScroller(recordCanvas)
  recordScroller.addEventListener('scroll', () => {
    if (!recordRoot.hidden) scrollNavigator.syncActiveSection()
  }, {passive: true})
  for (const name of ['wheel', 'touchstart', 'pointerdown']) {
    recordCanvas.addEventListener(name, event => {
      if (!event.target.closest('[data-person-scroll-section]') && scrollNavigator.isNavigating()) scrollNavigator.stopNavigation({interrupt: true})
    }, {passive: true})
  }

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
      right: `${searchField({attr: 'collab-search', label: 'people', value: state.query})}${state.view === 'list' ? renderDataListGroupTrigger(DATA_LIST_CONFIG.people, getTable().getState(), {t: uiLocale.t, encodeHtml: escapeHtml, dataListIcon: icon}) : ''}${menuDetails({attr: 'people-columns', iconName: 'i-sliders', label: 'Columns', end: true, items: renderDataListColumnControls(DATA_LIST_CONFIG.people, getTable().getState(), {t: uiLocale.t, encodeHtml: escapeHtml}) + `<button type="button" data-people-save-layout>${uiLocale.t('Save layout')}</button><button type="button" data-people-reset-layout>${uiLocale.t('Reset layout')}</button>`})}${viewMenu({
        attr: 'view-menu',
        label: presentation.label,
        iconName: presentation.icon,
        options: viewOptions,
      })}`,
    })}</div>`
    host.querySelectorAll('[data-list-group-add]').forEach(button => button.addEventListener('click', event => {
      closeOwnedMenu(button)
      getTable().handleToolbarCommand(event)
      buildToolbar()
    }))
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
      listFooter.innerHTML = ''
      return
    }
    if (state.view === 'cards') {
      getTable().deactivate()
      listFooter.innerHTML = ''
      body.innerHTML = cardsMarkup(people)
      body.querySelectorAll('[data-row-open]').forEach(button => button.addEventListener('click', () => openPerson(button.dataset.rowOpen)))
    } else {
      body.innerHTML = '<div data-people-table></div>'
      const table = getTable()
      table.getState().hiddenColumns.delete('nameEn')
      table.setRows(people.map(person => ({...person, phone: primaryOf(person, 'phone'), email: primaryOf(person, 'email'), conversionLabel: person.convertedTo ? conversionLabel(person.convertedTo.target) : ''})))
      table.activate({root: body.querySelector('[data-people-table]'), footer: listFooter})
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
  const convertedNotice = person =>
    person.convertedTo
      ? `<p class="mt-4 rounded-md bg-[var(--line-2)] px-3 py-2 text-[13px] text-ink">${icon('i-check')} ${uiLocale.t(
          'Converted to'
        )} ${escapeHtml(conversionLabel(person.convertedTo.target))}${
          person.convertedTo.recordId ? ` · ${escapeHtml(person.convertedTo.recordId)}` : ' (simulated)'
        }</p>`
      : ''

  function editorMarkup(person) {
    return `<div class="mb-3 hidden rounded-md bg-[var(--warn-bg)] p-4 text-[13px] leading-5 text-ink" data-duplicate role="status" aria-live="polite" aria-atomic="true"></div>
      ${renderPersonSections(person)}
      ${convertedNotice(person)}`
  }

  /* Read-only twin of the editor; the form waits behind Edit. */
  function viewMarkup(person) {
    return `${renderPersonSections(person, {readOnly: true})}${convertedNotice(person)}`
  }

  function readEditor(body) {
    const values = {}
    PERSON_SECTIONS.forEach(section =>
      section.fields.forEach(fieldDef => {
        if (fieldDef.type === 'contact') return
        values[fieldDef.key] = body.querySelector(`#${CSS.escape(fieldDef.id)}`)?.value.trim() ?? ''
      })
    )
    values.contacts = readContacts(body)
    return values
  }

  function bindEditor(body, personId, {onPhotoChange = () => {}} = {}) {
    const checkDuplicates = () => {
      const values = readEditor(body)
      const matches = findPersonDuplicates({id: personId, ...values}, store.listEntities('person'))
      const box = body.querySelector('[data-duplicate]')
      box.classList.toggle('hidden', !matches.length)
      box.innerHTML = matches.length
        ? `<div class="flex items-start gap-3">
            <span class="mt-0.5 flex size-5 flex-none items-center justify-center text-[var(--warn-ink)]" aria-hidden="true">${icon('i-warn', 20)}</span>
            <div class="min-w-0 flex-1">
              <p class="m-0! text-[13px] font-semibold leading-5">${escapeHtml(uiLocale.t('Possible duplicate'))}</p>
              <p class="mt-1! mb-0! text-[13px] leading-5">${escapeHtml(uiLocale.t('Review the matching person before saving. You can still save this record.'))}</p>
              <ul class="mt-2! mb-0! grid list-none gap-2 p-0!">${matches
            .map(
              ({person, field: matched}) =>
                `<li class="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5"><bdi class="font-semibold [overflow-wrap:anywhere]">${escapeHtml(titleOf(person))}</bdi><span class="text-xs text-muted">${escapeHtml(uiLocale.t(DUPLICATE_REASON[matched]))}</span><button type="button" class="inline-flex min-h-8 items-center rounded-sm border-0 bg-transparent px-1 text-[13px] font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" data-open-duplicate="${escapeHtml(person.id)}" aria-label="${escapeHtml(uiLocale.t('Review person'))}: ${escapeHtml(titleOf(person))}">${escapeHtml(uiLocale.t('Review person'))}</button></li>`
            )
            .join('')}</ul></div></div>`
        : ''
      box.querySelectorAll('[data-open-duplicate]').forEach(button =>
        button.addEventListener('click', async () => {
          if (await panel.close()) openPerson(button.dataset.openDuplicate)
        })
      )
    }
    body.addEventListener('input', event => {
      if (event.target.matches('#person-name-en, [data-contact-value]')) checkDuplicates()
    })
    const photoInput = body.querySelector('#person-photo-input')
    body.querySelector('[data-person-photo-select]')?.addEventListener('click', () => photoInput?.click())
    photoInput?.addEventListener('change', () => {
      const file = photoInput.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const photo = {src: String(reader.result), alt: `Photo of ${readEditor(body).nameEn || 'person'}`}
        onPhotoChange(photo)
        const frame = body.querySelector('[data-person-photo-preview]')
        if (frame) frame.innerHTML = renderPersonPhotoPreview({...readEditor(body), photo})
        body.querySelector('[data-person-photo-select]').lastChild.textContent = ` ${uiLocale.t('Change photo')}`
      }
      reader.readAsDataURL(file)
    })
    checkDuplicates()
  }

  function validate(body, values) {
    setFieldError(body, 'person-name-en', values.nameEn ? '' : 'Name is required.')
    let firstInvalid = values.nameEn ? null : body.querySelector('#person-name-en')
    body.querySelectorAll('[data-contact-row]').forEach(row => {
      const kind = row.querySelector('[data-contact-kind]').value
      const input = row.querySelector('[data-contact-value]')
      const value = input.value.trim()
      const message = !value
        ? ''
        : kind === 'email'
          ? EMAIL_PATTERN.test(value)
            ? ''
            : 'Enter a valid email address.'
          : value.replace(/\D/g, '').length >= 7
            ? ''
            : 'Enter a valid phone number (at least 7 digits).'
      setFieldError(body, input.id, message)
      input.toggleAttribute('aria-invalid', Boolean(message))
      if (message && !firstInvalid) firstInvalid = input
    })
    const website = values.website || ''
    const websiteError = website && !isHttpUrl(website) ? 'Enter a valid website.' : ''
    setFieldError(body, 'person-website', websiteError)
    if (websiteError && !firstInvalid) firstInvalid = body.querySelector('#person-website')
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
    currentPersonId = existing?.id || null
    scrollState.activeSection = 'identity'
    const person = existing ? personData(existing) : createBlankPerson()
    let draft = person
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
        draft = person
        body.innerHTML = editorMarkup(person)
        bindEditor(body, existing?.id, {onPhotoChange: photo => (draft = {...draft, photo})})
        trackSections(true)
      },
      view: body => {
        body.innerHTML = viewMarkup(person)
        trackSections(false)
      },
      save: body => {
        const values = {...readEditor(body), lifecycle: person.lifecycle, photo: draft.photo}
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
    return deleteRecords([person.id])
  }

  async function deleteRecords(keys) {
    const people = keys.map(id => store.getEntity('person', id)).filter(Boolean)
    if (!people.length) return
    const ok = await confirm({
      title: people.length === 1 ? 'Delete this person?' : 'Delete selected people?',
      body: 'The record is removed. Linked items keep the link and show it as unavailable until someone removes it.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    people.forEach(person => getTable().getState().selected.delete(person.id))
    people.forEach(person => store.deleteEntity('person', person.id))
    await panel.close({force: true})
    toast({tone: 'info', title: people.length === 1 ? 'Person deleted' : 'People deleted', body: people.map(titleOf).join(', ')})
  }

  function build() {
    const root = view()
    root.addEventListener('click', event => {
      if (event.target.closest('[data-list-group-remove], [data-list-group-clear]')) buildToolbar()
    })
    root.addEventListener('drop', event => {
      if (event.target.closest('[data-list-group-drop]')) buildToolbar()
    })
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
      if (!recordRoot.hidden && panel.isOpen()) {
        syncRecordChrome()
        // Preserve unsaved user input while translating the page's chrome.
        recordRoot.querySelector('[data-person-breadcrumb]').textContent = currentPersonId ? titleOf(store.getEntity('person', currentPersonId)) : uiLocale.t('New person')
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
    deleteRecords,
    recordPage: {
      id: 'people-record',
      get roots() { return [recordRoot] },
      activate({openId, edit = false} = {}) { showPerson(openId, {edit}) },
      requestLeave: () => panel.requestLeave(),
      deactivate() { scrollNavigator.stopTracking(); panel.close({force: true, notify: false}) },
      dispose() { scrollNavigator.stopTracking(); panel.close({force: true, notify: false}) },
    },
  }
}
