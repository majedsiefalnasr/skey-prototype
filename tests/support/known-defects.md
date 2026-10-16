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
   *Update 2026-10-13 (collaboration suite):* Internal Mail, Events,
   Activities, Notes and People Data now map to their own views; other
   unmapped rows still fall back to the invoice. Parity tests keep opening
   Email through Notifications.

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

13. **Assistant drawer does not close with Escape.** *(Fixed 2026-09-30.)*
    `tests/messaging.spec.mjs`'s "assistant proposal answers and closes with
    Escape" test failed: `#aiscrim` kept its `open` class after `Escape` was
    pressed. Found during the Tailwind utility migration's
    (`docs/superpowers/plans/2026-09-14-tailwind-migration.md`) Task 6 and
    Task 7 test runs, but confirmed unrelated to that migration by two
    independent checks (Task 6's implementer and its task reviewer, then
    Task 7): every migration task's diff range is silent on
    `concepts/app/shell/main.js`, any keyboard-handling file, and
    `concepts/app/components/assistant/*.js` — a pre-existing gap in the
    prototype's Escape-key wiring, not something the migration introduced.
    `components/assistant/assistant.js` now binds a `keydown` listener that
    calls `closeAI()` (scoped by `pageAbort.signal`). The test's own
    assertion was also repaired: `toHaveClass(/open/)` matches the
    `[&.open]:block` utility in the element's class list, so the drawer's
    open/closed state is now asserted with `toBeVisible()` / `toBeHidden()`.

## Known failing tests at the collaboration-suite merge (2026-10-16)

Measured with `npx playwright test` (all 7 projects) against `npm run dev`,
on `main` at `ab21018` and on `feat/collaboration-suite` at `566756e`.
`main` fails 57 tests; the branch fails 80 (55 shared, 2 fixed by the
branch, 25 branch-only). These are recorded, not hidden: no test or
baseline was changed to make them pass.

14. **`parity › record` fails on desktop (out of scope).**
    `record.png` differs by 18 pixels around the title's star icon and the
    Customer No. lookup's dropdown arrow. Kept as a deliberate, documented
    failure; the baseline is not re-captured.

15. **Non-desktop parity baselines predate intentional collaboration-suite
    UI changes.** The branch re-captured only `desktop/email.png`; the other
    six projects still hold the earlier images, so 18 snapshots fail:
    - `customer-record` on all six non-desktop projects, and `record` on
      all of them except desktop-high-contrast-dark — a few-pixel
      select-arrow difference from the form primitives change (`d2e7a64`).
    - `email` on all six non-desktop projects — the Internal Mail redesign.
    - `launchpad` on mobile-rtl.
    Re-capturing them is pending an explicit decision.

16. **`data-list-component › toolbar data-menus dismiss with Escape and
    outside click` fails on mobile-touch and mobile-rtl (test design).** At
    390px the Columns popover covers the search input the test clicks as its
    "outside" target, so the click lands inside the popover and times out.
    Passes on all desktop projects. The app behaviour is not at fault.

17. **Failures inherited from `main` (55 tests).** Mostly mobile-rtl (25)
    and mobile-touch (11): customer-record lifecycle and invoice record
    flows time out on clicks, and several data-list / messaging element
    screenshots differ. Present on `main` before the merge; not introduced
    by the collaboration suite.

18. **Load-sensitive tests.** `help-screens-consistency` ("a new person can
    be saved…", "translated copy keeps its spacing…") on desktop-dark and
    `components` ("print dialog traps Tab…", "a simulated failure resets
    busy state…") on desktop-high-contrast-dark failed in the full parallel
    run but passed in isolated reruns (`--repeat-each=2`).
    *Update 2026-10-16:* later investigation traced these, and similar
    boot-time failures in other full runs, to the dev server: `npm run dev`
    rebuilds `dist/` before every document request, and `build.mjs`'s
    removal of the previous `.dist-old-*` directory intermittently fails
    with `ENOTEMPTY` when macOS writes a `.DS_Store` into it, so the
    request is answered `500 Build failed`. A full run against one frozen
    static build (`node scripts/serve.mjs --root <copy of dist> --port
    4177`, `PARITY_URL` pointed at it, `--workers=2 --retries=0` under
    `caffeinate -dims`) showed none of them.

19. **Sign-in focus race: a delayed autofocus can move a password into the
    username field (exists on `main`).** `show()` in
    `concepts/app/pages/signin/signin.js:226` focuses the newly shown pane's
    `data-si-focus` target after `setTimeout(..., 60)`; for pane 2 that is
    `#si-user`. When that timer fires late (busy main thread), focus
    returns to `#si-user` while the password is being filled, so the
    password text is appended to the username and the demo check rejects
    the credentials.
    - **Confirmed** for `signin-pages.spec.mjs` › "password sign-in as a
      different identity does not carry the prefilled branch". In every
      captured failure the page snapshot shows `Username: adminskey123`, an
      empty Password, and the alert "Invalid credentials in this demo — try
      admin / skey123.", so the save pane never appears. Failed in the
      static full run on desktop-high-contrast-light and mobile-rtl.
      Targeted reruns (frozen static build, `--workers=2 --retries=0`,
      `--repeat-each=10`): desktop-high-contrast-light 2/10, desktop 1/10,
      mobile-touch 2/10, mobile-rtl 0/10, desktop-dark 0/10; mobile-touch
      with `--trace=retain-on-failure` 6/10 (higher under trace-recording
      load). A standalone script without the test runner's parallel load
      reproduced 0/75.
    - **Inferred, not confirmed** for `signin-gate.spec.mjs` › "logging
      out shows the gate, and signing in again lands on the default entry"
      (failed once on desktop-dark in the static full run, waiting for
      `#si-save-not-now`). Its `signIn()` helper fills `#si-user` then
      `#si-pass` right after a pane change, and the symptom matches (the
      save step never appears), but 20 reruns (desktop-dark, desktop)
      passed and no failing snapshot was captured.
    - Not introduced by the collaboration-suite merge: `ab21018..9386bdd`
      does not touch `signin.js` or either test; the delayed focus dates
      from `82708ac` (2026-10-06).

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
  in Task 11 and is now complete. Defect 13 changed status later, on
  2026-09-30, when its Escape handler was implemented — its test asserts
  the fixed behaviour now, and the drawer's open/closed state is checked
  through visibility rather than through the class token (see entry 13).
  No other entry has changed status.
