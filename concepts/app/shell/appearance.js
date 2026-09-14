import {normalizeHexColor, deriveAccentPair} from '../core/appearance.js'

/** Owns appearance controls state and its DOM bindings. */
export function createAppearanceControls({createAppearance, trapFocus, releaseFocus} = {}) {
  const appearanceScrim = document.getElementById('appearance-scrim')

  const appearanceHighContrast = document.getElementById('appearance-high-contrast')

  const appearanceCustomColor = document.getElementById('appearance-custom-color')

  const appearanceCustomHex = document.getElementById('appearance-custom-hex')

  const appearanceCustomError = document.getElementById('appearance-custom-error')

  const appearanceCustomGroup = document.querySelector('[data-custom-accent]')

  const appearanceReset = document.getElementById('appearance-reset')

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
    appearanceHighContrast.checked = highContrastToggle.checked
  }

  const openAppearance = () => {
    syncAppearanceDialog()
    appearanceScrim.classList.add('open')
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

  appearanceHighContrast.addEventListener('change', e => {
    highContrastToggle.checked = e.target.checked
    highContrastToggle.dispatchEvent(new Event('change'))
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
    themeSelect.dispatchEvent(new Event('change'))
    highContrastToggle.dispatchEvent(new Event('change'))
    layoutSelect.dispatchEvent(new Event('change'))
    densitySelect.dispatchEvent(new Event('change'))
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

  themeSelect.addEventListener('change', e => applyTheme(e.target.value))

  highContrastToggle.addEventListener('change', () => applyTheme(themeSelect.value))

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

  document.getElementById('density').addEventListener('change', e => {
    document.body.classList.toggle('density-compact', e.target.value === 'compact')
  })

  document.getElementById('content-layout').addEventListener('change', e => {
    document.body.classList.toggle('layout-boxed', e.target.value === 'boxed')
  })

  document.getElementById('input-style').addEventListener('change', e => {
    document.body.classList.remove('style-floated', 'style-inline')
    if (e.target.value !== 'default') document.body.classList.add(`style-${e.target.value}`)
  })

  document.getElementById('section-style').addEventListener('change', e => {
    document.body.classList.toggle('cards-fieldset', e.target.value === 'fieldset')
  })

  return {openAppearance, onRefreshCharts, setOnRefreshCharts: value => { onRefreshCharts = value }, appearance, getDataListChartRefreshReady: () => dataListChartRefreshReady, setDataListChartRefreshReady: value => { dataListChartRefreshReady = value }}
}
