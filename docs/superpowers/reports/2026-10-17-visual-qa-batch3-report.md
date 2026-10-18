# Batch 3 completion — VQA-06 and bounded visual investigation

VQA-06 is implemented locally. The independent starting-build investigation completed **33/33 captures** across all eleven requested pairs. The final-build DOM compatibility sweep passed **128/128 entries** without screenshot writes. Final browser verification: **276 passed, zero failed, 25 intentional project-scope skips**, two workers and zero retries. This includes **14 new VQA-06 checks** across seven profiles. Unit tests: **143 passed, zero failures**. Build, syntax and diff checks passed. **Zero snapshots were changed.**

## VQA-06 root cause, change and rendered review

The identity's single `break-all` text run permitted arbitrary breaks inside the workspace hostname and branch. Flex sizing also allowed the adjacent Change control to compete with the text. The local fix creates three inline wrapping units while retaining the outer LTR `bdi`, original separators and exact aggregate text:

`admin@lastchance.local · lastchance.skeyerp.com · Cairo HQ`

Changed application files:

- `concepts/app/pages/signin/signin.js`: a presentation-only `renderSignInIdentity()` helper builds safe text nodes/spans. Email and hostname have a contained `overflow-wrap:anywhere` fallback; branch text uses normal word boundaries with `break-word` only for an otherwise unbreakable token. `refreshWho()` calls that helper; its hidden authentication-email assignment remains intact.
- `concepts/app/pages/signin/templates.html`: the identity takes the available flex width with normal word breaking and start alignment; Change cannot shrink or wrap. All styles are local utility classes on this component.
- New `tests/visual-qa-batch3.spec.mjs`: two rendered-behavior regressions per profile. No existing test was modified.

Removing the renderer addition/call and reversing the three identity-related class edits reproduces the starting hashes of both application files. Consequently all other sign-in logic, PIN/saved-account behavior, authentication policy and the existing email-hint markup remain byte-for-byte intact. The locale file is unchanged. No invoice, fixture, calendar or financial-formatting change was made.

The regressions measure individual character line boxes, full containment, overflow, actual clipping ancestors, center hit ownership and disjoint identity/Change rectangles. Every seeded email, hostname and `Cairo HQ` occupies one intact line within its own unit. Change retains at least 44px touch dimensions in both mobile profiles, its localized accessible name, normal interaction and correct focus restoration. Tab/Shift+Tab navigation, password clearing, branch reselection, unchanged hidden username semantics, signed-out session and empty saved-account state are checked.

The second test invokes the actual presentation renderer with test-only unusually long email/hostname and a long multiword branch. It checks character containment, no horizontal page overflow, fallback wrapping and intact word line boxes, then uses Change and the normal discovery flow to restore the seeded identity. This does not modify directory/authentication state or tracked fixtures. Running the seeded character-line-box test against the frozen starting build produces seven expected failures: it detects the original hostname/branch splitting rather than merely requiring new markup hooks. All seven pass on the final build.

All seven rendered profiles were reviewed. Mobile LTR and actual Arabic RTL show three readable identity lines; five desktop variants show intact email/hostname/branch units over two lines. The desktop stored baselines also split the hostname before its last `m`; this is the same component mechanism, not an additional implementation scope. Identity height changes in RTL explain the resulting vertical card recentering. Desktop visual changes are confined to identity wrapping/alignment; no global styling was introduced.

[Lossless before/current comparisons](2026-10-17-visual-qa-batch3-assets/) contain one individually labelled sheet per profile. These are review evidence, not refreshed baselines. All seven `signin-password-identity.png` paths are potential future review candidates; **none is approved for replacement by this execution**. Other sign-in snapshots and the existing email-hint baseline decision remain outside that candidate set.

## Independent visual investigation — all eleven outcomes

Built and hashed the unchanged starting tree before application edits, served its isolated copy on 4202, and ran three fresh browser contexts per pair while implementing VQA-06. Every original entry assertion passed. No application/setup/assertion/tolerance/mask or snapshot changes were made for this workstream.

The table reports exact changed-pixel counts against the stored baseline for repetitions 1/2/3, followed by the largest difference among the three same-build image pairs. **Stable** means those three fresh images were pixel-identical; it does not establish why they differ from the historical baseline. **Variable** means variation was demonstrated on an identical frozen build with fresh contexts. The underlying rendering mechanism remains **unexplained in all eleven cases**; no harmless-antialiasing or product-defect attribution is claimed.

Paths are relative to `tests/visual-coverage.spec.mjs-snapshots/`.

| Profile / state | Baseline differences, repetitions 1/2/3 | Maximum same-build difference | Outcome |
| --- | --- | ---: | --- |
| `desktop-dark/invoice-charges.png` | 2 / 2 / 0 | 2 | Variable; cause unexplained |
| `desktop-high-contrast-light/invoice-tax-totals.png` | 6 / 6 / 6 | 0 | Stable mismatch; cause unexplained |
| `desktop-high-contrast-dark/activities-calendar-week.png` | 12 / 6 / 12 | 6 | Variable; cause unexplained |
| `desktop-high-contrast-dark/invoice-charges.png` | 2 / 0 / 2 | 2 | Variable; cause unexplained |
| `desktop-high-contrast-dark/invoice-tax-totals.png` | 0 / 14 / 14 | 14 | Variable; cause unexplained |
| `desktop/invoice-lines-start.png` | 8 / 8 / 8 | 0 | Stable mismatch; cause unexplained |
| `mobile-touch/invoice-lines-end.png` | 4 / 4 / 4 | 0 | Stable mismatch; cause unexplained |
| `desktop-dark/invoice-lines-start.png` | 13 / 17 / 13 | 4 | Variable; cause unexplained |
| `desktop-high-contrast-light/invoice-lines-start.png` | 372 / 282 / 339 | 129 | Variable; cause unexplained |
| `desktop-high-contrast-dark/invoice-lines-start.png` | 309 / 373 / 334 | 148 | Variable; cause unexplained |
| `desktop-reduced-motion/invoice-lines-start.png` | 6 / 6 / 7 | 5 | Variable; cause unexplained |

Thus **eight variable pairs and three stable mismatches** were established. Recorded target/crop geometry, scroll positions and environment fields are equal across the three repetitions for each pair. That does not prove unrecorded rendering-pipeline state is identical or identify a causal mechanism. The current counts need not equal earlier single-run counts.

Per capture, evidence records browser/user agent, OS/architecture, DPR, layout/visual viewport, actual locale/direction/theme, focus, last commanded pointer position `(0,0)` and hover chain, font loading information, platform-font query results, target/crop geometry, all nonzero scroll positions, PNG hash, and exact baseline/inter-repeat changed-pixel bounds. Supplemental **DOM-only font probes** on the same starting build collect actual visible text font samples where a container-level query returned no glyphs. Samples identify `.SF NS` regular/bold/variable instances; these samples do not establish the cause of the pixel variation.

Runtime: Darwin 27.0.0 arm64, Chromium 153.0.8010.12 (manifest revision 1243), DPR 1; original manifest profiles and pinned Africa/Cairo date/time were retained. All 33 captured pixel arrays are preserved as lossless WebP evidence, with RGB equality verified against the PNG buffers. No additional screenshot was made by the font probes. No observed difference was fixed, hidden, tolerated or rebaselined.

## Source/build identities and exact verification

Branch remains `feat/prototype-quality-pass`, HEAD `f29d61c7e15fd19b7603a25dd6c0995535122778`; work is uncommitted.

| Identity | SHA-256 |
| --- | --- |
| Starting tracked diff | `b8694de51920ef5f781ffa31fa9ab811076f7aeda7b5117c8e15dcc4c758cd66` |
| Final tracked diff | `af75dab1dc014af568341c4d4de0fd0ede398b3a6d5abb2adf6e819214dd5e63` |
| Starting frozen inventory, 321 files | `7922e0965b7f247f779e8ddee2ac8dd603e9529c0baaa2fd3626c4e0b2bff100` |
| Final frozen inventory, 321 files | `31ef61c66dfad8a8653cddadf8220b36d9c44309f3e95af9aff0577256981ae3` |
| Manifest, unchanged | `84a6ca14241b2b8246420c031918ed4d45eca3895da7cf00a227d7d65aed09c5` |
| Runner, unchanged | `a5c7e29fb0b64004188e1398c9ead2f093790ad3f3a7f8e8efd5bd8a917e3114` |

Inventories hash sorted compact JSON path/hash records and were reverified after the runs. Unit/build work finished before final browser checks. Final checks used only `/private/tmp/skey-batch3/final` on 4203; the investigation used only `/private/tmp/skey-batch3/start`. Neither server depended on mutable `dist`.

```sh
npm run build > /private/tmp/skey-batch3/build-start.log 2>&1
cp -R dist /private/tmp/skey-batch3/start
node scripts/serve.mjs --root /private/tmp/skey-batch3/start --port 4202
PARITY_URL=http://127.0.0.1:4202 node /private/tmp/skey-batch3/coverage.mjs investigation > /private/tmp/skey-batch3/investigation.log 2>&1
PARITY_URL=http://127.0.0.1:4202 node /private/tmp/skey-batch3/font-probe.mjs font-probe > /private/tmp/skey-batch3/font-probe.log 2>&1
npm run test:unit > /private/tmp/skey-batch3/unit.log 2>&1
npm run build > /private/tmp/skey-batch3/build-final.log 2>&1
cp -R dist /private/tmp/skey-batch3/final
node scripts/serve.mjs --root /private/tmp/skey-batch3/final --port 4203
PARITY_URL=http://127.0.0.1:4203 npx playwright test tests/visual-qa-batch3.spec.mjs --workers=2 --retries=0 --output=/private/tmp/skey-batch3/new-tests > /private/tmp/skey-batch3/new-tests.log 2>&1
PARITY_URL=http://127.0.0.1:4202 npx playwright test tests/visual-qa-batch3.spec.mjs --grep 'seeded identity' --workers=2 --retries=0 --output=/private/tmp/skey-batch3/identity-red > /private/tmp/skey-batch3/identity-red.log 2>&1
PARITY_URL=http://127.0.0.1:4203 npx playwright test tests/signin-gate.spec.mjs tests/signin-pages.spec.mjs tests/visual-qa-batch1.spec.mjs tests/visual-qa-batch2.spec.mjs tests/visual-qa-batch3.spec.mjs --workers=2 --retries=0 --output=/private/tmp/skey-batch3/final-tests > /private/tmp/skey-batch3/final-tests.log 2>&1
PARITY_URL=http://127.0.0.1:4203 node /private/tmp/skey-batch3/coverage.mjs compatibility > /private/tmp/skey-batch3/compatibility.log 2>&1
node --check concepts/app/pages/signin/signin.js
node --check tests/visual-qa-batch3.spec.mjs
git -c core.fsmonitor=false diff --check
```

The temporary compatibility adapter executes all 128 original entry setups/assertions with screenshot mode disabled. It does not invoke the repository runner's new-destination capture workflow against existing files or relax its capture write protections. The original aggregate identity assertion passes unchanged. No new forced interaction, arbitrary wait, injected CSS or mask was introduced; the reused invoice setup retains its original prototype mode-control mechanics.

| Final verification | Passed | Failed | Intentional skips |
| --- | ---: | ---: | ---: |
| Existing sign-in gate/pages across seven profiles | 224 | 0 | 0 |
| Batch 1, including strengthened SR-01 checks | 28 | 0 | 0 |
| Batch 2 mobile regressions | 10 | 0 | 25 |
| New Batch 3 regressions | 14 | 0 | 0 |
| **Combined browser run** | **276** | **0** | **25** |
| Full unit suite | 143 | 0 | 0 |
| Starting-build investigation capture assertions | 33 | 0 | 0 |
| Supplemental starting-build font probes, DOM only | 11 | 0 | 0 |
| Final DOM compatibility sweep | 128 | 0 | 0 |

Browser passes per project: desktop 38, mobile-touch 43, dark 38, HC light 38, HC dark 38, Arabic RTL 43, reduced motion 38. The 25 skips are five Batch 2 cases on each of five non-mobile profiles; none counts as a pass. The 128-entry DOM results are desktop 18, mobile-touch 19, dark 18, HC light 18, HC dark 18, Arabic RTL 19, reduced motion 18; zero failures. No visual baseline comparison is implied by these DOM passes. The seven expected starting-build regression failures are separate red verification, not failures concealed from the final run.

## Preservation, limitations and next decision

[Batch 3 evidence JSON](2026-10-17-visual-qa-batch3-evidence.json) records starting/source/build hashes, all 33 environments and pairwise pixel bounds, font probes, all 128 DOM results, seven identity comparisons, logs, assets and final preservation checks. All previously existing files other than the two authorized sign-in application files are protected, including the prior Batch 1/2/SR-01 source, tests and reports, email-hint content, all 252 PNGs, approved manifest/runner, historical inventory, 76-failure ledger/baseline, three `.shot*.mjs` scripts, refs and worktree registrations.

Final preservation verifies **604 of 606 starting files unchanged**; only `signin.js` and the sign-in template changed. All existing tests, all252 protected PNGs (including the29 earlier approved replacements), prior reports/assets and protected records retain their starting hashes. The added files are the new focused test, this report/evidence pair and forty lossless WebP review assets. Both frozen inventories remain intact. The two task-owned static servers were stopped after verification; existing user servers were left alone.

No snapshot update, commit, push, branch/worktree deletion or cleanup was performed. VQA-07 and all invoice arithmetic/fixtures remain untouched. The historical full suite was not run, so this report does not claim the 76 historical failures are resolved or that the full product is green. This is not a full-product visual consistency sign-off.

**Next decisions:** review the seven individually evidenced password-identity snapshot candidates before authorizing any replacements; decide VQA-07's financial-token formatting separately. The eleven investigation causes remain unexplained. Further diagnosis or any newly confirmed defect needs a separately bounded scope; no fix or tolerance change was bundled into Batch 3.
