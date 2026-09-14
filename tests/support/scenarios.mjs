// Shared scenario/allowed-difference definitions for parity and lifecycle
// tests. This is the one place that names the eight app-shell surfaces and
// records which differences between the baseline and the current app are
// expected and permitted, versus which differences are real regressions.

/**
 * @typedef {'launchpad'|'list'|'record'|'customers-list'|'customer-record'|
 *   'geo-list'|'geo-record'|'email'} SurfaceId
 */

/** Every surface `openSurface` (tests/support/browser.mjs) can reach. */
export const SURFACES = /** @type {const} */ ([
  'launchpad',
  'list',
  'record',
  'customers-list',
  'customer-record',
  'geo-list',
  'geo-record',
  'email',
]);

/**
 * Differences between the baseline and the current app that are expected
 * and allowed at this point in the refactor, keyed by a short id. Every
 * entry must cite the known-defects.md finding (or plan task) that allows
 * it. This list starts empty in Task 1 (baseline vs. current are byte-
 * identical) and gains entries only when a later task's plan explicitly
 * allows a divergence (e.g. the Task 11 customer-restoration fix, which is
 * expected to make ONE prior failure start passing on the current app while
 * the frozen baseline keeps failing it forever).
 * @type {Array<{id: string, appliesFrom: string, reason: string}>}
 */
export const ALLOWED_DIFFERENCES = [
  {
    id: 'customer-restoration-reload',
    appliesFrom: 'task-11',
    reason:
      'known-defects.md finding 6: the current app fixes the customer Create-mode ' +
      'reload TypeError; the frozen baseline keeps throwing it forever. Until Task 11 ' +
      'lands, this is tracked as an expected-failure regression test, not a passing one.',
  },
];

/**
 * The one behavior correction this refactor is allowed to make, and the
 * only case where a baseline vs. current test difference is expected to
 * ever be introduced on purpose. See tests/lifecycle.spec.mjs (added in
 * Task 11) for the regression test itself.
 */
export const CUSTOMER_RESTORATION_FIX = ALLOWED_DIFFERENCES[0];

/**
 * True once the customer restoration fix has landed (Task 11+). Tests use
 * this instead of a hard-coded task number so the expected-failure status
 * flips in exactly one place.
 * @returns {boolean}
 */
export function isCustomerRestorationFixed() {
  return false; // flips to true in Task 11, alongside enabling the regression test.
}
