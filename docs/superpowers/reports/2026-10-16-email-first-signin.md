# Email-first sign-in verification — 2026-10-16

Implemented the scope approved in Claude session
`3f2f9210-6dc4-4597-ba41-fc75b9446df2`, recovered from its local transcript
after Claude reached its session limit. Continued from identity commit
`bde5a59` on `feat/prototype-quality-pass`, based on `main` at `61f5200`.

Implementation, tests, design addendum and ledger update are committed as
`70d2d46` (`feat: use email-first demo sign-in with guarded focus`).

## Result

Email discovery resolves a workspace independently of authentication.
Only `admin@lastchance.local` can authenticate, by password or a supported
saved PIN. Other demo directory accounts can demonstrate routing without
gaining access. Unknown/unassigned emails offer prefilled Request access.
Branch selection appears only for workspaces with multiple branches.
Workspace-search and device-code routes, handlers and obsolete translations
were removed after checking their callers.

The password pane has one visible password field and a hidden readonly
username autocomplete field carrying the normalized email. Reset uses the
actual email. Legacy `{tenant, user}` saved accounts and the old single-record
key are discarded without migration; new records are email-keyed. Supported
picker, forget, save, password fallback and PIN paths remain.

Successful authentication explicitly refreshes Shell and Profile from the
admin identity. Profile identity is persisted so old saved identity fields
cannot return on reload; unrelated editable fields are preserved. Shared
Profile dialog forms bind once when identity changes cause a re-render.
Failed authentication leaves Shell/Profile identity unchanged.

Deferred pane focus is cancelled on superseding transitions/deactivation
and respects interaction in the newly opened pane, including interaction
followed by moving focus outside it. Email/password inputs retain LTR
behavior in Arabic/RTL layouts, with localized copy and mobile attributes.

## Changed files

| File | Purpose |
| --- | --- |
| `concepts/app/pages/signin/signin.js` | Directory, normalized email discovery, admin-only authentication, saved accounts, focus lifecycle, retired routes |
| `concepts/app/pages/signin/templates.html` | Email-first panes, password autocomplete identity, accessible error/discovery messages, obsolete pane removal |
| `concepts/app/core/locale.js` | English/Arabic sign-in copy; retired strings |
| `concepts/app/main.js` | Authenticated identity delivery before opening the session |
| `concepts/app/shell/topbar.js` | Identity refresh preserving the selected branch |
| `concepts/app/pages/profile/profile.js` | Authenticated identity, persistence, shared dialog binding |
| `tests/signin-pages.spec.mjs` | Discovery/auth separation, PIN/accounts, identity/reload, focus, keyboard, RTL/mobile regressions |
| `tests/signin-gate.spec.mjs` | Email-first sign-in helper; pending/default route behavior |
| `tests/signin.test.mjs` | Updated pane and DOM-hook contract |
| `tests/support/known-defects.md` | Verified feature-branch update to entry 19, retaining historical evidence |
| `docs/superpowers/specs/2026-10-05-signin-pages-design.md` | Dated email-first design addendum |

The existing identity-data commit `bde5a59` standardizes the admin email in
Profile/Shell fixtures and updates the user-menu assertions. Mail already
uses that address, so no unrelated Mail fixture edits were needed.

## Verification

| Check | Result |
| --- | --- |
| `npm run test:unit` | 143 passed, 0 failed |
| `npm run build` | Succeeded |
| Sign-in specs, all seven projects, final full run | 182 passed, 0 failed, 0 skipped |
| Four focus/keyboard cases × 20 repeats × seven projects | 560 passed, 0 failed |
| Identity and reload regression, separately on all seven projects | 7 passed, 0 failed |
| Negative control: two focus cases with guard disabled in a temporary copy | Both fail as expected, showing focus was stolen |
| Full regression, all seven projects | 1,193 passed / 76 failed / 516 skipped; 29.1 min |

Commands use `caffeinate -dims`, `--workers=2 --retries=0`, and `PARITY_URL`
pointing at `scripts/serve.mjs` serving a frozen build. No snapshot-update
flags were used. The final build has 263 application files; SHA-256 hashes
were unchanged at completion. macOS `.DS_Store` metadata is excluded from
the application-file manifest.

The 560 repeats used the first frozen revision. The subsequent Profile
persistence correction does not change the sign-in focus code. The final
frozen revision was then verified by the separate seven-project identity
run and the complete 1,785-test regression run, including all 182 sign-in
tests. An initial 182-test focused sign-in run also passed before that
Profile refinement.

One new reload assertion initially used the nonexistent `/profile` route
and received 404. It was corrected to `/system/profile`, verified on all
seven projects, and the full suite was restarted. Earlier exploratory and
interrupted runs are retained in the scratch evidence, excluded from the
final counts above. The recovered Claude session also recorded a transient
architecture unit assertion before `bde5a59`, followed by three passing
reruns; it has not reproduced in current unit verification, and its original
cause was not independently established here.

### Exact known-failure comparison

| Ledger entry | Expected | Actual |
| --- | ---: | ---: |
| 14: desktop invoice-record parity | 1 | 1 |
| 15: stale non-desktop parity baselines | 18 | 18 |
| 16: mobile Escape/outside-click test design | 2 | 2 |
| 17: failures inherited from main | 55 | 55 |
| **Total** | **76** | **76** |

Matched by exact test name and project against the recovered earlier logs.
No undocumented failures and no documented failures missing. All nine
existing parity surfaces ran on all seven projects. No network-suspension,
Build failed, or app-boot-stall errors were found. The full command exits
nonzero for those 76 known failures; this is not a healthy/green full suite.
The skips remain coverage limitations, notably collaboration tests that run
only on desktop.

Evidence is retained at `/private/tmp/skey-signin-resume/`: `unit-final.log`,
`build-final.log`, `signin-final.log`, `repeat-final.log`, `mutant.log`,
`identity-final.log`, `full-final.log`, `full-results/`,
`final-manifest.json`, `baseline-comparison.log`, and `verify-baseline.mjs` with its recovered baseline
logs. Temporary evidence is not committed.

## Repository and next step

Work stays on `feat/prototype-quality-pass`. No push, branch deletion, or
changes to other worktrees. The three pre-existing untracked `.shot*.mjs`
scripts are untouched. `main` remains at `61f5200`.

The proposed visual-coverage matrix is in
`../plans/2026-10-16-visual-coverage-review.md`: 126 proposed captures across
all seven projects, or 119 new captures if the existing Mail state is reused.
It includes collaboration screens and invoice lines, charges and totals
below the fold. It is a proposal for review; none of those snapshots has
been captured or updated.
