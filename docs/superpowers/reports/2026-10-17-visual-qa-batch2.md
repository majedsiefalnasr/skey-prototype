# Visual QA remediation Batch 2

Implemented **VQA-04, VQA-08 and VQA-05 only**, in that order. Each finding received a focused regression and rendered inspection before proceeding. No snapshots were refreshed. VQA-06 and VQA-07 were not implemented; VQA-07 still requires a product decision. This report does not provide full-product visual consistency sign-off.

Final isolated browser result: **80 passed, zero failures, 193 intentional project-scope skips**, with two workers and zero retries. Unit tests: **143 passed, zero failures**. Build, JavaScript syntax checks and diff checks passed.

## Starting state and source identity

Read the full [audit](2026-10-16-visual-qa-audit.md) and [evidence JSON](2026-10-16-visual-qa-audit-evidence.json), inspected the current branch/worktrees/diff, and reviewed current calendar, prototype controls, styles and tests. The starting tree included completed Batch 1 and the demo-email hint. Those changes were preserved byte for byte. The historical frozen audit build was not used as the implementation baseline.

Branch remains `feat/prototype-quality-pass`, HEAD `f29d61c7e15fd19b7603a25dd6c0995535122778`. All changes remain **uncommitted**. Source identity includes the existing uncommitted Batch 1/hint changes:

- Whole tracked working-tree diff SHA-256: `c2f9acac4a8d60f9a192ea8c232bf8e5a6dfe4b6b68ca816fdff0515c3c1fc8a`.
- Final isolated build: `/private/tmp/skey-remediation-batch2/candidate-final`, **287 files**.
- Build inventory SHA-256: `01d489b316897db7b6d69bd0fcf920c2786c832244d7e077fdfd841a54945aec`, calculated over sorted path/SHA-256 records encoded as compact JSON.
- [Batch 2 evidence](2026-10-17-visual-qa-batch2-evidence.json) records source hashes, complete build inventory, measurements, image/log hashes and preservation checks. The new regression file is hashed separately from the tracked diff.

Built the starting working tree into `/private/tmp/skey-remediation-batch2/before` and served it on 4196. Final validation used the isolated final build on 4197. Both task-owned servers were stopped afterward; the user's dev server was left alone. Evidence images are temporary files outside every snapshot namespace; links below require those temporary files to remain available. Their measurements and hashes are retained in the evidence JSON.

## VQA-04 — Mobile calendar context

**Confirmed cause:** the 840px calendar grid pans inside `.collab-calendar-scroll`; `[data-collab-body]` scrolls vertically; the week also has a nested `[data-timed]` vertical scroller. Original day headers and the time gutter move outside the visible segment. Adding sticky positioning to a grid descendant alone cannot cross these different scrolling ancestors. The Activities period toolbar was already sticky and needed to remain usable.

**Changes:** `concepts/app/components/collab/calendar.js` and `concepts/app/styles/tailwind/components.css` add a mobile context strip outside the horizontal grid. Activities places it inside the existing sticky toolbar; Events places it in the outer vertical scrollport. It displays the horizontally intersecting dates/weekdays and, for timed views, the actual visible time interval. Scroll events and ResizeObserver measurements update it. Re-rendering aborts the previous binding and disconnects its observer. Desktop hides the strip.

The native event scroll margin accounts for the toolbar/context height so centered events are exposed below it. No grid widths, dates, fixture records or capture setup steps changed. The Sunday-start week remains exactly **October 11–17, 2026**.

**Rendered evidence at 390 × 844:** before, neither panned calendar had persistent context. After the same approved native pans:

| Profile | Activities context | Events context |
| --- | --- | --- |
| mobile-touch | Visible 274 × 47 strip at x84/y576; Mon 12 Oct, Tue 13 Oct, Wed 14 Oct; `13:10–17:44` | Visible 274 × 27 strip at x84/y563; Mon, Tue, Wed |
| mobile-rtl | Visible 274 × 47 strip at x32/y519; Arabic dates for Oct 12–14; `12:35–18:21` | Visible 274 × 27 strip at x32/y492; Arabic Monday, Tuesday, Wednesday |

| Surface/profile | Before | Final |
| --- | --- | --- |
| Activities LTR | [Before](/private/tmp/skey-remediation-batch2/before-activities-ltr.png) | [Final](/private/tmp/skey-remediation-batch2/isolated-final-activities-ltr.png) |
| Activities RTL | [Before](/private/tmp/skey-remediation-batch2/before-activities-rtl.png) | [Final](/private/tmp/skey-remediation-batch2/isolated-final-activities-rtl.png) |
| Events LTR | [Before](/private/tmp/skey-remediation-batch2/before-events-ltr.png) | [Final](/private/tmp/skey-remediation-batch2/isolated-final-events-ltr.png) |
| Events RTL | [Before](/private/tmp/skey-remediation-batch2/before-events-rtl.png) | [Final](/private/tmp/skey-remediation-batch2/isolated-final-events-rtl.png) |

**Regression:** two tests per mobile profile verify the exact seven dates, real Arabic locale/direction, context clipping and center hit-testing, exposed period buttons and event start, native wheel scrolling changing the interval, horizontal panning updating dates/weekdays, October month identity, and the approved holiday/Supplier event exposure. Both tests fail against the starting build because context is missing.

**Limit:** the original wide grid and nested scrolling remain. The strip supplies visible-column and time-range context rather than a replacement agenda or a fully aligned frozen header/gutter. More densely populated and differently sized calendars need separate review.

## VQA-08 — Touch event geometry

**Confirmed cause:** the same button provided the painted event rectangle and the touch target. Its duration-based 22px half-hour height was overridden by the global coarse-pointer 44px minimum, while a one-hour event remained 46px. The resulting painted ratio was 44/46, visually misrepresenting duration.

**Change:** `concepts/app/components/collab/calendar.js` separates the duration-sized painted child from its transparent button. The existing event-position/height calculation and the global touch minimum remain intact. Normal flex alignment keeps paint at the event start; mobile text truncates within the paint while the full accessible name and detail-opening behavior remain. Desktop safe-center content alignment retains the previous label position. Month/all-day chips retain their existing rendering.

| Measurement, both mobile profiles | Before | After |
| --- | ---: | ---: |
| 30-minute painted height | 44px | 22px |
| One-hour painted height | 46px | 46px |
| Corresponding button heights | 44px / 46px | 44px / 46px |
| Paint offset from scheduled button top | 0px | 0px |
| Adjacent half-hour painted starts | Not part of the seeded pair | 24px apart, with a 2px visible gap |

The Activities images above provide the before/after seeded duration evidence. A test-only adjacent 15:30 event was created through the normal editor, leaving tracked fixtures unchanged. The success notification was dismissed through its own Dismiss button before testing event hit targets. Adjacent evidence is retained under the final test output and indexed in the evidence JSON.

**Regression:** two tests per mobile profile measure actual paint and button rectangles, exact 22/46 heights, minimum 44px touch dimensions, zero start offset and full time labels. They open event details with normal touch and Enter. The adjacent-event test checks both painted top/center/bottom hit ownership and normal taps on both paint and button centers; each opens the correct record. The seeded duration regression fails against the starting build (44px instead of 22px).

The representative 1440 × 900 desktop week is pixel-identical before/after: [before](/private/tmp/skey-remediation-batch2/desktop-before.png), [final](/private/tmp/skey-remediation-batch2/desktop-final.png). This comparison covers that rendered state, not every desktop calendar state.

**Limit:** expanded transparent 44px hit rectangles can overlap for events starting 24px apart. The tested adjacent painted areas remain separate and independently tappable, including their edges, and both button centers resolve correctly. This is not a general redesign of dense calendar hit allocation or a claim that all expanded target rectangles are disjoint. Long mobile event titles use ellipsis and retain their full accessible names/detail views.

## VQA-05 — Prototype launcher obstruction

**Confirmed cause:** the fixed 44px launcher occupied the same lower outer corner as the saved quick-reply action. At 390 × 844, its rectangle overlapped Reply by **13 × 32px** in both directions. Batch 1 defers an empty quick reply, but a restored reply draft correctly exposes this control and still needs protection.

**Change:** `concepts/app/prototype/controls.css` places the launcher at logical inline-start 4px within the 52px navigation rail while mobile Mail reading contains a quick-reply control. It remains visible, named and 44 × 44px, using its existing open/hide handlers. The rule follows actual reading state and direction; it is not screenshot-specific. Other pages retain the original launcher position.

| Profile | Reply rectangle after | Launcher x before → after | Overlap before → after |
| --- | --- | --- | --- |
| mobile-touch | x264.17/y774, 80.83 × 44 | 332 → 4 | 13 × 32 → zero area |
| mobile-rtl | x45/y774, 55.75 × 44 | 14 → 342 | 13 × 32 → zero area |

| Profile | Before, saved reply | Final, same saved reply |
| --- | --- | --- |
| LTR | [Before](/private/tmp/skey-remediation-batch2/before-mail-ltr.png) | [Final](/private/tmp/skey-remediation-batch2/isolated-final-mail-ltr.png) |
| RTL | [Before](/private/tmp/skey-remediation-batch2/before-mail-rtl.png) | [Final](/private/tmp/skey-remediation-batch2/isolated-final-mail-rtl.png) |

**Regression:** one test per mobile profile creates/saves/restores a reply draft through the normal UI, checks clipping, disjoint control rectangles, center and four edge-midpoint hit ownership, accessible launcher name and touch size. Normal taps reopen/hide the kit with correct focus, preserve the draft, and send Reply successfully. Navigation to Notes restores the ordinary launcher position. The starting build fails the disjoint-rectangle assertion in both directions.

**Limit:** this rule addresses mobile Mail reading specifically. It is not a launcher-layout redesign across other screens.

## Verification commands and results

```sh
npm run test:unit > /private/tmp/skey-remediation-batch2/unit-final-2.log 2>&1
npm run build > /private/tmp/skey-remediation-batch2/build-final.log 2>&1
cp -R dist /private/tmp/skey-remediation-batch2/candidate-final
node scripts/serve.mjs --root /private/tmp/skey-remediation-batch2/candidate-final --port 4197
PARITY_URL=http://127.0.0.1:4197 npx playwright test tests/visual-qa-batch1.spec.mjs tests/visual-qa-batch2.spec.mjs tests/help-screens-consistency.spec.mjs tests/collaboration.spec.mjs --grep 'VQA-|calendar supports keyboard|density changes card|overnight|events expose calendar|create timed and all-day|end before start|overlapping events|unscheduled activities|clearing the scheduled|activities expose Kanban|schedule a time|internal mail' --workers=2 --retries=0 --output=/private/tmp/skey-remediation-batch2/isolated-final > /private/tmp/skey-remediation-batch2/isolated-final.log 2>&1
node --check concepts/app/components/collab/calendar.js
node --check tests/visual-qa-batch2.spec.mjs
git -c core.fsmonitor=false diff --check
```

The final isolated run passed **10 new mobile checks, all 28 Batch 1 checks, 14 existing keyboard/density checks across seven profiles, nine existing desktop calendar flows and 19 existing desktop Mail flows** (80 total, zero failures). Non-mobile Batch 2 cases and non-desktop collaboration flows are intentionally skipped by their suites; skips do not count as passes.

| Profile | Passed | Failed | Intentional skips |
| --- | ---: | ---: | ---: |
| desktop | 34 | 0 | 5 |
| mobile-touch | 11 | 0 | 28 |
| desktop-dark | 6 | 0 | 33 |
| desktop-high-contrast-light | 6 | 0 | 33 |
| desktop-high-contrast-dark | 6 | 0 | 33 |
| mobile-rtl | 11 | 0 | 28 |
| desktop-reduced-motion | 6 | 0 | 33 |
| Total | **80** | **0** | **193** |

Before/after evidence used the real Arabic toggle, fixed October 13 clock, existing fixtures, approved native pans and normal UI interaction. No forced clicks, injected CSS, masking or arbitrary waits were used. Visual inspection used rendered full-size images, supplemented by geometry and hit testing.

**Failures retained:** baseline red tests exposed the reported missing context, 44px duration paint and launcher overlap. During development, assertions also caught context covering the period toolbar, native button-content centering shifting the paint, and a success notification obstructing adjacent-event checks; these were corrected within the relevant layout/setup. A final run against shared `dist` reported 60 passed/one failed: the trace records HTTP 404 for `/concepts/app/main.js`, with only skip-link/status DOM initialized. The concurrently running unit suite rebuilds/swaps `dist` (`tests/build.test.mjs`, `tests/architecture.test.mjs`). Final browser verification therefore uses a separately copied static root after unit completion; no product/assertion change was made for that serving race. Its failure log/trace are retained. The earlier complete 61-check run and separate 19-check Mail run passed, but are not substituted for the final isolated run.

## Preservation, remaining scope and snapshot recommendation

SHA-256 comparison against the starting inventory confirms **564 of 567 starting files unchanged**; only the three authorized application files above changed. The new regression is `tests/visual-qa-batch2.spec.mjs`; this report and its companion JSON are new. In particular:

- All **124 historical PNGs plus 128 approved coverage PNGs = 252** retain their original hashes.
- Batch 1 source, regression, report and evidence, and both demo-email hint files retain their starting hashes.
- Approved manifest, capture runner, audit report/evidence, known-failure ledger/baseline and all three `.shot*.mjs` files remain unchanged.
- Branch refs and worktree records match their starting inventories. No commit, push, branch/worktree deletion or unrelated cleanup was performed.
- Authentication, invoice arithmetic/fixtures and accepted fixed subtotal 200, zero tax and zero line-money outputs were not changed. No claim is made that the historical 76 failures are resolved; the full historical suite was not rerun.

No capture runner, 128-entry preflight, snapshot-update flag or baseline replacement was invoked. After review of these rendered changes, recommend a **separate** targeted baseline update for the two mobile profiles' Activities week, Events month and Mail reading surfaces (six coverage images). Review any other snapshots that actually include these changed states rather than updating them in bulk. The representative desktop week did not change pixels. Existing Batch 1 baseline decisions remain separate. This batch itself updates **zero snapshots**.
