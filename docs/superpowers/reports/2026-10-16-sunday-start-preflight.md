# Approved Sunday correction applied; capture blocked by mobile setup

The exact approved three-file correction is applied: the manifest's Activities
week setup now specifies October 11–17, 2026; the review table matches and records
approval; the runner still requires exact equality with all seven dates, now
October 11 through October 17. Every other runner gate remains unchanged.
Application behavior, authentication, fixture data and the known-failure ledger
are unchanged.

## Frozen revision and hashes

- Source revision: `7dd0da515f5014fb9a365554041613eecb6fe66c`.
- Manifest SHA-256: `84a6ca14241b2b8246420c031918ed4d45eca3895da7cf00a227d7d65aed09c5`.
- Runner SHA-256: `1972960c4b9ddb7b0522af66ec5dd35679b86524b2b021feb5ae197d434578a6`.
- Browser: Chromium 153.0.8010.12, installed Playwright 1.63.0 revision 1243.
- Fresh production build: passed; 270 copied files, individually hashed in
  `/private/tmp/skey-week-start-visual/frozen-build.json`.
- Frozen root: `/private/tmp/skey-week-start-visual/frozen`.
- Isolated server: `http://127.0.0.1:4189`, stopped after the failed preflight.

The only tracked source changes before building were the three approved files.
`git diff 0528343633e358534885cd5f633d2aee465dd9e8 HEAD -- concepts
tests/support/known-defects.md playwright.config.mjs` was empty at the frozen
revision. JavaScript syntax and diff checks passed. The accepted 143-unit and
224-sign-in results were not rerun for this documentation/runner expectation
change; no application behavior changed.

## Preflight result — all 128 entries accounted for

| Project | Passed | Failed | Blocked / unrun |
| --- | ---: | ---: | ---: |
| desktop | 18 | 0 | 0 |
| mobile-touch | 0 | 2 | 17 |
| desktop-dark | 0 | 0 | 18 |
| desktop-high-contrast-light | 0 | 0 | 18 |
| desktop-high-contrast-dark | 0 | 0 | 18 |
| mobile-rtl | 0 | 0 | 19 |
| desktop-reduced-motion | 0 | 0 | 18 |
| **Total** | **18** | **2** | **108** |

All 18 desktop states passed, including the corrected Activities week's exact
date equality, scheduled items, visibility and scroll checks. This does not
establish that any unrun entry's setup, locale, fixture or clipping gates pass.

Failed entries:

- `mobile-touch/notes-kanban.png`
- `mobile-touch/notes-list-archived.png`

Both fail during common setup at `scripts/visual-coverage.mjs:145`:
`await page.locator('#kit-hide').click()` times out after 7000 ms because the
element is not visible. The two entries were in flight concurrently; the runner
started no more entries after detecting failure.

The runner incorrectly assumes the hide control is visible on every fresh page.
Source inspection confirms `concepts/app/prototype/controls.js:249` intentionally
starts the kit hidden at widths up to 720 px. Its hidden control cannot be clicked
through Playwright's normal visibility checks. This is a runner setup blocker;
no failure of Notes content assertions was reached on these entries.

No setup change, forced click, CSS change or assertion weakening was applied.
A narrowly scoped next-step proposal is to click the hide control only when it
is visible, then explicitly assert the kit is hidden in every profile. This is
**not applied**; the current request requires stopping on a new blocker.

Executed command (two workers, zero retries):

```sh
PARITY_URL=http://127.0.0.1:4189 caffeinate -dims node scripts/visual-coverage.mjs --mode=preflight --build-root=/private/tmp/skey-week-start-visual/frozen --evidence=/private/tmp/skey-week-start-visual
```

Full execution evidence: `/private/tmp/skey-week-start-visual/preflight.json` and
`preflight.log`. Durable per-entry results and preservation audit:
[2026-10-16-sunday-start-preflight-results.json](2026-10-16-sunday-start-preflight-results.json).

## Capture and preservation

**Capture was never invoked. Zero images were created or updated.** All 128
destinations in `tests/visual-coverage.spec.mjs-snapshots/{projectName}/{name}`
remain absent. The failed/incomplete preflight cannot authorize capture.

Hash checks confirm all 124 existing PNGs, the 76-failure ledger and the three
untracked `.shot*.mjs` scripts are unchanged. Frozen build files also retain their
recorded hashes. Other branch refs and worktrees are unchanged. Nothing was
pushed. The historical week-start proposal files remain separate and unmodified.
