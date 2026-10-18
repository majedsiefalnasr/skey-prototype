# Individual sign-in snapshot review — 2026-10-17

**Seven independently approved replacements; zero retained candidates; zero candidates requiring further investigation.** Only the seven password-identity PNGs below were replaced. Every stored baseline was pixel-identical to its fresh frozen starting-build capture. All seven final renderings were inspected at original resolution alongside both earlier versions before replacement.

## Individual decisions

Paths in the table are relative to `tests/visual-coverage.spec.mjs-snapshots/`. Each row names one file, not a project-wide approval. Hash cells contain full before → after SHA-256 values.

| Profile / exact file | Observed difference and rationale | Original contract / dimensions | Decision | Before → after SHA-256 |
| --- | --- | --- | --- | --- |
| `desktop/signin-password-identity.png` | Hostname previously ended its first line with `.co` and stranded `m` on line two. Final email occupies line one; intact hostname and Cairo HQ share line two. Card, Change and password focus ring remain stationary. Correct wrapping of unchanged identity text; no unexplained difference observed. | PASS before replacement and after replacement; 1440 × 900 | `APPROVE_REPLACEMENT` | `61e6bce72d1e98072a5498e9950f6cf62ed29f1131b9fffd73f8f3e351fafa7e` → `06c4889fc1f897a4c83995e04cd6cfa610a55cd5322893b893709fff876765a5` |
| `mobile-touch/signin-password-identity.png` | Baseline splits hostname after `la` and Cairo HQ after `Cair`. Final has one intact email, hostname and branch per line. Three-line identity and card height remain unchanged; Change remains separate at the right. Correct wrapping of unchanged identity text; no unexplained difference observed. | PASS before replacement and after replacement; 390 × 844 | `APPROVE_REPLACEMENT` | `e8198701463d66430d27b114f8e8a839ec8220f9bc2fd698cc9fc2df3c5c88a5` → `f0c543050dfd1a998ae60d74690e3c5a7c1989f6652173a5a61161767a96906b` |
| `desktop-dark/signin-password-identity.png` | Same hostname split as desktop, corrected into intact units over two lines. Dark surfaces, text colors, Change position, card geometry and visible password focus ring remain unchanged. Correct wrapping of unchanged identity text; no unexplained difference observed. | PASS before replacement and after replacement; 1440 × 900 | `APPROVE_REPLACEMENT` | `0f43f7b16c7143cde478f430ecef5fee4b8b946f2b3cf4ca95a0b2c81570a5a1` → `c741dcfea83b6ef4a803505d3052da5cbed4d52c4f798273462f4aff515db31b` |
| `desktop-high-contrast-light/signin-password-identity.png` | Same split corrected over two lines. Existing strong card/identity borders, text and focused-input treatment remain intact; Change and surrounding layout remain stationary. Correct wrapping of unchanged identity text; no unexplained difference observed. | PASS before replacement and after replacement; 1440 × 900 | `APPROVE_REPLACEMENT` | `373b6a32ccb3407171a15552c41b52b53297e797bebee553cc48096d558c5c42` → `e9220385fae7b1c5663da927006f8d0a108590197060f414b2b5407848bac441` |
| `desktop-high-contrast-dark/signin-password-identity.png` | Same split corrected over two lines. Light borders and dark surfaces remain intact; readable identity and Change remain separated, with unchanged password focus treatment. Correct wrapping of unchanged identity text; no unexplained difference observed. | PASS before replacement and after replacement; 1440 × 900 | `APPROVE_REPLACEMENT` | `eb396d948c59fd4c7fac2620fcd978124c4d0b2a166ccc41c4e8aeb9bc2b7630` → `840c57e318cc1fe31950dd8c93ef608d7a6d816511872ed96a6f2f432e93db86` |
| `mobile-rtl/signin-password-identity.png` | Arabic UI remains RTL with the identity isolated LTR. Previously split hostname now fits intact between the email and Cairo HQ lines. Identity gains a line; card grows 16px and recenters upward 8px. Change stays at the left without overlap. Correct wrapping of unchanged identity text; no unexplained difference observed. | PASS before replacement and after replacement; 390 × 844 | `APPROVE_REPLACEMENT` | `756b08f068e4f31f984278fd6c92312d2276bc88efe8d96aab98369f2ea0fe6a` → `8e92f208a846890c89acfd75a0523e8cf5079098aa1d926fe56fc8fe22138477` |
| `desktop-reduced-motion/signin-password-identity.png` | Same desktop hostname split corrected into intact two-line units. Card, controls, password focus and background remain unchanged; reduced-motion profile is preserved. Correct wrapping of unchanged identity text; no unexplained difference observed. | PASS before replacement and after replacement; 1440 × 900 | `APPROVE_REPLACEMENT` | `61e6bce72d1e98072a5498e9950f6cf62ed29f1131b9fffd73f8f3e351fafa7e` → `06c4889fc1f897a4c83995e04cd6cfa610a55cd5322893b893709fff876765a5` |

## Rendered evidence and review findings

[Original-resolution baseline/final evidence](2026-10-17-visual-qa-signin-snapshot-review-assets/) preserves fourteen lossless WebP images, with decoded RGB equality checked against each reviewed PNG. Fresh starting captures were byte-identical to their corresponding baselines, so the baseline evidence also represents the starting build without duplicating those images. [Companion evidence](2026-10-17-visual-qa-signin-snapshot-review-evidence.json) records all three comparisons, original contract results, environment, component geometry, hashes and preservation inventory. No earlier report, evidence or asset was edited.

Desktop profiles remain 1440 × 900; both mobile profiles remain 390 × 844, all DPR 1. All seven full images were opened with original-resolution inspection; decisions were not inferred from counts. Email and hostname remain exact, Cairo HQ stays together, separators and LTR bidi isolation remain readable within the actual Arabic page, and no text clips or overlaps Change. The desktop layout has two identity lines, mobile has three. Password focus is visibly indicated in every profile; its geometry and treatment remain consistent with each existing theme. No new focus style is claimed.

For six profiles every changed pixel lies within the identity text region: desktop variants have bounds [526,357,839,391), and mobile LTR [66,308,250,361). Changed counts are respectively 3666 (desktop), 3419 (mobile LTR), 3663 (dark), 3666 (HC light), 3665 (HC dark), and 3666 (reduced motion). There are no unrelated changed pixels outside those regions. These exact comparisons supplement visual review rather than replacing it.

Arabic RTL has 42,821 changed pixels within [31,65,359,704), explained by the taller identity and centered card. Measured card changes from x=32, y=73.5, w=326, h=620 to x=32, y=65.5, w=326, h=636. Identity height changes 40→60px; its surrounding row changes 54→70px because the original touch-sized Change button already set a minimum. Password moves y=406.5→414.5. Change remains x=66, y=319.5, w=46.015625, h=44. Background, footer and launcher outside the card remain pixel-identical. Heading and upper content shift upward, lower form content downward, without clipping or overlap. This is a deliberate consequence of intact wrapping, not an unexplained theme/bidi difference.

Mobile LTR Change remains 66.3125 × 44px; RTL Change remains 46.015625 × 44px. Desktop Change is 66.3125 × 22px in the original fine-pointer profiles. The focused regression verifies mobile touch dimensions, per-character line-box containment, clipping ancestors, center hit ownership, disjoint identity/control bounds, accessible localized Change text, Tab/Shift+Tab, Change interaction, password clearing and state restoration. It also tests exceptional long tokens and word-boundary branch wrapping through the actual renderer.

## Source identity and original contracts

Branch `feat/prototype-quality-pass`, HEAD `f29d61c7e15fd19b7603a25dd6c0995535122778`; existing uncommitted Batch 1/2/3 and email-hint edits were preserved. Application/test bytes match the recorded final Batch 3 hashes. No build or application modification was necessary for this review: both complete frozen inventories were verified before use and after verification.

- Starting frozen build: 321 files, inventory SHA-256 `7922e0965b7f247f779e8ddee2ac8dd603e9529c0baaa2fd3626c4e0b2bff100`.
- Final frozen build: 321 files, inventory SHA-256 `31ef61c66dfad8a8653cddadf8220b36d9c44309f3e95af9aff0577256981ae3`.
- Manifest unchanged: `84a6ca14241b2b8246420c031918ed4d45eca3895da7cf00a227d7d65aed09c5`.
- Runner unchanged: `a5c7e29fb0b64004188e1398c9ead2f093790ad3f3a7f8e8efd5bd8a917e3114`.

The isolated starting/final static servers used ports 4204/4205 and immutable `/private/tmp/skey-batch3/start` and `/private/tmp/skey-batch3/final`, never mutable `dist`. The temporary scoped adapter reuses the original per-entry setup and assertions, including the exact aggregate identity assertion. It retains date/time, browser revision, viewport/DPR, actual Arabic/RTL, theme, hidden kit, signed-out/empty saved-account fixture, focused empty password, username/autocomplete semantics, visibility/clipping, hit-testing and scroll-stability gates. Only entry selection, temporary evidence destinations and additive diagnostic metadata differ from full-run orchestration. Repository manifest, runner and assertions were not edited. Candidate captures were exclusive `wx` writes to new temporary paths; no blanket snapshot-update command or update flags were used.

Original entry contracts passed 7/7 on the starting build and 7/7 on the final build before approval; geometry-only reruns passed 7/7 for each build. After replacement, the seven final original contracts passed again without capturing or replacing any image. Exact viewport PNG dimensions were checked before each replacement.

## Commands and results

```sh
node scripts/serve.mjs --root /private/tmp/skey-batch3/start --port 4204
node scripts/serve.mjs --root /private/tmp/skey-batch3/final --port 4205
PARITY_URL=http://127.0.0.1:4204 node /private/tmp/skey-signin-review/review.mjs start
PARITY_URL=http://127.0.0.1:4205 node /private/tmp/skey-signin-review/review.mjs final
PARITY_URL=http://127.0.0.1:4204 node /private/tmp/skey-signin-review/review.mjs start preflight
PARITY_URL=http://127.0.0.1:4205 node /private/tmp/skey-signin-review/review.mjs final preflight
PARITY_URL=http://127.0.0.1:4205 npx playwright test tests/signin-gate.spec.mjs tests/visual-qa-batch3.spec.mjs --workers=2 --retries=0 --output=/private/tmp/skey-signin-review/tests > /private/tmp/skey-signin-review/tests.log 2>&1
# After individual review and the seven explicit file replacements:
PARITY_URL=http://127.0.0.1:4205 node /private/tmp/skey-signin-review/review.mjs final preflight > /private/tmp/skey-signin-review/post-contracts.log 2>&1
PARITY_URL=http://127.0.0.1:4205 npx playwright test tests/signin-gate.spec.mjs tests/visual-qa-batch3.spec.mjs --workers=2 --retries=0 --output=/private/tmp/skey-signin-review/post-tests > /private/tmp/skey-signin-review/post-tests.log 2>&1
git -c core.fsmonitor=false diff --check
```

Focused browser results: **49 passed, zero failed/skipped** before replacement and **49 passed, zero failed/skipped** after replacement, two workers and zero retries. Each project has five existing gate checks and two Batch 3 rendered regressions: seven passes per profile. Post-replacement original contracts: **7 passed, zero failed**. Diff check passed.

## Preservation and limits

Starting inventory: 649 existing repository files, including all 252 protected PNGs. Final preservation: only the seven explicitly approved existing files changed; the other 642 existing files remain byte-identical. The other 245 PNGs include all 29 earlier approved replacements and all 124 historical PNGs. Non-approved candidates: none, so that candidate-specific byte-preservation check is vacuous; every other protected image was checked individually. New files are this report, its companion evidence and fourteen lossless review assets.

All application/test changes, earlier reports/evidence, approved manifest and runner, historical capture inventory, 76-failure baseline/ledger and three `.shot*.mjs` scripts remain unchanged. Branch refs and worktree registrations match the starting records. No commit, push, cleanup, branch/worktree deletion, assertion/tolerance/mask/fixture change or unrelated visual investigation occurred. Task-owned static servers were stopped after verification; other servers were preserved.

Unit/build and the full historical suite were not rerun for this image-only review; the existing Batch 3 unit/build and 128-entry DOM results remain prior evidence, not newly executed checks. The eleven unrelated investigation outcomes remain unexplained and VQA-07 remains deferred. This refresh is not full-product visual consistency sign-off or a claim of a green historical suite.

**Final decision: 7 approved and replaced; 0 retained; 0 requiring further investigation within these seven candidates.**
