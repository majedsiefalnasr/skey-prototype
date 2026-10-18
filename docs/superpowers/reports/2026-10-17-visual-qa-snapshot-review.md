# Remediation visual review and targeted snapshot decision

Reviewed VQA-01 through VQA-05 and VQA-08 against the current working tree. **Approve 27 individual coverage replacements; retain both mobile invoice leading baselines because their unchanged capture assertions fail.** No application, test, manifest, runner, audit or remediation-report changes are included in this phase. VQA-06 and VQA-07 were not started.

Verification: **80 focused browser checks passed, zero failed, 193 intentional project-scope skips; 143 unit tests passed.** The separate targeted capture-state review is **51 passed / 2 failed out of 53 selected entries**, not a complete 128-entry preflight. Thirteen supplemental live UI states were reviewed. Build, syntax and diff checks passed. The two failed capture gates remain unresolved despite the focused tests passing.

## Source, method and evidence

Read the complete audit, both remediation reports and their evidence JSON files. Inspected the current branch, worktree registrations, source and existing diff before building. All thirteen Batch 1/2 source/test hashes recorded by their reports, including both email-hint files, match the current files. HEAD alone does not describe this uncommitted implementation.

- Branch: `feat/prototype-quality-pass`; HEAD `f29d61c7e15fd19b7603a25dd6c0995535122778`.
- Starting tracked diff SHA-256: `c2f9acac4a8d60f9a192ea8c232bf8e5a6dfe4b6b68ca816fdff0515c3c1fc8a`.
- Built after unit completion, copied to `/private/tmp/skey-snapshot-review/build`, served on isolated port **4198**. No browser verification used mutable `dist`.
- Isolated build: **289 files**, sorted path/hash inventory SHA-256 `2f725877c1f432b5932c7b66f9a4c38233389417c186c2d34b44be9cabfd1280`.
- Unchanged manifest SHA-256: `84a6ca14241b2b8246420c031918ed4d45eca3895da7cf00a227d7d65aed09c5`.
- Unchanged runner SHA-256: `a5c7e29fb0b64004188e1398c9ead2f093790ad3f3a7f8e8efd5bd8a917e3114`.

The prior phases' 74 temporary evidence images are no longer available. Their measurements remain in the preserved JSON, but those missing images were not claimed as re-inspected. Before images here are the actual protected coverage baselines; after images are fresh captures from the current isolated build. Durable, lossless comparison sheets and live-state evidence are included in [review assets](2026-10-17-visual-qa-snapshot-review-assets/). [Review evidence JSON](2026-10-17-visual-qa-snapshot-review-evidence.json) records exact paths, dimensions, original/candidate/final hashes, build inventory, assertions, approvals and every retained coverage path.

A temporary review adapter reuses the runner's per-entry setup, fixture checks and assertions verbatim. It selects **29 directly affected candidates plus 24 control entries**, writes only to a temporary review directory with exclusive creation, and collects independent entry failures. The repository runner was neither modified nor invoked to bypass its original exclusive-destination protections. This is a targeted review, not an official full capture rerun. All seven manifest profiles, pinned Cairo browser timezone/date, mobile invoice 390 × 1200 override, native pans, Sunday-start equality, locale/RTL checks, clipping, hit testing, scroll stability and fixture limitations were retained. Actual mobile behavior was also tested at **390 × 844**.

## Review findings and rationale

### Mail, reply and launcher — accepted within the tested scope

The fresh initial readers show a single compact action row, complete attachment and actual payment/body text. The empty quick reply is deferred. The protected before images show the four-row toolbar and empty composer consuming the reading area. The focused checks establish actual visible intersection and hit ownership, normal scrolling to the final paragraph, working Reply/Back/filing and saved draft restoration. This is more than DOM text presence.

When a nonempty reply is restored, it intentionally takes editing space; the launcher stays visible in the opposite navigation rail. Live checks confirm normal reopening/hiding of the kit, focus restoration and successful Reply. LTR Reply is x264.17/y774, 80.83 × 44; launcher x4/y786, 44 × 44. Arabic RTL Reply is x45/y774, 55.75 × 44; launcher x342/y786, 44 × 44. Their rectangles are disjoint. See [initial reader before/after LTR](2026-10-17-visual-qa-snapshot-review-assets/mobile-touch-5.webp), [RTL](2026-10-17-visual-qa-snapshot-review-assets/mobile-rtl-5.webp) and [saved replies](2026-10-17-visual-qa-snapshot-review-assets/saved-reply-launcher.webp).

The saved-reply supplemental harness initially failed to reactivate Arabic after reload; visual inspection caught two English panels. That evidence was replaced with a correctly activated, explicitly asserted `ar`/`rtl` state. An additional harness attempt expected an explicit `dir=ltr` attribute on the default English document; activating the existing locale control for both profiles resolved this setup assumption without changing application behavior or accepting alternative outcomes. Only the corrected evidence is retained in the review assets. The existing focused regressions already reactivate locale correctly and passed unchanged.

### Header — accepted on every affected mobile capture

Workspace/year and utility controls occupy distinct first-row regions; navigation/search use row two. Full seeded workspace name and year are readable, and the focused regression verifies painted text containment, 44px targets, no button overlap, accessible names and working alerts/assistant. Arabic content and direction are genuinely active. The fourteen header-only candidates have all changed pixels confined to the existing 113px header; their content below it is pixel-identical to the baseline. Calendar and reader candidates have additional explained content differences. No header-related reason exists to replace element-only editor or invoice crops.

### Calendars and timed events — accepted with stated limits

At the unchanged approved mobile pans, the week now exposes visible-column dates and a time-range strip; the month exposes visible weekdays. The strip remains exposed after normal scrolling and updates as the visible segment changes. Period buttons and the event start remain unobscured. The exact seven dates are still **October 11–17, 2026**. See comparison sheets 2 and 3 for each mobile profile and [live panning](2026-10-17-visual-qa-snapshot-review-assets/calendar-panning.webp).

Actual painted heights are **22px for 30 minutes / 46px for one hour**, with 44px/46px buttons. Adjacent half-hour starts are 24px apart with a 2px painted gap. Normal taps on paint edges/centers and both button centers open the correct event; Enter also works. [Adjacent-event evidence](2026-10-17-visual-qa-snapshot-review-assets/adjacent-events.webp) retains the tested LTR and Arabic RTL states.

Accepted limits: the grid remains wide and nested scrolling remains; the context strip is not an aligned frozen header/gutter or agenda. Long event titles ellipsize with full accessible names/detail views. Expanded transparent touch rectangles can overlap; the tested adjacent painted areas and button centers select independently. This does not establish general dense-calendar hit allocation or a full accessibility pass.

### Invoice — five desktop leading and two mobile trailing captures accepted; two mobile leading captures blocked

Five desktop leading captures now display **VIS-001, VIS-002, 2027-12-31 and 100** completely inside resting inputs, with neighboring quantity/batch values retained and all manifest-required cells visible. Each profile has its own before/current comparison sheet. [Live price evidence](2026-10-17-visual-qa-snapshot-review-assets/prices-at-rest.webp) confirms unfocused price `100` in all seven profiles, including a normal mobile pan. The focused tests also exercise 390 × 844 and 390 × 1200, both rows and logical scroll endpoints.

The two mobile trailing crops intentionally reflect the reallocated table columns while retaining the exact trailing endpoint, complete required Tax Amt/Total controls, zero outputs and quantity 2. Partial preceding columns at this panned edge remain outside the required visible columns. These are not fabricated prices/totals or a different fixture.

**SR-01 — confirmed capture-contract regression, follow-up required:** at the approved logical leading edge, the first three complete header boxes require **281.3125px** in a **274px** table scrollport. Expiry's header extends **7.3125px** outside it. LTR header x242.875/width122.4375 exceeds the scrollport right edge358; RTL x24.6875 falls before its left edge32. Center hit tests pass, but full containment fails. Reproducing after the runner's normal skeleton/font/frame settling gives the same failure; it is not a transient loader state. The identifiers/date glyphs are readable in the settled diagnostic, but that does not satisfy the unchanged full-header gate. See [before/settled diagnostic](2026-10-17-visual-qa-snapshot-review-assets/blocked-mobile-invoice.webp).

The focused Batch 1 regression checks input interiors and input clipping, not complete header-box containment. This explains its green result alongside the capture failure. **Leave `mobile-touch/invoice-lines-start.png` and `mobile-rtl/invoice-lines-start.png` unchanged.** Do not broaden the crop or weaken the gate. A separate narrowly scoped follow-up should reconcile the first three column allocations with 274px while retaining full input values, and add the complete-header assertion to regression coverage. No such fix was made in this review.

Fixed subtotal **200**, zero tax and zero line-money outputs remain accepted prototype limits. VQA-07's financial-token formatting decision is still open; no presentation or arithmetic change was accepted here.

## Individual replacement approvals

These are review approvals under this phase's targeted-refresh instruction, based on each fresh comparison and passing entry assertions. The scope was recorded before replacement; no other destination is authorized by this decision.

Rationale codes: **H** = readable, nonoverlapping mobile header, with content below unchanged; **W** = H plus persistent date/time context and correct duration paint; **C** = H plus visible weekday context; **M** = H plus compact reader, visible attachment/body and relocated live launcher; **I** = complete desktop identifiers/date/price with rebalanced columns; **T** = required trailing cells and logical endpoint preserved after intentional width reallocation. H/W/C/M are covered by the unchanged Batch 1/2 live interaction regressions; I/T by the seven-profile invoice regressions and the original entry assertions.

| Exact destination | Approval / intentional difference | Changed pixels |
| --- | --- | ---: |
| `tests/visual-coverage.spec.mjs-snapshots/desktop/invoice-lines-start.png` | Approved: I | 17185 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/notes-kanban.png` | Approved: H | 7997 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/notes-list-archived.png` | Approved: H | 7997 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/activities-kanban.png` | Approved: H | 7997 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/activities-calendar-week.png` | Approved: W | 19105 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/events-calendar-month.png` | Approved: C | 10063 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/people-list.png` | Approved: H | 7997 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/people-cards.png` | Approved: H | 7997 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/mail-inbox-list.png` | Approved: H | 7997 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/mail-reading-e1.png` | Approved: M | 46645 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/mail-compose-draft.png` | Approved: H | 7997 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-lines-end.png` | Approved: T | 3921 |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-dark/invoice-lines-start.png` | Approved: I | 16905 |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/invoice-lines-start.png` | Approved: I | 17099 |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/invoice-lines-start.png` | Approved: I | 17101 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/notes-kanban.png` | Approved: H | 7622 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/activities-kanban.png` | Approved: H | 7622 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/notes-list-archived.png` | Approved: H | 7622 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/activities-calendar-week.png` | Approved: W | 20133 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/events-calendar-month.png` | Approved: C | 13114 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/people-list.png` | Approved: H | 7622 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/people-cards.png` | Approved: H | 7622 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/mail-inbox-list.png` | Approved: H | 7622 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/mail-reading-e1.png` | Approved: M | 45979 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/mail-compose-draft.png` | Approved: H | 7622 |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-lines-end.png` | Approved: T | 3758 |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/invoice-lines-start.png` | Approved: I | 17182 |

Replacement status: **completed — exactly these 27 paths contain the reviewed candidate bytes**. Original destination hashes were checked before writing; final hashes match the individually approved candidates. No additional destination was written.

## Deliberately retained paths

Both failing mobile invoice leading paths remain unchanged as described above. All 24 control baselines below remain unchanged: 19 fresh controls are pixel-identical; five have small unexplained differences and are deliberately not accepted. The latter differ by 2–12 pixels in isolated regions; no causal attribution or tolerance was used to approve them.

| Exact destination | Reason retained |
| --- | --- |
| `tests/visual-coverage.spec.mjs-snapshots/desktop/mail-reading-e1.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop/activities-calendar-week.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop/invoice-charges.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop/invoice-tax-totals.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-lines-start.png` | Full Expiry header containment failed |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-charges.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-dark/activities-calendar-week.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-touch/invoice-tax-totals.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-dark/mail-reading-e1.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-dark/invoice-charges.png` | Unexplained 2-pixel control difference; not approved |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-dark/invoice-tax-totals.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/activities-calendar-week.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/mail-reading-e1.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/invoice-charges.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-light/invoice-tax-totals.png` | Unexplained 6-pixel control difference; not approved |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/activities-calendar-week.png` | Unexplained 12-pixel control difference; not approved |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/mail-reading-e1.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/invoice-charges.png` | Unexplained 2-pixel control difference; not approved |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-high-contrast-dark/invoice-tax-totals.png` | Unexplained 5-pixel control difference; not approved |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-lines-start.png` | Full Expiry header containment failed |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-charges.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/activities-calendar-week.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/mobile-rtl/invoice-tax-totals.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/mail-reading-e1.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/invoice-charges.png` | Pixel-identical control |
| `tests/visual-coverage.spec.mjs-snapshots/desktop-reduced-motion/invoice-tax-totals.png` | Pixel-identical control |

The other **75 unselected coverage images**, including all 21 sign-in states, all editor crops and unaffected desktop full-shell states, remain unchanged. The email hint is preserved in source but is not folded into this remediation refresh. All **124 historical PNGs** remain unchanged; the historical parity/failure baseline is not being rebaselined. The companion evidence JSON lists all 128 exact coverage decisions, including these 101 retained paths, and the 124 historical paths.

## Exact verification commands and outcomes

```sh
npm run test:unit > /private/tmp/skey-snapshot-review/unit.log 2>&1
npm run build > /private/tmp/skey-snapshot-review/build.log 2>&1
cp -R dist /private/tmp/skey-snapshot-review/build
node scripts/serve.mjs --root /private/tmp/skey-snapshot-review/build --port 4198
PARITY_URL=http://127.0.0.1:4198 npx playwright test tests/visual-qa-batch1.spec.mjs tests/visual-qa-batch2.spec.mjs tests/help-screens-consistency.spec.mjs tests/collaboration.spec.mjs --grep 'VQA-|calendar supports keyboard|density changes card|overnight|events expose calendar|create timed and all-day|end before start|overlapping events|unscheduled activities|clearing the scheduled|activities expose Kanban|schedule a time|internal mail' --workers=2 --retries=0 --output=/private/tmp/skey-snapshot-review/focused > /private/tmp/skey-snapshot-review/focused.log 2>&1
PARITY_URL=http://127.0.0.1:4198 node /private/tmp/skey-snapshot-review/review-capture.mjs > /private/tmp/skey-snapshot-review/review-capture.log 2>&1
PARITY_URL=http://127.0.0.1:4198 node /private/tmp/skey-snapshot-review/blocked-settled-diagnostics.mjs > /private/tmp/skey-snapshot-review/blocked-settled-diagnostics.log 2>&1
PARITY_URL=http://127.0.0.1:4198 node /private/tmp/skey-snapshot-review/supplemental.mjs > /private/tmp/skey-snapshot-review/supplemental.log 2>&1
PARITY_URL=http://127.0.0.1:4198 node /private/tmp/skey-snapshot-review/mail-check.mjs > /private/tmp/skey-snapshot-review/mail-check-final.log 2>&1
node --check concepts/app/components/collab/calendar.js
node --check concepts/app/pages/email/email.js
node --check concepts/app/pages/invoices/lines.js
node --check concepts/app/shell/topbar.js
node --check tests/visual-qa-batch1.spec.mjs
node --check tests/visual-qa-batch2.spec.mjs
git -c core.fsmonitor=false diff --check
```

| Check | Outcome |
| --- | --- |
| Focused browser selection, two workers / zero retries | 80 passed, 0 failed; 193 intentional suite/project skips |
| New remediation checks within that selection | Batch 1: 28 passed; Batch 2: 10 passed |
| Existing checks within that selection | 14 keyboard/density, 9 calendar flows, 19 Mail flows passed |
| Unit suite | 143 passed, 0 failed |
| Targeted manifest-entry review | 51 passed, **2 failed**; 75 other entries not run |
| Settled reproduction of blocked mobile leading entries | Same 2 full-header containment failures |
| Supplemental live states | 7 invoice-price, 2 corrected saved-reply, 4 calendar pan/wheel states passed |
| Build, JavaScript syntax, diff checks | Passed |

Focused project passes: desktop34, mobile-touch11, desktop-dark6, high-contrast-light6, high-contrast-dark6, mobile-rtl11, reduced-motion6. No snapshot-update flags, blanket 128-image regeneration, masks or injected styles were used. The unchanged invoice entry setup includes the original runner's programmatic record/add-control clicks and `selectOption('create', {force:true})` for the prototype mode control. No new forced click or capture-target visibility bypass was introduced. Live supplemental checks use normal clicks and the existing mode-change handler, as the focused regression does.

## Preservation and readiness

Final SHA-256 verification confirms **exactly the 27 approved PNG changes and 547 of 574 starting files unchanged**. All **225 other protected PNGs** remain byte-identical: **124 historical images and 101 retained coverage images**. All 128 coverage image dimensions remain unchanged. The new files are this report, its companion evidence JSON and 22 lossless WebP review sheets; no new snapshot destination was added. Existing application/test changes, email hints, approved manifest/runner, audit and remediation reports/evidence, all three `.shot*.mjs` files and the known-failure ledger retain their starting hashes. Branch refs and worktree registrations match their starting records. The original capture integrity inventory remains a historical artifact; this review's per-path before/after hashes describe the new approved baselines without rewriting that inventory. The isolated review server was stopped afterward; existing user servers were left alone.

**Batch 3 is not ready to begin:** the mobile leading capture-contract regression needs a scoped follow-up and passing verification first. VQA-07 also still needs its product decision. No Batch 3 work, application fix, commit, push, branch/worktree deletion or unrelated cleanup was performed. The full historical suite was not run, and the historical 76-failure baseline is not claimed green.

**This targeted review and snapshot refresh is not a full-product visual consistency sign-off.**
