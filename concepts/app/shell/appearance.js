import {normalizeHexColor, deriveAccentPair} from '../core/appearance.js'

/** Owns appearance controls state and its DOM bindings. */
export function createAppearanceControls({createAppearance, trapFocus, releaseFocus, setLaunchpadEnabled} = {}) {
  const appearanceScrim = document.getElementById('appearance-scrim')

  const appearanceHighContrast = document.getElementById('appearance-high-contrast')
  const appearanceLaunchpad = document.getElementById('appearance-launchpad')

  const appearanceCustomColor = document.getElementById('appearance-custom-color')

  const appearanceCustomHex = document.getElementById('appearance-custom-hex')

  const appearanceCustomError = document.getElementById('appearance-custom-error')

  const appearanceCustomGroup = document.querySelector('[data-custom-accent]')

  const appearanceReset = document.getElementById('appearance-reset')
  const appearanceFontFamily = document.getElementById('appearance-font-family')
  const interfaceScaleSelect = document.getElementById('interface-scale')
  const appearanceInterfaceScale = document.getElementById('appearance-interface-scale')
  const appearanceScaleValue = document.getElementById('appearance-scale-value')
  const scaleOptions = ['90', '100', '110', '125']
  const fontFamilies = {
    system: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    Inter: 'Inter, ui-sans-serif, system-ui, sans-serif',
    Roboto: 'Roboto, ui-sans-serif, system-ui, sans-serif',
    'Open Sans': '"Open Sans", ui-sans-serif, system-ui, sans-serif',
    Poppins: 'Poppins, ui-sans-serif, system-ui, sans-serif',
    Montserrat: 'Montserrat, ui-sans-serif, system-ui, sans-serif',
  }
  const fontStylesheets = {
    Inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    Roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap',
    'Open Sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
    Poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
    Montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
  }

  function loadFont(value) {
    const href = fontStylesheets[value]
    if (!href || document.querySelector(`link[data-app-font="${value}"]`)) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.dataset.appFont = value
    document.head.append(link)
  }

  function applyFontFamily(value) {
    const fontFamily = fontFamilies[value] || fontFamilies.system
    loadFont(value)
    document.documentElement.style.setProperty('--app-font-family', fontFamily)
    document.body.style.fontFamily = fontFamily
  }

  function applyInterfaceScale(value) {
    const scale = scaleOptions.includes(String(value)) ? String(value) : '100'
    document.documentElement.style.setProperty('--ui-scale', Number(scale) / 100)
  }

  function syncInterfaceScaleControl(value = interfaceScaleSelect.value) {
    const scale = scaleOptions.includes(String(value)) ? String(value) : '100'
    const index = scaleOptions.indexOf(scale)
    const progress = index / (scaleOptions.length - 1)
    appearanceInterfaceScale.value = String(index)
    appearanceScaleValue.textContent = `${scale}%`
    appearanceInterfaceScale.style.setProperty('--appearance-scale-progress', `${progress * 100}%`)
    const thumbOffset = 10 + progress * Math.max(0, appearanceInterfaceScale.clientWidth - 20)
    appearanceScaleValue.style.setProperty('--appearance-scale-thumb-offset', `${thumbOffset}px`)
  }

  const appearanceAccentState = {
    kind: 'preset',
    light: '#1868DB',
    dark: '#669DF1',
    seed: '#1868DB',
  }

  function clearCustomAccentError() {
    appearanceCustomHex.removeAttribute('aria-invalid')
    appearanceCustomError.textContent = ''
  }

  function commitCustomAccent(value) {
    const seed = normalizeHexColor(value)
    if (!seed) {
      appearanceCustomHex.setAttribute('aria-invalid', 'true')
      appearanceCustomError.textContent = 'Enter a 3- or 6-digit hex color.'
      return false
    }
    const pair = deriveAccentPair(seed)
    Object.assign(appearanceAccentState, {kind: 'custom', seed, ...pair})
    clearCustomAccentError()
    applyAppearanceAccent()
    syncAppearanceDialog()
    return true
  }

  function syncAppearanceChoices(selector, dataKey, selectedValue) {
    document.querySelectorAll(selector).forEach(card => {
      const selected = card.dataset[dataKey] === selectedValue
      card.setAttribute('aria-checked', String(selected))
      card.tabIndex = selected ? 0 : -1
    })
  }

  function syncAppearanceDialog() {
    const isDark = document.documentElement.dataset.colorMode === 'dark'
    document.querySelectorAll('.accent-swatch').forEach((swatch, index) => {
      const hex = isDark ? swatch.dataset.accentDark : swatch.dataset.accent
      swatch.style.setProperty('--sw', hex)
      const selected =
        appearanceAccentState.kind === 'preset' &&
        swatch.dataset.accent.toUpperCase() === appearanceAccentState.light
      swatch.setAttribute(
        'aria-checked',
        String(selected)
      )
      swatch.tabIndex = selected || (appearanceAccentState.kind === 'custom' && index === 0) ? 0 : -1
    })
    appearanceCustomColor.value = appearanceAccentState.seed.toLowerCase()
    if (!appearanceCustomHex.hasAttribute('aria-invalid')) {
      appearanceCustomHex.value = appearanceAccentState.seed
    }
    appearanceCustomGroup.style.setProperty('--custom-accent', appearanceAccentState.seed)
    appearanceCustomGroup.dataset.selected = String(appearanceAccentState.kind === 'custom')
    syncAppearanceChoices('[data-appearance-theme]', 'appearanceTheme', themeSelect.value)
    syncAppearanceChoices(
      '[data-appearance-layout]',
      'appearanceLayout',
      document.getElementById('content-layout').value
    )
    syncAppearanceChoices(
      '[data-appearance-density]',
      'appearanceDensity',
      document.getElementById('density').value
    )
    syncInterfaceScaleControl()
    appearanceHighContrast.checked = highContrastToggle.checked
    appearanceLaunchpad.checked = document.getElementById('launchpad').checked
    applyFontFamily(appearanceFontFamily.value)
  }

  const openAppearance = () => {
    syncAppearanceDialog()
    appearanceScrim.classList.add('open')
    requestAnimationFrame(() => syncInterfaceScaleControl())
    trapFocus(appearanceScrim.querySelector('.dlg'))
  }

  const closeAppearance = () => {
    if (appearanceScrim.classList.contains('open')) {
      appearanceScrim.classList.remove('open')
      releaseFocus()
    }
  }

  appearanceScrim.addEventListener('click', e => {
    if (e.target === appearanceScrim || e.target.closest('.c-close')) closeAppearance()
  })

  document.querySelectorAll('.accent-swatch').forEach(swatch =>
    swatch.addEventListener('click', () => {
      Object.assign(appearanceAccentState, {
        kind: 'preset',
        seed: swatch.dataset.accent.toUpperCase(),
        light: swatch.dataset.accent.toUpperCase(),
        dark: swatch.dataset.accentDark.toUpperCase(),
      })
      clearCustomAccentError()
      applyAppearanceAccent()
      syncAppearanceDialog()
    })
  )

  appearanceCustomColor.addEventListener('input', e => commitCustomAccent(e.target.value))

  appearanceCustomHex.addEventListener('change', e => commitCustomAccent(e.target.value))

  appearanceCustomHex.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitCustomAccent(e.currentTarget.value)
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.currentTarget.value = appearanceAccentState.seed
      clearCustomAccentError()
    }
  })

  document.querySelectorAll('[data-appearance-theme]').forEach(card =>
    card.addEventListener('click', () => {
      themeSelect.value = card.dataset.appearanceTheme
      themeSelect.dispatchEvent(new Event('change'))
      syncAppearanceDialog()
    })
  )

  function bindAppearanceRadioKeys(group, selector) {
    group.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
      const current = e.target.closest(selector)
      if (!current) return
      e.preventDefault()
      const items = [...group.querySelectorAll(selector)]
      const direction = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
      const next = items[(items.indexOf(current) + direction + items.length) % items.length]
      next.focus()
      next.click()
    })
  }

  bindAppearanceRadioKeys(
    document.querySelector('.appearance-theme-grid'),
    '[data-appearance-theme]'
  )

  bindAppearanceRadioKeys(
    document.querySelector('.accent-swatches'),
    '.accent-swatch[role="radio"]'
  )

  bindAppearanceRadioKeys(
    document.querySelector('.appearance-layout-grid'),
    '[data-appearance-layout]'
  )

  bindAppearanceRadioKeys(
    document.querySelector('.appearance-density-grid'),
    '[data-appearance-density]'
  )

  document.querySelectorAll('[data-appearance-layout]').forEach(card =>
    card.addEventListener('click', () => {
      const layoutSelect = document.getElementById('content-layout')
      layoutSelect.value = card.dataset.appearanceLayout
      layoutSelect.dispatchEvent(new Event('change'))
      syncAppearanceDialog()
    })
  )

  document.querySelectorAll('[data-appearance-density]').forEach(card =>
    card.addEventListener('click', () => {
      const densitySelect = document.getElementById('density')
      densitySelect.value = card.dataset.appearanceDensity
      densitySelect.dispatchEvent(new Event('change'))
      syncAppearanceDialog()
    })
  )

  appearanceInterfaceScale.addEventListener('input', event => {
    const scale = scaleOptions[Number(event.target.value)] || '100'
    interfaceScaleSelect.value = scale
    interfaceScaleSelect.dispatchEvent(new Event('change'))
    syncInterfaceScaleControl(scale)
  })

  appearanceHighContrast.addEventListener('change', e => {
    highContrastToggle.checked = e.target.checked
    highContrastToggle.dispatchEvent(new Event('change'))
    syncAppearanceDialog()
  })

  appearanceLaunchpad.addEventListener('change', e => {
    const launchpad = document.getElementById('launchpad')
    launchpad.checked = e.target.checked
    launchpad.dispatchEvent(new Event('change'))
    syncAppearanceDialog()
  })

  appearanceReset.addEventListener('click', () => {
    Object.assign(appearanceAccentState, {
      kind: 'preset',
      light: '#1868DB',
      dark: '#669DF1',
      seed: '#1868DB',
    })
    clearCustomAccentError()
    themeSelect.value = 'system'
    highContrastToggle.checked = systemContrastQuery.matches
    const layoutSelect = document.getElementById('content-layout')
    const densitySelect = document.getElementById('density')
    layoutSelect.value = 'fluid'
    densitySelect.value = 'default'
    document.getElementById('launchpad').checked = true
    interfaceScaleSelect.value = '100'
    appearanceFontFamily.value = 'system'
    applyFontFamily('system')
    themeSelect.dispatchEvent(new Event('change'))
    highContrastToggle.dispatchEvent(new Event('change'))
    layoutSelect.dispatchEvent(new Event('change'))
    densitySelect.dispatchEvent(new Event('change'))
    interfaceScaleSelect.dispatchEvent(new Event('change'))
    document.getElementById('launchpad').dispatchEvent(new Event('change'))
    syncAppearanceDialog()
  })

  const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const systemContrastQuery = window.matchMedia('(prefers-contrast: more)')

  const highContrastToggle = document.getElementById('high-contrast')

  let onRefreshCharts = () => {}

  const appearance = createAppearance({
    root: document.documentElement,
    readControls: () => ({mode: document.getElementById('theme')?.value, highContrast: document.getElementById('high-contrast')?.checked}),
    onChange: () => onRefreshCharts(),
  })

  function applyTheme(requestedMode) {
    appearance.apply({
      mode: requestedMode,
      highContrast: highContrastToggle.checked,
      accentLight: appearanceAccentState.light,
      accentDark: appearanceAccentState.dark,
    })
  }

  function applyAppearanceAccent() {
    appearance.apply({
      accentLight: appearanceAccentState.light,
      accentDark: appearanceAccentState.dark,
    })
  }

  let dataListChartRefreshReady = false

  const themeSelect = document.getElementById('theme')

  appearanceFontFamily.addEventListener('change', event => applyFontFamily(event.target.value))

  themeSelect.addEventListener('change', e => applyTheme(e.target.value))

  highContrastToggle.addEventListener('change', () => applyTheme(themeSelect.value))

  document.getElementById('launchpad').addEventListener('change', event => {
    setLaunchpadEnabled?.(event.target.checked)
    syncAppearanceDialog()
  })

  const syncSystemTheme = () => {
    if (themeSelect.value === 'system') applyTheme('system')
  }

  systemThemeQuery.addEventListener('change', syncSystemTheme)

  systemContrastQuery.addEventListener('change', () => {
    highContrastToggle.checked = systemContrastQuery.matches
    applyTheme(themeSelect.value)
  })

  highContrastToggle.checked = systemContrastQuery.matches

  applyTheme(document.getElementById('theme').value)

  const applyDensity = value => {
    document.body.classList.toggle('density-compact', value === 'compact')
    document.body.classList.toggle('density-comfortable', value === 'comfortable')
  }
  const densitySelect = document.getElementById('density')
  densitySelect.addEventListener('change', e => applyDensity(e.target.value))
  applyDensity(document.getElementById('density').value)

  interfaceScaleSelect.addEventListener('change', e => applyInterfaceScale(e.target.value))
  applyInterfaceScale(interfaceScaleSelect.value)

  const applyContentLayout = value => {
    document.body.classList.toggle('layout-boxed', value === 'boxed')
  }
  const contentLayoutSelect = document.getElementById('content-layout')
  contentLayoutSelect.addEventListener('change', e => applyContentLayout(e.target.value))
  applyContentLayout(document.getElementById('content-layout').value)

  document.getElementById('input-style').addEventListener('change', e => {
    document.body.classList.remove('style-floated', 'style-inline')
    if (e.target.value !== 'default') document.body.classList.add(`style-${e.target.value}`)
  })

  document.getElementById('section-style').addEventListener('change', e => {
    document.body.classList.toggle('cards-fieldset', e.target.value === 'fieldset')
  })

  return {openAppearance, onRefreshCharts, setOnRefreshCharts: value => { onRefreshCharts = value }, appearance, getDataListChartRefreshReady: () => dataListChartRefreshReady, setDataListChartRefreshReady: value => { dataListChartRefreshReady = value }}
}
