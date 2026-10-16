# Mobile invoice setup corrected; preflight stopped at People locale assertion

The approved implementation change is limited to `scripts/visual-coverage.mjs`.
For mobile `invoice-tax-totals.png` only, it natively scrolls `.frame` into view,
moves the pointer normally to `(0,0)`, waits for existing rail animations to
finish, retains the original settling steps, and asserts:

- Visual viewport offsets are exactly zero.
- The rail is neither hovered nor focused within.
- Its settled width equals the collapsed sidebar reservation.

All original summary-output/label checks, whole-target hit tests, DOM center
calculations, clipping/visibility, fixtures, locale/RTL, viewport, date,
scroll-stability and destination-safety gates remain unchanged. No trial clicks,
forced interactions, CSS injection or visibility bypasses were added. Application
styles, invoice behavior, authentication and the approved manifest are unchanged.

## Source, hashes and frozen inventory

- Source revision: `4cf58e6bc6e634cc09d75ecad6bb38b1f0a41ef5`.
- Manifest SHA-256: `84a6ca14241b2b8246420c031918ed4d45eca3895da7cf00a227d7d65aed09c5`.
- Runner SHA-256: `a5c7e29fb0b64004188e1398c9ead2f093790ad3f3a7f8e8efd5bd8a917e3114`.
- Frozen root: `/private/tmp/skey-invoice-neutral-visual/frozen`.
- Frozen inventory: `/private/tmp/skey-invoice-neutral-visual/frozen-build.json`.
- Frozen inventory SHA-256: `463ce763e7a6df6bf22df46b4ffd0ac9e50d5425d996a903ab96f94fa03883d4`.
- Frozen inventory contains **276 files**. Full tree equality, individual file
  hashes and absence of symlinks were verified before preflight and after it.
- Browser: Chromium 153.0.8010.12, Playwright 1.63.0, installed revision 1243.

The evidence directory was newly created for this run. The source revision was
committed before `npm run build`; build, JavaScript syntax and diff checks passed.
The unchanged build allowlist includes documentation, including existing local
review artifacts; the frozen inventory records every copied file. Application
source is unchanged from the previously accepted build. Accepted unit/sign-in
verification was not rerun for this runner-only change.

## Complete accounting of the 128 planned entries

| Project | Passed | Failed | Blocked / unrun |
| --- | ---: | ---: | ---: |
| desktop | 18 | 0 | 0 |
| mobile-touch | 19 | 0 | 0 |
| desktop-dark | 18 | 0 | 0 |
| desktop-high-contrast-light | 18 | 0 | 0 |
| desktop-high-contrast-dark | 18 | 0 | 0 |
| mobile-rtl | 10 | 1 | 8 |
| desktop-reduced-motion | 0 | 0 | 18 |
| **Total** | **101** | **1** | **26** |

The mobile-touch summary passed its new postconditions and every original gate.
All 19 mobile-touch entries passed. The mobile-rtl summary remains unrun, so this
execution does not certify the correction on that profile.

**New blocker: `mobile-rtl/people-list.png`.** The existing runner assertion at
line 218 expects `Converted to العميل` in per-3's row. The actual row retained
`ContactConverted to Customer`. The assertion timed out after 5000 ms.

Exact received row text, with whitespace normalized for readability:

```text
Khaled Ibrahimخالد إبراهيم
Nile Foods
+20 3 555 0142
—
ContactConverted to Customer
```

The failing locator is:

```js
page.locator('.people-view tr').filter({
  has: page.locator('[data-row-open="per-3"]')
})
```

This records a mismatch between the runner's Arabic expectation and the rendered
label. No conclusion is made here about whether the expectation or application
rendering should change. Neither was changed, and no weaker alternate string
was accepted. The approved Sunday-start dates and all locale gates are retained.

The second worker was already processing `mobile-rtl/note-editor-related.png`
when failure was detected; it finished successfully. No further entries were
started. The remaining 26 are unrun, not passing. No automatic retry, diagnostic
replay or capture followed this blocker.

Executed command, with two workers and zero retries:

```sh
PARITY_URL=http://127.0.0.1:4189 caffeinate -dims node scripts/visual-coverage.mjs --mode=preflight --build-root=/private/tmp/skey-invoice-neutral-visual/frozen --evidence=/private/tmp/skey-invoice-neutral-visual
```

Full evidence remains in that clean directory: `preflight.json`, `preflight.log`,
`frozen-build.json`, `preserved-before.json` and `preserved-after.json`.
All 128 per-entry statuses, the exact error, project totals and preservation
audit are recorded in
[2026-10-16-invoice-neutral-preflight-results.json](2026-10-16-invoice-neutral-preflight-results.json).

## Capture and preservation

**Capture was not invoked. Zero images were created or updated.** All 128 new
destinations remain absent under
`tests/visual-coverage.spec.mjs-snapshots/{projectName}/{name}`.

All 124 existing PNGs, the 76-failure ledger and three untracked `.shot*.mjs`
scripts retain their hashes. Other branch refs and worktrees are unchanged.
Application code, Playwright configuration and the manifest are unchanged.
Nothing was pushed. The isolated task-owned server was stopped.
