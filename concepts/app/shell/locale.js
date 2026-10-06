

import {LANGUAGES, isFunctionalLanguage, LANGUAGE_STORAGE_KEY} from '../core/locale.js'

/** Owns locale controls state and its DOM bindings. */
export function createLocaleControls({t, formatLocaleCurrency, getLocale, setLocale, getCurrentContentViewName, stopSearchTyping, startSearchTyping, getLaunchpadUserName, applyState, renderGeoRecord, getDataListState, renderDataList, getCustomers} = {}) {
  let appLocale = getLocale()
  /* What the language selector displays. Tracks appLocale for the
     functional locales (EN/AR) but can also hold a demo-only catalog code
     (FR/DE/ES/PT/JA) that never reaches applyLocale() — see selectLanguage */
  let selectedLanguage = getLocale()

  function applyDataI18n() {
    document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = t(node.dataset.i18n)
    })
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
      node.placeholder = t(node.dataset.i18nPlaceholder)
    })
    document.querySelectorAll('[data-i18n-aria-label]').forEach(node => {
      node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel))
    })
  }

  /* Reflects selectedLanguage onto every selector surface: the avatar
     menu's Language submenu (trailing endonym in the summary + the checked
     radio in the popover), the sign-in view's footer language submenu
     (si-prefixed mirror so the avatar specs' strict selectors keep
     matching exactly one surface), and the Profile → Account settings
     Language select. Safe to call before any of that DOM exists — each
     query just no-ops on an empty document. */
  function syncLanguageControls() {
    const current = LANGUAGES.find(language => language.code === selectedLanguage) || LANGUAGES[0]
    document.querySelectorAll('[data-language-current]').forEach(node => {
      node.textContent = current.name
    })
    document.querySelectorAll('.language-submenu [data-language]').forEach(label => {
      const input = label.querySelector('input[type="radio"]')
      if (input) input.checked = label.dataset.language === current.code
    })
    document.querySelectorAll('[data-si-language-current]').forEach(node => {
      node.textContent = current.name
    })
    document.querySelectorAll('.si-language [data-si-language]').forEach(label => {
      const input = label.querySelector('input[type="radio"]')
      if (input) input.checked = label.dataset.siLanguage === current.code
    })
    const select = document.getElementById('profile-language')
    if (select) select.value = current.code
    /* Keep the #rtl harness checkbox mirroring the APPLICATION locale (not
       the selector's demo display), so prototype-controls' session replay
       of `rtl` can't drift from the language actually in effect. Setting
       .checked programmatically fires no change event, so this never
       re-enters applyLocale(). */
    const rtlToggle = document.getElementById('rtl')
    if (rtlToggle) rtlToggle.checked = appLocale === 'ar'
  }

  /* The one entry point behind both selector surfaces. Functional codes
     switch the application locale (persisted for reload); demo-only codes
     update the selector display alone — no language, direction, content,
     or storage change. */
  function selectLanguage(code) {
    if (!LANGUAGES.some(language => language.code === code)) return
    if (isFunctionalLanguage(code)) {
      applyLocale(code)
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
      } catch {}
    } else {
      selectedLanguage = code
      syncLanguageControls()
    }
  }

  function applyLocale(locale) {
    appLocale = locale
    selectedLanguage = locale
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

      activeLaunchpad.querySelectorAll('.lp-quick-tab-lbl').forEach(node => {
        if (!node.dataset.i18nOriginal) node.dataset.i18nOriginal = node.textContent
        node.textContent = t(node.dataset.i18nOriginal)
      })
      activeLaunchpad.querySelectorAll('.lp-tag-lbl').forEach(node => {
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
      activeLaunchpad.querySelectorAll('.lp-quick-more').forEach(button => {
        button.textContent = t(button.dataset.moreLabel || 'More')
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
    syncLanguageControls()
  }

  /* Wires the avatar menu's Language submenu — a details/summary inner
     dropdown in the Statistics manage-submenu style: the menu-controller's
     document listeners open it on hover, position its popover next to the
     summary, and close it when the pointer or focus leaves, while the
     summary click toggles it for touch/keyboard. Runs once from main.js
     after the shell DOM exists and before the first
     navigation.navigate(), so a stored العربية boots straight into RTL
     with no English flash. Demo-only selections are never persisted, so
     a reload always comes back on the last functional locale. */
  function initLanguage() {
    const submenu = document.querySelector('.language-submenu')
    const popover = submenu?.querySelector(':scope > .data-menu-popover')
    const avatarBtn = document.querySelector('.avatar-btn')
    /* Statistics-style behavior: the popover stays open after a pick so
       adjacent options remain reachable; only the menu-controller's
       pointer/Escape/outside-click paths close it. */
    popover?.addEventListener('change', event => {
      const label = event.target.closest?.('[data-language]')
      if (label) selectLanguage(label.dataset.language)
    })
    /* The sign-in footer owns a second seven-row submenu (si-language,
       distinct radio group name). Delegated at document level so the
       binding survives any mount order — same selectLanguage() entry
       point, same "popover stays open after a pick" behavior. */
    document.addEventListener('change', event => {
      const label = event.target.closest?.('.si-language [data-si-language]')
      if (label) selectLanguage(label.dataset.siLanguage)
    })
    /* Reset the inner dropdown whenever the avatar menu closes (item
       click, Escape, or outside click all funnel through aria-expanded),
       so the menu always reopens with the Language list collapsed. */
    if (avatarBtn && 'MutationObserver' in window) {
      new MutationObserver(() => {
        if (avatarBtn.getAttribute('aria-expanded') !== 'true' && submenu) submenu.open = false
      }).observe(avatarBtn, {attributes: true, attributeFilter: ['aria-expanded']})
    }
    let stored = null
    try {
      stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    } catch {}
    // Only functional codes are ever persisted, so anything found here is
    // EN or AR — the harness checkbox follows through syncLanguageControls.
    if (isFunctionalLanguage(stored)) applyLocale(stored)
    syncLanguageControls()
  }

  document.getElementById('rtl').addEventListener('change', e => {
    applyLocale(e.target.checked ? 'ar' : 'en')
  })

  return {
    getAppLocale: () => appLocale,
    applyDataI18n,
    getSelectedLanguage: () => selectedLanguage,
    selectLanguage,
    initLanguage,
  }
}
