

/** Owns topbar state and its DOM bindings. */
export function createTopbar({toast, getSideCollapsed, getLaunchpadEnabled, closeAllMenus, openKbd, openAppearance, openCustomize} = {}) {
  const ACTIVE_FISCAL_YEAR = '2026'

  function syncTopbarBrand() {
    /* not scoped to .gtop — the launchpad moves this same button into
       .lp-actions-left while it's open (see showLaunchpad), and it still
       needs the year badge/label filled in there too */
    document.querySelectorAll('.gtop .app, .lp-actions-left .app').forEach(el => {
      el.innerHTML =
        '<svg width="16" height="16" aria-hidden="true"><use href="#i-home"/></svg><span class="app-name"></span><span class="badge gray year-badge"></span><span class="tip"></span>'
      el.querySelector('.app-name').textContent = 'lastchance'
      el.querySelector('.year-badge').textContent = ACTIVE_FISCAL_YEAR
      el.querySelector('.tip').textContent = 'lastchance'
      el.setAttribute('aria-label', `lastchance, fiscal year ${ACTIVE_FISCAL_YEAR}`)
    })
  }

  function goToForYou() {}

  function syncTopbarChrome() {
    document.querySelectorAll('.app-switcher-menu').forEach(m => {
      m.hidden = !getLaunchpadEnabled()
      m.style.order = '1'
    })
    document.querySelectorAll('.gtop .app').forEach(a => {
      a.style.order = '2'
    })
    document.querySelectorAll('.side-toggle').forEach(b => {
      b.style.order = getSideCollapsed() ? '-1' : '3'
      b.classList.toggle('rail-aligned', getSideCollapsed())
      b.setAttribute('aria-pressed', String(getSideCollapsed()))
      b.setAttribute('aria-label', getSideCollapsed() ? 'Expand sidebar' : 'Collapse sidebar')
      b.querySelector('.tip').textContent = getSideCollapsed()
        ? 'Expand sidebar'
        : 'Collapse sidebar'
    })
    syncTopbarBrand()
  }

  document.querySelectorAll('.panel-toggle').forEach(t =>
    t.addEventListener('click', () => {
      const d = t.closest('.design')
      const c = d.classList.toggle('collapsed')
      t.setAttribute('aria-expanded', String(!c))
      t.setAttribute('aria-label', c ? 'Show context panel' : 'Hide context panel')
    })
  )

  function bind() {
  document.querySelectorAll('.help-kbd').forEach(b =>
    b.addEventListener('click', () => {
      closeAllMenus()
      openKbd()
    })
  )

  document.querySelectorAll('.side-customize-menu').forEach(b =>
    b.addEventListener('click', () => {
      closeAllMenus()
      openCustomize()
    })
  )

  document.querySelectorAll('.appearance-menu').forEach(b =>
    b.addEventListener('click', () => {
      closeAllMenus()
      openAppearance()
    })
  )

  document.querySelectorAll('.fav-toggle-menu').forEach(b =>
    b.addEventListener('click', () => {
      closeAllMenus()
      document.querySelector('.fav-toggle')?.click()
    })
  )

  document.querySelectorAll('.mlist').forEach(list =>
    list.addEventListener('click', e => {
      if (
        e.target.closest('button[role="menuitem"]') &&
        !e.target.closest('.help-kbd, .side-customize-menu, .fav-toggle-menu, .appearance-menu')
      )
        closeAllMenus()
    })
  )

  document.querySelectorAll('.fav-toggle').forEach(btn => {
    btn.onclick = () => {
      const on = btn.getAttribute('aria-pressed') !== 'true'
      btn.setAttribute('aria-pressed', String(on))
      btn.setAttribute('aria-label', on ? 'Remove from Favorites' : 'Add to Favorites')
      btn.querySelector('.tip').textContent = on
        ? 'Remove from Favorites'
        : 'Add to Favorites'
      toast({tone: 'ok', title: on ? 'Added to Favorites' : 'Removed from Favorites'})
    }
  })
  }

  return {goToForYou, syncTopbarChrome, bind}
}
