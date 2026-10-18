# Bounded investigation of eleven visual differences — 2026-10-17

All **11 pairs** were investigated against a freshly built, frozen current source: **33/33 original capture contracts passed**, followed by **11/11 DOM-only localization probes**. Results: **7 variable pairs, 3 reproducible mismatches, 1 no longer reproducible, 0 inconclusive**. Every specific rendering cause remains **unexplained**. The investigation localizes the differences to control/container edge regions without treating small counts as harmless or approving replacements. **Zero protected files changed.**

## Results

Paths are relative to `tests/visual-coverage.spec.mjs-snapshots/`. All comparisons count exact RGB pixel inequality with zero tolerance, masks or exclusions. Columns show baseline differences for repetitions 1/2/3 and all within-build pairs (1–2 / 1–3 / 2–3). The previous counts come from Batch 3’s earlier frozen starting-build investigation, not its original pre-remediation single captures. A stable three-capture sample is not proof of long-term determinism.

| Profile / state | Earlier baseline counts | Current baseline counts, repeats 1/2/3 | Pairwise variation 1–2 / 1–3 / 2–3 | Classification | Supported localization; cause | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| `desktop-high-contrast-dark/invoice-lines-start.png` | 309 / 373 / 334 | 122 / 77 / 87 | 157 / 125 / 32 | variable across identical-build captures | Input edge pixels and rounded table-container boundary; 166/178 union pixels hit inputs, all within 1.922px of an edge. Cause: **unexplained**. | Prioritize a separately bounded Chromium paint/compositor trace of rounded input/table edges; retain baseline. |
| `desktop-high-contrast-light/invoice-lines-start.png` | 372 / 282 / 339 | 347 / 70 / 59 | 321 / 318 / 41 | variable across identical-build captures | Input edge pixels and rounded table-container boundary; 353/384 union pixels hit inputs, all within 1.969px of an edge. Cause: **unexplained**. | Prioritize a separately bounded Chromium paint/compositor trace of rounded input/table edges; retain baseline. |
| `desktop-dark/invoice-lines-start.png` | 13 / 17 / 13 | 12 / 1 / 12 | 13 / 8 / 13 | variable across identical-build captures | Rounded input/table boundary pixels; 14/17 union pixels hit inputs, all within 1.922px of an edge. Cause: **unexplained**. | Prioritize a separately bounded Chromium paint/compositor trace of rounded input/table edges; retain baseline. |
| `desktop-dark/invoice-charges.png` | 2 / 2 / 0 | 2 / 0 / 0 | 2 / 2 / 0 | variable across identical-build captures | Two pixels at the rounded upper-left edge of the existing charge-row background. Cause: **unexplained**. | Retain baseline; include this edge region in a bounded paint/compositor trace; do not add tolerance. |
| `desktop-high-contrast-light/invoice-tax-totals.png` | 6 / 6 / 6 | 3 / 0 / 3 | 3 / 0 / 3 | variable across identical-build captures | Three pixels at the summary panel’s lower-left rounded corner. Cause: **unexplained**. | Retain baseline; include this edge region in a bounded paint/compositor trace; do not add tolerance. |
| `desktop-high-contrast-dark/activities-calendar-week.png` | 12 / 6 / 12 | 12 / 12 / 6 | 0 / 6 / 6 | variable across identical-build captures | Twelve pixels around the rounded upper corners of the Activities search input; within 2.063px of its edges. Cause: **unexplained**. | Retain baseline; include this edge region in a bounded paint/compositor trace; do not add tolerance. |
| `desktop-high-contrast-dark/invoice-charges.png` | 2 / 0 / 2 | 0 / 0 / 0 | 0 / 0 / 0 | no longer reproducible | All three current captures equal the baseline; earlier two-pixel variation is absent in this sample. Cause: **unexplained**. | Retain baseline; reopen only on a new reproducible observation. |
| `desktop-high-contrast-dark/invoice-tax-totals.png` | 0 / 14 / 14 | 14 / 14 / 14 | 0 / 0 / 0 | reproducible mismatch | Fourteen pixels at the summary panel’s lower rounded corners. Current images equal earlier repetitions 2/3 exactly. Cause: **unexplained**. | Retain baseline; trace the exact listed corner pixels and compare fresh browser-process sessions before any replacement decision. |
| `desktop/invoice-lines-start.png` | 8 / 8 / 8 | 3 / 1 / 3 | 4 / 0 / 4 | variable across identical-build captures | Four union pixels at the rounded table/header boundary and an input edge. Cause: **unexplained**. | Retain baseline; include this edge region in a bounded paint/compositor trace; do not add tolerance. |
| `mobile-touch/invoice-lines-end.png` | 4 / 4 / 4 | 4 / 4 / 4 | 0 / 0 / 0 | reproducible mismatch | Four input-border pixels; within 1.063px of an edge. All current images equal all three earlier images. Cause: **unexplained**. | Retain baseline; trace the exact listed corner pixels and compare fresh browser-process sessions before any replacement decision. |
| `desktop-reduced-motion/invoice-lines-start.png` | 6 / 6 / 7 | 2 / 2 / 2 | 0 / 0 / 0 | reproducible mismatch | Two pixels at second-row Tax/Tax Amt input edges; within 1.360px of an edge. Cause: **unexplained**. | Retain baseline; trace the exact listed corner pixels and compare fresh browser-process sessions before any replacement decision. |

## Strongest evidence and uncertainty

The three largest previously observed variable baseline mismatches were prioritized first: HC dark invoice leading (previous maximum 373 pixels), HC light invoice leading (372), and dark invoice leading (17). Their current baseline counts are 122/77/87, 347/70/59 and 12/1/12. Within-build variation reaches 157, 321 and 13 pixels respectively. This directly demonstrates variation on identical hashed application bytes and the same recorded state; a static source change alone cannot explain the differences between these repetitions. It does not identify the browser/rendering mechanism or rule out all unrecorded state.

All eleven groups have identical recorded target/crop geometry, nonzero scroll positions and environment metadata across their three repetitions. Computed fonts, line metrics, values, colors, borders, transforms and selected DOM geometry are also equal. Actual platform font samples identify `.SF NS` Regular/Bold and a variable system-font instance for the net amount; no font substitution was observed in those samples. This does not prove every unrecorded font/raster property is equal.

Read-only localization probes use the union of every changed pixel per entry, including baseline and inter-repeat differences. They reproduce the entry setup and verify matching target/crop/scroll geometry before interpreting element hits. Image coordinates are converted using document crop origin + pixel-center offset − window scroll; the evidence records layout/visual viewport offsets and the resulting hit stack. Desktop document scrolling is accounted for (for example, a 20px window offset in the invoice probes); screenshot coordinates are not treated as raw viewport coordinates. Fractional edge pixels can hit a child under a rounded ancestor clip, so the recorded hit stack and bounding boxes are retained rather than identifying the painted source solely from `elementFromPoint()`.

For the two high-contrast leading captures, 166 of 178 and 353 of 384 changed union pixels respectively hit native inputs within about 1.97 CSS pixels of their border boxes. Other locations correspond to rounded table clipping/borders, the calendar search input corners, charge-row background corners and summary-panel corners. Original-resolution representative captures were visually inspected for all eleven states. The evidence supports **edge-region paint differences**, not a claim that text content, financial values or layout moved. The particular rasterization/compositing/rounding mechanism remains **unexplained**: no renderer trace or causal intervention established it, and no harmless-antialiasing attribution is made.

Classification changed in this new sample: HC-light summary and ordinary-desktop invoice leading were formerly stable but now vary; HC-dark summary and reduced-motion invoice leading were formerly variable but are now stable; HC-dark charges now matches its baseline in all repetitions. The current HC-dark summary images exactly reproduce earlier repetitions 2 and 3, while mobile trailing images are byte/pixel-identical to the earlier renderings. The apparent stability of three repetitions therefore must not be generalized.

All exact baseline/inter-repeat changed-pixel bounds, maximum channel deltas, image hashes and nine current-versus-earlier image comparisons per entry are in the companion evidence. Examples of stable-current bounds: HC-dark summary [5,275,420,283), mobile trailing [36,139,163,201), reduced-motion leading [827,166,893,167). Maximum per-channel differences against the baseline range from 0 to 14 on a 0–255 scale; this measures magnitude and does not justify dismissing or tolerating the mismatch.

## Source, build and environment

Branch `feat/prototype-quality-pass`; HEAD `f29d61c7e15fd19b7603a25dd6c0995535122778`. Existing work remains uncommitted. A source copy of all 665 existing repository files, including dirty/untracked work and protected image hashes, was made under `/private/tmp/skey-visual-differences/source`. Only its `node_modules` dependency link points back to the installed workspace dependencies. The build ran in this source copy; workspace `dist` was not rebuilt or served.

| Identity | SHA-256 |
| --- | --- |
| Sorted compact JSON source path/hash inventory, 665 files | `5b21881b78bd10e161923ee24889a1888b128254cf21f78a67fbe58e6585c111` |
| Starting tracked binary diff | `ef06d82d11ff3f00f9f3a4d38b1f0a45708ba6ac8d0cddd5154df14a46eaa168` |
| Frozen build sorted compact JSON path/hash records, 379 files | `3df02b9ff6f878932de7d11d201d5edd1ca540c10b3f9472e927c428f18edca8` |
| Unchanged manifest | `84a6ca14241b2b8246420c031918ed4d45eca3895da7cf00a227d7d65aed09c5` |
| Unchanged runner | `a5c7e29fb0b64004188e1398c9ead2f093790ad3f3a7f8e8efd5bd8a917e3114` |

The complete frozen inventory and copied source were reverified at completion. Compared with the prior final Batch 3 build, application/runtime assets and route/index documents are byte-identical; the total build inventory differs because later reports/evidence are included by the existing public-path build allowlist. This is a fresh current-source build, not reuse of the earlier starting build.

Browser: pinned Chromium 153.0.8010.12, manifest revision 1243, Playwright 1.63.0; Darwin 27.0.0 arm64. DPR 1, manifest Africa/Cairo timezone, fixed 2026-10-13T10:24:00Z browser time, original profile color scheme/reduced-motion and application controls. The eleven pairs cover six existing profiles and all use English/LTR; no Arabic pair belongs to this recorded set. Mobile invoice captures retain the 390 × 1200 override; desktop contexts remain 1440 × 900. Screenshot element crop dimensions, focus, pointer at (0,0), hover chain, fonts, layout/visual viewport and nonzero scroll positions are recorded individually. Every repetition uses a fresh browser context.

## Exact commands and assertion outcomes

```sh
# Copy and hash the current tracked/untracked source to the isolated source tree.
npm run build --prefix /private/tmp/skey-visual-differences/source > /private/tmp/skey-visual-differences/build.log 2>&1
# Copy isolated source/dist to frozen; record and verify its complete inventory.
node --check /private/tmp/skey-visual-differences/capture.mjs
node scripts/serve.mjs --root /private/tmp/skey-visual-differences/frozen --port 4206
PARITY_URL=http://127.0.0.1:4206 node /private/tmp/skey-visual-differences/capture.mjs > /private/tmp/skey-visual-differences/captures.log 2>&1
python3 /private/tmp/skey-visual-differences/analyze.py
PARITY_URL=http://127.0.0.1:4206 node /private/tmp/skey-visual-differences/probe.mjs > /private/tmp/skey-visual-differences/probes.log 2>&1
git -c core.fsmonitor=false diff --check
```

Build and syntax checks passed. The frozen fixture SHA-256, prototype date, entity IDs and link IDs also match the original manifest exactly. Capture adapter: two workers, zero retries, **33 passed / 0 failed**. Additional DOM-only probes: two workers, zero retries, **11 passed / 0 failed**, zero further screenshots. Original setup/assertions through target selection are byte-identical to the repository runner; target visibility/hit-testing and two-frame scroll stability are also retained verbatim. The exact seven-date October 11–17 equality, fixtures, invoice arithmetic limitations, locales, themes, hidden-kit and all applicable original gates remain unchanged. No sleeps, CSS overrides, forced interactions, masks or tolerances were added. Existing prototype-specific interactions inside the original setup remain unchanged.

The temporary adapters change only bounded entry/repetition selection, new exclusive diagnostic destinations and additive read-only metadata. They do not invoke or edit the repository snapshot runner’s new-namespace workflow against existing baselines. Evidence includes adapter/analysis source and hashes plus exact logs; captured PNG buffers were written exclusively with `wx`. No unit suite, full browser suite, 128-entry sweep or historical known-failure suite was run for this diagnostic task. Passing 44 scoped entry setups is not a claim that those wider suites pass.

## Evidence, preservation and next decisions

[Companion evidence](2026-10-17-visual-qa-visual-differences-investigation-evidence.json) contains the complete source/build inventories, all 33 capture records, 11 DOM probes, pixel comparisons/bounds, platform-font samples, environment/geometry/styles, diagnostic source, logs and preservation checks. [Capture assets](2026-10-17-visual-qa-visual-differences-investigation-assets/) preserve all 33 original PNG buffers byte-for-byte with verified SHA-256; these are new diagnostic assets, not snapshots or replacements.

All 665 pre-existing repository files remain byte-identical. All **252 previously protected PNGs**, including the seven newly approved sign-in baselines and earlier Batch 1/2/SR-01 replacements, retain their starting hashes. The 33 added diagnostic PNGs live only under the new report asset directory. Source/test/fixture/manifest/runner changes: **zero**. Snapshot/baseline/ledger changes: **zero**. Earlier reports/evidence, three `.shot*.mjs` scripts, branch refs and worktree registrations remain unchanged. The task-owned 4206 static server was stopped; other servers were left untouched. No commit, push, deletion or cleanup occurred.

**Confirmed application-defect finding: none established by this investigation.** This is not evidence that no defects exist. The seven varying pairs confirm capture/render variation; the three stable mismatches remain observations with unknown cause. Keep every baseline unchanged. The table supplies a next action for every pair: prioritize renderer-level evidence for the high-contrast and dark leading edges, then the stable corner mismatches; monitor the non-reproduced charges observation. Any future trace experiment or individual replacement decision should remain separately bounded rather than accepting unexplained diffs.

VQA-07 financial-token formatting remains deferred. Fixed subtotal 200, zero tax and zero line-money outputs remain accepted prototype limitations, not new findings. The 76-failure baseline is preserved and was not rerun. This investigation does not declare a green historical suite or full-product visual consistency.
