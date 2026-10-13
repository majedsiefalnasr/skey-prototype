// Side-panel editor shared by Notes, Activities, Events and People Data,
// plus the small confirm dialog every collaboration screen uses. Markup
// lives in components/collab/collab.html.
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
    dialog.querySelector('#collab-confirm-title').textContent = title
    dialog.querySelector('#collab-confirm-body').textContent = body
    ok.textContent = confirmLabel
    ok.classList.toggle('dan', tone === 'danger')
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

export function createCollabPanel({trapFocus, releaseFocus, confirm}) {
  const panel = document.getElementById('collab-panel')
  const scrim = document.getElementById('collab-panel-scrim')
  if (!panel || !scrim) throw new Error('collab panel markup missing')
  const typeBadge = panel.querySelector('[data-panel-type]')
  const titleEl = panel.querySelector('#collab-panel-title')
  const body = panel.querySelector('[data-panel-body]')
  const relatedHost = panel.querySelector('[data-panel-related]')
  const form = panel.querySelector('[data-panel-form]')
  const menuButton = panel.querySelector('[data-panel-menu]')
  const menuList = panel.querySelector('[data-panel-menu-list]')
  const menuWrap = panel.querySelector('[data-panel-menu-wrap]')

  let current = null
  let snapshot = ''

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
          `<button type="button" role="menuitem" tabindex="-1" data-index="${index}" class="flex min-h-8 w-full items-center gap-2 rounded-[5px] border-0 bg-transparent px-2 py-1.5 text-start text-[13px] ${item.danger ? 'text-[color:var(--danger)]' : 'text-ink'} hover:bg-[var(--line-2)] focus-visible:bg-[var(--line-2)] focus-visible:outline-none">${item.icon ? icon(item.icon) : ''}${escapeHtml(item.label)}</button>`
      )
      .join('')
  }

  function renderRelated() {
    relatedHost.hidden = !current?.related
    relatedHost.innerHTML = ''
    current?.related?.(relatedHost)
  }

  /**
   * @param {{ref?: {type: string, id: string}, typeLabel: string, typeIcon: string,
   *   title: string, render: (body: HTMLElement) => void,
   *   save: (body: HTMLElement) => boolean, menu?: {label: string, run: () => void, danger?: boolean, icon?: string}[],
   *   related?: (host: HTMLElement) => void, saveLabel?: string}} options
   */
  function open(options) {
    const wasOpen = Boolean(current)
    current = {menu: [], ...options}
    typeBadge.className = 'badge gray inline-flex shrink-0 items-center gap-1.5'
    typeBadge.innerHTML = `${icon(current.typeIcon, 12)}<span>${escapeHtml(current.typeLabel)}</span>`
    titleEl.textContent = current.title
    panel.querySelector('[data-panel-save]').textContent = current.saveLabel || 'Save'
    body.innerHTML = ''
    current.render(body)
    renderMenu(current.menu)
    closeMenu()
    renderRelated()
    snapshot = formSnapshot(body)
    panel.classList.add('open')
    scrim.classList.add('open')
    if (!wasOpen) trapFocus(panel)
    ;(body.querySelector('[autofocus]') || body.querySelector(FOCUSABLE) || panel).focus()
  }

  async function close({force = false} = {}) {
    if (!current) return true
    if (!force && formSnapshot(body) !== snapshot) {
      const discard = await confirm({
        title: 'Discard changes?',
        body: 'Your edits to this item have not been saved.',
        confirmLabel: 'Discard',
        tone: 'danger',
      })
      if (!discard) return false
    }
    const onClose = current.onClose
    current = null
    closeMenu()
    panel.classList.remove('open')
    scrim.classList.remove('open')
    body.innerHTML = ''
    relatedHost.innerHTML = ''
    releaseFocus()
    onClose?.()
    return true
  }

  form.addEventListener('submit', async event => {
    event.preventDefault()
    if (!current) return
    const saved = await current.save(body)
    if (saved) {
      snapshot = formSnapshot(body)
      close({force: true})
    }
  })
  panel.querySelector('[data-panel-cancel]').addEventListener('click', () => close())
  panel.querySelector('[data-panel-close]').addEventListener('click', () => close())
  scrim.addEventListener('click', () => close())
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
