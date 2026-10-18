# SR-01 — Mobile invoice capture regression

**Resolved.** Both unchanged original mobile leading capture contracts pass on the final isolated build. The strengthened invoice regression and relevant existing tests pass across all seven profiles: **35 browser checks, zero failures**, two workers, zero retries. **143 unit tests**, build, syntax and diff checks pass. After individual visual review, only the two authorized mobile leading snapshots were replaced.

## Starting state and confirmed root cause

Read the [snapshot review](2026-10-17-visual-qa-snapshot-review.md), inspected the current worktree, invoice markup, generated rows, input minima, padding, responsive/coarse-pointer rules and original capture assertions. Preserved Batch 1/2, email hints, all earlier evidence and the 27 approved snapshot replacements. The baseline for this fix was the current uncommitted source, not the older audit build.

Before editing application code, built that source into `/private/tmp/skey-sr01/before` and reproduced both original failures on port4199. A temporary adapter reuses the repository runner's entry setup/assertions, with result measurements and diagnostic images added; the runner itself remains unchanged. Both fail at `visibleInCrop(grid.locator('thead th').nth(2))`: `hit=true`, `fits=false`. The new regression also failed in both mobile profiles at **390 × 844**, before the CSS change.

The value-sized input minima were not the defect. The first three cells each had 8px inline padding. Their header widths sum to **280.3125px**; with the table's 1px border inset, the complete leading extent is **281.3125px** inside a **274px** scrollport. Thus the Expiry header extends **7.3125px** past the clipping edge. The earlier input-only assertions missed the extra cell space. Settled inputs themselves retained readable values.

## Minimal change and regression

Application change: **five added lines** in `concepts/app/styles/tailwind/invoices.css`:

```css
@media (max-width: 720px) {
  .rec-items .inv-grid :is(th, td):nth-child(-n+3) { padding-inline: 6px; }
}
```

This recovers 12px from padding across those three columns. It leaves their inputs, later columns, desktop padding, coarse-pointer size protections, table scroller, fixtures, arithmetic and capture setup intact. No width was taken from quantity, batch or price fields. No crop was broadened; no overflow was hidden; no fixture text was shortened.

Test change: **14 added lines** in `tests/visual-qa-batch1.spec.mjs`, extending the existing VQA-03 seven-profile readability test. The original test content is preserved; removing the additions reproduces its starting SHA-256. After checking every seeded input's resting text budget, focus, internal scrolling, clipping and hit target, the regression restores the approved native section alignment and checks:

- Complete leading Item/UoM/Expiry header boxes and both rows in mobile profiles.
- Complete trailing Tax Amt/Total header boxes and both rows.
- All twelve data-column headers and both rows on desktop profiles.
- Logical leading/trailing endpoints, using the original capture contract's existing one-pixel browser rounding tolerance.
- Both **390 × 844** and **390 × 1200** in the mobile profiles, plus all five desktop variants.

An intermediate run reported **34 passed / 1 failed** because the newly added endpoint check initially required exact integer equality. RTL returned −785 for a computed −786 maximum at 844px. The original runner already permits a one-pixel endpoint difference; the new test now matches that established contract. **No original assertion or header-containment gate was changed.** The definitive run passes all 35 checks.

## Before/after measurements and rendered review

Measurements below apply in both mobile profiles and at both requested heights. Header positions are the approved 1200px capture state.

| Measurement | Before | After |
| --- | ---: | ---: |
| Scrollport width | 274px | 274px |
| Sum of three header widths | 280.3125px | 268.3125px |
| Leading extent including border inset | 281.3125px | 269.3125px |
| Overhang / remaining room at clipping edge | 7.3125px overhang | 4.6875px remaining |
| First three cells' inline padding | 8px | 6px |
| Item input width | 81.875px | 81.875px |
| UoM input width | 44px | 44px |
| Expiry input width | 106.4375px | 106.4375px |
| Batch input width | 73.6875px | 73.6875px |

LTR Expiry right edge moves from **365.3125 to 353.3125** against scrollport right358. RTL Expiry left edge moves from **24.6875 to 36.6875** against scrollport left32. Every input on both rows retains its previous width, available text budget and value, including quantity, batch, price and zero outputs. Item/date text budgets remain66/90px against glyph widths48.53/70.84px. Price `100` retains its complete resting text budget, including the existing conservative numeric-stepper allowance.

The table's maximum scroll distance decreases by12px: **754→742 LTR**, **798→786 RTL** in the pinned capture state. This is the expected consequence of removing padding; the logical endpoints and the required trailing controls remain correct. Endpoint and hit/clipping checks pass.

Durable lossless rendered evidence:

- [LTR leading comparison](2026-10-17-visual-qa-sr01-assets/mobile-touch-leading-review.webp) and [Arabic RTL comparison](2026-10-17-visual-qa-sr01-assets/mobile-rtl-leading-review.webp): each shows the old stored baseline, current pre-fix rendering, and reviewed final capture. The new baselines incorporate the earlier readable-input remediation as well as the SR-01 containment fix.
- [LTR 390 × 844 before/after](2026-10-17-visual-qa-sr01-assets/mobile-touch-844-review.webp) and [Arabic RTL before/after](2026-10-17-visual-qa-sr01-assets/mobile-rtl-844-review.webp): all three complete headers and both rows are exposed at the logical leading edge.
- [Mobile prices at rest](2026-10-17-visual-qa-sr01-assets/mobile-prices-at-rest.webp): normal panning exposes unfocused `100` in both directions and both heights.
- [Seven-profile control rendering](2026-10-17-visual-qa-sr01-assets/controls.webp): five desktop leading states retain complete values; both mobile trailing states expose the required Tax Amt/Total controls. Their seven original entry contracts pass. These control snapshots were not replaced.

All seven fresh controls pass their state/visibility/fixture assertions. Against the stored control baselines, RTL trailing is pixel-identical; the other six have small unexplained differences of **3, 4, 12, 66, 136 and 3 pixels**. Those differences were not accepted as baseline updates or used as a reason for unrelated fixes. Their counts/bounds are recorded in the evidence JSON; this report does not claim universal pixel parity.

## Source and frozen-build identity

Branch remains `feat/prototype-quality-pass`, HEAD `f29d61c7e15fd19b7603a25dd6c0995535122778`; all work is uncommitted. The final application source includes the existing Batch 1/2/hint changes plus this CSS addition.

- Pre-replacement tracked-diff SHA-256: `8e3e5564cfe85b9f3e4d52e1eae8db7e953f1eec57af8997cd7c8bac16dbbf06`.
- CSS SHA-256: `7ac8a19a6761c6a6e4098d81aa3707e9eb71fedd87d9a66230701b8eb1c4d6fd`.
- Focused test SHA-256: `89654035e8cc55d793417b3937c06422e9981b45d5a5e2d722740904e1e16429` (hashed separately because the pre-existing test is untracked).
- Final static root: `/private/tmp/skey-sr01/final`, **313 files**, inventory SHA-256 `a5aa5a861083bb684fdf5f1ba11c4b23eedf3f0d831ff5d7348c6e74880ae4ee` over sorted compact JSON path/hash records.
- Manifest SHA-256 remains `84a6ca14241b2b8246420c031918ed4d45eca3895da7cf00a227d7d65aed09c5`; runner remains `a5c7e29fb0b64004188e1398c9ead2f093790ad3f3a7f8e8efd5bd8a917e3114`.

The entire frozen inventory and fixture hash were verified before capture. The earlier candidate used for supplemental UI inspection is file-for-file identical to this final root. Unit/build work finished before browser checks; no browser check used mutable `dist`. [Fix evidence JSON](2026-10-17-visual-qa-sr01-evidence.json) retains inventories, source hashes, measurements, contracts, control differences, log hashes and preservation results.

## Exact verification commands and results

```sh
npm run build > /private/tmp/skey-sr01/build-before.log 2>&1
cp -R dist /private/tmp/skey-sr01/before
node scripts/serve.mjs --root /private/tmp/skey-sr01/before --port 4199
PARITY_URL=http://127.0.0.1:4199 node /private/tmp/skey-sr01/contract.mjs before > /private/tmp/skey-sr01/before-contract.log 2>&1
PARITY_URL=http://127.0.0.1:4199 npx playwright test tests/visual-qa-batch1.spec.mjs --grep 'VQA-03' --project=mobile-touch --project=mobile-rtl --workers=2 --retries=0 --output=/private/tmp/skey-sr01/regression-red > /private/tmp/skey-sr01/regression-red.log 2>&1
npm run test:unit > /private/tmp/skey-sr01/unit-final.log 2>&1
npm run build > /private/tmp/skey-sr01/build-final.log 2>&1
cp -R dist /private/tmp/skey-sr01/final
node scripts/serve.mjs --root /private/tmp/skey-sr01/final --port 4201
PARITY_URL=http://127.0.0.1:4201 npx playwright test tests/visual-qa-batch1.spec.mjs tests/invoice-geography.spec.mjs --grep 'VQA-03|invoice line entry|invoice create footer|invoice charges and discounts|invoice keyboard line entry' --workers=2 --retries=0 --output=/private/tmp/skey-sr01/focused-final > /private/tmp/skey-sr01/focused-final.log 2>&1
PARITY_URL=http://127.0.0.1:4201 node /private/tmp/skey-sr01/contract.mjs final > /private/tmp/skey-sr01/final-contract.log 2>&1
# Only after BOTH preceding original contracts passed:
PARITY_URL=http://127.0.0.1:4201 node /private/tmp/skey-sr01/contract.mjs final --capture > /private/tmp/skey-sr01/final-capture.log 2>&1
PARITY_URL=http://127.0.0.1:4201 node /private/tmp/skey-sr01/controls.mjs final --capture > /private/tmp/skey-sr01/controls.log 2>&1
# Supplemental live inspection used the earlier, file-identical candidate:
node scripts/serve.mjs --root /private/tmp/skey-sr01/after --port 4200
PARITY_URL=http://127.0.0.1:4199 node /private/tmp/skey-sr01/ui.mjs before > /private/tmp/skey-sr01/before-ui.log 2>&1
PARITY_URL=http://127.0.0.1:4200 node /private/tmp/skey-sr01/ui.mjs after > /private/tmp/skey-sr01/after-ui.log 2>&1
node --check tests/visual-qa-batch1.spec.mjs
git -c core.fsmonitor=false diff --check
```

| Check | Result |
| --- | --- |
| Before: original mobile leading entry assertions | 2 expected failures, same Expiry header overhang |
| Before: strengthened mobile regression | 2 expected failures at the new complete-header step |
| Final: value/header regression, all seven profiles | 7 passed; mobile checks both heights |
| Final: existing invoice footer, row/quantity, adjustments and keyboard flows | 28 passed, seven profiles |
| Final: combined browser selection | **35 passed, 0 failed, 0 skipped**, two workers, zero retries |
| Final: original mobile leading entry contracts | **2/2 passed before capture**, then **2/2 passed during capture** |
| Desktop-leading/mobile-trailing original control contracts | 7/7 passed |
| Live mobile leading checks | 4/4 passed: two profiles × two heights; resting prices also checked |
| Unit suite | **143 passed, 0 failed** |
| Build, syntax, diff checks | Passed |

The temporary adapters preserve the runner's original `visibleInCrop()` helper and complete per-entry assertion flow; measurement additions affect only evidence/results. Original clipping-ancestor, visual viewport, hit-test, labels, fixture/output, locale/RTL, static-header adjacency, viewport, scroll-stability and crop checks remain in force. The adapter scopes execution to the requested entries and creates temporary image destinations exclusively. It does not alter the approved manifest or repository runner, and is not a complete 128-entry preflight. The reused fixture setup retains the original prototype mode-control mechanics; no new forced clicks, CSS injection, masks or arbitrary sleeps were introduced.

## Individual snapshot decisions and hashes

Both captures were reviewed at original size after their original contracts passed. The complete identifiers/date and header borders are visible; capture crop, **274 × 242** image dimensions, 390 × 1200 viewport, leading `scrollLeft=0` and fixture values are unchanged. Candidate hashes were verified before replacing the exact authorized paths. No snapshot-update command or other destination was used.

| Exact path | Before SHA-256 | Approved/final SHA-256 |
| --- | --- | --- |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-lines-start.png` | `71d512bb5b047a9ea3b3c0c1a0cc2766fcfd2473262cada8e7365a5b45f82ef1` | `5acb5a143b9859695128ed63e8ccf2b9e251d4fc0964207d1eff7814d8818703` |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-lines-start.png` | `c953eedb7d2b732e06e411239b936f7d8fe8759e32c1063ae13b8832052d36ce` | `944355f167335aabc4ce2640fc0def3a3e890b10cc58cebb723da6391772e0a7` |

## Preservation and remaining limits

Final SHA-256 verification confirms **594 of 598 starting files unchanged**. The four changed starting files are exactly the invoice CSS, extended focused test and two authorized PNGs. All **250 other protected PNGs** retain their starting hashes, including **all 27 prior approved replacements**. Of the previously retained 225 images, only the two now-authorized leading states changed; the other 223 remain unchanged. All 124 historical PNGs remain unchanged. No PNG was added or removed. The new report artifacts are this report, its companion JSON and six lossless WebP evidence sheets.

Batch 1/2 and email-hint edits remain intact apart from the explicitly scoped CSS/test additions; the original Batch 1 test content is fully preserved. The manifest, runner, historical capture inventory, fixture sources, 76-failure ledger/baseline, three `.shot*.mjs` scripts, all prior reports/assets, branch refs and worktree registrations retain their starting hashes/records. All prior report/evidence assets remain historical records; their earlier unresolved decision is not rewritten by this fix. Task-owned servers were stopped after verification; existing user servers were left alone.

The invoice remains horizontally scrollable, and at 844px height the entire record section/chrome need not fit at once; normal scrolling exposes the required fields. Fixed subtotal 200, zero tax and zero line-money outputs remain unchanged. Future arbitrary longer values are outside the seeded-value guarantee. Small unaccepted control raster differences remain noted above. The full historical suite and full 128-entry preflight were not run; the 76-failure baseline is not claimed green.

No Batch 3 work, VQA-06 or VQA-07 implementation, authentication change, commit, push, branch/worktree deletion or cleanup was performed. VQA-07 still needs a product decision. This is not a full-product visual consistency sign-off.

**Decision: SR-01 resolved; Batch 3 eligible for consideration.**
