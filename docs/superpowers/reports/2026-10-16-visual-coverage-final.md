# Approved visual coverage completed

**128/128 DOM preflight entries passed, then 128/128 new images were captured
against the exact same frozen build.** Zero existing snapshots were reused,
overwritten or updated. No snapshot-update flags were used. Nothing was pushed.

## Actual causes and corrections

1. **People's generated conversion label was stale after a language change.**
   On the old frozen build, `html` was `lang=ar, dir=rtl`, `uiLocale` was Arabic,
   and the established `Customer` resource returned `العميل`. Seeded per-3 was
   still lifecycle `contact`, converted to `customer`; no saved collaboration
   state existed. The row nevertheless retained `Converted to Customer` until a
   normal Cards → List repaint produced `Converted to العميل`. People was
   missing the locale-refresh dispatch/hook used by the other collaboration
   pages. Added that hook and dispatch; retained the runner's exact per-locale
   expectation. No alternate labels were accepted or translations invented.
2. **The mobile invoice record footer genuinely overflowed horizontally.**
   Its pager/status/related actions shared a non-wrapping flex row, while the
   related-action group requested full width. In RTL, controls extended about
   169 px outside the frame, inflating the layout viewport and leaving
   `scrollX=-168`, visual offset X=168 even after native frame/window scrolling.
   Added one `max-[720px]:flex-wrap` utility to the invoice record footer.
   Controls now wrap visibly within their container, restoring document width.
   No overflow was clipped or masked, and invoice calculations were untouched.

Application files changed during this continuation:

- `concepts/app/main.js`: include People in the current-page locale refresh.
- `concepts/app/pages/people/people.js`: refresh generated toolbar/body labels
  using the existing state, preserving view, query and filters.
- `concepts/app/pages/invoices/templates.html`: mobile invoice footer wrapping.

Focused regressions added in `tests/help-screens-consistency.spec.mjs` and
`tests/invoice-geography.spec.mjs`. Each defect was reproduced on the old build;
the final tests check both locales across all seven projects. The footer test
checks rendered controls, excluding the intentionally hidden creation-mode pager.

**Final validation: 14 focused browser checks passed; 143 unit tests passed.**
Production build, syntax and diff checks also passed. Earlier accepted sign-in
verification remains historical; it was not presented as a new run here.

## Gates and iteration history

All existing gates remain intact: exact seven Sunday-start dates (October
11–17), actual Arabic/RTL state and content, fixtures, summary outputs/labels,
hit tests, clipping, visibility, scroll stability, viewport sizes, hidden kit
and exclusive destinations. The DOM center calculation and manifest are unchanged.
The runner SHA-256 is unchanged from the accepted invoice-normalization revision.
No forced clicks, CSS injection, arbitrary waits, masks or alternate accepted
outcomes were added to bypass a failure.

The previously approved Sunday correction, conditional kit hide plus hidden
assertion, and mobile summary's native frame normalization/pointer/rail settling
remain in effect. Their original causes and evidence are recorded in the linked
earlier reports/proposals in this directory and `../plans/`.

The first fresh run after the People fix used source
`8e34767e7d79ad9cb16d314a015f9ffe9c81cbb9`: 107 passed, one RTL invoice viewport
postcondition failed, 20 unrun. That evidence led to the footer correction.
No capture followed that incomplete run. After the correction, a new revision,
build and evidence directory were created; **all 128 entries ran again**.
No earlier results were carried forward as passing for the final build.

## Exact final identity

| Artifact | Identity |
| --- | --- |
| Frozen source revision | `76f427645ba981d753729448bcf6bfdb7be68b38` |
| Manifest SHA-256 | `84a6ca14241b2b8246420c031918ed4d45eca3895da7cf00a227d7d65aed09c5` |
| Runner SHA-256 | `a5c7e29fb0b64004188e1398c9ead2f093790ad3f3a7f8e8efd5bd8a917e3114` |
| Frozen inventory SHA-256 | `2ebd66bff3f0df7b32d03dc9c14b9807f9810e41183f102ae04720dbd3d3150f` |
| Passing preflight evidence SHA-256 | `30e535d7765e3d8490cb2357cc7d274437310f61406efdbf312659ef4f10b523` |

Source was committed before the final `npm run build`. The output was frozen at
`/private/tmp/skey-visual-finish/round-2/frozen` and served on isolated port 4193.
The inventory contains **278 files**; full tree equality, hashes and absence of
symlinks were verified before preflight, before capture and after capture.
The unchanged build allowlist also copies local review documentation; every
copied file is represented in the frozen inventory.

Browser: Chromium 153.0.8010.12, installed revision 1243 / Playwright 1.63.0.
Both runs used the seven existing profiles, two workers and zero retries.
The fixed browser date, Cairo timezone, locales, DPR, reduced motion and all
manifest setup remained pinned. No rebuild or source change occurred between
the passing preflight and capture. The complete project results and identities
were reported before capture was invoked.

## Full final preflight and capture results

| Project | Preflight passed | Failed | Unrun | New captures |
| --- | ---: | ---: | ---: | ---: |
| desktop | 18 | 0 | 0 | 18 |
| mobile-touch | 19 | 0 | 0 | 19 |
| desktop-dark | 18 | 0 | 0 | 18 |
| desktop-high-contrast-light | 18 | 0 | 0 | 18 |
| desktop-high-contrast-dark | 18 | 0 | 0 | 18 |
| mobile-rtl | 19 | 0 | 0 | 19 |
| desktop-reduced-motion | 18 | 0 | 0 | 18 |
| **Total** | **128** | **0** | **0** | **128** |

All files are under
`tests/visual-coverage.spec.mjs-snapshots/{projectName}/{name}`. This is the
approved namespace and exact manifest destination set: 18 states per profile,
plus the trailing invoice-lines state for each mobile profile.

Before capture, all 128 destinations were absent. The runner required a complete
passing preflight matching source, frozen inventory, manifest and runner; each
PNG write used exclusive creation (`wx`). The capture run repeated every entry's
setup and original assertions before writing its image.

Final integrity checks verified:

- Exactly 128 PNGs, no missing or additional files in the new namespace.
- All 128 PNG signatures, byte counts, dimensions and SHA-256 hashes match the
  recorded capture metadata.
- Viewport images match the manifest's profile dimensions; element images match
  their outward-rounded native crop dimensions.
- Every capture maps to one passing preflight destination with identical
  measured geometry, clip, locale, direction and exact frozen source revision.
- Seven representative images were visually inspected: LTR/RTL invoice totals,
  mobile trailing invoice lines, note editor/related rows, Arabic unknown-email
  sign-in, Arabic draft compose and dark Mail reading.

The image-inventory aggregate SHA-256 is
`3d8264fdb47756db6eeba37e8f6e9dffe1bc72e5bb9701fd6c479f4c77c91280`.
It hashes the ordered image records, including dimensions, byte counts,
per-image hashes, preflight mapping and source revision.

## Evidence

- [Complete image inventory and preservation audit](2026-10-16-visual-coverage-final-integrity.json)
- [Exact frozen file inventory](2026-10-16-visual-coverage-frozen-build.json)
- [Complete passing DOM preflight](2026-10-16-visual-coverage-preflight.json)
- [Complete capture results](2026-10-16-visual-coverage-capture.json)

Original logs, focused test results, before/after locale evidence, RTL overflow
diagnostics and both iteration directories remain in
`/private/tmp/skey-visual-finish/`. All task-owned static servers were stopped.

## Preservation, limitations and deviations

All **124 existing PNGs** retain their original hashes. The **76-failure
known-defect ledger**, other branch refs/worktrees and all three untracked
`.shot*.mjs` scripts are unchanged. No existing snapshot was reused, updated or
replaced. The historical proposal files remain separate and untouched. Nothing
was pushed and no branches were deleted. The full known-failure suite was not
rerun or edited; these focused checks do not claim those failures are resolved.

No scope or capture-policy deviations remain. Mobile invoice viewports remain
390 × 1200; all other mobile captures remain 390 × 844; desktops remain
1440 × 900. Both trailing-edge invoice captures, all three sign-in states and
the approved panned mobile calendar segments are retained.

The approved prototype limitations remain visible: fixed subtotal 200, zero tax,
and zero line-money outputs despite entered prices. These images do not prove
nonzero-tax or real calculated-line behavior. Arabic captures genuinely enable
Arabic/RTL and assert Arabic content; existing English fixture text and labels
without translations remain visible. No new translations or calculated values
were fabricated to improve the images.
