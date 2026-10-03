

/** Owns topbar state and its DOM bindings. */
export function createTopbar({toast, t, getSideCollapsed, getLaunchpadEnabled, closeAllMenus, openKbd, openCustomize, navigateToProfileSection, navigateToOrganizationSection} = {}) {
  const ACTIVE_FISCAL_YEAR = '2026'
  let activeRole = 'administrator'

  function setRole(role) {
    activeRole = ['administrator', 'manager', 'user'].includes(role) ? role : 'administrator'
    const label = activeRole === 'administrator' ? t('Administrator') : activeRole === 'manager' ? t('Manager') : t('User')
    document.querySelectorAll('[data-active-role-label]').forEach(element => { element.textContent = label })
    document.querySelectorAll('[data-organization-menu-group]').forEach(group => {
      group.hidden = activeRole === 'user'
    })
    document.querySelectorAll('.organization-menu').forEach(button => {
      const roles = (button.dataset.organizationRoles || '').split(' ')
      button.hidden = !roles.includes(activeRole)
    })
  }

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
      b.setAttribute('aria-label', getSideCollapsed() ? t('Expand sidebar') : t('Collapse sidebar'))
      b.querySelector('.tip').textContent = getSideCollapsed()
        ? t('Expand sidebar')
        : t('Collapse sidebar')
    })
    syncTopbarBrand()
  }

  document.querySelectorAll('.panel-toggle').forEach(btn =>
    btn.addEventListener('click', () => {
      const d = btn.closest('.design')
      const c = d.classList.toggle('collapsed')
      btn.setAttribute('aria-expanded', String(!c))
      btn.setAttribute('aria-label', c ? t('Show context panel') : t('Hide context panel'))
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

  document.querySelectorAll('.profile-menu').forEach(b =>
    b.addEventListener('click', () => {
      closeAllMenus()
      navigateToProfileSection(b.dataset.profileSection)
    })
  )

  document.querySelectorAll('.organization-menu').forEach(b =>
    b.addEventListener('click', () => {
      closeAllMenus()
      navigateToOrganizationSection(b.dataset.organizationSection)
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
        !e.target.closest('.help-kbd, .side-customize-menu, .fav-toggle-menu, .profile-menu, .organization-menu')
      )
        closeAllMenus()
    })
  )

  document.querySelectorAll('.fav-toggle').forEach(btn => {
    btn.onclick = () => {
      const on = btn.getAttribute('aria-pressed') !== 'true'
      btn.setAttribute('aria-pressed', String(on))
      btn.setAttribute('aria-label', on ? t('Remove from Favorites') : t('Add to Favorites'))
      btn.querySelector('.tip').textContent = on
        ? t('Remove from Favorites')
        : t('Add to Favorites')
      toast({tone: 'ok', title: on ? t('Added to Favorites') : t('Removed from Favorites')})
    }
  })
  }

  setRole(activeRole)
  /* Re-applies every locale-dependent label this module owns (role chip,
     sidebar tips, favorites) after the language changes — main.js
     subscribes it to the locale facility so the topbar chrome follows
     applyLocale() without this module knowing about locale state. */
  function retranslate() {
    setRole(activeRole)
    syncTopbarChrome()
  }
  return {goToForYou, syncTopbarChrome, bind, setRole, retranslate}
}
