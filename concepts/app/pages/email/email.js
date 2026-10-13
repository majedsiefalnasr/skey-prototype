// Internal Mail — mailboxes (Inbox, Starred, Sent, Drafts, Archive,
// Trash), a message list, and a reading / compose pane, all over the
// collaboration store's `mail` entities. Drafts are real entities that are
// autosaved and survive navigation and reloads; Send moves a draft to Sent.
// Nothing is delivered anywhere — the prototype says so when you send.
// Relationships live only in the store's links table (Related Items).
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

const TOOL_CLASS =
  'inline-flex min-h-8 items-center gap-1.5 rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] font-medium text-ink hover:bg-[var(--line-2)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]'
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
  const state = {folder: 'inbox', query: '', selectedId: null, mode: 'read', draftId: null, pane: 'list', composeError: ''}
  let saveTimer = null

  const todayKey = () => store.now().slice(0, 10)
  const stampOf = m => m.sentAt || m.savedAt || m.createdAt
  const inFolder = (m, folder) => (folder === 'starred' ? m.starred && m.folder !== 'trash' : m.folder === folder)
  const allMail = () => store.listEntities('mail')
  const folderMail = folder => allMail().filter(m => inFolder(m, folder)).sort((a, b) => stampOf(b).localeCompare(stampOf(a)))
  const folderLabel = id => MAIL_FOLDERS.find(([folder]) => folder === id)?.[1] ?? id
  const dayLabel = key => relativeDay(key, todayKey()) ?? formatDate(key)
  const narrow = () => matchMedia('(max-width: 720px)').matches
  const compact = () => matchMedia('(max-width: 1100px)').matches

  /* ---------- layout ---------- */
  function applyLayout() {
    const rail = root.querySelector('[data-folders]')
    const select = root.querySelector('[data-folder-select]')
    rail.hidden = compact()
    select.hidden = !compact()
    const list = root.querySelector('.email-list')
    const pane = queryId('email-reading')
    list.hidden = narrow() && state.pane === 'detail'
    pane.hidden = narrow() && state.pane === 'list'
    list.classList.toggle('w-full', narrow())
  }
  matchMedia('(max-width: 720px)').addEventListener('change', applyLayout, {signal})
  matchMedia('(max-width: 1100px)').addEventListener('change', applyLayout, {signal})

  /* ---------- folders ---------- */
  function renderFolders() {
    const counts = Object.fromEntries(
      MAIL_FOLDERS.map(([id]) => {
        const list = folderMail(id)
        return [id, id === 'inbox' ? list.filter(m => m.unread).length : id === 'drafts' ? list.length : 0]
      })
    )
    root.querySelector('[data-folders]').innerHTML = `<ul class="m-0 grid list-none gap-0.5 p-0">${MAIL_FOLDERS.map(
      ([id, label, iconName]) => `<li><button type="button" data-folder="${id}" ${state.folder === id ? 'aria-current="true"' : ''} class="flex min-h-8 w-full items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1.5 text-start text-[13px] text-ink hover:bg-[var(--line-2)] aria-[current=true]:bg-[var(--accent-soft)] aria-[current=true]:font-semibold aria-[current=true]:text-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)]">${icon(iconName)}<span class="flex-1">${label}</span>${counts[id] ? `<span class="text-xs text-muted">${counts[id]}<span class="sr-only"> ${id === 'inbox' ? 'unread' : 'drafts'}</span></span>` : ''}</button></li>`
    ).join('')}</ul>`
    root.querySelector('[data-folder-select]').innerHTML = MAIL_FOLDERS.map(
      ([id, label]) => `<option value="${id}"${state.folder === id ? ' selected' : ''}>${label}${counts[id] ? ` (${counts[id]})` : ''}</option>`
    ).join('')
  }

  function setFolder(folder) {
    flushDraft()
    state.folder = folder
    state.selectedId = null
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
    return folderMail(state.folder).filter(m => !query || searchText(m).includes(query))
  }

  function renderList() {
    const scroll = queryId('email-list-scroll')
    const messages = visibleMessages()
    if (!messages.length) {
      scroll.innerHTML = `<div class="notif-empty flex flex-col items-center gap-2 px-6 py-10 text-center text-faint">${icon(state.query.trim() ? 'i-search' : 'i-mail', 28)}<p class="text-[13px] text-muted"></p></div>`
      scroll.querySelector('p').textContent = state.query.trim()
        ? `No messages match “${state.query.trim()}”.`
        : `No messages in ${folderLabel(state.folder)}.`
      return
    }
    let lastDay = null
    scroll.innerHTML = `<ul role="listbox" class="m-0 list-none p-0" aria-label="${escapeHtml(folderLabel(state.folder))} messages">${messages
      .map(m => {
        const day = dayLabel(stampOf(m))
        const header =
          day !== lastDay
            ? `<li class="nc-group-lbl px-2.5 pb-1 pt-3.5 text-xs font-semibold uppercase tracking-[.04em] text-faint first:pt-1.5" role="presentation">${escapeHtml(day)}</li>`
            : ''
        lastDay = day
        const relatedCount = store.getRelatedItems('mail', m.id).length
        const selected = m.id === state.selectedId
        return `${header}<li role="presentation"><button type="button" role="option" aria-selected="${selected}" data-id="${escapeHtml(m.id)}" ${selected ? 'aria-current="true"' : ''} class="email-list-row${m.unread ? ' unread' : ''}${selected ? ' active' : ''} flex w-full cursor-pointer items-start gap-2.5 border-0 border-b border-line bg-transparent px-3.5 py-2.5 text-start font-[inherit] hover:bg-[var(--hover-overlay)] aria-[current=true]:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] [body.density-compact_&]:py-2 [body.density-comfortable_&]:py-3.5">
          <span class="${AVATAR_CLASS} w-7 h-7 text-xs" style="--hue:${Number(m.hue) || 210}">${avatar(m.folder === 'sent' || m.folder === 'drafts' ? m.to?.[0] || me : m.from, 14)}</span>
          <span class="min-w-0 flex-1">
            <span class="flex items-baseline justify-between gap-2"><b class="truncate text-[13px] ${m.unread ? 'font-bold' : 'font-medium'} text-ink" dir="auto">${m.unread ? '<span class="sr-only">Unread. </span>' : ''}${escapeHtml(counterpart(m))}</b><span class="flex-none text-xs text-faint">${escapeHtml(formatTime(stampOf(m)))}</span></span>
            <span class="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted">
              ${m.folder === 'drafts' ? '<span class="badge warn">Draft</span>' : ''}
              <span class="email-list-subj min-w-0 flex-1 truncate" dir="auto">${escapeHtml(titleOf(m))}</span>
              ${m.starred ? `<span class="text-accent">${icon('i-spark', 11)}<span class="sr-only">Starred</span></span>` : ''}
              ${m.attachments?.length ? `<span>${icon('i-clip', 11)}<span class="sr-only">Has attachments</span></span>` : ''}
              ${relatedCount ? `<span class="inline-flex items-center gap-0.5">${icon('i-flow', 11)}${relatedCount}<span class="sr-only"> related items</span></span>` : ''}
            </span>
          </span>
        </button></li>`
      })
      .join('')}</ul>`
    scroll.querySelectorAll('.email-list-row').forEach(row => {
      row.addEventListener('click', () => selectMessage(row.dataset.id))
      row.addEventListener('keydown', event => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        event.preventDefault()
        const rows = [...scroll.querySelectorAll('.email-list-row')]
        rows[rows.indexOf(row) + (event.key === 'ArrowDown' ? 1 : -1)]?.focus()
      })
    })
  }

  /* ---------- selection / reading ---------- */
  function selectMessage(id) {
    const m = store.getEntity('mail', id)
    if (!m) return
    if (state.draftId && state.draftId !== id) flushDraft()
    state.selectedId = id
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
    const tools = [
      ['reply', 'i-reply', 'Reply'],
      ['forward', 'i-next', 'Forward'],
      archived || inTrash ? ['restore', 'i-undo', inTrash ? 'Restore' : 'Move to Inbox'] : ['archive', 'i-archive', 'Archive'],
      inTrash ? ['purge', 'i-trash', 'Delete permanently'] : ['trash', 'i-trash', 'Delete'],
      ['unread', 'i-mail', 'Mark unread'],
      ['star', 'i-spark', m.starred ? 'Unstar' : 'Star'],
      ['activity', 'i-check', 'Create activity'],
    ]
    return `<div class="flex flex-wrap items-center gap-1 border-b border-line px-4 py-2" role="toolbar" aria-label="Message actions">
      ${narrow() ? `<button type="button" class="${TOOL_CLASS}" data-mail-back>${icon('i-prev')} Back</button>` : ''}
      ${tools.map(([action, iconName, label]) => `<button type="button" class="${TOOL_CLASS}" data-mail-action="${action}"${action === 'star' ? ` aria-pressed="${Boolean(m.starred)}"` : ''}>${icon(iconName)}<span>${label}</span></button>`).join('')}
    </div>`
  }

  function renderReading(m) {
    const pane = queryId('email-reading')
    const thread = allMail()
      .filter(x => x.threadId === m.threadId && x.folder !== 'drafts' && (m.folder === 'trash' || x.folder !== 'trash'))
      .sort((a, b) => stampOf(a).localeCompare(stampOf(b)))
    const messages = thread.length ? thread : [m]
    pane.innerHTML = `${toolbarMarkup(m)}
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
    pane.querySelectorAll('[data-mail-action]').forEach(button =>
      button.addEventListener('click', () => runAction(button.dataset.mailAction, m))
    )
    pane.querySelector('[data-mail-back]')?.addEventListener('click', backToList)
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
          assigneeId: me.id,
          status: 'planned',
          priority: 'normal',
          archived: false,
        })
        store.link(ref, {type: 'activity', id: activity.id})
        toast({tone: 'ok', title: 'Activity created and linked', body: titleOf(activity)})
        openItem({type: 'activity', id: activity.id})
        return
      }
    }
  }

  function afterMove() {
    state.selectedId = null
    state.pane = 'list'
    renderAll()
    root.querySelector('.email-list-row')?.focus()
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
    renderFolders()
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

  /* ---------- render ---------- */
  function renderAll() {
    renderFolders()
    renderList()
    const pane = queryId('email-reading')
    if (state.mode === 'compose') {
      renderCompose(state.draftId ? store.getEntity('mail', state.draftId) : null)
    } else {
      const m = state.selectedId && store.getEntity('mail', state.selectedId)
      if (m) renderReading(m)
      else
        pane.innerHTML = `<div class="m-auto grid max-w-[340px] justify-items-center gap-2 p-8 text-center text-muted">${icon('i-mail', 28)}<p class="text-[13px]">Select a message to read it, or press Compose to write one.</p></div>`
    }
    applyLayout()
  }

  root.querySelector('[data-folders]').addEventListener('click', event => {
    const button = event.target.closest('[data-folder]')
    if (button) setFolder(button.dataset.folder)
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

