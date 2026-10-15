// Internal Mail — mailboxes (Inbox, Starred, Sent, Drafts, Archive,
// Trash) plus the folders the user creates, a message list, and a reading /
// compose pane, all over the collaboration store's `mail` entities. Custom
// folders are store state: create, rename, delete (its messages file
// themselves in Inbox) and Move to refile a message into one. Drafts are
// real entities that are autosaved and survive navigation and reloads; Send
// moves a draft to Sent. Nothing is delivered anywhere — the prototype says
// so when you send. Relationships live only in the store's links table
// (Related Items).
import {escapeHtml, icon, CHIP_CLASS, ERROR_CLASS, HINT_CLASS} from '../../components/collab/fields.js'
import {MAIL_FOLDERS, titleOf, searchText} from '../../components/collab/meta.js'
import {formatDate, formatTime, relativeDay} from '../../core/collab-dates.js'

const isSystemUser = name => /^(system|system admin)$/i.test(name || '')
const avatar = (person, size) =>
  isSystemUser(person?.name)
    ? `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#i-user"/></svg>`
    : escapeHtml((person?.name || '?').charAt(0))
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AUTOSAVE_MS = 600

/* One control shape for the message/draft action rows; the destructive one
   is the same control in danger ink so the row can still be scanned by
   shape alone. */
const TOOL_BASE =
  'inline-flex min-h-8 items-center gap-1.5 rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]'
const TOOL_CLASS = `${TOOL_BASE} text-ink hover:bg-[var(--line-2)]`
const TOOL_DANGER_CLASS = `${TOOL_BASE} text-[var(--danger)] hover:bg-[var(--danger-soft-bg)]`
const COMPOSE_ROW_CLASS =
  'email-compose-row flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-2 [&>label]:w-14 [&>label]:flex-none [&>label]:text-[12.5px] [&>label]:text-faint'
const COMPOSE_INPUT_CLASS = 'min-w-[120px] flex-1 border-0 bg-transparent text-sm text-ink outline-none'
const AVATAR_CLASS =
  'email-avatar relative flex-none rounded-full flex items-center justify-center bg-[var(--avatar-bg)] text-[var(--avatar-ink)] font-bold'

export function createEmail({root, store, toast, related, confirm, users, currentUser, onUnreadChange, navigate, openItem}) {
  const pageAbort = new AbortController()
  const signal = pageAbort.signal
  const queryId = id => root.querySelector('#' + CSS.escape(id))
  const me = {id: currentUser.id, name: currentUser.name, email: currentUser.email}
  const state = {
    folder: 'inbox',
    query: '',
    selectedId: null,
    selectedIds: new Set(),
    selectionAnchor: null,
    focusedId: null,
    unreadOnly: false,
    mode: 'read',
    draftId: null,
    pane: 'list',
    composeError: '',
    folderForm: null,
    railOpen: false,
  }
  let saveTimer = null

  const todayKey = () => store.now().slice(0, 10)
  const stampOf = m => m.sentAt || m.savedAt || m.createdAt
  const inFolder = (m, folder) => (folder === 'starred' ? m.starred && m.folder !== 'trash' : m.folder === folder)
  const allMail = () => store.listEntities('mail')
  const folderMail = folder => allMail().filter(m => inFolder(m, folder)).sort((a, b) => stampOf(b).localeCompare(stampOf(a)))
  /* The six system mailboxes are a constant the mail screen owns; the user's
     folders live in the store. Everything that lists mailboxes — the rail,
     the compact select, the Move to menu — reads this one list. */
  const systemFolders = MAIL_FOLDERS.map(([id, label, iconName]) => ({id, label, iconName, custom: false}))
  const customFolders = () => store.listFolders().map(folder => ({...folder, label: folder.name, iconName: 'i-folder', custom: true}))
  const allFolders = () => [...systemFolders, ...customFolders()]
  /** Names the user may not reuse — the system mailboxes, so the rail never
   *  carries two rows reading "Inbox". */
  const reservedFolderNames = () => systemFolders.map(folder => folder.label)
  const folderLabel = id => allFolders().find(folder => folder.id === id)?.label ?? id
  const folderCount = (id, custom) => {
    const list = folderMail(id)
    if (id === 'inbox') return list.filter(m => m.unread).length
    /* Drafts count themselves; a custom folder counts everything filed in
       it. The rest of the system mailboxes carry no badge, as before. */
    return custom || id === 'drafts' ? list.length : 0
  }
  const dayLabel = key => relativeDay(key, todayKey()) ?? formatDate(key)
  const narrow = () => matchMedia('(max-width: 720px)').matches
  /* The rail is swapped for its select at the shell's own compact breakpoint,
     so it collapses on small devices at exactly the moment the shell's
     sidebar does. */
  const compact = () => matchMedia('(max-width: 900px)').matches

  /* ---------- layout ---------- */
  function applyLayout() {
    const rail = root.querySelector('[data-folders]')
    const select = root.querySelector('[data-folder-select]')
    rail.hidden = compact()
    select.hidden = !compact()
    if (compact()) state.railOpen = false
    const list = root.querySelector('.email-list')
    const pane = queryId('email-reading')
    list.hidden = narrow() && state.pane === 'detail'
    pane.hidden = narrow() && state.pane === 'list'
    list.classList.toggle('w-full', narrow())
  }
  matchMedia('(max-width: 720px)').addEventListener('change', applyLayout, {signal})
  matchMedia('(max-width: 900px)').addEventListener('change', applyLayout, {signal})

  /* ---------- folders ---------- */
  /* Row geometry is the shell's `.nc2-icn` spec — h-9, an 18px icon, gap-2.5,
     ps-11 and a hover wash — so the mailbox rail and the nav rail sit at the
     same sizes side by side. `ef-lbl` / `ef-act` are the pieces the collapsed
     rail hides; see the `.email-folders` rules in styles/tailwind/email.css. */
  const EF_ROW_CLASS =
    'ef-row relative inline-flex h-9 min-w-[calc(var(--rail-w)-12px)] items-center gap-2.5 rounded-md border-0 bg-transparent ps-[11px] pe-2 text-start text-[13px] text-muted hover:bg-[var(--hover-overlay)] aria-[current=true]:bg-[var(--accent-soft)] aria-[current=true]:text-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]'
  const EF_SEPARATOR_CLASS = 'ef-sep ms-[9px] my-1 h-px w-6 flex-none bg-line'
  const FOLDER_ICON_BTN_CLASS =
    'grid size-6 flex-none place-items-center rounded-md border-0 bg-transparent text-muted opacity-60 hover:bg-[var(--hover-overlay)] hover:text-ink hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]'
  const FOLDER_FORM_INPUT_CLASS =
    'min-h-8 w-full rounded-md border border-line bg-surface px-2 text-[13px] text-ink outline-none focus-visible:[box-shadow:0_0_0_3px_var(--accent-soft)]'

  const folderButton = ({id, label, iconName, custom}, {wide = false} = {}) => {
    const count = folderCount(id, custom)
    const countLabel = id === 'inbox' ? 'unread' : id === 'drafts' ? 'drafts' : 'messages'
    return `<button type="button" data-folder="${escapeHtml(id)}"${state.folder === id ? ' aria-current="true"' : ''} class="${EF_ROW_CLASS} ${wide ? 'w-full shrink-0' : 'flex-1'}">${icon(iconName, 18)}<span class="ef-lbl min-w-0 flex-1 overflow-hidden whitespace-nowrap text-[13px]">${escapeHtml(label)}</span>${count ? `<span class="ef-lbl flex-none text-xs">${count}<span class="sr-only"> ${countLabel}</span></span>` : ''}</button>`
  }

  /** Inline create / rename form. Replaces the row (or the New folder
   *  button) in place, so naming a folder never opens a dialog. */
  const folderFormMarkup = (value, submitLabel) =>
    `<form class="flex flex-col gap-1.5 px-1 py-1" data-folder-form novalidate>
      <label class="sr-only" for="email-folder-name">Folder name</label>
      <input type="text" id="email-folder-name" class="${FOLDER_FORM_INPUT_CLASS}" data-folder-name placeholder="Folder name" maxlength="40" autocomplete="off" value="${escapeHtml(value)}" dir="auto">
      <span class="flex items-center gap-1.5">
        <button type="submit" class="lbtn pri">${escapeHtml(submitLabel)}</button>
        <button type="button" class="lbtn" data-folder-cancel>Cancel</button>
      </span>
      <span class="${ERROR_CLASS}" role="alert" data-folder-error></span>
    </form>`

  /** The rail itself: a scrolling folder list, the same scrolling-middle
   *  shape as the shell's `.nc2-rail`. The expand/collapse toggle lives in
   *  the list header next to the search box (it is a layout control for the
   *  whole column, not a mailbox row), so renderFolders only syncs its
   *  attributes. Collapsed the rail is 52px of icons; hovering peeks it open
   *  as a temporary flyout over the list (CSS only, the shell rail's hover
   *  contract), while the toggle pins it open in the layout — the pinned
   *  rail takes its width in the flex row and the list stops reserving the
   *  collapsed strip. It force-closes when the shell compacts. */
  function syncRailToggle() {
    const toggle = root.querySelector('[data-rail-toggle]')
    if (!toggle) return
    toggle.setAttribute('aria-expanded', String(state.railOpen))
    const label = state.railOpen ? 'Collapse mailboxes' : 'Expand mailboxes'
    toggle.setAttribute('aria-label', label)
    toggle.setAttribute('title', label)
  }

  /** The list header names the open mailbox — the same information the
   *  compact select carries on small screens, so it is a read-only line
   *  above the search row and never competes with the rail for the pick. */
  function syncFolderTitle() {
    const title = root.querySelector('[data-mail-folder-title]')
    if (!title) return
    title.textContent = folderLabel(state.folder)
    const count = root.querySelector('[data-mail-folder-count]')
    const n = folderCount(state.folder, customFolders().some(f => f.id === state.folder))
    if (count) {
      count.textContent = n ? String(n) : ''
      count.hidden = !n
    }
  }

  function renderFolders() {
    const rail = root.querySelector('[data-folders]')
    const custom = customFolders()
    rail.classList.toggle('is-open', state.railOpen)
    syncRailToggle()
    syncFolderTitle()
    const list = `<ul class="m-0 grid list-none gap-0.5 p-0">${systemFolders
      .map(folder => `<li>${folderButton(folder, {wide: true})}</li>`)
      .join('')}</ul>
      <div class="flex-none"><div class="${EF_SEPARATOR_CLASS}"></div>
        <div class="flex items-center gap-1 ps-[11px] pe-2 pb-1 pt-2">
          <span class="ef-lbl min-w-0 flex-1 text-xs font-semibold uppercase tracking-[.04em] text-faint">Folders</span>
          <span class="ef-act flex flex-none items-center gap-0.5">
            <button type="button" class="${FOLDER_ICON_BTN_CLASS}" data-new-folder aria-label="New folder" title="New folder">${icon('i-plus', 14)}</button>
          </span>
        </div>
        ${
          custom.length
            ? `<ul class="m-0 grid list-none gap-0.5 p-0">${custom
                .map(folder =>
                  state.folderForm === folder.id
                    ? `<li>${folderFormMarkup(folder.name, 'Save')}</li>`
                    : `<li class="flex items-center gap-1">${folderButton(folder)}
                        <span class="ef-act flex flex-none items-center gap-0.5 pe-1">
                          <button type="button" class="${FOLDER_ICON_BTN_CLASS}" data-folder-rename="${escapeHtml(folder.id)}" aria-label="Rename ${escapeHtml(folder.label)}">${icon('i-edit', 12)}</button>
                          <button type="button" class="${FOLDER_ICON_BTN_CLASS}" data-folder-delete="${escapeHtml(folder.id)}" aria-label="Delete ${escapeHtml(folder.label)}">${icon('i-trash', 12)}</button>
                        </span>
                      </li>`
                )
                .join('')}</ul>`
            : ''
        }
        ${state.folderForm === 'new' ? folderFormMarkup('', 'Add') : ''}
      </div>`
    rail.innerHTML = `<div class="ef-scroll" id="email-folder-list">${list}</div>`
    root.querySelector('[data-folder-select]').innerHTML = allFolders()
      .map(folder => {
        const count = folderCount(folder.id, folder.custom)
        return `<option value="${escapeHtml(folder.id)}"${state.folder === folder.id ? ' selected' : ''}>${escapeHtml(folder.label)}${count ? ` (${count})` : ''}</option>`
      })
      .join('')
    const input = rail.querySelector('[data-folder-name]')
    if (input) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  }

  const folderErrorMessage = error =>
    ({
      empty: 'Give the folder a name.',
      'too-long': 'Folder names are up to 40 characters.',
      duplicate: 'A folder with that name already exists.',
      missing: 'That folder no longer exists.',
    })[error] || 'That folder cannot be used.'

  function showFolderError(error) {
    const el = root.querySelector('[data-folder-error]')
    if (el) el.textContent = folderErrorMessage(error)
  }

  /** 'new' to create, or a folder id to rename. Naming needs the labels the
   *  collapsed rail clips, so the form always opens the rail behind it. */
  function openFolderForm(target) {
    state.folderForm = target
    state.railOpen = true
    renderFolders()
  }

  function closeFolderForm({focus = true} = {}) {
    const wasNew = state.folderForm === 'new'
    const previous = state.folderForm
    state.folderForm = null
    renderFolders()
    if (!focus) return
    const target = wasNew
      ? root.querySelector('[data-new-folder]')
      : root.querySelector(`[data-folder-rename="${CSS.escape(previous)}"]`)
    target?.focus()
  }

  async function commitFolderForm() {
    const input = root.querySelector('[data-folder-name]')
    if (!input) return
    const value = input.value
    if (state.folderForm === 'new') {
      const {folder, error} = store.createFolder(value, {reserved: reservedFolderNames()})
      if (error) return showFolderError(error)
      state.folderForm = null
      renderFolders()
      toast({tone: 'ok', title: 'Folder created', body: folder.name})
      root.querySelector(`[data-folder="${CSS.escape(folder.id)}"]`)?.focus()
      return
    }
    const id = state.folderForm
    const {folder, error} = store.renameFolder(id, value, {reserved: reservedFolderNames()})
    if (error) return showFolderError(error)
    state.folderForm = null
    renderAll()
    toast({tone: 'ok', title: 'Folder renamed', body: folder.name})
    root.querySelector(`[data-folder="${CSS.escape(id)}"]`)?.focus()
  }

  async function removeFolder(id) {
    const folder = customFolders().find(entry => entry.id === id)
    if (!folder) return
    const count = folderMail(id).length
    const ok = await confirm({
      title: `Delete the folder “${folder.name}”?`,
      body: count
        ? `${count} message${count === 1 ? '' : 's'} in it move to Inbox. Nothing is lost.`
        : 'Its messages (if any) move to Inbox.',
      confirmLabel: 'Delete folder',
      tone: 'danger',
    })
    if (!ok) return
    const {moved} = store.deleteFolder(id)
    if (state.folderForm === id) state.folderForm = null
    toast({
      tone: 'info',
      title: 'Folder deleted',
      body: moved ? `${moved} message${moved === 1 ? '' : 's'} moved to Inbox.` : folder.name,
    })
    if (state.folder === id) return setFolder('inbox')
    renderAll()
  }

  function setFolder(folder) {
    flushDraft()
    state.folder = folder
    state.folderForm = null
    state.selectedId = null
    state.selectedIds = new Set()
    state.selectionAnchor = null
    state.focusedId = null
    state.mode = 'read'
    state.draftId = null
    state.pane = 'list'
    renderAll()
  }

  /* ---------- list ---------- */
  const counterpart = m =>
    m.folder === 'sent' || m.folder === 'drafts'
      ? `To: ${(m.to || []).map(p => p.name).join(', ') || '(no recipients)'}`
      : m.from?.name || ''

  function visibleMessages() {
    const query = state.query.trim().toLowerCase()
    return folderMail(state.folder).filter(
      m => (!state.unreadOnly || m.unread) && (!query || searchText(m).includes(query))
    )
  }

  /** The header's checkbox mirrors the visible rows: checked when every
   *  one is in the selection, indeterminate when only some are, and clear
   *  when none are — clicking it selects all or drops them all. */
  function syncSelectAll() {
    const box = root.querySelector('[data-mail-select-all]')
    if (!box) return
    const ids = visibleMessages().map(m => m.id)
    const picked = ids.filter(id => state.selectedIds.has(id)).length
    box.checked = ids.length > 0 && picked === ids.length
    box.indeterminate = picked > 0 && picked < ids.length
    const label = root.querySelector('[data-mail-select-label]')
    if (label) {
      label.textContent = state.selectedIds.size ? `${state.selectedIds.size} selected` : ''
    }
  }

  function renderList() {
    const scroll = queryId('email-list-scroll')
    const messages = visibleMessages()
    syncSelectAll()
    if (!messages.length) {
      scroll.innerHTML = `<div class="notif-empty flex flex-col items-center gap-2 px-6 py-10 text-center text-faint">${icon(state.query.trim() ? 'i-search' : 'i-mail', 28)}<p class="text-[13px] text-muted"></p></div>`
      scroll.querySelector('p').textContent = state.query.trim()
        ? `No messages match “${state.query.trim()}”.`
        : state.unreadOnly
          ? `No unread messages in ${folderLabel(state.folder)}.`
          : `No messages in ${folderLabel(state.folder)}.`
      return
    }
    let lastDay = null
    /* Rows are listbox options themselves so a checkbox can sit inside them
       (a checkbox inside a button is invalid nesting). A plain click opens
       the message and makes it the whole selection — the reading pane keeps
       its single-message actions. The checkbox (or Space) adds to or drops
       from the selection; two or more selected swap the reading toolbar for
       the bulk bar. Roving tabindex: the focused/selected row carries
       tabindex 0, the rest -1. */
    scroll.innerHTML = `<ul role="listbox" aria-multiselectable="true" class="m-0 list-none p-0" aria-label="${escapeHtml(folderLabel(state.folder))} messages">${messages
      .map(m => {
        const day = dayLabel(stampOf(m))
        const header =
          day !== lastDay
            ? `<li class="nc-group-lbl px-2.5 pb-1 pt-3.5 text-xs font-semibold uppercase tracking-[.04em] text-faint first:pt-1.5" role="presentation">${escapeHtml(day)}</li>`
            : ''
        lastDay = day
        const relatedCount = store.getRelatedItems('mail', m.id).length
        const opened = m.id === state.selectedId
        const selected = state.selectedIds.has(m.id)
        const subject = titleOf(m)
        return `${header}<li role="option" aria-selected="${selected}" data-id="${escapeHtml(m.id)}" ${opened ? 'aria-current="true"' : ''} tabindex="${m.id === state.focusedId || (!state.focusedId && opened) ? 0 : -1}" class="email-list-row${m.unread ? ' unread' : ''}${opened ? ' active' : ''} flex w-full cursor-pointer items-start gap-2.5 border-0 border-b border-line bg-transparent px-3.5 py-2.5 text-start font-[inherit] hover:bg-[var(--hover-overlay)] aria-[current=true]:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] [body.density-compact_&]:py-2 [body.density-comfortable_&]:py-3.5">
          <span class="flex-none pt-1"><input type="checkbox" data-mail-check aria-label="Select “${escapeHtml(subject)}”"${selected ? ' checked' : ''} class="size-3.5 cursor-pointer accent-[var(--accent)]"></span>
          <span class="${AVATAR_CLASS} w-7 h-7 text-xs" style="--hue:${Number(m.hue) || 210}">${avatar(m.folder === 'sent' || m.folder === 'drafts' ? m.to?.[0] || me : m.from, 14)}</span>
          <span class="min-w-0 flex-1">
            <span class="flex items-baseline justify-between gap-2"><b class="truncate text-[13px] ${m.unread ? 'font-bold' : 'font-medium'} text-ink" dir="auto">${m.unread ? '<span class="sr-only">Unread. </span>' : ''}${escapeHtml(counterpart(m))}</b><span class="flex-none text-xs text-faint">${escapeHtml(formatTime(stampOf(m)))}</span></span>
            <span class="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
              ${m.folder === 'drafts' ? '<span class="badge warn">Draft</span>' : ''}
              <span class="email-list-subj min-w-0 flex-1 truncate" dir="auto">${escapeHtml(subject)}</span>
              ${m.starred ? `<span class="text-accent">${icon('i-spark', 11)}<span class="sr-only">Starred</span></span>` : ''}
              ${m.attachments?.length ? `<span>${icon('i-clip', 11)}<span class="sr-only">Has attachments</span></span>` : ''}
              ${relatedCount ? `<span class="inline-flex items-center gap-0.5">${icon('i-flow', 11)}${relatedCount}<span class="sr-only"> related items</span></span>` : ''}
            </span>
          </span>
        </li>`
      })
      .join('')}</ul>`
    scroll.querySelectorAll('.email-list-row').forEach(row => {
      row.addEventListener('click', event => {
        if (event.target.closest('[data-mail-check]')) return
        if (event.shiftKey) return extendSelection(row.dataset.id)
        selectMessage(row.dataset.id)
      })
      row.addEventListener('focus', () => {
        state.focusedId = row.dataset.id
      })
      row.addEventListener('keydown', event => onRowKey(event, row))
    })
    scroll.querySelectorAll('[data-mail-check]').forEach(box =>
      box.addEventListener('change', () => {
        const id = box.closest('.email-list-row').dataset.id
        state.focusedId = id
        if (box.checked) state.selectedIds.add(id)
        else state.selectedIds.delete(id)
        renderList()
        refreshToolbar()
      })
    )
  }

  /* Arrow keys move focus (and, with Shift, extend the selection from the
     anchor); Enter opens the focused message; Space toggles it in or out of
     the selection without opening; Escape clears a multi-selection. */
  function onRowKey(event, row) {
    const rows = [...row.parentElement.querySelectorAll('.email-list-row')]
    const at = rows.indexOf(row)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = rows[at + (event.key === 'ArrowDown' ? 1 : -1)]
      if (!next) return
      next.focus()
      if (event.shiftKey) extendSelection(next.dataset.id)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      selectMessage(row.dataset.id)
      return
    }
    if (event.key === ' ') {
      event.preventDefault()
      const id = row.dataset.id
      state.focusedId = id
      if (state.selectedIds.has(id)) state.selectedIds.delete(id)
      else state.selectedIds.add(id)
      renderList()
      refreshToolbar()
      root.querySelector(`.email-list-row[data-id="${CSS.escape(id)}"]`)?.focus()
      return
    }
    if (event.key === 'Escape' && state.selectedIds.size > 1) {
      event.preventDefault()
      state.selectedIds = state.selectedId ? new Set([state.selectedId]) : new Set()
      state.selectionAnchor = state.selectedId
      renderList()
      refreshToolbar()
      root.querySelector(`.email-list-row[data-id="${CSS.escape(row.dataset.id)}"]`)?.focus()
    }
  }

  /* Shift+click (or Shift+Arrow) fills the list range between the anchor
     and the target; without a live anchor it falls back to a toggle. */
  function extendSelection(id) {
    const ids = visibleMessages().map(m => m.id)
    const anchor = ids.indexOf(state.selectionAnchor)
    const at = ids.indexOf(id)
    if (anchor < 0 || at < 0) {
      if (state.selectedIds.has(id)) state.selectedIds.delete(id)
      else state.selectedIds.add(id)
    } else {
      const [from, to] = anchor <= at ? [anchor, at] : [at, anchor]
      state.selectedIds = new Set(ids.slice(from, to + 1))
    }
    state.focusedId = id
    renderList()
    refreshToolbar()
    root.querySelector(`.email-list-row[data-id="${CSS.escape(id)}"]`)?.focus()
  }

  /** Re-paint after a selection change. Two or more selected swap the whole
   *  pane for the stacked-card preview (and back again), so this is a full
   *  re-render — with any half-typed reply draft flushed first, since the
   *  composer only exists in the single-message view. Compose has no
   *  selection toolbar and keeps its own pane. */
  function refreshToolbar() {
    if (state.mode === 'compose') return
    flushDraft()
    renderAll()
  }

  /* ---------- selection / reading ---------- */
  function selectMessage(id) {
    const m = store.getEntity('mail', id)
    if (!m) return
    if (state.draftId && state.draftId !== id) flushDraft()
    state.selectedId = id
    /* Opening a message makes it the whole selection: the bulk bar is for
       multi-select, so a normal read returns to the message's own actions. */
    state.selectedIds = new Set([id])
    state.selectionAnchor = id
    state.focusedId = id
    state.pane = 'detail'
    if (m.folder === 'drafts') {
      state.mode = 'compose'
      state.draftId = id
    } else {
      state.mode = 'read'
      state.draftId = null
      if (m.unread) {
        store.updateEntity('mail', id, {unread: false})
        onUnreadChange()
      }
    }
    renderAll()
  }

  const chips = people =>
    (people || []).map(p => `<span class="email-chip ${CHIP_CLASS}" dir="auto">${escapeHtml(p.name || p.email)}</span>`).join(' ')

  function messageMarkup(m, expanded) {
    const body = (Array.isArray(m.body) ? m.body : [m.body || ''])
      .map(p => `<p class="mb-3 whitespace-pre-line" dir="auto">${escapeHtml(p)}</p>`)
      .join('')
    const header = `<div class="email-reading-hd flex items-center gap-4">
        <span class="${AVATAR_CLASS} lg w-10 h-10 text-base" style="--hue:${Number(m.hue) || 210}">${avatar(m.from, 18)}</span>
        <div class="email-reading-who flex min-w-0 flex-1 flex-col"><b class="text-sm" dir="auto">${escapeHtml(m.from?.name || '')}</b><span class="text-[12.5px] text-muted">${escapeHtml(m.from?.email || '')}</span></div>
        <span class="email-reading-time flex-none text-xs text-faint">${escapeHtml(dayLabel(stampOf(m)))}, ${escapeHtml(formatTime(stampOf(m)))}</span>
      </div>`
    const details = `<div class="email-field mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px] text-faint"><span>To</span>${chips(m.to)}</div>
      ${m.cc?.length ? `<div class="email-field mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] text-faint"><span>Cc</span>${chips(m.cc)}</div>` : ''}
      <div class="email-reading-body mt-4 text-sm leading-[1.65] text-ink">${body}</div>
      ${
        m.attachments?.length
          ? `<div class="email-attachments mt-3 flex flex-wrap gap-2">${m.attachments
              .map(a => `<span class="email-attach flex items-center gap-[7px] rounded-lg border border-line px-2.5 py-[7px] text-[12.5px] text-ink">${icon('i-clip')}<span>${escapeHtml(a.name)}</span><small class="text-xs text-faint">${escapeHtml(a.size)}</small></span>`)
              .join('')}<span class="${HINT_CLASS} self-center">Attachments are sample files in the prototype.</span></div>`
          : ''
      }`
    return expanded
      ? `<article class="border-b border-line py-4 last:border-b-0">${header}${details}</article>`
      : `<details class="border-b border-line py-3"><summary class="cursor-pointer list-none">${header}</summary>${details}</details>`
  }

  function toolbarMarkup(m) {
    const inTrash = m.folder === 'trash'
    const archived = m.folder === 'archive'
    /* Three visible groups — who to answer, how to file the message — plus
       a More menu for the rest (Mark unread, Star, Create activity, Delete
       behind its own rule), the same i-dots menu pattern the invoice
       toolbar uses. */
    const groups = [
      [
        ['reply', 'i-reply', 'Reply'],
        ['forward', 'i-next', 'Forward'],
      ],
      [
        archived || inTrash ? ['restore', 'i-undo', inTrash ? 'Restore' : 'Move to Inbox'] : ['archive', 'i-archive', 'Archive'],
        ['move', 'i-folder', 'Move to'],
      ],
    ]
    const SEP = '<span class="mx-1.5 h-5 w-px flex-none bg-line" aria-hidden="true"></span>'
    /* Move to is a menu, not a command: it opens the mailbox list (system
       first, then the user's own folders) and files the message on pick. The
       message's own folder is not offered — there is nowhere to move it. */
    const moveTargets = allFolders().filter(folder => folder.id !== m.folder)
    const tool = ([action, iconName, label]) => {
      if (action === 'move')
        return `<span class="menu relative inline-flex">
            <button type="button" class="${TOOL_CLASS}" data-mail-action="move" aria-haspopup="menu" aria-expanded="false">${icon(iconName)}<span>${label}</span>${icon('i-caret', 12)}</button>
            <div class="mlist mend" role="menu" aria-label="Move to folder">
              <div class="glbl">Move to</div>
              ${moveTargets
                .map(folder => `<button role="menuitem" type="button" data-move-to="${escapeHtml(folder.id)}">${icon(folder.iconName)} ${escapeHtml(folder.label)}</button>`)
                .join('')}
            </div>
          </span>`
      const cls = TOOL_CLASS
      return `<button type="button" class="${cls}" data-mail-action="${action}">${icon(iconName)}<span>${label}</span></button>`
    }
    const moreItems = [
      ['unread', 'i-mail', 'Mark unread'],
      ['star', 'i-spark', m.starred ? 'Unstar' : 'Star'],
      ['activity', 'i-check', 'Create activity'],
    ]
    const more = `<span class="menu relative inline-flex ms-auto">
        <button type="button" class="ibtn" data-more-trigger aria-haspopup="menu" aria-expanded="false" aria-label="More actions" title="More actions">${icon('i-dots')}</button>
        <div class="mlist mend" role="menu" aria-label="More actions" style="min-width:210px">
          ${moreItems
            .map(([action, iconName, label]) => {
              const starred = action === 'star'
              return `<button role="menuitem" type="button" data-mail-action="${action}"${starred ? ` aria-pressed="${Boolean(m.starred)}"` : ''}>${icon(iconName)} ${label}</button>`
            })
            .join('')}
          <hr><button role="menuitem" type="button" class="dan" data-mail-action="${inTrash ? 'purge' : 'trash'}">${icon('i-trash')} ${inTrash ? 'Delete permanently' : 'Delete'}</button>
        </div>
      </span>`
    return `<div class="flex flex-wrap items-center gap-0.5 border-b border-line px-4 py-2" role="toolbar" aria-label="Message actions">
      ${narrow() ? `<button type="button" class="${TOOL_CLASS}" data-mail-back>${icon('i-prev')} Back</button>${SEP}` : ''}
      ${groups
        .map((group, index) => `${index ? SEP : ''}<span class="flex flex-wrap items-center gap-0.5">${group.map(tool).join('')}</span>`)
        .join('')}
      ${SEP}${more}
    </div>`
  }

  /** Shown while two or more rows are selected: operate on the whole
   *  selection instead of the open message. */
  function bulkToolbarMarkup() {
    const count = state.selectedIds.size
    const moveTargets = allFolders()
    return `<div class="flex flex-wrap items-center gap-0.5 border-b border-line px-4 py-2" role="toolbar" aria-label="Selection actions">
      <span class="mr-1.5 text-[13px] font-semibold text-ink">${count} selected</span>
      <button type="button" class="${TOOL_CLASS}" data-bulk="read">${icon('i-mail')}<span>Mark read</span></button>
      <button type="button" class="${TOOL_CLASS}" data-bulk="archive">${icon('i-archive')}<span>Archive</span></button>
      <span class="menu relative inline-flex">
        <button type="button" class="${TOOL_CLASS}" data-bulk="move" aria-haspopup="menu" aria-expanded="false">${icon('i-folder')}<span>Move to</span>${icon('i-caret', 12)}</button>
        <div class="mlist mend" role="menu" aria-label="Move selection to folder">
          <div class="glbl">Move to</div>
          ${moveTargets
            .map(folder => `<button role="menuitem" type="button" data-bulk-move-to="${escapeHtml(folder.id)}">${icon(folder.iconName)} ${escapeHtml(folder.label)}</button>`)
            .join('')}
        </div>
      </span>
      <button type="button" class="${TOOL_DANGER_CLASS}" data-bulk="trash">${icon('i-trash')}<span>Delete</span></button>
      <button type="button" class="ibtn ms-auto" data-bulk="clear" aria-label="Clear selection" title="Clear selection">${icon('i-x')}</button>
    </div>`
  }

  /** Wire a freshly painted toolbar (message actions or the bulk bar). */
  function bindToolbar(host, m) {
    if (state.selectedIds.size >= 2) {
      bindBulkToolbar(host)
      return
    }
    bindMessageToolbar(host, m)
  }

  function bindMessageToolbar(host, m) {
    host.querySelectorAll('[data-mail-action]').forEach(button =>
      button.addEventListener('click', () => {
        /* "Move to" is the menu's own trigger: the shell's generic menu
           handler opens it, so there is no action behind the click. */
        if (button.dataset.mailAction === 'move') return
        runAction(button.dataset.mailAction, m)
      })
    )
    host.querySelectorAll('[data-move-to]').forEach(item =>
      item.addEventListener('click', () => moveTo(m, item.dataset.moveTo))
    )
    host.querySelector('[data-mail-back]')?.addEventListener('click', backToList)
  }

  function bindBulkToolbar(host) {
    host.querySelectorAll('[data-bulk]').forEach(button =>
      button.addEventListener('click', () => {
        /* "Move to" is the menu's own trigger; the submenu does the work. */
        if (button.dataset.bulk === 'move') return
        runBulk(button.dataset.bulk)
      })
    )
    host.querySelectorAll('[data-bulk-move-to]').forEach(item =>
      item.addEventListener('click', () => runBulkMove(item.dataset.bulkMoveTo))
    )
  }

  function clearSelection() {
    state.selectedIds = state.selectedId ? new Set([state.selectedId]) : new Set()
    state.selectionAnchor = state.selectedId
  }

  function runBulk(action) {
    const messages = [...state.selectedIds]
      .map(id => store.getEntity('mail', id))
      .filter(Boolean)
    if (!messages.length) return
    if (action === 'clear') {
      clearSelection()
      renderList()
      refreshToolbar()
      return
    }
    if (action === 'read') {
      messages.forEach(m => {
        if (m.unread) store.updateEntity('mail', m.id, {unread: false})
      })
      onUnreadChange()
      toast({tone: 'ok', title: `${messages.length} message${messages.length === 1 ? '' : 's'} marked read`})
    } else if (action === 'archive') {
      messages.forEach(m => store.updateEntity('mail', m.id, {folder: 'archive', previousFolder: null}))
      toast({tone: 'info', title: `${messages.length} message${messages.length === 1 ? '' : 's'} archived`})
    } else if (action === 'trash') {
      messages.forEach(m => store.updateEntity('mail', m.id, {folder: 'trash', previousFolder: m.folder}))
      toast({tone: 'info', title: `${messages.length} message${messages.length === 1 ? '' : 's'} moved to Trash`})
    }
    clearSelection()
    state.selectedId = null
    state.pane = 'list'
    state.mode = 'read'
    state.draftId = null
    renderAll()
    root.querySelector('.email-list-row')?.focus()
  }

  function runBulkMove(folderId) {
    const messages = [...state.selectedIds]
      .map(id => store.getEntity('mail', id))
      .filter(Boolean)
    if (!messages.length) return
    messages.forEach(m => {
      if (m.folder !== folderId) store.updateEntity('mail', m.id, {folder: folderId, previousFolder: null})
    })
    toast({tone: 'info', title: `Moved to ${folderLabel(folderId)}`, body: `${messages.length} message${messages.length === 1 ? '' : 's'}`})
    clearSelection()
    state.selectedId = null
    state.pane = 'list'
    state.mode = 'read'
    state.draftId = null
    renderAll()
    root.querySelector('.email-list-row')?.focus()
  }

  function renderReading(m) {
    const pane = queryId('email-reading')
    const thread = allMail()
      .filter(x => x.threadId === m.threadId && x.folder !== 'drafts' && (m.folder === 'trash' || x.folder !== 'trash'))
      .sort((a, b) => stampOf(a).localeCompare(stampOf(b)))
    const messages = thread.length ? thread : [m]
    pane.innerHTML = `<div class="flex-none" data-mail-toolbar></div>
      <div class="email-reading-scroll nc-scroll min-h-0 flex-1 overflow-auto px-6 py-4 [body.density-compact_&]:px-4 [body.density-comfortable_&]:px-8">
        <h2 class="email-reading-subject mb-1 text-[19px] font-bold text-ink" dir="auto">${escapeHtml(titleOf(m))}</h2>
        <p class="${HINT_CLASS}">${escapeHtml(folderLabel(m.folder))}${messages.length > 1 ? ` · ${messages.length} messages in this conversation` : ''}</p>
        ${messages.map(x => messageMarkup(x, x.id === m.id || messages.length === 1)).join('')}
        <section class="mt-4 border-t border-line pt-4" data-mail-related aria-label="Related items"></section>
      </div>
      <div class="email-composer flex-none border-t border-line bg-surface px-6 py-3 [body.density-compact_&]:px-4 [body.density-comfortable_&]:px-8">
        <label class="email-composer-to mb-2 block text-[12.5px] text-muted" for="email-quick-reply">Reply to <b dir="auto">${escapeHtml(replyTargets(m).map(p => p.name).join(', '))}</b></label>
        <textarea id="email-quick-reply" class="email-composer-input w-full min-h-[64px] resize-y rounded-lg border border-line bg-surface px-3 py-2.5 font-[inherit] text-ink outline-none focus-visible:[box-shadow:0_0_0_3px_var(--accent-soft)]" placeholder="Write a reply…" dir="auto"></textarea>
        <div class="mt-2 flex items-center gap-2"><span class="${HINT_CLASS} flex-1">Typing saves a reply draft.</span><button type="button" class="lbtn pri email-send">${icon('i-reply')} Reply</button></div>
      </div>`
    related.render(pane.querySelector('[data-mail-related]'), {type: 'mail', id: m.id})
    const toolbarHostEl = pane.querySelector('[data-mail-toolbar]')
    const paintToolbar = () => {
      if (state.selectedIds.size >= 2) {
        toolbarHostEl.innerHTML = bulkToolbarMarkup()
        bindBulkToolbar(toolbarHostEl)
      } else {
        toolbarHostEl.innerHTML = toolbarMarkup(m)
        bindMessageToolbar(toolbarHostEl, m)
      }
    }
    paintToolbar()
    const quick = pane.querySelector('.email-composer-input')
    const replyDraft = allMail()
      .filter(x => x.folder === 'drafts' && x.replyToId === m.id)
      .sort((a, b) => stampOf(b).localeCompare(stampOf(a)))[0]
    state.draftId = replyDraft?.id || null
    quick.value = replyDraft ? (Array.isArray(replyDraft.body) ? replyDraft.body.join('\n\n') : replyDraft.body || '') : ''
    quick.addEventListener('input', () => {
      if (!state.draftId) {
        const draft = createReplyDraft(m, 'reply', '')
        state.draftId = draft.id
      }
      scheduleSave(() => ({body: quick.value.split(/\n{2,}/)}))
    })
    pane.querySelector('.email-send').addEventListener('click', () => {
      if (!quick.value.trim()) {
        toast({tone: 'info', title: 'Write a message first', body: 'The reply is empty.'})
        quick.focus()
        return
      }
      if (!state.draftId) state.draftId = createReplyDraft(m, 'reply', '').id
      store.updateEntity('mail', state.draftId, {body: quick.value.split(/\n{2,}/)})
      sendDraft(state.draftId)
    })
  }

  const replyTargets = m => (m.from?.email === me.email ? m.to || [] : [m.from])

  function createReplyDraft(m, kind, bodyText) {
    const quoted = [`On ${dayLabel(stampOf(m))} ${formatTime(stampOf(m))}, ${m.from?.name || ''} wrote:`, ...(Array.isArray(m.body) ? m.body : [m.body])]
      .map(line => `> ${line}`)
      .join('\n')
    const subject = titleOf(m).replace(/^(re|fwd):\s*/i, '')
    return store.createEntity('mail', {
      folder: 'drafts',
      threadId: kind === 'reply' ? m.threadId : `t-${Date.now()}`,
      replyToId: kind === 'reply' ? m.id : null,
      from: me,
      to: kind === 'reply' ? replyTargets(m) : [],
      cc: [],
      subject: `${kind === 'reply' ? 'Re' : 'Fwd'}: ${subject}`,
      body: kind === 'reply' ? [bodyText] : ['', quoted],
      attachments: kind === 'forward' ? m.attachments || [] : [],
      unread: false,
      starred: false,
      hue: 210,
      savedAt: store.now(),
    })
  }

  async function runAction(action, m) {
    const ref = {type: 'mail', id: m.id}
    switch (action) {
      case 'reply':
      case 'forward': {
        const draft = createReplyDraft(m, action, '')
        state.selectedId = draft.id
        state.draftId = draft.id
        state.mode = 'compose'
        renderAll()
        root.querySelector(action === 'reply' ? '.email-composer-input' : '#email-compose-to')?.focus()
        return
      }
      case 'archive':
        store.updateEntity('mail', m.id, {folder: 'archive'})
        toast({tone: 'info', title: 'Archived', body: titleOf(m)})
        return afterMove()
      case 'restore':
        store.updateEntity('mail', m.id, {folder: m.previousFolder || 'inbox', previousFolder: null})
        toast({tone: 'info', title: `Moved to ${folderLabel(m.previousFolder || 'inbox')}`, body: titleOf(m)})
        return afterMove()
      case 'trash':
        store.updateEntity('mail', m.id, {folder: 'trash', previousFolder: m.folder})
        toast({tone: 'info', title: 'Moved to Trash', body: 'Open Trash to restore it.'})
        return afterMove()
      case 'purge': {
        const ok = await confirm({
          title: 'Delete this message permanently?',
          body: 'It is removed from Trash. Items linked to it keep the link and show it as unavailable.',
          confirmLabel: 'Delete permanently',
          tone: 'danger',
        })
        if (!ok) return
        store.deleteEntity('mail', m.id)
        toast({tone: 'info', title: 'Message deleted', body: titleOf(m)})
        return afterMove()
      }
      case 'unread':
        store.updateEntity('mail', m.id, {unread: true})
        onUnreadChange()
        toast({tone: 'info', title: 'Marked unread', body: titleOf(m)})
        return afterMove()
      case 'star':
        store.updateEntity('mail', m.id, {starred: !m.starred})
        renderAll()
        root.querySelector('[data-mail-action="star"]')?.focus()
        return
      case 'activity': {
        const activity = store.createEntity('activity', {
          kind: 'todo',
          summary: `Follow up: ${titleOf(m)}`,
          notes: '',
          assigneeIds: [me.id],
          assigneeId: me.id,
          status: 'planned',
          priority: 'normal',
          archived: false,
        })
        store.link(ref, {type: 'activity', id: activity.id})
        toast({tone: 'ok', title: 'Activity created and linked', body: titleOf(activity)})
        openItem({type: 'activity', id: activity.id}, {edit: true})
        return
      }
    }
  }

  function afterMove() {
    state.selectedId = null
    state.selectedIds = new Set()
    state.selectionAnchor = null
    state.pane = 'list'
    renderAll()
    root.querySelector('.email-list-row')?.focus()
  }

  /** Refile a message into any mailbox, system or user-created. The explicit
   *  move clears previousFolder: there is no "restore" to undo it back to. */
  function moveTo(m, folderId) {
    if (folderId === m.folder) return
    store.updateEntity('mail', m.id, {folder: folderId, previousFolder: null})
    toast({tone: 'info', title: `Moved to ${folderLabel(folderId)}`, body: titleOf(m)})
    afterMove()
  }

  function backToList() {
    flushDraft()
    state.pane = 'list'
    state.mode = 'read'
    state.draftId = null
    renderAll()
  }

  /* ---------- compose ---------- */
  let composeTo = []
  let composeCc = []

  function recipientRow(kind, people, pending = '') {
    const id = `email-compose-${kind}`
    return `<div class="${COMPOSE_ROW_CLASS} relative"><label for="${id}">${kind === 'to' ? 'To' : 'Cc'}</label>
      <span class="flex flex-1 flex-wrap items-center gap-1.5" data-recipients="${kind}">
        ${people
          .map(
            (p, index) =>
              `<span class="${CHIP_CLASS}" data-recipient-chip dir="auto">${escapeHtml(p.name || p.email)}<button type="button" class="ms-0.5 inline-grid size-4 place-items-center rounded-full border-0 bg-transparent text-muted hover:text-ink" data-remove-recipient="${kind}:${index}" aria-label="Remove ${escapeHtml(p.name || p.email)}">${icon('i-x', 10)}</button></span>`
          )
          .join('')}
        <input type="text" id="${id}" class="${COMPOSE_INPUT_CLASS}" placeholder="${kind === 'to' ? 'Name or email…' : 'Add Cc…'}" value="${escapeHtml(pending)}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-suggestions">
      </span>
      <ul id="${id}-suggestions" role="listbox" aria-label="Suggested recipients" class="absolute start-[68px] top-full z-20 m-0 hidden max-h-[220px] min-w-[260px] list-none overflow-auto rounded-lg border border-line bg-surface p-1 shadow-shell [&.open]:block"></ul>
    </div>`
  }

  function renderCompose(draft) {
    const pane = queryId('email-reading')
    composeTo = draft ? [...(draft.to || [])] : composeTo
    composeCc = draft ? [...(draft.cc || [])] : composeCc
    const bodyText = draft ? (Array.isArray(draft.body) ? draft.body.join('\n\n') : draft.body || '') : ''
    pane.innerHTML = `<div class="flex flex-wrap items-center gap-1 border-b border-line px-4 py-2" role="toolbar" aria-label="Draft actions">
        ${narrow() ? `<button type="button" class="${TOOL_CLASS}" data-mail-back>${icon('i-prev')} Back</button>` : ''}
        <h2 class="me-auto text-[15px] font-semibold text-ink">${draft ? 'Draft' : 'New message'}</h2>
        <span class="${HINT_CLASS}" data-draft-status aria-live="polite">${draft?.savedAt ? `Draft saved ${escapeHtml(formatTime(draft.savedAt))}` : 'Not saved yet'}</span>
      </div>
      <div class="email-reading-scroll nc-scroll min-h-0 flex-1 overflow-auto px-6 py-2 [body.density-compact_&]:px-4 [body.density-comfortable_&]:px-8">
        ${recipientRow('to', composeTo, draft?.toInput)}
        ${composeCc.length || draft?.ccInput ? recipientRow('cc', composeCc, draft?.ccInput) : `<div class="py-1"><button type="button" class="border-0 bg-transparent p-0 text-[12.5px] text-accent hover:underline" data-add-cc>Add Cc</button></div>`}
        <div class="${COMPOSE_ROW_CLASS}"><label for="email-compose-subject">Subject</label><input type="text" id="email-compose-subject" class="${COMPOSE_INPUT_CLASS}" placeholder="Subject…" dir="auto" value="${escapeHtml(draft?.subject || '')}"></div>
        <label class="sr-only" for="email-compose-body">Message</label>
        <textarea id="email-compose-body" class="email-composer-input mt-3 w-full min-h-[180px] resize-y rounded-lg border border-line bg-surface px-3 py-2.5 font-[inherit] text-ink outline-none focus-visible:[box-shadow:0_0_0_3px_var(--accent-soft)]" placeholder="Write your message…" dir="auto">${escapeHtml(bodyText)}</textarea>
        ${draft?.attachments?.length ? `<div class="mt-2 flex flex-wrap gap-2">${draft.attachments.map(a => `<span class="${CHIP_CLASS}">${icon('i-clip', 11)}${escapeHtml(a.name)}</span>`).join('')}</div>` : ''}
        <p class="${ERROR_CLASS} mt-2" role="alert" data-compose-error>${escapeHtml(state.composeError)}</p>
        <section class="mt-4 border-t border-line pt-4" data-mail-related aria-label="Related items"></section>
      </div>
      <div class="email-composer flex flex-none items-center gap-2 border-t border-line bg-surface px-6 py-3">
        <button type="button" class="lbtn pri email-send">${icon('i-reply')} Send</button>
        <button type="button" class="lbtn" data-save-draft>Save draft</button>
        <button type="button" class="lbtn" data-discard-draft>Discard</button>
        <span class="${HINT_CLASS} ms-auto">Prototype: sending files the message in Sent; nothing is delivered.</span>
      </div>`

    const relatedHost = pane.querySelector('[data-mail-related]')
    if (draft) related.render(relatedHost, {type: 'mail', id: draft.id})
    else relatedHost.innerHTML = `<h3 class="text-[13px] font-semibold text-ink">Related items</h3><p class="${HINT_CLASS} mt-1">Start writing to save a draft — then you can link notes, activities, events and people.</p>`

    pane.querySelector('[data-mail-back]')?.addEventListener('click', backToList)
    pane.querySelector('[data-add-cc]')?.addEventListener('click', () => {
      composeCc = []
      const row = pane.querySelector('[data-add-cc]').parentElement
      row.outerHTML = recipientRow('cc', [])
      bindRecipients(pane, 'cc')
      pane.querySelector('#email-compose-cc').focus()
    })
    bindRecipients(pane, 'to')
    if (composeCc.length || draft?.ccInput) bindRecipients(pane, 'cc')
    ;['#email-compose-subject', '#email-compose-body'].forEach(selector =>
      pane.querySelector(selector).addEventListener('input', () => {
        ensureDraft()
        scheduleSave(readCompose)
      })
    )
    pane.querySelector('.email-send').addEventListener('click', () => {
      ensureDraft()
      sendDraft(state.draftId)
    })
    pane.querySelector('[data-save-draft]').addEventListener('click', () => {
      ensureDraft()
      saveNow(readCompose)
      toast({tone: 'ok', title: 'Draft saved', body: 'Find it in Drafts.'})
    })
    pane.querySelector('[data-discard-draft]').addEventListener('click', discardDraft)
  }

  function readCompose() {
    const pane = queryId('email-reading')
    return {
      to: composeTo,
      cc: composeCc,
      toInput: pane.querySelector('#email-compose-to')?.value ?? '',
      ccInput: pane.querySelector('#email-compose-cc')?.value ?? '',
      subject: pane.querySelector('#email-compose-subject')?.value ?? '',
      body: (pane.querySelector('#email-compose-body')?.value ?? '').split(/\n{2,}/),
    }
  }

  function bindRecipients(pane, kind) {
    const input = pane.querySelector(`#email-compose-${kind}`)
    const list = pane.querySelector(`#email-compose-${kind}-suggestions`)
    const people = () => (kind === 'to' ? composeTo : composeCc)
    let options = []
    let active = 0
    const close = () => {
      list.classList.remove('open')
      input.setAttribute('aria-expanded', 'false')
      input.removeAttribute('aria-activedescendant')
    }
    const add = person => {
      if (people().some(p => p.email === person.email)) return
      people().push(person)
      ensureDraft()
      scheduleSave(readCompose)
      rerenderRow()
    }
    const rerenderRow = () => {
      const row = input.closest('.email-compose-row')
      row.outerHTML = recipientRow(kind, people())
      bindRecipients(queryId('email-reading'), kind)
      queryId(`email-compose-${kind}`).focus()
    }
    const suggest = () => {
      const query = input.value.trim().toLowerCase()
      const taken = new Set(people().map(p => p.email))
      options = query
        ? users.filter(u => !taken.has(u.email) && (u.name.toLowerCase().includes(query) || u.email.includes(query))).slice(0, 6)
        : []
      active = 0
      list.innerHTML = options
        .map((u, index) => `<li role="option" id="email-${kind}-option-${index}" data-index="${index}" aria-selected="${index === active}" class="cursor-pointer rounded-md px-2 py-1.5 text-[13px] text-ink hover:bg-[var(--line-2)] aria-selected:bg-[var(--accent-soft)]">${escapeHtml(u.name)} <span class="text-xs text-muted">${escapeHtml(u.email)} · ${escapeHtml(u.role)}</span></li>`)
        .join('')
      const open = options.length > 0
      list.classList.toggle('open', open)
      input.setAttribute('aria-expanded', String(open))
      if (open) input.setAttribute('aria-activedescendant', `email-${kind}-option-0`)
    }
    const commitTyped = () => {
      const value = input.value.trim().replace(/,$/, '')
      if (!value) return false
      if (!EMAIL_PATTERN.test(value)) {
        setComposeError(`“${value}” isn’t a valid email address. Pick a user or type a full address.`)
        return false
      }
      setComposeError('')
      add({name: value, email: value})
      return true
    }
    input.addEventListener('input', () => {
      if (input.value.endsWith(',')) {
        commitTyped()
        return
      }
      suggest()
      ensureDraft()
      scheduleSave(readCompose)
    })
    input.addEventListener('keydown', event => {
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && options.length) {
        event.preventDefault()
        active = (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
        list.querySelectorAll('[role=option]').forEach((li, index) => li.setAttribute('aria-selected', String(index === active)))
        input.setAttribute('aria-activedescendant', `email-${kind}-option-${active}`)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        if (list.classList.contains('open') && options[active]) {
          const u = options[active]
          add({id: u.id, name: u.name, email: u.email})
        } else commitTyped()
      } else if (event.key === 'Escape' && list.classList.contains('open')) {
        event.stopPropagation()
        close()
      } else if (event.key === 'Backspace' && !input.value && people().length) {
        people().pop()
        ensureDraft()
        scheduleSave(readCompose)
        rerenderRow()
      }
    })
    input.addEventListener('blur', () => setTimeout(close, 150))
    list.addEventListener('mousedown', event => event.preventDefault())
    list.addEventListener('click', event => {
      const option = event.target.closest('[role=option]')
      if (!option) return
      const u = options[Number(option.dataset.index)]
      add({id: u.id, name: u.name, email: u.email})
    })
    input.closest('.email-compose-row').querySelectorAll('[data-remove-recipient]').forEach(button =>
      button.addEventListener('click', () => {
        people().splice(Number(button.dataset.removeRecipient.split(':')[1]), 1)
        ensureDraft()
        scheduleSave(readCompose)
        rerenderRow()
      })
    )
    input._commitTyped = commitTyped
  }

  function setComposeError(message) {
    state.composeError = message
    const el = root.querySelector('[data-compose-error]')
    if (el) el.textContent = message
  }

  /* Drafts are created on the first edit (or up front when composing from
     another item, so the relationship exists immediately). */
  function ensureDraft() {
    if (state.draftId && store.getEntity('mail', state.draftId)) return
    const draft = store.createEntity('mail', {
      folder: 'drafts',
      threadId: `t-${Date.now()}`,
      from: me,
      to: [],
      cc: [],
      subject: '',
      body: [''],
      attachments: [],
      unread: false,
      starred: false,
      hue: 210,
      savedAt: store.now(),
    })
    state.draftId = draft.id
    state.selectedId = draft.id
    const relatedHost = root.querySelector('[data-mail-related]')
    if (relatedHost) related.render(relatedHost, {type: 'mail', id: draft.id})
  }

  let pendingRead = null
  function scheduleSave(read) {
    pendingRead = read
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveNow(read), AUTOSAVE_MS)
  }
  function saveNow(read) {
    clearTimeout(saveTimer)
    saveTimer = null
    pendingRead = null
    if (!state.draftId || !store.getEntity('mail', state.draftId)) return
    store.updateEntity('mail', state.draftId, {...read(), savedAt: store.now()})
    const status = root.querySelector('[data-draft-status]')
    if (status) status.textContent = `Draft saved ${formatTime(store.now())}`
    /* Skip the rail while a folder is being named: re-rendering it would
       clear the input the user is typing in. */
    if (!state.folderForm) renderFolders()
  }
  function flushDraft() {
    if (pendingRead) saveNow(pendingRead)
  }

  function sendDraft(id) {
    const typed = root.querySelector('#email-compose-to')
    if (typed?.value.trim() && !typed._commitTyped()) return
    const ccTyped = root.querySelector('#email-compose-cc')
    if (ccTyped?.value.trim() && !ccTyped._commitTyped()) return
    clearTimeout(saveTimer)
    pendingRead = null
    if (state.mode === 'compose') store.updateEntity('mail', id, readCompose())
    const draft = store.getEntity('mail', id)
    if (!draft.to?.length) {
      setComposeError('Add at least one recipient.')
      root.querySelector('#email-compose-to')?.focus()
      return
    }
    const text = (draft.body || []).join('').trim()
    if (!draft.subject.trim() && !text) {
      setComposeError('Write a subject or a message before sending.')
      root.querySelector('#email-compose-subject')?.focus()
      return
    }
    setComposeError('')
    store.updateEntity('mail', id, {folder: 'sent', sentAt: store.now(), unread: false})
    toast({tone: 'ok', title: 'Message sent', body: 'Prototype only — nothing is delivered. It is filed in Sent.'})
    state.mode = 'read'
    state.draftId = null
    state.selectedId = id
    composeTo = []
    composeCc = []
    renderAll()
  }

  async function discardDraft() {
    const id = state.draftId
    if (id) {
      const linked = store.getRelatedItems('mail', id).length
      const ok = await confirm({
        title: 'Discard this draft?',
        body: linked ? 'The draft is deleted. Linked items will show it as unavailable.' : 'The draft is deleted.',
        confirmLabel: 'Discard',
        tone: 'danger',
      })
      if (!ok) return
      clearTimeout(saveTimer)
      pendingRead = null
      store.deleteEntity('mail', id)
    }
    toast({tone: 'info', title: 'Draft discarded'})
    state.mode = 'read'
    state.draftId = null
    state.selectedId = null
    state.pane = 'list'
    composeTo = []
    composeCc = []
    renderAll()
  }

  function openCompose({linkRef = null, subject = ''} = {}) {
    flushDraft()
    state.mode = 'compose'
    state.pane = 'detail'
    state.composeError = ''
    composeTo = []
    composeCc = []
    if (linkRef) {
      state.draftId = null
      ensureDraft()
      store.updateEntity('mail', state.draftId, {subject})
      store.link({type: 'mail', id: state.draftId}, linkRef)
    } else {
      state.draftId = null
      state.selectedId = null
    }
    renderAll()
    root.querySelector('#email-compose-to')?.focus()
  }

  /** Shown while two or more rows are selected: a stack of one card per
   *  selected message, so the pane itself signals a multi-selection instead
   *  of any single message's content. */
  function renderSelectionStack(ids) {
    const messages = ids.map(id => store.getEntity('mail', id)).filter(Boolean)
    const pane = queryId('email-reading')
    pane.innerHTML = `<div class="flex-none" data-mail-toolbar>${bulkToolbarMarkup()}</div>
      <div class="email-reading-scroll nc-scroll min-h-0 flex-1 overflow-auto p-4 [body.density-compact_&]:p-3 [body.density-comfortable_&]:p-5">
        <ul class="m-0 flex list-none flex-col gap-2 p-0" aria-label="Selected messages">${messages
          .map(m => {
            const text = Array.isArray(m.body) ? m.body.join(' ') : m.body || ''
            return `<li class="email-sel-card flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface px-3.5 py-3 transition-colors hover:border-[var(--accent-line)] hover:bg-[var(--hover-overlay)] focus-visible:outline-2 focus-visible:outline-[var(--focus)]" tabindex="0" data-sel-card data-id="${escapeHtml(m.id)}">
              <span class="${AVATAR_CLASS} w-8 h-8 flex-none text-[13px] mt-0.5" style="--hue:${Number(m.hue) || 210}">${avatar(m.from, 15)}</span>
              <span class="min-w-0 flex-1">
                <span class="flex items-baseline justify-between gap-2">
                  <b class="truncate text-[13px] font-semibold text-ink" dir="auto">${escapeHtml(counterpart(m))}</b>
                  <span class="flex-none text-xs text-faint">${escapeHtml(formatTime(stampOf(m)))}</span>
                </span>
                <span class="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
                  ${m.starred ? `<span class="text-accent">${icon('i-spark', 11)}<span class="sr-only">Starred</span></span>` : ''}
                  <span class="min-w-0 flex-1 truncate" dir="auto">${escapeHtml(titleOf(m))}</span>
                </span>
                <span class="mt-1 block text-[12.5px] leading-snug text-faint" dir="auto">${escapeHtml(text.slice(0, 120))}${text.length > 120 ? '…' : ''}</span>
              </span>
            </li>`
          })
          .join('')}</ul>
        <p class="${HINT_CLASS} mt-3">${messages.length} messages are selected. Use the bar above to act on them all.</p>
      </div>`
    bindBulkToolbar(pane.querySelector('[data-mail-toolbar]'))
    pane.querySelectorAll('[data-sel-card]').forEach(card => {
      card.addEventListener('click', () => selectMessage(card.dataset.id))
      card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        selectMessage(card.dataset.id)
      })
    })
  }

  /* ---------- render ---------- */
  function renderAll() {
    renderFolders()
    renderList()
    const pane = queryId('email-reading')
    if (state.mode === 'compose') {
      renderCompose(state.draftId ? store.getEntity('mail', state.draftId) : null)
    } else if (state.selectedIds.size >= 2) {
      renderSelectionStack([...state.selectedIds])
    } else {
      const m = state.selectedId && store.getEntity('mail', state.selectedId)
      if (m) renderReading(m)
      else
        pane.innerHTML = `<div class="m-auto grid max-w-[340px] justify-items-center gap-2 p-8 text-center text-muted">${icon('i-mail', 28)}<p class="text-[13px]">Select a message to read it, or press Compose to write one.</p></div>`
    }
    applyLayout()
  }

  /* The expand/collapse toggle lives in the list header, outside the rail
     that renderFolders rebuilds, so it binds once. */
  root.querySelector('[data-rail-toggle]').addEventListener('click', event => {
    state.railOpen = !state.railOpen
    renderFolders()
    const toggle = event.currentTarget
    /* Same contract as the shell's rail icons (sidebar.js): a mouse click
       re-focuses the toggle, which would hold ":focus-within" — and so the
       peek-open rail — engaged after a Collapse until an unrelated outside
       click. Blur on a pointer click (detail > 0) so the rail folds back as
       soon as the pointer leaves; a keyboard click (detail 0) keeps focus
       and the rail open for keyboard navigation. */
    if (event.detail > 0) toggle.blur()
    else toggle.focus()
  }, {signal})
  /* Folder controls (pick, create, rename, delete, cancel) live in the rail
     that renderFolders rebuilds, so they are handled by delegation. */
  root.querySelector('[data-folders]').addEventListener('click', event => {
    const picked = event.target.closest('[data-folder]')
    if (picked) return setFolder(picked.dataset.folder)
    const create = event.target.closest('[data-new-folder]')
    if (create) return openFolderForm('new')
    const rename = event.target.closest('[data-folder-rename]')
    if (rename) return openFolderForm(rename.dataset.folderRename)
    const remove = event.target.closest('[data-folder-delete]')
    if (remove) return removeFolder(remove.dataset.folderDelete)
    const cancel = event.target.closest('[data-folder-cancel]')
    if (cancel) return closeFolderForm()
  }, {signal})
  root.querySelector('[data-folders]').addEventListener('submit', event => {
    event.preventDefault()
    commitFolderForm()
  }, {signal})
  root.querySelector('[data-folders]').addEventListener('keydown', event => {
    if (event.target.closest('[data-folder-form]') && event.key === 'Escape') {
      event.stopPropagation()
      closeFolderForm()
    }
  }, {signal})
  /* The unread quick-filter and the select-all checkbox live in the list
     header, outside the list renderFolders/renderList rebuild, so they bind
     once. Select-all works on the visible rows — search and the unread
     filter included — and the header checkbox reflects them via
     syncSelectAll. */
  root.querySelector('[data-mail-unread-filter]').addEventListener('click', event => {
    state.unreadOnly = !state.unreadOnly
    event.currentTarget.setAttribute('aria-pressed', String(state.unreadOnly))
    renderList()
  }, {signal})
  root.querySelector('[data-mail-select-all]').addEventListener('change', event => {
    const box = event.currentTarget
    const ids = visibleMessages().map(m => m.id)
    if (box.checked) ids.forEach(id => state.selectedIds.add(id))
    else ids.forEach(id => state.selectedIds.delete(id))
    renderList()
    refreshToolbar()
  }, {signal})
  root.querySelector('[data-folder-select]').addEventListener('change', event => setFolder(event.target.value), {signal})
  queryId('email-search-input').addEventListener('input', event => {
    state.query = event.target.value
    renderList()
  }, {signal})
  root.querySelector('.email-compose')?.addEventListener('click', () => openCompose(), {signal})
  root.querySelectorAll('.email-back').forEach(b =>
    b.addEventListener('click', event => {
      event.preventDefault()
      closeEmailView()
    }, {signal})
  )

  function openEmailView(id) {
    navigate('email', id ? {messageId: id} : {})
  }
  function closeEmailView() {
    navigate('record')
  }

  return {
    id: 'email',
    roots: [root],
    activate({messageId} = {}) {
      queryId('email-search-input').value = state.query
      if (messageId) {
        const m = store.getEntity('mail', messageId)
        if (m) {
          state.folder = m.folder
          state.query = ''
          queryId('email-search-input').value = ''
          selectMessage(messageId)
          return
        }
        toast({tone: 'warn', title: 'This message is no longer available', body: 'It may have been deleted.'})
      }
      if (state.mode === 'read' && !state.selectedId) {
        const first = folderMail(state.folder)[0]
        if (first && !narrow()) return selectMessage(first.id)
      }
      renderAll()
    },
    deactivate() {
      flushDraft()
    },
    dispose() {
      pageAbort.abort()
    },
    openEmailView,
    closeEmailView,
    /** Open the composer with a new draft already linked to `ref`. */
    composeLinked(ref) {
      const source = store.getEntity(ref.type, ref.id)
      navigate('email')
      openCompose({linkRef: ref, subject: source ? titleOf(source) : ''})
    },
    getInboxRows() {
      return folderMail('inbox').map(m => ({
        id: m.id,
        day: dayLabel(stampOf(m)),
        from: m.from?.name || '',
        subject: titleOf(m),
        time: formatTime(stampOf(m)),
        unread: m.unread,
        hue: m.hue,
      }))
    },
  }
}

