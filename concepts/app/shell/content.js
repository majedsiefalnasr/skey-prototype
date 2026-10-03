

/** Owns content host state and its DOM bindings. */
export function createContentHost({syncPrototypeControlsPage, queueSkeletonForCurrentView, applyDataI18n, renderCustomerList, renderGeoList, renderListA, closeAdvancedSearch} = {}) {
  let currentContentViewName = 'record'

  function currentSkeletonContainer() {
    const launchpad = document.querySelector('.lp-view:not([hidden])')
    if (launchpad) return launchpad
    const selectors = {
      record: '.page-content',
      email: '.email-view:not([hidden])',
      list: '.list-view:not([hidden])',
      'customers-list': '.customer-list-view:not([hidden])',
      'customer-record': '.customer-record-view:not([hidden])',
      'geo-list': '.geo-list-view:not([hidden])',
      'geo-record': '.geo-record-view:not([hidden])',
      profile: '.profile-view:not([hidden])',
      organization: '.organization-view:not([hidden])',
      dashboard: '.dashboard-view:not([hidden])',
    }
    const selector = selectors[currentContentViewName]
    return selector ? document.querySelector(selector) : null
  }

  const deferredContentViews = new Map()

  const initializedContentViews = new Set()

  let contentViewDeferralReady = false

  let ensureContentViewRendered = () => {}

  function attachAndShowView(name) {
    /* adv-search-scrim is a sibling outside .content, so switching which
     .page-content child is visible doesn't touch it — close it here so it never
     strands open across an unrelated navigation (e.g. breadcrumb back to the
     list) */
    const advScrim = document.getElementById('adv-search-scrim')
    if (advScrim && advScrim.classList.contains('open')) closeAdvancedSearch()

    const content = document.querySelector('.page-content')
    const viewSelectors = {
      email: '.email-view',
      list: '.list-view',
      'customers-list': '.customer-list-view',
      'customer-record': '.customer-record-view',
      'geo-list': '.geo-list-view',
      'geo-record': '.geo-record-view',
      profile: '.profile-view',
      organization: '.organization-view',
      dashboard: '.dashboard-view',
    }
    const namedViews = Object.fromEntries(
      Object.entries(viewSelectors).map(([key, selector]) => {
        const view = content.querySelector(selector) || deferredContentViews.get(key)
        if (view) deferredContentViews.set(key, view)
        return [key, view]
      })
    )
    const targetView = namedViews[name]
    if (contentViewDeferralReady && targetView && !targetView.isConnected)
      content.appendChild(targetView)
    ensureContentViewRendered(name)
    const wrappedViews = Object.values(namedViews)
    wrappedViews.forEach(view => {
      if (!view) return
      view.hidden = view !== targetView
      if (contentViewDeferralReady && view !== targetView) view.remove()
    })
    ;[...content.children].forEach(el => {
      if (wrappedViews.includes(el)) return
      el.hidden = name !== 'record'
    })
    document.querySelectorAll('.page-footer [data-page-footer]').forEach(footer => {
      footer.hidden = footer.dataset.pageFooter !== name
    })
    const pageActionBar = document.querySelector('.page-action-bar')
    const activeActionBars = [...document.querySelectorAll('.page-action-bar [data-page-action-bar]')]
    activeActionBars.forEach(actionBar => {
      actionBar.hidden = actionBar.dataset.pageActionBar !== name
    })
    if (pageActionBar) pageActionBar.hidden = !activeActionBars.some(actionBar => !actionBar.hidden)
  }

  function onNavigationChange(name) {
    currentContentViewName = name
    syncPrototypeControlsPage(name)
    queueSkeletonForCurrentView()
  }

  ensureContentViewRendered = name => {
    if (initializedContentViews.has(name)) return
    if (name === 'list') renderListA(document.getElementById('list-canvas'))
    else if (name === 'customers-list') renderCustomerList()
    else if (name === 'geo-list') renderGeoList()
    else return
    initializedContentViews.add(name)
    applyDataI18n()
  }

  return {getCurrentContentViewName: () => currentContentViewName, currentSkeletonContainer, getContentViewDeferralReady: () => contentViewDeferralReady, setContentViewDeferralReady: value => { contentViewDeferralReady = value }, attachAndShowView, onNavigationChange}
}
