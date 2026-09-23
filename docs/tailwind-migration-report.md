# Tailwind utility migration report

Final report for the 7-task Tailwind CSS migration
(`docs/superpowers/plans/2026-09-14-tailwind-migration.md`). Task 7 is an
audit-and-document task: it runs the full production-shaped build and test
matrix, inspects every screenshot difference at zero tolerance, and records
the results here. It does not change markup, page JavaScript, or CSS
selectors (other than the two trivial cleanups noted below) — findings that
require a markup/JS change are recorded as open items for a follow-up task,
not fixed in this pass.

## Package versions

From `package.json` `devDependencies`:

| Package | Version |
| --- | --- |
| `tailwindcss` | 4.3.3 |
| `@tailwindcss/cli` | 4.3.3 |
| `@playwright/test` | 1.63.0 |

Tailwind is compiled ahead of time by `scripts/tailwind.mjs` (via
`@tailwindcss/cli`) during `npm run build`; no Tailwind package is loaded at
runtime by the browser.

## Generated CSS size and budget

- Final compiled size of `dist/concepts/app/styles/tailwind.css`: **197,594 bytes**.
- Task 7 budget: this measured size is recorded as the migration's final
  baseline. The enforced ceiling is **baseline + 10% = 217,354 bytes**
  (`Math.ceil(197594 * 1.1)`), asserted by `tests/tailwind.test.mjs`'s
  `Task 7 final Tailwind budget: compiled output stays within baseline + 10%`
  test.
- Note on the plan's literal wording: the plan's Task 7 checklist item 1 says
  "the recorded Task 2 baseline plus 10%." Task 2's own original assertion
  recorded 6,518 bytes — that was the shell/base-only sheet before any page
  markup had been converted (see commit `42cc047`). By Task 6, converting
  every page had already grown the real, intended final sheet to 197,594
  bytes, and Task 6's own test comment explicitly deferred "the final Task 7
  budget decision" to this task. Re-using the stale 6,518-byte figure here
  would make the ceiling smaller than the already-complete, correct output
  and would fail immediately for reasons unrelated to any regression. This
  report instead sets the authoritative final baseline from the actual
  finished compiled size, per the plan's own Task 6 comment and the
  addendum's framing of Task 7 as "where the final baseline + 10% budget
  gets set." No dynamic-utility addition was made in Task 7 itself.

## Compatibility manifest

`concepts/app/styles/tailwind/compatibility.md` records:

- **5** category-level policy rows (`::before`/`::after`, `@keyframes`,
  ApexCharts DOM, `[aria-*]` relationships, prototype density/style modes).
- **36** concrete, owner-specific retained-selector rows underneath those
  policies (Shell, Toast, Loading, Notifications, Assistant, Dialog, Data
  list, Invoices, Customers, Geography, Email).
- **41** total retained-selector table rows.

## Baseline identity

Screenshot parity compares against the frozen baseline recorded in
`tests/support/baseline.json`:

- Commit: `07f6b8a664e684022a3faf4c9e95392a13134529`
- HTML blob: `2776f120870c4fdbb6eb80e2777bc4c085ce39f3`
- Captured with Chromium `153.0.8010.12` / Playwright `1.63.0`, viewport
  1440x900, locale `en-US`, timezone `Africa/Cairo`.
- This environment's installed Chromium/Playwright versions are identical
  (`153.0.8010.12` / `1.63.0`), so the screenshot differences below are not a
  browser-version mismatch.

## Test results

Commands run: `npm run build && npm run test:unit && npm run test:browser`
against `dist/`, served by `node scripts/serve.mjs --root dist --port 4173`.

- **Unit tests** (`npm run test:unit`): **53/53 passed**, 0 failed.
- **Browser tests** (`npm run test:browser`, full Playwright suite, no file
  filter, 7 projects): **323 passed, 117 failed, 22 skipped** (out of 462).

The 117 browser failures are **not** a single uniform issue. Inspecting the
actual/expected/diff PNGs and reproducing failures directly (see below)
found three distinct causes. Two of them are real regressions that this task
cannot fix (no markup/JS changes are in scope for Task 7) and must be
escalated to a follow-up task.

### Reviewed exception: font-rendering / sub-pixel drift (partial)

For most of the eight `parity.spec.mjs` surfaces and the `chart-parity.spec.mjs`
real-chart pixel comparison, the diff shows a small, cumulative vertical/
horizontal offset (a few pixels at the top of the page, growing to roughly
5-20px by the bottom) plus heavier/different font-rendering weight on every
line of text — consistent with font-antialiasing or hinting differences
between this machine and whatever machine captured the baseline PNGs, not a
structural, color, or spacing regression. This was confirmed by inspecting
`list`, `geo-list`, and `record` (Task 5/6-owned and pre-existing surfaces
alike) at pixel level: element ordering, row content, and column layout are
identical; only text weight and a small cumulative offset differ.

Representative before/after images (all under `test-results/` in this
worktree, not committed — regenerate with
`npx playwright test tests/parity.spec.mjs --project=desktop`):

- `test-results/parity-list-baseline-appearance-desktop/list-{expected,actual,diff}.png`
- `test-results/parity-geo-list-baseline-appearance-desktop/geo-list-{expected,actual,diff}.png`
- `test-results/parity-record-baseline-appearance-desktop/record-{expected,actual,diff}.png`
- `test-results/chart-parity-real-chart-ma-9109b-and-cleans-up-on-navigation-desktop/` (chart pixel diff attachments)

**This reviewed exception covers:** `record`, `customers-list`,
`customer-record`, `geo-list`, `geo-record` parity surfaces, and the real
ApexCharts pixel comparison in `chart-parity.spec.mjs`, across all 7
Playwright projects. Cause: font-rendering/sub-pixel differences between
capture environments. No tolerance change was made; `maxDiffPixels: 0` and
the baseline PNGs are untouched.

**This reviewed exception does NOT cover `launchpad`,
`launchpad search panel`, `list` (invoice list view specifically), or
`email`** — see the two regressions below, which were found while verifying
the addendum's blanket "it's all font noise" hypothesis and disprove it for
these surfaces.

### Real regression 1: `launchpad` surface layout, not font noise

`parity.spec.mjs`'s `launchpad: baseline appearance` and
`launchpad search panel: baseline appearance` fail with a materially
different layout, not sub-pixel drift:

- In the baseline (`launchpad-expected.png`), the hero block (logo, "Good to
  see you, Majed." heading, subtext, search bar) occupies roughly the page's
  top 320px.
- In the current build (`launchpad-actual.png`), the same block occupies
  roughly the top 390px — about 70px taller/more spread out — pushing the
  "Starred/Recent" and "Apps" tile grid down and cutting a full row of app
  tiles off the bottom of the same 900px viewport.
- A pixel-row scan of the "Good to see you, Majed." heading's horizontal
  band (columns 32-520) found the heading's text-line run at y=100-242 in
  the baseline entirely displaced to y=370+ in the current build — not a
  few-pixel drift.

Images: `test-results/parity-launchpad-baseline-appearance-desktop/launchpad-{expected,actual,diff}.png`.

This looks like a genuine spacing/sizing regression in the launchpad hero
section's converted utilities (`concepts/app/pages/home/home.js`, `hero`
element, `class="lp-hero mx-auto mt-11 max-w-[680px] px-6 pt-11 text-center"`)
or a related ancestor, not a font-antialiasing artifact. **Not fixed in this
task** (no markup/JS changes in scope for Task 7). Needs a follow-up task to
diff the hero spacing utilities against the pre-Tailwind CSS and correct the
regression.

### Real regression 2: `.data-menu-popover` selector dropped from markup, JS still queries it

Confirmed via source inspection: `concepts/app/components/data-list/list.js`
renders every dropdown/menu popover (view selector, filter editors, column
manager, row-action menu, page-manage menu, etc.) with
`class="${DATA_MENU_POPOVER_CLASS}"`, where `DATA_MENU_POPOVER_CLASS` (list.js
line 47) is a literal Tailwind utility string that does **not** include the
token `data-menu-popover`. That semantic class name was removed from the
rendered markup during an earlier task's utility conversion.

However, 8+ call sites across `concepts/app/components/data-list/menu-controller.js`
and `actions.js` still select popovers by that now-nonexistent class, e.g.:

- `menu-controller.js:15` — `details.querySelector(':scope > .data-menu-popover')`
  (used by `positionDataMenu`, which computes and applies the popover's
  `top`/`left`/`maxHeight` inline styles on open)
- `menu-controller.js:106,155,164` — three more `.data-menu-popover` lookups
  (row-menu "parking" to `<body>`, statistics/manage menu rendering)
- `menu-controller.js:206,209,214` — parked row-action lookups
- `actions.js:78` — `rowAction.closest('.data-menu-popover')`

Because the selector never matches, `positionDataMenu` silently no-ops for
every popover: the popover keeps its default (`position: fixed` with no
`top`/`left` set) static-flow position instead of being anchored to its
`<summary>` and clamped to the viewport. On wide/tall viewports (desktop
projects) the popover often still happens to land on-screen by chance, so it
only surfaces as part of the pixel-diff noise above. On the narrower
`mobile-touch`/`mobile-rtl` projects (390x844) the popover reliably renders
below the visible viewport, so `page.locator('[data-list-view="..."]').click()`
times out after 30s waiting for an unreachable element. Reproduced directly
with a scripted check: the "list view" menu button's `boundingBox()` reported
`y: 858.9` against a `viewport.height` of `844`.

This explains the mobile-only timeouts in:

- `tests/data-list-component.spec.mjs` — all five `invoice {view} retains list
  behavior` tests and `kanban drag to a disallowed status...` (mobile-touch,
  mobile-rtl)
- `tests/lifecycle.spec.mjs` — `lookup advanced search selects a value into
  the target field` (mobile-touch, mobile-rtl) — same popover-positioning
  mechanism reused by the customer lookup menu

**Not fixed in this task** (no markup/JS changes in scope for Task 7). Needs
a follow-up task to either restore a `data-menu-popover` class alongside the
literal utilities on the popover `<div>`, or update every `menu-controller.js`
/`actions.js` selector to match on the properties `DATA_MENU_POPOVER_CLASS`
actually applies (e.g. `[class*="fixed"]` is not viable; the cleanest fix is
almost certainly re-adding a stable hook class or a `data-menu-popover`
attribute that carries no styling).

### Real regression 3 (additional, found during customers-list inspection): unstyled row-avatar image

`concepts/app/pages/customers/images.js` renders the customers list's
"Photo" column avatar as
`<button class="data-record-avatar customer-avatar-trigger image-fit-${image.fit}">...<img src="..." data-customer-image>...</button>`
(images.js line 75). All three classes on the button
(`data-record-avatar`, `customer-avatar-trigger`, `image-fit-*`) are
semantic/selector-based names with **zero matching CSS anywhere** in
`concepts/app/styles/` (confirmed by grep) — no literal Tailwind
width/height/`object-fit`/`rounded-*` utilities were ever added when this
element was converted, unlike its sibling `fallback` span two lines above
(which correctly has `[width:72px] rounded-full [font-size:20px]
font-bold`) and the record-photo-preview variant at images.js line 94
(which correctly has the full utility treatment). The `<img>` therefore
renders at its native decoded size with no constraint, producing a
~250px-tall broken/oversized avatar that distorts the whole customers list
table row.

Image: `test-results/parity-customers-list-baseline-appearance-desktop/customers-list-{expected,actual,diff}.png`.

**Not fixed in this task** (no markup/JS changes in scope for Task 7). Needs
a follow-up task to add the same literal sizing/rounding/object-fit
utilities used by the fallback span and the dialog preview variant to this
row-avatar button and its `<img>`.

### Unresolved, needs investigation: `email` parity surface and `messaging.spec.mjs` email screenshot

Both `parity.spec.mjs`'s `email: baseline appearance` and
`messaging.spec.mjs`'s `reading a notification email preserves unread state
and appearance` fail on every project. Inspecting the images found something
unexpected: **the `email` surface's own frozen baseline PNG
(`email-expected.png`) also shows the launchpad screen**, not an email
inbox — it is the launchpad hero/tile layout with a different decorative
background. The current build's `email-actual.png` also shows the
launchpad. This suggests `openEmailFromNotifications()`
(`tests/support/browser.mjs`) may not have reliably reached the email view
even at baseline-capture time, making this parity test's coverage of the
actual email page questionable independent of this migration. This is
flagged here as **needs investigation**, not classified as either the font-
drift exception or a migration regression, since the baseline itself already
shows the same symptom. A follow-up task should confirm whether
Notifications -> Email navigation actually works in the running app (manual
check, outside this automated suite) and, if so, fix the test helper; if
not, this is a fourth defect for `tests/support/known-defects.md`.

### Pre-existing bug logged, not fixed

`tests/messaging.spec.mjs`'s `assistant proposal answers and closes with
Escape` test fails (`#aiscrim` keeps its `open` class after `Escape`) on
every project. Confirmed unrelated to this migration across three
independent checks (Task 6's implementer, Task 6's reviewer, and this task):
no migration commit touches `concepts/app/shell/main.js`, any
keyboard-handling file, or `concepts/app/components/assistant/*.js`. Logged
as finding 13 in `tests/support/known-defects.md`; not fixed here (out of
scope for a CSS/utility migration).

## Structural assertions

All non-screenshot assertions inside `parity.spec.mjs` (the `linkedStylesheets`
checks for Task 5/6 surfaces — confirming exactly one compiled Tailwind
stylesheet plus the prototype's own `controls.css`, and confirming every
retired legacy stylesheet is absent) **passed** on every failing screenshot
test; every failure above is specifically the `toHaveScreenshot` assertion,
not the structural stylesheet-link assertions. Stylesheet loading itself is
correct.

## Follow-up fix: three audit-flagged regressions resolved

A follow-up task (after Task 7's audit) fixed the three real regressions
Task 7 identified but was not scoped to repair. All three were introduced
during earlier tasks' utility conversion, not by Task 7 itself.

1. **`.data-menu-popover` selector dropped from markup.** Root cause:
   `DATA_MENU_POPOVER_CLASS` in `concepts/app/components/data-list/list.js`
   (line 47) was converted to a literal Tailwind utility string during
   Task 4/6's data-list conversion, but the literal `data-menu-popover`
   token that `menu-controller.js` and `actions.js` still query
   (`querySelector('.data-menu-popover')`, `closest('.data-menu-popover')`)
   was never included in the replacement string. Fix: added
   `data-menu-popover` as the first literal token in
   `DATA_MENU_POPOVER_CLASS`, matching the pattern already used by
   `DATA_FILTER_CHIP_CLASS` on the next line, and updated the matching
   `@source inline(...)` declaration in `concepts/app/styles/tailwind.css`
   (line 27) to keep the compiled-CSS test assertions in sync with the new
   string value. No JS selector files were touched — they already expected
   this class to exist. Verified: the `mobile-touch`/`mobile-rtl`
   `data-list-component.spec.mjs` tests that previously timed out after 30s
   now complete in under 2s each (still failing on `maxDiffPixels: 0`
   against the pre-existing font-rendering-noise baseline drift, not on
   timeout).

2. **Launchpad hero section rendering ~70px taller than baseline.** Root
   cause: `concepts/app/pages/home/home.js`'s `<img class="lp-logo" ...>`
   (line 308) was left with only the semantic `lp-logo` class and no
   matching literal-utility replacement for the pre-migration
   `.lp-logo { height: 42px; width: auto; object-fit: contain;
   margin-inline: auto; display: block }` rule (only density-compact and
   narrow-viewport *override* rules for `.lp-logo` survived migration in
   `tailwind/shell.css`; the base rule was dropped). The `<img>` therefore
   rendered at its native ~80px decoded height instead of 42px, pushing the
   heading/subtitle/search/tile-grid down and cutting a full row of app
   tiles off-screen on a 900px viewport. Fix: added
   `mx-auto block h-[42px] w-auto object-contain` directly to the `<img>`
   element. Because this `<img>` tag sits on the same ~15KB single line as
   the logo's base64 data URI, Tailwind's automatic source scanner does not
   reliably tokenize classes that far into the line, so the new utilities
   were also registered explicitly via a
   `@source inline("lp-logo mx-auto block h-[42px] w-auto object-contain")`
   declaration in `tailwind.css` to guarantee they compile regardless of
   scanner reach. Verified visually: `tests/parity.spec.mjs`'s `launchpad`
   screenshot now shows the heading at the same vertical position as
   baseline and all four rows of app tiles visible (previously three rows,
   with the fourth cut off).
3. **Customer row-avatar had no sizing CSS.** Root cause:
   `concepts/app/pages/customers/images.js`'s `renderCustomerAvatar`
   (around line 75) rendered the row-avatar `<button>` and its `<img>`
   with only semantic/selector classes (`data-record-avatar
   customer-avatar-trigger image-fit-*`) and no matching literal utilities,
   unlike its sibling fallback `<span>` two lines above (which correctly
   has `[width:72px] rounded-full [font-size:20px] font-bold`) and the
   record-photo-preview variant, which both got full utility treatment.
   Fix: added `[width:72px] rounded-full overflow-hidden p-0 border-0` to
   the button (matching the fallback span's sizing) and
   `block size-full object-contain`/`object-cover` (selected by
   `image.fit`) to the `<img>`, so the image now fills and clips to the
   same 72px circular frame as its fallback sibling. Verified visually:
   `tests/parity.spec.mjs`'s `customers-list` screenshot now shows both
   photo-bearing rows (customers 200002, 200010) at the correct small
   circular avatar size instead of the ~250px broken/oversized image.

**Test results after the fix:**

- `npm run test:unit`: 53/53 passed (unchanged).
- `npm run test:browser`: **325 passed, 115 failed, 22 skipped** (462
  total), versus this report's own audit baseline of 323 passed / 117
  failed / 22 skipped. Total suite runtime dropped from ~4.2 minutes to
  ~3.1 minutes, consistent with the mobile `data-list-component.spec.mjs`
  and `lifecycle.spec.mjs` tests no longer hitting 30s timeouts.
- Net change is smaller than a naive "12 timeout tests now pass" count
  would suggest, because those 12 tests still fail — just on the
  pre-existing font-rendering-noise pixel diff (`maxDiffPixels: 0`) instead
  of a timeout. The real, verified improvement is: (a) those tests no
  longer hang for 30s each, and (b) the `launchpad`/`launchpad search
  panel`/`customers-list` surfaces no longer show the gross structural
  regressions (hero height, oversized avatar) on top of the pre-existing
  font noise — only the font noise itself remains, which this report
  already documents as a reviewed, out-of-scope exception.
- One correction to this report's original attribution: the audit's Task 7
  pass attributed the `lifecycle.spec.mjs` "lookup advanced search selects
  a value into the target field" mobile timeout to "the same popover
  mechanism reused by the customer lookup menu." Investigation during the
  follow-up fix found this is inaccurate — `#customer-lookup-select` lives
  in the customer record's own `customer-lookup-search-scrim` overlay
  (`concepts/app/pages/customers/dialogs.html`), styled and positioned
  entirely independently of `DATA_MENU_POPOVER_CLASS`/`menu-controller.js`
  (it uses its own `positionMenu` function in
  `concepts/app/pages/customers/lookups.js`). This test still fails after
  the fix, but no longer via a 30s timeout — it now fails quickly on a
  `<td>` in `customer-modal-body` intercepting a click on
  `#customer-lookup-select`, a separate, pre-existing issue unrelated to
  the `.data-menu-popover` regression and out of scope for this follow-up.

## Follow-up fix: final whole-branch review — two Critical findings resolved

A final whole-branch code review (independent of this migration's own
implementer/reviewer pairing) found two Critical, unresolved problems after
the "three audit-flagged regressions" follow-up above. Both are fixed here.

### Critical 1: launchpad baseline PNGs were rewritten to mask a real regression, not fixed

Commit `4ae52c8` ("fix: restore kbd-chip styling dropped in Task 3 CSS
retirement") re-recorded `tests/parity.spec.mjs-snapshots/{desktop,mobile-rtl,
mobile-touch}/launchpad.png` as a side effect of a legitimate `⌘K`/`Esc` chip
fix, without noticing (or disclosing) that the re-recorded baseline also
silently absorbed a real, separate regression: the launchpad's decorative
"aurora orb" background was completely missing from the render at that
point. This violates the plan's Global Constraint that a frozen baseline is
never updated to mask a regression — the correct action would have been to
fix the orbs first, then re-record only the (legitimately changed) chip
appearance.

Root cause: Task 3's shell CSS retirement (`a0067cc`) deleted `home.css` and
`shell.css` outright, including every `.lp-orb`, `.lp-orb--lg`, and
`.lp-orb--sm` presentation rule (size, position, radial-gradient background,
blur). Only the named `@keyframes lp-float-1..7` and a
`prefers-reduced-motion: none` rule survived into
`concepts/app/styles/tailwind/shell.css`; nothing replaced the deleted
presentation rules as literal utilities on the JS-generated `<span
class="lp-orb ...">` elements in `concepts/app/pages/home/home.js` (around
line 264-273). The orb markup kept rendering; it just had no size, position,
or background, so it was invisible.

**Fix:** `concepts/app/pages/home/home.js`'s `orbs.innerHTML` now gives each
`lp-orb-N` span its own literal Tailwind utility string reconstructed from
the pre-migration `home.css` rules (`absolute rounded-full blur-[4px]` plus
an arbitrary-value `bg-[radial-gradient(...)]` matching the recovered
`.lp-orb--lg`/`.lp-orb--sm` gradients, per-span `top-[…%] left-[…%]
size-[…vmax] opacity-…`, and an `animate-[lp-float-N_…]` utility referencing
the still-live named keyframe). The `lp-orb` base class name is kept
unchanged so the existing `prefers-reduced-motion` compatibility rule in
`shell.css` continues to match.

A second, related desktop-only defect was found and fixed in the same pass:
`home.js`'s "View all" button (`viewAll.className = 'lp-view-all'`, around
line 390) had no utilities of its own — its only surviving rule was a
`max-width: 620px` media-query rule in `shell.css` (mobile-only), so on a
1440px desktop viewport it rendered as bare, unstyled link text under both
the Starred and Recent columns instead of staying hidden. Fixed by giving
the button `hidden max-[620px]:inline-flex` plus the same media query's
other properties as `max-[620px]:` utilities (matching the
`hidden max-[900px]:inline-flex` pattern already used elsewhere in this
codebase, e.g. `concepts/app/components/data-list/list.js`'s
`data-toolbar-overflow`), and removing the now-redundant `.lp-view-all` rule
from `shell.css`'s `max-width: 620px` block.

Tile and hero-centering utilities (`lp-tile`, `lp-hero`, `lp-grid`, etc. in
`home.js`) were re-inspected against the pre-migration CSS as part of this
review and found already correct — no fix was needed there. The `lp-logo`
height fix from the prior follow-up (commit `560942b`) was left untouched.

**Baseline restoration:** the three tampered PNGs
(`tests/parity.spec.mjs-snapshots/{desktop,mobile-rtl,mobile-touch}/launchpad.png`)
were restored to their true pre-migration content from commit `d758196`
(`git show d758196:<path> > <path>`), not re-recorded from the fixed render.
`launchpad-search.png` in every project was left untouched (confirmed
legitimate first-ever Task 3 capture, not part of the tampering).

Verification: after the markup fix and baseline restoration,
`npx playwright test tests/parity.spec.mjs --project=desktop
--project=mobile-rtl --project=mobile-touch -g "launchpad: baseline
appearance"` shows only the pre-existing, separately-documented
font-rendering/anti-aliasing diff (~3% of pixels, uniform text-edge/orb-edge
outline pattern, no missing or misplaced elements) — orbs, tile borders/
icon chips, hero centering, and the desktop-hidden "View all" all now match
the restored original baseline structurally.

### Critical 2: `.is-over-drawer` stacking rule lost, breaking lookup-over-drawer click interaction

`concepts/app/pages/customers/lookups.js` (lines 295, 303, 305) toggles a
`is-over-drawer` class on `#customer-lookup-search-scrim` when a lookup
search is opened from within a nested unit drawer, and branches
`closeLookupSearch()`'s cleanup (`releaseLayer()` vs `releaseFocus()`) on
its presence — a real, load-bearing JS state hook. The pre-migration
`customers.css` gave this state `#customer-lookup-search-scrim.is-over-drawer
{ z-index: 240; }` (paired with `.customer-location-dialog-scrim`), but this
rule was silently dropped during the Task 5 customer-page Tailwind
conversion (commit `003f83d`) with no literal-utility replacement — the
class relationship is inherently conditional (JS-toggled), so it cannot be
expressed as a static class on the scrim. At HEAD before this fix, zero
`.css` files referenced `is-over-drawer`, meaning a lookup opened from a
nested drawer rendered at the scrim's base `z-index: 180`
(`concepts/app/pages/customers/dialogs.html`) instead of above the drawer,
breaking click interaction.

**Fix:** added `#customer-lookup-search-scrim.is-over-drawer { z-index: 240;
}` to `concepts/app/styles/tailwind/customers.css`, next to the existing
`.customer-overlay.open` compatibility rule, plus a new compatibility
manifest row (Customers | `#customer-lookup-search-scrim.is-over-drawer` —
see `concepts/app/styles/tailwind/compatibility.md`).

This also resolved a previously-reported test failure: the prior follow-up's
report (above) attributed `tests/lifecycle.spec.mjs`'s "lookup advanced
search selects a value into the target field" mobile failure to "a `<td>`
in `customer-modal-body` intercepting a click on `#customer-lookup-select`,"
treated as a separate, unrelated pre-existing issue. The final review
correctly identified this as very likely the *same* root cause — a
missing/wrong z-index is exactly how one element ends up intercepting clicks
meant for another. Confirmed: `npx playwright test tests/lifecycle.spec.mjs
--project=desktop -g "lookup advanced search"` now **passes**, where it
previously failed on this click-interception symptom.

### Test results after this fix

- `npm run test:unit`: 53/53 passed (unchanged).
- `npx playwright test tests/lifecycle.spec.mjs --project=desktop -g "lookup
  advanced search"`: now **passes** (previously failed).
- `npm run test:browser`: see final counts recorded in this dispatch's fix
  report (`.superpowers/sdd/2026-09-14-tailwind-migration/final-review-fix-report.md`),
  compared against the prior known baseline of 325 passed / 115 failed / 22
  skipped.

## Summary / status

This migration's CSS delivery mechanism (single compiled Tailwind stylesheet,
explicit `@source` registration, compatibility manifest, size budget) is
complete and verified by 53/53 passing unit tests. The full browser matrix
originally surfaced two confirmed, pre-existing structural regressions
(launchpad hero spacing, and the `.data-menu-popover` selector/JS mismatch
breaking popover positioning most visibly on mobile viewports) plus one
unstyled element (customer row avatar) and one navigation/test-coverage
question (`email` surface), all introduced or exposed during earlier tasks'
utility conversion and confirmed unrelated to font rendering. The three
structural/styling regressions were fixed in a follow-up pass (see above);
the `email` surface question remains open and out of scope, as does the
pre-existing Escape-handler bug.

A final whole-branch review then found and this dispatch fixed two further
Critical issues that earlier passes had missed or mischaracterized: launchpad
baseline PNGs tampered to hide a missing-orbs/unstyled-"View all" regression
(baselines now restored to their true pre-migration content, regression
fixed as literal utilities), and a dropped `.is-over-drawer` stacking rule
that broke lookup-over-drawer click interaction (restored as a documented
compatibility rule). See the section above for full detail.

## Addendum: 2026-09-23 profile page baseline increase

Unrelated to this migration itself — recorded here only because
`tests/tailwind.test.mjs`'s final-budget test names this file as where a
reviewed dynamic-utility addition must be justified before raising
`FINAL_TAILWIND_BASELINE_BYTES`.

The User Profile page's sidebar and section cards were reworked to reuse the
existing `.rec-card`/`.rec-card-hd`/`.rec-card-body` primitive (already used
by `pages/invoices/templates.html` and the customer record) and a
customer-record-style plain-list sidebar, in place of a bespoke
fieldset-legend pattern. This introduces a small number of new compound
utility selectors specific to the profile page's scroll-nav
(`.profile-canvas`-scoped button states) and six `appearance-group-*` card
identifiers reused from the pre-existing Appearance dialog markup. After
trimming redundant utilities to match already-compiled equivalents from
`pages/invoices/templates.html`, the measured compiled output grew from
197,594 to approximately 197,698 bytes (~104 bytes, well under 0.1%).
`FINAL_TAILWIND_BASELINE_BYTES` in `tests/tailwind.test.mjs` is raised from
`197594` to `197800` to restore headroom without loosening the budget's
intent.

### 2026-09-23 follow-up: select-arrow SVG encoding fix

The profile page's `REC_FIELD_CLASS` select-arrow background (copied from
`pages/customers/fields.js`) used `_` in place of spaces inside a
`background-image:url(data:image/svg+xml,...)` data URI — the same pattern
already present in several other files (`pages/customers/fields.js`,
`pages/customers/lookups.js`, `pages/invoices/adjustments.js`,
`pages/invoices/payments.js`, `components/data-list/filter-controller.js`,
`components/data-list/charts.js`). Tailwind's `_`→space substitution does not
apply inside a `url(...)` value, so the compiled CSS keeps the literal `_`
characters, producing an invalid SVG (`<svg_xmlns=...>` is not a valid tag)
that browsers silently fail to render — the select's dropdown arrow was
missing. Fixed locally in `pages/profile/sections.js` by percent-encoding
spaces as `%20` and quoting the SVG's attribute values (`xmlns='...'`,
`width='12'`, etc. — unquoted attributes are invalid XML and some browsers
refuse to rasterize the result), which together produce a well-formed SVG
that renders correctly. The other files listed above have the same latent
bug but were left untouched — out of scope for the profile page task and
each is a separate, wider-blast-radius change.

This changed the utility's escaped selector text, so `FINAL_TAILWIND_BASELINE_BYTES`
is raised again from `197800` to `198260`.

### 2026-09-23 follow-up: invoice print dialog fixes

Three fixes to `pages/invoices/print-dialog.html` and its split-save-button
counterpart in `pages/invoices/chrome.js`/`operations.js`:

- Removed the redundant footer "Preview" button (the destination cards
  already select preview/save/send; the footer only needs Cancel/Apply) and
  the "Save and go to the list" save-dropdown menu item.
- Added `[aria-pressed=true]` active-state styling to the destination cards
  (`.dcard`), matching the existing `.appearance-theme-card[aria-checked='true']`
  accent-border/box-shadow convention in `shell.css`, since the cards toggled
  `aria-pressed` already but had no visual state for it.
- Applied the same select-arrow SVG fix (percent-encoded, quoted attributes)
  plus the `.rec-field`-equivalent appearance-reset/arrow/focus rules to the
  dialog's `.fld select` fields, which previously fell back to each browser's
  native select chrome instead of matching the rest of the app.

`FINAL_TAILWIND_BASELINE_BYTES` is raised again from `198260` to `198870`.

### 2026-09-23 follow-up: Report Style grouped select+button control

The print dialog's Report Style field paired a plain `select` next to an
"Edit report styles" `...` button with a `gap` between them, unlike the
app's established grouped-input pattern (`pages/customers/fields.js`'s
`.customer-lookup-control`: select and trigger button share one visual
border, the select's trailing corners flattened via
`border-start-end-radius:0`/`border-end-end-radius:0`, the trigger button
overlapping the shared edge with `margin-inline-start:-1px`). Rebuilt the
`.ctl` wrapper and its trigger button to follow that exact pattern
(including the RTL corner-flip), so the two controls now render as one
bordered group.

`FINAL_TAILWIND_BASELINE_BYTES` is raised again from `198870` to `199560`.

### 2026-09-23 follow-up: split-button double-border seam

The record chrome's "New"/caret split button (`pages/invoices/chrome.js`'s
`.newwrap main`/`.car`, also reused by the `.d2 .genbtn` responsive variant)
showed a visible double border in the middle: the main button's own
`.lbtn.out` trailing border was never suppressed, so it sat directly next to
the caret button's own leading border, producing a doubled/gapped seam
instead of one shared line. The Save split button (`.savewrap`) didn't show
this because its main button is `.lbtn.pri`, whose base border color is
transparent. Fixed by adding `border-inline-end:none` (RTL-flipped) to the
main button under `.newwrap`, matching the `border-right:0` +
corner-radius-flatten recipe already used for the print dialog's grouped
select+button control.

`FINAL_TAILWIND_BASELINE_BYTES` is raised again from `199560` to `199830`.
