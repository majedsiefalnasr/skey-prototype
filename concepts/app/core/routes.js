// URL <-> prototype-view mapping for routing v1. Pure and deterministic:
// parsing/formatting never reads configuration; the separate
// resolveDefaultEntry() step is the ONLY place launchpad-vs-dashboard
// configuration is consulted, and it applies only to '/'.
//
// Only real prototype screens are routed. Placeholder sidebar items map
// through their real fallback views, and record screens share their
// area's list URL (no record ids in URLs in v1).

/** Areas that carry a `?section=` sub-selection in v1. */
const SECTION_VIEWS = new Set(['profile', 'organization'])

/** Canonical path per routed view (format() target). */
export const PATH_BY_VIEW = {
  launchpad: '/',
  dashboard: '/dashboard',
  list: '/invoices',
  record: '/invoices',
  'customers-list': '/customers',
  'customer-record': '/customers',
  'geo-list': '/geography',
  'geo-record': '/geography',
  email: '/email',
  profile: '/profile',
  organization: '/organization',
}

/** Deep-link entry view per path (parse() target). */
export const VIEW_BY_PATH = {
  '/dashboard': 'dashboard',
  '/invoices': 'list',
  '/customers': 'customers-list',
  '/geography': 'geo-list',
  '/email': 'email',
  '/profile': 'profile',
  '/organization': 'organization',
}

/** Emitted as `<path>/index.html` route folders by scripts/build.mjs. */
export const ROUTE_PATHS = Object.keys(VIEW_BY_PATH)

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

/**
 * Map a browser URL to a route. Returns:
 * - `null` for paths this app does not own (legacy entry documents,
 *   unknown paths) — callers keep today's boot/restore behavior;
 * - `{defaultEntry: true}` for '/', which is resolved separately via
 *   resolveDefaultEntry();
 * - `{id, data}` for a known prototype screen.
 * @param {string} pathname
 * @param {string} [search]
 */
export function parse(pathname, search = '') {
  const path = normalizePath(pathname)
  if (path === '/') return {defaultEntry: true}
  const id = VIEW_BY_PATH[path]
  if (!id) return null
  if (!SECTION_VIEWS.has(id)) return {id, data: {}}
  const section = new URLSearchParams(search).get('section')
  return section && SECTION_PATTERN.test(section)
    ? {id, data: {section}}
    : {id, data: {}}
}

/**
 * Map a view id (+ navigation data) back to its URL, or `null` when the
 * view is not routed. Within an area (list <-> record) the formatted path
 * is identical, so callers that dedupe on the formatted value create no
 * history entry for in-area transitions.
 * @param {string} id
 * @param {{section?: string}} [data]
 * @returns {string|null}
 */
export function format(id, data) {
  const path = PATH_BY_VIEW[id]
  if (path == null) return null
  if (SECTION_VIEWS.has(id) && data && data.section && SECTION_PATTERN.test(data.section)) {
    return `${path}?section=${encodeURIComponent(data.section)}`
  }
  return path
}

/**
 * The configured application entry for the default-entry route ('/'):
 * the Launchpad overlay when enabled, otherwise the Dashboard screen.
 * This is the only decision point between Launchpad and Dashboard.
 * @param {{launchpadEnabled: boolean}} config
 * @returns {{kind: 'launchpad'}|{id: string, data: object}}
 */
export function resolveDefaultEntry({launchpadEnabled}) {
  return launchpadEnabled ? {kind: 'launchpad'} : {id: 'dashboard', data: {}}
}
