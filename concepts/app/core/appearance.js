// Shared appearance facility — extracted verbatim from the single-file
// legacy application script (concepts/app/legacy-app.js). Owns the pure
// color-math helpers, the accent CSS custom-property writer, and the two
// functions that resolve/apply the active theme (applyTheme /
// applyAppearanceAccent) exactly as they behaved in the monolith; none of
// the math below has changed.
//
// The larger appearance DIALOG (swatch grid, custom-hex input, theme/
// layout/density option cards, syncAppearanceDialog, open/close handlers,
// the Customize dialog) is page/prototype-control UI, not part of this
// facility's contract, and stays in legacy-app.js for a later task — see
// the plan's Task 4 Interfaces, which name only core/appearance.js here.
//
// createAppearance({root, readControls, onChange}) returns
// {apply, getSettings, dispose} per the plan's stated contract. Task 11
// passes this instance to createPrototypeControls as its `settings`
// parameter (prototype/controls.js) — reserved there for future direct
// appearance restoration; the existing "set control value + dispatch
// change" replay already drives this facility correctly through its own
// readControls callback (#theme/#high-contrast already have permanent
// change listeners, unlike the customer-mode/customer-layout controls
// Task 11 actually fixes), so no functional change was needed here:
//   - apply(partialSettings={}) applies supplied values over the current
//     model, reading controls only for values not yet initialized (i.e.
//     on the very first call), and ignores keys owned by page scenarios or
//     locale (this facility never reads/writes locale or invoice/customer
//     state).
//   - readControls() returns the existing appearance control values
//     (#theme's value, #high-contrast's checked state) — the two real form
//     controls this facility owns; the accent seed/kind has no such control
//     (it's driven by swatch/custom-hex clicks in the dialog) and is only
//     ever supplied through apply()'s partialSettings by that page-owned
//     dialog code.
//   - onChange() tells mounted charts to refresh (replaces the original's
//     direct refreshOpenDataListCharts() call, so this module never
//     reaches into data-list internals).

function normalizeHexColor(value) {
  const raw = String(value).trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .split('')
      .map(char => char + char)
      .join('')
      .toUpperCase()}`
  }
  return /^[0-9a-f]{6}$/i.test(raw) ? `#${raw.toUpperCase()}` : null
}
function hexToRgb(hex) {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return null
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ]
}
function rgbToHex(rgb) {
  return `#${rgb
    .map(channel => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`
}
function relativeLuminance(hex) {
  const rgb = hexToRgb(hex).map(channel => {
    const value = channel / 255
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}
function colorContrast(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second))
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second))
  return (lighter + 0.05) / (darker + 0.05)
}
function blendHex(source, target, amount) {
  const from = hexToRgb(source)
  const to = hexToRgb(target)
  return rgbToHex(from.map((channel, index) => channel + (to[index] - channel) * amount))
}
function accessibleAccent(seed, background, target, minimum = 4.5) {
  for (let step = 0; step <= 20; step += 1) {
    const candidate = blendHex(seed, target, step * 0.05)
    if (colorContrast(candidate, background) >= minimum) return candidate
  }
  return normalizeHexColor(target)
}
function deriveAccentPair(seed) {
  const normalized = normalizeHexColor(seed)
  return {
    light: accessibleAccent(normalized, '#FFFFFF', '#000000'),
    dark: accessibleAccent(normalized, '#1F1F21', '#FFFFFF'),
  }
}
// Explicit window.* bridges — preserved unchanged. The ported data-list
// renderer strings and other legacy code may still reach these as globals,
// exactly as before extraction.
window.normalizeHexColor = normalizeHexColor
window.deriveAccentPair = deriveAccentPair
window.colorContrast = colorContrast

function setAccentTone(root, hex) {
  const style = root.style
  const isDark = root.dataset.colorMode === 'dark'
  style.setProperty('--accent', hex)
  style.setProperty(
    '--accent-hover',
    `color-mix(in srgb, ${hex} 82%, ${isDark ? 'white' : 'black'})`
  )
  style.setProperty('--accent-soft', `color-mix(in srgb, ${hex} 14%, var(--surface))`)
  style.setProperty('--accent-line', `color-mix(in srgb, ${hex} 70%, var(--surface))`)
  style.setProperty('--focus', `color-mix(in srgb, ${hex} 55%, var(--surface))`)
}
function applyAppearanceAccent(root, accent) {
  const isDark = root.dataset.colorMode === 'dark'
  const highContrast = root.dataset.contrastMode === 'more'
  if (highContrast) {
    const seed = isDark ? accent.dark : accent.light
    setAccentTone(
      root,
      accessibleAccent(
        seed,
        isDark ? '#1F1F21' : '#FFFFFF',
        isDark ? '#FFFFFF' : '#000000',
        7
      )
    )
    return
  }
  setAccentTone(root, isDark ? accent.dark : accent.light)
}

const validThemeModes = new Set(['system', 'light', 'dark'])

function resolveColorMode(mode) {
  const systemColorMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
  return mode === 'system' ? systemColorMode : mode
}

/**
 * @param {{root: HTMLElement, readControls: () => {mode?: string, highContrast?: boolean}, onChange: () => void}} deps
 */
export function createAppearance({root, readControls, onChange}) {
  let initialized = false
  const settings = {
    mode: 'system',
    highContrast: false,
    accentKind: 'preset',
    accentLight: '#1868DB',
    accentDark: '#669DF1',
    accentSeed: '#1868DB',
  }

  function apply(partialSettings = {}) {
    if (!initialized) {
      const controls = readControls() || {}
      if (partialSettings.mode === undefined && controls.mode !== undefined) {
        settings.mode = controls.mode
      }
      if (partialSettings.highContrast === undefined && controls.highContrast !== undefined) {
        settings.highContrast = controls.highContrast
      }
      initialized = true
    }
    Object.assign(settings, partialSettings)

    const mode = validThemeModes.has(settings.mode) ? settings.mode : 'system'
    const colorMode = resolveColorMode(mode)
    const resolved = settings.highContrast ? `high-contrast-${colorMode}` : colorMode
    root.dataset.theme = resolved
    root.dataset.colorMode = colorMode
    root.dataset.contrastMode = settings.highContrast ? 'more' : 'standard'

    applyAppearanceAccent(root, {
      light: settings.accentLight,
      dark: settings.accentDark,
    })

    // Chart colors are resolved from CSS custom properties at draw time, so
    // an open chart needs an explicit re-render on theme change — nothing
    // else in this app re-renders data-list canvases just because the
    // theme flipped.
    onChange()
  }

  function getSettings() {
    return {...settings}
  }

  function dispose() {}

  return {apply, getSettings, dispose}
}

export {normalizeHexColor, deriveAccentPair}
