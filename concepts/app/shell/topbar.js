

import {CURRENT_USER} from '../prototype/fixtures/profile.js'
import {NAV_FAVORITES} from '../prototype/fixtures/navigation.js'

/** Owns topbar state and its DOM bindings. */
export function createTopbar({toast, t, getSideCollapsed, getLaunchpadEnabled, closeAllMenus, openKbd, openCustomize, navigateToProfileSection, navigateToOrganizationSection, getCurrentNavLabel, renderSide, trapFocus, releaseFocus} = {}) {
  const ACTIVE_FISCAL_YEAR = '2026'
  let activeRole = 'administrator'
  /* Workspace branch the card/switcher show — session-only prototype state,
     seeded from the branch the markup ships checked. */
  let activeBranch =
    document.querySelector('.branch-submenu [data-branch][aria-checked="true"]')?.dataset.branch || 'Cairo HQ'

  const initialsOf = name =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase()

  /* Stamps the live user card + avatar from CURRENT_USER the way
     syncTopbarBrand stamps the app chip — no hardcoded identity left in
     the markup's hands. */
  function syncUserPop() {
    document.querySelectorAll('[data-user-name]').forEach(el => {
      el.textContent = CURRENT_USER.name
    })
    document.querySelectorAll('[data-user-email]').forEach(el => {
      el.textContent = CURRENT_USER.email
    })
    document.querySelectorAll('[data-user-tenant]').forEach(el => {
      el.textContent = CURRENT_USER.branch
    })
    document.querySelectorAll('[data-user-initials]').forEach(el => {
      el.textContent = initialsOf(CURRENT_USER.name)
    })
    const avatarBtn = document.querySelector('.avatar-btn')
    if (avatarBtn) avatarBtn.setAttribute('aria-label', CURRENT_USER.name)
    syncBranchMenu()
  }

  function syncBranchMenu() {
    document.querySelectorAll('[data-user-branch]').forEach(el => {
      el.textContent = activeBranch
    })
    document.querySelectorAll('.branch-submenu [data-branch]').forEach(button => {
      const checked = button.dataset.branch === activeBranch
      button.setAttribute('aria-checked', String(checked))
      /* SVGElement has no `hidden` IDL property — the .hidden assignment
         would only set a JS expando and leave the attribute in place. */
      button.querySelector('.menu-check')?.toggleAttribute('hidden', !checked)
    })
  }

  /* The Favorites row reflects NAV_FAVORITES for the page you are on:
     disabled (with a reason as its title) when the view owns no nav label. */
  function syncFavoritesMenu() {
    const button = document.querySelector('.fav-toggle-menu')
    if (!button) return
    const label = getCurrentNavLabel?.() || null
    const key = label && NAV_FAVORITES.includes(label) ? 'Remove from Favorites' : 'Add this page to Favorites'
    button.disabled = !label
    button.title = label ? '' : t('Not available on this page')
    const text = button.querySelector('[data-i18n]')
    if (text) {
      text.dataset.i18n = key
      text.textContent = t(key)
    }
  }

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
      const label = getCurrentNavLabel?.()
      if (!label) return
      const index = NAV_FAVORITES.indexOf(label)
      const removing = index >= 0
      if (removing) NAV_FAVORITES.splice(index, 1)
      else NAV_FAVORITES.push(label)
      closeAllMenus()
      /* Rebuild the sidebar so the Starred rail group and panel read the
         updated NAV_FAVORITES; renderSide's own auto-nav re-highlights the
         current row exactly like Customize-sidebar's save path does. */
      document.querySelectorAll('.side').forEach(side => renderSide(side, {bootToLaunchpad: false}))
      syncFavoritesMenu()
      toast({tone: 'ok', title: removing ? t('Removed from Favorites') : t('Added to Favorites')})
    })
  )

  document.querySelectorAll('.branch-submenu [data-branch]').forEach(button =>
    button.addEventListener('click', () => {
      activeBranch = button.dataset.branch
      syncBranchMenu()
      toast({tone: 'ok', title: t('Workspace switched'), body: activeBranch})
    })
  )

  /* Re-stamp everything view/identity-dependent the moment the menu opens,
     and collapse its inner submenus when it closes (same reset the Language
     submenu gets from shell/locale.js). The launchpad overlay moves the
     avatar button itself in and out of the topbar, so key off the live
     node's aria-expanded rather than binding a fresh element. */
  const avatarBtn = document.querySelector('.avatar-btn')
  if (avatarBtn && 'MutationObserver' in window) {
    new MutationObserver(() => {
      const expanded = avatarBtn.getAttribute('aria-expanded') === 'true'
      if (expanded) {
        syncUserPop()
        syncFavoritesMenu()
      } else {
        document.querySelectorAll('.branch-submenu').forEach(details => {
          details.open = false
        })
      }
    }).observe(avatarBtn, {attributes: true, attributeFilter: ['aria-expanded']})
  }

  /* Log out confirms first — the row closes the menu and raises the shared
     dialog pattern (scrim + .dlg + focus trap); Cancel/backdrop dismiss,
     confirming signs the session out with a toast. */
  const loscrim = document.getElementById('loscrim')
  const openLogout = () => {
    closeAllMenus()
    if (!loscrim) return
    loscrim.classList.add('open')
    trapFocus?.(loscrim.querySelector('.dlg'))
  }
  const closeLogout = () => {
    if (!loscrim?.classList.contains('open')) return
    loscrim.classList.remove('open')
    releaseFocus?.()
  }
  document.querySelectorAll('.logout-menu').forEach(button =>
    button.addEventListener('click', openLogout)
  )
  loscrim?.addEventListener('click', event => {
    if (event.target === loscrim || event.target.closest('.c-close')) closeLogout()
  })
  document.getElementById('lo-confirm')?.addEventListener('click', () => {
    closeLogout()
    toast({tone: 'ok', title: t('Signed out'), body: t('You will be signed out of this session.')})
  })
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeLogout()
  })

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

  syncUserPop()
  syncFavoritesMenu()
  setRole(activeRole)
  /* Re-applies every locale-dependent label this module owns (role chip,
     sidebar tips, favorites) after the language changes — main.js
     subscribes it to the locale facility so the topbar chrome follows
     applyLocale() without this module knowing about locale state. */
  function retranslate() {
    setRole(activeRole)
    syncFavoritesMenu()
    syncTopbarChrome()
  }
  return {goToForYou, syncTopbarChrome, bind, setRole, retranslate}
}
