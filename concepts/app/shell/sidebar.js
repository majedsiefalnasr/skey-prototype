import {encodeHtml} from '../core/locale.js'
import {NAV_TREE, NAV_FAVORITES, NAV_RECENTS, NAV_ICONS} from '../prototype/fixtures/navigation.js'

/** Owns sidebar state and its DOM bindings. */
export function createSidebar({t, getShowContentView, getLaunchpadEnabled, buildNavLaunchpad, restoreLaunchpadActions, stopSearchTyping, hideLaunchpad, showLaunchpad, syncTopbarChrome, closeEmailView, visibleDirtyDataListContext, guardDataListLeave, openForYou} = {}) {
  const visibleGroups = () => NAV_TREE

  const childrenOf = entry => (Array.isArray(entry) ? entry.slice(1) : [])

  const leavesOf = entry => {
    const kids = childrenOf(entry)
    if (!kids.length) return [Array.isArray(entry) ? entry[0] : entry]
    return kids.flatMap(leavesOf)
  }

  const findNavGroup = label => NAV_TREE.find(group => leavesOf(group).includes(label))

  let forYouGroups = [
    {
      name: 'Daily sales',
      items: [
        {label: 'Sales Invoice', appLabel: 'Sales Systems Management'},
        {label: 'Sales Order', appLabel: 'Sales Systems Management'},
        {label: 'Sales Return', appLabel: 'Sales Systems Management'},
        {label: 'Customers', appLabel: 'Customers'},
      ],
    },
    {
      name: 'Finance',
      items: [
        {label: 'Receipt Voucher', appLabel: 'Finance and Accounting'},
        {label: 'Payment Voucher', appLabel: 'Finance and Accounting'},
        {label: 'Journal Entry', appLabel: 'Finance and Accounting'},
        {label: 'Chart of Accounts', appLabel: 'Finance and Accounting'},
      ],
    },
    {
      name: 'Admin & reports',
      items: [
        {label: 'Key Performance Indicators', appLabel: 'Dashboard'},
        {label: 'Financial statistics', appLabel: 'Finance and Accounting'},
        {label: 'Vendors', appLabel: 'Vendors'},
      ],
    },
  ]

  let navCurrentLabel = 'Sales Invoice'

  let currentAppLabel = findNavGroup(navCurrentLabel)?.[0] || navCurrentLabel

  const applyNavState = label => {
    navCurrentLabel = label
    currentAppLabel = findNavGroup(label)?.[0] || label
  }

  const applyNavHighlight = (root, label) => {
    root.querySelectorAll('.current').forEach(el => el.classList.remove('current'))
    root.querySelectorAll('.on-path').forEach(el => el.classList.remove('on-path'))
    root.querySelectorAll('.nc1-item').forEach(el => {
      if (el.dataset.label !== label) return
      el.classList.add('current')
      let n = el.closest('.nc1-node')
      while (n) {
        n.classList.add('open', 'on-path')
        n = n.parentElement.closest('.nc1-node')
      }
    })
  }

  /** Highlight + label state only — no navigation. Used when history
   * restores drive navigation themselves (popstate), so the guard result
   * stays with navigate() while the rail highlight follows the route. */
  const applyNavCurrent = (root, label, {forYou = false} = {}) => {
    applyNavState(label)
    if (forYou) navCurrentLabel = 'For You'
    applyNavHighlight(root, forYou ? 'For You' : label)
  }

  const setNavCurrent = (root, label, {skipListLayoutGuard = false} = {}) => {
    const targetListContext =
      label === 'Sales Invoice' ? 'invoice' : label === 'Customers' ? 'customer' : ''
    if (
      !skipListLayoutGuard &&
      visibleDirtyDataListContext() !== targetListContext &&
      guardDataListLeave(() => setNavCurrent(root, label, {skipListLayoutGuard: true}))
    )
      return
    /* "For You" is the current app's landing row: resolve the owning app
       before nav state moves, and don't let the row itself become the
       current app (it is a screen of the app, not an app). Quick groups
       (Starred/Recent) own no app, so their row falls back to the
       default entry's app. */
    const forYouApp =
      label === 'For You'
        ? (visibleGroups().find(group => group[0] === currentAppLabel)?.[0] ?? 'Dashboard')
        : null
    if (forYouApp) navCurrentLabel = label
    else applyNavState(label)
    closeEmailView() /* any real navigation leaves the email view, same as it would leave any other page */
    const viewByNavLabel = {
      'Sales Invoice': 'list',
      Customers: 'customers-list',
      'Geographical Structure': 'geo-list',
    }
    if (forYouApp) getShowContentView()('foryou', {app: forYouApp})
    else getShowContentView()(viewByNavLabel[label] || 'record')
    const frame = root.closest('.frame')
    const lp = frame && frame.querySelector('.lp-view')
    if (lp && !lp.hidden) {
      /* Hide with the navigation target: the content view only swaps after
         the async navigation settles, so the URL must record where the
         click is going, not what it left. Route plans ({id, data}) carry
         app-scoped targets; plain strings keep the v1 view-name shape. */
      hideLaunchpad(frame, {
        targetRoute: forYouApp
          ? {id: 'foryou', data: {app: forYouApp}}
          : viewByNavLabel[label] || 'record',
      })
    }
    applyNavHighlight(root, label)
  }

  const clickedCollapseToggle = e =>
    e
      .composedPath()
      .some(
        el =>
          el instanceof Element &&
          (el.classList.contains('side-toggle') || el.classList.contains('side-handle'))
      )

  function ncBuildItem(entry, depth, root) {
    const isBranch = Array.isArray(entry)
    const label = isBranch ? entry[0] : entry
    const node = document.createElement('div')
    node.className = 'nc1-node'
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'nc1-item flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-start text-[13px] leading-[1.3] text-ink hover:bg-[var(--hover-overlay)]'
    btn.dataset.label = label
    btn.innerHTML =
      '<span class="nc1-lbl"></span>' +
      (isBranch
        ? '<svg class="nc1-chev shrink-0 text-faint transition-transform duration-[120ms]" width="12" height="12" aria-hidden="true"><use href="#i-caret"/></svg>'
        : '')
    btn.querySelector('.nc1-lbl').textContent = t(label)
    node.appendChild(btn)
    if (isBranch) {
      const sub = document.createElement('div')
      sub.className = 'nc1-sub ms-[17px] hidden border-s border-line ps-3.5'
      childrenOf(entry).forEach(child => sub.appendChild(ncBuildItem(child, depth + 1, root)))
      node.appendChild(sub)
      btn.setAttribute('aria-expanded', 'false')
      btn.addEventListener('click', () => {
        const open = node.classList.toggle('open')
        btn.setAttribute('aria-expanded', String(open))
      })
    } else {
      btn.addEventListener('click', () => setNavCurrent(root, label))
    }
    return node
  }

  function makeGroupPanel(root, {showFavs = true} = {}) {
    const panel = document.createElement('div')
    panel.className = 'nc3-panel ms-[var(--rail-w)] flex min-h-0 w-[264px] shrink-0 flex-col border-e border-line bg-surface'
    if (showFavs) {
      const favs = document.createElement('div')
      favs.className = 'nc3-favs shrink-0 border-b border-line pb-1 pt-0.5'
      const favLbl = document.createElement('div')
      favLbl.className = 'nc-group-lbl px-2.5 pb-1 pt-3.5 text-xs font-semibold uppercase tracking-[.04em] text-faint first:pt-1.5'
      favLbl.textContent = t('Favorites')
      favs.appendChild(favLbl)
      NAV_FAVORITES.forEach(f => {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'nc-fav mx-1.5 flex w-[calc(100%-12px)] items-center gap-[7px] rounded-[3px] px-2 py-[5px] text-start text-[12.5px] text-muted hover:bg-[var(--hover-overlay)]'
        b.dataset.label = f
        b.innerHTML =
          '<svg width="13" height="13" aria-hidden="true"><use href="#i-spark"/></svg><span></span>'
        b.querySelector('span').textContent = t(f)
        b.addEventListener('click', () => setNavCurrent(root, f))
        favs.appendChild(b)
      })
      panel.appendChild(favs)
    }
    const body = document.createElement('div')
    body.className = 'nc-scroll nc3-body min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1.5 pt-0.5 transition-opacity duration-[120ms] ease-out'
    panel.appendChild(body)
    const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
    /* the For You rail icon renders forYouGroups instead of a NAV_TREE branch —
       one flat, unlabeled-depth list of screens per user-made group, each group
       getting its own title row instead of the single app title an ordinary
       panel shows */
    const fillForYou = () => {
      body.innerHTML = ''
      const title = document.createElement('div')
      title.className = 'nc3-title px-2 pb-1 pt-2 text-[12.5px] font-bold text-ink'
      title.textContent = t('For You')
      body.appendChild(title)
      forYouGroups.forEach(g => {
        const lbl = document.createElement('div')
        lbl.className = 'nc-group-lbl px-2.5 pb-1 pt-3.5 text-xs font-semibold uppercase tracking-[.04em] text-faint first:pt-1.5'
        lbl.textContent = g.name
        body.appendChild(lbl)
        g.items.forEach(item => body.appendChild(ncBuildItem(item.label, 0, root)))
      })
    }
    const fill = (group, withForYou) => {
      if (group === 'for-you') {
        fillForYou()
      } else {
        body.innerHTML = ''
        const title = document.createElement('div')
        title.className = 'nc3-title px-2 pb-1 pt-2 text-[12.5px] font-bold text-ink'
        title.textContent = group[0]
        body.appendChild(title)
        if (withForYou) body.appendChild(ncBuildItem('For You', 0, root))
        childrenOf(group).forEach(entry => body.appendChild(ncBuildItem(entry, 0, root)))
      }
      applyNavHighlight(root, navCurrentLabel)
    }
    /* a plain innerHTML swap reads as a hard cut when you're clicking rail icons in
       quick succession — a short crossfade makes the panel feel like it's updating
       in place instead of flickering */
    const show = (group, {withForYou = false} = {}) => {
      if (reduceMotion() || !body.children.length) {
        fill(group, withForYou)
        return
      }
      body.classList.add('swap-out')
      setTimeout(() => {
        fill(group, withForYou)
        body.classList.remove('swap-out')
      }, 100)
    }
    return {el: panel, show}
  }

  function buildRailAndPanel(fbody, side) {
    const root = document.createElement('div')
    root.className = 'nc nc2 relative flex min-h-0 flex-1'
    const rail = document.createElement('div')
    rail.className = 'nc2-rail absolute inset-s-0 inset-y-0 z-[3] flex h-full w-[var(--rail-w)] shrink-0 flex-col gap-0.5 overflow-x-hidden overflow-y-auto border-e border-line bg-surface px-1.5 py-2 transition-[width] duration-[120ms] ease-out'
    const {el: panel, show} = makeGroupPanel(root, {
      showFavs: false,
    }) /* Starred now lives in the rail itself */

    /* every rail icon — Starred, Recent, and each app — feeds the same pinned
       panel the same way, so switching between them never changes behaviour.
       Any of them also leaves the launchpad, same as picking a page would.
       Returns false only when the collapsed-rail toggle closed the panel. */
    const activate = (btn, group, opts) => {
      const collapsed = side.classList.contains('collapsed')
      if (collapsed && btn.classList.contains('active') && !panel.hidden) {
        panel.hidden = true
        btn.classList.remove('active')
        return false
      }
      const frame = fbody.closest('.frame')
      const lp = frame.querySelector('.lp-view')
      if (lp && !lp.hidden) {
        hideLaunchpad(frame, {targetRoute: opts?.targetRoute ?? null})
      }
      rail.querySelectorAll('.active').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      show(group, opts)
      panel.hidden = false
      return true
    }
    const railIcon = (label, icon, group, opts) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'nc2-icn relative inline-flex h-9 w-full min-w-[calc(var(--rail-w)-12px)] shrink-0 items-center gap-2.5 rounded-md ps-[11px] text-muted hover:bg-[var(--hover-overlay)]'
      btn.setAttribute('aria-label', t(label))
      btn.innerHTML = `<svg class="shrink-0" width="18" height="18" aria-hidden="true"><use href="#${icon}"/></svg><span class="nc2-lbl overflow-hidden whitespace-nowrap text-[13px] opacity-0">${encodeHtml(t(label))}</span>`
      /* a mouse click leaves focus sitting on the button, which keeps
         ":focus-within" (and so the hover-expanded rail) engaged until an
         unrelated outside click knocks it loose — blur right away so the rail
         collapses as soon as the pointer actually leaves it. event.detail is 0
         for a keyboard-triggered click, so keyboard users keep their focus ring
         (and the rail stays open for them to keep navigating). */
      btn.addEventListener('click', e => {
        const opened = activate(btn, group, {
          ...opts,
          ...(opts?.withForYou ? {targetRoute: {id: 'foryou', data: {app: label}}} : {}),
        })
        if (opened && opts?.withForYou) openForYou(label)
        if (e.detail > 0) btn.blur()
      })
      return btn
    }

    /* the For You icon only earns its place once the user has actually built a
       group — an empty pin at the top of every rail, forever, isn't worth it */
    if (forYouGroups.length) {
      const forYouSep = document.createElement('div')
      forYouSep.className = 'nc2-rail-sep ms-[9px] my-1 h-px w-6 bg-line'
      rail.append(railIcon('For You', 'i-user', 'for-you'), forYouSep)
    }

    const railSep = document.createElement('div')
    railSep.className = 'nc2-rail-sep ms-[9px] my-1 h-px w-6 bg-line'
    const starredGroup = ['Starred', ...NAV_FAVORITES]
    const recentGroup = ['Recent', ...NAV_RECENTS]
    const starredBtn = railIcon('Starred', 'i-spark', starredGroup)
    const recentBtn = railIcon('Recent', 'i-clock', recentGroup)
    rail.append(starredBtn, recentBtn, railSep)

    const groups = visibleGroups()
    /* Starred/Recent aren't NAV_TREE groups, so they're seeded here instead of
       in the groups.forEach loop below -- activateByLabel (used by the
       launchpad's quick-row "More" button) needs both maps to resolve them. */
    const iconByLabel = new Map([['Starred', starredBtn], ['Recent', recentBtn]])
    const quickGroupByLabel = new Map([['Starred', starredGroup], ['Recent', recentGroup]])
    groups.forEach(group => {
      const label = group[0]
      const btn = railIcon(label, NAV_ICONS[label] || 'i-doc', group, {withForYou: true})
      iconByLabel.set(label, btn)
      rail.appendChild(btn)
    })
    document.addEventListener('click', e => {
      if (
        side.classList.contains('collapsed') &&
        !panel.hidden &&
        !clickedCollapseToggle(e)
      ) {
        const p = e.composedPath()
        if (!p.includes(root)) {
          panel.hidden = true
          rail.querySelectorAll('.active').forEach(b => b.classList.remove('active'))
        }
      }
    })
    /* roving focus: with 18+ icons and no text labels, Tabbing through every one
       to reach the bottom of the rail is slow — arrow keys move focus directly */
    rail.addEventListener('keydown', e => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
      const icons = [...rail.querySelectorAll('.nc2-icn')]
      const i = icons.indexOf(document.activeElement)
      if (i === -1) return
      e.preventDefault()
      const next =
        e.key === 'ArrowDown'
          ? icons[(i + 1) % icons.length]
          : e.key === 'ArrowUp'
            ? icons[(i - 1 + icons.length) % icons.length]
            : e.key === 'Home'
              ? icons[0]
              : icons[icons.length - 1]
      next.focus()
    })
    root.append(rail, panel)
    /* selects an app's rail icon + opens its panel from outside the rail itself —
       used by the topbar app-switcher, the launchpad tiles, and boot */
    root.activateByLabel = (label, {targetRoute = null} = {}) => {
      currentAppLabel = label
      const btn = iconByLabel.get(label)
      if (btn) {
        side.classList.toggle('collapsed', compactShell.matches)
        updateSideWidth(side)
        activate(
          btn,
          groups.find(g => g[0] === label) || quickGroupByLabel.get(label),
          {withForYou: true, targetRoute}
        )
        if (compactShell.matches) panel.hidden = true
      }
    }
    return root
  }

  const compactShell = matchMedia('(max-width: 900px)')

  let sideCollapsed = compactShell.matches

  function updateSideWidth(side) {
    side.classList.toggle('wide', !sideCollapsed)
  }

  function renderSide(side, {bootToLaunchpad = true, skipAutoNav = false} = {}) {
    const fbody = side.parentElement
    const frame = fbody.closest('.frame')
    const wasShowingLaunchpad = !!frame.querySelector('.lp-view:not([hidden])')
    const nav = side.querySelector('.nc')
    if (nav) nav.remove()
    const lp = frame.querySelector('.lp-view')
    if (lp) {
      stopSearchTyping(lp)
      restoreLaunchpadActions(frame)
      lp.remove()
    }
    side.classList.remove('collapsed')
    const built = buildNavLaunchpad(fbody)
    side.prepend(built)
    if (getLaunchpadEnabled() && (bootToLaunchpad || wasShowingLaunchpad)) {
      showLaunchpad(fbody, {mode: 'home'})
    } else if (!skipAutoNav) {
      queueMicrotask(() => setNavCurrent(side, navCurrentLabel))
    }
    if (sideCollapsed) side.classList.add('collapsed')
    updateSideWidth(side)
  }

  function applySideCollapsedState() {
    document.querySelectorAll('.side').forEach(side => {
      side.classList.toggle('collapsed', sideCollapsed)
      updateSideWidth(side)
      /* the panel is pinned open whenever the sidebar is expanded, and is
         an on-demand flyout once collapsed — collapsing should close it right
         away instead of leaving it floating until a separate outside click */
      const panel = side.querySelector('.nc3-panel')
      if (panel) panel.hidden = sideCollapsed
      const handle = side.querySelector('.side-handle')
      if (handle)
        handle.setAttribute(
          'aria-label',
          sideCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
        )
    })
    syncTopbarChrome()
  }

  function toggleSideCollapse() {
    sideCollapsed = !sideCollapsed
    applySideCollapsedState()
  }

  compactShell.addEventListener('change', event => {
    sideCollapsed = event.matches
    applySideCollapsedState()
  })

  return {visibleGroups, childrenOf, leavesOf, findNavGroup, getForYouGroups: () => forYouGroups, setForYouGroups: value => { forYouGroups = value }, getCurrentAppLabel: () => currentAppLabel, setNavCurrent, applyNavCurrent, buildRailAndPanel, getSideCollapsed: () => sideCollapsed, renderSide, applySideCollapsedState, toggleSideCollapse}
}
