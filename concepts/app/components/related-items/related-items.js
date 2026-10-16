import {uiLocale} from '../../core/locale.js'
const {t} = uiLocale
// Related Items — one component for every collaboration screen. Renders the
// "Related items" section for an item, the "Link existing…" picker and the
// "Create related" menu. All relationship state lives in the collaboration
// store's links table; this component only calls link/unlink/getRelatedItems,
// so a link made here is visible from both ends everywhere.
import {escapeHtml, icon} from '../collab/fields.js'
import {holdFocus} from '../collab/panel.js'
import {TYPE_META, TYPE_ORDER, titleOf, metaLine, searchText} from '../collab/meta.js'
import {addMinutes, nextHalfHour} from '../../core/collab-dates.js'

const ROW_CLASS = 'flex items-start gap-2 rounded-md border border-line px-2.5 py-2'
const OPEN_CLASS =
  'flex min-w-0 flex-1 items-start gap-2 border-0 bg-transparent p-0 text-start hover:[&_.rel-title]:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]'
const MENU_ITEM_CLASS =
  'flex min-h-8 w-full items-center gap-2 rounded-[5px] border-0 bg-transparent px-2 py-1.5 text-start text-[13px] text-ink hover:bg-[var(--line-2)] focus-visible:bg-[var(--line-2)] focus-visible:outline-none'

const typeBadge = type =>
  `<span class="badge gray inline-flex shrink-0 items-center gap-1">${icon(TYPE_META[type].icon, 11)}<span>${escapeHtml(t(TYPE_META[type].label))}</span></span>`

export function createRelatedItems({store, toast, currentUserId, openItem, beforeAction = async () => true}) {
  const todayKey = () => store.now().slice(0, 10)
  /** Summary line with the store's custom mail folders, so a linked message
   *  filed in a folder the user created reports its name, not its id. */
  const metaOf = entity => metaLine(entity, {todayKey: todayKey(), folders: store.listFolders()})

  /** Defaults for "Create related": minimal, so the relationship exists
   *  before the user edits anything. */
  function defaultsFor(type) {
    const start = nextHalfHour(store.now())
    if (type === 'note') return {title: 'Untitled note', body: '', status: 'draft', tags: [], pinned: false}
    if (type === 'activity')
      return {kind: 'todo', summary: 'Follow up', notes: '', assigneeIds: [currentUserId], assigneeId: currentUserId, status: 'planned', priority: 'normal', archived: false}
    return {title: 'New event', allDay: false, start, end: addMinutes(start, 60), location: '', participantIds: [currentUserId], reminder: 'none', repeat: 'none', description: ''}
  }

  async function createRelated(type, sourceRef) {
    if (!(await beforeAction())) return
    const created = store.createEntity(type, defaultsFor(type))
    store.link(sourceRef, {type, id: created.id})
    toast({tone: 'ok', title: `${TYPE_META[type].label} created and linked`, body: titleOf(created)})
    /* Opened with edit: the record was just created here — the form is the
       point, not the new read-only view. */
    openItem({type, id: created.id}, {edit: true})
  }

  function sortedRelated(ref) {
    return store
      .getRelatedItems(ref.type, ref.id)
      .sort(
        (a, b) =>
          TYPE_ORDER.indexOf(a.ref.type) - TYPE_ORDER.indexOf(b.ref.type) ||
          titleOf(a.entity).localeCompare(titleOf(b.entity))
      )
  }

  function rowMarkup({ref, entity}, index) {
    if (!entity) {
      return `<li class="${ROW_CLASS} border-dashed text-muted" data-related-row data-unavailable>
        <span class="flex min-w-0 flex-1 items-start gap-2">${typeBadge(ref.type)}<span><span class="block text-[13px] font-medium">${t("Unavailable item")}</span><span class="block text-xs">This ${escapeHtml(TYPE_META[ref.type].label.toLowerCase())} was deleted.</span></span></span>
        <button type="button" class="ibtn" data-related-remove="${index}" aria-label="${escapeHtml(t("Remove link to unavailable item"))}">${icon('i-x')}</button>
      </li>`
    }
    const title = titleOf(entity)
    return `<li class="${ROW_CLASS}" data-related-row data-type="${ref.type}">
      <button type="button" class="${OPEN_CLASS}" data-related-open="${index}" aria-label="Open ${escapeHtml(t(TYPE_META[ref.type].label))}: ${escapeHtml(title)}">
        ${typeBadge(ref.type)}
        <span class="min-w-0"><span class="rel-title block text-[13px] font-medium text-ink [overflow-wrap:anywhere]" dir="auto">${escapeHtml(title)}</span><span class="block text-xs text-muted">${escapeHtml(metaOf(entity))}</span></span>
      </button>
      <button type="button" class="ibtn" data-related-remove="${index}" aria-label="Remove link to ${escapeHtml(title)}">${icon('i-x')}</button>
    </li>`
  }

  /**
   * Render the Related Items section for `ref` into `host`.
   * @param {HTMLElement} host
   * @param {{type: string, id: string}} ref
   * @param {{allowCreate?: boolean}} [options]
   */
  function render(host, ref, {allowCreate = true} = {}) {
    const items = sortedRelated(ref)
    host.innerHTML = `<div class="flex items-center gap-2">
        <h3 class="flex-1 text-[13px] font-semibold text-ink">${t("Related items")} <span class="font-normal text-muted">(${items.length})</span></h3>
      </div>
      ${
        items.length
          ? `<ul class="mt-2 grid list-none gap-1.5 p-0">${items.map(rowMarkup).join('')}</ul>`
          : `<p class="mt-1.5 text-[13px] text-muted" data-related-empty>${t("No related items yet. Link existing work or create something new from here.")}</p>`
      }
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" class="lbtn" data-related-link>${icon('i-plus')} Link existing…</button>
        ${
          allowCreate
            ? `<div class="relative" data-related-create-wrap>
          <button type="button" class="lbtn" data-related-create aria-haspopup="menu" aria-expanded="false">Create related ${icon('i-caret', 12)}</button>
          <div class="absolute bottom-full start-0 z-10 mb-1 hidden min-w-[160px] gap-0.5 rounded-lg border border-line bg-surface p-1.5 shadow-shell [&.open]:grid" role="menu" aria-label="${escapeHtml(t("Create related"))}">
            ${['note', 'activity', 'event']
              .map(type => `<button type="button" role="menuitem" class="${MENU_ITEM_CLASS}" data-create-type="${type}">${icon(TYPE_META[type].icon)}${TYPE_META[type].label}</button>`)
              .join('')}
          </div>
        </div>`
            : ''
        }
      </div>`

    host.querySelectorAll('[data-related-open]').forEach(button =>
      button.addEventListener('click', () => openItem(items[Number(button.dataset.relatedOpen)].ref))
    )
    host.querySelectorAll('[data-related-remove]').forEach(button =>
      button.addEventListener('click', async () => {
        if (!(await beforeAction())) return
        const item = items[Number(button.dataset.relatedRemove)]
        store.unlink(ref, item.ref)
        toast({tone: 'info', title: 'Link removed', body: item.entity ? `${titleOf(item.entity)} was not deleted.` : ''})
        render(host, ref, {allowCreate})
        host.querySelector('[data-related-link]')?.focus()
      })
    )
    host.querySelector('[data-related-link]').addEventListener('click', () =>
      openPicker(ref, {onClose: () => render(host, ref, {allowCreate})})
    )
    const createButton = host.querySelector('[data-related-create]')
    if (createButton) {
      const menu = createButton.nextElementSibling
      const setOpen = open => {
        menu.classList.toggle('open', open)
        createButton.setAttribute('aria-expanded', String(open))
        if (open) menu.querySelector('[role=menuitem]').focus()
      }
      createButton.addEventListener('click', () => setOpen(!menu.classList.contains('open')))
      menu.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          setOpen(false)
          createButton.focus()
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          const options = [...menu.querySelectorAll('[role=menuitem]')]
          const index = options.indexOf(document.activeElement)
          options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length].focus()
        }
      })
      menu.addEventListener('click', event => {
        const option = event.target.closest('[data-create-type]')
        if (!option) return
        setOpen(false)
        createRelated(option.dataset.createType, ref)
      })
    }
  }

  /* ---------- picker ---------- */
  function openPicker(ref, {types = TYPE_ORDER, onClose = () => {}} = {}) {
    const dialog = document.getElementById('collab-picker')
    const box = dialog.querySelector('[data-picker-box]')
    const search = dialog.querySelector('[data-picker-search]')
    const typeBar = dialog.querySelector('[data-picker-types]')
    const results = dialog.querySelector('[data-picker-results]')
    const status = dialog.querySelector('[data-picker-status]')
    const done = dialog.querySelector('[data-picker-done]')
    const returnTo = document.activeElement
    let filter = types.length === 1 ? types[0] : 'all'
    let options = []
    let active = 0
    let linkedCount = 0

    typeBar.innerHTML = [['all', 'All'], ...types.map(type => [type, TYPE_META[type].plural])]
      .filter(([id]) => types.length > 1 || id !== 'all')
      .map(
        ([id, label]) =>
          `<button type="button" data-type="${id}" aria-pressed="${id === filter}" class="min-h-7 rounded-full border border-line bg-surface px-2.5 text-xs text-ink hover:bg-[var(--line-2)] aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] aria-pressed:text-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]">${escapeHtml(t(label))}</button>`
      )
      .join('')

    const linkedKeys = () =>
      new Set([`${ref.type}:${ref.id}`, ...store.getRelatedItems(ref.type, ref.id).map(item => `${item.ref.type}:${item.ref.id}`)])

    function renderResults() {
      const query = search.value.trim().toLowerCase()
      const excluded = linkedKeys()
      options = (filter === 'all' ? types : [filter])
        .flatMap(type => store.listEntities(type))
        .filter(entity => !excluded.has(`${entity.type}:${entity.id}`))
        .filter(entity => !query || searchText(entity).includes(query))
        .slice(0, 50)
      active = Math.min(active, Math.max(options.length - 1, 0))
      results.innerHTML = options.length
        ? options
            .map((entity, index) => {
              const title = titleOf(entity)
              const meta = metaOf(entity)
              return `<li role="option" id="collab-picker-option-${index}" data-index="${index}" aria-selected="${index === active}" aria-label="${escapeHtml(`${TYPE_META[entity.type].label} ${title}, ${meta}`)}" class="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 hover:bg-[var(--line-2)] aria-selected:bg-[var(--accent-soft)]">${typeBadge(entity.type)}<span class="min-w-0"><span class="block text-[13px] font-medium text-ink [overflow-wrap:anywhere]" dir="auto">${escapeHtml(title)}</span><span class="block text-xs text-muted">${escapeHtml(meta)}</span></span></li>`
            })
            .join('')
        : `<li class="px-2 py-6 text-center text-[13px] text-muted" role="presentation">${query ? `Nothing matches “${escapeHtml(search.value.trim())}”.` : 'Everything here is already linked.'}</li>`
      search.setAttribute('aria-activedescendant', options.length ? `collab-picker-option-${active}` : '')
    }

    async function choose(index) {
      const entity = options[index]
      if (!entity || !(await beforeAction())) return
      const {created} = store.link(ref, {type: entity.type, id: entity.id})
      if (created) {
        linkedCount += 1
        status.textContent = `Linked to ${titleOf(entity)}`
        toast({tone: 'ok', title: 'Linked', body: `${TYPE_META[entity.type].label}: ${titleOf(entity)}`})
      }
      renderResults()
      search.focus()
    }

    const onInput = () => {
      active = 0
      renderResults()
    }
    const onKey = event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        if (!options.length) return
        active = (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
        renderResults()
        results.querySelector(`[data-index="${active}"]`)?.scrollIntoView({block: 'nearest'})
      } else if (event.key === 'Enter') {
        event.preventDefault()
        choose(active)
      }
    }
    const onResultClick = event => {
      const option = event.target.closest('[role=option]')
      if (option) choose(Number(option.dataset.index))
    }
    const onType = event => {
      const button = event.target.closest('[data-type]')
      if (!button) return
      filter = button.dataset.type
      typeBar.querySelectorAll('[data-type]').forEach(b => b.setAttribute('aria-pressed', String(b === button)))
      active = 0
      renderResults()
    }
    const onBackdrop = event => {
      if (event.target === dialog) close()
    }

    function close() {
      release()
      search.removeEventListener('input', onInput)
      search.removeEventListener('keydown', onKey)
      results.removeEventListener('click', onResultClick)
      typeBar.removeEventListener('click', onType)
      done.removeEventListener('click', close)
      dialog.removeEventListener('click', onBackdrop)
      dialog.classList.remove('open')
      onClose(linkedCount)
      if (returnTo && document.contains(returnTo)) returnTo.focus()
      else document.querySelector('#collab-panel [data-related-link]')?.focus()
    }

    search.value = ''
    status.textContent = ''
    renderResults()
    dialog.classList.add('open')
    const release = holdFocus(box, close)
    search.addEventListener('input', onInput)
    search.addEventListener('keydown', onKey)
    results.addEventListener('click', onResultClick)
    typeBar.addEventListener('click', onType)
    done.addEventListener('click', close)
    dialog.addEventListener('click', onBackdrop)
    search.focus()
  }

  return {render, openPicker, createRelated}
}
