# Visual QA remediation Batch 1

Implemented **VQA-01, VQA-02 and VQA-03 only**. Final validation: **28 new focused browser checks, 40 existing browser checks and 143 unit tests passed**. Build, JavaScript syntax checks and `git diff --check` passed. No snapshots, manifest, runner, audit findings or baseline records were changed. These results are scoped to Batch 1, not a product-wide visual consistency sign-off.

## Source and preservation

Read the full [audit report](2026-10-16-visual-qa-audit.md) and its [evidence inventory](2026-10-16-visual-qa-audit-evidence.json), and checked the current files/tests before editing. Work remained on `feat/prototype-quality-pass`, HEAD `f29d61c7e15fd19b7603a25dd6c0995535122778`. Changes are **uncommitted**. The historical frozen audit build was not substituted for the current working tree.

The starting tracked diff consisted only of the demo-email hint in `concepts/app/core/locale.js` and `concepts/app/pages/signin/templates.html`. Both files retain their exact starting hashes. Existing untracked proposals, diagnostics, audit files and the three `.shot*.mjs` scripts were preserved.

Built the starting working tree into a separate baseline at `/private/tmp/skey-remediation-batch1/before`, served on port 4194. Candidate checks used freshly rebuilt `dist` on port 4195. The baseline therefore includes the user's current email hint and current source, rather than assuming the older audit build is current. Both task-owned servers were stopped afterward; the user's dev server was left alone.

Final source identity is HEAD plus the recorded working-tree changes:

- Tracked diff SHA-256: `152bd84a9b49952116fb513bd8cad8baa3e21eae66fe6dcf10128f7911f89a9c`.
- Candidate build inventory SHA-256: `57ee667549f94996a2d97a2cac22dca1799276b350a8ac48d30f225528912c19` (hash of sorted compact JSON path/hash records).
- [Batch evidence JSON](2026-10-17-visual-qa-batch1-evidence.json) records exact source-file hashes, build inventory, before/after measurements, temporary image hashes and verification logs. The new test file is hashed separately because it is untracked and is not included in `git diff`.

## VQA-01 — Mobile Mail reading

**Root cause confirmed:** wrapped nonshrinking actions took 199 px and the empty quick-reply composer another 172 px, leaving only 166 px for the message. Body/attachment DOM text existed outside the visible reading scrollport.

**Files changed:**

- `concepts/app/pages/email/email.js`: semantic hooks for reading/actions; retain accessible action labels; mark an initially empty quick reply so mobile can defer it. Existing Reply still opens the full composer. Restored nonempty quick replies and actively edited replies remain visible. Draft persistence, filing and sending logic are unchanged.
- `concepts/app/styles/tailwind/email.css`: six 44 px action icons in one row at phone widths; visually hidden accessible labels; defer only the empty quick-reply box; place the attachment before the long body on mobile; allocate sender/time rows so they do not collide. Reading padding changes are scoped to reading, not draft compose.
- `tests/visual-qa-batch1.spec.mjs`: two focused Mail tests, run in all seven profiles.

**Before/after at 390 × 844, both directions:** toolbar **199 → 61 px**, reading scrollport **165.83 → 476.25 px**. The attachment is now fully visible around y=593–627, followed by actual body text and the payment paragraph. Initial reading scroll remains zero; the rest of the message is reachable through normal wheel scrolling.

| Direction | Before | After |
| --- | --- | --- |
| LTR | [Initial reader](/private/tmp/skey-remediation-batch1/mail-settled-before-ltr.png) | [Final reader/header](/private/tmp/skey-remediation-batch1/batch1-final-ltr.png) |
| Arabic RTL | [Initial reader](/private/tmp/skey-remediation-batch1/mail-settled-before-rtl.png) | [Final reader/header](/private/tmp/skey-remediation-batch1/batch1-final-rtl.png) |

**Regression evidence:** tests check actual viewport/scrollport intersection and center hit-testing for attachment, body text and sender metadata; at least two visible lines of the payment paragraph; normal scrolling to the final body paragraph; desktop quick-reply visibility; Reply → compose → confirmed Save draft → navigation → restored quick reply; Back/edit persistence; Archive and Move. The original build fails the mobile toolbar/space check in both directions. Final Mail checks pass **14/14**, and the full final matrix reruns them.

**Remaining limits:** a long message still needs scrolling. A restored nonempty quick reply intentionally takes editing space. The prototype launcher policy from VQA-05 was not implemented; it can still cover content near the bottom corner. Attachments remain prototype sample files. No Mail backend behavior was added.

## VQA-02 — Mobile shell header

**Root cause confirmed:** `syncTopbarBrand()` replaced the identity's sizing/truncation classes. Workspace text and year overflowed a 68 px button into utility controls, made worse by the required touch-target widths.

**Files changed:**

- `concepts/app/shell/topbar.js`: restore `min-w-0 truncate` on the rebuilt name and retain the home icon/year at their intrinsic widths.
- `concepts/app/styles/tailwind/shell.css`: explicit mobile grid placement. Workspace/year and utilities occupy row one; sidebar/app navigation and search occupy row two. Search retains its full accessible name and can ellipsize its visible label when necessary.
- `tests/visual-qa-batch1.spec.mjs`: painted identity bounds, target geometry and real action checks.

**Before/after at 390 × 844:** header height stays **113 px**. In LTR, the old workspace button occupied x=116–184 while its name extended to x≈221 and year to x≈273, over utilities beginning at x=192. The new workspace occupies x=8–184 with both name and year inside it; utilities remain x=192–382. RTL mirrors this: workspace x=206–382, utilities x=8–198. Both seeded name and year are fully readable, rather than simply clipped away. All visible mobile header buttons remain at least **44 × 44 px**. Before/after image links are in the Mail table above, showing the same shared header.

**Regression evidence:** the original build fails identity containment in both mobile directions. Final checks pass **7/7 profiles**: no overlap between visible button rectangles, text/year inside the identity, complete seeded name, no document-width overflow, unchanged accessible workspace name, normal alert/assistant opening and Escape dismissal. The existing Home/topbar restoration check also passes across all seven profiles.

**Remaining limits:** layout and action checks here are not a full keyboard-order or screen-reader audit. No workspace/authentication policy was changed.

## VQA-03 — Invoice values at rest

**Root cause confirmed:** auto-sized columns and input/cell padding left insufficient value space. Desktop baseline text budgets were approximately **27 px for the item**, **65 px for the date** and **10 px for price after a conservative numeric-stepper reservation**. Rendered glyph widths were about 48.5, 70.8 and 22.2 px respectively. Mobile also had a coarse-pointer 44 px minimum overriding the initial field-width attempt.

**Files changed:**

- `concepts/app/pages/invoices/lines.js`: semantic classes on code, expiry, price and batch inputs. Values, positional fields, existing accessible labels, handlers and arithmetic are unchanged.
- `concepts/app/styles/tailwind/invoices.css`: scoped value-sized minima for code/date/price, a minimum floor for neighboring inputs, and a batch-code minimum. Rebalance cell padding to 8 px within the items table. This keeps the widened fields from squeezing quantity/batch values and preserves the full leading identifier/date segment. The existing horizontal scroller handles later columns.
- `tests/visual-qa-batch1.spec.mjs`: verify all seeded editable values, rather than checking only the three initially reported fields and missing collateral truncation.

**Rendered result:** original-size inspection confirms **VIS-001, VIS-002, 2027-12-31 and 100** fully readable inside their borders at rest across all seven profiles. Adjacent quantity `1` and `LOT-001` / `LOT-002` remain readable. On mobile, code/date appear together at the leading edge; a normal pan exposes the complete price; the logical trailing edge retains tax/total/remove controls. Both positive LTR and negative RTL scroll positions are exercised.

| Profile / viewport | Before leading | After leading | After normal pan to price |
| --- | --- | --- | --- |
| Desktop, 1440 × 900 | [Before](/private/tmp/skey-remediation-batch1/invoice-before-desktop-900-leading.png) | [After](/private/tmp/skey-remediation-batch1/invoice-final-2-desktop-900-leading.png) | Price visible in the same desktop segment |
| LTR, 390 × 844 | [Before](/private/tmp/skey-remediation-batch1/invoice-before-mobile-touch-844-leading.png) | [After](/private/tmp/skey-remediation-batch1/invoice-final-2-mobile-touch-844-leading.png) | [Price](/private/tmp/skey-remediation-batch1/invoice-final-2-mobile-touch-844-price.png) |
| RTL, 390 × 844 | [Before](/private/tmp/skey-remediation-batch1/invoice-before-mobile-rtl-844-leading.png) | [After](/private/tmp/skey-remediation-batch1/invoice-final-2-mobile-rtl-844-leading.png) | [Price](/private/tmp/skey-remediation-batch1/invoice-final-2-mobile-rtl-844-price.png) |
| LTR, approved 390 × 1200 | [Before](/private/tmp/skey-remediation-batch1/invoice-before-mobile-touch-1200-leading.png) | [After](/private/tmp/skey-remediation-batch1/invoice-final-2-mobile-touch-1200-leading.png) | [Price](/private/tmp/skey-remediation-batch1/invoice-final-2-mobile-touch-1200-price.png) |
| RTL, approved 390 × 1200 | [Before](/private/tmp/skey-remediation-batch1/invoice-before-mobile-rtl-1200-leading.png) | [After](/private/tmp/skey-remediation-batch1/invoice-final-2-mobile-rtl-1200-leading.png) | [Price](/private/tmp/skey-remediation-batch1/invoice-final-2-mobile-rtl-1200-price.png) |

The evidence JSON lists the dark, both high-contrast and reduced-motion image paths and hashes, plus leading/price/trailing states for all seven profiles. All seven final profile variants were visually inspected. Temporary evidence files are outside the snapshot namespaces.

**Regression evidence:** tests measure rendered glyph width with the actual input font, available inner width after padding and numeric-control allowance, no internal input panning, no focus/caret dependence, container clipping and center hit-testing. Every seeded editable field is checked on both rows. Mobile runs both **390 × 844 and 390 × 1200** and verifies leading/trailing endpoints. The baseline fails the first item-width assertion on desktop and both mobile profiles. Final invoice regression passes **7/7 profiles** as part of the complete 28-check final matrix.

**Remaining limits:** 390 × 844 provides limited vertical room around record chrome/sticky footer; its evidence crops do not claim the entire section fits simultaneously. Normal vertical scrolling checks each row's fields. The approved 390 × 1200 view remains the whole-section evidence. Long arbitrary future values are not guaranteed to fit these minima. Legacy field accessible-label mismatches were not repaired. **Fixed subtotal 200, zero tax and zero line-money outputs remain unchanged and are asserted.**

## Exact verification commands and final results

Candidate browser commands use `PARITY_URL=http://127.0.0.1:4195`:

```sh
npm run build
npm run test:unit
PARITY_URL=http://127.0.0.1:4195 npx playwright test tests/visual-qa-batch1.spec.mjs --workers=2 --retries=0 --output=/private/tmp/skey-remediation-batch1/final-focused-2
PARITY_URL=http://127.0.0.1:4195 npx playwright test tests/collaboration.spec.mjs --project=desktop --grep 'internal mail' --workers=2 --retries=0 --output=/private/tmp/skey-remediation-batch1/existing-mail
PARITY_URL=http://127.0.0.1:4195 npx playwright test tests/invoice-geography.spec.mjs tests/messaging.spec.mjs --grep 'invoice line entry|invoice create footer|Home restores' --workers=2 --retries=0 --output=/private/tmp/skey-remediation-batch1/existing-invoice-shell-final
node --check concepts/app/pages/email/email.js
node --check concepts/app/shell/topbar.js
node --check concepts/app/pages/invoices/lines.js
node --check tests/visual-qa-batch1.spec.mjs
git -c core.fsmonitor=false diff --check
```

| Verification | Passed | Failed |
| --- | ---: | ---: |
| New Batch 1 matrix: 4 checks × 7 profiles | 28 | 0 |
| Existing Internal Mail selection, drafts, folders, send and filing | 19 | 0 |
| Existing invoice/footer and shell restoration: 3 checks × 7 profiles | 21 | 0 |
| Unit suite | 143 | 0 |

Per-project new matrix: desktop 4/4, mobile-touch 4/4, desktop-dark 4/4, desktop-high-contrast-light 4/4, desktop-high-contrast-dark 4/4, mobile-rtl 4/4, desktop-reduced-motion 4/4. Zero retries; no snapshot-update flags.

Before-edit red commands targeted the new tests on port 4194: VQA-01 in both mobile projects; VQA-02 in both mobile projects; VQA-03 in desktop and both mobile projects. Each failed on the actual reviewed defect. Final logs and temporary traces remain under `/private/tmp/skey-remediation-batch1/`.

Verification issues encountered and resolved: the first unit run was blocked by sandbox `listen EPERM` in local-server tests; rerunning with localhost-listener permission passed all 143. An initial draft regression navigated before asynchronous Save completed; it now waits for the actual save confirmation and verifies the restored UI. Development invoice checks caught the coarse-rule override, incomplete leading-date containment and adjacent-field squeezing; the final scoped allocation and broader seeded-field checks address those issues. No final test failure remains. The full historical suite was not rerun, and this report makes no claim that the 76 documented failures are resolved or unchanged in observed count on the new build.

## Final preservation and snapshot decision

Verified **558 protected starting files** outside the six authorized application changes against their initial hashes. This includes both user email-hint files, audit report/evidence, fixture sources, tests, approved manifest, capture runner, known-defect ledger/baseline and `.shot*.mjs` scripts. Independently verified all **124 original PNGs** against the historical preservation inventory and all **128 coverage PNGs** against their integrity inventory. Branch refs and worktree registrations match the starting records. No push, commit, branch/worktree deletion or unrelated cleanup occurred.

Changed for Batch 1: **six application files**, **one new focused test**, and this new report/evidence pair. Pre-existing user edits remain separate and preserved. VQA-04 through VQA-08 were not implemented; no authentication, fixture, invoice arithmetic, calendar or sign-in behavior change was made.

**No snapshot update is needed to make the focused behavior regressions pass.** Historical snapshots intentionally still show the earlier design. A future visual comparison against the new intended Mail/header/invoice rendering will need a separately reviewed baseline refresh for affected surfaces. Broad snapshot replacement is not justified. No snapshots, approved capture setup, runner or manifest were updated here, and no new 128-entry preflight/capture run is claimed.
