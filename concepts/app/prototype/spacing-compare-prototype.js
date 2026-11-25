// PROTOTYPE, throwaway. Answers ticket #29: for each off-scale spacing value,
// does it move to an ADS step or stay a documented custom value?
// Four value sets on every screen, switched with ?spacing=A|B|C|D.
// It only overrides --ds-space-legacy-* on <html> at runtime; no source token changes.
// Values that do not read a token (plain CSS literals, numeric Tailwind utilities) do not change.

const TOKENS = {
  '0-5': {current: 0.5, steps: [[0, '0']]},
  1: {current: 1, steps: [[0, '0'], [2, '025']]},
  3: {current: 3, steps: [[2, '025'], [4, '050']]},
  5: {current: 5, steps: [[4, '050'], [6, '075']]},
  7: {current: 7, steps: [[6, '075'], [8, '100']]},
  9: {current: 9, steps: [[8, '100']]},
  10: {current: 10, steps: [[8, '100'], [12, '150']]},
  11: {current: 11, steps: [[12, '150']]},
  13: {current: 13, steps: [[12, '150']]},
  14: {current: 14, steps: [[12, '150'], [16, '200']]},
  15: {current: 15, steps: [[16, '200']]},
  17: {current: 17, steps: [[16, '200']]},
  18: {current: 18, steps: [[16, '200'], [20, '250']]},
  22: {current: 22, steps: [[20, '250'], [24, '300']]},
  26: {current: 26, steps: [[24, '300']]},
  28: {current: 28, steps: [[24, '300'], [32, '400']]},
  30: {current: 30, steps: [[32, '400']]},
  34: {current: 34, steps: [[32, '400']]},
  46: {current: 46, steps: [[48, '600']]},
  54: {current: 54, steps: [[48, '600']]},
  68: {current: 68, steps: [[64, '800']]},
  72: {current: 72, steps: [[64, '800'], [80, '1000']]},
}

const SETS = {
  A: {name: 'Current', pick: token => token.current},
  B: {name: 'ADS, ties go smaller', pick: token => token.steps[0][0]},
  C: {name: 'ADS, ties go larger', pick: token => token.steps[token.steps.length - 1][0]},
  D: {name: 'Custom (per token)', pick: null},
}

const KEYS = Object.keys(SETS)
const STORE = 'proto29-spacing'
const custom = {}

function readState() {
  const params = new URLSearchParams(location.search)
  const saved = JSON.parse(sessionStorage.getItem(STORE) || '{}')
  const variant = params.get('spacing') || saved.variant || 'A'
  Object.assign(custom, saved.custom || {})
  for (const name of Object.keys(TOKENS)) {
    const fromUrl = params.get(`s${name}`)
    if (fromUrl) custom[name] = Number(fromUrl)
  }
  return KEYS.includes(variant) ? variant : 'A'
}

function valueFor(variant, name) {
  const token = TOKENS[name]
  if (variant === 'D') return custom[name] ?? token.current
  return SETS[variant].pick(token)
}

function apply(variant) {
  for (const name of Object.keys(TOKENS)) {
    const value = valueFor(variant, name)
    if (variant === 'A') document.documentElement.style.removeProperty(`--ds-space-legacy-${name}`)
    else document.documentElement.style.setProperty(`--ds-space-legacy-${name}`, `${value}px`)
  }
  document.documentElement.dataset.spacingVariant = variant
  sessionStorage.setItem(STORE, JSON.stringify({variant, custom}))
  const url = new URL(location.href)
  url.searchParams.set('spacing', variant)
  history.replaceState(history.state, '', url)
}

function el(tag, css, text) {
  const node = document.createElement(tag)
  node.style.cssText = css
  if (text) node.textContent = text
  return node
}

function mount() {
  let variant = readState()
  const wrap = el('div', 'position:fixed;inset-inline:0;bottom:12px;display:flex;flex-direction:column;align-items:center;gap:8px;z-index:2147483647;pointer-events:none;font:12px/16px system-ui,sans-serif')
  wrap.dataset.spacingPrototype = ''
  const panel = el('div', 'pointer-events:auto;display:none;grid-template-columns:auto auto auto auto;gap:4px 10px;align-items:center;padding:10px 12px;background:#172b4d;color:#fff;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.4);max-height:70vh;overflow:auto')
  const bar = el('div', 'pointer-events:auto;display:flex;align-items:center;gap:10px;padding:6px 10px;background:#172b4d;color:#fff;border-radius:999px;box-shadow:0 4px 16px rgba(0,0,0,.4)')
  const prev = el('button', 'all:unset;cursor:pointer;padding:2px 8px', '\u2190')
  const next = el('button', 'all:unset;cursor:pointer;padding:2px 8px', '\u2192')
  const label = el('span', 'min-width:210px;text-align:center;font-weight:600')
  const toggle = el('button', 'all:unset;cursor:pointer;padding:2px 8px;border:1px solid #8590a2;border-radius:999px', 'values')
  bar.append(prev, label, next, toggle)
  wrap.append(panel, bar)
  document.body.append(wrap)

  const selects = {}
  for (const [name, token] of Object.entries(TOKENS)) {
    panel.append(el('span', 'font-weight:600', `legacy-${name}`))
    const select = el('select', 'font:inherit;color:#172b4d')
    for (const [px, step] of [[token.current, 'current'], ...token.steps]) {
      const option = document.createElement('option')
      option.value = px
      option.textContent = `${px}px ${step}`
      select.append(option)
    }
    select.addEventListener('change', () => {
      custom[name] = Number(select.value)
      show('D')
    })
    selects[name] = select
    panel.append(select)
  }

  function show(nextVariant) {
    variant = nextVariant
    if (variant !== 'D') {
      for (const name of Object.keys(TOKENS)) custom[name] = valueFor(variant, name)
    }
    apply(variant)
    label.textContent = `${variant} (${SETS[variant].name})`
    for (const [name, select] of Object.entries(selects)) select.value = valueFor(variant, name)
  }

  const step = delta => show(KEYS[(KEYS.indexOf(variant) + delta + KEYS.length) % KEYS.length])
  prev.addEventListener('click', () => step(-1))
  next.addEventListener('click', () => step(1))
  toggle.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'grid' : 'none'
  })
  document.addEventListener('keydown', event => {
    if (event.target.closest('input, textarea, select, [contenteditable]')) return
    if (event.key === 'ArrowLeft' && event.altKey) step(-1)
    if (event.key === 'ArrowRight' && event.altKey) step(1)
  })
  window.__spacingPrototype = {show, TOKENS, SETS, valueFor, get variant() { return variant }}
  show(variant)
}

if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount)
  else mount()
}
