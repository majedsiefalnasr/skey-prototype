// Notes — Kanban (Draft / Active / Archived) and List views over the
// collaboration store. Notes carry no dates, priority or assignee: work
// with an owner and a due date is an Activity, reachable through
// "Create related". Page state (view, search, filters) lives here and
// survives navigating away and back.
import {
  escapeHtml,
  icon,
  field,
  textInput,
  textarea,
  selectInput,
  checkbox,
  setFieldError,
  searchBox,
  toolbarSelect,
  toolbarToggle,
  segmented,
  emptyState,
  GRID_CLASS,
  CHIP_CLASS,
  TABLE_CLASS,
  ROW_BUTTON_CLASS,
} from '../../components/collab/fields.js'
import {renderBoard} from '../../components/collab/kanban.js'
import {NOTE_STATUSES, TYPE_META, noteStatusLabel, titleOf, searchText} from '../../components/collab/meta.js'
import {formatDate, relativeDay} from '../../core/collab-dates.js'

const parseTags = value =>
  [...new Set(String(value).split(',').map(tag => tag.trim()).filter(Boolean))]

export function createNotes({store, toast, panel, related, confirm, goHome}) {
  const view = () => document.querySelector('.notes-view')
  const state = {view: 'kanban', query: '', tag: '', pinnedOnly: false, showArchived: false, sort: 'updated', archivedOpen: false}
  let built = false
  let unsubscribe = null

  const todayKey = () => store.now().slice(0, 10)
  const updatedLabel = note => relativeDay(note.updatedAt, todayKey()) ?? formatDate(note.updatedAt)

  function filtered() {
    const query = state.query.trim().toLowerCase()
    return store
      .listEntities('note')
      .filter(note => !query || searchText(note).includes(query))
      .filter(note => !state.tag || (note.tags || []).includes(state.tag))
      .filter(note => !state.pinnedOnly || note.pinned)
      .sort((a, b) =>
        state.sort === 'title'
          ? titleOf(a).localeCompare(titleOf(b))
          : Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)
      )
  }

  const relatedCount = note => store.getRelatedItems('note', note.id).length

  function cardMarkup(note) {
    const excerpt = String(note.body || '').replace(/\s+/g, ' ').trim()
    const count = relatedCount(note)
    return `<span class="flex items-start gap-1.5">
        ${note.pinned ? `<span class="mt-0.5 text-accent">${icon('i-spark', 12)}<span class="sr-only">Pinned. </span></span>` : ''}
        <span class="card-title min-w-0 flex-1 text-[13px] font-semibold text-ink [overflow-wrap:anywhere]" dir="auto">${escapeHtml(titleOf(note))}</span>
      </span>
      ${excerpt ? `<span class="mt-1 line-clamp-2 block text-xs text-muted" dir="auto">${escapeHtml(excerpt)}</span>` : ''}
      <span class="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        ${(note.tags || []).map(tag => `<span class="${CHIP_CLASS}">${escapeHtml(tag)}</span>`).join('')}
        ${count ? `<span class="inline-flex items-center gap-1">${icon('i-flow', 11)}${count} related</span>` : ''}
        <span class="ms-auto">${escapeHtml(updatedLabel(note))}</span>
      </span>`
  }

  function buildToolbar() {
    const host = view().querySelector('[data-collab-toolbar]')
    const tags = [...new Set(store.listEntities('note').flatMap(note => note.tags || []))].sort()
    host.innerHTML = `${searchBox({id: 'notes-search', label: 'Search notes', value: state.query})}
      ${toolbarSelect({id: 'notes-tag', label: 'Tag', value: state.tag, options: [['', 'All tags'], ...tags.map(tag => [tag, tag])]})}
      ${toolbarToggle({id: 'notes-pinned', label: 'Pinned only', checked: state.pinnedOnly})}
      <span data-list-only class="contents">
        ${toolbarSelect({id: 'notes-sort', label: 'Sort', value: state.sort, options: [['updated', 'Recently updated'], ['title', 'Title A–Z']]})}
        ${toolbarToggle({id: 'notes-archived', label: 'Show archived', checked: state.showArchived})}
      </span>
      <span class="ms-auto">${segmented({label: 'View', views: [['kanban', 'Kanban'], ['list', 'List']], current: state.view})}</span>`
    host.querySelector('#notes-search').addEventListener('input', event => {
      state.query = event.target.value
      renderBody()
    })
    host.querySelector('#notes-tag').addEventListener('change', event => {
      state.tag = event.target.value
      renderBody()
    })
    host.querySelector('#notes-pinned').addEventListener('change', event => {
      state.pinnedOnly = event.target.checked
      renderBody()
    })
    host.querySelector('#notes-sort').addEventListener('change', event => {
      state.sort = event.target.value
      renderBody()
    })
    host.querySelector('#notes-archived').addEventListener('change', event => {
      state.showArchived = event.target.checked
      renderBody()
    })
    host.querySelectorAll('[data-view-switch] button').forEach(button =>
      button.addEventListener('click', () => {
        state.view = button.dataset.value
        host.querySelectorAll('[data-view-switch] button').forEach(b => b.setAttribute('aria-pressed', String(b === button)))
        syncToolbar()
        renderBody()
      })
    )
    syncToolbar()
  }

  function syncToolbar() {
    const listOnly = view().querySelector('[data-list-only]')
    if (listOnly) listOnly.hidden = state.view !== 'list'
  }

  function renderBody() {
    const body = view().querySelector('[data-collab-body]')
    const notes = filtered()
    const filtering = Boolean(state.query.trim() || state.tag || state.pinnedOnly)
    if (!store.listEntities('note').length) {
      body.innerHTML = emptyState({iconName: 'i-doc', title: 'No notes yet', body: 'Capture one with New note — only a title is needed.'})
      return
    }
    if (state.view === 'kanban') {
      renderBoard(body, {
        columns: NOTE_STATUSES.map(([id, label]) => ({
          id,
          label,
          items: notes.filter(note => note.status === id),
          collapsible: id === 'archived',
          collapsed: id === 'archived' && !state.archivedOpen,
          quickAdd: id === 'archived' ? '' : '+ Add note',
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
      return
    }
    const rows = notes.filter(note => state.showArchived || note.status !== 'archived')
    if (!rows.length) {
      body.innerHTML = emptyState({iconName: 'i-search', title: filtering ? `No notes match “${state.query.trim() || state.tag || 'your filters'}”` : 'No notes to show', body: 'Clear the search or filters to see every note.'})
      return
    }
    body.innerHTML = `<table class="${TABLE_CLASS}">
      <thead><tr><th scope="col">Title</th><th scope="col">Status</th><th scope="col">Tags</th><th scope="col">Related</th><th scope="col">Updated</th></tr></thead>
      <tbody>${rows
        .map(
          note => `<tr>
          <td><button type="button" class="${ROW_BUTTON_CLASS}" data-row-open="${escapeHtml(note.id)}" dir="auto">${note.pinned ? `${icon('i-spark', 11)} <span class="sr-only">Pinned. </span>` : ''}${escapeHtml(titleOf(note))}</button></td>
          <td><span class="badge gray">${escapeHtml(noteStatusLabel(note.status))}</span></td>
          <td>${(note.tags || []).map(tag => `<span class="${CHIP_CLASS}">${escapeHtml(tag)}</span>`).join(' ')}</td>
          <td>${relatedCount(note)}</td>
          <td>${escapeHtml(updatedLabel(note))}</td>
        </tr>`
        )
        .join('')}</tbody></table>`
    body.querySelectorAll('[data-row-open]').forEach(button => button.addEventListener('click', () => openNote(button.dataset.rowOpen)))
  }

  function quickAdd(status, title) {
    const note = store.createEntity('note', {title, body: '', status, tags: [], pinned: false})
    toast({tone: 'ok', title: 'Note added', body: titleOf(note)})
    view().querySelector(`[data-quick-add="${status}"]`)?.focus()
  }

  function moveNote(id, status) {
    const note = store.getEntity('note', id)
    if (!note || note.status === status) return
    store.updateEntity('note', id, {status})
    toast({tone: 'info', title: `Moved to ${noteStatusLabel(status)}`, body: titleOf(note)})
    view().querySelector(`[data-move="${CSS.escape(id)}"]`)?.focus()
  }

  function editorMarkup(note) {
    return `<div class="${GRID_CLASS}">
      ${field({id: 'note-title', label: 'Title', required: true, wide: true, control: textInput({id: 'note-title', value: note.title, required: true, extra: {autofocus: true}})})}
      ${field({id: 'note-body', label: 'Note', wide: true, control: textarea({id: 'note-body', value: note.body, rows: 7})})}
      ${field({id: 'note-status', label: 'Status', control: selectInput({id: 'note-status', value: note.status, options: NOTE_STATUSES})})}
      ${field({id: 'note-tags', label: 'Tags', hint: 'Separate tags with commas.', control: textInput({id: 'note-tags', value: (note.tags || []).join(', '), describedBy: 'note-tags-hint'})})}
      <div class="sm:col-span-2">${checkbox({id: 'note-pinned', label: 'Pin this note to the top', checked: note.pinned})}</div>
    </div>`
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

  function openNote(id) {
    const existing = id ? store.getEntity('note', id) : null
    if (id && !existing) {
      toast({tone: 'warn', title: 'This note is no longer available', body: 'It may have been deleted.'})
      return
    }
    const note = existing || {title: '', body: '', status: 'draft', tags: [], pinned: false}
    const ref = existing ? {type: 'note', id: existing.id} : null
    panel.open({
      ref,
      typeLabel: TYPE_META.note.label,
      typeIcon: TYPE_META.note.icon,
      title: existing ? titleOf(existing) : 'New note',
      render: body => {
        body.innerHTML = editorMarkup(note)
      },
      save: body => {
        const values = readEditor(body)
        setFieldError(body, 'note-title', values.title ? '' : 'Title is required.')
        if (!values.title) {
          body.querySelector('#note-title').focus()
          return false
        }
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
              ? {label: 'Restore', icon: 'i-undo', run: () => setStatus(existing, 'active', 'Note restored')}
              : {label: 'Archive', icon: 'i-archive', run: () => setStatus(existing, 'archived', 'Note archived')},
            {label: 'Delete', icon: 'i-trash', danger: true, run: () => deleteNote(existing)},
          ]
        : [],
      related: ref ? host => related.render(host, ref) : null,
    })
  }

  async function setStatus(note, status, message) {
    store.updateEntity('note', note.id, {status})
    toast({tone: 'info', title: message, body: titleOf(note)})
    await panel.close({force: true})
  }

  async function deleteNote(note) {
    const ok = await confirm({
      title: 'Delete this note?',
      body: 'The note is removed. Items linked to it keep the link and show it as unavailable until someone removes it.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
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
  }
}
