# Picker change verified; visual capture blocked by preflight

The approved picker-copy change is implemented. Capture stopped at the first
failed manifest assertion. **Zero images were created, reused or overwritten.**

## Picker scope and verification

Application changes are confined to:

- `concepts/app/pages/signin/signin.js`: eligibility row labels, conditional
  PIN introduction and non-admin password/PIN rejection copy.
- `concepts/app/pages/signin/templates.html`: eligibility notice and dynamic
  PIN introduction target.
- `concepts/app/core/locale.js`: Arabic translations; English uses the existing
  English-key translation convention.
- `tests/signin-pages.spec.mjs`: focused English/Arabic regressions and invalid
  saved-account fallback cases; updated non-admin password error expectation.

Directory, saved-record schema, selection and authentication guards are unchanged.
The regressions verify that a non-admin's correct saved PIN and the demo password
both reject with the eligibility message, preserving signed-out session state,
Shell names/emails, Profile storage and saved records. An eligible admin's wrong
PIN retains “Incorrect PIN.” Empty, malformed, non-array and invalid-only saved
records return to blank, focused email entry. Existing successful admin paths,
picker selection/removal and keyboard/focus checks also pass.

- Unit suite: **143 passed**, zero failures.
- `signin-pages.spec.mjs` + `signin-gate.spec.mjs`: **224 passed**, zero failures,
  all seven existing projects, two workers, zero retries, 6.3 minutes.
- Production build and JavaScript syntax/diff checks passed.
- No snapshot-update flags were used.

Picker source commit: `1376f7d`. The subsequent runner/manifest commit adds no
application changes.

## Exact frozen source and execution

Frozen source revision: **`0528343633e358534885cd5f633d2aee465dd9e8`**.

`npm run build` ran after that revision was committed. All 266 built files were
copied to `/private/tmp/skey-picker-visual/frozen`, hashed in
`/private/tmp/skey-picker-visual/frozen-build.json`, and served on isolated
`http://127.0.0.1:4189`. The frozen build remained unchanged. Its file hashes also
match the isolated build used for the 224 sign-in tests.

The approved JSON manifest is preserved exactly, including its historical
PROPOSED status and reviewed-source revision. User approval in this session
authorizes execution; the revision above identifies this actual execution.

Manifest SHA-256: `ea9e67e7cbf15a509fd6a1d82af8061606ac3bb56def1a8a56c1caa340af5215`.
Runner SHA-256: `a659b2fb4bc221ab90f21b1ce32f8f189bb35d583526c317abc1d694c12256d8`.

The new `scripts/visual-coverage.mjs` expands the exact manifest and implements
its setup, locale, fixture, content, clipping, visibility and scroll-stability
gates. Its DOM-only mode never calls screenshot APIs. Capture mode requires a
complete successful preflight matching the frozen build, manifest and runner;
it checks all destinations and uses exclusive file creation (`wx`). The seven
existing Playwright profiles/configuration are unchanged.

Executed command:

```sh
PARITY_URL=http://127.0.0.1:4189 caffeinate -dims node scripts/visual-coverage.mjs --mode=preflight --build-root=/private/tmp/skey-picker-visual/frozen --evidence=/private/tmp/skey-picker-visual
```

## Preflight outcome for all 128 entries

| Project | Passed | Failed | Blocked / unrun |
| --- | ---: | ---: | ---: |
| desktop | 4 | 1 | 13 |
| mobile-touch | 0 | 0 | 19 |
| desktop-dark | 0 | 0 | 18 |
| desktop-high-contrast-light | 0 | 0 | 18 |
| desktop-high-contrast-dark | 0 | 0 | 18 |
| mobile-rtl | 0 | 0 | 19 |
| desktop-reduced-motion | 0 | 0 | 18 |
| **Total** | **4** | **1** | **123** |

Passed: desktop Notes Kanban, archived Notes list, Activities Kanban and Events
month. Events was already in flight on the second worker when the failure
occurred; no further entries were started.

**Blocker: `desktop/activities-calendar-week.png`.** The manifest explicitly
requires October 12–18, 2026. Actual rendered calendar slot dates are October
11–17, 2026. `concepts/app/core/collab-dates.js:startOfWeek()` subtracts
`date.getDay()`, producing a Sunday-start week. Changing the selected date cannot
produce a Monday–Sunday range under that implementation.

The earlier review's feasibility preflight missed this exact week-boundary
assertion. This stricter execution exposed the mismatch. The approved date range
was not relaxed, and application calendar behavior was not changed. Capture mode
was never invoked. The remaining 123 entries have **not** passed revalidation;
their locale/fixture/visibility checks remain unrun against this build.

Per-entry results for every approved destination are recorded in
[2026-10-16-visual-preflight-results.json](2026-10-16-visual-preflight-results.json).
Full DOM evidence, build hashes and logs remain in
`/private/tmp/skey-picker-visual/` (`preflight.json`, `preflight.log`, `signin.log`,
`unit.log`, `preserved-before.json`, `preserved-after.json`).

## Capture and repository preservation

New images: **0 / 128**. Intended destination, currently absent:
`tests/visual-coverage.spec.mjs-snapshots/{projectName}/{name}`.
All 128 captures are blocked by the incomplete preflight. There were no capture
setup, viewport or assertion changes to bypass the blocker. The approved
390 × 1200 mobile invoice override, zero-tax/line-total limitations and three
sign-in states remain in the unchanged manifest for a future authorized run.

SHA-256 preservation checks confirm all **124 existing PNG files**, the
76-failure ledger and the three untracked `.shot*.mjs` scripts are unchanged.
Other branch refs and all other worktrees are unchanged. No branches were deleted
and nothing was pushed. The accepted 76-failure baseline was not rerun, edited or
treated as resolved by this focused change. Only the two isolated servers created
for this task were stopped.

Further capture requires a reviewed resolution of the calendar range mismatch
and a new complete 128-entry preflight; no automatic retry with weaker assertions
is authorized or attempted.
