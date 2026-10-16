# Final proposed capture manifest — approval required

Approval record (2026-10-16): the user approved the 128-image manifest and then
the separate Sunday-start resolution proposal. The Activities week is corrected
to October 11–17, 2026; every other capture requirement is retained. The review
and feasibility evidence below otherwise records the historical review state.
Fresh complete preflight is required before capture.

This is a review artifact, not authorization to capture. No screenshots were
created during this review. Application code, browser tests, snapshots and
the known 76-failure baseline remain unchanged. Nothing has been pushed.

This revision supersedes the initial 126/119-image estimate.

The exact machine-readable manifest is
[2026-10-16-visual-capture-manifest.json](2026-10-16-visual-capture-manifest.json).
It defines fixtures, ordered setup actions, assertions, viewport profiles,
target locators, crop rules and the 128 resolved target rectangles measured
by the DOM-only preflight against application code at `70d2d46` (HEAD
`d031fb2`, which adds documentation only).

## Decisions proposed for approval

- **128 new images**, in a new namespace. Reuse **zero** existing snapshots.
- Keep all three sign-in states: **empty email, unknown workspace, password
  identity**. They cover distinct behavior in the changed entry flow. Saved
  PIN/picker visuals are deferred from this first batch.
- Keep the seven existing project profiles. Invoice captures alone use a
  **390 × 1200** viewport on the two mobile profiles; all other mobile
  captures remain **390 × 844**. Desktop remains **1440 × 900**.
- Split invoice charges from tax/totals. Add a trailing-column invoice image
  only on mobile; the desktop grid fits, so a second desktop image would
  duplicate the leading-column image.
- Capture the current zero-tax prototype behavior. Nonzero-tax calculation
  and line-money calculations are outside this manifest and are not silently
  simulated or implemented.

## Saved-account picker review

`loadAccounts()` accepts records with a normalized email resolving to a
workspace and a nonempty string `pinHash`. It rejects malformed/non-list
storage, legacy `{tenant, user}` records, unknown emails, unassigned accounts
and records without a usable hash field. It deduplicates normalized emails,
derives the tenant from the directory instead of trusting stored tenant
values, and clears a branch that does not belong to that workspace.

**Validity is structural, not authentication eligibility.** The loader
cannot establish that the entered PIN will match an accepted hash; it accepts
any nonempty hash string rather than validating a particular digest format. It also
retains recognized non-admin saved records. Those records can be selected,
but cannot authenticate. Normal supported PIN creation can only follow admin
authentication and upserts one normalized admin identity, so the two-account
picker is chiefly exercised by retained/seeded records under the current
demo policy.

Entry routing remains useful: zero accepted records opens email entry; one
opens its PIN pane; two or more opens the picker. “Use another account”
opens email entry. Removing the last saved record also returns to email.

Selecting a record only loads its identity/workspace/branch and opens the
PIN pane. `pinSubmit()` additionally requires the admin email, a six-digit
PIN and a matching digest. `complete()` independently requires an
authenticated admin email. Password authentication also enforces the admin
email. Selection is not authorization.

**Confirmed clarity defect:** a correct PIN for a non-admin identity gets
“Incorrect PIN — try again, or use your password.” The same message appears
for an incorrect admin PIN. Rejection is mechanically consistent: the PIN
pane stays open, `aria-invalid=true`, the error and alternative-account
status appear, focus returns to the PIN, and the session remains signed out.
But the message gives the wrong reason for a non-admin rejection. The
heading “Who’s signing in?” and unconditional PIN introduction also imply
more eligibility than the demo actually supports.

DOM checks on English desktop and Arabic mobile confirmed filtering and
normalization, correct non-admin PIN rejection, unchanged shell identity,
legacy-key removal, and email fallback after removing all records. Both
locales produce the same wrong-PIN message for these different rejection
causes; the Arabic state was actually enabled, not inferred from a name.

### Necessary UI adjustment proposed, not implemented

Keep current selection, storage and authentication rules. Limit the change
to eligibility presentation and rejection copy:

1. Add a visible picker notice: **“Only admin@lastchance.local can sign in
   to this demo. Other saved identities can be used for workspace discovery.”**
2. Mark non-admin rows **“Workspace discovery only”**; mark the admin row
   **“Demo sign-in available”**. Keep selection and “Use another account.”
3. Replace the non-admin PIN introduction with an eligibility explanation
   before the input, so it does not promise that its PIN grants access.
4. Use **“This demo only supports signing in as admin@lastchance.local.
   Use another account to continue.”** for non-admin password/PIN rejection.
   Keep “Incorrect PIN” for an eligible admin's incorrect PIN.
5. Add English/Arabic copy and focused assertions for the notice, row labels,
   rejection reason, retained selection and empty-record fallback.

Proposed implementation scope: `concepts/app/pages/signin/signin.js`,
`concepts/app/pages/signin/templates.html`, `concepts/app/core/locale.js`,
and `tests/signin-pages.spec.mjs`.
No route, directory, saved-record schema or authentication-policy changes.
No code was changed for this proposal. Approval of the capture manifest does
not by itself approve this separate UI adjustment.

## Deterministic setup

Every capture gets a fresh isolated browser context/page. Clear local and
session storage before boot; use `signed-in=true`, `launchpad=true` and
`simulate-loading=false`, with `signed-in=false` for sign-in captures.
There are no saved accounts or legacy credentials in any capture fixture.
Keep theme System, density Default, scale 100%, layout Fluid, administrator
role, and other controls at the pinned build's fresh defaults. Hide the kit
with its existing `#kit-hide` control. Never inject styles, replace rendered
labels/amounts, hide product defects or modify the fixture modules.

Use one frozen static build through `scripts/serve.mjs`, an isolated local
port, `PARITY_URL`, two workers, no retries and `caffeinate -dims` for the
future capture run. Pin Chromium's installed revision with Playwright
1.63.0. Browser locale is `en-US`, timezone `Africa/Cairo`, DPR 1. Fix the
browser Date at **2026-10-13T10:24:00.000Z**, i.e. 13:24 in Cairo, using
`page.clock.setFixedTime`; timers continue. Collaboration's own clock remains
its tracked `PROTOTYPE_NOW = 2026-10-13T13:24`.

Wait for skeletons to finish, fonts to load and two animation frames. Keep
menus closed and the pointer at (0,0). Capture with animations disabled,
caret hidden, CSS pixel scale, and no full-page expansion. Focus remains on
the email/password field in sign-in states and the invalid end field in the
validation state; invoice inputs are blurred before positioning crops.

| Project | Default viewport | Scheme / contrast | Touch/mobile | App locale |
| --- | --- | --- | --- | --- |
| desktop | 1440 × 900 | Light / normal | No | English, effective LTR |
| mobile-touch | 390 × 844 | Light / normal | Yes | English, effective LTR |
| desktop-dark | 1440 × 900 | Dark / normal | No | English, effective LTR |
| desktop-high-contrast-light | 1440 × 900 | Light / more | No | English, effective LTR |
| desktop-high-contrast-dark | 1440 × 900 | Dark / more | No | English, effective LTR |
| mobile-rtl | 390 × 844 | Light / normal | Yes | Arabic, RTL |
| desktop-reduced-motion | 1440 × 900 | Light / normal | No | English, effective LTR |

All seven existing profiles use reduced motion `reduce`, including the
ordinary desktop profiles; their names do not imply different motion inputs.
The two mobile profiles use **390 × 1200 for invoice targets only**. This
provides enough space in the nested invoice canvas for complete detail
crops. It adds content coverage; it does not replace the existing 390 × 844
parity tests or establish that their layout/failures are fixed.

For **every mobile-rtl entry**, dispatch the existing `#rtl` checkbox's real
change handler with `checked=true`, then assert `html[lang=ar][dir=rtl]`
and actual Arabic content in the relevant page/pane. English starts from a
fresh default locale and asserts `lang=en` and effective LTR. EN/AR are
functional application locales; there is no separate “functional Arabic”
checkbox to invent or assume. Keep email/password `dir=ltr` and assert the
unknown address's `<bdi dir=ltr>` wrapper.

## Fixed fixtures

**Collaboration:** use the tracked `COLLAB_SEED` with no saved
`skey-proto-collab`. The JSON manifest pins its SHA-256 and entity IDs:
5 notes, 6 activities, 4 events, 7 mail records, 4 people, 8 links; schema 1,
sequence 1000, no custom folders. Each capture resets to that seed. No
random IDs, newly created drafts or current-date-dependent records.
Only reading `e1` marks it read; the event validation state holds an unsaved
invalid end. The seeded draft is opened without typing/autosave/send.

**Invoice:** open the first invoice through the real record-open control,
then select Creating a new invoice via `#mode`. Keep the initial row and
add one row. Set the following values using actual editable inputs:

| Field | Row 1 | Row 2 |
| --- | --- | --- |
| Item | VIS-001 | VIS-002 |
| UoM | EA | EA |
| Expiry | 2027-12-31 | 2027-12-31 |
| Batch | LOT-001 | LOT-002 |
| Quantity | 1 | 1 |
| Free quantity | 0 | 0 |
| Unit price | 100 | 100 |
| Discount % | 0 | 0 |

Set invoice discount Percent=10. Add one Freight / Before tax charge with
amount 25. Verify two rows, quantity sum **2**, subtotal **200.00**, items
discount **− 0.00**, invoice discount **− 20.00**, charges **+ 25.00**, tax
**+ 0.00**, net **205.00 EGP** before any invoice capture.

The current prototype fixes subtotal at 200 and tax at zero; its line tax
and total outputs remain zero after price entry. Capture those actual
values. These images cannot prove nonzero tax or calculated line totals.
The legacy line input aria-labels do not consistently match their columns;
the manifest pins the visible-column input indexes rather than trusting
those labels. This review does not fix either limitation.

**Sign-in:** no saved accounts. Empty email uses blank entry; unknown uses
`unknown@acme.local`; password identity uses `admin@lastchance.local`, the
resolved lastchance workspace and Cairo HQ, with an empty password. No
capture submits authentication, requests access or creates a PIN.

## Exact names, state, target and assertions

All names below are written only under
`tests/visual-coverage.spec.mjs-snapshots/{projectName}/` **after approval**.
No capture test or snapshot directory has been added in this review. “All”
means all seven projects; “mobile” means mobile-touch and mobile-rtl only.
The JSON manifest gives ordered selectors/actions and additional exact
content assertions for every row. Mobile calendar views are panned segments:
Activities focuses act-1; Events focuses the Tuesday column with Oct 6/13
all-day/timed examples. Desktop keeps both activity entries and the full
month in view. These mobile images do not show every day or event at once.

| Screenshot name | Projects | Exact state and required content | Target / positioning |
| --- | --- | --- | --- |
| `notes-kanban.png` | All | Default All, empty query; three columns; note-1..4 visible, archive collapsed; note-1 pinned | Viewport, origin |
| `notes-list-archived.png` | All | List + Archived quick filter; exactly note-5 “Old pricing assumptions” | Viewport, origin |
| `activities-kanban.png` | All | All; act-1..6; planned 4, in_progress 1, done 1 | Viewport, origin |
| `activities-calendar-week.png` | All | Week Oct 11–17; act-1 Oct 13 15:00/30m and act-3 Oct 15 10:00/60m; 3 unscheduled | Viewport; desktop timeline 09:00; mobile native-pan to act-1 |
| `events-calendar-month.png` | All | October 2026; evt-1..4; timed and all-day entries; five rendered event buttons including two dates for evt-4 | Viewport; mobile native-pan to Oct 13 cell so Oct 6 holiday and Oct 13 supplier visit are visible |
| `people-list.png` | All | List; per-1..4; per-3 Contact/Converted to Customer; no filters | Viewport, origin |
| `people-cards.png` | All | Cards; per-1..4; company/contact facts retained; no table | Viewport, origin |
| `mail-inbox-list.png` | All | Inbox; e1..e5; e1/e2 unread; no selected message; reading pane empty/hidden on mobile | Viewport, list scroll=0 |
| `mail-reading-e1.png` | All | e1 selected/read; subject “Payment scheduled for Sales Invoice 126”; Finance Team; invoice-126.pdf; empty quick reply | Viewport; reading/list scroll=0; mobile detail pane |
| `mail-compose-draft.png` | All | Seeded mail-d1; subject “Price list update”; To Mariam Adel; no Cc; original body; saved 12:10 | Viewport; compose scroll=0; no typing/autosave |
| `note-editor-related.png` | All | Edit note-1; unchanged title/body; two related rows per-1 and act-1; header/footer retained | `#collab-panel`; form scroll container at bottom so related rows are visible |
| `event-editor-validation.png` | All | Edit evt-1; start Oct 15 10:00, unsaved end 09:00; visible “End must be after start.”; aria-invalid and describedby set | `#collab-panel`; invalid end/error in scrollport |
| `invoice-lines-start.png` | All | Invoice fixture; two seeded rows, quantity 2; header/leading fields visible | `.rec-items`; center in `.canvas`; grid scrollLeft=0 |
| `invoice-lines-end.png` | Mobile | Same fixture; trailing price/discount/tax/total columns visible | `.rec-items`; center in `.canvas`; grid at logical trailing edge |
| `invoice-charges.png` | All | One Freight / Before tax / 25 charge; section and fields fully visible | `.rec-adjustments`; center in `.canvas` |
| `invoice-tax-totals.png` | All | Exact summary values listed above, including zero tax and net 205.00 EGP | `.rec-summary`; center in `.canvas` |
| `signin-email.png` | All | Pane 1, blank/focused email; no error/discovery; email/mobile attributes verified | Viewport, origin |
| `signin-unknown-workspace.png` | All | Pane 1; unknown@acme.local in LTR bdi; localized not-found message and Request access action; focus retained | Viewport, origin |
| `signin-password-identity.png` | All | Pane 2; admin email / lastchance / Cairo HQ; hidden username autocomplete; empty LTR password focused; signed out | Viewport, origin |

**Count:** 18 states × 7 projects = 126, plus the mobile-only trailing-column
state × 2 projects = **128**. The machine-readable manifest contains all
128 expanded project/name combinations and observed document-space bounds.

## Crop and visibility gates

Viewport captures use `(0,0,width,height)` at the profile's viewport size.
Element captures use the named element's border box, zero padding. Resolve
its document rectangle as `getBoundingClientRect() + window.scrollX/Y` and
round outward: floor left/top, ceil right/bottom. Use native locator
screenshot behavior rather than hardcoding offsets from one viewport.
The JSON records the preflight's exact observed rectangle and outward-rounded
clip for every target. Examples from the reviewed-source DOM preflight:

| Profile | Target | Observed document rect x/y/w/h, CSS px |
| --- | --- | --- |
| Desktop | `#collab-panel` | 880 / 0 / 560 / 900 |
| Mobile LTR | `#collab-panel` | 23.40625 / 0 / 366.59375 / 844 |
| Mobile RTL | `#collab-panel` | 0 / 0 / 366.59375 / 844 |
| Desktop | `.rec-items` | 344 / 419.296875 / 1068 / 208.265625 |
| Mobile LTR, invoice 1200 high | `.rec-items` | 84 / 566 / 274 / 241.96875 |
| Mobile RTL, invoice 1200 high | `.rec-items` | 32 / 604 / 274 / 241.96875 |
| Desktop | `.rec-adjustments` | 344 / 534.5625 / 632 / 155.4375 |
| Mobile LTR, invoice 1200 high | `.rec-adjustments` | 84 / 495.96875 / 274 / 381.4375 |
| Mobile RTL, invoice 1200 high | `.rec-adjustments` | 32 / 533.96875 / 274 / 381.4375 |
| Desktop | `.rec-summary` | 992 / 534.5625 / 420 / 282.171875 |
| Mobile LTR, invoice 1200 high | `.rec-summary` | 84 / 577.40625 / 274 / 296.171875 |
| Mobile RTL, invoice 1200 high | `.rec-summary` | 32 / 653.40625 / 274 / 296.171875 |

Use the actual nested `.canvas` for vertical positioning. For the invoice
grid, logical leading edge is `scrollLeft=0`; logical trailing is
`(RTL ? -1 : 1) * (scrollWidth-clientWidth)`. Preflight observed mobile LTR
**+734** and mobile RTL **−766**; positive-only scrolling would fail in RTL.
All desktop grid columns fit at 1440, so desktop trailing captures are absent.

Before any element capture, require its entire border box inside the
**visual viewport** and every ancestor with clipping overflow, with at most
1 CSS pixel rounding tolerance. Mobile browser visual-viewport offsets can
be nonzero after focusing/scrolling; do not mistake layout-viewport x/y for
physical screenshot coordinates. Reject a clipped, empty or obscured target
rather than capture it. Recheck critical fields/outputs in their scrollport,
not just Playwright `toBeVisible()` (which alone does not prove in-viewport).

Keep headers/cell backgrounds and stacking at their actual styles. DOM
inspection found these invoice headers are currently **static**, with the
header bottom exactly meeting the first row top and no hit-test overlap.
For line captures, verify that the grid header and the relevant cells are simultaneously in view,
that no sticky header or footer covers them (hit-testing/intersection), and
that ancestor scroll positions stop changing over two frames. Do not force
sticky positioning, hide columns, change overflow CSS or mask the header to
make a picture fit. A failed visibility gate blocks that capture and is
reported; it never justifies editing the 76-failure baseline.

## Mail comparison and reuse decision

Source inspection of `tests/support/browser.mjs` and DOM comparison on all
seven projects confirmed that existing `parity › email` opens
Notifications → Email → first notification, selecting `e1` in its reading
pane and marking it read. The proposed Inbox state enters the mailbox
without selecting a message. On mobile this is especially different:
proposed Inbox shows the list and hides reading; existing parity hides the
list and shows the selected message. They are not identical states.

**Do not reuse or replace `tests/parity.spec.mjs-snapshots/*/email.png`.**
The new reading image also uses this manifest's fresh-state/date/kit policy,
so no carry-forward of a historical baseline is approved by this proposal.
This was a source/DOM comparison, not a new pixel comparison or screenshot.

## Review evidence and remaining approval

DOM-only preflight passed **128/128** proposed project/state entries,
including target geometry/clipping checks, actual Arabic state and invoice
fixture values. Picker checks passed on English desktop and Arabic mobile;
Mail entry-state comparison completed on all seven projects. Additional
DOM checks covered 14 calendar states after explicit panning and 17
calendar/editor/invoice visibility cases. No screenshot
API was called. These checks establish setup/crop feasibility; they do not
substitute for reviewing the eventual pixels or certify all UI behavior.

Scratch evidence remains in `/private/tmp/skey-visual-review/`:
`final-preflight.json`, `final-preflight.mjs`, `calendar-final.json`,
`visibility-details.json`, `findings.json`, and the logs.
No extra full regression run was needed for this documentation-only review.
The accepted prior verification and the 76 known failures remain unchanged.

Approval is requested for the **128-image manifest**, its three sign-in
states, mobile invoice viewport override and no-reuse decision. The picker
copy adjustment is a separate proposal above. If application code changes
before capture, build a fresh frozen copy and rerun DOM preflight against
that revision before executing an approved capture manifest. Preserve all
existing snapshots, branches/worktrees and the three `.shot*.mjs` scripts;
do not push.
