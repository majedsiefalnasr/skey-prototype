

/** Owns locale controls state and its DOM bindings. */
export function createLocaleControls({t, formatLocaleCurrency, getLocale, setLocale, getCurrentContentViewName, stopSearchTyping, startSearchTyping, getLaunchpadUserName, applyState, renderGeoRecord, getDataListState, renderDataList, getCustomers} = {}) {
  let appLocale = getLocale()

  function applyDataI18n() {
    document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = t(node.dataset.i18n)
    })
  }

  function applyLocale(locale) {
    appLocale = locale
    setLocale(locale)
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale === 'ar' ? 'ar' : 'en'
    /* re-render whichever view is currently on screen so its dynamic text
       (breadcrumb tail, KPI cards, record position, toolbar) picks up the
       new language too — data-i18n only covers static markup, and a list
       view rendered here for the first time only just gained its
       data-i18n nodes, so the walk below must run after this, not before */
    if (getCurrentContentViewName() === 'record') applyState()
    else if (getCurrentContentViewName() === 'customer-record') getCustomers().recordPage.activate()
    else if (getCurrentContentViewName() === 'geo-record') renderGeoRecord()
    else if (getCurrentContentViewName() === 'list' && getDataListState().invoice.canvas)
      renderDataList('invoice')
    else if (getCurrentContentViewName() === 'customers-list' && getDataListState().customer.canvas)
      renderDataList('customer')
    else if (getCurrentContentViewName() === 'geo-list' && getDataListState().geo.canvas)
      renderDataList('geo')
    applyDataI18n()
    const topbarSearch = document.querySelector('.gtop .sbox')
    const topbarSearchLabel = topbarSearch?.querySelector('.shell-search-label')
    if (topbarSearchLabel) {
      stopSearchTyping(topbarSearchLabel.closest('.gtop'))
      startSearchTyping(topbarSearchLabel)
      topbarSearch.setAttribute('aria-label', t('Search or run an action'))
    }
    const netAmount = document.getElementById('invoice-summary-net')
    if (netAmount) {
      const amount = parseFloat(netAmount.textContent) || 0
      netAmount.textContent = formatLocaleCurrency(amount)
    }
    /* re-invoking showLaunchpad() here would move the shared topbar action
       cluster out of its live location a second time and lose it — relabel
       the already-built launchpad DOM in place instead */
    const activeLaunchpad = document.querySelector('.lp-view:not([hidden])')
    if (activeLaunchpad) {
      const launchpadMode = activeLaunchpad.dataset.mode || 'home'
      const heading = activeLaunchpad.querySelector('.lp-title')
      const subtitle = activeLaunchpad.querySelector('.lp-subtitle')
      if (launchpadMode === 'switcher') {
        heading.textContent = t('Switch app')
        subtitle.textContent = t('Choose another app or return to your current screen.')
      } else {
        const userName = getLaunchpadUserName()
        heading.replaceChildren()
        if (userName) {
          heading.append(`${t('Good to see you,')} `)
          const name = document.createElement('bdi')
          name.className = 'lp-user-name'
          name.textContent = userName
          name.setAttribute('data-text', userName)
          heading.append(name, '.')
        } else {
          heading.textContent = t('Welcome back.')
        }
        subtitle.textContent = t('Resume recent work or open another Skey app.')
      }

      activeLaunchpad.querySelectorAll('.lp-quick-lbl').forEach(node => {
        if (!node.dataset.i18nOriginal) node.dataset.i18nOriginal = node.textContent
        node.textContent = t(node.dataset.i18nOriginal)
      })
      activeLaunchpad.querySelectorAll('.lp-tag span').forEach(node => {
        if (!node.dataset.i18nOriginal) node.dataset.i18nOriginal = node.textContent
        node.textContent = t(node.dataset.i18nOriginal)
      })
      const search = activeLaunchpad.querySelector('.lp-search')
      const searchLabel = search?.querySelector('.lp-search-label')
      if (searchLabel) {
        stopSearchTyping(activeLaunchpad)
        startSearchTyping(searchLabel)
      }
      if (search) search.setAttribute('aria-label', t('Search apps and screens'))
      activeLaunchpad.querySelectorAll('.lp-view-all').forEach(button => {
        button.textContent = t(
          button.getAttribute('aria-expanded') === 'true' ? 'Show less' : 'View all'
        )
      })
      const currentLabel = activeLaunchpad.querySelector('.lp-current:not([hidden])')
      if (currentLabel) currentLabel.textContent = t('Current app')
      const close = activeLaunchpad.querySelector('.lp-close')
      if (close) {
        close.setAttribute('aria-label', t('Back to current screen'))
        const tip = close.querySelector('.tip')
        if (tip) tip.textContent = t('Back to current screen')
      }
      activeLaunchpad.querySelectorAll('.lp-tile').forEach(tile => {
        const label = tile.querySelector('.lp-tile-lbl')
        const description = tile.querySelector('.lp-tile-desc')
        if (label) label.textContent = t(label.dataset.i18nOriginal || '')
        if (description) description.textContent = t(description.dataset.i18nOriginal || '')
      })
      const appsTitle = activeLaunchpad.querySelector('#launchpad-apps-title')
      if (appsTitle) appsTitle.textContent = t('Apps')
    }
    /* relabel the persistent sidebar rail in place — its buttons key off the
       English label internally (data-label, activateByLabel lookups), so
       only the visible text is retranslated, not the whole nav rebuilt */
    document.querySelectorAll('.nc1-item').forEach(btn => {
      const lbl = btn.querySelector('.nc1-lbl')
      if (lbl && btn.dataset.label) lbl.textContent = t(btn.dataset.label)
    })
    document.querySelectorAll('.nc2-icn[aria-label]').forEach(btn => {
      const original = btn.dataset.i18nOriginal || btn.getAttribute('aria-label')
      btn.dataset.i18nOriginal = original
      btn.setAttribute('aria-label', t(original))
      const lbl = btn.querySelector('.nc2-lbl')
      if (lbl) lbl.textContent = t(original)
    })
    document.querySelectorAll('.nc-fav[data-label]').forEach(btn => {
      const lbl = btn.querySelector('span')
      if (lbl) lbl.textContent = t(btn.dataset.label)
    })
  }

  document.getElementById('rtl').addEventListener('change', e => {
    applyLocale(e.target.checked ? 'ar' : 'en')
  })

  return {getAppLocale: () => appLocale, applyDataI18n}
}
