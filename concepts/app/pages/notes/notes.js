import {uiLocale} from '../../core/locale.js'
import {resolveScroller} from '../../core/scroll.js'
const {t} = uiLocale
// Notes — Kanban (Draft / Active / Archived) and a List view over the
// collaboration store, with the invoices list chrome: a quick-filter menu,
// a "+ Filter" menu with an inline chip, search, and a change-view menu.
// Notes carry no dates, priority or assignee: work with an owner and a
// due date is an Activity, reachable through "Create related". Page state
// (view, search, filters) lives here and survives navigating away and back.
import {
  escapeHtml,
  icon,
  field,
  textInput,
  textarea,
  selectInput,
  switchRow,
  setFieldError,
  emptyState,
  GRID_CLASS,
  CHIP_CLASS,
  ROW_BUTTON_CLASS,
  VIEW_LIST_CLASS,
  viewRow,
  recordHighlights,
} from '../../components/collab/fields.js'
import {
  menuItemRadio,
  menuDetails,
  clearFilterButton,
  searchField,
  viewMenu,
  toolbarRow,
  closeOwnedMenu,
  collabFieldChoices,
  collabFilterChips,
  collabFilterValueLabel,
  collabFilterMatches,
  bindCollabFieldFilters,
  restoreCollabFilterFocus,
} from '../../components/collab/list-toolbar.js'
import {renderBoard} from '../../components/collab/kanban.js'
import {titleOf, searchText} from '../../components/collab/meta.js'
import {formatDate, relativeDay} from '../../core/collab-dates.js'

const parseTags = value =>
  [...new Set(String(value).split(',').map(tag => tag.trim()).filter(Boolean))]

/* The change-view menu's entries. Notes have no calendar: the two views
   are the board and the invoices-style table. */
const VIEW_PRESENTATION = {
  kanban: {label: t("Kanban"), icon: 'i-board'},
  list: {label: t("List"), icon: 'i-list'},
}
const QUICK_FILTERS = [
  ['all', 'All notes', 'i-doc'],
  ['pinned', 'Pinned', 'i-spark'],
  ['draft', 'Draft', 'i-clock'],
  ['active', 'Active', 'i-check'],
  ['archived', 'Archived', 'i-archive'],
]
/* The invoices list table, same classes as renderDataList emits — the
   shell, the scroll box and the bordered sticky-header grid. */
const INV_GRID_CLASS =
  'inv-grid w-full [border-collapse:collapse] [font-size:13px] [&_th]:text-start [&_th]:[padding:8px_12px] [&_th]:text-muted [&_th]:font-medium [&_th]:[border-bottom:1px_solid_var(--line)] [&_th]:whitespace-nowrap [&_th]:sticky [&_th]:top-0 [&_th]:z-[3] [&_td]:[padding:8px_12px] [&_td]:[border-bottom:1px_solid_var(--line-2)] [&_td]:text-ink [&_td]:whitespace-nowrap [&_td]:[text-overflow:ellipsis] [&_td]:overflow-hidden [&_td]:[max-width:200px] [&_tbody_tr:hover]:[background:var(--hover-overlay)] [&_tbody_tr:hover]:[cursor:pointer]'

export function createNotes({store, toast, panel, related, confirm, goHome, beforeAction = async () => true}) {
  const view = () => document.querySelector('.notes-view')
  const state = {view: 'kanban', query: '', quick: 'all', fieldFilters: [], sortKey: 'updated', sortDir: 'desc', archivedOpen: false}
  let built = false
  let unsubscribe = null
  const columns = () => store.listNoteColumns()
  const statusOptions = () => columns().map(column => [column.id, column.label])
  const noteStatusLabel = id => columns().find(column => column.id === id)?.label || id
  const quickFilters = () => [...QUICK_FILTERS.filter(([id]) => !['draft', 'active', 'archived'].includes(id)), ...columns().map(column => [column.id, column.label, column.id === 'archived' ? 'i-archive' : 'i-doc'])]

  const todayKey = () => store.now().slice(0, 10)
  const updatedLabel = note => relativeDay(note.updatedAt, todayKey()) ?? formatDate(note.updatedAt)

  function openColumnManager() {
    const original = columns()
    let added = 0
    const row = column => {
      const system = ['draft', 'active', 'archived'].includes(column.id)
      const count = store.listEntities('note').filter(note => note.status === column.id).length
      return `<div class="relative grid min-w-0 gap-2 rounded-lg border border-line bg-surface p-3 transition-[border-color,background-color,box-shadow] ${column.id === 'archived' ? '' : 'cursor-grab active:cursor-grabbing hover:border-[var(--accent-line)]'} [&.drop-target]:border-[var(--accent)] [&.drop-target]:bg-[var(--accent-soft)] data-[drop-position=before]:[box-shadow:0_-3px_0_var(--accent)] data-[drop-position=after]:[box-shadow:0_3px_0_var(--accent)]" data-stage-id="${escapeHtml(column.id)}"${column.id === 'archived' ? '' : ' draggable="true"'}>
        <div class="flex items-center gap-2">${column.id === 'archived' ? `<span class="text-xs text-muted">${t('Archived always stays last.')}</span>` : `<button type="button" class="ibtn cursor-grab touch-none active:cursor-grabbing" draggable="true" data-stage-drag aria-label="${t('Drag to reorder')}">${icon('i-grip', 16)}</button><span class="text-xs text-muted">${t('Drag to reorder')}</span>`}</div>
        <label class="min-w-0 text-xs text-muted">${t('Column name')}<input class="mt-1 min-w-0 w-full rounded border border-line bg-surface p-2 text-sm text-ink max-[720px]:text-base" data-stage-label maxlength="40" value="${escapeHtml(column.label)}"></label>
        <div class="flex flex-wrap items-center gap-2 text-xs"><label class="flex min-h-8 items-center gap-1"><input type="checkbox" class="size-4 shrink-0 accent-[var(--accent)]" data-stage-hidden${column.hidden ? ' checked' : ''}>${t('Hide column')}</label><span class="ms-auto text-muted">${count} ${t('notes')}</span>
          <button type="button" class="lbtn" data-stage-order="-1"${column.id === 'archived' ? ' disabled' : ''} aria-label="${t('Move earlier')}">↑</button><button type="button" class="lbtn" data-stage-order="1"${column.id === 'archived' ? ' disabled' : ''} aria-label="${t('Move later')}">↓</button></div>
        ${system ? `<small class="text-muted">${t('System column — its lifecycle is preserved.')}</small>` : `<label class="flex min-h-8 items-center gap-2 text-xs"><input type="checkbox" class="size-4 shrink-0 accent-[var(--accent)]" data-stage-remove>${t('Remove column on save')}</label><label class="min-w-0 text-xs text-muted">${t('Move its notes to')}<select class="ms-2 max-w-full rounded border border-line bg-surface p-1 text-sm text-ink max-[720px]:text-base" data-stage-destination>${original.filter(item => item.id !== column.id && item.id !== 'archived').map(item => `<option value="${item.id}">${escapeHtml(item.label)}</option>`).join('')}</select></label>`}
      </div>`
    }
    panel.open({title: 'Manage note columns', description: 'Hidden columns keep their notes. Removing a column moves its notes to your chosen destination.',
      render: body => {
        body.innerHTML = `<div class="grid gap-3" data-stage-list>${original.map(row).join('')}</div><button type="button" class="lbtn mt-3" data-stage-add>${t('Add column')}</button><p class="mt-2 text-sm text-[var(--danger)]" role="alert" data-stage-error></p>`
        const list = body.querySelector('[data-stage-list]')
        let dragging = null
        let dropTarget = null
        let placement = 'before'
        const clearTarget = () => {
          dropTarget?.classList.remove('drop-target')
          if (dropTarget) delete dropTarget.dataset.dropPosition
          dropTarget = null
        }
        const targetAt = (target, y) => {
          const row = target?.closest('[data-stage-id]')
          clearTarget()
          if (!dragging || !row || row === dragging || !list.contains(row)) return
          const bounds = row.getBoundingClientRect()
          placement = row.dataset.stageId === 'archived' || y < bounds.top + bounds.height / 2 ? 'before' : 'after'
          dropTarget = row
          row.classList.add('drop-target')
          row.dataset.dropPosition = placement
        }
        const finishDrag = () => {
          clearTarget()
          dragging?.classList.remove('opacity-50')
          dragging = null
        }
        const drop = () => {
          if (dropTarget && dragging) {
            if (placement === 'before') dropTarget.before(dragging)
            else dropTarget.after(dragging)
            dragging.querySelector('[data-stage-drag]')?.focus({preventScroll: true})
          }
          finishDrag()
        }
        list.addEventListener('dragstart', event => {
          if (event.target.closest('input, select, textarea') || (event.target.closest('button') && !event.target.closest('[data-stage-drag]'))) { event.preventDefault(); return }
          dragging = event.target.closest('[data-stage-id]')
          if (!dragging || dragging.dataset.stageId === 'archived') { event.preventDefault(); dragging = null; return }
          event.dataTransfer.setData('text/plain', dragging.dataset.stageId)
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setDragImage(dragging, 24, 24)
          dragging.classList.add('opacity-50')
        })
        list.addEventListener('dragover', event => {
          if (!dragging) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          targetAt(event.target, event.clientY)
        })
        list.addEventListener('dragleave', event => { if (!list.contains(event.relatedTarget)) clearTarget() })
        list.addEventListener('drop', event => { if (dragging) event.preventDefault(); drop() })
        list.addEventListener('dragend', finishDrag)
        // Touch uses the handle; arrow buttons remain the keyboard alternative.
        list.addEventListener('pointerdown', event => {
          const handle = event.target.closest('[data-stage-drag]')
          if (!handle || event.pointerType !== 'touch') return
          dragging = handle.closest('[data-stage-id]')
          handle.setPointerCapture(event.pointerId)
          dragging.classList.add('opacity-50')
        })
        list.addEventListener('pointermove', event => {
          if (event.pointerType === 'touch' && dragging) {
            targetAt(document.elementFromPoint(event.clientX, event.clientY), event.clientY)
            const scroller = resolveScroller(body)
            if (event.clientY > scroller.getBoundingClientRect().bottom - 30) scroller.scrollTop += 12
            if (event.clientY < scroller.getBoundingClientRect().top + 30) scroller.scrollTop -= 12
          }
        })
        list.addEventListener('pointerup', event => { if (event.pointerType === 'touch') drop() })
        list.addEventListener('pointercancel', event => { if (event.pointerType === 'touch') finishDrag() })
        body.querySelector('[data-stage-add]').addEventListener('click', () => {
          const id = `stage-${Date.now()}-${++added}`
          list.querySelector('[data-stage-id="archived"]').insertAdjacentHTML('beforebegin', row({id, label: '', hidden: false}))
          body.querySelector(`[data-stage-id="${id}"] [data-stage-label]`).focus()
        })
        body.addEventListener('click', event => {
          const button = event.target.closest('[data-stage-order]')
          if (!button) return
          const item = button.closest('[data-stage-id]')
          if (item.dataset.stageId === 'archived') return
          if (button.dataset.stageOrder === '-1' && item.previousElementSibling) item.previousElementSibling.before(item)
          else if (button.dataset.stageOrder === '1' && item.nextElementSibling?.dataset.stageId !== 'archived' && item.nextElementSibling) item.nextElementSibling.after(item)
          button.focus()
        })
      },
      save: async body => {
        const moves = {}
        let moved = 0
        const next = [...body.querySelectorAll('[data-stage-id]')].flatMap(row => {
          const id = row.dataset.stageId
          if (row.querySelector('[data-stage-remove]')?.checked) {
            moves[id] = row.querySelector('[data-stage-destination]').value
            moved += store.listEntities('note').filter(note => note.status === id).length
            return []
          }
          return [{id, label: row.querySelector('[data-stage-label]').value, hidden: row.querySelector('[data-stage-hidden]').checked}]
        })
        if (Object.keys(moves).length && !(await confirm({title: 'Remove selected columns?', body: t('{count} notes will move to the selected destinations. No notes will be deleted.').replace('{count}', moved), confirmLabel: 'Move notes and remove'}))) return false
        const result = store.configureNoteColumns(next, moves)
        body.querySelector('[data-stage-error]').textContent = result.error ? t(result.error) : ''
        if (!result.error) {
          if (!quickFilters().some(([id]) => id === state.quick)) state.quick = 'all'
          buildToolbar()
          renderBody()
          toast({tone: 'ok', title: 'Columns saved', body: 'Your notes and links are preserved.'})
        }
        return !result.error
      },
    })
  }

  const filterFields = () => {
    const tags = [...new Set(store.listEntities('note').flatMap(note => note.tags || []))].sort()
    return [
      {
        key: 'tag',
        label: t("Tag"),
        icon: 'i-spark',
        type: 'select',
        options: tags.length ? tags.map(tag => ({value: tag, label: tag})) : [{value: '', label: t("No tags yet")}],
        match: (note, filter) => (note.tags || []).includes(filter.value),
      },
      {key: 'title', label: t("Note title"), icon: 'i-doc', type: 'text'},
    ]
  }

  function filtered() {
    const query = state.query.trim().toLowerCase()
    const fields = filterFields()
    return store
      .listEntities('note')
      .filter(note =>
        state.quick === 'pinned'
          ? note.pinned
          : state.quick === 'archived'
            ? note.status === 'archived'
            : columns().some(column => column.id === state.quick)
              ? note.status === state.quick
              : true
      )
      .filter(note => !query || searchText(note).includes(query))
      .filter(note =>
        state.fieldFilters.every(filter => collabFilterMatches(note, filter, fields.find(field => field.key === filter.key)))
      )
      .sort((a, b) =>
        state.sortKey === 'title'
          ? titleOf(a).localeCompare(titleOf(b)) * (state.sortDir === 'asc' ? 1 : -1) || b.updatedAt.localeCompare(a.updatedAt)
          : b.updatedAt.localeCompare(a.updatedAt) * (state.sortDir === 'asc' ? -1 : 1)
      )
  }

  const relatedCount = note => store.getRelatedItems('note', note.id).length

  function cardMarkup(note) {
    const excerpt = String(note.body || '').replace(/\s+/g, ' ').trim()
    const count = relatedCount(note)
    return `<span class="flex items-start gap-1.5">
        ${note.pinned ? `<span class="mt-0.5 text-accent">${icon('i-spark', 12)}<span class="sr-only">${t("Pinned.")} </span></span>` : ''}
        <span class="card-title min-w-0 flex-1 text-[13px] font-semibold text-ink [overflow-wrap:anywhere]" dir="auto">${escapeHtml(titleOf(note))}</span>
      </span>
      ${excerpt ? `<span class="mt-1 line-clamp-2 block text-xs text-muted" dir="auto">${escapeHtml(excerpt)}</span>` : ''}
      <span class="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        ${(note.tags || []).map(tag => `<span class="${CHIP_CLASS}">${escapeHtml(tag)}</span>`).join('')}
        ${count ? `<span class="inline-flex items-center gap-1">${icon('i-flow', 11)}${count} ${t('related')}</span>` : ''}
        <span class="ms-auto">${escapeHtml(updatedLabel(note))}</span>
      </span>`
  }

  function buildToolbar() {
    const host = view().querySelector('[data-collab-toolbar]')
    const fields = filterFields()
    /* The invoices list chrome: quick filter and "+ Filter" — the field
       chooser, like Customers — with editable value chips on the left,
       search and the view menu on the right. Sorting is done by the
       table's own headers, like the invoices grid. */
    const quick = quickFilters().find(([id]) => id === state.quick) || QUICK_FILTERS[0]
    const quickItems = quickFilters().map(([id, label, iconName]) =>
      menuItemRadio({attr: 'quick-filter', value: id, label, iconName, checked: state.quick === id})
    ).join('')
    const filterItems = collabFieldChoices({fields, activeKeys: new Set(state.fieldFilters.map(filter => filter.key))})
    const presentation = VIEW_PRESENTATION[state.view]
    const viewOptions = Object.entries(VIEW_PRESENTATION)
      .map(([id, entry]) =>
        menuItemRadio({attr: 'view-select', value: id, label: `${entry.label} view`, iconName: entry.icon, checked: state.view === id})
      )
      .join('')
    host.innerHTML = `<div class="data-list-controls grid gap-2 mb-2.5">${toolbarRow({
      ariaLabel: 'Notes table controls',
      left: `${menuDetails({attr: 'quick-menu', iconName: quick[2], label: quick[1], items: quickItems})}${menuDetails({
        attr: 'filter-menu',
        iconName: 'i-plus',
        label: t("Filter"),
        items: filterItems,
      })}${collabFilterChips({fields, filters: state.fieldFilters})}${
        state.fieldFilters.length || state.quick !== 'all' ? clearFilterButton({attr: 'clear-filters'}) : ''
      }`,
      right: `${searchField({attr: 'collab-search', label: t("notes"), value: state.query})}<button type="button" class="lbtn" data-manage-columns>${t('Manage columns')}</button>${viewMenu({
        attr: 'view-menu',
        label: presentation.label,
        iconName: presentation.icon,
        options: viewOptions,
      })}`,
    })}</div>`
    host.querySelector('[data-manage-columns]').addEventListener('click', openColumnManager)
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
        state.quick = item.dataset.quickFilter
        closeOwnedMenu(event.currentTarget)
        refresh()
      })
    )
    bindCollabFieldFilters(host, {fields, filters: state.fieldFilters, onChange})
    host.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
      state.quick = 'all'
      state.fieldFilters.splice(0, state.fieldFilters.length)
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
    host.querySelectorAll('[data-view-select]').forEach(item =>
      item.addEventListener('click', event => {
        state.view = item.dataset.viewSelect
        closeOwnedMenu(event.currentTarget)
        refresh()
      })
    )
  }

  function renderBody() {
    const body = view().querySelector('[data-collab-body]')
    /* The board still pans horizontally on the body; vertical scrolling is
       the view's `.page-content` (core/scroll.js). */
    const scroller = resolveScroller(body)
    const boardScroll = body.scrollLeft
    const bodyScroll = scroller.scrollTop
    const notes = filtered()
    const filtering = Boolean(
      state.query.trim() || state.fieldFilters.some(filter => filter.value) || state.quick !== 'all'
    )
    if (!store.listEntities('note').length) {
      body.innerHTML = emptyState({iconName: 'i-doc', title: 'No notes yet', body: 'Capture one with New note — only a title is needed.'})
      return
    }
    if (state.view === 'kanban') {
      renderBoard(body, {
        moveColumns: columns(),
        columns: columns().filter(column => !column.hidden || state.quick === column.id).map(column => ({
          id: column.id,
          label: column.label,
          items: notes.filter(note => note.status === column.id),
          collapsible: column.id === 'archived',
          collapsed: column.id === 'archived' && !state.archivedOpen,
          quickAdd: column.id === 'archived' ? '' : '+ Add note',
        })),
        renderCard: cardMarkup,
        titleOf,
        emptyText: filtering ? 'No matching notes.' : 'No notes here.',
        onOpen: id => openNote(id),
        onMove: moveNote,
        onQuickAdd: quickAdd,
        onToggleColumn: () => {
          state.archivedOpen = !state.archivedOpen
          renderBody()
          body.querySelector('[data-toggle-column]')?.focus()
        },
      })
      body.scrollLeft = boardScroll
      scroller.scrollTop = bodyScroll
      return
    }
    const rows = state.quick === 'archived' ? notes : notes.filter(note => note.status !== 'archived')
    if (!rows.length) {
      /* Name the filter that actually emptied the list: the search text,
         an applied field filter, or the quick filter — never a generic
         quoted phrase. */
      const valued = state.fieldFilters.find(filter => filter.value)
      const valuedField = valued ? filterFields().find(field => field.key === valued.key) : null
      const emptyTitle = state.query.trim()
        ? `No notes match “${state.query.trim()}”`
        : valuedField
          ? valuedField.type === 'select'
            ? `No notes match the ${valuedField.label.toLowerCase()} “${collabFilterValueLabel(valuedField, valued)}”`
            : `No notes match “${valued.value}”`
          : state.quick !== 'all'
            ? `No ${(quickFilters().find(([id]) => id === state.quick)?.[1] ?? 'matching').toLowerCase()} notes`
            : 'No notes to show'
      body.innerHTML = emptyState({iconName: 'i-search', title: emptyTitle, body: 'Clear the search or filters to see every note.'})
      return
    }
    /* The invoices list shell: bordered surface, sticky-header grid, rows
       that open the note like the invoice list opens an invoice. Title and
       Updated sort through their own headers — the invoices pattern — so
       the toolbar carries no sort select. */
    const header = (key, label) => {
      const active = state.sortKey === key
      return `<th scope="col" aria-sort="${active ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}">
        <button type="button" class="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-start font-[inherit] font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]" data-sort="${key}">${escapeHtml(t(label))}<span class="${active && state.sortDir === 'asc' ? 'rotate-180' : ''}">${icon('i-caret', 11)}</span></button>
      </th>`
    }
    body.innerHTML = `<div class="data-list-shell relative overflow-visible rounded-lg border border-line bg-surface [box-shadow:var(--shadow-1)]">
      <div class="data-table-scroll overflow-auto rounded-[inherit] max-w-full max-h-[max(280px,calc(100dvh-360px))]">
        <table class="${INV_GRID_CLASS} min-w-[720px] [table-layout:fixed]" data-notes-grid>
          <colgroup><col><col style="width:110px"><col style="width:160px"><col style="width:110px"><col style="width:140px"></colgroup>
          <thead><tr>${header('title', 'Title')}<th scope="col">${t("Status")}</th><th scope="col">${t("Tags")}</th><th scope="col">${t("Related")}</th>${header('updated', 'Updated')}</tr></thead>
          <tbody>${rows
            .map(
              note => `<tr data-row-id="${escapeHtml(note.id)}">
            <td><button type="button" class="${ROW_BUTTON_CLASS}" data-row-open="${escapeHtml(note.id)}" dir="auto">${note.pinned ? `${icon('i-spark', 11)} <span class="sr-only">${t("Pinned.")} </span>` : ''}${escapeHtml(titleOf(note))}</button></td>
            <td><span class="badge gray">${escapeHtml(noteStatusLabel(note.status))}</span></td>
            <td>${(note.tags || []).map(tag => `<span class="${CHIP_CLASS}">${escapeHtml(tag)}</span>`).join(' ')}</td>
            <td>${relatedCount(note)}</td>
            <td>${escapeHtml(updatedLabel(note))}</td>
          </tr>`
            )
            .join('')}</tbody>
        </table>
      </div>
    </div>`
    body.querySelectorAll('tbody tr[data-row-id]').forEach(row =>
      row.addEventListener('click', () => openNote(row.dataset.rowId))
    )
    body.querySelectorAll('[data-sort]').forEach(button =>
      button.addEventListener('click', event => {
        event.stopPropagation()
        const key = button.dataset.sort
        if (state.sortKey === key) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'
        else {
          state.sortKey = key
          state.sortDir = key === 'title' ? 'asc' : 'desc'
        }
        renderBody()
        view().querySelector(`[data-collab-body] [data-sort="${key}"]`)?.focus()
      })
    )
  }

  async function quickAdd(status, title) {
    if (!(await beforeAction())) return
    const note = store.createEntity('note', {title, body: '', status, tags: [], pinned: false})
    toast({tone: 'ok', title: 'Note added', body: titleOf(note)})
    view().querySelector(`[data-quick-add="${status}"]`)?.focus({preventScroll: true})
  }

  async function moveNote(id, status) {
    if (!(await beforeAction())) { renderBody(); return }
    const note = store.getEntity('note', id)
    if (!note || note.status === status) return
    store.updateEntity('note', id, {status})
    toast({tone: 'info', title: uiLocale.t("Moved to {v0}").replace('{v0}', () => uiLocale.t(String(noteStatusLabel(status)))), body: titleOf(note)})
    view().querySelector(`[data-move="${CSS.escape(id)}"]`)?.focus()
  }

  function editorMarkup(note) {
    return `<div class="${GRID_CLASS}">
      ${field({id: 'note-title', label: t("Title"), required: true, wide: true, control: textInput({id: 'note-title', value: note.title, required: true, extra: {autofocus: true}})})}
      ${field({id: 'note-body', label: t("Note"), wide: true, control: textarea({id: 'note-body', value: note.body, rows: 7})})}
      ${field({id: 'note-status', label: t("Status"), control: selectInput({id: 'note-status', value: note.status, options: statusOptions()})})}
      ${field({id: 'note-tags', label: t("Tags"), hint: t("Separate tags with commas."), control: textInput({id: 'note-tags', value: (note.tags || []).join(', '), describedBy: 'note-tags-hint'})})}
      <div class="sm:col-span-2">${switchRow({id: 'note-pinned', label: t("Pin this note to the top"), checked: note.pinned})}</div>
    </div>`
  }

  /* Read-only twin of the editor: the panel opens an existing note here and
     only swaps in the form when the user asks to edit. */
  function viewMarkup(note) {
    return `${recordHighlights([...(note.pinned ? [{label: 'Pinned', iconName: 'i-spark'}] : []), ...(note.status === 'archived' ? [{label: 'Archived', tone: 'muted', iconName: 'i-archive'}] : [])])}<dl class="${VIEW_LIST_CLASS}">
      ${viewRow('Title', escapeHtml(titleOf(note)))}
      ${viewRow('Status', `<span class="badge gray">${escapeHtml(noteStatusLabel(note.status))}</span>`)}
      ${viewRow('Tags', (note.tags || []).length ? note.tags.map(tag => `<span class="${CHIP_CLASS}">${escapeHtml(tag)}</span>`).join(' ') : '—')}
      ${viewRow('Pinned', note.pinned ? `<span class="badge fix inline-flex items-center gap-1">${icon('i-spark')} ${t('Pinned')}</span>` : t('No'))}
      ${viewRow('Note', note.body ? `<span class="whitespace-pre-line" dir="auto">${escapeHtml(note.body)}</span>` : '—')}
    </dl>`
  }

  function readEditor(body) {
    return {
      title: body.querySelector('#note-title').value.trim(),
      body: body.querySelector('#note-body').value,
      status: body.querySelector('#note-status').value,
      tags: parseTags(body.querySelector('#note-tags').value),
      pinned: body.querySelector('#note-pinned').checked,
    }
  }

  function openNote(id, {edit = false} = {}) {
    const existing = id ? store.getEntity('note', id) : null
    if (id && !existing) {
      toast({tone: 'warn', title: 'This note is no longer available', body: 'It may have been deleted.'})
      return
    }
    const note = existing || {title: '', body: '', status: 'draft', tags: [], pinned: false}
    const ref = existing ? {type: 'note', id: existing.id} : null
    /* Header note for an existing note: the first line of the note itself,
       so the panel says what the record is about, not just its status —
       which the chip already carries. */
    const excerpt = existing
      ? ((existing.body || '')
          .split('\n')
          .map(line => line.trim())
          .find(Boolean) || '')
      : ''
    panel.open({
      ref,
      edit,
      status: existing
        ? {label: noteStatusLabel(existing.status), tone: {draft: 'warn', active: 'ok', archived: 'gray'}[existing.status] || 'gray'}
        : undefined,
      title: existing ? titleOf(existing) : 'New note',
      description: existing ? excerpt.slice(0, 160) : 'Capture a note — only a title is needed.',
      render: body => {
        body.innerHTML = editorMarkup(note)
      },
      view: body => {
        body.innerHTML = viewMarkup(note)
      },
      save: async body => {
        const values = readEditor(body)
        setFieldError(body, 'note-title', values.title ? '' : 'Title is required.')
        if (!values.title) {
          body.querySelector('#note-title').focus()
          return false
        }
        if (!(await beforeAction(document.querySelector('#collab-panel [data-panel-save]')))) return false
        if (existing) {
          store.updateEntity('note', existing.id, values)
          toast({tone: 'ok', title: 'Note saved', body: values.title})
        } else {
          store.createEntity('note', values)
          toast({tone: 'ok', title: 'Note created', body: values.title})
        }
        return true
      },
      menu: existing
        ? [
            existing.status === 'archived'
              ? {label: t("Restore"), icon: 'i-undo', run: () => setStatus(existing, 'active', 'Note restored')}
              : {label: t("Archive"), icon: 'i-archive', run: () => setStatus(existing, 'archived', 'Note archived')},
            {label: t("Delete"), icon: 'i-trash', danger: true, run: () => deleteNote(existing)},
          ]
        : [],
      related: ref ? (host, options) => related.render(host, ref, options) : null,
    })
  }

  async function setStatus(note, status, message) {
    if (!(await beforeAction())) return
    store.updateEntity('note', note.id, {status})
    toast({tone: 'info', title: message, body: titleOf(note)})
    await panel.close({force: true})
  }

  async function deleteNote(note) {
    const ok = await confirm({
      title: 'Delete this note?',
      body: 'The note is removed. Items linked to it keep the link and show it as unavailable until someone removes it.',
      confirmLabel: t("Delete"),
      tone: 'danger',
    })
    if (!ok || !(await beforeAction())) return
    store.deleteEntity('note', note.id)
    await panel.close({force: true})
    toast({tone: 'info', title: 'Note deleted', body: titleOf(note)})
  }

  function build() {
    const root = view()
    root.querySelector('[data-collab-new]').addEventListener('click', () => openNote(null))
    root.querySelector('[data-collab-home]').addEventListener('click', event => {
      event.preventDefault()
      goHome()
    })
    built = true
  }

  return {
    id: 'notes',
    refreshLocale() { if (built) { buildToolbar(); renderBody() } },
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
        if (view() && !view().hidden) {
          buildToolbar()
          renderBody()
        }
      })
      if (openId) openNote(openId)
    },
    deactivate() {
      unsubscribe?.()
      unsubscribe = null
    },
    dispose() {
      unsubscribe?.()
    },
    /* Exposed so a Related Items row — anywhere, including a screen this
       page has never visited — can open the note editor without the panel
       owning the navigation. */
    openNote,
  }
}
