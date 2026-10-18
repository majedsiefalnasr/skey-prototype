# Invoice selection coherence — 2026-10-17

**Selected invoice identity and status are now coherent.** All eight selectable invoice rows load their own document number, sequence and current lifecycle status. Repeated switching and returning after a status action preserve that correspondence. Other fields remain the shared representative fixture.

## Confirmed inconsistency and bounded fix

`openInvoiceRecord()` previously changed only `docNo`. The status stayed at the previous record’s value, while the General fields stayed at invoice 143 and dialog/history identifiers often stayed at invoice 126. The detail model also lacked the list’s saved Draft status. On the unchanged frozen starting build, focused regressions reproduced sequence 143 while selecting invoice 142, and Posted while selecting Draft invoice 144.

Selection now reads the existing live `DATA_LIST_CONFIG.invoice.rows` entry and copies only `no`, `seq` and `status`. It retains the existing navigation/mode path, ignores missing keys, and keeps locked rows in viewing mode when entered through the list’s Modify command. That command can no longer silently turn Posted/Canceled into Open. The existing detail status actions update the same selected live row, so returning to the list and reopening it shows the updated status. Entering Create mode clears the association with the previously selected row.

Saved Draft has its own status metadata, prototype-control value, lock explanation and existing Draft→Open/Canceled transitions, consistent with the list’s transition model. It remains distinct from an unsaved new invoice. Number/sequence fields are read-only, update from the selection, and clear in Create mode. Dialog titles/summaries, journal document identifiers, history header and default print subject use the current identity. No financial values are mapped or calculated.

A translated disclosure states that identity/status follow the selected invoice while other fields/history use shared demo data. Existing monetary values, line behavior and financial formatting remain unchanged.

Verification also exposed a mobile Modify navigation blocker: the source list could detach before its native close-toggle event reached the document, leaving its parked popup over the destination and blocking Back. The menu handler now restores/closes the popup synchronously before invoking the same action callback. This changes lifecycle ordering only; menu layout and commands are unchanged. The new regression asserts no parked popup remains and uses normal Back navigation. Existing customer-menu and repeated-list-navigation regressions pass on every profile.

## Files changed

- `concepts/app/pages/list-actions.js`: live-row identity/status mapping and locked-row Modify handling.
- `concepts/app/pages/invoices/invoices.js`: sequence/selected-row state and saved-Draft explanation.
- `concepts/app/prototype/fixtures/invoices.js`: one saved-Draft status metadata entry; list fixture rows are byte-for-byte unchanged.
- `concepts/app/prototype/controls.html`: Draft option for the existing status control.
- `concepts/app/pages/invoices/operations.js`: selected-row status synchronization, identity rendering and dynamic action/dialog references.
- `concepts/app/pages/invoices/templates.html`: read-only identity fields and shared-data disclosure.
- `concepts/app/pages/invoices/record-dialogs.html`: number/sequence bindings in existing dialog markup.
- `concepts/app/pages/invoices/activity-dialog.html`: current sequence in the history header.
- `concepts/app/pages/invoices/print.js`: default print subject follows record selection while retaining custom subject edits when reopening the same record.
- `concepts/app/core/locale.js`: one Arabic disclosure translation; all earlier entries, including the email hint, are unchanged.
- `concepts/app/components/data-list/menu-controller.js`: restore the source popup before its action navigates away.
- New `tests/invoice-selection.spec.mjs`: four focused regressions per profile; all eight rows, repeated switching, status change/reopening, saved-Draft editing, dialog/print/history context, and locked Modify/Back navigation.

## Verification

Final browser runs use only `/private/tmp/skey-invoice-selection/frozen-final`, served on 4211 after final unit/build work. The 415-file complete frozen inventory hashes to `82156805fd8661afec4c7979fa954764a8144d827a0c8ac353f515bd4edb7197` (SHA-256 of sorted compact JSON path/hash records). HEAD remains `f29d61c7e15fd19b7603a25dd6c0995535122778`; work is uncommitted. Workspace `dist` was not rebuilt or served for these checks.

```sh
npm run test:unit
npm run build --prefix /private/tmp/skey-invoice-selection/source-final
node scripts/serve.mjs --root /private/tmp/skey-invoice-selection/frozen-final --port 4211
PARITY_URL=http://127.0.0.1:4211 npx playwright test tests/invoice-selection.spec.mjs tests/visual-qa-batch1.spec.mjs --workers=2 --retries=0 --output=/private/tmp/skey-invoice-selection/verified-tests
PARITY_URL=http://127.0.0.1:4211 npx playwright test tests/invoice-geography.spec.mjs --grep 'invoice' --workers=2 --retries=0 --output=/private/tmp/skey-invoice-selection/existing-invoice
PARITY_URL=http://127.0.0.1:4211 npx playwright test tests/data-list-component.spec.mjs --grep 'customer row menu activates|opening a record and returning' --workers=2 --retries=0 --output=/private/tmp/skey-invoice-selection/menu-regression
# Confirm the unrelated geography failure on the unchanged starting build:
PARITY_URL=http://127.0.0.1:4209 npx playwright test tests/invoice-geography.spec.mjs --project=mobile-rtl --grep 'geography record status toggle' --workers=1 --retries=0 --output=/private/tmp/skey-invoice-selection/starting-geo
git -c core.fsmonitor=false diff --check
```

| Final verification | Passed | Failed |
| --- | ---: | ---: |
| New selection regressions, seven profiles | 28 | 0 |
| Existing Batch 1 regressions, seven profiles | 28 | 0 |
| Existing invoice/geography file | 104 | 1 |
| Existing customer-menu and invoice-navigation regressions | 14 | 0 |
| Full unit suite | 143 | 0 |

The invoice/geography command matched the filename as well as titles, so it ran all 105 cases: all **56 invoice-specific cases passed**, plus 48 additional cases. Its one failure is the unchanged mobile-RTL geography status test: it expects English `Inactive`, while the UI correctly renders Arabic `غير نشط`, before any status action. The exact same failure reproduces on the unchanged starting build. It was not fixed, hidden, skipped or accepted as a new expected result. Final browser aggregate: **174 passed, 1 existing unrelated failure, zero skips**. All final runs used two workers and zero retries. Final build, syntax checks of changed JavaScript/new test, and `git diff --check` passed.

An intermediate implementation run had 55 passes and one mobile Modify/Back failure; that reproduction drove the popup-lifecycle correction above. The final 56-case run passes on all seven profiles, with actual Arabic enabled in mobile-RTL. No existing regression assertion was changed or weakened.

## Preservation and remaining limits

Starting inventory contained 702 existing repository files. Only the eleven listed application/template/translation files changed; the other 691 retain their starting hashes. Existing tests are unchanged. All 285 existing PNGs—including 252 protected product images and 33 investigation assets—remain byte-identical. Mail recovery, Batch 1–3, the seven approved sign-in replacements, prior reports/evidence, approved manifest/runner, 76-failure ledger/baseline, three `.shot*.mjs` scripts, branch refs and worktree registrations are preserved. The complete frozen inventory was reverified after testing. Task-owned static servers were stopped. No snapshot refresh, visual-difference investigation, commit, push or cleanup occurred.

Only document number, sequence and lifecycle status are row-specific. Customer, dates, payment details/status, amounts, line items and history remain shared demo data, explicitly disclosed in the record. Fixed subtotal 200, zero tax and zero line-money outputs remain accepted limitations. Status actions use live in-memory demo rows; no backend, new persistence layer, real create/delete data layer or record-pager redesign was introduced. VQA-07 financial-token formatting remains deferred.

The historical full suite was not run and its 76-failure baseline was not redefined. This completion establishes coherent selected-invoice identity/status and the focused journeys above, not full-product sign-off.
