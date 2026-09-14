# Tailwind Utility Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app shell's authored component CSS with Tailwind v4 utilities and a minimal owner-local compatibility layer without redesigning the interface.

**Architecture:** The existing Node assembler remains the production build. A Tailwind CLI invocation compiles `concepts/app/styles/tailwind.css` into the staging tree. The app entry loads this compiled output and prototype controls last. Markup receives literal utility classes; only selector-dependent behavior remains in named compatibility layers.

**Tech Stack:** Tailwind CSS v4 CLI, Node built-in build/server APIs, native modules, Node test runner, Playwright.

## Global Constraints

- Keep plain HTML, native JavaScript modules, the existing public `/concepts/app-shell.html` URL, and the existing ApexCharts CDN tag and integrity value.
- Do not add Vite, PostCSS, a framework, or Tailwind at runtime.
- Omit Tailwind Preflight until it is proved byte-for-byte equivalent to the current base rules; import only Tailwind `theme` and `utilities` layers.
- Preserve the one shell, page caching, fixtures, navigation, accessibility, RTL, high contrast, coarse pointer, reduced-motion, and customer restoration behavior.
- Use literal complete utility names. Never construct Tailwind class names from user data or runtime fragments.
- Use `@source inline()` only for documented classes dynamically emitted by JavaScript template strings. Do not safelist wildcard families.
- Screenshot parity stays at `maxDiffPixels: 0`; inspect a difference before accepting it. Do not update a frozen baseline to mask a regression.
- Keep a compatibility rule only when it needs selector relationships, pseudo-elements/content, a third-party DOM, or a behavior state that cannot be represented by literal utility classes. Each rule must name its owner and reason.
- The final source must have one compiled Tailwind link plus prototype-control CSS; retired component CSS links and retired CSS files are removed.

## File ownership

| Files | Responsibility |
|---|---|
| `package.json`, `package-lock.json` | Exact Tailwind CLI dependency and commands |
| `scripts/tailwind.mjs` | Compile Tailwind into a supplied staging directory and measure output |
| `scripts/build.mjs` | Call the compiler before atomically publishing `dist/` |
| `concepts/app/styles/tailwind.css` | Theme variables, explicit sources, dynamic safelist, compatibility imports |
| `concepts/app/styles/tailwind/{base,shell,components,pages}.css` | Minimal selector-driven compatibility styles by owner |
| `concepts/app-shell.html` and `concepts/app/**/*.html` | Tailwind utility classes and the sole generated stylesheet link |
| `concepts/app/**/*.js` | Literal utilities in renderer/template strings only |
| `tests/tailwind.test.mjs` | Compiler, source discovery, safelist, generated-output-size, and retired-link checks |
| `tests/tailwind-parity.spec.mjs` | Owner-by-owner zero-tolerance browser screenshot checks |
| `docs/app-shell-development.md` | Tailwind build, migration, and compatibility-rule guidance |

### Task 1: Add a reproducible Tailwind compiler checkpoint

**Files:** Modify `package.json`, `package-lock.json`, `scripts/build.mjs`, `concepts/app-shell.html`; create `scripts/tailwind.mjs`, `concepts/app/styles/tailwind.css`, `tests/tailwind.test.mjs`.

**Interfaces:** `compileTailwind({root, output}) -> Promise<{bytes:number}>` writes only `output`, rejects an absent CLI/input/output parent, and returns the byte size. `build()` calls it with the active staging directory before the atomic swap.

- [ ] Write the failing compiler test:

```js
test('Tailwind compiler writes a non-empty staged stylesheet', async () => {
  const output = path.join(await mkdtemp(path.join(tmpdir(), 'tw-')), 'tailwind.css');
  const {bytes} = await compileTailwind({root: process.cwd(), output});
  assert.ok(bytes > 0);
  assert.match(await readFile(output, 'utf8'), /@layer utilities|\.flex/);
});
```

- [ ] Run `node --test tests/tailwind.test.mjs`; expect failure because `compileTailwind` is not exported.
- [ ] Verify the current official CLI package/version with `npm view tailwindcss version` and `npm view @tailwindcss/cli version`. The plan is pinned to the verified `4.3.3` pair: `npm install --save-dev --save-exact tailwindcss@4.3.3 @tailwindcss/cli@4.3.3`.
- [ ] Implement the compiler with a direct executable path, never shell interpolation:

```js
import {execFile} from 'node:child_process';
import {stat} from 'node:fs/promises';
import {promisify} from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
export async function compileTailwind({root, output}) {
  const executable = path.join(root, 'node_modules', '.bin', 'tailwindcss');
  const input = path.join(root, 'concepts/app/styles/tailwind.css');
  await run(executable, ['-i', input, '-o', output, '--minify'], {cwd: root});
  return {bytes: (await stat(output)).size};
}
```

- [ ] Create the initial input with explicit sources and no Preflight:

```css
@import "tailwindcss/theme" layer(theme);
@import "tailwindcss/utilities" layer(utilities);
@source "../../app-shell.html";
@source "../**/*.html";
@source "../**/*.js";
@theme { --color-accent: var(--accent); --color-ink: var(--ink); --color-surface: var(--surface); }
```

- [ ] Change `build()` to compile into `path.join(staging, 'concepts/app/styles/tailwind.css')` after copying `concepts/` and before the atomic rename. Add a `<link rel="stylesheet" href="app/styles/tailwind.css">` immediately before the current legacy links for this checkpoint.
- [ ] Run `npm run build && node --test tests/tailwind.test.mjs && npm run test:unit`; expect all green. Commit `build: add Tailwind compiler checkpoint`.

### Task 2: Establish Tailwind theme, compatibility boundaries, and output budget

**Files:** Modify `concepts/app/styles/tailwind.css`, `tests/tailwind.test.mjs`, `docs/app-shell-development.md`; create `concepts/app/styles/tailwind/base.css`, `concepts/app/styles/tailwind/compatibility.md`.

**Interfaces:** `tailwind.css` imports only `theme`, `utilities`, and compatibility files. `compatibility.md` lists every retained selector as `owner | selector | reason | removal condition`.

- [ ] Write failing tests that assert the Tailwind input has no `@import "tailwindcss"`, has all three explicit `@source` paths, has no wildcard `@source inline("*`, and records the output size in `dist/concepts/app/styles/tailwind.css`.
- [ ] Run the focused test; expect the missing compatibility manifest/base import assertions to fail.
- [ ] Move only the current reset/body/reduced-motion declarations from `styles/base.css` into `tailwind/base.css` inside `@layer base`; retain the source order and declarations exactly. Add its import after the Tailwind theme import.
- [ ] Map existing token variables as theme values using `@theme inline` so utility colors reference the original semantic variables, for example:

```css
@theme inline {
  --color-accent: var(--accent);
  --color-muted: var(--muted);
  --color-surface: var(--surface);
  --color-line: var(--line);
  --shadow-shell: var(--shadow-2);
}
```

- [ ] Create `compatibility.md` with the initial permitted categories: `::before/::after`, `@keyframes`, ApexCharts DOM, `[aria-*]` relationships, and prototype density/style modes. Do not list ordinary layout selectors.
- [ ] Run `npm run build`, capture the initial byte size in the test assertion, then run `npm run test:unit`. Commit `style: define Tailwind theme and compatibility boundary`.

### Task 3: Convert shell and launchpad utilities

**Files:** Modify `concepts/app/shell/shell.html`, `concepts/app-shell.html`, `concepts/app/pages/home/home.js`, `concepts/app/styles/tailwind.css`; create `concepts/app/styles/tailwind/shell.css`; delete `concepts/app/shell/{shell,shell-2,shell-3,shell-4,shell-5,shell-6,shell-7}.css`, `concepts/app/pages/home/home.css`, `concepts/app/styles/{app,app-2,app-3,app-4}.css` when fully migrated; modify `tests/tailwind-parity.spec.mjs`.

**Interfaces:** Shell markup uses literal utilities for frame, topbar, sidebar, launchpad, menus, search, keyboard sheet, and appearance/customize layout. `shell.css` retains only documented relational/animation rules.

- [ ] Add a failing desktop and RTL-mobile screenshot test for `launchpad`, `list`, and the search panel, using the existing `boot`, `openSurface`, and `settle` helpers with `maxDiffPixels: 0`.
- [ ] Convert the shell's repeated flex/grid/spacing/typography/border/background declarations to literal utilities on the existing elements. Preserve every id, class used as a JavaScript selector, ARIA attribute, and template boundary.
- [ ] Move only shell-specific `@keyframes`, `.search-typing-label::after`, app-switcher relational selectors, and appearance previews to `@layer components` in `tailwind/shell.css`; add one manifest row per selector group.
- [ ] Remove the migrated shell/home/app stylesheet links and files only after `rg -n 'shell(-[2-7])?\.css|home\.css|app(-[2-4])?\.css' concepts/app-shell.html` returns no retired link.
- [ ] Run the focused screenshot test, `npm run test:unit`, and the desktop/mobile/RTL parity projects. Commit `refactor: migrate shell and launchpad to Tailwind utilities`.

### Task 4: Convert shared component utilities

**Files:** Modify component HTML/template strings under `concepts/app/components/{assistant,data-list,dialog,loading,notifications,record-pager,toast}/`; create `concepts/app/styles/tailwind/components.css`; delete the component CSS files and their links once migrated; modify `tests/components.spec.mjs`, `tests/data-list-component.spec.mjs`, `tests/tailwind-parity.spec.mjs`.

**Interfaces:** Component APIs and selectors consumed by JavaScript remain unchanged. Dynamic renderer output emits literal utilities; any fixed class generated only in a JS string appears in one `@source inline()` declaration with an adjacent comment naming the renderer.

- [ ] Add failing checks that `renderers.js`, `context-menu.js`, `notifications.js`, and `assistant.js` still render visible controls after compiled CSS is loaded; test toast, focus trapping, unread state, pager, and chart cleanup through existing scenarios.
- [ ] Convert reusable button, menu, dialog, toast, notification, pager, loading, data-list table/card/kanban styles to utilities in their owning templates/renderers.
- [ ] Keep only ApexCharts selectors, pseudo-elements, table pseudo-structure, and behavior-state relationships in `tailwind/components.css`; document each retained group.
- [ ] Add exact `@source inline()` entries for every dynamic utility not found in static source and verify the generated CSS contains each escaped selector.
- [ ] Remove retired component stylesheet links/files, run focused component browser tests across desktop, touch, high-contrast, and reduced motion, then `npm run test:unit`. Commit `refactor: migrate shared components to Tailwind utilities`.

### Task 5: Convert invoice and customer pages

**Files:** Modify `concepts/app/pages/{invoices,customers}/**/*.{html,js}`; create `concepts/app/styles/tailwind/invoices.css`, `concepts/app/styles/tailwind/customers.css`; delete `invoices*.css` and `customers.css` after migration; modify `tests/invoice-geography.spec.mjs`, `tests/lifecycle.spec.mjs`, `tests/tailwind-parity.spec.mjs`.

**Interfaces:** Invoice add-item remains bound with `addItemButton.addEventListener`, customer mode/layout restoration continues through `customers.setMode` and `customers.setLayout`, and existing page roots are not wrapped.

- [ ] Add failing visual checks for invoice record/list and customer record/list in desktop, mobile touch, dark, high contrast, and RTL.
- [ ] Convert record cards, fields, tabs, totals, lists, filters, dialogs, print views, customer layouts/lookups/images, and list statistics to literal utilities while retaining classes used as JS selectors.
- [ ] Preserve only grid relationships, `:has()`/ARIA state selectors, print rules, and generated content in the two owner-local compatibility files with manifest rows.
- [ ] Run invoice line entry once-per-click, customer reload restoration, dirty-leave, lookup, nested drawer, and print focus scenarios before deleting each retired page stylesheet.
- [ ] Run focused parity and lifecycle tests, then `npm run test:unit`. Commit `refactor: migrate invoice and customer pages to Tailwind utilities`.

### Task 6: Convert geography and email pages, then remove legacy CSS

**Files:** Modify `concepts/app/pages/{geography,email}/**/*.{html,js}`, `concepts/app-shell.html`, `concepts/app/styles/tailwind.css`; create `concepts/app/styles/tailwind/geography.css`, `concepts/app/styles/tailwind/email.css`; delete remaining legacy CSS files and `tests/styles.test.mjs`; modify `tests/tailwind.test.mjs`, `tests/tailwind-parity.spec.mjs`, `tests/architecture.test.mjs`.

**Interfaces:** Existing geographical hierarchy/picker, email compose/reply, unread notification, and RTL behavior remain unchanged. Source HTML loads only the generated Tailwind stylesheet and prototype-control CSS.

- [ ] Write failing structural tests for exactly one non-prototype application stylesheet link, absent retired CSS files, and no `legacy-app.css` checkpoint reference.
- [ ] Convert geography hierarchy/flow/pickers and email list/reader/composer markup to utilities. Keep only flow-canvas, print/pseudo-element, and third-party/behavior selectors in their owner-local compatibility files.
- [ ] Replace the ordered application stylesheet-link block with one `<link rel="stylesheet" href="app/styles/tailwind.css">`; keep `shell-kit-css` last.
- [ ] Delete the retired CSS files and style inventory tests only after their replacements pass. Replace the retired byte reconstruction check with a compatibility-manifest and compiled-output-size check.
- [ ] Run `npm run build && npm run test:unit` plus complete parity and focused geography/email/messaging suites. Commit `refactor: complete Tailwind utility migration`.

### Task 7: Final visual audit and handoff

**Files:** Modify `docs/app-shell-development.md`, `tests/support/known-defects.md` only if behavior changed intentionally; create `docs/tailwind-migration-report.md`.

**Interfaces:** The report records exact Tailwind package versions, generated CSS bytes, retained compatibility selectors, baseline identity, screenshot results, and any reviewed visual exceptions.

- [ ] Write a failing unit check that generated CSS remains below the recorded Task 2 baseline plus 10%, unless the report explicitly names a reviewed dynamic-utility addition.
- [ ] Run `npm run build && npm run test:unit && npm run test:browser` against `dist/`.
- [ ] Inspect all screenshot failures at zero tolerance. Either fix the utility/compatibility rule or document a concrete reviewed exception with before/after images and cause; never change tolerance.
- [ ] Update the development guide with `npm ci`, Tailwind compilation, `@source` registration, dynamic utility safelisting, compatibility-rule criteria, and the rule that a new utility must be literal in source.
- [ ] Record generated CSS size and retained selector count in `docs/tailwind-migration-report.md`; update the plan checkboxes and commit `docs: document Tailwind migration results`.

## Plan self-review

- The plan covers the approved CLI-only build, explicit source registration, narrow dynamic safelist, no-Preflight rule, utility migration, compatibility boundaries, and CSS-size budget.
- Each visual owner has a focused conversion checkpoint before its legacy CSS is removed.
- Existing behavior, route, shell, accessibility, appearance, and lifecycle contracts are preserved and validated by existing browser scenarios.
- The final task runs the complete production-shaped build and browser matrix before handoff.
