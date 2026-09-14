# Known defects (baseline ledger)

Source: `audit/app-shell-prototype-audit-2026-09-13.md` (untracked in the main
worktree; preserved there per the plan's execution rules). 12 distinct issues
were found against the current `concepts/app-shell.html` prototype: 1 P0,
5 P1, 6 P2, 0 P3.

This refactor (`docs/superpowers/plans/2026-09-13-app-shell-components.md`)
preserves observable behavior, including these defects, with **one explicit
exception**: issue 6 (customer restoration reload exception), fixed in Task 11
as the plan's single allowed behavior correction. Every other defect below is
carried forward unchanged by design — parity tests must not "fix" them, and
no test in this suite may pass by silently accepting a defect as permanently
correct behavior. Passing parity screenshots capture the defect's *current*
visual state, not an endorsement that the state is desired.

## P0 — Blocking

1. **Mobile email leaves effectively no space for the reader or composer.**
   `.email-app` is 306px wide at 390px viewport; `.email-reading` gets only
   4px. Reproduce: open an email via Notifications -> Email, set viewport to
   390x900. Not exercised as a passing assertion here; out of scope for this
   refactor (Responsive design).

## P1 — Major

2. **List pagination Previous/Next buttons have no accessible name.**
   `renderShellPager` generates icon-only `.data-pagination-prev` /
   `.data-pagination-next` buttons with `aria-hidden="true"` SVGs and no
   label. Affects invoice, customer, and geo lists alike.

3. **Mobile Columns/view-selection triggers lose their accessible name.**
   At <=620px, `.data-toolbar-label-text` is `display:none` and the
   containing `<summary>` has no independent accessible name.

4. **Selected navigation/pagination text fails light-theme contrast.**
   `.nc1-item.current` and `.data-pagination-page.is-current` render at
   ~4.28:1 in standard light mode (below the 4.5:1 AA minimum for the text
   size). Dark/high-contrast selected states were not found to reproduce
   this.

5. **Switching email messages silently discards an unsent draft.**
   `renderEmailReading`/`renderComposeNew` replace the reader's `innerHTML`
   with no save/discard/stay guard, unlike the customer record's unsaved-work
   guard.

6. **FIXED in Task 11 — Restoring Customer Create mode threw during reload.**
   `renderCustomerRecordChrome` (around `setCustomerMode` / `restoreState`)
   used to throw `TypeError: Cannot set properties of null (setting
   'innerHTML')` on reload when Prototype Controls had "Creating a new
   customer" saved, because the customer view was deferred/detached when
   the restoration handler queried it via `document.getElementById`. This
   was the *only* defect this refactor was allowed to fix, and only in
   Task 11. Task 7 root-scoped record.js's DOM queries against the
   retained `.customer-record-view` root (removing the null-lookup
   anti-pattern); Task 11 completed the fix by having main.js read saved
   prototype state via `readPrototypeState(sessionStorage)` before any
   page activates and apply customer-mode/customer-layout through
   `customers.setMode`/`setLayout` directly (safe at any time — they only
   touch the DOM once the record page is active), and by adding permanent
   `#customer-mode`/`#customer-layout` change listeners in record.js
   (mirroring the invoice record's own `#mode`/`#st`/`#pay`/`#dirty`
   listeners) so those controls actually take effect at all. See
   `tests/lifecycle.spec.mjs`'s "customer mode restores after reload
   without a null-root exception" test (no longer expected-failure) and
   `concepts/app/prototype/controls.js`'s module comment for the full
   mechanism.

## P2 — Minor / prototype correctness

7. **Internal Mail and other unmapped destinations fall back to an invoice.**
   `setNavCurrent`'s `viewByNavLabel[label] || 'record'` fallback means
   clicking "Internal Mail" opens Sales Invoice 126 instead of Email, even
   though Email is fully implemented and reachable via Notifications. Any
   parity test that opens Email must go through Notifications -> Email, not
   the Internal Mail shortcut, and must preserve this fallback rather than
   route around it silently.

8. **Opening an invoice changes its number without loading matching data/status.**
   `openInvoiceRecord` only updates `state.docNo`; the shared invoice
   fixture, status, and payment mode do not change to match the row that was
   opened (e.g. Draft invoice 144 opens showing Posted, read-only fields).

9. **Simulated totals advertise empty pages and contradict the statistics.**
   `DATA_LIST_SIMULATED_TOTAL` (125 for invoices, 72 for customers) is
   unrelated to the actual fixture row counts (8 invoices, 3 customers), so
   page 2 of any list claims rows exist yet renders "No … match this view."

10. **Coarse-pointer rules omit several shared list controls.**
    Filter/Columns/view `<summary>` triggers, row-action summaries, the
    select-all checkbox, and the page-size select remain below 44px even
    under a confirmed `(pointer: coarse)` touch context, though many topbar
    buttons correctly expand.

11. **Mobile statistics push the primary list below the initial viewport.**
    At 390x900 the four invoice statistics cards occupy ~489px of a ~543px
    scrolling canvas, so the table begins below the visible fold on first
    load (recoverable by scrolling).

12. **Chart dependency blocks every initial page load, including Home.**
    ApexCharts loads as a classic, non-deferred external `<script>` in
    `<head>` before body parsing, even though the initial Home screen never
    renders a chart.

## How this ledger is used by tests

- No test in `tests/parity.spec.mjs` or elsewhere may assert that any of
  defects 1-5 or 7-12 are *fixed*; screenshots simply capture whatever the
  current rendering is, defects included.
- Console errors are never suppressed wholesale in test helpers
  (`tests/support/browser.mjs`) to make a defect quietly disappear from test
  output; finding 6's exception no longer occurs after Task 11's fix, and
  its regression test asserts an empty error list explicitly rather than
  filtering anything out globally.
- Defect 6 was the only entry expected to change status (from "expected
  failure" to "fixed") over the life of this plan; that transition landed
  in Task 11 and is now complete. No other entry in this ledger changed
  status as part of that task.
