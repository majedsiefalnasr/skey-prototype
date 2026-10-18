# Invoice summary hit-test investigation and applied setup correction

Status: **applied in `4cf58e6`**. The following records the original investigation.
The production runner, application, approved manifest and Sunday-start correction
remain unchanged. No images were created and no full preflight was rerun.

## Exact reproduction

The failure reproduced in five fresh diagnostic contexts against the existing
frozen build, with the original `.rec-summary` assertion retained:

- Frozen source: `792082abc6254d311bb973f68ea0d43f728e6c72`.
- Frozen root: `/private/tmp/skey-kit-setup-visual/frozen`, 272 files.
- Frozen inventory SHA-256:
  `bc3eb6badb438a85f03bfdf6f054eaceb31c71db73d786be2994d30df2307cc1`.
- Approved manifest SHA-256:
  `84a6ca14241b2b8246420c031918ed4d45eca3895da7cf00a227d7d65aed09c5`.
- Unchanged production runner SHA-256:
  `6dc50e45a42b10feeb4679c0119bc424ad480d7bd9fea7c904ca84b4e8fe5bbe`.
- Chromium 153.0.8010.12 / Playwright 1.63.0, installed revision 1243.

All frozen files were hash-verified. A scratch copy of the runner selected only
`mobile-touch/invoice-tax-totals.png`, adding diagnostics before the original
assertion. The original assertion failed in all five replays. Diagnostic control
experiments then examined native scrolling and pointer behavior within those
isolated pages; none was installed in the production runner or counted as a
passing preflight. No screenshot API was called.

Full scratch scripts/evidence: `/private/tmp/skey-invoice-hit-diagnostics/`.
Durable evidence, including actual hit classes, ancestor styles and scrolls:
[2026-10-16-invoice-hit-diagnostics.json](../reports/2026-10-16-invoice-hit-diagnostics.json).

## Actual element hit and stacking

The original center is layout-viewport `(221, 725.4921875)`.
`document.elementFromPoint()` returns:

```html
<div class="nc2-rail-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto py-2">
```

It has **no ID**. Its layout-viewport bounds are **x=4, y=279, width=255,
height=810**. It is a navigation scroll container, with scrollTop=0,
clientHeight=810 and scrollHeight=934; overflow-x is hidden and overflow-y auto.

Its parent `.nc2-rail` is an opaque, absolutely positioned navigation flyout at
**x=0, y=113, width=264, height=1087**, with **z-index=4** and pointer-events auto.
The rail has `:hover=true`, `:focus-within=false`. The sidebar itself remains
collapsed to its 52 px layout reservation. The expanded rail therefore overlays
the invoice content rather than moving it aside.

`concepts/app/styles/tailwind/shell.css:163` explicitly expands the rail to 264 px
on `:hover` or `:focus-within`. `concepts/app/shell/sidebar.js:275` supplies its
absolute positioning and z-index. The ancestor `.fbody` has isolation:isolate.
There is no transform or opacity trick in the hit/target ancestor chains.

The summary is `ASIDE.rec-summary`, position static, z-index auto, at
**x=84, y=577.40625, width=274, height=296.171875**. Its nested `.canvas` has
overflow auto, bounds **x=76, y=480, width=290, height=414.34375**, scrollLeft=0,
scrollTop=1311. The full summary fits that canvas and the visual viewport, but
its center is covered by the real expanded navigation flyout. Containment alone
cannot establish that a target is unobscured.

## Coordinate conversion verified independently

At failure:

- Window scrollX/scrollY are both 0, so document and layout-viewport coordinates
  coincide for this entry.
- Visual viewport offset is `(0,125)`, size 390 × 1200, scale 1; DPR is 1.
- Layout viewport dimensions reported by Chromium are 569 × 1751.
- DOM `getBoundingClientRect()` gives summary top 577.40625.
- Playwright `boundingBox()` and CDP `DOM.getBoxModel`/`getContentQuads` give
  summary top 452.40625: exactly 125 px less.

Thus the same physical center is DOM client/layout `(221,725.4921875)` and
Playwright mouse-input `(221,600.4921875)` in this measured configuration.

A separate control moved the pointer away from the rail and waited for its
natural collapse **without changing the 125 px visual offset**. It established:

| Operation | Actual target |
| --- | --- |
| DOM `elementFromPoint(221,725.4921875)` | `SELECT#invoice-discount-calculation` at the true summary center |
| DOM `elementFromPoint(221,600.4921875)` | `H3#invoice-summary-title`, a different point near the summary top |
| Playwright `mouse.move(221,600.4921875)` | Pointer event client `(221,725.4921875)`, target `SELECT#invoice-discount-calculation` |
| CDP `DOM.getNodeForLocation(221,600)` | `H3#invoice-summary-title`; this particular CDP method used layout coordinates in the observed run |

These measurements deliberately distinguish DOM, mouse-input and individual CDP
methods instead of assuming all browser APIs share a coordinate space. The
existing runner's DOM center hit-test uses the correct layout coordinates.
Subtracting the visual offset from its DOM query would inspect the wrong point.
At the original failure, both queried points were covered by the expanded rail.

## Root cause and isolated correction experiment

The setup assumes Playwright pointer `(0,0)` is a neutral, non-hovered location.
After native invoice setup leaves the visual viewport panned down 125 px, a
recorded `mouse.move(0,0)` generates DOM client `(0,125)`. That point lies inside
the navigation rail, whose top is 113. It activates the real hover flyout, which
covers the summary center. The measured cause is **a genuine overlap produced
by setup's pointer placement in a panned viewport**, not an incorrect center
coordinate or an invoice calculation/styling defect.

The diagnostic control sequence was:

1. Native `.rec-summary.scrollIntoViewIfNeeded()` alone: visual offset stayed 125;
   the rail stayed expanded and the center remained covered.
2. Native `.frame.scrollIntoViewIfNeeded()`: visual offset returned to 0; summary
   bounds and nested canvas scroll position remained unchanged. The hover state
   was still latched until a pointer event.
3. Normal Playwright `mouse.move(0,0)`: DOM client became `(0,0)`, hitting
   `HEADER.gtop`; the rail's hover state cleared.
4. Wait for the existing rail width transition to finish, then two frames: rail
   width became 52, both hover/focus-within were false, and the exact original
   DOM center hit `SELECT#invoice-discount-calculation`, a summary descendant.

The rail has a 120 ms natural width transition. Two frames alone left it about
181.75 px wide in one replay. A center-only success during that transition would
not prove that the left part of the crop is clear; the proposal therefore waits
for natural completion rather than assuming two frames settle it.

The final normalized summary retained bounds `(84,577.40625,274,296.171875)` and
canvas scroll `(0,1311)`. No field values, CSS, z-index, overflow, target locator,
crop or viewport size were changed by this diagnostic sequence.

A Playwright trial click also eventually succeeded, but its native scrolling
retries changed viewport/target positions. That success does not disprove the
original overlap and is **not** the proposed production correction.

## Smallest proposed production correction — pending approval

Change only `scripts/visual-coverage.mjs`, scoped to mobile
`invoice-tax-totals.png`, after its existing native crop/grid positioning and
before the existing summary-output visibility checks:

```js
if (id === 'invoice-tax-totals' && touch) {
  await page.locator('.frame').scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.locator('.nc2-rail').evaluate(rail =>
    Promise.all(rail.getAnimations().map(animation => animation.finished))
  );
  // Require zero visual offsets and a settled, unhovered/unfocused rail;
  // retain the existing two-frame settling and all original crop gates.
}
```

Add explicit postconditions that the visual offsets are zero, the rail is neither
hovered nor focus-within, and its settled width equals the collapsed sidebar
reservation. A mismatch must fail. Keep the existing whole-target center hit,
per-output/label hit checks, clipping/visibility, fixture values, locale/RTL,
viewport, exact dates, scroll stability and exclusive destination gates intact.
Do not change the DOM center calculation or accept the navigation overlay as a
valid hit. Do not use a trial click as a preparation step.

This proposal uses native scrolling and normal pointer movement to restore the
manifest's already-required origin/no-hover state. The approved manifest does
not need revision. The Arabic/mobile instance remains subject to full fresh
preflight; this isolated mobile-touch experiment does not certify it or all 128
entries.

No correction is applied yet. After approval, apply the runner-only change,
record the new source revision, rebuild/freeze, and rerun all 128 entries from a
new evidence directory. Report the complete preflight outcome before any capture.
Stop at any new failure; do not weaken gates.

## Preserved state

The official preflight remains **34 passed, 1 failed, 93 unrun**. Diagnostic
experiments do not replace that result. All 128 new destinations remain absent.
All 124 existing PNGs, the 76-failure baseline, other branches/worktrees and the
three untracked `.shot*.mjs` scripts passed preservation checks. The production
runner, manifest and exact frozen build remain hash-identical. The task-owned
server is stopped. Nothing was pushed.
