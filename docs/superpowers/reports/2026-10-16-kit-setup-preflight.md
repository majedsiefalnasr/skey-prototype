# Hidden-kit setup verified; mobile invoice hit-test blocks capture

The approved runner-only change is applied in `scripts/visual-coverage.mjs`:
inspect `#kit-hide` visibility, click only when visible, then explicitly require
`#kit` to be hidden in every profile. It uses a normal Playwright click; no forced
interaction, CSS injection or visibility bypass was added. A source comparison
verified this is the only runner change since the accepted Sunday correction.
The manifest and every other setup/assertion gate remain unchanged.

## Exact source and frozen-build identity

- Source revision: `792082abc6254d311bb973f68ea0d43f728e6c72`.
- Manifest SHA-256: `84a6ca14241b2b8246420c031918ed4d45eca3895da7cf00a227d7d65aed09c5`.
- Runner SHA-256: `6dc50e45a42b10feeb4679c0119bc424ad480d7bd9fea7c904ca84b4e8fe5bbe`.
- Fresh frozen root: `/private/tmp/skey-kit-setup-visual/frozen`.
- Frozen inventory: `/private/tmp/skey-kit-setup-visual/frozen-build.json`,
  containing the revision and individual SHA-256 hashes for **272 files**.
- Frozen inventory SHA-256: `bc3eb6badb438a85f03bfdf6f054eaceb31c71db73d786be2994d30df2307cc1`.
- Browser: Chromium 153.0.8010.12, installed Playwright 1.63.0 revision 1243.

The evidence directory was newly created before this run. `npm run build`,
JavaScript syntax and diff checks passed. Build output was copied only after
committing the runner revision; every frozen file retained its recorded hash.
Application code, Playwright profiles and the 76-failure ledger are unchanged.
The accepted picker verification was not rerun for this runner-only change.

The isolated static server used port 4189 and was stopped after the failure.

## DOM preflight — all 128 destinations accounted for

| Project | Passed | Failed | Blocked / unrun |
| --- | ---: | ---: | ---: |
| desktop | 18 | 0 | 0 |
| mobile-touch | 16 | 1 | 2 |
| desktop-dark | 0 | 0 | 18 |
| desktop-high-contrast-light | 0 | 0 | 18 |
| desktop-high-contrast-dark | 0 | 0 | 18 |
| mobile-rtl | 0 | 0 | 19 |
| desktop-reduced-motion | 0 | 0 | 18 |
| **Total** | **34** | **1** | **93** |

Both previously blocked mobile Notes entries now pass. The explicit hidden-kit
assertion passed on every entry that reached setup, including the failed invoice
entry. Both completed Activities week entries retain the exact October 11–17
date equality assertion.

**New blocker: `mobile-touch/invoice-tax-totals.png`.** After applying the invoice
fixture and native positioning, the final whole-target visibility check on
`.rec-summary` returned `fits=true` but `hit=false`. The center hit-test did not
resolve to the target or one of its descendants. This fails the existing
unobscured-target gate, so the entry cannot proceed to capture.

Recorded layout-viewport geometry, CSS px:

```json
{
  "target": {"x": 84, "y": 577.40625, "width": 274, "height": 296.171875},
  "visualViewport": {"x": 0, "y": 125, "width": 390, "height": 1200},
  "canvas": {"x": 76, "y": 480, "width": 290, "height": 414.34375},
  "fits": true,
  "hit": false
}
```

The tested center was `(221, 725.4921875)`. Invoice fixture values and the earlier
individual summary-output/label checks completed before this final target
check. The failure record stores the hit-test boolean, not the identity of the
element hit, so it does not establish whether an overlapping element or viewport
coordinate handling caused the result. No application defect is inferred from
that boolean alone. Further diagnosis and any runner correction are not applied
in this run.

`mobile-touch/signin-email.png` was already in flight when the invoice entry
failed and completed successfully. No further entries started. The other two
mobile sign-in entries and all later projects are unrun, not passing. No retries,
assertion weakening, style changes or additional setup fixes were attempted.

Executed command:

```sh
PARITY_URL=http://127.0.0.1:4189 caffeinate -dims node scripts/visual-coverage.mjs --mode=preflight --build-root=/private/tmp/skey-kit-setup-visual/frozen --evidence=/private/tmp/skey-kit-setup-visual
```

Full evidence is in that clean directory: `preflight.json`, `preflight.log`,
`frozen-build.json`, `preserved-before.json` and `preserved-after.json`.
Durable per-entry results and audit:
[2026-10-16-kit-setup-preflight-results.json](2026-10-16-kit-setup-preflight-results.json).

## Capture and preservation

**Capture was never invoked. Zero new or updated images.** All 128 destinations
in `tests/visual-coverage.spec.mjs-snapshots/{projectName}/{name}` remain absent.
The incomplete preflight does not permit capture.

Hash checks confirm all 124 existing PNGs, the unchanged 76-failure baseline and
the three untracked `.shot*.mjs` scripts are preserved. Other branches and
worktrees are unchanged. The frozen build and manifest hashes are unchanged
since the run began. Nothing was pushed.
