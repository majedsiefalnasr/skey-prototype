# For You app landing + app-scoped URL scheme — design

Date: 2026-10-03
Status: approved (verbal), pending spec review

## Goal

Clicking an app anywhere the shell lets you switch apps opens that app's
**For You** landing page — a placeholder dashboard — instead of dropping
straight into a list. For You lives at the app's **base link**: there is no
`/dashboard/for-you`, viewing `/dashboard` *is* the For You of the Dashboard
app. Inner (screen) paths nest under their owning app's base, and shell-level
screens move under a `/system` namespace.

## Requirements (locked with user)

1. All 20 app tiles in the launchpad open their app's For You. The Dashboard
   app included.
2. All app-switching entry points do the same: launchpad tiles, topbar
   app-switcher rows, **and** sidebar rail app icons.
3. For You = the app's base link (`/dashboard` opens For You; no
   `/dashboard/for-you` sub-path).
4. For You content = the placeholder dashboard already built (KPI cards),
   parameterized per app.
5. Inner paths nest under the owning app: `/invoices` →
   `/sales-systems-management/sales-invoices`, and so on.
6. Shell screens (Profile, Organization, Email — opened from the topbar, not
   owned by any app) move under a `/system` namespace.

## URL scheme

### App bases (For You) — dash-case of the app label, all 20 apps

| App | Base |
| --- | --- |
| Dashboard | `/dashboard` |
| Customers | `/customers` |
| Vendors | `/vendors` |
| Inventory Systems Management | `/inventory-systems-management` |
| Sales Systems Management | `/sales-systems-management` |
| Purchase Systems Management | `/purchase-systems-management` |
| POS System Management | `/pos-system-management` |
| Finance and Accounting | `/finance-and-accounting` |
| Human Capital Management | `/human-capital-management` |
| Fixed Assests System | `/fixed-assests-system` (label's typo kept — slugs are mechanical dash-case, fixing the label is separate) |
| Manufacturing Resource Planning | `/manufacturing-resource-planning` |
| Real Estate Management System | `/real-estate-management-system` |
| Maintenance Workshop System | `/maintenance-workshop-system` |
| Customer Relations Management | `/customer-relations-management` |
| Hospital Management | `/hospital-management` |
| Car rent system | `/car-rent-system` |
| Reports | `/reports` |
| System Administration | `/system-administration` |
| System Setup | `/system-setup` |
| Help Screens | `/help-screens` |

### Inner screens (real prototype screens only)

| Screen (page id) | Path |
| --- | --- |
| Invoice list + record (`list` / `record` area) | `/sales-systems-management/sales-invoices` |
| Customer list + record (`customers-list` / `customer-record` area) | `/customers/list` |
| Geography list + record (`geo-list` / `geo-record` area) | `/system-setup/geographical-structure` |

`sales-invoices` and `geographical-structure` are the user-chosen/dash-case
slugs of the leaf labels; the customer list uses curated `list` (a pure label
slug would read `/customers/customers`).

### Shell namespace (`/system/*`)

| Screen | Path |
| --- | --- |
| Profile (keeps `?section=`) | `/system/profile` |
| Organization | `/system/organization` |
| Email | `/system/email` |

`/system` alone is not a route (unknown path → boot-plan restore, as today).

### Removed / changed meanings

- **Removed:** `/invoices`, `/geography`, flat `/email`, `/profile`,
  `/organization`. No aliases/redirects — unknown paths keep the existing
  fallback (restore the boot plan).
- **Changed:** `/customers` is now the Customers app's For You (it used to be
  the customer-list deep link, which moves to `/customers/list`).
- **Unchanged:** `/` default entry (Launchpad when enabled; For You(Dashboard)
  content at URL `/` when disabled), legacy `/concepts/app-shell.html` (URL
  sync stays inert), trailing-slash normalization, `?section=` validation.

## Page model

- The existing `dashboard` page is **renamed to `foryou`** (page id, template
  `.dashboard-view` → `.foryou-view`, file `pages/dashboard/` → `pages/for-you/`
  with `for-you.js` / `templates.html`). One page instance in the registry,
  parameterized by `data.app`.
- Content per app: breadcrumbs `Home › <App>`, h1 `For You`, subtitle = the
  app's `NAV_APP_META` description (already localized — launchpad tiles use the
  same keys), and the same four placeholder KPI cards for every app
  (Revenue this month, Open invoices, Active customers, Items in stock).
- `activate({app})` re-renders header/subtitle for the app; KPI body is static.
- The sidebar favorites rail icon (`For You`, `for-you` groups) is a different
  feature and stays unchanged.

## Route tables (`core/routes.js`)

- `APP_PATH_BY_LABEL` / `APP_LABEL_BY_PATH`: 20-entry slug table (single
  source for parse, format, and boot).
- `SCREEN_PATH_BY_ID` (area format): `list|record →
  /sales-systems-management/sales-invoices`, `customers-list|customer-record
  → /customers/list`, `geo-list|geo-record →
  /system-setup/geographical-structure`, `email → /system/email`,
  `profile → /system/profile`, `organization → /system/organization`,
  `foryou → /<app-slug of data.app>`.
- `parse(pathname, search)`:
  - `/<app-slug>` exactly → `{id: 'foryou', data: {app}}`
  - `/<app-slug>/<screen-slug>` matching a known screen → its page id
    (`{id: 'list'}` etc.)
  - `/system/{profile|organization|email}` → those page ids
  - `/` → `{defaultEntry: true}`; anything else → `null` (as today)
- `format(id, data)` inverse via the tables above; `null` for unrouted ids.
- `ROUTE_PATHS` = all 26 paths (20 bases + 3 screens + 3 `/system/*`) — the
  build generates one folder per path as today.

## Click wiring (all → `navigate('foryou', {app})`)

1. **Launchpad app tile** — `openLaunchpadListDestination` (old
   Customers/Sales Invoice/Geography/Dashboard whitelist) is replaced by an
   app handler: rail `activateByLabel(app)` + navigate to `foryou(app)` +
   hide overlay with the For You destination as the hide-push target.
2. **Topbar switcher row** — already activates the rail; adds the same
   navigate.
3. **Sidebar rail app icon** (NAV_TREE groups only; Starred/Recent/For-You
   favorites icons unchanged) — keeps panel-open behavior, adds the navigate;
   a same-view re-click is a no-op for the URL (existing dedupe).
4. **Panel "For you" row** — `setNavCurrent('For You')` resolves to
   `foryou(currentAppLabel)` and highlights the row. The row label is
   normalized to `For You` (matches the existing locale key `For You: لك`;
   the current `For you` casing misses the key).
5. Quick-list shortcuts (Starred/Recent — Sales Invoice, Customers, …) keep
   opening their **lists** at the nested paths; they are screens, not apps.

Implementation note: the launchpad-hide URL push currently takes a *view
name* (`targetView`); For You needs the app too, so generalize it to a route
plan (`{id, data}`) or a precomputed path.

## Routing mechanics

- Boot dispatch: nested screen paths boot exactly as today (rail activates
  via `setNavCurrent` from the leaf label); For You paths boot via
  `activateByLabel(app)` + `navigate('foryou', {app})` with no history entry
  (`booted` flips after the suppressed boot `syncUrl`, then `replaceState`).
- popstate/`applyRoutePlan`, guard refusal undo, `handlingPop`,
  `suppressNextPop`, and the overlay-owns-URL rule are unchanged; only the
  parse/format tables grow.
- `NAV_ITEM_LABEL_BY_ID` drops `dashboard` (no rail leaf maps to For You);
  `viewByNavLabel` drops `Dashboard`.
- `syncUrl`/`syncPrototypeControlsPage` treat `foryou` like `dashboard`
  today (no special cases; unknown view names take the default branch).

## Build

- `scripts/build.mjs` already iterates `ROUTE_PATHS` — 26 route folders are
  generated with no structural change; root `index.html` (app + `/concepts/`
  base) and the unbased legacy document are untouched.

## Tests

- `tests/routes.test.mjs` — rewrite for the new table: app-base parse,
  nested-screen parse, `/system/*`, area format round-trips, trailing slash,
  `?section` validation, unknown paths, `resolveDefaultEntry`.
- `tests/routing.spec.mjs` — deep links for every new path class
  (`/dashboard`, `/vendors`, `/customers` → For You *not* the list;
  `/customers/list`, `/sales-systems-management/sales-invoices`,
  `/system-setup/geographical-structure`, `/system/profile?section=account`,
  `/system/organization`, `/system/email`); all four click entry points land
  on the app base with the right view; quick-list still opens the nested list
  path; back/forward chain; leave-guard refusal on the nested invoice path;
  removed flat paths fall back to the boot plan.
- `tests/build.test.mjs` — unchanged in structure (driven by `ROUTE_PATHS`).
- README route list updated.

## Out of scope

- Placeholder nav leaves (Sales Order, Quotations, …) still get no routes;
  their clicks keep today's area behavior.
- Search-palette navigation (still out-of-scope toast).
- Per-app KPI data (placeholder is shared).
- The sidebar favorites "For You" rail icon and its groups.
- Landing-page displacement at `/` (flagged separately, unchanged).

## Success criteria

- `npm run test:unit` green (grows with the new routes tests).
- `npx playwright test` — new routing spec green on all 7 projects; full
  suite changed-failure diff vs baseline = 0 (modulo known flakes).
