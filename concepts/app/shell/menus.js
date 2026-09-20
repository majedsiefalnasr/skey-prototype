

/** Owns menus state and its DOM bindings. */
export function createMenus({showLaunchpad, getLaunchpadEnabled} = {}) {
  const closeAllMenus = except =>
    document.querySelectorAll('.menu > button[aria-expanded="true"]').forEach(b => {
      if (b !== except) {
        b.setAttribute('aria-expanded', 'false')
        b.parentElement.querySelector('.mlist').classList.remove('open')
      }
    })

  const enabledMenuItems = list =>
    [...list.querySelectorAll('[role^="menuitem"]')].filter(item => !item.disabled)

  function openMenuFromKeyboard(trigger, edge) {
    const list = trigger.parentElement.querySelector('.mlist')
    closeAllMenus(trigger)
    trigger.setAttribute('aria-expanded', 'true')
    list.classList.add('open')
    if (list.classList.contains('app-switcher-list')) positionFixedMenu(trigger, list)
    const items = enabledMenuItems(list)
    items.forEach(item => (item.tabIndex = -1))
    ;(edge === 'last' ? items.at(-1) : items[0])?.focus()
  }

  function closeMenuAndRestoreFocus(trigger) {
    trigger.setAttribute('aria-expanded', 'false')
    trigger.parentElement.querySelector('.mlist').classList.remove('open')
    trigger.focus()
  }

  document.addEventListener('keydown', event => {
    const trigger = event.target.closest('.menu > button[aria-haspopup="menu"]')
    if (trigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault()
      openMenuFromKeyboard(trigger, event.key === 'ArrowUp' ? 'last' : 'first')
      return
    }
    const list = event.target.closest('.mlist[role="menu"]')
    if (!list) return
    const owner = list.parentElement.querySelector(':scope > button[aria-haspopup="menu"]')
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenuAndRestoreFocus(owner)
      return
    }
    if (event.key === 'Tab') {
      owner.setAttribute('aria-expanded', 'false')
      list.classList.remove('open')
      return
    }
    const items = enabledMenuItems(list)
    if (!items.length) return
    const current = items.indexOf(document.activeElement)
    let next = current
    if (event.key === 'ArrowDown') next = (current + 1) % items.length
    else if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    event.preventDefault()
    items[next]?.focus()
  })

  document.addEventListener('click', e => {
    const switcherBtn = e.target.closest('.app-switcher-menu > button')
    if (switcherBtn) {
      if (!getLaunchpadEnabled()) return
      const fbody = switcherBtn.closest('.design').querySelector('.fbody')
      showLaunchpad(fbody, {mode: 'switcher', returnFocus: switcherBtn})
      return
    }
    const trg = e.target.closest('.menu > button[aria-haspopup]')
    if (trg) {
      const l = trg.parentElement.querySelector('.mlist')
      const open = trg.getAttribute('aria-expanded') === 'true'
      closeAllMenus(trg)
      trg.setAttribute('aria-expanded', String(!open))
      l.classList.toggle('open', !open)
      if (!open && l.classList.contains('app-switcher-list')) positionFixedMenu(trg, l)
      return
    }
    if (!e.target.closest('.menu')) closeAllMenus()
  })

  function positionFixedMenu(trigger, list) {
    const r = trigger.getBoundingClientRect()
    list.style.position = 'fixed'
    list.style.insetInlineStart = r.left + 'px'
    list.style.insetInlineEnd = 'auto'
    list.style.top = r.bottom + 4 + 'px'
  }

  return {closeAllMenus, closeMenuAndRestoreFocus}
}
