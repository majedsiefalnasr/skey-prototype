# User Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a User Profile content-view page (Profile, Account settings, Appearance, Security, Sessions & devices, Notifications) reachable from the topbar user menu, replacing the standalone Appearance dialog.

**Architecture:** New `pages/profile/` module set follows the exact pattern `pages/customers/` already establishes: a `.profile-view` template registered in `shell/content.js`'s `viewSelectors`, a `createProfile(...)` factory implementing the real `Page` contract (`id`, `roots`, `activate(data)`, `deactivate()`, `dispose()`) registered in `main.js`'s `pageRegistry`, and a Scroll-Navigator layout module cloned from `pages/customers/layouts.js`'s `createScrollNavigator` with profile-scoped DOM hooks. `shell/appearance.js`'s existing controls are relocated (not duplicated) into the Appearance section; the old dialog is removed. Devices/login-log are static tables driven by a new fixture module, with device-revoke persisted to `sessionStorage` via a small helper mirroring `prototype/controls.js`'s `readJSON`/`writeJSON`.

**Tech Stack:** Vanilla JS ES modules, Tailwind v4 (arbitrary-value utility classes, no new component CSS unless noted), `node --test` for unit tests (regex/string assertions against source, per `tests/table-customer-ux.test.mjs` convention), Playwright for one browser-interaction spec.

## Global Constraints

- Preserve existing APIs, keyboard behavior, RTL, reduced-motion behavior, and the app shell (spec §Constraints).
- Do not invent a real backend, authentication, or persistence beyond the sessionStorage device-list mechanism described in the spec.
- Do not pull in `createDataList`/table component machinery for the login log or device list — plain static tables only.
- Do not leave the old Appearance dialog mounted or reachable after the section move.
- Follow existing Tailwind-arbitrary-value styling conventions and existing token variables (`--surface`, `--line`, `--accent`, `--danger`, `--faint`, `.fset`, `.switch`) rather than introducing new design tokens.
- Use only existing icon symbols already defined in `shell/icons.html` (`i-user`, `i-gear`, `i-sun`, `i-lock`, `i-clock`, `i-bell`, `i-x`, `i-check`, `i-trash`, `i-caret`) — do not add new icons.
- The working tree currently has unrelated uncommitted changes in `components/data-list/*`, `pages/geography/*`, and `shell/icons.html`. Never revert, stage, or overwrite those files' existing uncommitted content; every task below touches only files it explicitly names.

---

## File Structure

| File | Responsibility |
|---|---|
| `concepts/app/prototype/fixtures/profile.js` | `CURRENT_USER`, `LOGIN_LOG_ROWS`, `DEVICE_ROWS` sample data (create) |
| `concepts/app/pages/profile/fields.js` | `PROFILE_SECTIONS` metadata + `PROFILE_SECTION_ORDER` (create) |
| `concepts/app/pages/profile/layout.js` | `createProfileScrollNavigator` (cloned/adapted from customer's) + `renderProfileScrollNav`/section-list renderer (create) |
| `concepts/app/pages/profile/sections.js` | Per-section body renderers: profile, account, appearance-host, security, sessions, notifications (create) |
| `concepts/app/pages/profile/devices.js` | Device-list render + sessionStorage revoke persistence (create) |
| `concepts/app/pages/profile/dialogs.html` | Change Password / Set PIN dialog markup (create) |
| `concepts/app/pages/profile/security-dialogs.js` | Wiring for the two security dialogs (open/close/validate/submit) (create) |
| `concepts/app/pages/profile/profile.js` | `createProfile({...})` — the page factory, composes the above, implements the `Page` contract (create) |
| `concepts/app/pages/profile/templates.html` | `.profile-view` template: identity header + scroll-nav + canvas + footer (create) |
| `concepts/app/shell/appearance.js` | Drop `openAppearance`/`closeAppearance`/scrim wiring; accept a `root` param for section-body mounting (modify) |
| `concepts/app/shell/appearance-dialog.html` | Delete file; its field markup moves into `pages/profile/templates.html` (delete) |
| `concepts/app/shell/shell.html` | User-pop menu: add "My Profile" entry, repoint "Account settings"/"Appearance" to profile navigation, remove `<!-- include: appearance-dialog.html -->` (modify) |
| `concepts/app/shell/topbar.js` | Replace `.appearance-menu` dialog-open wiring with profile-navigation wiring; add `.account-settings-menu`/`.my-profile-menu` wiring (modify) |
| `concepts/app/shell/content.js` | Register `profile` in `viewSelectors`/`currentSkeletonContainer` selectors (modify) |
| `concepts/app/main.js` | Import profile modules, construct `createProfile(...)`, register in `pageRegistry`, wire topbar's new callbacks, remove `openAppearance`/`closeAppearance` wiring (modify) |
| `tests/profile-page.test.mjs` | Unit tests: fixture shape, section metadata, scroll-nav markup, dialog markup, appearance-dialog removal (create) |
| `tests/profile-lifecycle.spec.mjs` | Playwright spec: open via user menu, deep-link each section, security dialogs, device sign-out persistence (create) |

---

## Task 1: Profile fixtures

**Files:**
- Create: `concepts/app/prototype/fixtures/profile.js`
- Test: `tests/profile-page.test.mjs`

**Interfaces:**
- Produces: `CURRENT_USER` (`{name, email, phone, jobTitle, username, branch, locale, timezone, photo}`), `LOGIN_LOG_ROWS` (`Array<{id, timestamp, ip, device, status}>`, 6–10 rows, `status` is `'success'|'failed'`), `DEVICE_ROWS` (`Array<{id, name, location, lastActive, current}>`, 3–5 rows, exactly one `current: true`).

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import {CURRENT_USER, LOGIN_LOG_ROWS, DEVICE_ROWS} from '../concepts/app/prototype/fixtures/profile.js'

test('profile fixtures have the expected shape', () => {
  assert.equal(typeof CURRENT_USER.name, 'string')
  assert.equal(typeof CURRENT_USER.email, 'string')
  assert.ok(CURRENT_USER.name.length > 0)

  assert.ok(LOGIN_LOG_ROWS.length >= 6 && LOGIN_LOG_ROWS.length <= 10)
  LOGIN_LOG_ROWS.forEach(row => {
    assert.equal(typeof row.id, 'string')
    assert.equal(typeof row.timestamp, 'string')
    assert.ok(['success', 'failed'].includes(row.status))
  })

  assert.ok(DEVICE_ROWS.length >= 3 && DEVICE_ROWS.length <= 5)
  const currentDevices = DEVICE_ROWS.filter(d => d.current === true)
  assert.equal(currentDevices.length, 1)
  DEVICE_ROWS.forEach(row => {
    assert.equal(typeof row.id, 'string')
    assert.equal(typeof row.name, 'string')
    assert.equal(typeof row.lastActive, 'string')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/profile-page.test.mjs`
Expected: FAIL — `Cannot find module '../concepts/app/prototype/fixtures/profile.js'`

- [ ] **Step 3: Write the fixture module**

```js
// Profile-page sample data — same read-only fixture convention as
// prototype/fixtures/customers.js. No backend; CURRENT_USER mirrors the
// name/branch already hardcoded in shell/shell.html's user-pop card.

export const CURRENT_USER = {
  name: 'Majed Sief Alnasr',
  email: 'admin@lastchance',
  phone: '+20 100 123 4567',
  jobTitle: 'ERP Administrator',
  username: 'msiefalnasr',
  branch: 'lastchance',
  locale: 'en',
  timezone: 'Africa/Cairo',
  photo: '',
}

export const LOGIN_LOG_ROWS = [
  {id: 'log-1', timestamp: '2026-09-23 08:12', ip: '41.66.10.24', device: 'Chrome on macOS', status: 'success'},
  {id: 'log-2', timestamp: '2026-09-22 18:47', ip: '41.66.10.24', device: 'Chrome on macOS', status: 'success'},
  {id: 'log-3', timestamp: '2026-09-22 09:03', ip: '156.203.5.11', device: 'Safari on iPhone', status: 'success'},
  {id: 'log-4', timestamp: '2026-09-21 21:55', ip: '196.221.4.90', device: 'Firefox on Windows', status: 'failed'},
  {id: 'log-5', timestamp: '2026-09-21 09:30', ip: '41.66.10.24', device: 'Chrome on macOS', status: 'success'},
  {id: 'log-6', timestamp: '2026-09-20 14:02', ip: '102.45.9.180', device: 'Edge on Windows', status: 'success'},
  {id: 'log-7', timestamp: '2026-09-19 11:18', ip: '41.66.10.24', device: 'Chrome on macOS', status: 'success'},
]

export const DEVICE_ROWS = [
  {id: 'dev-1', name: 'Chrome on macOS', location: 'Cairo, EG', lastActive: 'Active now', current: true},
  {id: 'dev-2', name: 'Safari on iPhone', location: 'Cairo, EG', lastActive: '1 day ago', current: false},
  {id: 'dev-3', name: 'Firefox on Windows', location: 'Alexandria, EG', lastActive: '3 days ago', current: false},
  {id: 'dev-4', name: 'Edge on Windows', location: 'Giza, EG', lastActive: '6 days ago', current: false},
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/profile-page.test.mjs`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add concepts/app/prototype/fixtures/profile.js tests/profile-page.test.mjs
git commit -m "feat: add profile page fixtures"
```

---

## Task 2: Section metadata

**Files:**
- Create: `concepts/app/pages/profile/fields.js`
- Test: `tests/profile-page.test.mjs` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: `PROFILE_SECTION_ORDER` (`string[]`, exactly `['profile', 'account', 'appearance', 'security', 'sessions', 'notifications']`), `PROFILE_SECTIONS` (`Record<key, {title: string, icon: string}>`, one entry per order key, `icon` is one of the existing `i-*` ids named in Global Constraints).

- [ ] **Step 1: Write the failing test**

```js
import {PROFILE_SECTION_ORDER, PROFILE_SECTIONS} from '../concepts/app/pages/profile/fields.js'

test('profile section metadata covers all six sections in order', () => {
  assert.deepEqual(PROFILE_SECTION_ORDER, ['profile', 'account', 'appearance', 'security', 'sessions', 'notifications'])
  PROFILE_SECTION_ORDER.forEach(key => {
    assert.equal(typeof PROFILE_SECTIONS[key].title, 'string')
    assert.equal(typeof PROFILE_SECTIONS[key].icon, 'string')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/profile-page.test.mjs`
Expected: FAIL — `Cannot find module '../concepts/app/pages/profile/fields.js'`

- [ ] **Step 3: Write the module**

```js
// Profile-page scroll-nav section metadata — same shape/role as
// prototype/fixtures/customers.js's CUSTOMER_SECTIONS, but section bodies
// live in pages/profile/sections.js rather than being field-driven, so only
// title/icon are needed here.

export const PROFILE_SECTION_ORDER = ['profile', 'account', 'appearance', 'security', 'sessions', 'notifications']

export const PROFILE_SECTIONS = {
  profile: {title: 'Profile', icon: 'i-user'},
  account: {title: 'Account settings', icon: 'i-gear'},
  appearance: {title: 'Appearance', icon: 'i-sun'},
  security: {title: 'Security', icon: 'i-lock'},
  sessions: {title: 'Sessions & devices', icon: 'i-clock'},
  notifications: {title: 'Notifications', icon: 'i-bell'},
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/profile-page.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add concepts/app/pages/profile/fields.js tests/profile-page.test.mjs
git commit -m "feat: add profile section metadata"
```

---

## Task 3: Profile scroll navigator

**Files:**
- Create: `concepts/app/pages/profile/layout.js`
- Test: `tests/profile-page.test.mjs` (append)

**Interfaces:**
- Consumes: `PROFILE_SECTION_ORDER`, `PROFILE_SECTIONS` (Task 2).
- Produces: `createProfileScrollNavigator({root, sectionOrder, profileState})` → `{startSpy, stopTracking, activateSection, isNavigating}` (same contract as `pages/customers/layouts.js`'s `createScrollNavigator`, profile-scoped DOM hooks). `renderProfileScrollNav(sectionOrder, sections, activeKey, encodeHtml)` → HTML string using class `profile-scroll-nav`, buttons with `data-profile-scroll-section`, `aria-controls="profile-section-${key}"`, `aria-current`.

- [ ] **Step 1: Write the failing test**

```js
import {renderProfileScrollNav} from '../concepts/app/pages/profile/layout.js'
import {PROFILE_SECTION_ORDER, PROFILE_SECTIONS} from '../concepts/app/pages/profile/fields.js'

test('profile scroll nav renders one button per section with the active one current', () => {
  const encodeHtml = value => String(value)
  const html = renderProfileScrollNav(PROFILE_SECTION_ORDER, PROFILE_SECTIONS, 'security', encodeHtml)

  assert.equal((html.match(/data-profile-scroll-section="/g) || []).length, 6)
  assert.match(html, /data-profile-scroll-section="security"[^>]*aria-current="page"/)
  assert.match(html, /data-profile-scroll-section="profile"[^>]*aria-current="false"/)
  assert.match(html, /class="profile-scroll-nav/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/profile-page.test.mjs`
Expected: FAIL — `Cannot find module '../concepts/app/pages/profile/layout.js'`

- [ ] **Step 3: Write the module**

```js
// Profile page's Scroll Navigator — adapted from pages/customers/layouts.js's
// createScrollNavigator (same IntersectionObserver + smooth-scroll
// algorithm), with profile-scoped DOM hooks (profile-scroll-nav,
// data-profile-scroll-target, #profile-section-<key>) since this page has
// its own root/state independent of the customer record.

function setScrollActiveSection(root, key, sectionOrder, profileState) {
  if (!sectionOrder.includes(key)) return
  profileState.activeSection = key
  root.querySelectorAll('.profile-scroll-nav button').forEach(button => {
    button.setAttribute('aria-current', button.dataset.profileScrollSection === key ? 'page' : 'false')
  })
}

export function createProfileScrollNavigator({root, sectionOrder, profileState}) {
  let observer = null
  let navigationKey = ''
  let navigationTimer = 0
  let navigationId = 0

  function stickyOffset() {
    if (!matchMedia('(max-width: 720px)').matches) return 12
    return (root.querySelector('.profile-scroll-nav')?.getBoundingClientRect().height || 0) + 8
  }

  function scrollContainer() {
    return root.scrollHeight > root.clientHeight + 1 ? root : document.scrollingElement
  }

  function viewportTop(scroller) {
    return scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top
  }

  function syncActiveSection() {
    if (navigationKey) return
    const targets = [...root.querySelectorAll('[data-profile-scroll-target]')]
    if (!targets.length) return
    const scroller = scrollContainer()
    const anchor = viewportTop(scroller) + stickyOffset() + 2
    const activeTarget = targets.reduce((nearest, target) =>
      Math.abs(target.getBoundingClientRect().top - anchor) <
      Math.abs(nearest.getBoundingClientRect().top - anchor)
        ? target
        : nearest
    )
    setScrollActiveSection(root, activeTarget.dataset.profileScrollTarget, sectionOrder, profileState)
  }

  function stopNavigation({interrupt = false} = {}) {
    navigationId += 1
    window.clearTimeout(navigationTimer)
    navigationTimer = 0
    navigationKey = ''
    if (interrupt) {
      const scroller = scrollContainer()
      scroller.scrollTo({top: scroller.scrollTop, behavior: 'auto'})
      syncActiveSection()
    }
  }

  function stopTracking() {
    observer?.disconnect()
    observer = null
    stopNavigation()
  }

  function startSpy() {
    observer?.disconnect()
    observer = null
    if (!('IntersectionObserver' in window)) return
    const scroller = scrollContainer()
    const offset = Math.round(stickyOffset())
    observer = new IntersectionObserver(() => syncActiveSection(), {
      root: scroller === document.scrollingElement ? null : scroller,
      rootMargin: `-${offset}px 0px -65% 0px`,
      threshold: [0, 0.1, 0.5],
    })
    root.querySelectorAll('[data-profile-scroll-target]').forEach(section => observer.observe(section))
  }

  function activateSection(key) {
    if (!sectionOrder.includes(key)) return
    stopNavigation()
    const thisNavigationId = navigationId
    navigationKey = key
    setScrollActiveSection(root, key, sectionOrder, profileState)
    const section = root.querySelector(`#profile-section-${key}`)
    if (!section) {
      stopNavigation()
      return
    }
    const scroller = scrollContainer()
    const targetTop =
      scroller.scrollTop + section.getBoundingClientRect().top - viewportTop(scroller) - stickyOffset()
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({top: Math.max(0, targetTop), behavior: reducedMotion ? 'auto' : 'smooth'})
    const finishNavigation = () => {
      if (thisNavigationId !== navigationId || navigationKey !== key) return
      window.clearTimeout(navigationTimer)
      navigationTimer = 0
      navigationKey = ''
    }
    scroller.addEventListener('scrollend', finishNavigation, {once: true})
    navigationTimer = window.setTimeout(finishNavigation, reducedMotion ? 0 : 1200)
  }

  return {startSpy, stopTracking, activateSection, isNavigating: () => Boolean(navigationKey)}
}

export function renderProfileScrollNav(sectionOrder, sections, activeKey, encodeHtml) {
  const nav = sectionOrder
    .map(key => {
      const current = activeKey === key
      return `<button type="button" data-profile-scroll-section="${encodeHtml(key)}" aria-controls="profile-section-${encodeHtml(key)}" aria-current="${current ? 'page' : 'false'}"><svg width="15" height="15" aria-hidden="true"><use href="#${sections[key].icon}" /></svg><span>${encodeHtml(sections[key].title)}</span></button>`
    })
    .join('')
  return `<nav class="profile-scroll-nav [.profile-canvas_&_button:focus-visible]:[outline:2px_solid_var(--accent)] [.profile-canvas_&_button:focus-visible]:[outline-offset:-2px] sticky [top:0] grid [gap:3px] [padding:6px] [border:1px_solid_var(--line)] rounded-lg bg-surface [box-shadow:var(--shadow-1)] [.profile-canvas_&_button]:flex [.profile-canvas_&_button]:items-center [.profile-canvas_&_button]:gap-2 [.profile-canvas_&_button]:[min-height:36px] [.profile-canvas_&_button]:[padding:7px_9px] [.profile-canvas_&_button]:[border:0] [.profile-canvas_&_button]:rounded-md [.profile-canvas_&_button]:text-muted [.profile-canvas_&_button]:[background:transparent] [.profile-canvas_&_button]:[font:inherit] [.profile-canvas_&_button]:text-start [.profile-canvas_&_button]:[cursor:pointer] [.profile-canvas_&_button:hover]:text-ink [.profile-canvas_&_button:hover]:bg-[var(--line-2)] [.profile-canvas_&_button[aria-current=page]]:text-ink [.profile-canvas_&_button[aria-current=page]]:bg-[var(--line-2)] [.profile-canvas_&_button[aria-current=page]]:font-semibold [@media((max-width:720px))]:sticky [@media((max-width:720px))]:[top:0] [@media((max-width:720px))]:[z-index:2] [@media((max-width:720px))]:flex [@media((max-width:720px))]:overflow-x-auto [@media((max-width:720px))]:whitespace-nowrap [@media((max-width:720px))]:[.profile-canvas_&_button]:[flex:none]" aria-label="Profile sections">${nav}</nav>`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/profile-page.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add concepts/app/pages/profile/layout.js tests/profile-page.test.mjs
git commit -m "feat: add profile scroll navigator"
```

---

## Task 4: Appearance module de-dialog

Relocate `createAppearanceControls` so it binds to a `root` container instead of owning a scrim/dialog, and expose a `syncAppearanceControls` (renamed from `syncAppearanceDialog`) that a consumer can call after mounting the section markup. This task does NOT move the markup yet (Task 6 does) or touch `main.js` wiring (Task 8 does) — it only changes `appearance.js`'s exported shape so later tasks have a stable contract.

**Files:**
- Modify: `concepts/app/shell/appearance.js`
- Test: `tests/profile-page.test.mjs` (append)

**Interfaces:**
- Consumes: `{createAppearance, trapFocus, releaseFocus, setLaunchpadEnabled}` (unchanged from before).
- Produces: `createAppearanceControls({...})` → `{appearance, onRefreshCharts, setOnRefreshCharts, getDataListChartRefreshReady, setDataListChartRefreshReady, syncAppearanceControls}`. **Removed** from the returned object: `openAppearance`. The function no longer reads `#appearance-scrim` or wires `.c-close`/scrim-click handlers.

- [ ] **Step 1: Write the failing test**

```js
import {readFile} from 'node:fs/promises'

test('appearance.js no longer wires a scrim/dialog and exports syncAppearanceControls', async () => {
  const controls = await readFile(new URL('../concepts/app/shell/appearance.js', import.meta.url), 'utf8')
  assert.doesNotMatch(controls, /appearance-scrim/)
  assert.doesNotMatch(controls, /openAppearance/)
  assert.match(controls, /function syncAppearanceControls/)
  assert.match(controls, /syncAppearanceControls,?\s*\}/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/profile-page.test.mjs`
Expected: FAIL — `appearance-scrim` still present, `syncAppearanceControls` not found

- [ ] **Step 3: Edit `concepts/app/shell/appearance.js`**

Remove the line reading `appearanceScrim`:
```js
const appearanceScrim = document.getElementById('appearance-scrim')
```

Rename every occurrence of `syncAppearanceDialog` to `syncAppearanceControls` (it's called from many places inside the file — use a project-wide rename within this file only).

Remove the `openAppearance`/`closeAppearance` function definitions:
```js
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
```

Remove them entirely (no replacement — the profile page owns visibility since it's a content view, not a dialog).

Update the final return statement — replace:
```js
  return {openAppearance, onRefreshCharts, setOnRefreshCharts: value => { onRefreshCharts = value }, appearance, getDataListChartRefreshReady: () => dataListChartRefreshReady, setDataListChartRefreshReady: value => { dataListChartRefreshReady = value }}
```
with:
```js
  return {syncAppearanceControls, onRefreshCharts, setOnRefreshCharts: value => { onRefreshCharts = value }, appearance, getDataListChartRefreshReady: () => dataListChartRefreshReady, setDataListChartRefreshReady: value => { dataListChartRefreshReady = value }}
```

`trapFocus`/`releaseFocus` remain accepted parameters (still used elsewhere? — no, they were only used by `openAppearance`/`closeAppearance`). Since they're now unused, remove them from the destructured parameter list:
```js
export function createAppearanceControls({createAppearance, setLaunchpadEnabled} = {}) {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/profile-page.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add concepts/app/shell/appearance.js tests/profile-page.test.mjs
git commit -m "refactor: decouple appearance controls from dialog scrim"
```

**Note for Task 8:** `main.js` currently calls `createAppearanceControls({createAppearance, trapFocus, releaseFocus, setLaunchpadEnabled})` and reads `appearanceControls.appearance`/`openAppearance` elsewhere — Task 8 updates that call site and removes the now-dangling `openAppearance` reference together with the topbar wiring.

---

## Task 5: Security dialogs (Change Password / Set PIN)

**Files:**
- Create: `concepts/app/pages/profile/dialogs.html`
- Create: `concepts/app/pages/profile/security-dialogs.js`
- Test: `tests/profile-page.test.mjs` (append)

**Interfaces:**
- Consumes: `{trapFocus, releaseFocus, toast}` (same shape as `components/dialog/dialog.js`/`components/toast/toast.js` already provide elsewhere).
- Produces: `createSecurityDialogs({trapFocus, releaseFocus, toast})` → `{openChangePassword, openSetPin, bind}`. `bind()` wires the dialogs' own trigger/close/submit listeners (must be called once after the markup is in the DOM, mirroring how `appearance.js` wires its own listeners at module-construction time).

- [ ] **Step 1: Write the failing test**

```js
test('security dialogs markup exists with password and pin forms', async () => {
  const html = await readFile(new URL('../concepts/app/pages/profile/dialogs.html', import.meta.url), 'utf8')
  assert.match(html, /id="change-password-scrim"/)
  assert.match(html, /id="set-pin-scrim"/)
  assert.match(html, /id="current-password"/)
  assert.match(html, /id="new-password"/)
  assert.match(html, /id="confirm-password"/)
  assert.match(html, /id="current-pin"/)
  assert.match(html, /id="new-pin"/)
  assert.match(html, /id="confirm-pin"/)
})

test('security-dialogs.js exports createSecurityDialogs with open/bind API', async () => {
  const source = await readFile(new URL('../concepts/app/pages/profile/security-dialogs.js', import.meta.url), 'utf8')
  assert.match(source, /export function createSecurityDialogs/)
  assert.match(source, /openChangePassword/)
  assert.match(source, /openSetPin/)
  assert.match(source, /function bind/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/profile-page.test.mjs`
Expected: FAIL — both files missing

- [ ] **Step 3: Write `concepts/app/pages/profile/dialogs.html`**

```html
<!-- ===== Change password dialog ===== -->
<div class="dscrim fixed [inset:0] [background:rgba(17,_24,_39,_0.45)] [z-index:130] hidden items-center justify-center [padding:24px]" id="change-password-scrim">
  <div class="dlg [width:min(420px,_96vw)] bg-surface rounded-xl [box-shadow:var(--shadow-2)] overflow-hidden flex flex-col [max-height:90vh]" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
    <div class="dhd flex items-center gap-3 [padding:14px_18px] [border-bottom:1px_solid_var(--line)] [&_h3]:[font-size:15px]">
      <svg width="18" height="18" aria-hidden="true"><use href="#i-lock" /></svg>
      <div><h3 id="change-password-title">Change password</h3></div>
      <button class="ibtn c-close" aria-label="Close" style="margin-inline-start: auto">
        <svg width="15" height="15" aria-hidden="true"><use href="#i-x" /></svg>
      </button>
    </div>
    <form class="dbody flex flex-col gap-3 [padding:16px_18px] overflow-auto" id="change-password-form" novalidate>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="current-password">
        Current password
        <input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="current-password" type="password" required autocomplete="current-password" />
      </label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="new-password">
        New password
        <input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="new-password" type="password" required minlength="8" autocomplete="new-password" />
      </label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="confirm-password">
        Confirm new password
        <input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="confirm-password" type="password" required autocomplete="new-password" />
      </label>
      <span class="[font-size:11px] [line-height:1.35] [color:var(--danger)] [&:empty]:hidden" id="change-password-error" role="status"></span>
    </form>
    <div class="dfoot [padding:12px_18px] [border-top:1px_solid_var(--line)] flex justify-end gap-2">
      <button type="button" class="lbtn out c-close">Cancel</button>
      <button type="submit" class="lbtn pri" form="change-password-form">Change password</button>
    </div>
  </div>
</div>

<!-- ===== Set / change PIN dialog ===== -->
<div class="dscrim fixed [inset:0] [background:rgba(17,_24,_39,_0.45)] [z-index:130] hidden items-center justify-center [padding:24px]" id="set-pin-scrim">
  <div class="dlg [width:min(420px,_96vw)] bg-surface rounded-xl [box-shadow:var(--shadow-2)] overflow-hidden flex flex-col [max-height:90vh]" role="dialog" aria-modal="true" aria-labelledby="set-pin-title">
    <div class="dhd flex items-center gap-3 [padding:14px_18px] [border-bottom:1px_solid_var(--line)] [&_h3]:[font-size:15px]">
      <svg width="18" height="18" aria-hidden="true"><use href="#i-lock" /></svg>
      <div><h3 id="set-pin-title">Set / change PIN code</h3></div>
      <button class="ibtn c-close" aria-label="Close" style="margin-inline-start: auto">
        <svg width="15" height="15" aria-hidden="true"><use href="#i-x" /></svg>
      </button>
    </div>
    <form class="dbody flex flex-col gap-3 [padding:16px_18px] overflow-auto" id="set-pin-form" novalidate>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="current-pin">
        Current PIN (leave blank if none set)
        <input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink [font-variant-numeric:tabular-nums]" id="current-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" />
      </label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="new-pin">
        New PIN (4–6 digits)
        <input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink [font-variant-numeric:tabular-nums]" id="new-pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="6" required autocomplete="off" />
      </label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="confirm-pin">
        Confirm new PIN
        <input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink [font-variant-numeric:tabular-nums]" id="confirm-pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" required autocomplete="off" />
      </label>
      <span class="[font-size:11px] [line-height:1.35] [color:var(--danger)] [&:empty]:hidden" id="set-pin-error" role="status"></span>
    </form>
    <div class="dfoot [padding:12px_18px] [border-top:1px_solid_var(--line)] flex justify-end gap-2">
      <button type="button" class="lbtn out c-close">Cancel</button>
      <button type="submit" class="lbtn pri" form="set-pin-form">Save PIN</button>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Write `concepts/app/pages/profile/security-dialogs.js`**

```js
// Change Password / Set PIN dialogs for the profile page's Security
// section. Prototype-only: validates required/matching fields client-side
// and shows a success toast — there is no real credential backend to call
// (per the design spec's Mock data & persistence section).

export function createSecurityDialogs({trapFocus, releaseFocus, toast}) {
  const passwordScrim = document.getElementById('change-password-scrim')
  const passwordForm = document.getElementById('change-password-form')
  const passwordError = document.getElementById('change-password-error')
  const pinScrim = document.getElementById('set-pin-scrim')
  const pinForm = document.getElementById('set-pin-form')
  const pinError = document.getElementById('set-pin-error')

  function openDialog(scrim) {
    passwordError.textContent = ''
    pinError.textContent = ''
    scrim.classList.add('open')
    trapFocus(scrim.querySelector('.dlg'))
  }

  function closeDialog(scrim) {
    if (!scrim.classList.contains('open')) return
    scrim.classList.remove('open')
    releaseFocus()
  }

  const openChangePassword = () => {
    passwordForm.reset()
    openDialog(passwordScrim)
  }

  const openSetPin = () => {
    pinForm.reset()
    openDialog(pinScrim)
  }

  function bind() {
    ;[passwordScrim, pinScrim].forEach(scrim =>
      scrim.addEventListener('click', e => {
        if (e.target === scrim || e.target.closest('.c-close')) closeDialog(scrim)
      })
    )

    passwordForm.addEventListener('submit', e => {
      e.preventDefault()
      const next = document.getElementById('new-password').value
      const confirm = document.getElementById('confirm-password').value
      if (next.length < 8) {
        passwordError.textContent = 'New password must be at least 8 characters.'
        return
      }
      if (next !== confirm) {
        passwordError.textContent = 'New password and confirmation do not match.'
        return
      }
      closeDialog(passwordScrim)
      toast({tone: 'ok', title: 'Password changed'})
    })

    pinForm.addEventListener('submit', e => {
      e.preventDefault()
      const next = document.getElementById('new-pin').value
      const confirm = document.getElementById('confirm-pin').value
      if (!/^\d{4,6}$/.test(next)) {
        pinError.textContent = 'PIN must be 4–6 digits.'
        return
      }
      if (next !== confirm) {
        pinError.textContent = 'New PIN and confirmation do not match.'
        return
      }
      closeDialog(pinScrim)
      toast({tone: 'ok', title: 'PIN code saved'})
    })
  }

  return {openChangePassword, openSetPin, bind}
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/profile-page.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add concepts/app/pages/profile/dialogs.html concepts/app/pages/profile/security-dialogs.js tests/profile-page.test.mjs
git commit -m "feat: add change-password and set-pin dialogs"
```

---

## Task 6: Devices & login log

**Files:**
- Create: `concepts/app/pages/profile/devices.js`
- Test: `tests/profile-page.test.mjs` (append)

**Interfaces:**
- Consumes: `DEVICE_ROWS` shape from Task 1, `{storage: sessionStorage, toast}`.
- Produces: `renderLoginLogTable(rows, encodeHtml)` → HTML string (plain `<table>`). `createDeviceList({root, deviceRows, storage, toast, encodeHtml})` → `{render}` — `render()` reads revoked ids from storage, filters them out of `deviceRows`, renders remaining devices into `root`, and wires each non-current device's "Sign out" button to revoke (persist + re-render + toast).

- [ ] **Step 1: Write the failing test**

```js
import {renderLoginLogTable} from '../concepts/app/pages/profile/devices.js'

test('login log table renders one row per entry with status text', () => {
  const encodeHtml = value => String(value)
  const rows = [
    {id: 'log-1', timestamp: '2026-09-23 08:12', ip: '1.2.3.4', device: 'Chrome', status: 'success'},
    {id: 'log-2', timestamp: '2026-09-22 08:12', ip: '1.2.3.4', device: 'Chrome', status: 'failed'},
  ]
  const html = renderLoginLogTable(rows, encodeHtml)
  assert.match(html, /<table/)
  assert.equal((html.match(/<tr[ >]/g) || []).length, 3) // header + 2 rows
  assert.match(html, />success</)
  assert.match(html, />failed</)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/profile-page.test.mjs`
Expected: FAIL — module missing

- [ ] **Step 3: Write `concepts/app/pages/profile/devices.js`**

```js
// Sessions & devices section: a plain static login-log table plus a
// device list with per-device sign-out. No sort/filter/group is warranted
// for a fixed, small fixture (see design spec's UX decisions) so this
// intentionally does not use components/data-list.
//
// Device revoke is fake but sticky for the session: revoked ids persist to
// sessionStorage using the same readJSON/writeJSON tolerate-malformed-JSON
// shape prototype/controls.js already established for prototype state.

const DEVICES_STORAGE_KEY = 'skey-proto-profile-devices'

function readRevokedIds(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(DEVICES_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRevokedIds(storage, ids) {
  try {
    storage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(ids))
  } catch {}
}

export function renderLoginLogTable(rows, encodeHtml) {
  const body = rows
    .map(
      row =>
        `<tr><td>${encodeHtml(row.timestamp)}</td><td>${encodeHtml(row.device)}</td><td>${encodeHtml(row.ip)}</td><td>${encodeHtml(row.status)}</td></tr>`
    )
    .join('')
  return `<table class="profile-login-log w-full text-[13px] [&_th]:text-start [&_th]:text-muted [&_th]:font-semibold [&_th]:[padding:7px_9px] [&_td]:[padding:7px_9px] [&_td]:[border-top:1px_solid_var(--line)]"><thead><tr><th>Time</th><th>Device</th><th>IP address</th><th>Status</th></tr></thead><tbody>${body}</tbody></table>`
}

function renderDeviceRow(device, encodeHtml) {
  const badge = device.current
    ? '<span class="badge gray" data-profile-current-device>This device</span>'
    : `<button type="button" class="lbtn out sm" data-profile-device-signout="${encodeHtml(device.id)}">Sign out</button>`
  return `<div class="profile-device-row flex items-center gap-3 [padding:10px_9px] [border-top:1px_solid_var(--line)]" data-profile-device="${encodeHtml(device.id)}">
    <span class="flex-1"><b class="block text-[13.5px] text-ink">${encodeHtml(device.name)}</b><span class="block text-xs text-muted">${encodeHtml(device.location)} · ${encodeHtml(device.lastActive)}</span></span>
    ${badge}
  </div>`
}

export function createDeviceList({root, deviceRows, storage, toast, encodeHtml}) {
  function render() {
    const revoked = new Set(readRevokedIds(storage))
    const visible = deviceRows.filter(device => !revoked.has(device.id))
    root.innerHTML = visible.map(device => renderDeviceRow(device, encodeHtml)).join('')
    root.querySelectorAll('[data-profile-device-signout]').forEach(button =>
      button.addEventListener('click', () => {
        const id = button.dataset.profileDeviceSignout
        const ids = readRevokedIds(storage)
        writeRevokedIds(storage, [...ids, id])
        render()
        toast({tone: 'ok', title: 'Device signed out'})
      })
    )
  }

  return {render}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/profile-page.test.mjs`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add concepts/app/pages/profile/devices.js tests/profile-page.test.mjs
git commit -m "feat: add sessions and devices list with sessionStorage revoke"
```

---

## Task 7: Section body renderers + page template

Build the six section bodies and the `.profile-view` template that hosts them, wiring in the Appearance markup relocated from the old dialog and the identity header.

**Files:**
- Create: `concepts/app/pages/profile/sections.js`
- Create: `concepts/app/pages/profile/templates.html`
- Read (for copying markup verbatim): `concepts/app/shell/appearance-dialog.html` (do not delete yet — Task 9 deletes it after this task copies its field markup out)
- Test: `tests/profile-page.test.mjs` (append)

**Interfaces:**
- Consumes: `CURRENT_USER` (Task 1), `PROFILE_SECTION_ORDER`/`PROFILE_SECTIONS` (Task 2), `renderProfileScrollNav` (Task 3), `renderLoginLogTable` (Task 6).
- Produces: `renderProfileSections({currentUser, encodeHtml})` → HTML string containing all six `<div id="profile-section-${key}" data-profile-scroll-target="${key}">` blocks in `PROFILE_SECTION_ORDER` order. The `appearance` section's block contains the field markup verbatim-copied from `appearance-dialog.html` (accent swatches, scale slider, typography select, theme cards, layout/density cards, contrast/launchpad toggles) with the SAME element ids those fields already use elsewhere in the codebase (`appearance-custom-color`, `appearance-interface-scale`, etc.) — `shell/appearance.js`'s `syncAppearanceControls` (Task 4) queries those exact ids, so they must not be renamed.

- [ ] **Step 1: Write the failing test**

```js
test('profile sections include all six section ids and the relocated appearance fields', () => {
  ;(async () => {
    const {renderProfileSections} = await import('../concepts/app/pages/profile/sections.js')
    const {CURRENT_USER} = await import('../concepts/app/prototype/fixtures/profile.js')
    const encodeHtml = value => String(value)
    const html = renderProfileSections({currentUser: CURRENT_USER, encodeHtml})

    ;['profile', 'account', 'appearance', 'security', 'sessions', 'notifications'].forEach(key => {
      assert.match(html, new RegExp(`id="profile-section-${key}"`))
      assert.match(html, new RegExp(`data-profile-scroll-target="${key}"`))
    })

    // Appearance fields relocated verbatim (same ids appearance.js already queries)
    assert.match(html, /id="appearance-custom-color"/)
    assert.match(html, /id="appearance-interface-scale"/)
    assert.match(html, /id="appearance-font-family"/)
    assert.match(html, /data-appearance-theme="system"/)
    assert.match(html, /data-appearance-density="comfortable"/)

    // Security section triggers
    assert.match(html, /data-profile-open-change-password/)
    assert.match(html, /data-profile-open-set-pin/)

    // Sessions section hosts the login-log table and device-list mount
    assert.match(html, /id="profile-login-log"/)
    assert.match(html, /id="profile-device-list"/)
  })()
})
```

(This test uses dynamic `import()` inside a synchronous `test()` body deliberately followed by an IIFE for readability here; when writing the real file, use `test('...', async () => { ... })` with top-level static imports instead — see Step 2's corrected form.)

- [ ] **Step 2: Rewrite Step 1 as a proper async test and verify it fails**

Replace the block above with a top-level static import + `test('...', async () => {...})`:

```js
import {renderProfileSections} from '../concepts/app/pages/profile/sections.js'
import {CURRENT_USER} from '../concepts/app/prototype/fixtures/profile.js'

test('profile sections include all six section ids and the relocated appearance fields', () => {
  const encodeHtml = value => String(value)
  const html = renderProfileSections({currentUser: CURRENT_USER, encodeHtml})

  ;['profile', 'account', 'appearance', 'security', 'sessions', 'notifications'].forEach(key => {
    assert.match(html, new RegExp(`id="profile-section-${key}"`))
    assert.match(html, new RegExp(`data-profile-scroll-target="${key}"`))
  })

  assert.match(html, /id="appearance-custom-color"/)
  assert.match(html, /id="appearance-interface-scale"/)
  assert.match(html, /id="appearance-font-family"/)
  assert.match(html, /data-appearance-theme="system"/)
  assert.match(html, /data-appearance-density="comfortable"/)

  assert.match(html, /data-profile-open-change-password/)
  assert.match(html, /data-profile-open-set-pin/)

  assert.match(html, /id="profile-login-log"/)
  assert.match(html, /id="profile-device-list"/)
})
```

Run: `node --test tests/profile-page.test.mjs`
Expected: FAIL — `Cannot find module '../concepts/app/pages/profile/sections.js'`

- [ ] **Step 3: Write `concepts/app/pages/profile/sections.js`**

```js
// Profile page section bodies. Each section is a `.fset`-style grouped
// card, matching appearance-dialog.html's existing convention (moved here
// per the design spec: Appearance's fields relocate verbatim, everything
// else is new markup built to the same convention).

function renderProfileIdentityHeader(currentUser, encodeHtml) {
  return `<div class="profile-identity-header flex items-center gap-3 [padding:16px] [border-bottom:1px_solid_var(--line)]">
    <span class="avatar inline-flex size-14 items-center justify-center rounded-full bg-[var(--line-2)] text-muted" aria-hidden="true"><svg width="26" height="26"><use href="#i-user" /></svg></span>
    <div>
      <b class="block text-[16px] text-ink">${encodeHtml(currentUser.name)}</b>
      <span class="block text-[13px] text-muted">${encodeHtml(currentUser.jobTitle)} · ${encodeHtml(currentUser.branch)}</span>
      <span class="block text-[13px] text-muted">${encodeHtml(currentUser.email)}</span>
    </div>
  </div>`
}

function renderProfileSection(currentUser) {
  return `<fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Personal information</legend>
    <div class="grid [grid-template-columns:repeat(2,_1fr)] gap-3 [@media((max-width:560px))]:[grid-template-columns:1fr]">
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-name">Full name<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-name" type="text" value="${currentUser.name}" /></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-job-title">Job title<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-job-title" type="text" value="${currentUser.jobTitle}" /></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-email">Email<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-email" type="email" value="${currentUser.email}" /></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-phone">Phone<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-phone" type="tel" value="${currentUser.phone}" /></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-locale">Locale<select class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-locale"><option value="en"${currentUser.locale === 'en' ? ' selected' : ''}>English</option><option value="ar"${currentUser.locale === 'ar' ? ' selected' : ''}>Arabic</option></select></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-timezone">Timezone<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-timezone" type="text" value="${currentUser.timezone}" /></label>
    </div>
  </fieldset>
  <fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Photo</legend>
    <div class="flex items-center gap-3">
      <span class="avatar inline-flex size-12 items-center justify-center rounded-full bg-[var(--line-2)] text-muted" aria-hidden="true"><svg width="22" height="22"><use href="#i-user" /></svg></span>
      <button type="button" class="lbtn out" id="profile-photo-select">Select photo</button>
    </div>
  </fieldset>`
}

function renderAccountSection(currentUser) {
  return `<fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Account</legend>
    <div class="grid [grid-template-columns:repeat(2,_1fr)] gap-3 [@media((max-width:560px))]:[grid-template-columns:1fr]">
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-username">Username<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-[var(--line-2)] px-[9px] py-1.5 font-[inherit] text-[14px] text-muted" id="profile-username" type="text" value="${currentUser.username}" readonly /></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-branch">Branch<input class="w-full min-h-[32px] rounded-[7px] border border-line bg-[var(--line-2)] px-[9px] py-1.5 font-[inherit] text-[14px] text-muted" id="profile-branch" type="text" value="${currentUser.branch}" readonly /></label>
      <label class="grid gap-1.5 text-[13px] font-semibold" for="profile-landing-page">Default landing page<select class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink" id="profile-landing-page"><option value="home">Home</option><option value="invoices">Sales Invoices</option><option value="customers">Customers</option></select></label>
    </div>
  </fieldset>`
}

function renderAppearanceSectionFields() {
  // Verbatim copy of appearance-dialog.html's field markup (accent,
  // interface scale, typography, theme, layout, density) — same ids, so
  // shell/appearance.js's syncAppearanceControls keeps working unmodified.
  return `<fieldset class="appearance-group-accent fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Accent color</legend>
    <div class="accent-swatches flex items-center gap-2.5 flex-wrap" role="radiogroup" aria-label="Accent color">
      <button type="button" class="accent-swatch [width:28px] [height:28px] [border-radius:999px] [background:var(--sw)] [border:2px_solid_transparent] [padding:0] [cursor:pointer] [box-shadow:inset_0_0_0_1px_var(--line)]" role="radio" data-accent="#1868DB" data-accent-dark="#669DF1" aria-checked="true" aria-label="Blue (default)" style="--sw: #1868db"></button>
      <button type="button" class="accent-swatch [width:28px] [height:28px] [border-radius:999px] [background:var(--sw)] [border:2px_solid_transparent] [padding:0] [cursor:pointer] [box-shadow:inset_0_0_0_1px_var(--line)]" role="radio" data-accent="#5B7F24" data-accent-dark="#82B536" aria-checked="false" aria-label="Green" style="--sw: #5b7f24"></button>
      <button type="button" class="accent-swatch [width:28px] [height:28px] [border-radius:999px] [background:var(--sw)] [border:2px_solid_transparent] [padding:0] [cursor:pointer] [box-shadow:inset_0_0_0_1px_var(--line)]" role="radio" data-accent="#803FA5" data-accent-dark="#B57EDC" aria-checked="false" aria-label="Purple" style="--sw: #803fa5"></button>
      <button type="button" class="accent-swatch [width:28px] [height:28px] [border-radius:999px] [background:var(--sw)] [border:2px_solid_transparent] [padding:0] [cursor:pointer] [box-shadow:inset_0_0_0_1px_var(--line)]" role="radio" data-accent="#AE2E24" data-accent-dark="#F87168" aria-checked="false" aria-label="Red" style="--sw: #ae2e24"></button>
      <button type="button" class="accent-swatch [width:28px] [height:28px] [border-radius:999px] [background:var(--sw)] [border:2px_solid_transparent] [padding:0] [cursor:pointer] [box-shadow:inset_0_0_0_1px_var(--line)]" role="radio" data-accent="#946F00" data-accent-dark="#E2B203" aria-checked="false" aria-label="Amber" style="--sw: #946f00"></button>
      <button type="button" class="accent-swatch [width:28px] [height:28px] [border-radius:999px] [background:var(--sw)] [border:2px_solid_transparent] [padding:0] [cursor:pointer] [box-shadow:inset_0_0_0_1px_var(--line)]" role="radio" data-accent="#206A83" data-accent-dark="#6CC3D5" aria-checked="false" aria-label="Teal" style="--sw: #206a83"></button>
      <div class="accent-custom grid [grid-template-columns:28px_auto_minmax(112px,_1fr)] items-center gap-2 [min-width:min(100%,_240px)]" data-custom-accent data-selected="false">
        <label class="accent-custom-picker relative [width:28px] [height:28px] [border-radius:999px] [cursor:pointer] [&_input]:absolute [&_input]:[inset:0] [&_input]:w-full [&_input]:h-full [&_input]:[padding:0] [&_input]:[opacity:0] [&_input]:[cursor:pointer]" for="appearance-custom-color">
          <input type="color" id="appearance-custom-color" value="#1868db" aria-label="Choose a custom accent color" />
          <span class="accent-custom-swatch block [width:28px] [height:28px] [border:2px_solid_transparent] [border-radius:999px] [background:var(--custom-accent,_#1868db)] [box-shadow:inset_0_0_0_1px_var(--line)] [pointer-events:none] [border-color:var(--ink)] [box-shadow:0_0_0_2px_var(--surface),_0_0_0_3.5px_var(--custom-accent,_#1868db)] [outline:2px_solid_var(--focus)] [outline-offset:3px]" aria-hidden="true"></span>
        </label>
        <label class="accent-custom-label text-xs font-semibold text-ink" for="appearance-custom-hex">Custom</label>
        <input class="accent-custom-hex w-full [min-height:32px] [padding:5px_9px] [border:1px_solid_var(--line)] [border-radius:7px] [font:inherit] [font-variant-numeric:tabular-nums] [text-transform:uppercase] bg-surface text-ink" id="appearance-custom-hex" type="text" value="#1868DB" inputmode="text" maxlength="7" spellcheck="false" aria-describedby="appearance-custom-error" />
        <span class="accent-custom-error [grid-column:1_/_-1] [font-size:11px] [line-height:1.35] [color:var(--danger)] [&:empty]:hidden" id="appearance-custom-error" role="status"></span>
      </div>
    </div>
  </fieldset>
  <fieldset class="appearance-group-scale fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Interface scale</legend>
    <div class="appearance-scale-control" aria-describedby="appearance-interface-scale-description">
      <div class="appearance-scale-head"><span>Smaller</span><span>Larger</span></div>
      <div class="appearance-scale-slider-wrap"><output class="appearance-scale-value" id="appearance-scale-value" for="appearance-interface-scale">100%</output><input class="appearance-scale-slider" type="range" id="appearance-interface-scale" min="0" max="3" step="1" value="1" aria-label="Interface scale" /></div>
      <div class="appearance-scale-ticks" aria-hidden="true"><span data-appearance-scale-tick="90">90%</span><span data-appearance-scale-tick="100">100%</span><span data-appearance-scale-tick="110">110%</span><span data-appearance-scale-tick="125">125%</span></div>
      <p id="appearance-interface-scale-description">Scales text, controls, icons, and spacing across the interface.</p>
    </div>
  </fieldset>
  <fieldset class="appearance-group-typography fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Typography</legend>
    <label class="grid gap-1.5 text-[13px] font-semibold" for="appearance-font-family">
      Font family
      <select id="appearance-font-family" class="w-full min-h-[32px] rounded-[7px] border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-[14px] text-ink appearance-none [-webkit-appearance:none] [background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [background-repeat:no-repeat] [background-position:right_8px_center] [background-size:12px] [padding-inline-end:28px] focus:border-[var(--accent-line)] focus:outline-none focus:[box-shadow:0_0_0_3px_var(--accent-soft)] rtl:[background-position:left_8px_center] rtl:[padding-inline-end:9px] rtl:[padding-inline-start:28px]">
        <option value="system">System default</option>
        <option value="Inter">Inter</option>
        <option value="Roboto">Roboto</option>
        <option value="Open Sans">Open Sans</option>
        <option value="Poppins">Poppins</option>
        <option value="Montserrat">Montserrat</option>
      </select>
    </label>
  </fieldset>
  <fieldset class="appearance-group-theme fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Interface theme</legend>
    <div class="dgrid appearance-theme-grid grid [grid-template-columns:repeat(3,_1fr)] gap-2.5" role="radiogroup" aria-label="Interface theme">
      <button type="button" class="appearance-theme-card" role="radio" data-appearance-theme="system" aria-checked="true">
        <span class="theme-preview theme-preview-system" data-theme-preview aria-hidden="true"><span class="theme-preview-chrome"><i></i><i></i><i></i></span><span class="theme-preview-sidebar"></span><span class="theme-preview-toolbar"></span><span class="theme-preview-lines"><i></i><i></i><i></i></span></span>
        <span class="theme-choice-label"><span class="theme-choice-radio" aria-hidden="true"></span><span>System preference</span></span>
      </button>
      <button type="button" class="appearance-theme-card" role="radio" data-appearance-theme="light" aria-checked="false">
        <span class="theme-preview theme-preview-light" data-theme-preview aria-hidden="true"><span class="theme-preview-chrome"><i></i><i></i><i></i></span><span class="theme-preview-sidebar"></span><span class="theme-preview-toolbar"></span><span class="theme-preview-lines"><i></i><i></i><i></i></span></span>
        <span class="theme-choice-label"><span class="theme-choice-radio" aria-hidden="true"></span><span>Light</span></span>
      </button>
      <button type="button" class="appearance-theme-card" role="radio" data-appearance-theme="dark" aria-checked="false">
        <span class="theme-preview theme-preview-dark" data-theme-preview aria-hidden="true"><span class="theme-preview-chrome"><i></i><i></i><i></i></span><span class="theme-preview-sidebar"></span><span class="theme-preview-toolbar"></span><span class="theme-preview-lines"><i></i><i></i><i></i></span></span>
        <span class="theme-choice-label"><span class="theme-choice-radio" aria-hidden="true"></span><span>Dark</span></span>
      </button>
    </div>
    <label class="appearance-contrast-row">
      <span class="switch relative inline-flex h-[17px] w-[30px] flex-none"><input class="peer absolute inset-0 m-0 cursor-pointer opacity-0" type="checkbox" id="appearance-high-contrast" /><span class="pointer-events-none absolute inset-0 rounded-full bg-line transition-[background] duration-[120ms] before:absolute before:start-0.5 before:top-0.5 before:size-[13px] before:rounded-full before:bg-inverse before:transition-[translate] before:duration-[120ms] before:content-[''] peer-checked:bg-accent peer-checked:before:translate-x-[13px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] rtl:peer-checked:before:-translate-x-[13px]"></span></span>
      <span><strong>High contrast</strong><small>Increase text, border, focus, and control distinction.</small></span>
    </label>
  </fieldset>
  <fieldset class="appearance-group-layout fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Layout</legend>
    <div class="dgrid appearance-layout-grid grid [grid-template-columns:repeat(3,_1fr)] gap-2.5" role="radiogroup" aria-label="Layout">
      <button type="button" class="dcard appearance-option-card [border:1.5px_solid_var(--line)] [border-radius:9px] [padding:11px] text-start flex [gap:9px] items-start" role="radio" data-appearance-layout="fluid" aria-checked="true">
        <span class="appearance-option-preview layout-preview-fluid" data-option-preview aria-hidden="true"><span class="layout-preview-chrome"><i></i><i></i><i></i></span><span class="layout-preview-rail"></span><span class="layout-preview-content"></span></span>
        <span class="appearance-option-label"><span class="theme-choice-radio" aria-hidden="true"></span><span><span class="t">Fluid</span></span></span>
      </button>
      <button type="button" class="dcard appearance-option-card [border:1.5px_solid_var(--line)] [border-radius:9px] [padding:11px] text-start flex [gap:9px] items-start" role="radio" data-appearance-layout="boxed" aria-checked="false">
        <span class="appearance-option-preview layout-preview-boxed" data-option-preview aria-hidden="true"><span class="layout-preview-chrome"><i></i><i></i><i></i></span><span class="layout-preview-rail"></span><span class="layout-preview-content"></span></span>
        <span class="appearance-option-label"><span class="theme-choice-radio" aria-hidden="true"></span><span><span class="t">Boxed</span></span></span>
      </button>
    </div>
    <label class="appearance-contrast-row">
      <span class="switch relative inline-flex h-[17px] w-[30px] flex-none"><input class="peer absolute inset-0 m-0 cursor-pointer opacity-0" type="checkbox" id="appearance-launchpad" checked /><span class="pointer-events-none absolute inset-0 rounded-full bg-line transition-[background] duration-[120ms] before:absolute before:start-0.5 before:top-0.5 before:size-[13px] before:rounded-full before:bg-inverse before:transition-[translate] before:duration-[120ms] before:content-[''] peer-checked:bg-accent peer-checked:before:translate-x-[13px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] rtl:peer-checked:before:-translate-x-[13px]"></span></span>
      <span><strong>Show App Launchpad</strong><small>Show the app home screen and app switcher.</small></span>
    </label>
  </fieldset>
  <fieldset class="appearance-group-density fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Density</legend>
    <div class="dgrid appearance-density-grid grid [grid-template-columns:repeat(3,_1fr)] gap-2.5" role="radiogroup" aria-label="Density">
      <button type="button" class="dcard appearance-option-card [border:1.5px_solid_var(--line)] [border-radius:9px] [padding:11px] text-start flex [gap:9px] items-start" role="radio" data-appearance-density="default" aria-checked="true">
        <span class="appearance-option-preview density-preview-default" data-option-preview aria-hidden="true"><span class="density-preview-chrome"><i></i><i></i><i></i></span><span class="density-preview-rail"></span><span class="density-preview-toolbar"></span><span class="density-preview-rows"><i></i><i></i><i></i></span></span>
        <span class="appearance-option-label"><span class="theme-choice-radio" aria-hidden="true"></span><span><span class="t">Default</span></span></span>
      </button>
      <button type="button" class="dcard appearance-option-card [border:1.5px_solid_var(--line)] [border-radius:9px] [padding:11px] text-start flex [gap:9px] items-start" role="radio" data-appearance-density="compact" aria-checked="false">
        <span class="appearance-option-preview density-preview-compact" data-option-preview aria-hidden="true"><span class="density-preview-chrome"><i></i><i></i><i></i></span><span class="density-preview-rail"></span><span class="density-preview-toolbar"></span><span class="density-preview-rows"><i></i><i></i><i></i><i></i><i></i></span></span>
        <span class="appearance-option-label"><span class="theme-choice-radio" aria-hidden="true"></span><span><span class="t">Compact</span></span></span>
      </button>
      <button type="button" class="dcard appearance-option-card [border:1.5px_solid_var(--line)] [border-radius:9px] [padding:11px] text-start flex [gap:9px] items-start" role="radio" data-appearance-density="comfortable" aria-checked="false">
        <span class="appearance-option-preview density-preview-default" data-option-preview aria-hidden="true"><span class="density-preview-chrome"><i></i><i></i><i></i></span><span class="density-preview-rail"></span><span class="density-preview-toolbar"></span><span class="density-preview-rows"><i></i><i></i><i></i></span></span>
        <span class="appearance-option-label"><span class="theme-choice-radio" aria-hidden="true"></span><span><span class="t">Comfortable</span></span></span>
      </button>
    </div>
  </fieldset>`
}

function renderSecuritySection() {
  return `<fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Sign-in security</legend>
    <div class="flex flex-col gap-2.5">
      <div class="flex items-center justify-between gap-3">
        <span><strong class="block text-[13.5px] text-ink">Password</strong><small class="block text-xs text-muted">Change the password used to sign in.</small></span>
        <button type="button" class="lbtn out" data-profile-open-change-password>Change password</button>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span><strong class="block text-[13.5px] text-ink">PIN code</strong><small class="block text-xs text-muted">Used for quick re-authentication on shared terminals.</small></span>
        <button type="button" class="lbtn out" data-profile-open-set-pin>Set / change PIN</button>
      </div>
    </div>
  </fieldset>`
}

function renderSessionsSection() {
  return `<fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Login log</legend>
    <div id="profile-login-log"></div>
  </fieldset>
  <fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Devices</legend>
    <div id="profile-device-list"></div>
  </fieldset>`
}

function renderNotificationRow(id, title, description, checked) {
  return `<label class="appearance-contrast-row">
    <span class="switch relative inline-flex h-[17px] w-[30px] flex-none"><input class="peer absolute inset-0 m-0 cursor-pointer opacity-0" type="checkbox" id="${id}"${checked ? ' checked' : ''} /><span class="pointer-events-none absolute inset-0 rounded-full bg-line transition-[background] duration-[120ms] before:absolute before:start-0.5 before:top-0.5 before:size-[13px] before:rounded-full before:bg-inverse before:transition-[translate] before:duration-[120ms] before:content-[''] peer-checked:bg-accent peer-checked:before:translate-x-[13px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] rtl:peer-checked:before:-translate-x-[13px]"></span></span>
    <span><strong>${title}</strong><small>${description}</small></span>
  </label>`
}

function renderNotificationsSection() {
  return `<fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>Email notifications</legend>
    <div class="flex flex-col gap-2">
      ${renderNotificationRow('notif-email-invoices', 'Invoice activity', 'Status changes on invoices you follow.', true)}
      ${renderNotificationRow('notif-email-mentions', 'Mentions', 'When someone mentions you in a comment.', true)}
    </div>
  </fieldset>
  <fieldset class="fset [border:1px_solid_var(--line)] [border-radius:10px] [padding:12px_14px] mb-3.5! [&_legend]:text-xs [&_legend]:[text-transform:uppercase] [&_legend]:[letter-spacing:0.04em] [&_legend]:[color:var(--faint)] [&_legend]:[padding:0_6px]">
    <legend>In-app notifications</legend>
    <div class="flex flex-col gap-2">
      ${renderNotificationRow('notif-app-approvals', 'Approvals', 'Documents waiting on your approval.', true)}
      ${renderNotificationRow('notif-app-system', 'System announcements', 'Maintenance windows and release notes.', false)}
    </div>
  </fieldset>`
}

export function renderProfileSections({currentUser, encodeHtml}) {
  const bodies = {
    profile: renderProfileSection(currentUser),
    account: renderAccountSection(currentUser),
    appearance: renderAppearanceSectionFields(),
    security: renderSecuritySection(),
    sessions: renderSessionsSection(),
    notifications: renderNotificationsSection(),
  }
  return Object.entries(bodies)
    .map(
      ([key, body]) =>
        `<div id="profile-section-${key}" data-profile-scroll-target="${key}"><h2 class="profile-section-heading text-[15px] font-semibold text-ink mb-2.5">${encodeHtml(key)}</h2>${body}</div>`
    )
    .join('')
}

export {renderProfileIdentityHeader}
```

- [ ] **Step 4: Write `concepts/app/pages/profile/templates.html`**

```html
<template class="profile-tpl">
  <div class="profile-view [&:not([hidden])]:flex [&:not([hidden])]:[flex:1] [&:not([hidden])]:min-h-0 [&:not([hidden])]:flex-col" hidden>
    <div id="profile-identity-mount"></div>
    <div class="canvas profile-canvas [flex:1] min-h-0 overflow-auto text-start [padding:16px] grid [grid-template-columns:minmax(180px,_240px)_minmax(0,_1fr)] gap-3 items-start [@media((max-width:720px))]:[grid-template-columns:minmax(0,_1fr)]" id="profile-canvas">
      <div id="profile-scroll-nav-mount"></div>
      <div class="profile-scroll-content min-w-0" id="profile-scroll-content"></div>
    </div>
  </div>
</template>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/profile-page.test.mjs`
Expected: PASS (9 tests)

- [ ] **Step 6: Commit**

```bash
git add concepts/app/pages/profile/sections.js concepts/app/pages/profile/templates.html tests/profile-page.test.mjs
git commit -m "feat: add profile page section bodies and view template"
```

---

## Task 8: Profile page factory (`createProfile`)

Compose Tasks 1–7 into the page factory implementing the `Page` contract from `core/navigation.js`.

**Files:**
- Create: `concepts/app/pages/profile/profile.js`
- Test: `tests/profile-page.test.mjs` (append)

**Interfaces:**
- Consumes: `{root, encodeHtml, currentUser, loginLogRows, deviceRows, storage, toast, trapFocus, releaseFocus, syncAppearanceControls}`.
- Produces: `createProfile({...})` → `{id: 'profile', roots: {root}, activate(data), deactivate(), dispose(), setSection(key)}`. `activate({section} = {})` renders (once, lazily, same lazy-init pattern as `pages/customers/record.js`'s `activate`) then calls `setSection(section || 'profile')`. `setSection(key)` calls the scroll navigator's `activateSection(key)`.

- [ ] **Step 1: Write the failing test**

```js
import {createProfile} from '../concepts/app/pages/profile/profile.js'
import {JSDOM} from 'node:test' // placeholder import removed below — see Step 3 note

test('createProfile exposes the Page contract', async () => {
  const source = await readFile(new URL('../concepts/app/pages/profile/profile.js', import.meta.url), 'utf8')
  assert.match(source, /export function createProfile/)
  assert.match(source, /id:\s*'profile'/)
  assert.match(source, /function activate/)
  assert.match(source, /function deactivate/)
  assert.match(source, /function dispose/)
  assert.match(source, /function setSection/)
})
```

`node:test` has no `JSDOM` export — remove that stray import line before running; this module has no real DOM available in the plain `node --test` environment, so this task's test is a source-text assertion only (consistent with `table-customer-ux.test.mjs`'s appearance-dialog test, which also asserts against raw source rather than executing DOM code). The corrected test file has no `JSDOM` import at all:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import {readFile} from 'node:fs/promises'

test('createProfile exposes the Page contract', async () => {
  const source = await readFile(new URL('../concepts/app/pages/profile/profile.js', import.meta.url), 'utf8')
  assert.match(source, /export function createProfile/)
  assert.match(source, /id:\s*'profile'/)
  assert.match(source, /function activate/)
  assert.match(source, /function deactivate/)
  assert.match(source, /function dispose/)
  assert.match(source, /function setSection/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/profile-page.test.mjs`
Expected: FAIL — module missing

- [ ] **Step 3: Write `concepts/app/pages/profile/profile.js`**

```js
// Profile page factory — composes the identity header, Scroll Navigator,
// section bodies, security dialogs, and device list into one Page-contract
// object, the same shape pages/customers/record.js's recordPage returns
// (id, roots, activate, deactivate, dispose), registered in main.js's
// pageRegistry and driven by core/navigation.js's real navigator.

import {PROFILE_SECTION_ORDER, PROFILE_SECTIONS} from './fields.js'
import {createProfileScrollNavigator, renderProfileScrollNav} from './layout.js'
import {renderProfileSections, renderProfileIdentityHeader} from './sections.js'
import {renderLoginLogTable, createDeviceList} from './devices.js'
import {createSecurityDialogs} from './security-dialogs.js'

export function createProfile({root, encodeHtml, currentUser, loginLogRows, deviceRows, storage, toast, trapFocus, releaseFocus, syncAppearanceControls}) {
  const identityMount = root.querySelector('#profile-identity-mount')
  const navMount = root.querySelector('#profile-scroll-nav-mount')
  const contentMount = root.querySelector('#profile-scroll-content')
  const canvas = root.querySelector('#profile-canvas')

  const profileState = {activeSection: 'profile'}
  let scrollNavigator = null
  let deviceList = null
  let securityDialogs = null
  let rendered = false

  function render() {
    identityMount.innerHTML = renderProfileIdentityHeader(currentUser, encodeHtml)
    navMount.innerHTML = renderProfileScrollNav(PROFILE_SECTION_ORDER, PROFILE_SECTIONS, profileState.activeSection, encodeHtml)
    contentMount.innerHTML = renderProfileSections({currentUser, encodeHtml})

    document.getElementById('profile-login-log').innerHTML = renderLoginLogTable(loginLogRows, encodeHtml)

    deviceList = createDeviceList({
      root: document.getElementById('profile-device-list'),
      deviceRows,
      storage,
      toast,
      encodeHtml,
    })
    deviceList.render()

    securityDialogs = createSecurityDialogs({trapFocus, releaseFocus, toast})
    securityDialogs.bind()
    document.querySelector('[data-profile-open-change-password]').addEventListener('click', () => securityDialogs.openChangePassword())
    document.querySelector('[data-profile-open-set-pin]').addEventListener('click', () => securityDialogs.openSetPin())

    navMount.querySelectorAll('[data-profile-scroll-section]').forEach(button =>
      button.addEventListener('click', () => scrollNavigator.activateSection(button.dataset.profileScrollSection))
    )

    syncAppearanceControls?.()
  }

  function setSection(key) {
    if (!PROFILE_SECTION_ORDER.includes(key)) return
    scrollNavigator?.activateSection(key)
  }

  function activate({section} = {}) {
    if (!rendered) {
      render()
      scrollNavigator = createProfileScrollNavigator({root: canvas, sectionOrder: PROFILE_SECTION_ORDER, profileState})
      rendered = true
    }
    scrollNavigator.startSpy()
    setSection(section || 'profile')
  }

  function deactivate() {
    scrollNavigator?.stopTracking()
  }

  function dispose() {
    deactivate()
    rendered = false
  }

  return {id: 'profile', roots: {root}, activate, deactivate, dispose, setSection}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/profile-page.test.mjs`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add concepts/app/pages/profile/profile.js tests/profile-page.test.mjs
git commit -m "feat: add createProfile page factory"
```

---

## Task 9: Wire content host, appearance-dialog removal, shell markup

Register `profile` as a content view, delete the standalone Appearance dialog, and update the user-pop menu markup.

**Files:**
- Modify: `concepts/app/shell/content.js`
- Delete: `concepts/app/shell/appearance-dialog.html`
- Modify: `concepts/app/shell/shell.html`
- Test: `tests/profile-page.test.mjs` (append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `content.js`'s `viewSelectors` object gains `profile: '.profile-view'`; `currentSkeletonContainer`'s `selectors` object gains the same entry.

- [ ] **Step 1: Write the failing test**

```js
test('content host registers the profile view and the appearance dialog file is removed', async () => {
  const content = await readFile(new URL('../concepts/app/shell/content.js', import.meta.url), 'utf8')
  assert.match(content, /profile:\s*'\.profile-view'/)

  await assert.rejects(
    readFile(new URL('../concepts/app/shell/appearance-dialog.html', import.meta.url), 'utf8')
  )

  const shell = await readFile(new URL('../concepts/app/shell/shell.html', import.meta.url), 'utf8')
  assert.doesNotMatch(shell, /appearance-dialog\.html/)
  assert.match(shell, /profile\.tpl|include: \.\.\/pages\/profile\/templates\.html/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/profile-page.test.mjs`
Expected: FAIL — `content.js` has no `profile` key; `appearance-dialog.html` still exists

- [ ] **Step 3: Edit `concepts/app/shell/content.js`**

In `currentSkeletonContainer`'s `selectors` object, add a `profile` entry:

```js
    const selectors = {
      record: '.page-content',
      email: '.email-view:not([hidden])',
      list: '.list-view:not([hidden])',
      'customers-list': '.customer-list-view:not([hidden])',
      'customer-record': '.customer-record-view:not([hidden])',
      'geo-list': '.geo-list-view:not([hidden])',
      'geo-record': '.geo-record-view:not([hidden])',
      profile: '.profile-view:not([hidden])',
    }
```

In `attachAndShowView`'s `viewSelectors` object, add the same key:

```js
    const viewSelectors = {
      email: '.email-view',
      list: '.list-view',
      'customers-list': '.customer-list-view',
      'customer-record': '.customer-record-view',
      'geo-list': '.geo-list-view',
      'geo-record': '.geo-record-view',
      profile: '.profile-view',
    }
```

- [ ] **Step 4: Delete `concepts/app/shell/appearance-dialog.html`**

```bash
git rm concepts/app/shell/appearance-dialog.html
```

- [ ] **Step 5: Edit `concepts/app/shell/shell.html`**

Remove the appearance-dialog include line:
```html
<!-- include: appearance-dialog.html -->
```

Add the profile page template include near the other page templates (alongside the customer/geo includes, e.g. after `<!-- include: ../pages/customers/dialogs.html -->`):
```html
<!-- include: ../pages/profile/templates.html -->
<!-- include: ../pages/profile/dialogs.html -->
```

In the `.user-pop` menu block, update the three relevant menuitems. Replace:
```html
              <button role="menuitem">
                <svg width="15" height="15" aria-hidden="true"><use href="#i-gear" /></svg> Account
                settings
              </button>
              <button role="menuitem" class="appearance-menu">
                <svg width="15" height="15" aria-hidden="true"><use href="#i-sun" /></svg>
                Appearance
              </button>
```
with:
```html
              <button role="menuitem" class="profile-menu" data-profile-section="profile">
                <svg width="15" height="15" aria-hidden="true"><use href="#i-user" /></svg>
                My Profile
              </button>
              <button role="menuitem" class="profile-menu" data-profile-section="account">
                <svg width="15" height="15" aria-hidden="true"><use href="#i-gear" /></svg> Account
                settings
              </button>
              <button role="menuitem" class="profile-menu" data-profile-section="appearance">
                <svg width="15" height="15" aria-hidden="true"><use href="#i-sun" /></svg>
                Appearance
              </button>
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test tests/profile-page.test.mjs`
Expected: PASS (11 tests)

- [ ] **Step 7: Commit**

```bash
git add concepts/app/shell/content.js concepts/app/shell/shell.html
git commit -m "feat: register profile content view, remove appearance dialog, update user menu"
```

---

## Task 10: main.js wiring

Import the new modules, construct `createProfile`, register it in `pageRegistry`, wire the topbar's `.profile-menu` buttons to navigate, and update the `createAppearanceControls` call site for its Task 4 signature change.

**Files:**
- Modify: `concepts/app/main.js`
- Modify: `concepts/app/shell/topbar.js`
- Test: `tests/profile-page.test.mjs` (append)

**Interfaces:**
- Consumes: `createProfile` (Task 8), `CURRENT_USER`/`LOGIN_LOG_ROWS`/`DEVICE_ROWS` (Task 1), `encodeHtml` (already imported in `main.js`), `syncAppearanceControls` (Task 4's renamed export).
- Produces: `main.js`'s `pageRegistry` Map gains `['profile', profile]`; `createTopbar(...)`'s call site drops `openAppearance` and gains a `navigateToProfileSection` callback.

- [ ] **Step 1: Write the failing test**

```js
test('main.js wires the profile page and topbar no longer opens an appearance dialog', async () => {
  const main = await readFile(new URL('../concepts/app/main.js', import.meta.url), 'utf8')
  assert.match(main, /import \{createProfile\} from '\.\/pages\/profile\/profile\.js'/)
  assert.match(main, /import \{CURRENT_USER, LOGIN_LOG_ROWS, DEVICE_ROWS\} from '\.\/prototype\/fixtures\/profile\.js'/)
  assert.match(main, /\['profile', profile\]/)
  assert.doesNotMatch(main, /openAppearance/)

  const topbar = await readFile(new URL('../concepts/app/shell/topbar.js', import.meta.url), 'utf8')
  assert.doesNotMatch(topbar, /openAppearance/)
  assert.match(topbar, /profile-menu/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/profile-page.test.mjs`
Expected: FAIL — imports/wiring absent

- [ ] **Step 3: Edit `concepts/app/shell/topbar.js`**

Replace the `createTopbar` parameter list — remove `openAppearance`, add `navigateToProfileSection`:
```js
export function createTopbar({toast, getSideCollapsed, getLaunchpadEnabled, closeAllMenus, openKbd, openCustomize, navigateToProfileSection} = {}) {
```

Replace the `.appearance-menu` wiring block:
```js
  document.querySelectorAll('.appearance-menu').forEach(b =>
    b.addEventListener('click', () => {
      closeAllMenus()
      openAppearance()
    })
  )
```
with:
```js
  document.querySelectorAll('.profile-menu').forEach(b =>
    b.addEventListener('click', () => {
      closeAllMenus()
      navigateToProfileSection(b.dataset.profileSection)
    })
  )
```

Update the `.mlist` click-close exclusion list (it currently excludes `.appearance-menu` from auto-close since that button used to open its own dialog rather than needing the menu closed twice — the new `.profile-menu` buttons should behave the same way, since `closeAllMenus()` is already called explicitly above):
```js
  document.querySelectorAll('.mlist').forEach(list =>
    list.addEventListener('click', e => {
      if (
        e.target.closest('button[role="menuitem"]') &&
        !e.target.closest('.help-kbd, .side-customize-menu, .fav-toggle-menu, .profile-menu')
      )
        closeAllMenus()
    })
  )
```

- [ ] **Step 4: Edit `concepts/app/main.js`** — imports

Add near the other fixture imports (after the `CUSTOMER_ROWS...` import line):
```js
import {CURRENT_USER, LOGIN_LOG_ROWS, DEVICE_ROWS} from './prototype/fixtures/profile.js'
```

Add near the other page-factory imports (after `import {createCustomers} from './pages/customers/customers.js'`):
```js
import {createProfile} from './pages/profile/profile.js'
```

- [ ] **Step 5: Edit `concepts/app/main.js`** — `createAppearanceControls` call site

Find the existing call (it currently reads `createAppearanceControls({createAppearance, trapFocus, releaseFocus, setLaunchpadEnabled})`, or equivalent with `...`-spread args — grep for `createAppearanceControls(` to find the exact current call). Update it to match Task 4's new parameter list (no `trapFocus`/`releaseFocus`):
```js
const appearanceControls = createAppearanceControls({createAppearance, setLaunchpadEnabled})
```

- [ ] **Step 6: Edit `concepts/app/main.js`** — construct `profile`

Add this construction near `const customers = createCustomers({...})` (after it, since `profile` does not depend on `customers`):
```js
const profile = createProfile({
  root: document.querySelector('.profile-view'),
  encodeHtml,
  currentUser: CURRENT_USER,
  loginLogRows: LOGIN_LOG_ROWS,
  deviceRows: DEVICE_ROWS,
  storage: sessionStorage,
  toast,
  trapFocus: dialogFocus.trapFocus,
  releaseFocus: dialogFocus.releaseFocus,
  syncAppearanceControls: () => appearanceControls.syncAppearanceControls(),
})
```

- [ ] **Step 7: Edit `concepts/app/main.js`** — register in `pageRegistry`

Find:
```js
  ['geo-record', geography.recordPage],
  ['email', email],
])
```
Replace with:
```js
  ['geo-record', geography.recordPage],
  ['email', email],
  ['profile', profile],
])
```

- [ ] **Step 8: Edit `concepts/app/main.js`** — `createTopbar` call site and navigation helper

Find the `createTopbar({...})` call (grep for `createTopbar(`) and add `navigateToProfileSection`, removing `openAppearance` if present there:
```js
const topbar = createTopbar({
  toast,
  getSideCollapsed,
  getLaunchpadEnabled,
  closeAllMenus: (...args) => menus.closeAllMenus(...args),
  openKbd,
  openCustomize,
  navigateToProfileSection: section => navigation.navigate('profile', {section}),
})
```

`navigation` is constructed later in the file (around the `pageRegistry`/`createNavigation` block) — since `createTopbar` is called before that point today, wrap the reference in a closure so it's bound lazily instead of read at call-construction time:
```js
  navigateToProfileSection: section => navigation.navigate('profile', {section}),
```
This is already lazy (arrow function body only reads `navigation` when invoked, not when `createTopbar` runs), so no further change is needed — `navigation` just needs to be declared with `const` before `topbar.bind()` is ever called by user interaction (it already is, since `bind()` fires on click, long after module-eval completes).

- [ ] **Step 9: Run test to verify it passes**

Run: `node --test tests/profile-page.test.mjs`
Expected: PASS (12 tests)

- [ ] **Step 10: Manual smoke check**

Run: `npm run dev` (from repo root), open the printed local URL, click the topbar avatar, click "My Profile", confirm the profile page renders with all six sections and the scroll-nav highlights "Profile". Click "Appearance" from the user menu again (reopen the dropdown) and confirm it jumps to and highlights the Appearance section. Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 11: Commit**

```bash
git add concepts/app/main.js concepts/app/shell/topbar.js tests/profile-page.test.mjs
git commit -m "feat: wire profile page into navigation and topbar user menu"
```

---

## Task 11: Playwright lifecycle spec

**Files:**
- Create: `tests/profile-lifecycle.spec.mjs`

**Interfaces:**
- Consumes: `boot`, `settle` from `tests/support/browser.mjs` (existing helpers — do not modify `browser.mjs`; this page is reached via the user-menu, not `openSurface`'s launchpad-tile mechanism, so the spec navigates via the avatar button directly).

- [ ] **Step 1: Write the spec**

```js
import {test, expect} from '@playwright/test';
import {boot, settle} from './support/browser.mjs';

async function openProfileSection(page, section) {
  await page.locator('.avatar-btn').click();
  await page.locator(`.profile-menu[data-profile-section="${section}"]`).click();
  await settle(page);
}

test.describe('profile page', () => {
  test('opens from the user menu and shows all six sections', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));

    await openProfileSection(page, 'profile');
    await expect(page.locator('.profile-view')).toBeVisible();
    await expect(page.locator('[data-profile-scroll-section]')).toHaveCount(6);
    await expect(errors).toEqual([]);
  });

  test('deep-links the Appearance section and highlights it as current', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'appearance');
    await expect(page.locator('[data-profile-scroll-section="appearance"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#appearance-custom-color')).toBeVisible();
  });

  test('change password dialog validates matching passwords', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'security');
    await page.locator('[data-profile-open-change-password]').click();
    await expect(page.locator('#change-password-scrim')).toHaveClass(/open/);
    await page.locator('#current-password').fill('oldpass123');
    await page.locator('#new-password').fill('newpassword1');
    await page.locator('#confirm-password').fill('doesNotMatch');
    await page.locator('#change-password-form button[type=submit]').click();
    await expect(page.locator('#change-password-error')).toHaveText(/do not match/);
    await page.locator('#confirm-password').fill('newpassword1');
    await page.locator('#change-password-form button[type=submit]').click();
    await expect(page.locator('#change-password-scrim')).not.toHaveClass(/open/);
    await expect(page.locator('.toast')).toContainText('Password changed');
  });

  test('signing out a non-current device removes it and persists across reload', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'sessions');
    const nonCurrentRow = page.locator('.profile-device-row', {hasNot: page.locator('[data-profile-current-device]')}).first();
    const deviceId = await nonCurrentRow.getAttribute('data-profile-device');
    await nonCurrentRow.locator('[data-profile-device-signout]').click();
    await expect(page.locator(`[data-profile-device="${deviceId}"]`)).toHaveCount(0);

    await page.reload();
    await settle(page);
    await openProfileSection(page, 'sessions');
    await expect(page.locator(`[data-profile-device="${deviceId}"]`)).toHaveCount(0);
  });

  test('current device has no sign-out control', async ({page}) => {
    await boot(page, (process.env.PARITY_URL ?? 'http://127.0.0.1:4173'));
    await openProfileSection(page, 'sessions');
    const currentRow = page.locator('.profile-device-row', {has: page.locator('[data-profile-current-device]')});
    await expect(currentRow.locator('[data-profile-device-signout]')).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Run the spec**

Run: `npm run build && npx playwright test tests/profile-lifecycle.spec.mjs`
Expected: PASS (5 tests). If `boot`/`settle` require a running preview server on `http://127.0.0.1:4173`, check `tests/parity.spec.mjs`'s `playwright.config` webServer setup — the existing `npm run build` + Playwright's own configured `webServer` (see `playwright.config.*` at repo root) should already start it; do not hand-start a server if the config does so automatically.

- [ ] **Step 3: Commit**

```bash
git add tests/profile-lifecycle.spec.mjs
git commit -m "test: add profile page lifecycle spec"
```

---

## Self-Review Notes

- **Spec coverage:** All six sections (Task 7), navigation entry points (Tasks 9–10), Appearance dialog removal (Tasks 4/9), security dialogs (Task 5), sessions/devices with sessionStorage persistence (Task 6), current-device no-signout rule (Task 6 + Task 11 test), plain-table constraint (Task 6, no `createDataList` import), Scroll Navigator layout (Task 3) are each covered by a task.
- **Type/name consistency checked:** `PROFILE_SECTION_ORDER`/`PROFILE_SECTIONS` (Task 2) are the exact names Tasks 3, 7, 8 import. `renderProfileScrollNav`/`createProfileScrollNavigator` (Task 3) match Task 8's imports. `renderProfileSections`/`renderProfileIdentityHeader` (Task 7) match Task 8's imports. `renderLoginLogTable`/`createDeviceList` (Task 6) match Task 8's imports. `createSecurityDialogs` (Task 5) matches Task 8's import and usage. `syncAppearanceControls` (Task 4's rename) is threaded through Task 8's `createProfile` params and Task 10's `main.js` wiring consistently.
- **No placeholders:** every step has complete, runnable code — no "add appropriate X" left unfilled.
