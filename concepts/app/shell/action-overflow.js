/** Page action bars stay on one line: trailing actions that do not fit move
 *  into the bar's last menu ("More"), and come back when there is room. */
export function createActionOverflow(document) {
  const host = document.querySelector('.page-action-bar')
  if (!host) return
  const view = document.defaultView
  const observed = new WeakSet()
  let frame = 0

  const schedule = () => {
    if (!frame) frame = view.requestAnimationFrame(update)
  }
  const sizes = new view.ResizeObserver(schedule)
  const changes = new view.MutationObserver(schedule)
  const watch = () => changes.observe(host, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'disabled']})

  const crowded = bar => {
    if (bar.scrollWidth > bar.clientWidth + 1) return true
    const middles = [...bar.querySelectorAll(':scope > :not(.sp, .menus-mount), :scope > .menus-mount > *')]
      .map(item => item.getBoundingClientRect())
      .filter(box => box.height)
      .map(box => box.top + box.height / 2)
    return middles.length > 1 && Math.max(...middles) - Math.min(...middles) > 8
  }

  function menuItemFor(action, list) {
    const item = document.createElement('button')
    item.type = 'button'
    item.setAttribute('role', 'menuitem')
    item.dataset.overflowItem = ''
    item.disabled = action.disabled
    item.innerHTML = action.innerHTML
    item.addEventListener('click', () => {
      const trigger = list.parentElement.querySelector(':scope > button')
      trigger.setAttribute('aria-expanded', 'false')
      list.classList.remove('open')
      trigger.focus()
      action.click()
    })
    return item
  }

  function fit(bar) {
    const actions = [...bar.querySelectorAll(':scope > .sp ~ button')]
    const menus = bar.querySelectorAll(':scope > .menu, :scope > .menus-mount > .menu')
    const list = menus[menus.length - 1]?.querySelector(':scope > .mlist')
    if (!actions.length || !list) return
    const focused = list.contains(document.activeElement) && document.activeElement.matches('[data-overflow-item]')
    list.querySelectorAll('[data-overflow-item]').forEach(item => item.remove())
    actions.forEach(action => { action.hidden = false })
    const moved = []
    while (!bar.hidden && moved.length < actions.length && crowded(bar)) {
      const action = actions[actions.length - 1 - moved.length]
      action.hidden = true
      moved.unshift(action)
    }
    if (!moved.length) return
    const separator = document.createElement('hr')
    separator.dataset.overflowItem = ''
    list.prepend(...moved.map(action => menuItemFor(action, list)), separator)
    if (focused) list.querySelector('[data-overflow-item]').focus()
  }

  function update() {
    frame = 0
    changes.disconnect()
    for (const bar of host.querySelectorAll('[data-page-action-bar]')) {
      fit(bar)
      for (const element of [bar, ...bar.querySelectorAll(':scope > :not(.menus-mount), :scope > .menus-mount > *')]) {
        if (observed.has(element)) continue
        observed.add(element)
        sizes.observe(element)
      }
    }
    watch()
  }

  watch()
  schedule()
}
