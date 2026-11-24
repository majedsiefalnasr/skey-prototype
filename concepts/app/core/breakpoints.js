/** Viewport breakpoints that script reads through `matchMedia`.
 *
 *  The single source of truth is the `--breakpoint-*` theme block in
 *  styles/tailwind.css: the Atlassian Design System steps (`xs` to `xl`) and
 *  the `--breakpoint-legacy-*` prototype values that have not moved to one yet.
 *  CSS and class names read them through `theme()`, `max-sm:` and
 *  `max-legacy-*`. A media query string in JavaScript cannot read a CSS
 *  variable, so the values it needs are mirrored here, in `rem` like the
 *  tokens, and tests/breakpoints.test.mjs fails if either side drifts.
 */
export const VIEWPORT_BREAKPOINTS = Object.freeze({
  sm: 48,
  md: 64,
  legacy560: 35,
  legacy620: 38.75,
  legacy900: 56.25,
  legacy1200: 75
})

/** @param {keyof typeof VIEWPORT_BREAKPOINTS} name
 *  @returns {string} the `(max-width: Nrem)` media query for a named breakpoint */
export function maxWidthQuery(name) {
  return `(max-width: ${VIEWPORT_BREAKPOINTS[name]}rem)`
}

/** @param {keyof typeof VIEWPORT_BREAKPOINTS} name
 *  @returns {string} the `(width < Nrem)` media query for "below this step", the
 *  same boundary as Tailwind's `max-sm:` */
export function belowQuery(name) {
  return `(width < ${VIEWPORT_BREAKPOINTS[name]}rem)`
}
