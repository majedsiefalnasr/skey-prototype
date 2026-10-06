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

/** Shell screens: the /system namespace plus the session gate. */
const SHELL_VIEW_BY_PATH = {
  '/system/profile': 'profile',
  '/system/organization': 'organization',
  '/system/email': 'email',
  '/signin': 'signin',
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
  signin: '/signin',
}

/** Emitted as `<path>/index.html` route folders by scripts/build.mjs.
 *  20 app bases + 3 inner paths + 4 shell paths = 27. */
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
