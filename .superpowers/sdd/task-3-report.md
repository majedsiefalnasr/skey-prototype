# Task 3 report — shell and launchpad utilities

## Completed checkpoint

- Added literal Tailwind utilities to the shell frame, body, sidebar, content, topbar, search trigger, launchpad structure, quick-access tags, and app tiles.
- Added a dedicated Tailwind components layer for the generated search caret and its named animation, with compatibility-manifest rows.
- Added a zero-tolerance search-panel screenshot assertion and recorded desktop, touch, and RTL baselines.
- Raised the phase budget from the initial 6518-byte baseline to a bounded 12000-byte maximum. The measured output is 11059 bytes; the original baseline remains documented in the test.

## Verification

- RED: the new search-panel screenshot initially had no baseline snapshots.
- GREEN: `npm run test:unit` (46 passing), `npm run build`, and `npx playwright test tests/parity.spec.mjs --project=desktop --project=mobile-touch --project=mobile-rtl` (27 passing).

## Remaining scope risk

The Task 3 brief also calls for retiring `shell*.css`, `home.css`, and `app*.css`. Those files contain the remaining non-relational selectors for dynamic sidebar, dialogs, and launchpad elements. They are intentionally still linked at this checkpoint so the visual baseline remains exact. Their conversion and link/file retirement remain required before Task 3 can receive a full-spec approval.

## Review-fix evidence

- Replaced the assembly test's global `replaceAll()` normalization with an exact, one-occurrence mapping for each of the six stable Task 3 class attributes in the checkpoint markup. The mapping fails on an unrelated duplicate, so it cannot conceal an additional or changed class attribute elsewhere in the assembled document.
- The requested retirement of every `shell*.css` and `app*.css` file is blocked by the plan's later ownership checkpoints. `shell-6.css` owns the shared `.toast` reduced-motion relationship (Task 4), `shell-7.css` owns the invoice advanced-search overlay (Task 5), `app-2.css` includes `.geo-back-list` (Task 6), and `shell.css` contains page-root relationships for email, customer, and geography views (Tasks 5–6). Removing them in Task 3 would remove ordinary presentation for unconverted later owners; moving them wholesale into `tailwind/shell.css` would violate the compatibility boundary.
- `npm run test:unit` passes all 47 tests, including the two exact assembly checks and the loopback-server cases.

## Commit

`refactor: migrate shell and launchpad to Tailwind utilities`

## CSS-retirement correction

- Retired `concepts/app/pages/home/home.css` and `concepts/app/shell/shell.css` and removed both entry-point links.
- Moved launchpad, topbar, app-button, frame, and generated sidebar ordinary presentation to literal utilities. `tailwind/shell.css` now retains only documented named animations, state relationships, and the sidebar-handle pseudo-element.
- Updated the checkpoint tests to compare only the remaining legacy-owner blocks, while preserving byte-exact validation for every block that has not yet reached its owning migration task.
- Verification: `npm run build`; focused unit assertions (4 passing); zero-tolerance Playwright parity for desktop, mobile-touch, and mobile-rtl (27 passing). The unprivileged full unit command has only its three loopback-server cases blocked by `listen EPERM`; all non-server checks pass.

## Asset-resolution test correction

- Replaced the stale hand-written served-asset list with the local stylesheet and script URLs parsed from the built `app-shell.html`. This keeps 200 coverage aligned with the shell’s live entry points and excludes external CDN assets without restoring retired CSS URLs.
- Verification: `npm run test:unit` (47 passing, including loopback server and traversal checks).

## Review-fix round 2

### Critical: `--lp-tone` restored

- `concepts/app/pages/home/home.js`'s `launchpadTile()` template now uses `var(--lp-tone, var(--accent))` in both the icon background (`color-mix(...)`) and icon color, restoring the original fallback that had been dropped when the bare `var(--lp-tone)` was introduced.
- Added the eleven tone-to-color mappings as a `[data-tone='...']` attribute-selector compatibility rule in `concepts/app/styles/tailwind/shell.css` (a selector-relationship case: the tone value depends on an attribute, not a single element's own class, so it cannot become one literal utility class per tile without per-tone JS classing).
- Hex values recovered from git history, not invented: `git show a0067cc^:concepts/app/pages/home/home.css` (the commit immediately before `refactor: retire Task 3 shell CSS` deleted the file), lines 508–539:
  - `overview #2563eb`, `sales #0f8a68`, `purchase #b66a09`, `inventory #147d92`, `finance #6754c7`, `crm #b3437c`, `manufacturing #7a5a30`, `health #b03a48`, `reports #4361a8`, `administration #5c6470`, `help #397a59`.
- Added a matching row to `concepts/app/styles/tailwind/compatibility.md` and fixed the stale, self-contradicting "No compatibility selectors are retained at this checkpoint" sentence (Important finding #2), replacing it with a sentence consistent with the rows that follow it.
- Baseline impact: **no baselines needed re-recording.** All `launchpad*` and `list*` screenshots (desktop, mobile-touch, mobile-rtl) still pass at `maxDiffPixels: 0` against the existing recorded baselines after the fix — the recorded PNGs already show the correct, colored tile rendering (visually confirmed: Dashboard blue, Customers pink, Vendors orange, Inventory teal, Sales/POS green, Finance/Fixed Assets purple, Manufacturing brown, Customer Service red). The frozen baselines were not masking a regression; the regression existed only in the source between the baseline recording and this fix, so nothing needed to change.

### Important: shell-2/3/4.css converted and retired

- `concepts/app/shell/shell-2.css` (topbar app-switcher: `.app-switcher-list`, `.app-switcher-filter`, `.app-switcher-row`) — converted. The switcher's only renderer, `setupAppSwitcher()` in `concepts/app/pages/home/home.js`, now applies literal utilities to the list container, filter input, and each row's icon/label, while keeping `.app-switcher-list`/`.app-switcher-menu`/`.app-switcher-row` as bare classes (they are JS selectors used in `shell.js`, `menus.js`, `topbar.js`). The `.active` row state (a cross-element selector relationship: `.app-switcher-row.active .sq`, `...span:last-child`) moved to `tailwind/shell.css` with a manifest row.
- `concepts/app/shell/shell-3.css` (topbar user menu: `.avatar-btn`, `.user-card`) — converted. `concepts/app/shell/shell.html`'s user-menu button and popover now carry literal utilities (`rounded-full`, flex/gap/padding, avatar sizing, name/email typography); `.avatar-btn`/`.user-card`/`.avatar` stay as bare classes (`.user-card b` is read by `getLaunchpadUserName()` in `home.js`).
- `concepts/app/shell/shell-4.css` (search panel: `.spanel`, `.slist`, `.sitem`, `.sscrim`, plus `.sinp`/`.sctx`/`.sscope`/`.sfoot`/`.sgrp`/`.sempty`/`.ic`/`.tx`/`.t`/`.s`/`.why`/`.kbd`/`.c`) — converted. Static markup in `shell.html` and the dynamic template strings in `concepts/app/shell/search.js` (`renderSearch()`, the `.sscrim` element creation) now carry literal utilities. State/selector-relationship rules that can't become single-element utilities moved to `tailwind/shell.css` with manifest rows: `.spanel.open`, `.sscrim.open`, `.spanel.screens-only .sctx/.sfoot-scope/.sfoot-ctx` (launchpad's screens-only search hides record context), and `.sitem:hover/.sel` (including its `.ic` child) hover/selection state.
- Verified before conversion that none of these three files' classes leak into files outside shell/home ownership: `grep` across `concepts/` showed `app-switcher-*`, `avatar-btn`, `user-card`, `spanel`/`slist`/`sitem`/`sscrim` used only in `shell.html`, `search.js`, `home.js`, and (`.sitem` only as a JS state check, not a styling dependency) `invoices/operations.js`. `.k`'s only other consumer (`data-list/dialogs.html`) is styled by a distinct `#adv-search-scrim .as-foot .k` rule in `shell-7.css` (Task 5-owned, untouched), so removing `.sfoot .k` here does not affect it.
- Removed the `shell-2.css`, `shell-3.css`, `shell-4.css` files and their `<link>` entries in `concepts/app-shell.html`.
- **`app-2.css`'s `.ibtn`/`.lbtn`/`.tip` icon-button atoms were left in place, not converted**, and this is a deliberate scope call, not an oversight: these three classes are used roughly 120 times across dialogs and pages owned by Task 4 (`assistant`, `data-list`, `record-pager`, `toast`, `dialog`), Task 5 (`invoices`, `customers`), and Task 6 (`geography`, `email`) — including inside shell's own dialog fragments (`appearance-dialog.html`, `sidebar-dialog.html`, `keyboard-dialog.html`, `shared-overlays.html`), none of which are in Task 3's file list. `shell.html` itself still uses `.ibtn`/`.tip` unconverted for its own topbar icon buttons, so even converting only `shell.html`'s usages would not let the CSS rule be dropped — every other consumer still needs it. Documented this in a comment at the top of `app-2.css` and left the `<link>` in place, following the same cross-task-ownership precedent already used for `shell-5/6/7.css`. `.crumbs`/`.canvas` (the rest of `app-2.css`, Task 5/6 owned via `.geo-back-list` and the customers/geography/invoices `.canvas` mount points) were already correctly left alone.
- Fixed the stale "No compatibility selectors are retained at this checkpoint" line in `compatibility.md` (see Critical section above) and added the new manifest rows for `.app-switcher-row.active`, `.spanel.open`/`.sscrim.open`/`.spanel.screens-only ...`, `.sitem:hover/.sel`, and `.lp-tile[data-tone]`.

### Test updates

- `tests/styles.test.mjs`: added `shell-2.css`/`shell-3.css`/`shell-4.css` to the `migrated` exclusion set (files no longer required to match the checkpoint byte-for-byte, same mechanism already used for `shell.css`/`home.css`).
- `tests/build.test.mjs`: extended `applyTask3ShellUtilities()` with one-occurrence mappings for every new class-attribute conversion in `shell.html` (search panel, scope buttons, user-card/avatar), and added the three retired files to the reassembly test's link-exclusion filter. Verified every new "before" string occurs exactly once in the ddd8569 checkpoint before adding it (`.kbd-chip" style="margin: 0"` needed surrounding context because it also appears, unrelated, in the Task 5/6-owned advanced-search dialog).
- `tests/tailwind.test.mjs`: raised the Task 3 output budget from 22000 to 26000 bytes (measured output after this round's conversions; lower bound of 6518 unchanged) to accommodate the newly-added literal utilities for the app switcher, user menu, and search panel.

### Verification

- `npm run build`: succeeds, produces `dist/`.
- `npm run test:unit`: 47/47 passing (all tests, no server/EPERM issues this run).
- `npx playwright test tests/parity.spec.mjs --project=desktop --project=mobile-touch --project=mobile-rtl`: 27/27 passing at `maxDiffPixels: 0`, including `launchpad`, `launchpad search panel`, and `list` on all three projects. No baselines were re-recorded (see Critical section above for why).
- `rg -n 'shell(-[2-7])?\.css|home\.css|app(-[2-4])?\.css' concepts/app-shell.html` now returns only: `app.css`, `app-2.css`, `app-3.css`, `app-4.css` (untouched by this review's findings — not flagged, still have real unmigrated content), and `shell-5.css`/`shell-6.css`/`shell-7.css` (Task 4/5-owned, per the prior round's report). `shell.css`, `home.css`, `shell-2.css`, `shell-3.css`, `shell-4.css` are fully retired.

## Review-fix round 3

Two prior rounds each found selectors dropped from the same deleted `shell-4.css` because the fix checked JS-selector-name continuity but not full CSS declaration-block coverage. This round re-derives the complete selector list of `shell-2.css`, `shell-3.css`, and `shell-4.css` from git history and confirms, selector by selector, where each one now lives.

### Full selector inventory: shell-2.css, shell-3.css, shell-4.css

Recovered via `git show a0067cc^:concepts/app/shell/shell-N.css` (content unchanged between that commit and their actual deletion in `e8a7f4d`, which is the commit that removed all three).

**shell-2.css** (topbar app switcher) — all selectors converted in round 2, verified intact:

| Selector | Now lives at |
| --- | --- |
| `.app-switcher-list` | `home.js` `setupAppSwitcher()`: `listEl.classList.add('flex','w-[300px]','flex-col','p-0','[max-height:70vh]')` |
| `.app-switcher-filter` (+ `:focus-within`) | `home.js` `filterWrap.className` literal utilities incl. `focus-within:border-[...]`/`focus-within:shadow-[...]` |
| `.app-switcher-filter svg` | `home.js`: `<svg class="shrink-0">` |
| `.app-switcher-filter input` (+ `::placeholder`) | `home.js`: input class list incl. `placeholder:text-faint` |
| `.app-switcher-rows` | `home.js`: `rows.className = 'app-switcher-rows overflow-auto px-1 pb-1'` |
| `.app-switcher-row span:last-child` | `home.js`: `<span class="min-w-0 flex-1 truncate">` |
| `.app-switcher-row .sq` | `home.js`: `<span class="sq relative flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--hover-overlay)] text-muted">` |
| `.app-switcher-row.active`, `.active .sq`, `.active span:last-child` | Compatibility rule, `tailwind/shell.css` (ancestor-toggled state) — **now has its own `compatibility.md` row** (was missing one; added this round) |

**shell-3.css** (topbar user menu) — all selectors converted in round 2, verified intact:

| Selector | Now lives at |
| --- | --- |
| `.avatar-btn` | `shell.html`: `class="avatar-btn rounded-full"` |
| `.user-card` | `shell.html`: `class="user-card mb-0.5 flex items-center gap-2.5 px-2.5 pb-3 pt-2.5"` |
| `.user-card .avatar` | `shell.html`: `class="avatar size-9 text-[13px]"` |
| `.user-card b` | `shell.html`: `<b class="block text-[13.5px] text-ink">` |
| `.user-card span` | `shell.html`: `<span class="block text-xs text-muted">` |

**shell-4.css** (search panel) — three selectors were dropped; fixed this round (marked FIXED):

| Selector | Now lives at |
| --- | --- |
| `.sscrim` | `search.js`: `sscrim.className = 'sscrim fixed inset-0 z-[150] hidden bg-transparent'` |
| `.sscrim.open` | Compatibility rule, `tailwind/shell.css` (JS-toggled state class) |
| `.spanel` | `shell.html`: full utility class list on `.spanel` |
| `.spanel.open` | Compatibility rule, `tailwind/shell.css` |
| `.sinp` | `shell.html` |
| `.sinp input` | `shell.html`: `class="flex-1 border-none text-sm font-[inherit] outline-none"` |
| `.sctx` | `shell.html` |
| **`.sctx b`** | **FIXED**: `shell.html` — `<b class="text-ink">Sales Invoice</b>` |
| `.sscope` | `shell.html`: `class="sscope ms-auto inline-flex gap-1"` |
| `.sscope button` | `shell.html`: literal utilities on each scope button |
| `.sscope button[aria-pressed='true']` | `shell.html`: `aria-pressed:*` variants |
| `.spanel.screens-only .sctx/.sfoot-scope/.sfoot-ctx` | Compatibility rule, `tailwind/shell.css` |
| `.slist` | `shell.html`: `class="slist flex-1 overflow-auto p-1.5"` |
| `.sgrp` | `search.js` `renderSearch()` |
| `.sgrp .c` | `search.js`: `<span class="c rounded-full bg-[var(--line-2)] px-[7px] text-xs">` |
| `.sitem` | `search.js`: `<button class="sitem flex w-full items-center gap-[11px] rounded-lg px-3 py-2 text-start disabled:opacity-60">` (`disabled:opacity-60` added this round — see below) |
| `.sitem .ic` | `search.js` |
| `.sitem:hover/.sel` (+ `.ic` variants) | Compatibility rule, `tailwind/shell.css` |
| `.sitem .tx` | `search.js` |
| `.sitem .t` | `search.js` |
| **`.sitem .t mark`** | **FIXED**: `search.js` `hi()` — `<mark class="rounded-[2px] bg-[var(--mark-bg)] px-px text-inherit">` |
| `.sitem .s` | `search.js` |
| `.sitem .why` | `search.js` |
| **`.sitem:disabled`** | **FIXED** (found by this round's full audit, not named in the brief): `search.js` — added `disabled:opacity-60` to the `.sitem` button; previously the "Unavailable right now" group rendered at full opacity instead of the original 60% dim |
| `.sitem .kbd` | `search.js`: `class="kbd rounded border border-line bg-[var(--line-2)] px-1.5 py-px font-mono text-[11px] text-muted"` |
| `.sempty` | `search.js` |
| `.sempty b` | `search.js` |
| `.sfoot` | `shell.html` |
| **`.sfoot .k`** | **FIXED**: `shell.html` — all three `<span class="k">` chips now carry `rounded border border-line bg-surface px-1.5 py-px font-mono text-[11px] me-[5px]` (mirrors the already-correct `.sitem .kbd` conversion pattern in `search.js`, adjusted for `.sfoot .k`'s different background/margin) |

### What was fixed

1. **`.sctx b`** (`shell.html`): added `text-ink` to `<b>Sales Invoice</b>` inside `.sctx-current`.
2. **`.sfoot .k`** (`shell.html`): added `rounded border border-line bg-surface px-1.5 py-px font-mono text-[11px] me-[5px]` to all three keyboard-hint `<span class="k">` chips (↑↓, ↵, Tab).
3. **`.sitem .t mark`** (`search.js`, `hi()` function): the highlighted-match `<mark>` now carries `rounded-[2px] bg-[var(--mark-bg)] px-px text-inherit`. No `@source inline()` entry was needed — `tailwind.css` already has `@source "../**/*.js"`, so the literal class in the template string is picked up automatically, consistent with every other JS-generated class in `search.js`.
4. **`.sitem:disabled`** (`search.js`) — a fourth gap the full shell-4.css audit surfaced, not one of the three named findings: added `disabled:opacity-60` to the `.sitem` button so the "Unavailable right now" action group dims as originally designed.
5. **Missing `compatibility.md` rows**: `.app-switcher-row.active` (+descendants), `.spanel.open`/`.sscrim.open`/`.spanel.screens-only ...`, and `.sitem:hover/.sel` (+`.ic` variants) existed in `tailwind/shell.css` since round 2 but had no manifest row — added four rows covering all of them.

`.kbd-chip` (the topbar's `⌘K`/`Esc` chips, referenced by the brief as a styling reference) was independently found to ALSO be unstyled in the current source — it was dropped from the original `shell.css` (not shell-2/3/4.css) back in the `a0067cc` commit and never restored. This is a real, separate defect, but it is out of this round's named scope (shell-2/3/4.css only) and is called out here rather than silently fixed, per the instruction to report the full audit's findings.

### Baselines touched

`tests/parity.spec.mjs-snapshots/{desktop,mobile-touch,mobile-rtl}/launchpad-search.png` — re-recorded with a scoped `--update-snapshots -g "launchpad search panel"`. This is the only screenshot test that opens the search panel; it opens from `.lp-search` (screens-only mode), which hides `.sctx` entirely, so only the `.sfoot` keyboard-hint chip fix is visible in this baseline (the `.sctx b` and `.sitem .t mark` fixes have no existing screenshot coverage — adding new coverage was out of this round's scope). Visually confirmed all three new PNGs show the "↑↓ Navigate" / "↵ Open" hints as properly bordered, backgrounded chips instead of plain unstyled text. Additionally verified `.sctx b` (bold "Sales Invoice" in ink color, standing out from the muted context line) and `.sitem .t mark` (highlighted match in `--mark-bg` with rounded corners) render correctly via ad hoc Playwright element screenshots outside the frozen-baseline mechanism, since no existing baseline exercises those two elements.

### Environment note on whole-suite parity runs

This worktree's assigned dev-server port (4173, hardcoded in `scripts/dev.mjs`) was already occupied by a *different* worktree's (`app-shell-components`) long-running `npm run dev` process, so an initial `npx playwright test` run without `PARITY_URL` silently tested that other worktree's content instead of this one's — a false pass, caught by inspecting `.sfoot`'s live `innerHTML` and finding the pre-fix markup. Re-running against this worktree's own build (a `serve`+`build` pair mirroring `dev.mjs`, started on port 4180) surfaced a separate, pre-existing issue: every surface (including ones untouched by this fix, e.g. `list`, `geo-list`, `email`) shows a uniform ~4-5% pixel diff against its frozen baseline, confirmed by reproducing the identical diff ratio on unmodified `e8a7f4d` content. This is font-rendering/anti-aliasing nondeterminism in the current sandbox, not a regression from this round's changes — the "diff" images show whole-page text ghosting, not structural differences (confirmed via DOM/accessibility-tree inspection showing all expected elements present and correctly labeled). This pre-existing fragility is out of this round's scope to fix.

### Verification

- `npm run build`: succeeds, produces `dist/`.
- `npm run test:unit`: 47/47 passing.
- `npx playwright test tests/parity.spec.mjs --project=desktop --project=mobile-touch --project=mobile-rtl -g "launchpad search panel"`: 3/3 passing at `maxDiffPixels: 0` against the re-recorded baselines, run against this worktree's own server (not the other worktree's stale 4173 process). The full 27-test suite was not re-baselined beyond the search panel, since the other 24 surfaces' diffs are the pre-existing environment issue described above, not caused by this round's changes.

## Review-fix round 4

### Critical: `.kbd-chip` restored (dropped by this task's own `a0067cc`, previously misreported)

Round 3 mischaracterized `.kbd-chip` as dropped by the original (pre-Task-3) `shell.css`/`home.css` and out of scope. That was wrong: `git show 42cc047:concepts/app/shell/shell.css` (Task 3's own base commit) shows `.kbd-chip` fully styled at that point, and `git show a0067cc^:concepts/app/pages/home/home.css` shows `.lp-search .kbd-chip` fully styled immediately before `a0067cc` ("refactor: retire Task 3 shell CSS", itself inside this task's diff) deleted both files outright with no replacement. This round fixes it as an in-scope regression, not an out-of-scope pre-existing defect.

Recovered rules:
- `concepts/app/shell/shell.css` @ `42cc047`: `.kbd-chip { font: 11px ui-monospace, monospace; background: var(--line-2); border: 1px solid var(--line); border-radius: 4px; padding: 1px 6px; color: var(--muted); margin-inline-start: auto; }`
- `concepts/app/pages/home/home.css` @ `a0067cc^`: `.lp-search .kbd-chip { flex: none; font-size: 12px; padding: 3px 8px; border-radius: 6px; }`

**Fix — literal utility classes on all three usages** (static markup per plan preference; `home.js:348` is a literal template string, not JS-generated from data):

1. `concepts/app/shell/shell.html:30` (topbar "⌘K", had `margin-inline-start: auto`):
   `<span class="ms-auto rounded border border-line bg-[var(--line-2)] px-1.5 py-px font-mono text-[11px] text-muted">⌘K</span>`
2. `concepts/app/shell/shell.html:40` (topbar search-panel "Esc"; original markup already carried an inline `m-0` override canceling the auto-margin for this usage, so `ms-auto` is intentionally omitted here):
   `<span class="rounded border border-line bg-[var(--line-2)] px-1.5 py-px font-mono text-[11px] text-muted">Esc</span>`
3. `concepts/app/pages/home/home.js:348` (launchpad "⌘K", the `.lp-search`-scoped size/radius override plus `flex: none` since it sits in `.lp-search`'s flex row):
   `<span class="lp-keyboard-hint shrink-0 rounded-md border border-line bg-[var(--line-2)] px-2 py-[3px] font-mono text-xs text-muted">⌘K</span>`

No theme color exists for `--line-2` in `tailwind.css`'s `@theme inline` block (only `--color-muted`/`--color-line`/etc. are mapped), so `bg-[var(--line-2)]` arbitrary-value syntax was used, matching the established convention already in `shell.html` (`.sctx`, `.sfoot`) and `search.js` (`.ic`, `.kbd`, `.sgrp .c`) — in particular `search.js`'s existing `.kbd` rule (`rounded border border-line bg-[var(--line-2)] px-1.5 py-px font-mono text-[11px] text-muted`) is structurally identical to the recovered `.kbd-chip` rule, so the same utility string was reused for consistency. `padding: 3px 8px` → `py-[3px] px-2` (8px = Tailwind's `2` spacing step), `border-radius: 6px` → `rounded-md`, `font-size: 12px` → `text-xs` (both are Tailwind's standard token values, not arbitrary).

**`lp-keyboard-hint` orphan class — resolved by keeping it, not dropping it.** It is not an abandoned partial-conversion marker: `concepts/app/styles/overrides-2.css` (a separate, still-linked, non-Task-3-owned file) has a live rule `@media (max-width: 620px) { .lp-keyboard-hint { display: none; } }` that hides the launchpad's ⌘K hint on narrow/mobile viewports where keyboard shortcuts don't apply. Dropping the class would silently break that responsive behavior. Verified this class has no other purpose and no dependency inside Task 3's own files (`grep -rn lp-keyboard-hint concepts/`), and confirmed the effect visually: the re-recorded `mobile-rtl` launchpad baseline (390px viewport) correctly shows no ⌘K chip in the search bar, because the 620px breakpoint rule is still hiding it via the intact class.

### Verification (this round)

1. `npm run build`: succeeds.
2. `npm run test:unit`: **47/47 passing**, pristine (no EPERM/server issues this run). Updated `tests/build.test.mjs`'s `applyTask3ShellUtilities()` checkpoint mapping: added the missing `⌘K` (`class="kbd-chip">⌘K</span>` → new utility markup, verified single occurrence in the `ddd8569` checkpoint baseline) and updated the existing `Esc` mapping's "after" string to match the new markup (the "before" string was already correctly disambiguated by surrounding context from the unrelated Task-5-owned `#adv-search-scrim` `.kbd-chip" style="margin: 0"` occurrence — left untouched, out of scope).
3. **Port-4173 situation** (checked before running anything): `lsof -i :4173` showed PID 96310 (`node scripts/dev.mjs`) bound to 4173, with cwd `/Users/majedsiefalnasr/Documents/Work/Ultimate-Solutions-EGY/skey/skey-figma/.claude/worktrees/app-shell-components` — a **different worktree's** long-running dev server, not this one's. This confirms round 3's finding still holds; the conflict is external to this worktree and this task. Per instructions, I did not improvise an ad-hoc server: I used the project's own `scripts/serve.mjs` CLI (`node scripts/serve.mjs --root dist --port 4180`), the same production-shaped static server `dev.mjs` itself wraps, on a free port (4180), and pointed Playwright at it via the config's documented `PARITY_URL` override. Verified the server was actually serving this worktree's own build (not the other worktree's) by curling the assembled `⌘K` markup and confirming it showed the new utility classes.
4. **Full parity run, all 3 projects** (`npx playwright test tests/parity.spec.mjs --project=desktop --project=mobile-touch --project=mobile-rtl`, `PARITY_URL=http://127.0.0.1:4180`): **6 passed, 21 failed, 27 total** (exact numbers, not estimated) before re-recording; after re-recording the two affected surfaces' baselines: **6 passed** for `launchpad`/`launchpad search panel` across all three projects (desktop, mobile-touch, mobile-rtl), confirmed by a clean re-run.
5. **Baselines touched and why**: `tests/parity.spec.mjs-snapshots/{desktop,mobile-touch,mobile-rtl}/{launchpad,launchpad-search}.png` (6 files) — re-recorded via scoped `--update-snapshots -g "launchpad"`. Visually confirmed each new baseline: the desktop `launchpad.png` and `launchpad-search.png` show the "⌘K"/"Esc" chips as bordered, backgrounded pills (not plain text) exactly matching the pre-`a0067cc` visual; the `mobile-rtl` `launchpad.png` correctly shows NO visible chip in the launchpad search bar (390px viewport, `.lp-keyboard-hint` hidden by the still-intact `overrides-2.css` breakpoint rule), which is the expected/original narrow-viewport behavior, not a regression.
6. **The remaining 21 failures are NOT dismissed as noise on faith** — independently re-verified this round, not just re-asserted from round 3: rebuilt and re-served **unmodified HEAD (`dfed246`, before any of this round's changes)** on the same port-4180 server and re-ran the `email` surface (desktop) in isolation. It failed with the identical ~5% pixel-diff ratio (53876 pixels, ratio 0.05) against its own frozen baseline, with zero source changes applied. This proves the 21 remaining failures (`list`, `record`, `customers-list`, `customer-record`, `geo-list`, `geo-record`, `email` × 3 projects) are pre-existing font-rendering/anti-aliasing nondeterminism in this sandbox, unrelated to this round's `.kbd-chip` fix — not an assumption carried over from round 3. Inspected the diff images directly (not just the pixel counts): the `email` diff shows whole-page sub-pixel text/shape ghosting across unrelated regions (decorative circles, headings, tiles), not a missing or misplaced element. These 21 were **not** re-recorded; they are named explicitly here for the next reviewer to judge, per instructions, rather than swept under "environmental noise."
