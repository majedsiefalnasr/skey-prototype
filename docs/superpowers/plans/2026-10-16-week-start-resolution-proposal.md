# Week-start resolution — applied in `7dd0da5`

Status: **applied in `7dd0da5`**. The following records the original proposal.

Recommendation: retain the existing **Sunday-start calendar** and revise the
proposed Activities week capture from **October 12–18** to **October 11–17, 2026**.
No application behavior fix is warranted by the evidence. This document and its
companion proposed JSON patch do not alter the approved manifest or runner.

Inspected source: `a00e7999c6343f3437e2a8a9c89014cf742d4810`.
Application source remains identical to the frozen build at
`0528343633e358534885cd5f633d2aee465dd9e8`.

## Evidence for Sunday-start

| Evidence | Finding |
| --- | --- |
| `docs/superpowers/specs/2026-10-13-collaboration-suite-design.md:141` | Explicitly specifies Sunday-start, matching the current product calendar. The month view uses a six-by-seven grid. |
| `docs/superpowers/plans/2026-10-13-collaboration-suite.md:80` | Explicitly defines `startOfWeek()` as Sunday. Its planned regression at line 217 expects October 11 for October 13. |
| `concepts/app/core/collab-dates.js:33` | Comment explicitly says Sunday, matching the product. Implementation subtracts `date.getDay()`; `monthGridDays()` uses the same helper. |
| `concepts/app/components/collab/calendar.js:20` | Month headers run Sun through Sat. Week range, title, presets and rendered date columns all use the same `startOfWeek()` helper (lines 34, 44, 94 and 202). |
| `tests/collab-store.test.mjs:137` | Existing regression explicitly expects `startOfWeek('2026-10-13') === '2026-10-11'`. The month test expects its grid to begin Sunday, September 27. |
| `tests/collaboration.spec.mjs:320` | Existing browser regression expects Next week to say “Week of 18 Oct” and end October 24, 2026. These are Sunday–Saturday boundaries. This test was inspected, not rerun during this investigation. |
| Date-utility history | Original implementation in commit `19528c8` already had the Sunday policy. Commit `566756e` localized date strings without changing week arithmetic. |
| Previous exact-build DOM preflight | Rendered midnight slot dates were October 11–17; the approved October 12–18 assertion failed. This was product behavior consistent with the earlier requirements and tests. |

Activities defaults to Week and anchors its date to the tracked prototype clock,
October 13. Events defaults to Month and shares the same calendar component and
date utilities. No Monday-start product requirement or week-start preference
was found in the inspected source, original design, implementation plan or tests.
The conflicting Monday range appears in the new visual proposal and its runner.

## Locale expectations

The current product has one explicit week-boundary policy across English and
Arabic. Calendar date labels format with `en-GB` or `ar-EG`; the browser capture
locale is `en-US`. These formatting inputs do not select week boundaries:
`startOfWeek()` has no locale argument or locale-dependent branch. Arabic
weekday translations map Sun to الأحد and Mon to الاثنين, preserving the same
logical sequence. RTL affects presentation, not which dates belong to a week.

This is a finding about this product's documented policy. It does not infer a
regional week convention from a language, browser locale or timezone.

Current utility execution under `TZ=Africa/Cairo` confirmed both locales:

| Application locale | Week containing October 13 | Title | Next week |
| --- | --- | --- | --- |
| English | October 11–17 | `11 Oct – 17 Oct 2026` | October 18–24 |
| Arabic | October 11–17 | `١١ أكتوبر – ١٧ أكتوبر 2026` | October 18–24 |

The probe also checked every date October 11–17 resolves to the same week,
October 18 begins the next week, and the October month grid contains 42 dates
from September 27 through November 7, in both locales.

Focused existing test execution: `node --test tests/collab-store.test.mjs` —
**18 passed, zero failures**. No application or test files were changed.

## Exact proposed revision, not applied

1. In `2026-10-16-visual-capture-manifest.json`, change only
   `/captureStates/3/setup/2`: replace `2026-10-12 through 2026-10-18` with
   `2026-10-11 through 2026-10-17`. The sibling
   `2026-10-16-week-start-manifest-proposed.patch.json` records a guarded
   test/replace operation against the original string.
2. In `2026-10-16-visual-coverage-review.md`, change the Activities week table
   cell from `Week Oct 12–18` to `Week Oct 11–17` and record approval of this
   correction separately from the historical review evidence.
3. In `scripts/visual-coverage.mjs:184`, change the expected seven midnight-slot
   dates from October 12–18 to October 11–17 (`12+i` to `11+i`). Keep the exact
   seven-date equality assertion. Do not derive expected dates from the helper
   being checked, omit the date assertion, or accept multiple ranges.

This applies to the seven project instances of `activities-calendar-week.png`.
It changes no fixtures, scheduled times, locale/RTL requirements, panning,
visibility/clipping gates, screenshot names, destinations, viewport profiles,
invoice limitations, capture options, existing snapshots or application code.
Coverage remains **128 new images, zero reuse, zero existing-image updates**.

Both scheduled activities remain in the corrected week: act-1 on October 13 at
15:00 for 30 minutes, and act-3 on October 15 at 10:00 for 60 minutes. Their
desktop visibility and mobile act-1 panning requirements remain mandatory.
Recorded geometry is historical evidence; it still requires fresh revalidation.

## Approval and execution state

**No resolution change is approved or applied yet.** The current approved JSON,
review document and runner remain unchanged. No new build, complete DOM preflight
or screenshot capture was run during this investigation.

The last frozen-build preflight remains **4 passed, 1 failed, 123 unrun**; it is
not a complete passing preflight and cannot authorize capture. All destinations
remain absent. The earlier review missed the exact week boundary; this proposed
correction acknowledges that planning error without changing product behavior.

After approval of this proposal: apply the three limited changes above, record
the exact source revision, rebuild and freeze it, then rerun all 128 DOM entries
with every existing gate intact. Report the complete preflight outcome before
any capture call. Capture only if all 128 pass; otherwise stop and report the next
blocker. Keep preflight/build/manifest/runner identity checks and exclusive
destination writes. Do not update existing snapshots or the 76-failure baseline.

The accepted picker behavior, all existing PNGs, other branch refs/worktrees,
and the three untracked `.shot*.mjs` scripts are preserved. Nothing was pushed.
