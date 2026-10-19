/** Owns shell state and its DOM bindings. */
export function createShell({
  setupAppSwitcher,
  renderSide,
  bootRenderFlags,
  goToForYou,
  applySideCollapsedState,
  toggleSideCollapse,
  getLaunchpadEnabled,
} = {}) {
  const T = id => document.getElementById(id).content.cloneNode(true)

  document.querySelectorAll('.design.active').forEach(d => {
    const frame = document.createElement('div')
    frame.className = 'frame relative flex h-[790px] flex-col border-b border-line bg-surface'
    frame.append(T('t-top'))
    const body = document.createElement('div')
    body.className = 'fbody relative flex min-h-0 flex-1'
    const side = document.createElement('nav')
    side.className =
      'side relative flex min-h-0 w-[var(--sidebar-w)] shrink-0 flex-col border-e border-line bg-surface'
    side.setAttribute('aria-label', 'Primary navigation')
    const handle = document.createElement('button')
    handle.type = 'button'
    handle.className =
      'side-handle absolute inset-y-0 -end-1 z-[57] h-full w-[9px] cursor-ew-resize border-0 bg-transparent p-0'
    handle.setAttribute('aria-label', 'Collapse sidebar')
    handle.addEventListener('click', toggleSideCollapse)
    side.appendChild(handle)
    const content = document.createElement('main')
    content.className = 'content flex min-h-0 min-w-0 flex-1 flex-col'
    content.id = 'app-main'
    content.tabIndex = -1
    const pageContent = document.createElement('div')
    pageContent.className = 'page-content flex min-h-0 flex-1 flex-col px-4'
    pageContent.append(d.querySelector('.body-tpl').content.cloneNode(true))
    pageContent.append(d.querySelector('.email-tpl').content.cloneNode(true))
    pageContent.append(d.querySelector('.list-tpl').content.cloneNode(true))
    pageContent.append(d.querySelector('.customer-list-tpl').content.cloneNode(true))
    pageContent.append(d.querySelector('.customer-record-tpl').content.cloneNode(true))
    pageContent.append(d.querySelector('.geo-list-tpl').content.cloneNode(true))
    pageContent.append(d.querySelector('.geo-record-tpl').content.cloneNode(true))
    pageContent.append(d.querySelector('.profile-tpl').content.cloneNode(true))
    pageContent.append(d.querySelector('.organization-tpl').content.cloneNode(true))
    pageContent.append(d.querySelector('.foryou-tpl').content.cloneNode(true))
    /* The collaboration screens' templates are included from shell.html,
       outside the invoice-owned .design section, so they resolve from the
       document rather than from `d`. */
    ;['.notes-tpl', '.activities-tpl', '.events-tpl', '.people-tpl'].forEach(selector =>
      pageContent.append(document.querySelector(selector).content.cloneNode(true))
    )
    pageContent.append(d.querySelector('.signin-tpl').content.cloneNode(true))
    const pageActionBar = document.createElement('div')
    pageActionBar.className = 'page-action-bar'
    pageContent.querySelectorAll(':scope > .arow').forEach(actionBar => {
      actionBar.dataset.pageActionBar = 'record'
      pageActionBar.append(actionBar)
    })
    const pageFooter = document.createElement('div')
    pageFooter.className = 'page-footer'
    /* Each view's `.fnav` moves into the shared footer slot, keyed by the
       content view name content.js shows it for. */
    const footerViews = [
      ['.list-view', 'list'],
      ['.customer-list-view', 'customers-list'],
      ['.customer-record-view', 'customer-record'],
      ['.geo-list-view', 'geo-list'],
      ['.geo-record-view', 'geo-record'],
      ['.people-view', 'people'],
      ['.people-record-view', 'people-record'],
    ]
    pageContent.querySelectorAll('.fnav').forEach(footer => {
      footer.dataset.pageFooter = footerViews.find(([selector]) => footer.closest(selector))?.[1] ?? 'record'
      footer.hidden = footer.dataset.pageFooter !== 'record'
      pageFooter.append(footer)
    })
    content.append(pageActionBar, pageContent, pageFooter)
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
    d.querySelectorAll('.side-toggle').forEach(b => b.addEventListener('click', toggleSideCollapse))
    d.querySelectorAll('.gtop .app').forEach(b => b.addEventListener('click', goToForYou))
    renderSide(side, bootRenderFlags)
    d.querySelectorAll('.app-switcher-list').forEach(setupAppSwitcher)
    d.querySelectorAll('.app-switcher-menu').forEach(menu => {
      menu.hidden = !getLaunchpadEnabled()
    })
    applySideCollapsedState()
  })

  return {}
}
