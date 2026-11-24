/** Viewport breakpoints that script reads through `matchMedia`.
 *
 *  The single source of truth is the `--breakpoint-*` theme block in
 *  styles/tailwind.css: the Atlassian Design System steps (`xs` to `xl`) and
 *  the `--breakpoint-legacy-*` prototype values that have not moved to one yet.
 *  CSS and class names read them through `theme()`, `max-sm:` and
 *  `max-legacy-*`. A media query string in JavaScript cannot read a CSS
 *  variable, so the values it needs are mirrored here and
 *  tests/breakpoints.test.mjs fails if either side drifts.
 */
export const VIEWPORT_BREAKPOINTS = Object.freeze({
  sm: 768,
  legacy560: 560,
  legacy620: 620,
  legacy900: 900,
  legacy1200: 1200
})

/** @param {keyof typeof VIEWPORT_BREAKPOINTS} name
 *  @returns {string} the `(max-width: Npx)` media query for a named breakpoint */
export function maxWidthQuery(name) {
  return `(max-width: ${VIEWPORT_BREAKPOINTS[name]}px)`
}

/** @param {keyof typeof VIEWPORT_BREAKPOINTS} name
 *  @returns {string} the `(width < Npx)` media query for "below this step", the
 *  same boundary as Tailwind's `max-sm:` */
export function belowQuery(name) {
  return `(width < ${VIEWPORT_BREAKPOINTS[name]}px)`
}
