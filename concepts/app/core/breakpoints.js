/** Viewport breakpoints that script reads through `matchMedia`.
 *
 *  The single source of truth is the `--breakpoint-legacy-*` theme block in
 *  styles/tailwind.css, which CSS and class names read through `theme()` and
 *  `max-legacy-*` / `min-legacy-*`. A media query string in JavaScript cannot
 *  read a CSS variable, so the values it needs are mirrored here and
 *  tests/breakpoints.test.mjs fails if either side drifts.
 */
export const VIEWPORT_BREAKPOINTS = Object.freeze({
  legacy560: 560,
  legacy620: 620,
  legacy720: 720,
  legacy900: 900,
  legacy1200: 1200
})

/** @param {keyof typeof VIEWPORT_BREAKPOINTS} name
 *  @returns {string} the `(max-width: Npx)` media query for a named breakpoint */
export function maxWidthQuery(name) {
  return `(max-width: ${VIEWPORT_BREAKPOINTS[name]}px)`
}
