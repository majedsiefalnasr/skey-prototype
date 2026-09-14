

/** Owns shell state and its DOM bindings. */
export function createShell({setupAppSwitcher, renderSide, goToForYou, applySideCollapsedState, toggleSideCollapse} = {}) {
  const T = id => document.getElementById(id).content.cloneNode(true)

  document.querySelectorAll('.design.active').forEach(d => {
    const frame = document.createElement('div')
    frame.className = 'frame relative flex h-[790px] flex-col border-b border-line bg-surface'
    frame.append(T('t-top'))
    const body = document.createElement('div')
    body.className = 'fbody relative flex min-h-0 flex-1'
    const side = document.createElement('nav')
    side.className = 'side relative flex min-h-0 w-[var(--sidebar-w)] shrink-0 flex-col border-e border-line bg-surface'
    side.setAttribute('aria-label', 'Primary navigation')
    const handle = document.createElement('button')
    handle.type = 'button'
    handle.className = 'side-handle absolute inset-y-0 -end-1 z-[57] h-full w-[9px] cursor-ew-resize border-0 bg-transparent p-0'
    handle.setAttribute('aria-label', 'Collapse sidebar')
    handle.addEventListener('click', toggleSideCollapse)
    side.appendChild(handle)
    const content = document.createElement('main')
    content.className = 'content flex min-h-0 min-w-0 flex-1 flex-col'
    content.id = 'app-main'
    content.tabIndex = -1
    content.append(d.querySelector('.body-tpl').content.cloneNode(true))
    content.append(d.querySelector('.email-tpl').content.cloneNode(true))
    content.append(d.querySelector('.list-tpl').content.cloneNode(true))
    content.append(d.querySelector('.customer-list-tpl').content.cloneNode(true))
    content.append(d.querySelector('.customer-record-tpl').content.cloneNode(true))
    content.append(d.querySelector('.geo-list-tpl').content.cloneNode(true))
    content.append(d.querySelector('.geo-record-tpl').content.cloneNode(true))
    body.append(side, content)
    frame.append(body)
    d.querySelector('.mount').append(frame)
    d.querySelectorAll('.pager-mount').forEach(m => m.append(T('t-pager')))
    d.querySelectorAll('.customer-record-pager-mount').forEach(m => m.append(T('t-pager')))
    d.querySelectorAll('.geo-record-pager-mount').forEach(m => m.append(T('t-pager')))
    d.querySelectorAll('.pill-mount').forEach(m => m.append(T('t-pill')))
    d.querySelectorAll('.menus-mount').forEach(m => m.append(T('t-menus')))
    d.querySelectorAll('.ctx-mount').forEach(m => m.append(T('t-ctx')))
    d.querySelectorAll('.crumbs .sep').forEach(separator => {
      separator.setAttribute('aria-hidden', 'true')
    })
    d.querySelectorAll('.side-toggle').forEach(b =>
      b.addEventListener('click', toggleSideCollapse)
    )
    d.querySelectorAll('.gtop .app').forEach(b => b.addEventListener('click', goToForYou))
    renderSide(side)
    d.querySelectorAll('.app-switcher-list').forEach(setupAppSwitcher)
    applySideCollapsedState()
  })

  return {}
}
