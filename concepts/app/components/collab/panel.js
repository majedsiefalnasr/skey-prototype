import {uiLocale} from '../../core/locale.js'
const {t} = uiLocale
// Record editor shared by Notes, Activities, Events and People Data,
// plus the small confirm dialog every collaboration screen uses. Markup
// lives in components/collab/collab.html. People Data supplies a full-page
// root with modal:false, retaining the same edit/save/validation contract.
//
// The panel uses the app's shared trapFocus/releaseFocus. Dialogs that
// open on top of it (confirm, the Related Items picker) keep Tab and Escape
// to themselves with their own keydown handler and stopPropagation, so the
// shared trap — still pointed at the panel — never pulls focus back.
import {escapeHtml, icon} from './fields.js'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])'

/** Keep Tab inside `box` and run `onEscape` for Escape. Returns a remover. */
export function holdFocus(box, onEscape) {
  const handler = event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onEscape()
      return
    }
    if (event.key !== 'Tab') return
    event.stopPropagation()
    const items = [...box.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null)
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  box.addEventListener('keydown', handler)
  return () => box.removeEventListener('keydown', handler)
}

export function createConfirm() {
  const root = () => document.getElementById('collab-confirm')
  return function confirm({title, body = '', confirmLabel = 'Confirm', tone = 'default'}) {
    const dialog = root()
    if (!dialog) return Promise.resolve(false)
    const box = dialog.querySelector('[data-confirm-box]')
    const ok = dialog.querySelector('[data-confirm-ok]')
    const cancel = dialog.querySelector('[data-confirm-cancel]')
    dialog.querySelector('#collab-confirm-title').textContent = t(title)
    dialog.querySelector('#collab-confirm-body').textContent = t(body)
    ok.textContent = t(confirmLabel)
    /* The shared popup shell tones itself from the .dlg's data-tone: a
       danger confirm repaints its border and the primary button. */
    box.dataset.tone = tone === 'danger' ? 'danger' : 'default'
    const returnTo = document.activeElement
    dialog.classList.add('open')
    ok.focus()
    return new Promise(resolve => {
      const finish = result => {
        release()
        ok.removeEventListener('click', onOk)
        cancel.removeEventListener('click', onCancel)
        dialog.removeEventListener('click', onBackdrop)
        dialog.classList.remove('open')
        if (returnTo && document.contains(returnTo)) returnTo.focus()
        resolve(result)
      }
      const onOk = () => finish(true)
      const onCancel = () => finish(false)
      const onBackdrop = event => {
        if (event.target === dialog) finish(false)
      }
      const release = holdFocus(box, () => finish(false))
      ok.addEventListener('click', onOk)
      cancel.addEventListener('click', onCancel)
      dialog.addEventListener('click', onBackdrop)
    })
  }
}

const formSnapshot = root =>
  JSON.stringify(
    [...root.querySelectorAll('input, select, textarea')].map(el =>
      el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value
    )
  )

/** `footerRoot`: where the Cancel/Save footer lives when the shell hoisted it
 *  out of `root` into its shared `.page-footer` slot (full-page records). */
export function createCollabPanel({trapFocus, releaseFocus, confirm, root, footerRoot, modal = true}) {
  const panel = root || document.getElementById('collab-panel')
  const scrim = modal ? document.getElementById('collab-panel-scrim') : null
  if (!panel || (modal && !scrim)) throw new Error('collab panel markup missing')
  const statusBadge = panel.querySelector('[data-panel-status]')
  const titleEl = panel.querySelector('[data-panel-title], #collab-panel-title')
  const descriptionEl = panel.querySelector('[data-panel-description]')
  const body = panel.querySelector('[data-panel-body]')
  const relatedHost = panel.querySelector('[data-panel-related]')
  const form = panel.querySelector('[data-panel-form]')
  const footer = (footerRoot || panel).querySelector('[data-panel-footer]')
  const editButton = panel.querySelector('[data-panel-edit]')
  const menuButton = panel.querySelector('[data-panel-menu]')
  const menuList = panel.querySelector('[data-panel-menu-list]')
  const menuWrap = panel.querySelector('[data-panel-menu-wrap]')

  let current = null
  let snapshot = ''
  /* An existing record opens read-only (mode 'view') when the page supplied
     a view renderer; a new record — or a freshly created one the caller
     opens with `edit: true` — goes straight to the form. Edit flips the
     body to the form; Cancel from there returns to the read-only view
     instead of closing, so browsing a record never risks its edits. */
  let mode = 'edit'

  const closeMenu = () => {
    menuList.classList.remove('open')
    menuButton.setAttribute('aria-expanded', 'false')
  }
  const openMenu = () => {
    menuList.classList.add('open')
    menuButton.setAttribute('aria-expanded', 'true')
    menuList.querySelector('[role=menuitem]')?.focus()
  }

  function renderMenu(items) {
    menuWrap.hidden = !items.length
    menuList.innerHTML = items
      .map(
        (item, index) =>
          `<button type="button" role="menuitem" tabindex="-1" data-index="${index}" class="flex min-h-8 w-full items-center gap-2 rounded-[5px] border-0 bg-transparent px-2 py-1.5 text-start text-[13px] ${item.danger ? 'text-[color:var(--danger)]' : 'text-ink'} hover:bg-[var(--line-2)] focus-visible:bg-[var(--line-2)] focus-visible:outline-none">${item.icon ? icon(item.icon) : ''}${escapeHtml(t(item.label))}</button>`
      )
      .join('')
  }

  function renderRelated() {
    relatedHost.hidden = !current?.related
    relatedHost.innerHTML = ''
    current?.related?.(relatedHost, {readOnly: mode === 'view'})
  }

  /** Paint the body for the current mode: the read-only view when one
   *  exists and the record does, the editor otherwise. The footer only
   *  belongs to the editor; view mode swaps it for the header's Edit. */
  function applyMode() {
    const viewing = mode === 'view'
    editButton.hidden = !viewing
    footer.hidden = viewing
    body.innerHTML = ''
    ;(viewing ? current.view : current.render)(body)
    snapshot = formSnapshot(body)
    renderRelated()
    ;(body.querySelector('[autofocus]') || body.querySelector(FOCUSABLE) || (modal ? panel : titleEl)).focus()
  }

  /**
   * @param {{ref?: {type: string, id: string},
   *   status?: {label: string, tone?: 'gray'|'fix'|'ok'|'warn'|'danger'},
   *   title: string, description?: string,
   *   render: (body: HTMLElement) => void,
   *   view?: (body: HTMLElement) => void, edit?: boolean,
   *   save: (body: HTMLElement) => boolean, menu?: {label: string, run: () => void, danger?: boolean, icon?: string}[],
   *   related?: (host: HTMLElement) => void, saveLabel?: string,
   *   onClose?: () => void, onSaved?: () => void}} options
   */
  function open(options) {
    const wasOpen = Boolean(current)
    current = {menu: [], ...options}
    /* The header carries a status chip and a note line — no type badge:
       the record's own title already says what kind of thing it is. */
    statusBadge.className = `badge inline-flex items-center rounded-full! px-2.5! py-1! ${current.status?.tone || 'gray'}`
    statusBadge.textContent = t(current.status?.label) || ''
    statusBadge.hidden = !current.status
    titleEl.textContent = current.ref ? current.title : t(current.title)
    descriptionEl.textContent = current.ref ? (current.description || '') : t(current.description || '')
    descriptionEl.hidden = !current.description
    footer.querySelector('[data-panel-save]').textContent = t(current.saveLabel || 'Save')
    /* Existing records open read-only when the page supplied a view
       renderer; new records — and freshly created ones the caller opens
       right away with `edit: true` — go straight to the form. */
    mode = current.view && current.ref && !current.edit ? 'view' : 'edit'
    /* Show the panel before painting the body: focusing [autofocus] only
       works once the panel is on screen, and Escape (bound to the panel)
       needs focus inside it. */
    panel.classList.add('open')
    scrim?.classList.add('open')
    applyMode()
    renderMenu(current.menu)
    closeMenu()
    if (!wasOpen && modal) trapFocus(panel)
  }

  async function requestLeave() {
    if (!current) return true
    if (form.getAttribute('aria-busy') === 'true') return false
    if (mode === 'edit' && formSnapshot(body) !== snapshot) {
      return confirm({
        title: 'Discard changes?',
        body: 'Your edits to this item have not been saved.',
        confirmLabel: t("Discard"),
        tone: 'danger',
      })
    }
    return true
  }

  async function close({force = false, notify = true} = {}) {
    if (!current) return true
    if (form.getAttribute('aria-busy') === 'true') return false
    if (!force && !(await requestLeave())) return false
    const onClose = current.onClose
    current = null
    closeMenu()
    panel.classList.remove('open')
    scrim?.classList.remove('open')
    body.innerHTML = ''
    relatedHost.innerHTML = ''
    if (modal) releaseFocus()
    if (notify) onClose?.()
    return true
  }

  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (!current || form.getAttribute('aria-busy') === 'true') return
    form.setAttribute('aria-busy', 'true')
    let saved
    try { saved = await current.save(body) } finally { form.removeAttribute('aria-busy') }
    if (saved) {
      snapshot = formSnapshot(body)
      if (current.onSaved) current.onSaved()
      else close({force: true})
    }
  })
  editButton.addEventListener('click', () => {
    if (!current || mode !== 'view') return
    mode = 'edit'
    applyMode()
  })
  footer.querySelector('[data-panel-cancel]').addEventListener('click', () => {
    /* Cancel inside the editor of an existing record returns to its
       read-only view — the panel only closes from the view itself. */
    if (current?.view && current?.ref && mode === 'edit') {
      mode = 'view'
      applyMode()
      return
    }
    close()
  })
  panel.querySelector('[data-panel-close]')?.addEventListener('click', () => close())
  scrim?.addEventListener('click', () => close())
  menuButton.addEventListener('click', () => (menuList.classList.contains('open') ? closeMenu() : openMenu()))
  menuList.addEventListener('click', event => {
    const item = event.target.closest('[role=menuitem]')
    if (!item || !current) return
    closeMenu()
    current.menu[Number(item.dataset.index)]?.run()
  })
  menuList.addEventListener('keydown', event => {
    const items = [...menuList.querySelectorAll('[role=menuitem]')]
    const index = items.indexOf(document.activeElement)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      items[(index + step + items.length) % items.length]?.focus()
    }
  })
  document.addEventListener('click', event => {
    if (menuList.classList.contains('open') && !menuWrap.contains(event.target)) closeMenu()
  })
  panel.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !current) return
    event.preventDefault()
    event.stopPropagation()
    if (menuList.classList.contains('open')) {
      closeMenu()
      menuButton.focus()
    } else close()
  })

  return {
    open,
    close,
    requestLeave,
    isOpen: () => Boolean(current),
    currentRef: () => current?.ref ?? null,
    refreshRelated: renderRelated,
    setTitle: title => {
      titleEl.textContent = title
    },
    /** Mark the current form state as saved (e.g. after an inline action
     *  like "Mark done" that persisted without closing the panel). */
    markClean: () => {
      snapshot = formSnapshot(body)
    },
  }
}
