# Corrected historical baseline evidence

Status: corrected artifact verified; separate historical full-suite measurement completed.

The 2026-10-16 record remains **1,193 passed / 76 failed / 516 skipped**.
Its exact 76-name list was not retained in the recovered session. Neither
that historical record nor the later T0.1 measurement is overwritten or
redefined. The new measurement is a separate experiment on the original
T0 application with corrected generated CSS, original tests and original PNGs.

## Cause and controlled correction

The T0 copy operation used `rsync --exclude .git`, which also removed nested
Git boundaries from an old `.claude/worktrees/app-shell-components` checkout.
Tailwind's scanner then included **381 files** from that tool worktree.
Scanner inventories contain no `node_modules` files. Earlier attribution to
dependency scanning was inaccurate. Adding Git metadata or physical rather
than symlinked dependencies alone did not change the contaminated output.

The preserved T0 source was copied to
`/private/tmp/skey-delivery/clean-history/source`. Its `.claude` metadata was
moved outside the build root to `clean-history/excluded-tool-metadata`.
No application source, build script, test, assertion, snapshot, tolerance or
mask was edited. The original T0 source, contaminated build and logs remain.

The standard build produces `clean-history/frozen`. Comparing every rebuilt
file with the original T0 frozen artifact finds **one changed file**:
`concepts/app/styles/tailwind.css`.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| Original T0 CSS | 288633 | `d8b9c0e1578891365c3482e54685f0197c3d7710a767b480bd03227462e6a8f8` |
| Corrected historical CSS | 276907 | `8f0c10c160b47217acd1d67bc8c3849c2308dd2d704ddc1fd047178a236ecc50` |
| Current final candidate CSS | 278373 | `bb30f503d1250d5968fd60c894e11065bb51f25c34e425ef21adc95790c1cd65` |

The current candidate CSS is byte-identical to a fresh actual-repository
build and passes the unchanged 284821-byte ceiling. It does not carry the
T0 excess CSS. Both localhost servers return bytes identical to their disk
artifacts. Seven-project Playwright configuration is unchanged between T0
and current source (SHA-256
`66de907a4963f0ae032839a1378c972ac9374e92f055ceb2d8805de1d3cb0654`).
Installed Chromium reports `153.0.8010.12`. The capture runner and manifest
retain only the previously approved label/hash amendments.

## Separate historical measurement

```sh
cd /private/tmp/skey-delivery/clean-history/source
caffeinate -dims env PARITY_URL=http://127.0.0.1:4262 \
  PLAYWRIGHT_JSON_OUTPUT_FILE=/private/tmp/skey-delivery/clean-history/results.json \
  npx playwright test --workers=2 --retries=0 --reporter=line,json \
  --output=/private/tmp/skey-delivery/clean-history/out
```

This runs all **1,974 original T0 cases**, against original snapshot files.
The original 73-name T0 JSON remains immutable. Final comparison will record
both differences from this corrected measurement and the preserved T0 names;
unavailable 76-name data will not be invented.

## Functional authority and PNG boundary

The exact formerly blocking decision is **P-05**: invoice/customer/geography
create, edit and delete survive in-app navigation in memory, resetting on
reload. The user explicitly answered **“Approve in-memory persistence”** in
this conversation. Those fixes are implemented; no unresolved decision
currently blocks them. P-04 (whether to retain the payment override control)
remains a separate pending proposal; the control was retained as instructed
by the recovered plan. It does not block CRUD and is not treated as approved.

The user supplied **89 exact PNG paths** on 2026-10-18. All are proposed
review entries with matching candidate/original hashes. The other **34**
proposed paths, 17 unexplained entries, 18 stale baselines and all other PNGs
remain protected. The guarded copier applied exactly these 89 paths. Before/after hashes,
exact approval text and the reviewed manifest hash are recorded in
`2026-10-18-delivery-png-approvals.json`. Post-copy inspection found zero
unapproved PNG changes and unchanged historical record hashes. No blanket snapshot update is permitted.

## Completed corrected measurement

**1,359 passed / 74 failed / 541 skipped**, 31.6 minutes, two workers, zero
retries. The 74 comprise 59 failed assertions and 15 timeouts. All original
73 failure names still fail; none are missing and none were closed by the
CSS correction. One additional failure is the previously documented
intermittent mobile-rtl GEO-03 status-toggle case. Exact names and errors:
[corrected historical suite](2026-10-18-corrected-historical-suite.json).
The 2026-10-16 record of 76 failures and the original T0.1 73-name record
remain separate and unchanged. This new measurement does not redefine them.
