// Prototype controls component (Task 11) — replaces the classic
// concepts/app/prototype/legacy-controls.js script. Moves the harness panel
// (float/collapse/hide/drag), persistence, and the About panel dialog into
// a real module, and fixes the customer-record restoration defect
// (known-defects.md issue 6): the old script set `#customer-mode`'s DOM
// value and dispatched a `change` event on it during its own top-level
// IIFE, running before `startLegacyApp`'s page factories (customers,
// invoices, navigation) existed at all — so restoration for controls with
// no permanent listener (customer-mode/customer-layout had none; see
// pages/customers/record.js) silently did nothing, and any DOM-dependent
// re-render triggered before a page's markup was ever attached risked the
// documented null-root exception.
//
// The fix relocates two concerns to the right time, per the plan's stated
// contracts:
//   1. `readPrototypeState(storage)` is a pure read of the saved
//      `skey-proto-state` JSON — callable BEFORE any DOM/page construction,
//      so main.js can apply saved appearance/mode values through each
//      page's own already-initialized setter (`customers.setMode`,
//      `customers.setLayout`) instead of replaying a synthetic DOM event
//      against a control nobody (yet) listens to.
//   2. `createPrototypeControls({root, settings, pages})` owns everything
//      that was previously the top-level IIFE in legacy-controls.js — the
//      panel move/collapse/hide/drag chrome, the About notes dialog, and
//      restoring/persisting the remaining controls (theme, density,
//      layout, rtl, invoice mode/status/payment/dirty, filter/statistics
//      concept, etc.) — all of which already have permanent `change`
//      listeners wired at page-construction time elsewhere (core/
//      appearance.js's readControls, pages/invoices/operations.js,
//      legacy-app.js's own boot-time listeners) and so are safe to restore
//      via the original "set value + dispatch change" mechanism, since
//      those listeners exist for the app's entire lifetime, independent of
//      which page is currently active.
//
// `pages.customers`/`pages.invoices` expose only the scenario operations
// named in the plan's contract (setMode/setStatus/setPayment/setDirty/
// setLayout) — never an arbitrary state-access object — and are called
// only from `syncPage`'s construction-time listener wiring below, never
// replayed as synthetic DOM events before those pages exist.

const STATE_KEY = 'skey-proto-state'
const UI_KEY = 'skey-proto-ui'

function readJSON(storage, key, fallback) {
  try {
    return Object.assign({}, fallback, JSON.parse(storage.getItem(key) || '{}'))
  } catch {
    return Object.assign({}, fallback)
  }
}

function writeJSON(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {}
}

/**
 * Reads the saved prototype-controls state, tolerating missing/malformed
 * JSON exactly as the original inline script did (falls back to an empty
 * object rather than throwing). Safe to call before any page/DOM
 * construction — performs no DOM reads or writes.
 * @param {Storage} storage - typically `sessionStorage`.
 * @returns {object} the saved control-id -> value map (may be empty).
 */
export function readPrototypeState(storage) {
  return readJSON(storage, STATE_KEY, {})
}

/* every harness control, addressed by id, restored and persisted by value */
const CONTROL_IDS = [
  'theme',
  'content-layout',
  'mode',
  'st',
  'pay',
  'dirty',
  'failsim',
  'simulate-loading',
  'emptyflow',
  'rtl',
  'density',
  'interface-scale',
  'launchpad',
  'input-style',
  'section-style',
  'filter-mode',
  'statistics-concept',
  'customer-mode',
  'customer-layout',
  'journal-unbalanced',
  'settings-navigation-style',
  'profile-card-style',
  'active-role',
  'tour-enabled',
  'signed-in',
  'lang',
]

// customer-mode/customer-layout are restored through the owning page's own
// setter (settings/pages, supplied by main.js's composition) rather than by
// the generic "set value + dispatch change" replay below, since — unlike
// every other id in CONTROL_IDS — nothing in the app ever wired a permanent
// `change` listener to these two selects before this task (see
// pages/customers/record.js's construction-time listeners added alongside
// this file). Excluding them here avoids a redundant, listener-less replay;
// they are still captured/persisted like every other control.
const REPLAYED_CONTROL_IDS = CONTROL_IDS.filter(id => id !== 'customer-mode' && id !== 'customer-layout')

/**
 * @param {object} params
 * @param {Document} params.root - the document to mount the panel into.
 * @param {{apply: Function, getSettings: Function}} params.settings - the
 *   shared appearance facility (core/appearance.js); reserved for future
 *   direct appearance restoration, accepted to match the plan's declared
 *   factory signature.
 * @param {{customers?: {setMode: Function, setLayout: Function}, invoices?: object}} params.pages
 *   - the finite set of page-scenario operations this component may call.
 * @returns {{syncPage: (id: string) => void, dispose: () => void}}
 */
export function createPrototypeControls({root, settings, pages, onRoleChange = () => {}}) {
  const doc = root && root.nodeType === 9 ? root : root?.ownerDocument || document
  const bar = doc.querySelector('.demo-bar')
  void settings // reserved; appearance restoration is driven by main.js's composition order, not replayed here.

  if (!bar) {
    return {syncPage() {}, dispose() {}}
  }

  /* ---------- 1. move the harness into a floating panel ---------- */
  const kit = doc.createElement('div')
  kit.id = 'kit'
  kit.setAttribute('role', 'region')
  kit.setAttribute('aria-label', 'Prototype controls')
  kit.innerHTML =
    '<div class="kit-h"><span class="grip">⋮⋮</span><b>Prototype controls</b>' +
    '<button type="button" id="kit-info" title="About this prototype" aria-label="About this prototype">ⓘ About</button>' +
    '<button type="button" id="kit-min" title="Collapse" aria-label="Collapse">–</button>' +
    '<button type="button" id="kit-hide" title="Hide" aria-label="Hide">×</button></div>' +
    '<div class="kit-nav"><span style="flex:1 1 100%">Skey ERP · App Shell</span><a href="../index.html" title="Project overview">Index</a></div>' +
    '<div class="kit-b"></div>'
  const body = kit.querySelector('.kit-b')
  ;[...bar.children].forEach(child => {
    if (child.classList.contains('sep')) {
      body.appendChild(doc.createElement('hr'))
      return
    }
    body.appendChild(child)
  })
  bar.remove()
  doc.body.appendChild(kit)

  const pill = doc.createElement('button')
  pill.id = 'kit-pill'
  pill.className = 'kit-pill'
  pill.type = 'button'
  pill.innerHTML =
    '<svg width="16" height="16" aria-hidden="true"><use href="#i-sliders"/></svg><span class="kit-pill-label">Prototype controls</span>'
  doc.body.appendChild(pill)

  const profileCardStyleControl = doc.getElementById('profile-card-style')
  const applyProfileCardStyle = () => {
    doc
      .querySelector('.profile-view')
      ?.setAttribute('data-profile-card-style', profileCardStyleControl.value)
  }
  profileCardStyleControl.addEventListener('change', applyProfileCardStyle)
  applyProfileCardStyle()

  const settingsNavigationStyleControl = doc.getElementById('settings-navigation-style')
  const applySettingsNavigationStyle = () => {
    const style = settingsNavigationStyleControl.value === 'standard' ? 'standard' : 'sidebar'
    doc.querySelectorAll('.profile-view, .organization-view').forEach(view => {
      view.dataset.settingsNavigationStyle = style
    })
  }
  settingsNavigationStyleControl.addEventListener('change', applySettingsNavigationStyle)
  applySettingsNavigationStyle()

  const activeRoleControl = doc.getElementById('active-role')
  const applyActiveRole = () => onRoleChange(activeRoleControl.value)
  activeRoleControl.addEventListener('change', applyActiveRole)
  applyActiveRole()

  /* ---------- shared prototype state, so switching versions keeps your setup ---------- */
  const captureState = () => {
    const s = {}
    for (const id of CONTROL_IDS) {
      const el = doc.getElementById(id)
      if (!el) continue
      s[id] = el.type === 'checkbox' ? el.checked : el.value
    }
    const active = kit.querySelector('.kit-b button.tab.on, .kit-b button.tab[aria-pressed="true"]')
    if (active) s.layout = active.textContent.trim()
    return s
  }

  /* apply saved values, then fire the events the prototype already listens for */
  const restoreState = () => {
    const saved = readPrototypeState(sessionStorage)
    if (!saved || !Object.keys(saved).length) return
    for (const id of REPLAYED_CONTROL_IDS) {
      const el = doc.getElementById(id)
      if (!el || !(id in saved)) continue
      const want = saved[id]
      if (el.type === 'checkbox') {
        if (el.checked !== want) {
          el.checked = want
          el.dispatchEvent(new Event('change', {bubbles: true}))
        }
      } else if ([...(el.options || [])].some(o => o.value === want)) {
        if (el.value !== want) {
          el.value = want
          el.dispatchEvent(new Event('change', {bubbles: true}))
        }
      }
    }
    // customer-mode/customer-layout: apply through the page's own already-
    // initialized setter, THE null-root fix. setMode/setLayout update
    // record.js's model state unconditionally but only touch the DOM when
    // the record page is active — see pages/customers/record.js — so this
    // is safe to call regardless of which surface is currently on screen.
    if (pages?.customers) {
      if (saved['customer-mode'] && doc.getElementById('customer-mode')) {
        doc.getElementById('customer-mode').value = saved['customer-mode']
        pages.customers.setMode(saved['customer-mode'])
      }
      if (saved['customer-layout'] && doc.getElementById('customer-layout')) {
        doc.getElementById('customer-layout').value = saved['customer-layout']
        pages.customers.setLayout(saved['customer-layout'])
      }
    }
    if (saved.layout) {
      const btn = [...kit.querySelectorAll('.kit-b button.tab')].find(b => b.textContent.trim() === saved.layout)
      if (btn && btn.getAttribute('aria-pressed') !== 'true') btn.click()
    }
  }

  restoreState()
  kit.addEventListener('change', () => writeJSON(sessionStorage, STATE_KEY, captureState()))
  kit.addEventListener('click', e => {
    if (e.target.closest('.kit-b button.tab')) setTimeout(() => writeJSON(sessionStorage, STATE_KEY, captureState()), 0)
  })

  /* ---------- panel chrome: collapse, hide, drag, all remembered ---------- */
  const compactControls = matchMedia('(max-width: 720px)')
  const ui = readJSON(sessionStorage, UI_KEY, {min: false, hidden: compactControls.matches, left: null, top: null})
  const launchpadVisible = !!doc.querySelector('.lp-view:not([hidden])')
  if (compactControls.matches || launchpadVisible) {
    ui.hidden = true
    ui.left = null
    ui.top = null
  }
  const minBtn = doc.getElementById('kit-min')
  const saveUI = () => writeJSON(sessionStorage, UI_KEY, ui)

  const applyMin = () => {
    kit.classList.toggle('min', ui.min)
    minBtn.textContent = ui.min ? '□' : '–'
    minBtn.title = minBtn.ariaLabel = ui.min ? 'Expand' : 'Collapse'
    minBtn.setAttribute('aria-expanded', String(!ui.min))
  }
  const applyHidden = () => {
    kit.classList.toggle('hidden', ui.hidden)
    kit.setAttribute('aria-hidden', String(ui.hidden))
    pill.setAttribute('aria-expanded', String(!ui.hidden))
  }

  minBtn.onclick = () => {
    ui.min = !ui.min
    applyMin()
    saveUI()
  }
  doc.getElementById('kit-hide').onclick = () => {
    ui.hidden = true
    applyHidden()
    saveUI()
    pill.focus()
  }
  pill.onclick = () => {
    ui.hidden = false
    applyHidden()
    saveUI()
    minBtn.focus()
  }
  applyMin()
  applyHidden()
  compactControls.addEventListener('change', event => {
    if (!event.matches) return
    ui.hidden = true
    ui.left = null
    ui.top = null
    kit.style.inset = ''
    kit.style.left = ''
    kit.style.top = ''
    applyHidden()
    saveUI()
  })

  /* keep the panel fully on screen; used after drags and on resize */
  const clamp = () => {
    if (ui.left == null || ui.top == null) return
    const w = kit.offsetWidth
    const h = kit.offsetHeight
    ui.left = Math.min(Math.max(6, ui.left), Math.max(6, innerWidth - w - 6))
    ui.top = Math.min(Math.max(6, ui.top), Math.max(6, innerHeight - h - 6))
    kit.style.inset = 'auto'
    kit.style.left = ui.left + 'px'
    kit.style.top = ui.top + 'px'
  }
  clamp()
  addEventListener('resize', clamp)

  const head = kit.querySelector('.kit-h')
  let sx = 0
  let sy = 0
  let ox = 0
  let oy = 0
  let dragging = false
  head.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return
    const r = kit.getBoundingClientRect()
    kit.style.inset = 'auto'
    kit.style.left = r.left + 'px'
    kit.style.top = r.top + 'px'
    sx = e.clientX
    sy = e.clientY
    ox = r.left
    oy = r.top
    dragging = true
    kit.classList.add('dragging')
    head.setPointerCapture(e.pointerId)
  })
  head.addEventListener('pointermove', e => {
    if (!dragging) return
    const w = kit.offsetWidth
    const h = kit.offsetHeight
    ui.left = Math.min(Math.max(6, ox + e.clientX - sx), innerWidth - w - 6)
    ui.top = Math.min(Math.max(6, oy + e.clientY - sy), innerHeight - h - 6)
    kit.style.left = ui.left + 'px'
    kit.style.top = ui.top + 'px'
  })
  const endDrag = e => {
    if (!dragging) return
    dragging = false
    kit.classList.remove('dragging')
    try {
      head.releasePointerCapture(e.pointerId)
    } catch {}
    saveUI()
  }
  head.addEventListener('pointerup', endDrag)
  head.addEventListener('pointercancel', endDrag)

  /* double-click the header to snap back to the default corner */
  head.addEventListener('dblclick', e => {
    if (e.target.closest('button')) return
    ui.left = ui.top = null
    saveUI()
    kit.style.inset = ''
    kit.style.left = ''
    kit.style.top = ''
  })

  /* ---------- 2. the written notes become a dialog ---------- */
  const notes = [...doc.querySelectorAll('.note, .concept-note')].map(n => {
    const section = n.closest('.design, .concept')
    return {
      html: n.outerHTML.replace(/class="[^"]*"/, 'class="n"'),
      key: section ? section.dataset.design || section.dataset.concept || '' : '',
    }
  })
  doc.querySelectorAll('.note, .concept-note').forEach(n => n.remove())

  const dlg = doc.createElement('div')
  dlg.id = 'kit-notes'
  dlg.innerHTML =
    '<div class="box" role="dialog" aria-modal="true" aria-labelledby="kit-notes-t">' +
    '<div class="nh"><h3 id="kit-notes-t">About this prototype</h3>' +
    '<button type="button" aria-label="Close">×</button></div><div class="nb"></div></div>'
  doc.body.appendChild(dlg)
  const nb = dlg.querySelector('.nb')
  const box = dlg.querySelector('.box')
  const infoBtn = doc.getElementById('kit-info')
  let lastFocus = null

  const closeNotes = () => {
    if (!dlg.classList.contains('open')) return
    dlg.classList.remove('open')
    infoBtn.setAttribute('aria-expanded', 'false')
    ;(lastFocus || infoBtn).focus()
  }
  dlg.querySelector('.nh button').onclick = closeNotes
  dlg.addEventListener('click', e => {
    if (e.target === dlg) closeNotes()
  })

  /* Escape closes, Tab stays inside the dialog while it is open */
  const handleDialogKeydown = e => {
    if (!dlg.classList.contains('open')) return
    if (e.key === 'Escape') {
      e.preventDefault()
      closeNotes()
      return
    }
    if (e.key !== 'Tab') return
    const f = [...box.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
      el => el.offsetParent !== null
    )
    if (!f.length) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && doc.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && doc.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
  doc.addEventListener('keydown', handleDialogKeydown)

  const activeKey = () => {
    const a = doc.querySelector('.design.active, .concept.active')
    return a ? a.dataset.design || a.dataset.concept || '' : ''
  }
  infoBtn.setAttribute('aria-expanded', 'false')
  infoBtn.onclick = () => {
    const k = activeKey()
    const shown = notes.filter(n => !n.key || n.key === k)
    nb.innerHTML = (shown.length ? shown : notes).map(n => n.html).join('')
    lastFocus = doc.activeElement
    dlg.classList.add('open')
    infoBtn.setAttribute('aria-expanded', 'true')
    nb.scrollTop = 0
    dlg.querySelector('.nh button').focus()
  }

  /* ---------- 3. per-surface control visibility (moved from
     legacy-app.js's syncCustomerPrototypeControls) ---------- */

  /**
   * Shows/hides the prototype-controls groups relevant to the surface
   * currently on screen. Moved from legacy-app.js's
   * syncCustomerPrototypeControls, called by main.js's composition through
   * Navigation's onChange and by pages/home.js directly around the
   * launchpad overlay, exactly as the original callback was.
   * @param {string} viewName
   */
  function syncPage(viewName) {
    // #kit is built above, synchronously, so unlike the original inline
    // script (a later classic <script> tag that could run before the panel
    // existed on the very first boot call) this never needs to skip for
    // "not built yet" — kept as a defensive guard only in case a caller
    // ever fires this before construction completes.
    if (!doc.getElementById('table-group-heading')) return
    const isLaunchpad = viewName === 'launchpad'
    if (isLaunchpad && !kit.classList.contains('hidden')) doc.getElementById('kit-hide')?.click()
    const customerRecord = viewName === 'customer-record'
    const isProfile = viewName === 'profile'
    const isOrganization = viewName === 'organization'
    const isSettingsPage = isProfile || isOrganization
    const nonInvoiceSurface = viewName !== 'record'
    const isTablePage = ['list', 'customers-list', 'geo-list'].includes(viewName)
    const hasCardSections = !isLaunchpad && (viewName === 'record' || customerRecord || isTablePage || isProfile || isOrganization)
    doc.getElementById('input-style-group').hidden = isLaunchpad
    doc.getElementById('customer-group-heading').hidden = !customerRecord
    doc.getElementById('customer-mode-group').hidden = !customerRecord
    doc.getElementById('customer-layout-group')?.toggleAttribute('hidden', !customerRecord)
    doc.getElementById('profile-group-heading').hidden = !isProfile
    doc.getElementById('profile-card-style-group').hidden = !isProfile
    doc.getElementById('settings-navigation-group-heading').hidden = !isSettingsPage
    doc.getElementById('settings-navigation-style-group').hidden = !isSettingsPage
    if (isSettingsPage) applySettingsNavigationStyle()
    if (isProfile) applyProfileCardStyle()
    doc.getElementById('section-style-group').hidden = !hasCardSections
    doc.getElementById('table-group-heading').hidden = !isTablePage
    doc.getElementById('filter-mode-group').hidden = !isTablePage
    doc.getElementById('statistics-concept-group').hidden = !isTablePage
    ;[
      'invoice-group-heading',
      'invoice-mode-group',
      'invoice-status-group',
      'invoice-payment-group',
      'invoice-dirty-group',
      'invoice-emptyflow-group',
      'journal-unbalanced-group',
    ].forEach(id => {
      doc.getElementById(id).hidden = nonInvoiceSurface
    })
  }

  function dispose() {
    doc.removeEventListener('keydown', handleDialogKeydown)
    profileCardStyleControl.removeEventListener('change', applyProfileCardStyle)
    settingsNavigationStyleControl.removeEventListener('change', applySettingsNavigationStyle)
    activeRoleControl.removeEventListener('change', applyActiveRole)
    removeEventListener('resize', clamp)
  }

  return {syncPage, dispose}
}
