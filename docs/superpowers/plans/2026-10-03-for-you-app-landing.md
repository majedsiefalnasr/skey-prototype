# For You App Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every app-switching entry point (launchpad tiles, topbar switcher rows, sidebar rail app icons) opens that app's For You landing screen at the app's own base path, with inner screens nested under the owning app and shell screens under `/system`.

**Architecture:** One parameterized `foryou` page (the renamed dashboard page) renders a generic For You landing (breadcrumbs `Home › <App>`, heading "For You", subtitle from `NAV_APP_META[app].description`, same KPI cards). `core/routes.js` grows explicit app-base/area/shell path tables (26 route paths). Boot, popstate, launchpad hide, and `setNavCurrent` all speak `{id: 'foryou', data: {app}}` route plans.

**Tech Stack:** Native ES modules, authored HTML templates, `node --test` unit tests, Playwright e2e. No framework/bundler.

**Spec:** `docs/superpowers/specs/2026-10-03-for-you-app-landing-design.md` (approved).

## Global Constraints

- URL scheme (locked): 20 app base paths from `APP_PATH_BY_LABEL` (dash-case slugs, `Fixed Assests System` → `/fixed-assests-system` keeps the label typo); inner paths `/sales-systems-management/sales-invoices`, `/customers/list`, `/system-setup/geographical-structure`; shell screens `/system/profile` (keeps `?section=`), `/system/organization`, `/system/email`. Old flat paths `/invoices /customers /geography /email /profile /organization /dashboard`-as-screen are removed — **no aliases**. `/system` alone is not a route (parses `null`).
- `/customers` changes meaning: it was the customers list, it becomes the Customers app's For You base; the list lives at `/customers/list`.
- All app-switching entry points open For You: launchpad tiles, topbar switcher rows, sidebar rail app icons (per-`opts` gated, `withForYou`). Quick-list tags (NAV_FAVORITES/NAV_RECENTS) keep opening list screens. The sidebar rail "For You" custom-groups icon keeps opening its groups panel. The panel's pinned "For You" row lands on the current app's For You screen.
- Landing-page-content displacement, `/kit-pill` z-index, and the Organization "Operational status" card are out of scope (flagged separately).
- Placeholder surfaces (search palette, un-leafed nav labels) stay unrouted.
- The legacy `/concepts/app-shell.html` document must keep working unchanged and must never change its own URL (`routingEnabled` guard semantics preserved).
- Unit tests are the gate for Tasks 1–4 (`npm run test:unit`); e2e runs from Task 5 onward. Never run two Playwright invocations in parallel; temp Playwright probes only as `tests/*.spec.mjs` and deleted after use.
- **Commits:** run each task's commit step ONLY after the user has explicitly approved committing (standing rule); otherwise leave changes staged-free and continue.

---

### Task 1: routes.js v2 — app-base, area, and shell path tables

**Files:**
- Modify: `concepts/app/core/routes.js` (full rewrite of the tables + parse/format)
- Test: `tests/routes.test.mjs` (full rewrite)

**Interfaces:**
- Consumes: nothing (pure module).
- Produces: `parse(pathname, search)` → `{defaultEntry:true}` | `{id:'foryou', data:{app}}` | `{id, data}` | `null`; `format(id, data)` → path string | `null`; `resolveDefaultEntry({launchpadEnabled})` → `{kind:'launchpad'}` | `{id:'foryou', data:{app:'Dashboard'}}`; exports `APP_PATH_BY_LABEL`, `APP_LABEL_BY_PATH`, `PATH_BY_VIEW`, `ROUTE_PATHS` (26 paths). Later tasks import `APP_PATH_BY_LABEL` only via `routes.js` consumers (home/sidebar/main use the id `{id:'foryou', data:{app}}` shape directly).

- [ ] **Step 1: Write the failing unit tests**

Replace `tests/routes.test.mjs` entirely with:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import {parse, format, resolveDefaultEntry, ROUTE_PATHS, APP_PATH_BY_LABEL} from '../concepts/app/core/routes.js'

test('routes: paths this app does not own parse to null (legacy/unknown entry)', () => {
  assert.equal(parse('/concepts/app-shell.html'), null)
  assert.equal(parse('/some/unknown/path'), null)
  assert.equal(parse('/deck/'), null)
  assert.equal(parse('/system'), null)
  assert.equal(parse('/vendors/unknown'), null)
  // v1 flat paths stay retired — no aliases.
  assert.equal(parse('/invoices'), null)
  assert.equal(parse('/geography'), null)
  assert.equal(parse('/email'), null)
  assert.equal(parse('/profile'), null)
  assert.equal(parse('/organization'), null)
})

test('routes: the default entry parses as defaultEntry and nothing else does', () => {
  assert.deepEqual(parse('/'), {defaultEntry: true})
  for (const route of ROUTE_PATHS) {
    assert.notDeepEqual(parse(route), {defaultEntry: true})
  }
})

test('routes: every app base parses to that app\u2019s For You screen', () => {
  assert.equal(Object.keys(APP_PATH_BY_LABEL).length, 20)
  for (const [label, path] of Object.entries(APP_PATH_BY_LABEL)) {
    assert.deepEqual(parse(path), {id: 'foryou', data: {app: label}}, `${path} must map to ${label}`)
  }
})

test('routes: inner screens and shell screens parse to their views', () => {
  assert.deepEqual(parse('/sales-systems-management/sales-invoices'), {id: 'list', data: {}})
  assert.deepEqual(parse('/customers/list'), {id: 'customers-list', data: {}})
  assert.deepEqual(parse('/system-setup/geographical-structure'), {id: 'geo-list', data: {}})
  assert.deepEqual(parse('/system/email'), {id: 'email', data: {}})
  assert.deepEqual(parse('/system/profile'), {id: 'profile', data: {}})
  assert.deepEqual(parse('/system/organization'), {id: 'organization', data: {}})
})

test('routes: trailing slashes and query-free lookups normalize', () => {
  assert.deepEqual(parse('/dashboard/'), {id: 'foryou', data: {app: 'Dashboard'}})
  assert.deepEqual(parse('/system/profile/'), {id: 'profile', data: {}})
  assert.deepEqual(parse('customers'), parse('/customers'))
})

test('routes: profile and organization carry validated section queries', () => {
  assert.deepEqual(parse('/system/profile', '?section=account'), {id: 'profile', data: {section: 'account'}})
  assert.deepEqual(parse('/system/organization', '?section=users'), {
    id: 'organization',
    data: {section: 'users'},
  })
  assert.deepEqual(parse('/system/profile', '?section=bad value'), {id: 'profile', data: {}})
  assert.deepEqual(parse('/system/profile', '?section='), {id: 'profile', data: {}})
  assert.deepEqual(parse('/system/profile', '?other=x'), {id: 'profile', data: {}})
})

test('routes: format maps views to their canonical URL', () => {
  assert.equal(format('foryou', {app: 'Dashboard'}), '/dashboard')
  assert.equal(format('foryou', {app: 'Car rent system'}), '/car-rent-system')
  assert.equal(format('foryou'), '/dashboard')
  assert.equal(format('foryou', {app: 'Not An App'}), '/dashboard')
  assert.equal(format('list'), '/sales-systems-management/sales-invoices')
  assert.equal(format('record'), '/sales-systems-management/sales-invoices')
  assert.equal(format('customers-list'), '/customers/list')
  assert.equal(format('customer-record'), '/customers/list')
  assert.equal(format('geo-list'), '/system-setup/geographical-structure')
  assert.equal(format('geo-record'), '/system-setup/geographical-structure')
  assert.equal(format('email'), '/system/email')
  assert.equal(format('profile'), '/system/profile')
  assert.equal(format('organization'), '/system/organization')
  assert.equal(format('launchpad'), '/')
})

test('routes: format round-trips parse for every routed path', () => {
  assert.equal(ROUTE_PATHS.length, 26)
  for (const route of ROUTE_PATHS) {
    const parsed = parse(route)
    assert.notEqual(parsed, null, `${route} must parse`)
    assert.equal(format(parsed.id, parsed.data), route, `${route} must round-trip`)
  }
})

test('routes: format returns null for unrouted views and drops invalid sections', () => {
  assert.equal(format('not-a-view'), null)
  assert.equal(format('profile', {section: 'bad value'}), '/system/profile')
  assert.equal(format('profile', {}), '/system/profile')
  assert.equal(format('profile', {section: 'account'}), '/system/profile?section=account')
})

test('routes: the default entry resolves launchpad-vs-Dashboard-For-You from configuration only', () => {
  assert.deepEqual(resolveDefaultEntry({launchpadEnabled: true}), {kind: 'launchpad'})
  assert.deepEqual(resolveDefaultEntry({launchpadEnabled: false}), {
    id: 'foryou',
    data: {app: 'Dashboard'},
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:unit`
Expected: FAIL — `parse is not a function`-style errors / old assertions mismatch (`APP_PATH_BY_LABEL` not exported).

- [ ] **Step 3: Rewrite `concepts/app/core/routes.js`**

```js
// URL <-> prototype-view mapping. Pure and deterministic: parsing and
// formatting never read configuration; the separate resolveDefaultEntry()
// step is the ONLY place launchpad-vs-landing configuration is consulted,
// and it applies only to '/'.
//
// App-scoped URL scheme: each of the 20 sidebar apps owns a dash-case base
// path that lands on its For You screen ({id: 'foryou', data: {app}});
// inner screens nest under their owning app, shell screens live under
// /system, and no record ids appear in URLs.

/** App label -> its base path (parse/format both sides). Explicit table:
 *  slugs are dash-case of the label, exact (label typo included). */
export const APP_PATH_BY_LABEL = {
  Dashboard: '/dashboard',
  Customers: '/customers',
  Vendors: '/vendors',
  'Inventory Systems Management': '/inventory-systems-management',
  'Sales Systems Management': '/sales-systems-management',
  'Purchase Systems Management': '/purchase-systems-management',
  'POS System Management': '/pos-system-management',
  'Finance and Accounting': '/finance-and-accounting',
  'Human Capital Management': '/human-capital-management',
  'Fixed Assests System': '/fixed-assests-system',
  'Manufacturing Resource Planning': '/manufacturing-resource-planning',
  'Real Estate Management System': '/real-estate-management-system',
  'Maintenance Workshop System': '/maintenance-workshop-system',
  'Customer Relations Management': '/customer-relations-management',
  'Hospital Management': '/hospital-management',
  'Car rent system': '/car-rent-system',
  Reports: '/reports',
  'System Administration': '/system-administration',
  'System Setup': '/system-setup',
  'Help Screens': '/help-screens',
}

/** Base path -> app label (parse target for For You landings). */
export const APP_LABEL_BY_PATH = Object.fromEntries(
  Object.entries(APP_PATH_BY_LABEL).map(([label, path]) => [path, label])
)

/** Areas that carry a `?section=` sub-selection. */
const SECTION_VIEWS = new Set(['profile', 'organization'])

/** Inner screen paths -> their routed view (nested under the owning app). */
const AREA_VIEW_BY_PATH = {
  '/sales-systems-management/sales-invoices': 'list',
  '/customers/list': 'customers-list',
  '/system-setup/geographical-structure': 'geo-list',
}

/** Shell screens under the /system namespace. */
const SHELL_VIEW_BY_PATH = {
  '/system/profile': 'profile',
  '/system/organization': 'organization',
  '/system/email': 'email',
}

/** Canonical path per routed view (format() target). The foryou view is
 *  app-scoped and formats through APP_PATH_BY_LABEL instead. */
export const PATH_BY_VIEW = {
  launchpad: '/',
  list: '/sales-systems-management/sales-invoices',
  record: '/sales-systems-management/sales-invoices',
  'customers-list': '/customers/list',
  'customer-record': '/customers/list',
  'geo-list': '/system-setup/geographical-structure',
  'geo-record': '/system-setup/geographical-structure',
  email: '/system/email',
  profile: '/system/profile',
  organization: '/system/organization',
}

/** Emitted as `<path>/index.html` route folders by scripts/build.mjs.
 *  20 app bases + 3 inner paths + 3 shell paths = 26. */
export const ROUTE_PATHS = [
  ...new Set([
    ...Object.values(APP_PATH_BY_LABEL),
    ...Object.values(PATH_BY_VIEW).filter(path => path !== '/'),
    ...Object.keys(SHELL_VIEW_BY_PATH),
  ]),
]

const SECTION_PATTERN = /^[a-z0-9-]+$/i

/** Strip a trailing slash (except for '/' itself) and force a leading '/'. */
function normalizePath(pathname) {
  const raw = typeof pathname === 'string' && pathname ? pathname : '/'
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`
  if (withLeading.length > 1 && withLeading.endsWith('/')) {
    return withLeading.replace(/\/+$/, '') || '/'
  }
  return withLeading
}

function planForView(id, search) {
  if (!SECTION_VIEWS.has(id)) return {id, data: {}}
  const section = new URLSearchParams(search).get('section')
  return section && SECTION_PATTERN.test(section)
    ? {id, data: {section}}
    : {id, data: {}}
}

/**
 * Map a browser URL to a route. Returns:
 * - `null` for paths this app does not own (legacy entry documents,
 *   unknown paths, `/system` alone) — callers keep today's boot behavior;
 * - `{defaultEntry: true}` for '/', resolved via resolveDefaultEntry();
 * - `{id: 'foryou', data: {app}}` for an app base path;
 * - `{id, data}` for a known inner/shell screen.
 * @param {string} pathname
 * @param {string} [search]
 */
export function parse(pathname, search = '') {
  const path = normalizePath(pathname)
  if (path === '/') return {defaultEntry: true}
  const shellId = SHELL_VIEW_BY_PATH[path]
  if (shellId) return planForView(shellId, search)
  const areaId = AREA_VIEW_BY_PATH[path]
  if (areaId) return {id: areaId, data: {}}
  const app = APP_LABEL_BY_PATH[path]
  if (app) return {id: 'foryou', data: {app}}
  return null
}

/**
 * Map a view id (+ navigation data) back to its URL, or `null` when the
 * view is not routed. The foryou view formats through its app's base path
 * (unknown/missing app falls back to the default entry's app). Within an
 * area (list <-> record) the formatted path is identical, so callers that
 * dedupe on the formatted value create no history entry for in-area
 * transitions.
 * @param {string} id
 * @param {{app?: string, section?: string}} [data]
 * @returns {string|null}
 */
export function format(id, data) {
  if (id === 'foryou') {
    const app = data && typeof data.app === 'string' ? data.app : null
    return APP_PATH_BY_LABEL[app] ?? APP_PATH_BY_LABEL.Dashboard
  }
  const path = PATH_BY_VIEW[id]
  if (path == null) return null
  if (SECTION_VIEWS.has(id) && data && data.section && SECTION_PATTERN.test(data.section)) {
    return `${path}?section=${encodeURIComponent(data.section)}`
  }
  return path
}

/**
 * The configured application entry for the default-entry route ('/'):
 * the Launchpad overlay when enabled, otherwise the Dashboard app's
 * For You landing. This is the only decision point between Launchpad
 * and landing.
 * @param {{launchpadEnabled: boolean}} config
 * @returns {{kind: 'launchpad'}|{id: string, data: object}}
 */
export function resolveDefaultEntry({launchpadEnabled}) {
  return launchpadEnabled
    ? {kind: 'launchpad'}
    : {id: 'foryou', data: {app: 'Dashboard'}}
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS. Note: `tests/build.test.mjs` iterates `ROUTE_PATHS` dynamically and will now assert 26 route folders — it passes because the build emits them. **The browser app itself is not wired for `foryou` yet; e2e is intentionally deferred to Task 5.** Do not run Playwright now.

- [ ] **Step 5: Commit (only after the user says the word)**

```bash
git add concepts/app/core/routes.js tests/routes.test.mjs
git commit -m "feat: map app-scoped for-you urls in routes"
```

---

### Task 2: For You page — rename dashboard page, parameterize content, register the view

**Files:**
- Rename: `concepts/app/pages/dashboard/dashboard.js` → `concepts/app/pages/for-you/for-you.js`
- Rename: `concepts/app/pages/dashboard/templates.html` → `concepts/app/pages/for-you/templates.html`
- Modify: `concepts/app/pages/invoices/templates.html:682` (include path)
- Modify: `concepts/app/shell/shell.js:45` (template name)
- Modify: `concepts/app/shell/content.js:20,52` (view selectors)
- Modify: `concepts/app/core/navigation.js:6` (PageId typedef)
- Modify: `concepts/app/main.js:25,573,738,754` (import, factory, recordRoots filter, registry)

**Interfaces:**
- Consumes: `{id: 'foryou', data: {app}}` route plans from Task 1.
- Produces: page object registered as `'foryou'` with `activate({app})` that stamps the breadcrumb app name and subtitle; DOM hooks `[data-foryou-app]` (crumb span) and `[data-foryou-subtitle]` (subtitle `<p>`); template class `.foryou-tpl`, root `.foryou-view`.

- [ ] **Step 1: Move the page files**

```bash
git mv concepts/app/pages/dashboard concepts/app/pages/for-you
git mv concepts/app/pages/for-you/dashboard.js concepts/app/pages/for-you/for-you.js
```

- [ ] **Step 2: Rewrite `concepts/app/pages/for-you/for-you.js`**

```js
import {NAV_APP_META} from '../../prototype/fixtures/navigation.js'

/** Owns the For You landing screen — the app-scoped parameterization of
 *  the old Dashboard view. Static markup, cloned into the content host once
 *  at shell construction; activate({app}) stamps the per-app breadcrumb and
 *  subtitle, attachAndShowView toggles visibility. */
export function createForYou({t}) {
  let root = null
  const view = () => (root = root || document.querySelector('.foryou-view'))

  return {
    id: 'foryou',
    get roots() {
      const el = view()
      return el ? [el] : []
    },
    activate({app} = {}) {
      const el = view()
      if (!el) return
      const name = app || 'Dashboard'
      const meta = NAV_APP_META[name]
      const description = meta ? meta.description : 'Overview and key activity'
      const crumb = el.querySelector('[data-foryou-app]')
      const subtitle = el.querySelector('[data-foryou-subtitle]')
      /* data-i18n carries the English key so locale switches re-translate
         the dynamic strings exactly like static ones. */
      if (crumb) {
        crumb.dataset.i18n = name
        crumb.textContent = t(name)
      }
      if (subtitle) {
        subtitle.dataset.i18n = description
        subtitle.textContent = t(description)
      }
    },
    deactivate() {},
    dispose() {
      root = null
    },
  }
}
```

- [ ] **Step 3: Rewrite `concepts/app/pages/for-you/templates.html`**

```html
<template class="foryou-tpl">
  <div
    class="foryou-view [&:not([hidden])]:flex [&:not([hidden])]:[flex:1] [&:not([hidden])]:min-h-0 [&:not([hidden])]:flex-col"
    hidden>
    <div class="flex min-h-0 flex-1 flex-col overflow-auto pb-6">
      <div class="px-4 pt-4">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="#" data-i18n="Home">Home</a><span class="sep">›</span
          ><span aria-current="page" data-foryou-app data-i18n="Dashboard">Dashboard</span>
        </nav>
        <div class="mt-2">
          <h1 class="text-[20px] font-semibold leading-tight text-ink" data-i18n="For You">
            For You
          </h1>
          <p
            class="mt-0.5 text-[13px] text-muted"
            data-foryou-subtitle
            data-i18n="Overview and key activity"
          >
            Overview and key activity
          </p>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-lg border border-line bg-surface p-4">
          <div class="text-[12px] font-medium text-muted" data-i18n="Revenue this month">
            Revenue this month
          </div>
          <div class="mt-1.5 text-[22px] font-semibold text-ink">1,284,500</div>
          <div class="mt-1 text-[11.5px] font-medium">
            <span dir="ltr" class="text-[color:var(--success)]">+12.4%</span>
          </div>
        </div>
        <div class="rounded-lg border border-line bg-surface p-4">
          <div class="text-[12px] font-medium text-muted" data-i18n="Open invoices">
            Open invoices
          </div>
          <div class="mt-1.5 text-[22px] font-semibold text-ink">342</div>
          <div class="mt-1 text-[11.5px] font-medium">
            <span dir="ltr" class="text-[color:var(--success)]">+3.1%</span>
          </div>
        </div>
        <div class="rounded-lg border border-line bg-surface p-4">
          <div class="text-[12px] font-medium text-muted" data-i18n="Active customers">
            Active customers
          </div>
          <div class="mt-1.5 text-[22px] font-semibold text-ink">1,128</div>
          <div class="mt-1 text-[11.5px] font-medium">
            <span dir="ltr" class="text-[color:var(--success)]">+1.8%</span>
          </div>
        </div>
        <div class="rounded-lg border border-line bg-surface p-4">
          <div class="text-[12px] font-medium text-muted" data-i18n="Items in stock">
            Items in stock
          </div>
          <div class="mt-1.5 text-[22px] font-semibold text-ink">8,412</div>
          <div class="mt-1 text-[11.5px] font-medium">
            <span dir="ltr" class="text-[color:var(--danger)]">-4.2%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Point the include chain at the new template**

In `concepts/app/pages/invoices/templates.html:682`, replace `<!-- include: ../dashboard/templates.html -->` with `<!-- include: ../for-you/templates.html -->` (the line is one long concatenated include chain — change only that segment).

- [ ] **Step 5: Update `concepts/app/shell/shell.js:45`**

```js
    pageContent.append(d.querySelector('.foryou-tpl').content.cloneNode(true))
```

- [ ] **Step 6: Update both selector maps in `concepts/app/shell/content.js`**

Line ~20 (inside `currentSkeletonContainer`):

```js
      foryou: '.foryou-view:not([hidden])',
```

Line ~52 (inside `attachAndShowView`):

```js
      foryou: '.foryou-view',
```

(Remove the `dashboard:` entries from both maps; keep every other key.)

- [ ] **Step 7: Update the PageId typedef in `concepts/app/core/navigation.js:6`**

```js
// @typedef {'record'|'list'|'customers-list'|'customer-record'|'geo-list'|'geo-record'|'email'|'profile'|'organization'|'foryou'|'launchpad'} PageId
```

- [ ] **Step 8: Wire the page in `concepts/app/main.js`**

1. Line 25 — import:

```js
import {createForYou} from './pages/for-you/for-you.js'
```

2. Line 573 — factory:

```js
const forYou = createForYou({t})
```

3. Line 738 — recordRoots filter: replace `.dashboard-view` with `.foryou-view` inside the `.matches(...)` list.

4. Line 754 — registry entry:

```js
  ['foryou', forYou],
```

- [ ] **Step 9: Run the gates**

Run: `npm run test:unit`
Expected: PASS (routes + build tests; build now emits the 26 folders and `tests/build.test.mjs` iterates them dynamically).

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 10: Commit (only after the user says the word)**

```bash
git add -A concepts/app/pages tests
git commit -m "feat: parameterize the dashboard view into the for-you landing"
```

---

### Task 3: App-switching entry points open For You (+ hide targetRoute generalization)

**Files:**
- Modify: `concepts/app/shell/sidebar.js:78-106` (`setNavCurrent`), `:204` (row label), `:223-241` (`activate`), `:253-273` (railIcon click), `:334-344` (`activateByLabel`)
- Modify: `concepts/app/pages/home/home.js:3-23` (signature), `:30-35` (delete `openLaunchpadListDestination`), `:208-224` (`hideLaunchpad` rename), `:438-445` (quick tag handler), `:486-490` (tile click), `:541-550` (switcher row click)
- Modify: `concepts/app/main.js:170-174` (`onLaunchpadHide`), `:776-778` (`showContentView` data arg), `:236` (pass `openForYou` to `createHome`)

**Interfaces:**
- Consumes: page registry entry `'foryou'` + `activate({app})` (Task 2).
- Produces: `createHome({openForYou})` where `openForYou(app: string)` highlights the app and navigates; `hideLaunchpad(frame, {restoreFocus, targetRoute})` where `targetRoute` is a view-name string OR a `{id, data}` plan; `root.activateByLabel(label, {targetRoute})`; `setNavCurrent(root, 'For You')` navigates to the current app's For You.

- [ ] **Step 1: `sidebar.js` — `setNavCurrent` (lines 78-106)**

Replace the whole function with:

```js
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
      label === 'For You' ? (findNavGroup(currentAppLabel)?.[0] ?? 'Dashboard') : null
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
```

- [ ] **Step 2: `sidebar.js` — pinned row label (line 204)**

```js
      if (withForYou) body.appendChild(ncBuildItem('For You', 0, root))
```

- [ ] **Step 3: `sidebar.js` — `activate` returns whether it opened, forwards `targetRoute` (lines 223-241)**

```js
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
```

- [ ] **Step 4: `sidebar.js` — railIcon click navigates app icons to For You (lines ~267-271)**

```js
      btn.addEventListener('click', e => {
        const opened = activate(btn, group, {
          ...opts,
          ...(opts?.withForYou ? {targetRoute: {id: 'foryou', data: {app: label}}} : {}),
        })
        if (opened && opts?.withForYou) openForYou(label)
        if (e.detail > 0) btn.blur()
      })
```

In `concepts/app/main.js:221`, add the forwarding prop to the `createSidebar({...})` call, right after `getShowContentView`:

```js
  openForYou: (...args) => openForYou(...args),
```

(`openForYou` is defined in Step 8; the arrow evaluates it at click time, so declaration order is irrelevant. Also add `openForYou` to `createSidebar`'s destructured parameter list in `concepts/app/shell/sidebar.js`.)

- [ ] **Step 5: `sidebar.js` — `activateByLabel` accepts a targetRoute (lines 334-344)**

```js
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
```

- [ ] **Step 6: `main.js` — `onLaunchpadHide` accepts view names or route plans (lines 170-174)**

```js
const onLaunchpadHide = target => {
  if (!booted || handlingPop || location.pathname !== '/') return
  /* `target` is either the view revealed underneath (name, resolved with
     the last navigation data) or the {id, data} route plan the caller
     navigated to (app-scoped For You targets). */
  const plan =
    target && typeof target === 'object'
      ? target
      : {id: target ?? contentHost.getCurrentContentViewName(), data: lastNavData}
  const path = formatRouteUrl(plan.id, plan.data)
  if (path != null && path !== '/') pushRoute(path)
}
```

- [ ] **Step 7: `main.js` — `showContentView` forwards navigation data (lines 776-778)**

```js
showContentView = (name, data) => {
  navigation.navigate(name, data)
}
```

- [ ] **Step 8: `main.js` — define `openForYou` and pass it to `createHome`**

Place next to the other navigation helpers (right before the `const home = createHome({...})` call at line ~236):

```js
const openForYou = app => {
  /* Highlight the app's rail/panel state exactly like v1's setNavCurrent
     did for the Dashboard tile, then navigate to its For You landing. */
  sidebar.applyNavCurrent(document.querySelector('.side'), app)
  showContentView('foryou', {app})
}
```

In the `createHome({...})` call (line 236), add after `onLaunchpadShow, onLaunchpadHide`:

```js
  openForYou: (...args) => openForYou(...args),
```

In `concepts/app/pages/home/home.js`, add `openForYou` to the destructured `createHome({...})` parameter list (after `onLaunchpadHide`).

- [ ] **Step 9: `home.js` — delete `openLaunchpadListDestination` (lines 30-35), inline its fallback as the quick-tag handler**

Delete the function. Replace the quick-tag click handler body (lines ~438-445):

```js
          launchpadTag(name, list.icon, list.cls, () => {
            /* the rail only has icons for top-level NAV_TREE groups — a leaf like
               "Sales Invoice" needs its parent group's icon activated first so the
               panel renders the leaf, then setNavCurrent highlights the leaf itself
               and switches the content view, same as clicking it in the panel would */
            const group = findNavGroup(name)
            if (group) side.querySelector('.nc2').activateByLabel(group[0])
            setNavCurrent(side, name)
          })
```

- [ ] **Step 10: `home.js` — app tiles open For You (lines ~486-490)**

```js
      const tile = launchpadTile(
        group[0],
        NAV_ICONS[group[0]] || 'i-doc',
        () => {
          side
            .querySelector('.nc2')
            .activateByLabel(group[0], {targetRoute: {id: 'foryou', data: {app: group[0]}}})
          openForYou(group[0])
        },
        {current: mode === 'switcher' && group[0] === getCurrentApp()}
      )
```

- [ ] **Step 11: `home.js` — switcher rows open For You (lines ~541-550)**

```js
      row.addEventListener(
        'click',
        () => {
          side
            .querySelector('.nc2')
            .activateByLabel(label, {targetRoute: {id: 'foryou', data: {app: label}}})
          openForYou(label)
          rows
            .querySelectorAll('.app-switcher-row')
            .forEach(r => r.classList.toggle('active', r.dataset.label === label))
          closeAllMenus()
        },
        {signal: pageAbort.signal}
      )
```

- [ ] **Step 12: `home.js` — rename `targetView` to `targetRoute` in `hideLaunchpad` (lines 208, 222)**

```js
  function hideLaunchpad(frame, {restoreFocus = false, targetRoute = null} = {}) {
```

and inside it:

```js
    onLaunchpadHide?.(targetRoute || undefined)
```

(`sidebar.js` line 103 already passes `targetRoute` from Step 1; all other callers pass no target.)

- [ ] **Step 13: Run the gates**

Run: `npm run test:unit`
Expected: PASS.

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 14: Commit (only after the user says the word)**

```bash
git add concepts/app
git commit -m "feat: open for-you landings from app switchers"
```

---

### Task 4: Boot and history know the For You landing

**Files:**
- Modify: `concepts/app/main.js:121-126` (`NAV_ITEM_LABEL_BY_ID`), `:783-793` (boot dispatch), `:804-824` (`applyRoutePlan`)
- Modify: `concepts/app/core/navigation.js:7` (`NavigationData` typedef)

**Interfaces:**
- Consumes: `openForYou`/`activateByLabel`/`applyNavCurrent` from Task 3; `resolveDefaultEntry` + `parse` returning `foryou` plans from Task 1.
- Produces: boot at an app base (or launchpad-disabled `/`) selects the app in the rail and lands on its For You; popstate to a foryou URL re-selects the app; `NavigationData` documents the `app` field.

- [ ] **Step 1: `main.js` — drop the dead dashboard entry (lines 121-126)**

```js
const NAV_ITEM_LABEL_BY_ID = {
  list: 'Sales Invoice',
  'customers-list': 'Customers',
  'geo-list': 'Geographical Structure',
}
```

- [ ] **Step 2: `main.js` — boot dispatch handles `foryou` (insert before the `NAV_ITEM_LABEL_BY_ID` branch at line ~787)**

```js
if (bootRoute === null || (bootRoute.defaultEntry && getLaunchpadEnabled())) {
  // Legacy entry document, and the launchpad flavor of the default entry:
  // exactly today's boot navigation (record under the Launchpad overlay,
  // or the auto-nav microtask to the invoice list when the overlay is off).
  navigation.navigate(contentHost.getCurrentContentViewName())
} else if (bootPlan.id === 'foryou' && bootPlan.data?.app) {
  // App landing: select the app in the rail/panel (so highlight, current-app
  // state, and the panel's For You row agree), then show its For You screen.
  const side = document.querySelector('.side')
  const appRoute = {id: 'foryou', data: {app: bootPlan.data.app}}
  side.querySelector('.nc2')?.activateByLabel(bootPlan.data.app, {targetRoute: appRoute})
  sidebar.applyNavCurrent(side, bootPlan.data.app)
  navigation.navigate('foryou', bootPlan.data)
} else if (NAV_ITEM_LABEL_BY_ID[bootPlan.id]) {
  // Routed screens that live on the sidebar rail boot through setNavCurrent
  // so the highlight and the view come up together.
  sidebar.setNavCurrent(document.querySelector('.side'), NAV_ITEM_LABEL_BY_ID[bootPlan.id])
} else {
  // profile / organization / email — no rail item, navigate directly.
  navigation.navigate(bootPlan.id, bootPlan.data)
}
```

- [ ] **Step 3: `main.js` — `applyRoutePlan` re-selects the app and compares it for `sameView` (lines ~804-824)**

```js
const applyRoutePlan = async plan => {
  if (plan.kind === 'launchpad') {
    const fbody = document.querySelector('.fbody')
    if (!fbody) return true
    const frame = fbody.closest('.frame')
    if (frame?.querySelector('.lp-view:not([hidden])')) return true
    return showLaunchpad(fbody, {mode: 'home'}) !== false
  }
  const overlayFrame = document.querySelector('.lp-view:not([hidden])')?.closest('.frame')
  if (overlayFrame) hideLaunchpad(overlayFrame)
  const label = NAV_ITEM_LABEL_BY_ID[plan.id]
  if (label) sidebar.applyNavCurrent(document.querySelector('.side'), label)
  const sameView =
    navigation.current() === plan.id &&
    (lastNavData?.section ?? undefined) === (plan.data?.section ?? undefined) &&
    (plan.id !== 'foryou' || (lastNavData?.app ?? undefined) === (plan.data?.app ?? undefined))
  if (sameView) return true
  if (plan.id === 'foryou' && plan.data?.app) {
    /* Re-select the app so the rail icon, panel, and current-app state
       follow the URL, not just the content view. */
    const side = document.querySelector('.side')
    const appRoute = {id: 'foryou', data: {app: plan.data.app}}
    side.querySelector('.nc2')?.activateByLabel(plan.data.app, {targetRoute: appRoute})
    sidebar.applyNavCurrent(side, plan.data.app)
  }
  const allowed = await navigation.navigate(plan.id, plan.data)
  if (!allowed) {
    const currentLabel = NAV_ITEM_LABEL_BY_ID[navigation.current()]
    if (currentLabel) sidebar.applyNavCurrent(document.querySelector('.side'), currentLabel)
  }
  return allowed
}
```

- [ ] **Step 4: `navigation.js:7` — document the app field**

```js
// @typedef {{key?: string, mode?: string, messageId?: string, section?: string, app?: string}} NavigationData
```

- [ ] **Step 5: Run the gates**

Run: `npm run test:unit`
Expected: PASS.

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 6: Commit (only after the user says the word)**

```bash
git add concepts/app/main.js concepts/app/core/navigation.js
git commit -m "feat: boot and restore for-you app landings"
```

---

### Task 5: Rewrite the routing e2e suite for the app-scoped scheme

**Files:**
- Test: `tests/routing.spec.mjs` (full rewrite)

**Interfaces:**
- Consumes: everything from Tasks 1–4 running in the browser (dev server on 4173; `node scripts/dev.mjs` already running — restart if needed).
- Produces: green e2e coverage of app bases, inner/shell paths, entry points, Back/Forward, guard, `?section=`.

- [ ] **Step 1: Write the new suite (failing first)**

Replace `tests/routing.spec.mjs` entirely with:

```js
import {test, expect} from '@playwright/test';
import {settle} from './support/browser.mjs';

// For You routing: every app owns a base path that lands on its For You
// screen, inner screens nest under the owning app, shell screens live
// under /system, every app-switching entry point opens For You, and
// Back/Forward keeps app switches honest. These tests boot by deep-linking
// directly — unlike boot(), which always enters through the legacy
// /concepts/app-shell.html document (kept working for the parity suite).

const baseURL = () => process.env.PARITY_URL ?? 'http://127.0.0.1:4173';

const pathOf = url => new URL(url).pathname;

async function gotoRoute(page, path) {
  await page.goto(`${baseURL()}${path}`);
  const simulateLoading = page.locator('#simulate-loading');
  if (await simulateLoading.isChecked()) {
    await simulateLoading.uncheck();
  }
  await settle(page);
}

async function openAppSwitcher(page) {
  await page.locator('.app-switcher-menu > button').click();
  await expect(page.locator('.lp-view[data-mode="switcher"]')).toBeVisible();
}

async function expectForYou(page, app) {
  await expect(page.locator('.foryou-view')).toBeVisible();
  await expect(page.locator('[data-foryou-app]')).toHaveText(app);
}

test('an app base deep link boots that app’s For You screen', async ({page}) => {
  await gotoRoute(page, '/dashboard');
  await expectForYou(page, 'Dashboard');
  await expect(page.locator('.list-view')).toBeHidden();
  expect(pathOf(page.url())).toBe('/dashboard');

  await gotoRoute(page, '/sales-systems-management');
  await expectForYou(page, 'Sales Systems Management');
  expect(pathOf(page.url())).toBe('/sales-systems-management');

  await gotoRoute(page, '/system-setup');
  await expectForYou(page, 'System Setup');
  expect(pathOf(page.url())).toBe('/system-setup');
});

test('inner screens and shell screens deep-link to their views', async ({page}) => {
  const cases = [
    ['/sales-systems-management/sales-invoices', '.list-view'],
    ['/customers/list', '.customer-list-view'],
    ['/system-setup/geographical-structure', '.geo-list-view'],
    ['/system/email', '.email-view'],
    ['/system/profile', '.profile-view'],
    ['/system/organization', '.organization-view'],
  ];
  for (const [path, view] of cases) {
    await gotoRoute(page, path);
    await expect(page.locator(view), `expected ${view} at ${path}`).toBeVisible();
    expect(pathOf(page.url())).toBe(path);
  }
});

test("the default entry '/' shows the Launchpad when it is enabled", async ({page}) => {
  await gotoRoute(page, '/');
  await expect(page.locator('.lp-view')).toBeVisible();
  expect(pathOf(page.url())).toBe('/');
});

test("the default entry '/' shows the Dashboard For You when the Launchpad is disabled", async ({page}) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('skey-proto-state', JSON.stringify({launchpad: false}));
  });
  await gotoRoute(page, '/');
  await expect(page.locator('.foryou-view')).toBeVisible();
  await expect(page.locator('[data-foryou-app]')).toHaveText('Dashboard');
  await expect(page.locator('.lp-view')).toBeHidden();
  expect(pathOf(page.url())).toBe('/');
});

test('the launchpad app tile opens the app’s For You screen', async ({page}) => {
  await gotoRoute(page, '/');
  await page.locator('.lp-tile').filter({hasText: 'Sales Systems Management'}).first().click();
  await settle(page);
  await expectForYou(page, 'Sales Systems Management');
  await expect.poll(() => pathOf(page.url())).toBe('/sales-systems-management');
});

test('the app switcher row opens the app’s For You screen', async ({page}) => {
  await gotoRoute(page, '/dashboard');
  await openAppSwitcher(page);
  await page.locator('.app-switcher-row[data-label="Finance and Accounting"]').click();
  await settle(page);
  await expectForYou(page, 'Finance and Accounting');
  await expect.poll(() => pathOf(page.url())).toBe('/finance-and-accounting');
});

test('sidebar rail app icons open the app’s For You screen', async ({page}) => {
  await gotoRoute(page, '/dashboard');
  await page.locator('.nc2-icn[aria-label="Vendors"]').click();
  await settle(page);
  await expectForYou(page, 'Vendors');
  await expect.poll(() => pathOf(page.url())).toBe('/vendors');
});

test('the panel’s pinned For You row lands on the current app’s landing', async ({page}) => {
  await gotoRoute(page, '/customers/list');
  await page.locator('.nc2-icn[aria-label="Customers"]').click();
  await page.locator('.nc1-item[data-label="For You"]').click();
  await settle(page);
  await expectForYou(page, 'Customers');
  await expect.poll(() => pathOf(page.url())).toBe('/customers');
});

test('in-app navigation keeps the URL in step and Back/Forward restores screens', async ({page}) => {
  // Rail clicks do not involve the overlay: /dashboard -> /vendors.
  await gotoRoute(page, '/dashboard');
  await page.locator('.nc2-icn[aria-label="Vendors"]').click();
  await settle(page);
  await expectForYou(page, 'Vendors');
  await expect.poll(() => pathOf(page.url())).toBe('/vendors');

  await page.goBack();
  await expect.poll(() => pathOf(page.url())).toBe('/dashboard');
  await expectForYou(page, 'Dashboard');

  // An overlay round-trip inserts the overlay's own '/' entry before the
  // click's destination: /dashboard -> '/' -> /customers.
  await openAppSwitcher(page);
  await page.locator('.app-switcher-row[data-label="Customers"]').click();
  await settle(page);
  await expectForYou(page, 'Customers');
  await expect.poll(() => pathOf(page.url())).toBe('/customers');

  await page.goBack();
  await expect.poll(() => pathOf(page.url())).toBe('/');
  await expect(page.locator('.lp-view')).toBeVisible();

  await page.goBack();
  await expect.poll(() => pathOf(page.url())).toBe('/dashboard');
  await expectForYou(page, 'Dashboard');

  await page.goForward();
  await expect.poll(() => pathOf(page.url())).toBe('/');
  await page.goForward();
  await expect.poll(() => pathOf(page.url())).toBe('/customers');
  await expectForYou(page, 'Customers');
});

test('profile sections are addressable and selectable via ?section=', async ({page}) => {
  await gotoRoute(page, '/system/profile?section=account');
  await expect(page.locator('.profile-view')).toBeVisible();
  await expect(page.locator('[data-profile-scroll-section="account"]')).toHaveAttribute(
    'aria-current',
    'page'
  );

  await page.locator('[data-profile-scroll-section="security"]').click();
  await expect.poll(() => new URL(page.url()).search).toBe('?section=security');

  await page.goBack();
  await expect.poll(() => page.url()).toContain('/system/profile?section=account');
  await expect(page.locator('[data-profile-scroll-section="account"]')).toHaveAttribute(
    'aria-current',
    'page'
  );
});

test('Back respects the list layout leave guard and restores the URL', async ({page}, testInfo) => {
  // The Columns menu collapses into the responsive/mobile toolbar layout
  // below the desktop breakpoint (same reason the data-list saved-layout
  // test skips there).
  test.skip(
    testInfo.project.use.viewport?.width < 900,
    'Columns menu is not reachable in the responsive/mobile toolbar layout.'
  );
  await gotoRoute(page, '/dashboard');
  await openAppSwitcher(page);
  await page.locator('.lp-tag').filter({hasText: 'Sales Invoice'}).first().click();
  await settle(page);
  await expect(page.locator('.list-view')).toBeVisible();
  await expect.poll(() => pathOf(page.url())).toBe(
    '/sales-systems-management/sales-invoices'
  );

  // Make the invoice list layout dirty (hide a column, do not save) so the
  // navigation-level leave guard is armed.
  const columnsMenu = page
    .locator('.list-view')
    .locator('.data-menu')
    .filter({has: page.locator(':scope > summary', {hasText: /^Columns$/})});
  await columnsMenu.locator(':scope > summary').click();
  await columnsMenu.locator('[data-list-column]').first().uncheck();

  // Back re-resolves the URL to the Dashboard landing; the guard must
  // intercept the view change.
  await page.goBack();
  await expect(page.locator('#list-layout-guard')).toHaveClass(/open/);

  // "Keep editing" aborts the pending navigation: the history move is
  // undone, the URL returns to the entry we left, and the list stays put.
  await page.locator('#list-layout-stay').click();
  await expect(page.locator('#list-layout-guard')).not.toHaveClass(/open/);
  await expect.poll(() => pathOf(page.url())).toBe(
    '/sales-systems-management/sales-invoices'
  );
  await expect(page.locator('.list-view')).toBeVisible();
});
```

- [ ] **Step 2: Run the suite on one project**

Run: `npx playwright test tests/routing.spec.mjs --project=desktop`
Expected: initially FAIL where wiring is wrong; fix forward (do not weaken assertions). Iterate until PASS.

Known likely issues to check if failures appear:
- Crumb text mismatch → confirm `activate({app})` runs before assertions (`settle()` may need one `expect.poll` on `[data-foryou-app]` instead of `toHaveText`).
- Rail icon invisible (collapsed rail) → click via `page.locator('.nc2-icn[aria-label="Vendors"]')` still works because the icon renders even at opacity 0 label; if the click is intercepted, hover the rail first (`await page.locator('.side').hover()`).

- [ ] **Step 3: Run all projects**

Run: `npx playwright test tests/routing.spec.mjs`
Expected: PASS on all 7 projects (desktop-dark may flake on the skeleton stall — if so, rerun that project once; the stall is a known pre-existing flake, not a regression).

- [ ] **Step 4: Commit (only after the user says the word)**

```bash
git add tests/routing.spec.mjs
git commit -m "test: cover for-you app-scoped routing"
```

---

### Task 6: README + full-suite verification against the baseline

**Files:**
- Modify: `README.md:25-27` (route list)
- Test: full Playwright suite vs `/tmp/base-clean.txt.norm`

**Interfaces:**
- Consumes: green routing suite (Task 5).
- Produces: docs matching the shipped URLs; zero new failures vs baseline.

- [ ] **Step 1: Update the README routes paragraph (lines 25-27)**

```markdown
Routes: `/` (default entry — Launchpad or the Dashboard app's For You
landing); one base path per app (`/dashboard`, `/customers`, `/vendors`,
`/sales-systems-management`, … — each boots that app's For You screen);
inner screens nest under their app (`/sales-systems-management/sales-invoices`,
`/customers/list`, `/system-setup/geographical-structure`); shell screens
live under `/system` (`/system/profile?section=…`, `/system/organization`,
`/system/email`); the legacy `<http://127.0.0.1:4173/concepts/app-shell.html>`
document still boots for parity testing.
```

- [ ] **Step 2: Unit + routing gates (final)**

Run: `npm run test:unit`
Expected: PASS.

Run: `npx playwright test tests/routing.spec.mjs`
Expected: PASS on all 7 projects.

- [ ] **Step 3: Full suite and baseline diff**

Run (long, ~10-15 min):

```bash
npx playwright test 2>&1 | tee /tmp/foryou-full.txt
grep -E '^[[:space:]]+[0-9]+\) ' /tmp/foryou-full.txt | sed -E 's/\.mjs:[0-9]+(:[0-9]+)?/\.mjs/' | sed -E 's/[[:space:]]+$//' | sort -u > /tmp/foryou-fails.txt
diff /tmp/base-clean.txt.norm /tmp/foryou-fails.txt
```

Expected: empty diff (the baseline is the pre-routing v1 clean set, 106 known failures — all parity snapshot failures). If the diff shows only `[desktop-dark] routing.spec › ...` skeleton-stall noise, rerun that single test/project and re-diff. If it shows a real new failure, fix it before proceeding.

If `/tmp/base-clean.txt.norm` no longer exists or the diff format mismatches, regenerate it from the stored routing v1 full run: `grep -E '^[[:space:]]+[0-9]+\) ' /tmp/routing-full2.txt | sed -E 's/\.mjs:[0-9]+(:[0-9]+)?/\.mjs/' | sed -E 's/[[:space:]]+$//' | sort -u > /tmp/base-clean.txt.norm` — note that file contains 107 lines (the 106 baseline + the known `[desktop-dark] routing.spec` skeleton-stall flake), so a one-line diff naming that flake is not a regression.

- [ ] **Step 4: Report + commit (only after the user says the word)**

Summarize: unit count, routing suite per project, full-suite diff vs baseline, and the three deferred flags (landing displacement, kit-pill z-index, Organization Operational status card).

```bash
git add README.md
git commit -m "docs: document app-scoped for-you routes"
```
