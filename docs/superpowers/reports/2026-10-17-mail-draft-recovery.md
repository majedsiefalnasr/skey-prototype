# Mail draft recovery — product delivery, 2026-10-17

Completed a bounded reliability fix for the accepted Internal Mail journey: the latest compose/reply edits now survive normal reloads and full-document navigation before the 600ms autosave fires. This protects a user’s work without changing the reading layout, send policy, authentication or fixtures.

The accepted collaboration spec §6.4 promises draft persistence. Existing regression coverage waited for “Draft saved” before navigating. Current Mail flushed pending edits on in-app transitions but had no document-exit listener. With timer delivery deliberately paused after opening the composer, all six new reload/navigation/reply cases on the unchanged build failed on desktop and actual Arabic RTL: latest body, subject and recipient input were missing after navigation. An initial test-harness draft count was corrected to account for the existing seeded draft before this six-case reproduction.

Changes:

- `concepts/app/pages/email/email.js`: four added lines register the existing `flushDraft()` on `pagehide`, using the controller’s existing abort signal. Removing exactly those four lines reproduces the starting file byte-for-byte, preserving Batch 1 edits. No new save format or timer is introduced.
- `tests/mail-draft-exit.spec.mjs`: four focused cases across seven profiles. Tests use actual reload/navigation, reopen the draft through folder/list controls, and exercise the existing send/discard controls.

Acceptance criteria, all verified:

- Latest raw To/Cc input, subject and multiline English/Arabic body survive reload or document navigation while autosave remains pending.
- Quick replies on desktop and full replies on mobile retain the same draft ID and body without duplication.
- A recovered compose draft sends once with both recipients; reloading does not recreate it. A discarded recovered draft stays deleted. Seeded drafts remain unchanged.
- An untouched composer creates no draft on reload. Actual Arabic RTL is enabled and verified in that profile.

Verification used an isolated static build on port 4208 after unit/build work completed; browser checks never used mutable workspace `dist`. Build: 414 frozen files, inventory SHA-256 `0ea7c4defaa0c5afc42c73babdadf7ac0e4b99fed1f5bacc51d2fda41be5c46d`.

```sh
# Frozen unchanged source, before the application edit: six expected failures.
PARITY_URL=http://127.0.0.1:4207 npx playwright test tests/mail-draft-exit.spec.mjs --project=desktop --project=mobile-rtl --workers=2 --retries=0 --output=/private/tmp/skey-mail-draft-exit/red-confirmed
npm run test:unit
npm run build --prefix /private/tmp/skey-mail-draft-exit/source
node scripts/serve.mjs --root /private/tmp/skey-mail-draft-exit/frozen --port 4208
PARITY_URL=http://127.0.0.1:4208 npx playwright test tests/mail-draft-exit.spec.mjs tests/visual-qa-batch1.spec.mjs --grep 'latest|leaving an untouched|VQA-01' --workers=2 --retries=0 --output=/private/tmp/skey-mail-draft-exit/final-tests
PARITY_URL=http://127.0.0.1:4208 npx playwright test tests/collaboration.spec.mjs --project=desktop --grep 'internal mail' --workers=2 --retries=0 --output=/private/tmp/skey-mail-draft-exit/mail-existing
PARITY_URL=http://127.0.0.1:4208 npx playwright test tests/help-screens-consistency.spec.mjs --grep 'mail failure keeps the draft' --workers=2 --retries=0 --output=/private/tmp/skey-mail-draft-exit/send-retry
node --check concepts/app/pages/email/email.js
node --check tests/mail-draft-exit.spec.mjs
git -c core.fsmonitor=false diff --check
```

Results: **143 unit tests passed**; build, syntax and diff checks passed. Browser results: **42 passed** (28 new recovery cases + 14 existing Mail reading/reply checks), **19 existing Internal Mail tests passed**, **7 send-failure/retry checks passed**. Total: **68 passed, zero failures or skips**, two workers and zero retries. The first restricted unit attempt failed to bind localhost (`EPERM`); rerunning with localhost permission passed all 143 tests. Historical full-suite verification was not run; the 76-failure baseline remains unchanged.

Preservation: of 700 pre-existing files, only the authorized Mail module changed; all other 699 retain their starting hashes. All 252 protected PNGs, 33 prior diagnostic PNGs, seven accepted sign-in snapshots, existing tests, earlier reports/evidence, manifest, runner, baseline/ledger and `.shot*.mjs` scripts are unchanged. Branch refs/worktree registrations and the frozen build inventory were verified unchanged. Task-owned static servers were stopped. No snapshot refresh, pixel investigation, financial-token change, commit, push or cleanup occurred.

Persistence remains session-scoped prototype storage; this fix covers normal document exits, not durable server-backed storage. Prior visual findings remain documented and closed to further investigation absent a meaningful reproducible regression. VQA-07 remains deferred.

Next product decision: whether the invoice demo should load row-specific status/data or retain the shared representative fixture. The current `openInvoiceRecord()` changes only `docNo`, consistent with its explicit minimal-lookup comment, while the existing ledger records the resulting status mismatch. That fixture-scope decision merits resolution before expanding invoice behavior; it was not implemented in this change. No full-product sign-off is claimed.
