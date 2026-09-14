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
