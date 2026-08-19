# List/Record UX & Design-System Fix — Design Spec

## 1. Purpose

The List and Record views ported into `concepts/app-shell.html` have three confirmed problems:

1. A real navigation bug: selecting "Sales Invoice" from the sidebar's Starred/Recent launchpad tags leaves the pinned nav panel empty and no rail icon marked active.
2. The List and Record **content** (not the shell chrome around it) doesn't follow the Atlassian Design System the rest of the shell already follows — plain unstyled tables, native `<select>` elements, raw text/emoji glyphs standing in for icon buttons, and ad-hoc spacing.
3. Record Concepts B (Single Flow) and C (Split View) are weak UX beyond the visual issues — B's popover-triggered fields and remove buttons aren't well composed, and C's split-view layout has no clearly justified purpose.

This pass fixes the nav bug, restyles List/Record content to match the shell's real component system, reduces List to a single concept, and redesigns all three Record concepts (A, B, C) with real, defensible UX rationale — captured in a companion document for stakeholder discussion.

## 2. Confirmed root causes

Verified directly in `concepts/app-shell.html` and via a live Playwright walkthrough:

- **Nav bug**: `buildRailAndPanel()` (~line 7575) builds the real, working rail+panel (`.nc2-rail` / `.nc3-panel`) and exposes `root.activateByLabel(label)` (line 7682) as the correct way to select a rail icon and populate the panel from outside the rail — used correctly by the Apps grid tiles (line 7819) and the app-switcher menu (line 7855). But the launchpad's Starred/Recent tags (`quickRow`, line 7801) call `setNavCurrent(side, name)` instead — a leftover function (line 7425) that still does real work (content-view switching, breadcrumb/launchpad teardown) but whose highlighting logic targets `.nc1-item`/`.nc1-node`, a dead class pair from an earlier nav implementation that no longer exists in the DOM. Result: clicking "Sales Invoice" from Starred switches content correctly but never activates a rail icon or opens the panel — exactly the empty-panel screenshot.
- **Visual drift**: confirmed the shell's real component classes (`.lbtn`/`.lbtn.pri`/`.lbtn.out`, `.ibtn`, design tokens `--ink`/`--muted`/`--line`/`--accent`/`--shadow-1`/`--shadow-2`) are already used correctly in `.phead`/`.fnav` for both List and Record (e.g. `#list-add` at line 5638 is a proper `.lbtn.pri`). The drift is isolated to the **canvas content**:
  - `#list-canvas`'s grid/toolbar (List Concept A's table, "Search"/"Columns"/"Export" buttons, grouping bar) has its own separate, plain CSS never reconciled with `.lbtn`/`.ibtn`/shadow tokens.
  - `.rec-field input/select/textarea` (line 4421) is one flat, generic rule with no distinct select-chevron treatment, no focus ring matching the topbar search box's, and native browser `<select>` styling shows through.
  - Item/payment-method "remove" buttons render a literal `✕` text glyph in a bare `.ibtn` (lines 10565, 10594) instead of the sprite's icon system.
  - Concept B's Sales-Charges popover trigger and Other-Data/Sub-Ledgers/Additional-Data buttons use raw emoji (💳📋🏷, lines 5451-5453) instead of `<svg><use href="#i-*">` icons already defined in the shell's sprite.
- **Record B/C UX gaps**: Concept B hides four of five Main-Data-adjacent groups (Payment, Other Data, Sub Ledgers, Additional Data) behind small text-button popover triggers with no visual grouping or hierarchy, and its remove-row affordance is the same bare `✕`. Concept C's left rail (customer/status/net-amount summary) and right pane (full accordion) don't establish why splitting helps a specific persona over just scrolling one column — the design spec that introduced it named a "manager/reviewer" persona, but the built version has no reviewer-specific content (approval action, exception flags, comparison) that the single-column concepts lack.

## 3. Scope boundaries (per your answers)

- **List**: keep only Concept A (Data Grid). Remove the List Concept B/C code, the `#list-concept` selector, and their CSS.
- **Record**: keep all three concepts, but redesign each properly — real select/input styling, real icon-button remove actions, and for B and C specifically, a coherent interaction model with a stated reason to exist (not just "fewer tabs" or "a rail exists").
- **Nav bug**: fixed as part of this pass.
- **Visual/design-system fixes**: scoped to List/Record canvas content only. Shell chrome (topbar, sidebar rail/panel, breadcrumb, footer/pager component shells) is not touched — it already matches the Atlassian reference.

## 4. Nav bug fix

Change `quickRow`'s tag click handler (line 7801) from:
```js
tags.appendChild(launchpadTag(name, icon, cls, () => setNavCurrent(side, name)))
```
to route through the rail the same way the Apps grid and app-switcher already do — call `side.querySelector('.nc2').activateByLabel(name)` for any tag whose label matches a real nav group, falling back to the existing `setNavCurrent` content-switch behavior only for entries that aren't rail groups (there are none today — `NAV_FAVORITES`/`NAV_RECENTS` are all real labels — but the fallback keeps this resilient). Concretely: `activateByLabel` already performs `side.classList.remove('collapsed')`, `updateSideWidth`, and the highlight+panel-populate work; it does not itself switch `.content` between record/list. So the fix calls **both**: `activateByLabel(name)` for the rail/panel state, then the existing content-view switch (`showContentView(name === 'Sales Invoice' ? 'list' : 'record')`) that `setNavCurrent` used to own. `setNavCurrent` itself stays (it's still the correct path for in-page breadcrumb links like the record view's "Sales Invoice" crumb, which don't need rail re-activation since the rail is already showing Sales Invoice as current in that flow) — only the launchpad tag call site changes.

## 5. List: reduce to one concept, restyle to match the shell

- Delete `renderListB`, `renderListC`, `STATUS_META` (if only B/C-used), the `#list-concept` Prototype-controls selector, and List B/C's CSS blocks. `renderList(concept)` dispatcher collapses to calling `renderListA(canvas)` directly (or is removed if nothing else calls it with a variable concept).
- Restyle `#list-canvas`'s grid to use real shell primitives instead of its own parallel CSS:
  - Toolbar buttons ("Search", "Columns", "Export") become `.lbtn.out` (matching Undo/Print's existing secondary-button treatment) instead of custom classes.
  - The grid container adopts `var(--shadow-1)` + `var(--line)` border + `var(--surface)` background, matching the card/panel elevation already used in `.nc3-panel` and popovers elsewhere.
  - Column headers, row hover, and zebra/selection states pull from `--line`/`--accent-soft`/`--muted` tokens instead of hardcoded grays.
  - Row status (if shown inline) uses the shell's existing badge/pill component, not a new one.

## 6. Record: redesign all three concepts

**Shared fixes across A, B, C** (field/input layer):
- Rebuild `.rec-field select` with a custom chevron (reusing the sprite's `i-caret`, already confirmed present) positioned as a trailing icon, consistent height/padding with the topbar search box, and the same focus-ring treatment (`--accent` outline) used elsewhere in the shell — so a select reads as deliberately designed, not a bare native control.
- Replace every bare `✕`-glyph remove button (item rows, payment-method rows, Sales Charges rows) with a proper `.ibtn` using the sprite's `#i-x` icon and a hover danger state (`var(--danger)` background tint on hover), matching how other icon-only actions in the shell (e.g. Undo, favorite toggle) present state.
- Replace Concept B's emoji icons with `<svg><use href="#i-*">` from the existing sprite: `#i-post` for the Payment trigger (💳), `#i-doc` for Other Data (📋), `#i-clip` for Sub Ledgers (🏷), `#i-sliders` for Additional Data. All four symbols are already defined in the sprite (lines 4669, 4660, 4835, 4758) — no new icons need adding.

**Concept A (Guided Tabs)** — keep the interaction model, apply the shared field/select/remove-button fixes above. This remains the discoverability-first baseline.

**Concept B (Single Flow)** — redesigned popover composition: instead of four flat text-button triggers with no visual grouping, group them as a single labeled "More details" icon-button cluster or compact segmented row (using the shell's real `.segctl` component convention, `button[aria-pressed]`, rather than inventing new markup), each opening the same popover pattern but with clearer trigger affordance (icon + label, not text-only) and consistent popover header/close styling reusing `.rec-card-hd`. This keeps B's core value (items grid dominates, everything else is out of the way) while fixing the "not well designed" complaint about the triggers and removal controls themselves.

**Concept C (Split View)** — redesigned with an explicit reviewer-focused purpose instead of a layout split with no distinguishing content: the persistent left rail keeps customer/net-amount, and gains the two things a reviewer actually needs that a flat scroll doesn't surface — a compact **exception/flag indicator** (e.g. "Missing tax number", "Discount above threshold" — representative static examples, not live validation) and a single primary **reviewer action** (Approve/Return, stubbed like other out-of-scope actions) pinned in the rail. This gives the split a reason tied to the manager/reviewer persona from the original design spec, rather than being a layout choice without content to justify it.

## 7. Stakeholder discussion document

A new Markdown file explaining the rationale behind each surviving concept (List A; Record A/B/C) and the Simple/Advanced mode, written for a non-technical stakeholder audience: what problem each concept solves, which persona/workflow it optimizes for, and why the discarded List B/C aren't included. Lives at `docs/design-rationale/sales-invoice-concepts.md` (not under `docs/superpowers/`, since it's a stakeholder-facing deliverable, not an internal planning artifact).

## 8. Out of scope

Full shell-wide token/component audit (explicitly deferred per your answer — only List/Record canvas content is touched). Real backend/data, real calculation engine, drag-reorder/group, column sort/filter popovers — unchanged from the original design spec's scope decisions.
