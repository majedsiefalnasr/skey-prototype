# Demo prototype delivery — acceptance record

**Final regression completed with failures; prototype acceptance is pending.**
Recovered Claude session: `f867833a-441a-4d4b-b528-0b1fec5600ff`.
Continued directly through 2026-10-18 without subagents. No commits, pushes,
resets, stashes or cleanup of pre-existing work. This verification pass changed
no app code or test assertions; it copied only the 89 explicitly authorized PNGs.

## Implementation

- Completed the recovered invoice edit/create/delete work: changes survive
  in-app navigation in memory and reset on reload (approved P-05). Created
  numbers follow the highest fixture number and are not reused after delete.
  Saved list values copy the displayed header and net amount; no financial
  calculation or storage layer was introduced. Posted/Canceled/Deactivated
  rows cannot be deleted through list actions.
- Invoice Undo/Discard restores original line/payment/charge nodes and field
  values, retaining their handlers. Tests reproduced header and structural
  rollback defects before the fix. Record arrows open actual neighboring rows.
- Customer create/edit writes back to the list, retains entered fields in
  memory, and reopens the saved row. Geography create inserts a unique node.
  Customer/geography record pagers reflect actual filtered/sorted positions.
- Demo dates, canonical Majed Sief Alnasr identity (P-06), Al Noor's customer
  role, branch/location references and inactive-customer chronology agree.
  The assistant explicitly identifies its shared representative example.
- Arabic instructions, toast feedback, dialogs, invoice labels and dynamic
  payment/charge controls use the existing locale mechanism (P-07). Visual
  review additionally found and corrected untranslated invoice primary/footer
  controls, customer section headings and Mail reading toolbar labels.
- The user then explicitly extended Arabic scope to Profile, Organization
  Center and Geography record layouts. Their section/field labels, account
  controls, session safety/confirmation copy and validation now use the same
  locale mechanism. Profile translation preserves typed values. Geography
  option labels translate while stored enum values stay stable. Organization
  table and open-dialog labels refresh without resetting a typed reason.
- The recovered accessibility, truthful navigation, mobile list visibility,
  deferred-chart and unsaved-work fixes remain in the integrated candidate.

Invoice line/payment details, history and totals remain shared representative
fixtures under A-13. VQA-07 financial-token formatting stays deferred.
English fixture values remain permitted under DAT-07. No related document
is created by Receipt Voucher/Sales Return; their feedback states the demo limit.

## Requirement status

“Implemented” below is a code/focused-evidence status. It does not mean that
visual review or prototype acceptance has passed. The master specification carries the
same distinction.

| Requirements | Status | Evidence |
|---|---|---|
| SHL-03/04/05/07 | Implemented; final functional checks pass | `navigation-honesty`, `leave-guard`, invoice/customer journeys |
| INV-02–09, INV-11 | Implemented; visual differences remain | `invoice-journey`, `invoice-selection`, `data-list.test` |
| INV-12 | Deferred by D-06 | No token-formatting policy added |
| CUS-03/04/05 | Implemented; final functional checks pass | `customer-journey`, `lifecycle` |
| GEO-02/03 | Implemented; final functional checks pass | `invoice-geography` |
| COL-03 | Existing draft flush verified by recovered task | `mail-draft-exit` |
| DAT-01–05 | Implemented; visual differences remain | Ten `demo-data.test` invariants and record journeys |
| DAT-06/07 | Accepted limitations retained | Representative amounts and fixture text |
| UX-05 | Scoped corrections verified; user spot-check available | `delivery-locale` browser/unit, `i18n-coverage.test` |
| UX-06/07/08 | Implemented; scoped checks pass | `a11y-ledger`, `chart-parity`, static checks |
| UX-09 | Preserved policy | No unexplained raster accepted; only 89 exact user-approved PNG replacements applied |
| Previously accepted SHL/INV/CUS/COL/ACC/UX requirements | Final suite executed; protected visual differences and toolbar timeouts remain | Final comparison linked below |

## Corrected historical comparison

The old T0 build was contaminated by 381 scanned files from an old tool
worktree after the copy operation removed nested Git boundaries. Earlier
attribution to dependency scanning was inaccurate. Rebuilding the original
T0 application with that tool metadata outside the build root changes only
`tailwind.css`: **288633 → 276907 bytes**. All other historical build files,
all 281 test/snapshot files and the seven-project configuration match the
original. The current candidate CSS (**278373 bytes**) matches a fresh
actual-repository build. Servers return exact disk bytes; browser version,
configuration hashes and complete build inventories are recorded in the
[baseline correction report](2026-10-18-baseline-correction.md).

The separate corrected historical run completed **1,359 passed / 74 failed /
541 skipped**, 31.6 minutes. Every original T0.1 failure name (73) still
fails; one additional case is the documented intermittent mobile-rtl GEO-03
assertion expecting English “Inactive” while the UI correctly displays Arabic.
See the [exact historical results](2026-10-18-corrected-historical-suite.json).

The historical **2026-10-16 record of 76 failures remains unchanged**, as does
the original 73-name T0.1 measurement. The exact original 76-name list was
not retained; no name-by-name comparison to those unavailable names is claimed.
The corrected run is a separate control measurement, not a redefinition of
either historical record. Final comparison observes all 1,974 corrected-control
test identities, keyed by file, title and project; none are missing.

## Exact-path replacements and functional authority

The user supplied **89 exact paths**. The guarded copier applied those paths
alone: **50 capture-state PNGs and 39 original screenshot-test PNGs**. Before/
after SHA-256, exact authorization text and reviewed manifest hash are recorded
in the [copy audit](2026-10-18-delivery-png-approvals.json). All 89 applied
hashes match. The remaining **144 starting PNGs are byte-identical**; no
snapshot path was added or removed. The 34 other proposals remain protected.
No blanket update, tolerance, mask or assertion change was used.

The formerly blocking decision was **P-05**, not a new implementation choice.
The user explicitly answered **“Approve in-memory persistence”**: invoice,
customer and geography changes survive in-app navigation and reset on reload.
No unresolved decision currently blocks those implemented fixes. P-04 about
the payment override control remains a separate pending proposal; existing
control behavior was retained, and no approval for it is inferred.

The final full run passes all **56 CRUD/header-persistence cases**: eight each
on all seven projects, covering invoice create/delete/no-number-reuse, locked
row protection, copied displayed net/header values, customer save/create and
geography create/reopen. See [focused verification](2026-10-18-final-focused-verification.json).

## Final verification

Frozen app: `/private/tmp/skey-delivery/codex-resume/verified-frozen`, served
on port 4260. All **449** build files and every test/config input remained
unchanged throughout the full run. All **60** inventoried changed app sources
retain their recorded hashes. No app source changed during this verification.

| Gate | Final evidence and scope |
|---|---|
| G1 Unit | Post-replacement serial root suite **165 passed / 0 failed**. A preceding restricted attempt failed localhost server binding with EPERM; that log is preserved, not counted as passing |
| G2 Build/static | Fresh actual-repository build CSS matches final frozen CSS; unchanged CSS budget passes; earlier 124-module syntax result retained |
| G3 Focused | All earlier 161 exact focused identities re-executed in full run: **156 passed / 5 inherited skips**, none missing; 56 CRUD/header cases pass |
| G4 Journeys | Complete seven-project final run executed; exact case/project results and counts linked below |
| G5 Visual | Only 89 approved replacements applied. Post-copy preflight **128/128** and capture **128/128** contracts passed. Separate exact comparison: **48/50** approved capture images identical; two unexplained corner variants remain open |
| G6 Accessibility | Scoped checks pass in final suite; existing project scope/skips retained. No comprehensive accessibility certification claimed |
| G7 Full regression | **Completed, failed:** 1,979 passed / 41 failed / 556 skipped, 43.1 minutes, two workers, zero retries, caffeinate. 39 screenshot assertions + 2 historical toolbar timeouts |
| G8 Arabic | All earlier focused Arabic checks pass again, including mobile-rtl. Prior rendered Profile/Organization label audit and eight review images retained; fixture values/font names excluded. User language spot-check remains available |
| G9 Preservation | **Passed within exact authorization:** 89 approved PNG changes, 144 unchanged protected PNGs, zero unapproved/added/missing snapshot paths; original 76/73 records, final app/test/config hashes and HEAD retained |

The 556 skips comprise 541 baseline project-scoped cases plus 15 recovered
mobile-only accessibility/statistics cases across five desktop profiles.
This verification pass added no skips. The five focused skips are inherited
desktop VQA-05 scope. Desktop-only collaboration flows are not claimed to
have passed on profiles where they were skipped.

## Every new failure and carried failures

[Final exact-name comparison](2026-10-18-final-regression-comparison.json)
records **40 carried failures, one new failure, and 34 historical failures
now passing**. Closures comprise 13 customer lifecycle cases, the locale-
incorrect GEO-03 assertion, and 20 approved screenshot cases. The current
suite contains 602 additional cases relative to T0; the comparison retains
all control identities and their statuses.

The **sole new full-suite failure** is:

- `messaging.spec.mjs` / `reading a notification email preserves unread state and appearance` / **desktop**.
- Exact assertion: `email-reading.png`, `maxDiffPixels: 0`; **1172 pixels differ**.
- Visible fixture changes: recipient Kathleen → Majed Sief Alnasr; times
  16:05/14:20 → 13:05/12:20; Vendor Portal quotation → Customer Portal quotation
  request. The preceding unread-count and reading-pane assertions pass.
- Actual SHA-256 `8ce9d89cb96d5f559584e02b3db8e267d0563cd8b8688a634d82464287196b08`
  exactly matches the candidate already reviewed. Protected baseline SHA-256
  remains `45eb1e17146c8b63fed24aae6fdc40c90657003107897d53c4bdda7fd0a699ad`.
- This exact PNG path was omitted from the 89-path authorization. Its original
  baseline and failed result are retained; no additional replacement is applied.

Of the carried failures, **38 are exact screenshot differences against
protected baselines** and **two are the original mobile-touch/mobile-rtl
toolbar Escape/outside-click timeouts (#16)**. Their exact names, errors,
attachments, per-path review reasons and corrected-control statuses are in
the final comparison JSON. They are not suppressed or counted as passing.

Two **additional exact repeat-capture discrepancies**, outside the full-suite
test count, remain unexplained on the identical frozen app:

| Approved path suffix | Difference | Visible location |
|---|---:|---|
| `desktop-high-contrast-light/activities-calendar-week.png` | 12 pixels | Activities search input upper rounded corners |
| `desktop-high-contrast-dark/events-calendar-month.png` | 6 pixels | Day/Week/Month selector lower outer rounded corners |

The approved repository bytes are retained. Actual images, hashes and exact
bounds are in [capture comparison](2026-10-18-approved-capture-comparison.json)
and `2026-10-18-capture-variants/`. No harmlessness claim, tolerance, mask or
new replacement is made. Earlier L-05 investigations and both held mail-
compose variants remain open; D-04 retains its 18 stale parity baselines.

## Results by project

| Project | Passed | Failed assertions | Timeouts | Skipped |
|---|---:|---:|---:|---:|
| desktop | 355 | 1 | 0 | 12 |
| desktop-dark | 275 | 4 | 0 | 89 |
| desktop-high-contrast-dark | 276 | 3 | 0 | 89 |
| desktop-high-contrast-light | 275 | 4 | 0 | 89 |
| desktop-reduced-motion | 275 | 4 | 0 | 89 |
| mobile-rtl | 262 | 11 | 1 | 94 |
| mobile-touch | 261 | 12 | 1 | 94 |

## Reproduction, evidence and completion boundary

```sh
node --test --test-concurrency=1 tests/*.test.mjs
caffeinate -dims env PARITY_URL=http://127.0.0.1:4260 \
  PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/skey-delivery/codex-resume/full-post-approval.json \
  npx playwright test --workers=2 --retries=0 --reporter=line,json \
  --output=/private/tmp/skey-delivery/codex-resume/pw-full-post-approval
```

Raw corrected-control/final Playwright reports and both post-copy capture
reports are archived losslessly in `2026-10-18-regression-evidence/`, with
SHA-256 manifest. Original 165-unit/156-focused/128-capture evidence is also
retained in the dated visual review packet. The [final preservation audit](2026-10-18-final-preservation.json)
records every authorized changed PNG, unchanged input proofs and HEAD
`f29d61c7e15fd19b7603a25dd6c0995535122778`.

Review was performed directly without subagents, as requested. No independent
review or all-green regression claim is made. Financial formatting remains
deferred, representative invoice amounts/details retain A-13 disclosure,
fixture text remains allowed under DAT-07, and data resets on reload.

The requested baseline correction, exact replacements, functional decision
audit and final full regression are complete. Prototype visual acceptance
remains pending because failed protected snapshots, historical toolbar
timeouts and unexplained raster variants remain open. No additional PNG
replacement is authorized. No commit or push was made or requested.


---

## Current delivery — final remediation and acceptance review (2026-10-18)

**Implementation complete within the approved scope. Verification execution complete with failures. Prototype acceptance remains pending.** The complete final suite ran against the actual frozen application: **2,006 passed / 42 failed / 556 skipped**, 2,604 cases, 37.8 minutes. All failures are protected screenshot comparisons; there are no remaining functional failures or test timeouts. Four Mail comparisons are newly failing against either the corrected control or the preceding delivery and require the exact-path decision below. Raster causes remain unresolved in the separately documented capture investigations. This section supersedes current-delivery conclusions above without rewriting any historical measurement.

### Changes made

| Files | User-facing correction | Verification |
|---|---|---|
| `concepts/app/pages/email/templates.html` | Removes the duplicate desktop horizontal/vertical Mail margins. Keeps the same mobile canvas inset as Customers. | 21 strict gutter cases; Mail behavior and capture contracts |
| `concepts/app/pages/notes/templates.html`, `concepts/app/pages/activities/templates.html`, `concepts/app/pages/events/templates.html` | Removes duplicate desktop padding from collaboration toolbars and bodies. Retains the existing mobile canvas edge and bottom flag reserve. | Same 21 cases; calendar/Mail VQA checks; 128 contracts |
| `concepts/app/pages/for-you/templates.html`, `concepts/app/pages/placeholder/templates.html` | Aligns For You, Dashboard and unavailable-page headings/cards with Customers. Matches heading and body edges separately, including compact/comfortable density and boxed layout. | All 7 projects × 3 settings, passed |
| `concepts/app/components/data-list/menu-controller.js`, `concepts/app/core/delivery-translations.js` | Translates Manage actions, preferences, border labels, frozen-column names, statistics styles and scoped report labels. Keeps stored preference/enum values unchanged. | Red reproduction, seven final Manage cases, eight-context label audit, full locale suite |
| `concepts/app/pages/invoices/operations.js` | Prevents invoice rendering from overwriting the unavailable-page breadcrumb with “All.” Adds the placeholder to the existing exclusion list. | Direct-load red reproduction; strengthened 21-case gutter/breadcrumb test passes |
| `tests/data-list-component.spec.mjs` | Corrects the toolbar test’s English-only Columns locator and its covered “outside” click. The real app already handled Escape/focus/outside-click correctly. The replacement uses a unique structural locator and a hit-tested physical header click, retaining every behavioral assertion. | Original traces, two mobile diagnostic passes, seven focused passes, seven final-suite passes |
| `tests/delivery-locale.spec.mjs`, new `tests/page-gutters.spec.mjs` | Adds targeted Arabic preference/column and exact gutter/breadcrumb regression coverage. | 28 new cases pass in the final full run |

The [mission-only source patch](2026-10-18-remediation-evidence/mission-source.patch) compares each existing edited file with its initial checkpoint copy; all before-copy hashes were verified. No unrelated source change was made. The [layout contact sheet](2026-10-18-remediation-evidence/layout-contact-sheet.png) and [full-resolution review inventory](2026-10-18-remediation-evidence/verified-final-layout-review/geometry.json) retain desktop/Arabic mobile evidence. All eight scoped menu contexts resolve menu/column labels to Arabic; only Excel/PDF/CSV/Word remain Latin in the inspected invoice menu. Hidden Organization audit/staff contexts were not expanded.

### Corrected baseline and authoritative build

The separate corrected historical control remains **1,359 passed / 74 failed / 541 skipped**, 1,974 cases. It is the actual T0 application rebuilt after removing the accidental scanning of 381 old tool-worktree files; only its CSS changed from 288,633 to 276,907 bytes. The historical **2026-10-16 76-failure record** and the original **73-name T0.1 measurement** are unchanged. The exact original 76-name list is unavailable; no invented name comparison is made. All 73 recorded names were observed: 40 still fail and 33 now pass. The additional corrected-control GEO-03 locale failure passes.

Before edits, [live evidence reconciliation](2026-10-18-remediation-evidence/reuse-verification.json) verified every prior 449-file frozen-build hash, the prior source/test/config inputs, the corrected control inventory, all 89 applied approved PNG hashes and all 144 other protected PNGs. The old baseline reports were read and retained: [correction](2026-10-18-baseline-correction.md), [corrected results](2026-10-18-corrected-historical-suite.json), [prior full comparison](2026-10-18-final-regression-comparison.json), [89-path approval audit](2026-10-18-delivery-png-approvals.json).

Final frozen build: `/private/tmp/skey-remediation-20261018-fux37ka6/verified-final`, served at **http://127.0.0.1:4276/**. Full inventory: **1156 files**, including public report assets copied by the existing build allowlist. Inventory SHA-256: `2bf9136a1826772ae92a1a0138f14fc05ebb89bbe57553ec909c7c190dcff20d`. The increased inventory is not extra application CSS. The final stylesheet is **278,179 bytes**, SHA-256 `b59fa36efa88321c0c8eb723820bc5125f103710bb37cc1147b204f08742f057`, below the unchanged **284,821-byte** ceiling.

[Server-byte checks](2026-10-18-remediation-evidence/verified-final-server-bytes.json) prove that HTML, CSS and all three changed JavaScript modules equal disk bytes. [Every build-file hash](2026-10-18-remediation-evidence/verified-final-build.json) and [all 486 source/test/config hashes](2026-10-18-remediation-evidence/verified-final-inputs.json) remain unchanged through the final regression and focused reproductions. Chromium **153.0.8010.12** matches the approved capture runtime. Manifest SHA-256 `0eb60179f2d176087329bcef63a28fb3b57319994040cdc175eea60a41df561f`; original runner SHA-256 `7298931ed584af2480d0a98b285201b5eb3d7c8510f6d0e7612ccdc6cfa37b9e`. Both protected originals are unchanged.

The requested dev server remains available at **http://127.0.0.1:4173/**. Its document returned HTTP 200 and exactly matched the frozen HTML after a fresh dev rebuild: [dev-server check](2026-10-18-remediation-evidence/dev-server-check.json). Browser regression used the immutable server, not that rebuilding server.

### Current test evidence

| Gate | Actual result | Evidence |
|---|---|---|
| Unit | **165 passed / 0 failed** | [commands/unit-verified-final.log](2026-10-18-remediation-evidence/commands/unit-verified-final.log) |
| Build/static/CSS | Build completed; all 6 changed JS/test syntax checks and `git diff --check` passed; CSS budget unchanged and passing | [commands/build-verified-final.log](2026-10-18-remediation-evidence/commands/build-verified-final.log); [static-final.json](2026-10-18-remediation-evidence/static-final.json) |
| CRUD/header persistence | **56/56 passed**, eight per browser project | [final-functional-evidence.json](2026-10-18-remediation-evidence/final-functional-evidence.json) |
| Earlier focused identities | **156 passed / 5 existing skips**, all 161 exact identities observed again in final full run | Same functional evidence |
| New regressions / toolbar | **21 gutter/breadcrumb + 7 Arabic Manage + 7 toolbar cases passed** in the final full run | Same functional evidence |
| Capture contracts | Final **128/128 preflight** and **128/128 capture**, zero failed/unrun | [raw/verified-final-preflight.json.gz](2026-10-18-remediation-evidence/raw/verified-final-preflight.json.gz); [raw/verified-final-capture.json.gz](2026-10-18-remediation-evidence/raw/verified-final-capture.json.gz) |
| Full seven-project regression | **2,006 passed / 42 failed / 556 skipped**, 37.8 min, exit 1; zero flaky cases/global errors/timeouts | [raw/full-final.json.gz](2026-10-18-remediation-evidence/raw/full-final.json.gz); [commands/full-final.log](2026-10-18-remediation-evidence/commands/full-final.log) |
| Focused screenshot reproduction | Five expected protected differences reproduced plus one passing adaptive check; separate desktop Mail parity reproduction also failed as expected. All six actual PNGs match the full-run hashes exactly. No assertion changed. | [raw/final-focused-reproduction.json.gz](2026-10-18-remediation-evidence/raw/final-focused-reproduction.json.gz); [raw/parity-mail-reproduction.json.gz](2026-10-18-remediation-evidence/raw/parity-mail-reproduction.json.gz) |

A preliminary full-suite attempt was deliberately interrupted after rendered Arabic review found missing statistics/frozen-column labels: **230 passed / 7 skipped / 2 interrupted / 2,365 not run**, exit 130. It is not final-regression evidence. Its raw report and log are retained. Earlier red/partial focused runs are also archived. One serial unit attempt had **164 passed / 1 failed** from `ENOTEMPTY` removing a generated old-build directory while the dev server was active. The exact external writer was not proven. Temporarily pausing/restoring that server isolated subsequent runs; the final source passes 165/165. No errors were hidden and no filesystem cleanup was performed to obtain that result.

Actual final commands (wrappers impose bounds; recorded logs retain their outcomes):

```sh
node --test --test-concurrency=1 tests/*.test.mjs
npm run build
python3 /private/tmp/skey-remediation-20261018-fux37ka6/run-bounded.py 3600 caffeinate -dims env \
  PARITY_URL=http://127.0.0.1:4276 \
  PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/skey-remediation-20261018-fux37ka6/full-final.json \
  npx playwright test --workers=2 --retries=0 --update-snapshots=none \
  --reporter=line,json --output=/private/tmp/skey-remediation-20261018-fux37ka6/full-final-out
# Capture cwd: /private/tmp/skey-remediation-20261018-fux37ka6/verified-final-capture-harness
PARITY_URL=http://127.0.0.1:4276 node scripts/visual-coverage.mjs \
  --mode=preflight --evidence=/private/tmp/skey-remediation-20261018-fux37ka6/verified-final-capture-evidence \
  --build-root=/private/tmp/skey-remediation-20261018-fux37ka6/verified-final
# Then the same command with --mode=capture; each was externally bounded to 300s.
```

### Exact comparison and failure inventory

Every corrected-control identity (1,974) and prior-delivery identity (2,576) was observed; **none are missing**. There are 630 identities added to the control, including 28 since the prior delivery. **40 final failures are inherited by exact identity from the corrected control; two are new to that control** (desktop Mail reading and desktop Mail parity). **Three are newly failing versus the preceding delivery**: desktop Mail parity and the two mobile Mail reading images. The latter two were historical control failures, passed after their approved replacements, and reopened when the user requested the new Mail spacing. **34 control failures now pass**, including both toolbar timeouts and GEO-03. All pass/fail/skip identities are retained separately in the comparison.

| Browser project | Passed | Failed (all screenshots) | Skipped |
|---|---:|---:|---:|
| desktop | 358 | 2 | 12 |
| desktop-dark | 279 | 4 | 89 |
| desktop-high-contrast-dark | 280 | 3 | 89 |
| desktop-high-contrast-light | 279 | 4 | 89 |
| desktop-reduced-motion | 279 | 4 | 89 |
| mobile-rtl | 266 | 12 | 94 |
| mobile-touch | 265 | 13 | 94 |

Failure reasons: **M** = intended Mail gutters plus approved canonical data; **A** = intended Arabic PO Reference label plus previously reviewed list changes; **R** = pixels exactly match a prior reviewed candidate, with its protected-baseline rationale preserved; **H** = pixels exactly match the corrected historical control, with no current-delivery replacement proposed. Every failure below is still a failure; none is treated as passing. Functional claims rely on separate passing cases. Full risks, original/candidate SHA-256, images and historical D-04 policy are in [comparison.json](2026-10-18-remediation-evidence/comparison.json) and [the visual review](2026-10-18-remediation-evidence/visual-review.html).

#### New relative to corrected control

| Test file — exact title | Project | Reason | Prior-delivery change | Image |
|---|---|---|---|---|
| `messaging.spec.mjs` — reading a notification email preserves unread state and appearance | desktop | M | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop/messaging-email-reading-candidate.png) |
| `parity.spec.mjs` — email: baseline appearance | desktop | M | new / reopened | [candidate](2026-10-18-remediation-evidence/full-failures/desktop/parity-email-candidate.png) |
#### Inherited from corrected control

| Test file — exact title | Project | Reason | Prior-delivery change | Image |
|---|---|---|---|---|
| `data-list-component.spec.mjs` — invoice list retains list behavior | mobile-touch | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/data-list-component-list-candidate.png) |
| `data-list-component.spec.mjs` — invoice responsive retains list behavior | mobile-touch | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/data-list-component-responsive-candidate.png) |
| `data-list-component.spec.mjs` — invoice adaptive retains list behavior | mobile-touch | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/data-list-component-adaptive-candidate.png) |
| `data-list-component.spec.mjs` — invoice cards retains list behavior | mobile-touch | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/data-list-component-cards-candidate.png) |
| `data-list-component.spec.mjs` — invoice list retains list behavior | mobile-rtl | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-rtl/data-list-component-list-candidate.png) |
| `data-list-component.spec.mjs` — invoice responsive retains list behavior | mobile-rtl | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-rtl/data-list-component-responsive-candidate.png) |
| `data-list-component.spec.mjs` — invoice adaptive retains list behavior | mobile-rtl | A | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-rtl/data-list-component-adaptive-candidate.png) |
| `data-list-component.spec.mjs` — invoice cards retains list behavior | mobile-rtl | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-rtl/data-list-component-cards-candidate.png) |
| `messaging.spec.mjs` — reading a notification email preserves unread state and appearance | mobile-touch | M | new / reopened | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/messaging-email-reading-candidate.png) |
| `messaging.spec.mjs` — reading a notification email preserves unread state and appearance | desktop-dark | M | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-dark/messaging-email-reading-candidate.png) |
| `messaging.spec.mjs` — reading a notification email preserves unread state and appearance | desktop-high-contrast-light | M | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-high-contrast-light/messaging-email-reading-candidate.png) |
| `messaging.spec.mjs` — reading a notification email preserves unread state and appearance | desktop-high-contrast-dark | M | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-high-contrast-dark/messaging-email-reading-candidate.png) |
| `messaging.spec.mjs` — reading a notification email preserves unread state and appearance | mobile-rtl | M | new / reopened | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-rtl/messaging-email-reading-candidate.png) |
| `messaging.spec.mjs` — reading a notification email preserves unread state and appearance | desktop-reduced-motion | M | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-reduced-motion/messaging-email-reading-candidate.png) |
| `parity.spec.mjs` — launchpad: baseline appearance | mobile-touch | H | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/parity-launchpad-candidate.png) |
| `parity.spec.mjs` — list: baseline appearance | mobile-touch | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/parity-list-candidate.png) |
| `parity.spec.mjs` — record: baseline appearance | mobile-touch | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/parity-record-candidate.png) |
| `parity.spec.mjs` — customers-list: baseline appearance | mobile-touch | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/parity-customers-list-candidate.png) |
| `parity.spec.mjs` — customer-record: baseline appearance | mobile-touch | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/parity-customer-record-candidate.png) |
| `parity.spec.mjs` — geo-list: baseline appearance | mobile-touch | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/parity-geo-list-candidate.png) |
| `parity.spec.mjs` — geo-record: baseline appearance | mobile-touch | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/parity-geo-record-candidate.png) |
| `parity.spec.mjs` — email: baseline appearance | mobile-touch | M | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-touch/parity-email-candidate.png) |
| `parity.spec.mjs` — record: baseline appearance | desktop-dark | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-dark/parity-record-candidate.png) |
| `parity.spec.mjs` — customer-record: baseline appearance | desktop-dark | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-dark/parity-customer-record-candidate.png) |
| `parity.spec.mjs` — email: baseline appearance | desktop-dark | M | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-dark/parity-email-candidate.png) |
| `parity.spec.mjs` — record: baseline appearance | desktop-high-contrast-light | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-high-contrast-light/parity-record-candidate.png) |
| `parity.spec.mjs` — customer-record: baseline appearance | desktop-high-contrast-light | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-high-contrast-light/parity-customer-record-candidate.png) |
| `parity.spec.mjs` — email: baseline appearance | desktop-high-contrast-light | M | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-high-contrast-light/parity-email-candidate.png) |
| `parity.spec.mjs` — customer-record: baseline appearance | desktop-high-contrast-dark | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-high-contrast-dark/parity-customer-record-candidate.png) |
| `parity.spec.mjs` — email: baseline appearance | desktop-high-contrast-dark | M | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-high-contrast-dark/parity-email-candidate.png) |
| `parity.spec.mjs` — launchpad: baseline appearance | mobile-rtl | H | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-rtl/parity-launchpad-candidate.png) |
| `parity.spec.mjs` — list: baseline appearance | mobile-rtl | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-rtl/parity-list-candidate.png) |
| `parity.spec.mjs` — record: baseline appearance | mobile-rtl | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-rtl/parity-record-candidate.png) |
| `parity.spec.mjs` — customers-list: baseline appearance | mobile-rtl | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-rtl/parity-customers-list-candidate.png) |
| `parity.spec.mjs` — customer-record: baseline appearance | mobile-rtl | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-rtl/parity-customer-record-candidate.png) |
| `parity.spec.mjs` — geo-list: baseline appearance | mobile-rtl | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-rtl/parity-geo-list-candidate.png) |
| `parity.spec.mjs` — email: baseline appearance | mobile-rtl | M | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/mobile-rtl/parity-email-candidate.png) |
| `parity.spec.mjs` — record: baseline appearance | desktop-reduced-motion | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-reduced-motion/parity-record-candidate.png) |
| `parity.spec.mjs` — customer-record: baseline appearance | desktop-reduced-motion | R | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-reduced-motion/parity-customer-record-candidate.png) |
| `parity.spec.mjs` — email: baseline appearance | desktop-reduced-motion | M | still failing | [candidate](2026-10-18-remediation-evidence/full-failures/desktop-reduced-motion/parity-email-candidate.png) |

There are **no unexplained new full-suite failures** after focused reproduction: all newly failing comparisons show the requested Mail geometry. The Arabic adaptive image differs from its earlier reviewed candidate only in the newly translated PO Reference label; stored data is unchanged. Two inherited launchpad failures match corrected-control PNGs byte-for-byte and remain protected under the recorded stale/unresolved policy. This classification does not make protected screenshots green.

### Visual review and raster findings

The 89 replacements authorized before this mission remain applied with their audited hashes. **This mission replaced zero test PNGs. All 233 starting PNGs are byte-identical to the checkpoint: 89 previously approved versions and 144 other protected versions.** No snapshot was added or removed. No blanket update, new mask, tolerance, skip or assertion weakening was used.

The final 128 captured images compare as **53 identical / 75 different** against preserved baselines: **49 requested gutter changes**, **4 previously reviewed mobile People changes**, **15 unresolved invoice raster states**, **2 original corner-variation states with intended gutter changes**, and **5 additional Mail/Notes corner variants**. The [per-path classification](2026-10-18-remediation-evidence/final-capture-classification.json) gives every hash, bound, pixel count and policy. [All 117 differing paths](2026-10-18-remediation-evidence/visual-review.html) (42 full-suite + 75 capture paths) have linked originals and current candidates. Capture-contract success is not visual-baseline acceptance.

| Investigation | Evidence and conclusion |
|---|---|
| Original high-contrast Activities search corners | Original frozen build: 32 shots across 8 contexts for the two original states. The prior 12-pixel variant did not recur exactly; a 5-pixel variant at the same upper rounded corners did, with max channel delta 2 and one recorded DOM/style variant. Four consecutive shots within a context were identical. [raster-summary.json](2026-10-18-remediation-evidence/raster-summary.json) |
| Original high-contrast-dark Events selector | The 6-pixel lower-corner variant reproduced on the original frozen build, max channel delta 2. Recorded DOM/styles/bounds/focus/font/media were stable. Later gutter-build samples were stable for this state; that does not erase the reproduced earlier difference. Same original evidence. |
| Gutter-build repeat experiment | 45 shots / 15 contexts on 5 states. Activities: 2 image variants / 1 recorded DOM variant. Invoice lines: 6 / 1, including within-context changes; charges: 2 / 1; tax totals: 2 / 1. Events: 1 / 1. [delivery-raster-summary.json](2026-10-18-remediation-evidence/delivery-raster-summary.json) |
| Additional final-build Mail/Notes experiment | 45 shots / 15 contexts on 5 states. Desktop Mail compose reproduced 2 image variants; dark/reduced Mail and both Notes states stayed stable in this bounded sample. Mail toggle transition telemetry changed before the first screenshot and was fast-forwarded by the unchanged `animations:disabled` option; measured DOM/style/geometry excluding telemetry had 1 variant. Every within-context set was pixel-identical, so those transitions do not establish a cause. [post-full-raster-summary.json](2026-10-18-remediation-evidence/post-full-raster-summary.json) |

**Exact underlying raster causes remain unresolved.** No product defect causing these corner changes was established. No CSS change was made to hide them, and they are not accepted as harmless. Their baselines stay protected. The user-requested margin changes move controls but do not resolve raster reproducibility. The 22 held capture paths are individually listed below.

| Protected capture path | Remaining risk |
|---|---|
| `tests/visual-coverage.spec.mjs-snapshots/desktop/invoice-charges.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/desktop/invoice-lines-start.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/desktop/mail-compose-draft.png` | Requested gutter alignment plus additional interbuild border-pixel difference |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-dark/invoice-charges.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-dark/invoice-lines-start.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-dark/mail-compose-draft.png` | Requested gutter alignment plus additional interbuild border-pixel difference |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/events-calendar-month.png` | Requested gutter alignment plus original unresolved corner repeat variation |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/invoice-charges.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/invoice-lines-start.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/invoice-tax-totals.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/notes-list-archived.png` | Requested gutter alignment plus additional interbuild border-pixel difference |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/activities-calendar-week.png` | Requested gutter alignment plus original unresolved corner repeat variation |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/invoice-charges.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/invoice-lines-start.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/invoice-tax-totals.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/notes-list-archived.png` | Requested gutter alignment plus additional interbuild border-pixel difference |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/invoice-charges.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/invoice-lines-start.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/mail-compose-draft.png` | Requested gutter alignment plus additional interbuild border-pixel difference |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-tax-totals.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-charges.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-lines-end.png` | Unresolved invoice border raster variation; prior protected review already flagged pixels |

### Requirement-to-evidence matrix

All **52 product requirements plus 6 architecture constraints** are accounted for below. “Passed” refers to the linked scoped checks/source review, not full prototype acceptance. Test counts and exact related failures are available per requirement in [requirement-matrix.json](2026-10-18-remediation-evidence/requirement-matrix.json). Static/unit evidence is the final 165-test log; browser evidence is the complete current suite. No exhaustive accessibility certification or every-route/device permutation claim is made.

| Requirement | Current status | Evidence / practical limit |
|---|---|---|
| SHL-01 | passed | `architecture.test`, `navigation.test`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| SHL-02 | passed | `routes.test`, `routing.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| SHL-03 | passed | `navigation-honesty.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| SHL-04 | passed within tested routes | `leave-guard.spec`, `invoice-journey.spec`, `customer-journey.spec`. Guard coverage is established by explicit route cases in linked tests; no claim of exhaustive route permutation coverage. |
| SHL-05 | passed | `navigation-honesty.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| SHL-06 | passed | `lifecycle.spec`, `visual-qa-batch2.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| SHL-07 | passed | `navigation-honesty.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| INV-01 | passed | `invoice-selection.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| INV-02 | passed | `invoice-journey.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| INV-03 | passed | `invoice-journey.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| INV-04 | passed | `invoice-journey.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| INV-05 | passed | `invoice-journey.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| INV-06 | passed | `invoice-selection.spec`, `invoice-journey.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| INV-07 | passed | `invoice-selection.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| INV-08 | passed | `invoice-selection.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| INV-09 | passed | `invoice-selection.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| INV-10 | passed | `invoice-geography.spec`, `components.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| INV-11 | passed | `invoice-journey.spec`, `invoice-selection.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| INV-12 | deferred | Preservation / source and document review. VQA-07 / D-06; no formatting policy or calculation introduced. |
| CUS-01 | passed | `customer-journey.spec`, `lifecycle.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| CUS-02 | passed | `customer-journey.spec`, `lifecycle.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| CUS-03 | passed | `customer-journey.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| CUS-04 | passed | `demo-data.test`, `customer-journey.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| CUS-05 | passed within tested routes | `customer-journey.spec`, `leave-guard.spec`. Same bounded unsaved-work route coverage limitation as SHL-04. |
| GEO-01 | passed | `invoice-geography.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| GEO-02 | passed | `invoice-geography.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| GEO-03 | passed | `invoice-geography.spec`, `delivery-locale.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| COL-01 | passed functionally; visual acceptance pending | `collaboration.spec`, `help-screens-consistency.spec`, `messaging.spec`. Desktop collaboration behavior plus seven-project consistency tests; inherited project skips retained. Mail protected images remain open. |
| COL-02 | passed functionally; visual acceptance pending | `mail-draft-exit.spec`, `messaging.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| COL-03 | passed | `mail-draft-exit.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| COL-04 | passed | `visual-qa-batch1.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| COL-05 | passed | `visual-qa-batch2.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| ACC-01 | passed | `signin-gate.spec`, `signin-pages.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| ACC-02 | passed within retained scope | `profile-lifecycle.spec`. Seven existing Profile sections retained; P-02 does not authorize redesign/removal. |
| ACC-03 | passed within retained scope | `organization-center.spec`. Five visible Organization sections retained; existing hidden sections/role gating unchanged; P-03 not inferred approved. |
| ACC-04 | passed | `visual-qa-batch3.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| DAT-01 | passed | `demo-data.test`, `invoice-selection.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| DAT-02 | passed | `demo-data.test`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| DAT-03 | passed | `demo-data.test`, `delivery-locale.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| DAT-04 | passed | `demo-data.test`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| DAT-05 | passed | `demo-data.test`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| DAT-06 | limited | Preservation / source and document review. Accepted representative subtotal/tax/line amounts; no new financial model. |
| DAT-07 | limited | Preservation / source and document review. English fixture names/remarks permitted in Arabic; interface labels remain in scope. |
| UX-01 | passed structurally; visual acceptance pending | `page-gutters.spec`, `help-screens-consistency.spec`. Requested X alignment tested across 7 projects and 3 density/layout settings; protected images not updated. |
| UX-02 | passed functionally; visual acceptance pending | `page-gutters.spec`, `invoice-geography.spec`, `customer-journey.spec`, `collaboration.spec`. Accepted layout modes retained; screenshot approval remains separate. |
| UX-03 | passed within scoped geometry checks; visual acceptance pending | `page-gutters.spec`, `visual-qa-batch1.spec`, `visual-qa-batch2.spec`, `visual-qa-batch3.spec`. 390x844 mobile/RTL plus seven configured profiles; screenshots remain protected. |
| UX-04 | passed with deferred portion | `dialog-option-values.spec`, `language-switcher.spec`. Existing number/date/phone direction rules retained; VQA-07 remains deferred. |
| UX-05 | passed | `delivery-locale.spec`, `delivery-locale.test`, `i18n-coverage.test`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| UX-06 | passed within scoped checks | `a11y-ledger.spec`. Four ledger fixes checked; this is not a comprehensive WCAG certification. |
| UX-07 | passed | `a11y-ledger.spec`, `visual-qa-batch1.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| UX-08 | passed | `chart-parity.spec`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| UX-09 | acceptance pending | Preservation / source and document review. All 233 starting PNGs preserved in this mission; protected visual differences and repeat raster variants remain open. |
| ARC-01 | passed | `architecture.test`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| ARC-02 | passed | `tailwind.test`, `architecture.test`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| ARC-03 | passed | `tailwind.test`. Current scoped browser/unit checks; accepted representative-data limitations retained. |
| ARC-04 | passed | Preservation / source and document review. Single direct owner; no subagents or concurrent source mutations. |
| ARC-05 | passed | Preservation / source and document review. P-05 in-memory persistence only; P-04 retained separately pending; no storage/calculation/scope expansion. |
| ARC-06 | passed | Preservation / source and document review. Existing app-shell development stylesheet, week-start and hit-target notes inspected; already corrected before this mission. |

### Preservation audit

Initial external checkpoint: `/private/tmp/skey-remediation-20261018-fux37ka6/checkpoint.json`, 1,243 Git-listed tracked/untracked files, plus initial status, full unstaged patch and empty staged patch outside tracked repository files. HEAD and branch remain **`f29d61c7e15fd19b7603a25dd6c0995535122778` / `feat/prototype-quality-pass`**. The final [preservation audit](2026-10-18-remediation-evidence/preservation.json) verifies: no missing checkpoint files; no unexpected changed or added paths; all 486 frozen source/test/config inputs and all 1,156 build hashes unchanged; zero test PNG changes/additions/deletions; staged patch unchanged; historical acceptance prefix preserved byte-for-byte.

Initial/final Git status and every changed-file before/after SHA-256 are archived in [initial status](2026-10-18-remediation-evidence/status.txt), [final status](2026-10-18-remediation-evidence/status-final.txt) and the preservation JSON. Existing uncommitted work was retained. Changes are the nine app files, two existing test files, new gutter test, this appended delivery section and the new evidence directory. No commit, push, branch change, reset, stash, worktree removal or repository cleanup occurred. Protected runner/manifest, historical 76/73 evidence and older comparison reports retain their checkpoint hashes. The final SHA-256 manifest indexes raw reports, images, scripts and the updated acceptance record.

### Known limitations and decisions retained

- P-05 was explicitly approved by the user: invoice/customer/geography changes persist in memory across in-app navigation and reset on reload. No unresolved decision blocks CRUD. P-04 remains a separate pending proposal; existing payment-override behavior is retained. No approval is inferred from code, an AI proposal or this report.
- Invoice totals, line/payment details and other disclosed fields remain representative under A-13/DAT-06. Saved list/header/net values copy displayed values; no calculation, amount invention, backend or storage layer was introduced. Fixture business content remains fixture data; clock verification covers the declared DAT-02 invariants.
- VQA-07 financial-token formatting stays deferred. English fixture values/names/remarks remain permitted under DAT-07; interface labels use the locale facility. User language spot-check remains available.
- Existing project skips and D-04 stale baselines remain recorded. No new skip was added. Existing ARC-D1 compatibility-documentation debt is retained because its static gates pass; no unrelated style refactor was performed. Accessibility evidence covers the agreed ledger checks, not a comprehensive WCAG certification.
- ApexCharts retains deferred loading and integrity/crossorigin. Prototype report/export/related-document limitations and accepted role/screen scope remain unchanged.

### Explicit user decision required

**Approve replacement of only the four Mail PNG paths below with their linked, hashed current candidates?** Recommended for these four because the differences reflect the requested Mail alignment and approved canonical demo data. They are the union of newly failing comparisons against the corrected control and previous delivery. **No replacement has been performed.** This request grants no authority over any other path. Historical protected failures, other capture differences and the 22 raster-hold paths remain retained; approval of these four would not resolve the unknown raster causes or constitute full prototype acceptance.

| Exact path | Preserved original | Current candidate | SHA-256 evidence |
|---|---|---|---|
| `tests/messaging.spec.mjs-snapshots/desktop/email-reading.png` | [original PNG](2026-10-18-remediation-evidence/full-failures/desktop/messaging-email-reading-original.png) | [candidate PNG](2026-10-18-remediation-evidence/full-failures/desktop/messaging-email-reading-candidate.png) | `45eb1e17146c8b63fed24aae6fdc40c90657003107897d53c4bdda7fd0a699ad` → `d15faff49c73312e2da4d5f791b28386d768d8ce891aeac2e0e9a8451838d97a` |
| `tests/messaging.spec.mjs-snapshots/mobile-touch/email-reading.png` | [original PNG](2026-10-18-remediation-evidence/full-failures/mobile-touch/messaging-email-reading-original.png) | [candidate PNG](2026-10-18-remediation-evidence/full-failures/mobile-touch/messaging-email-reading-candidate.png) | `bfe66786a48b3f9374a73e54290343db51976132192b77bb66ecdbac4307df1f` → `df5ccafde180ad5b38e94659320221c7e899b45a22d4ea8a9fc1dcb4abbe53ea` |
| `tests/messaging.spec.mjs-snapshots/mobile-rtl/email-reading.png` | [original PNG](2026-10-18-remediation-evidence/full-failures/mobile-rtl/messaging-email-reading-original.png) | [candidate PNG](2026-10-18-remediation-evidence/full-failures/mobile-rtl/messaging-email-reading-candidate.png) | `542896e6f65092474c31220a4e55149f6f4e83a5fb98c431d318879a22a55859` → `8da6d85fd4f4b7caf6cfa2a22ae31162093cbe41699f495d09ab210ee10d765f` |
| `tests/parity.spec.mjs-snapshots/desktop/email.png` | [original PNG](2026-10-18-remediation-evidence/full-failures/desktop/parity-email-original.png) | [candidate PNG](2026-10-18-remediation-evidence/full-failures/desktop/parity-email-candidate.png) | `e6755f502451480409d6ac380c8afc90931868b90071d3a87ed8e525cc88cc83` → `ec8c1b5f6ccb2334253cf6a09f28f375cbf55da5e325005825d1e0d30d3f70d2` |

Desktop Mail reading specifically: original SHA-256 `45eb1e17146c8b63fed24aae6fdc40c90657003107897d53c4bdda7fd0a699ad`, candidate `d15faff49c73312e2da4d5f791b28386d768d8ce891aeac2e0e9a8451838d97a`. Its original pre-layout failure was 1,172 Playwright-reported pixels and matched the earlier reviewed candidate `8ce9d89c…`. The final requested geometry gives **33,987 Playwright-reported differing pixels** (126,755 exact decoded-RGB differences, a separate measurement). Unread/reader assertions pass before the screenshot. The final candidate reproduces byte-for-byte in the focused run. See [desktop-mail-review.json](2026-10-18-remediation-evidence/desktop-mail-review.json).

No CRUD, localization or unrelated fix was blocked waiting for this decision. No additional snapshot replacement, including previously proposed historical paths, is requested or authorized here. The gallery catalogs those differences for review while preserving their existing policy.

### Evidence index

| Artifact | Contents |
|---|---|
| [comparison.json](2026-10-18-remediation-evidence/comparison.json) | All 2,604 exact test/project identities; pass/fail/skip status; inherited/new/reopened/resolved/missing identities; every remaining failure |
| [final-functional-evidence.json](2026-10-18-remediation-evidence/final-functional-evidence.json) | 56 CRUD/header, 161 prior focused, 21 gutter, 7 Manage and 7 toolbar exact results |
| [raw/full-final.json.gz](2026-10-18-remediation-evidence/raw/full-final.json.gz), [commands/full-final.log](2026-10-18-remediation-evidence/commands/full-final.log) | Complete raw final report/command output; raw focused/partial/red reports also under `raw/` and `commands/` |
| [visual-review.html](2026-10-18-remediation-evidence/visual-review.html), [visual-review.json](2026-10-18-remediation-evidence/visual-review.json) | 117 path-specific original/candidate image pairs, full hashes and policy; four Mail decisions identified |
| [final-capture-classification.json](2026-10-18-remediation-evidence/final-capture-classification.json) | Every final capture comparison; original/current hashes, exact bounds and held states |
| [raw/verified-final-preflight.json.gz](2026-10-18-remediation-evidence/raw/verified-final-preflight.json.gz), [raw/verified-final-capture.json.gz](2026-10-18-remediation-evidence/raw/verified-final-capture.json.gz) | Unchanged original runner’s complete 128-state contract results |
| [raster-summary.json](2026-10-18-remediation-evidence/raster-summary.json), [delivery-raster-summary.json](2026-10-18-remediation-evidence/delivery-raster-summary.json), [post-full-raster-summary.json](2026-10-18-remediation-evidence/post-full-raster-summary.json) | Three bounded repeat experiments, raw diagnostic JSON under `raw/`, corresponding PNGs retained |
| [verified-final-build.json](2026-10-18-remediation-evidence/verified-final-build.json), [verified-final-inputs.json](2026-10-18-remediation-evidence/verified-final-inputs.json), [verified-final-server-bytes.json](2026-10-18-remediation-evidence/verified-final-server-bytes.json) | Full frozen inventory, relevant input hashes and exact served-byte evidence |
| [requirement-matrix.json](2026-10-18-remediation-evidence/requirement-matrix.json), [manage-label-audit.json](2026-10-18-remediation-evidence/manage-label-audit.json) | 58 requirement rows and eight scoped menu-context label audit |
| [preservation.json](2026-10-18-remediation-evidence/preservation.json), [mission-source.patch](2026-10-18-remediation-evidence/mission-source.patch), [sha256-manifest.json](2026-10-18-remediation-evidence/sha256-manifest.json) | Checkpoint/final preservation, focused source patch and complete evidence hash index |
| `initial-diagnosis/`, `full-failures/`, `verified-final-layout-review/`, `reproduction/` | Original mobile timeout traces, final failed-image/trace evidence, rendered layout review and diagnostic scripts |

The corrected control remains separately archived in `2026-10-18-regression-evidence/`. The original unit/focused/capture evidence and 89-path approval audit remain intact. All current conclusions above are bounded by the actual commands and artifacts; raster root causes and protected visual approvals remain open.


## Release follow-up — approved Mail snapshots and header spacing (2026-10-18)

The user approved the preceding four exact Mail candidate replacements and explicitly authorized moving the latest code to `main` and pushing. The subsequent instruction, “before push … mail content need to has space between content and the page header like other pages,” adds a Mail-only vertical-spacing fix. Historical sections above remain preserved byte-for-byte; their no-commit/no-push statements describe the earlier mission, before this new authorization.

Mail now follows Customers' actual header-to-content gap: default desktop 12 px, compact 6 px, comfortable 20 px, default mobile 8 px. Horizontal alignment and bottom margin are retained. `concepts/app/pages/email/templates.html` adds density-aware top margin; `tests/page-gutters.spec.mjs` compares the rendered gap with Customers across every configured browser profile and density/layout case. The previous zero-top-margin assertion is superseded by this explicit product request; horizontal assertions and zero-bottom-margin protection remain.

Current verification against a fresh frozen build on port 4277:

- `npm run build`: completed successfully. [Build identity](2026-10-18-mail-header-release-evidence/build-identity.json), [full inventory](2026-10-18-mail-header-release-evidence/build.json), [served-byte verification](2026-10-18-mail-header-release-evidence/served-bytes-correct-route.json). The generated Mail route HTML and stylesheet match the served bytes exactly.
- `PARITY_URL=http://127.0.0.1:4277 npx playwright test tests/page-gutters.spec.mjs --workers=2 --retries=0 --update-snapshots=none --reporter=line,json`: **21 passed**, three per each of the seven projects. [Raw report](2026-10-18-mail-header-release-evidence/gutters.json).
- Same configuration, `tests/messaging.spec.mjs --grep-invert 'reading a notification email'`: **26 passed, 2 existing skips**, no failures. [Raw report](2026-10-18-mail-header-release-evidence/mail-functional.json).
- `node --test --test-name-pattern='Task 7 final Tailwind budget' tests/tailwind.test.mjs`: **1 passed**. CSS is 278,940 bytes, below the unchanged 284,821-byte ceiling. [Log](2026-10-18-mail-header-release-evidence/css-budget.log). `node --check tests/page-gutters.spec.mjs` and application/test/script staged whitespace checks passed.
- Unchanged `scripts/visual-coverage.mjs`, run in an isolated harness with `--mode=preflight` and then `--mode=capture`, using `--evidence` and `--build-root` for the new frozen build: **128/128 preflight and 128/128 capture contracts passed**. [Preflight](2026-10-18-mail-header-release-evidence/preflight.json), [capture](2026-10-18-mail-header-release-evidence/capture.json). Captures are review artifacts only; no capture runner assertions or snapshot paths were changed.
- Focused visual comparisons: three `reading a notification email preserves unread state and appearance` cases (`desktop`, `mobile-touch`, `mobile-rtl`) and desktop `email: baseline appearance` still fail their strict screenshots because the newly requested top spacing differs from the earlier approved candidate images. Reading/unread assertions before the screenshot passed. These **four failures are disclosed**, not suppressed or reported as passing. [Reading report](2026-10-18-mail-header-release-evidence/mail-reading.json), [parity report](2026-10-18-mail-header-release-evidence/parity-mail.json), [side-by-side images and full hashes](2026-10-18-mail-header-release-evidence/mail-spacing-review.html).

The earlier full seven-project result remains **2,006 passed / 42 failed / 556 skipped** for its recorded pre-spacing build. It has not been rerun or relabeled following this narrow change. Earlier 165-unit and 56 CRUD/header results remain historical evidence; their application implementation inputs are unchanged except this Mail markup and generated CSS. Current affected layout, messaging, CSS and capture gates are recorded above. The exact 76-failure historical record and original 73-name measurement remain unchanged.

The approved four earlier Mail candidate files were copied exactly, with [before/after SHA-256 hashes](2026-10-18-mail-header-release-evidence/approved-mail-replacements.json). The new vertical-spacing candidates were **not** substituted. All other **229** existing test PNGs remain byte-for-byte unchanged against the release checkpoint. Existing earlier 89-path replacements remain part of the preceding delivery. [Preservation audit](2026-10-18-mail-header-release-evidence/precommit-preservation.json) records all 2,026 checkpointed files, the six authorized changed paths before this report, zero missing files, and ancestry evidence for a fast-forward to main. The three unrelated local `.shot*.mjs` scripts remain preserved and excluded from the commit. Existing source, tests, specifications, reports, raw logs and compressed evidence are included in the release. Raw logs otherwise globally ignored by Git are explicitly included so evidence links remain usable.

Repository-wide staged whitespace checking reports trailing whitespace in preserved historical documents and raw command logs (including failure output); these bytes were retained as evidence rather than rewritten. [Diagnostics](2026-10-18-mail-header-release-evidence/staged-whitespace.log). The scoped application/scripts/tests whitespace check passes.

**Status:** Mail spacing implementation and its affected verification are complete. Prototype acceptance remains pending: the four current vertical-spacing screenshot candidates require separate exact-path approval before any further replacement, and the earlier historical protected failures and unexplained repeat-capture raster observations remain unresolved. No new approval is inferred from the instruction to push. P-04 remains pending with existing behavior retained; P-05 is in-memory only and resets on reload, representative invoice values remain representative, and VQA-07 remains deferred. Release integration/push are authorized separately from prototype acceptance.
