# App Shell Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic app-shell source with reusable components and page modules while preserving the served interface and supported behavior.

**Architecture:** Mechanically extract the existing style/script blocks first, then introduce explicit native-module ownership around the existing implementations. Assemble static HTML fragments before serving, retain one shell and cached page instances, and compare every migration checkpoint against an immutable baseline.

**Tech Stack:** Plain HTML, CSS, native JavaScript modules, Node built-in build/server APIs, Node's test runner, and Playwright browser tests. Keep the existing ApexCharts 7.1.0 script and integrity attributes.

## Global Constraints

- Keep plain HTML, CSS, and JavaScript, one shared app shell, the current public `/concepts/app-shell.html` URL, and existing assets.
- A framework migration, new pages, redesign, backend implementation, and unrelated audit fixes are outside this refactor.
- Double-clicking the source HTML is not an acceptance requirement. Running through the local server is the agreed workflow.
- Static component styles load with the initial page to avoid flashes of unstyled content. Preserve prototype-control overrides after application styles.
- Build output goes into ignored `dist/`, retains the required relative paths, and can be served as static files.
- Publishing or changing remote deployment settings is not part of this task.
- The customer restoration lifecycle correction is the one explicitly allowed behavior correction here.
- No duplicate shell, residual legacy application monolith, giant shared mutable context, framework, or global event bus is an acceptable final result.
- Preserve observable behavior and existing fixture values even where the preceding audit identified defects; record those defects separately. Do not enlarge this refactor into the audit-fix project.

Approved spec: `docs/superpowers/specs/2026-09-13-app-shell-components-design.md`.

Baseline commit: `07f6b8a664e684022a3faf4c9e95392a13134529`.
Baseline HTML Git blob: `2776f120870c4fdbb6eb80e2777bc4c085ce39f3`.
All source line references below refer to that baseline; use symbols after extraction changes line numbers.

## Execution rules

Use an isolated worktree at execution time. Preserve the untracked audit report and browser snapshot in the original worktree. Commit only task-owned files, never `git add .`. Tasks are sequential because they share the current application initialization and migration script. Independent baseline inspection/review can run alongside implementation; two implementers must not simultaneously rewrite the legacy script.

Each task ends with its focused tests and review. Run the full browser matrix at the initial baseline, the mechanical extraction checkpoint, and the final module checkpoint. Between those checkpoints, run the affected scenarios; broaden testing when failures or changed shared behavior justify it. Never update screenshot baselines just to make a refactor pass.

This plan specifies new interfaces and test code. Existing component implementation bodies are relocated from the named baseline symbols, retaining their markup and algorithm; do not rewrite thousands of lines from a summary. Every relocation includes its associated event registrations and mutable state, even where these occur elsewhere in the original function. A binding inventory in Task 1 prevents orphaning those registrations.

## Final file ownership

| Files | Responsibility |
|---|---|
| `package.json`, `package-lock.json` | Run/build/test commands; pinned test-only dependency |
| `scripts/build.mjs`, `scripts/serve.mjs`, `scripts/dev.mjs` | Fragment assembly, explicit public asset copying, local HTTP serving |
| `scripts/capture-baseline.mjs` | Materialize the fixed Git baseline outside served production output |
| `concepts/app-shell.html` | Thin authored entry; ordered fragment and asset references |
| `concepts/app/main.js` | Composition and ordered startup only |
| `concepts/app/core/locale.js`, `appearance.js`, `navigation.js`, `work.js` | Shared settings, navigation, and simulated work |
| `concepts/app/shell/shell.html`, `shell.js`, `shell.css`, `sidebar.js`, `topbar.js`, `menus.js`, `search.js`, `customize.js` | One shell, menu/search/sidebar interactions |
| `concepts/app/shell/icons.html` | Existing SVG symbol sprite |
| `concepts/app/components/dialog/dialog.js`, `dialog.css` | Shared focus ownership; page-owned dialog content remains with its page |
| `concepts/app/components/toast/toast.js`, `toast.html`, `toast.css` | Status feedback |
| `concepts/app/components/record-pager/pager.js`, `pager.html`, `pager.css` | Record pager behavior and markup |
| `concepts/app/components/notifications/notifications.js`, `notifications.html`, `notifications.css` | Shared notification and unread state |
| `concepts/app/components/loading/loading.js`, `loading.css` | Skeleton/ticker behavior and cleanup |
| `concepts/app/components/data-list/list.js`, `model.js`, `filters.js`, `columns.js`, `pagination.js`, `statistics.js`, `charts.js`, `views.js`, `actions.js`, `menus.js`, `dialogs.html`, `list.css` | Shared list engine and cohesive subfeatures |
| `concepts/app/pages/home/home.js`, `home.css` | Launchpad, app switching, search-label animation |
| `concepts/app/pages/invoices/invoices.js`, `record.js`, `lines.js`, `payments.js`, `operations.js`, `print.js`, `activity.js`, `templates.html`, `dialogs.html`, `invoices.css` | Invoice workflows and views |
| `concepts/app/pages/customers/customers.js`, `record.js`, `fields.js`, `layouts.js`, `lookups.js`, `images.js`, `templates.html`, `dialogs.html`, `customers.css` | Customer views, lookups, nested drawers, photos |
| `concepts/app/pages/geography/geography.js`, `hierarchy.js`, `pickers.js`, `templates.html`, `dialogs.html`, `geography.css` | Location record and hierarchy |
| `concepts/app/pages/email/email.js`, `templates.html`, `email.css` | Mail list, reader, compose/reply |
| `concepts/app/components/assistant/assistant.js`, `assistant.html`, `assistant.css` | Existing AI proposal drawer and scenarios |
| `concepts/app/styles/tokens.css`, `base.css`, `app.css`, `overrides.css` | Existing token/base declarations and explicit cascade order |
| `concepts/app/prototype/controls.js`, `controls.html`, `controls.css`, `fixtures/invoices.js`, `fixtures/customers.js`, `fixtures/geography.js`, `fixtures/navigation.js`, `fixtures/messages.js` | Prototype controls and existing sample data |
| `tests/support/baseline.json`, `known-defects.md`, `scenarios.mjs`, `browser.mjs` | Fixed provenance, allowed differences, browser navigation helpers |
| `tests/parity.spec.mjs`, `tests/lifecycle.spec.mjs`, `tests/components.spec.mjs`, `tests/build.test.mjs`, `tests/architecture.test.mjs`, `playwright.config.mjs` | Meaningful parity, lifecycle, build, and ownership verification |
| `docs/app-shell-development.md` | How to run, build, preserve parity, and add a page |

Temporary files `concepts/app/legacy-app.js`, `concepts/app/styles/legacy-app.css`, and `concepts/app/prototype/legacy-controls.js` exist only between extraction and module completion. Task 12 removes them after proving that every owned behavior has moved.

## Contracts used across tasks

Use JSDoc for these contracts; this refactor does not introduce TypeScript. `roots` is an array deliberately: the invoice record currently owns several direct `.content` children. Do not wrap them in an extra element and break selectors/layout.

```js
/**
 * @typedef {'record'|'list'|'customers-list'|'customer-record'|'geo-list'|'geo-record'|'email'|'launchpad'} PageId
 * @typedef {{key?: string, mode?: string, messageId?: string}} NavigationData
 * @typedef {{
 *   id: PageId,
 *   roots: HTMLElement[],
 *   activate: (data: NavigationData) => void,
 *   deactivate: () => void,
 *   dispose: () => void
 * }} Page
 * @typedef {{
 *   navigate: (id: PageId, data?: NavigationData) => Promise<boolean>,
 *   current: () => PageId|null,
 *   dispose: () => void
 * }} Navigation
 */
```

`createNavigation({resolvePage, requestLeave, showPage, onChange})` returns `Navigation`. `resolvePage(id)` returns the cached, initialized `Page`. `requestLeave(from, to, data)` returns `Promise<boolean>` and adapts the existing guard outcomes; missing guards allow navigation. `showPage(page)` performs the existing attachment/hiding operation. `onChange(id)` updates shell/prototype state. Unknown IDs reject explicitly; existing sidebar fallback behavior is represented by its existing mapping before calling navigation, not by an accidental missing-registration fallback.

`createLocale()` returns `{t, formatDate, formatCurrency, getLocale, setLocale, subscribe}`. `subscribe(callback)` returns an unsubscribe function. Move the current dictionary and formatting behavior unchanged.

`createAppearance({root, readControls, onChange})` returns `{apply, getSettings, dispose}`. `apply(partialSettings={})` applies supplied appearance values over the current model, reading controls only for values not yet initialized; ignore keys owned by page scenarios or locale. `readControls()` returns existing appearance control values; `onChange()` tells mounted charts to refresh. Retain current storage/control semantics.

`createToast(host)` returns the existing `toast({tone,title,body,action,onAction,ms})` function. `createDialogFocus(document)` returns `{trapFocus,releaseFocus,dispose}` with the current behavior; customer nested-layer restoration continues to adapt this contract.

`createDataList({context,root,footer,config,rows,locale,actions,storage})` returns `{render,activate,deactivate,dispose,getLayout,applyLayout,requestLeave}`. `context` stays `invoice`, `customer`, or `geo`. `rows` retains the existing mutable fixture collection. `actions` supplies `openRecord(key,mode)`, `newRecord()`, `run(command,keys)`, `cardModel(row)`, and `statistics(rows,config,total)`; business dispatch stays outside the shared component. `storage` supplies `loadLayout`, `saveLayout`, `loadFilters`, and `saveFilters` using the existing key strings.

`createPrototypeControls({root,settings,pages})` returns `{syncPage,dispose}`. `pages` exposes only the existing scenario operations (`setMode`, `setStatus`, `setPayment`, `setDirty`, `setLayout`) for the relevant page; it is not an arbitrary state-access object. Read saved state separately through `readPrototypeState(sessionStorage)` before any DOM-dependent restoration.

### Task 1: Establish reproducible baseline and behavior checks

**Files:** Create `package.json`, `package-lock.json`, `playwright.config.mjs`, `scripts/capture-baseline.mjs`, `scripts/serve.mjs`, `tests/support/baseline.json`, `tests/support/known-defects.md`, `tests/support/browser.mjs`, `tests/support/scenarios.mjs`, `tests/parity.spec.mjs`; modify `.gitignore`.

**Interfaces:** Produces baseline server on port 4174, current server on port 4173, and browser helpers `boot(page,baseURL)`, `openSurface(page,id)`, `settle(page)`. Both servers expose `/concepts/app-shell.html` and corresponding original relative assets.

- [ ] Record the baseline commit/blob above, source hash, browser version, timezone, locale, viewport, fixture time, and per-scenario storage state. Create a binding inventory mapping every original top-level declaration and event registration to one destination from the ownership table. Store it as `tests/support/migration-inventory.json`; include source start/end offsets and a body hash so each removal can be accounted for.
- [ ] Install test tooling with `npm install --save-dev --save-exact @playwright/test`; commit the exact version and lockfile. Set package type to `module`. Add scripts `dev: node scripts/dev.mjs`, `build: node scripts/build.mjs`, `test:unit: node --test tests/*.test.mjs`, `test:parity: playwright test tests/parity.spec.mjs`, and `test:browser: playwright test`. Before adding dependency/API-specific code, verify the installed version's docs and CLI help.
- [ ] Implement baseline materialization from the fixed Git revision, using `git show <commit>:<path>` for the HTML and required public assets. Write into ignored `.baseline/`, never overwrite the authored source, and fail if the baseline blob differs. The static server accepts `--root`, `--port`; bind to `127.0.0.1`, decode paths safely, reject traversal/symlink escape, serve `.js/.mjs` with JavaScript MIME and `.css` with CSS MIME, and return explicit 404/500 responses. Do not serve repository secrets, `.git`, or arbitrary parent files.

  During Tasks 1–2 start the servers with `node scripts/serve.mjs --root .baseline --port 4174` and `node scripts/serve.mjs --root . --port 4173`, applying the public-path allowlist to both. From Task 3 onward the current server is `npm run dev`; the baseline server stays unchanged. Configure Playwright to use these existing servers rather than starting a second process on either port. The `dev`/`build` commands become runnable in Task 3; tests in Tasks 1–2 use the static server directly.
- [ ] Implement the reusable readiness helper and baseline parity test:

```js
export async function settle(page) {
  await page.locator('.skeleton-overlay').waitFor({state: 'hidden'});
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

// tests/parity.spec.mjs
import {test, expect} from '@playwright/test';
import {boot, openSurface, settle} from './support/browser.mjs';
const surfaces = ['launchpad','list','record','customers-list',
  'customer-record','geo-list','geo-record','email'];
for (const id of surfaces) {
  test(`${id}: baseline appearance`, async ({page}) => {
    await boot(page, process.env.PARITY_URL ?? 'http://127.0.0.1:4173');
    await openSurface(page, id);
    await settle(page);
    await expect(page).toHaveScreenshot(`${id}.png`, {
      animations: 'disabled', maxDiffPixels: 0
    });
  });
}
```

`boot` creates the same fresh storage state and browser clock in both modes; set time to `2026-09-13T09:00:00+02:00` while allowing timers to progress. Disable simulate-loading through its existing control; use identical reduced-motion settings for static captures, and test normal motion separately. Open lists using launchpad exact-name buttons; open records through `[data-list-open-record]`; open mail through Notifications → Email, preserving the known Internal Mail shortcut defect. Use known DOM selectors from the baseline, never newly added testing hooks that have no baseline counterpart.
- [ ] Define Playwright projects for desktop 1440×900, mobile 390×844 with touch, dark desktop, high-contrast light/dark desktop, RTL mobile, and reduced-motion desktop. Set theme/contrast/RTL through existing control change events, not by setting only `data-theme`. Set a common snapshot path per project so baseline/candidate use the same expected images. Save baseline captures once with `PARITY_URL=http://127.0.0.1:4174 npm run test:parity -- --update-snapshots`; run again without updating and require PASS before edits.
- [ ] Record the preceding audit's 12 issues without writing passing tests that endorse them permanently. Add a failing regression for the one allowed customer reload fix (Task 11); until then mark it expected-failure only for the recorded baseline reason. Do not suppress arbitrary console exceptions.
- [ ] Commit baseline fixtures, tests, and tooling: `test: establish app shell refactor baseline`. Ignore `.baseline/`, `dist/`, `node_modules/`, test results, and traces; retain committed expected screenshots.

### Task 2: Mechanically extract CSS and classic JavaScript

**Files:** Modify `concepts/app-shell.html`; create `concepts/app/styles/legacy-app.css`, `concepts/app/legacy-app.js`, `concepts/app/prototype/controls.css`, `concepts/app/prototype/legacy-controls.js`, `tests/extraction.test.mjs`.

**Interfaces:** Browser entry unchanged; `legacy-app.js` and `legacy-controls.js` remain classic scripts in their original order. Existing global bridges remain intact.

- [ ] Write the extraction invariant against baseline bytes before extracting:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('mechanical extraction retains application block bytes', async () => {
  const original = await readFile('.baseline/concepts/app-shell.html', 'utf8');
  const script = [...original.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .find(match => !/\bsrc=/.test(match[1]))[2];
  assert.equal(await readFile('concepts/app/legacy-app.js','utf8'), script);
});
```

Add equivalent byte comparisons for both CSS blocks and the prototype script. Run `node --test tests/extraction.test.mjs`; expect missing external files before the move.
- [ ] Move the four block bodies verbatim. Replace the main style tag with `<link rel="stylesheet" href="app/styles/legacy-app.css">`; replace the later style tag with `<link id="shell-kit-css" rel="stylesheet" href="app/prototype/controls.css">`. Replace scripts with `<script src="app/legacy-app.js"></script>` and `<script id="shell-kit-js" src="app/prototype/legacy-controls.js"></script>` in their original positions. Preserve the head's ApexCharts tag verbatim; do not add `async`, `defer`, or `type="module"` yet.
- [ ] Run extraction tests and the full parity matrix. Inspect failures rather than updating expected images. Run original global-handler entry checks and verify the add-item control responds once.
- [ ] Commit `refactor: extract app shell styles and scripts`. Record this commit as the mechanical parity checkpoint. Extraction byte tests become checkpoint evidence after later modules replace these files; do not keep tests that require deleted temporary files.

### Task 3: Assemble HTML fragments and serve the production-shaped output

**Files:** Create `scripts/build.mjs`, `scripts/dev.mjs`, `tests/build.test.mjs`; modify `scripts/serve.mjs`, `package.json`, `concepts/app-shell.html`; create the HTML files in the ownership table.

**Interfaces:** Export `assemble(file,stack=[]) -> Promise<string>` and `build() -> Promise<void>` from `scripts/build.mjs`. Export `serve({root,port,beforeDocument}) -> Promise<http.Server>` from `scripts/serve.mjs`. `beforeDocument` completes a build before serving the app HTML in development; production static serving needs no build hook.

- [ ] Add failing tests for nested includes, missing includes, cycles, include escape, MIME types, original asset URLs, and production HTML with no unresolved directives. The include syntax is `<!-- include: relative/path.html -->`, resolved relative to the including file within `concepts/`.

```js
// Core include expansion: scripts/build.mjs
import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';
const sourceRoot = await realpath('concepts');
export async function assemble(file, stack = []) {
  const absolute = await realpath(file);
  if (absolute !== sourceRoot && !absolute.startsWith(sourceRoot + path.sep))
    throw new Error(`Include outside concepts: ${file}`);
  if (stack.includes(absolute)) throw new Error(`Include cycle: ${absolute}`);
  const source = await readFile(absolute, 'utf8');
  const pattern = /<!-- include: ([^\r\n]+?) -->/g;
  let result = '', cursor = 0;
  for (const match of source.matchAll(pattern)) {
    result += source.slice(cursor, match.index);
    result += await assemble(path.resolve(path.dirname(absolute), match[1]),
      [...stack, absolute]);
    cursor = match.index + match[0].length;
  }
  return result + source.slice(cursor);
}
```

- [ ] Move existing complete template/overlay elements into the owning fragments without modifying their inner markup. Keep the source entry's surrounding structure, original template order, and overlay placement through includes. Move the sprite to `shell/icons.html`; do not duplicate symbol IDs. Do not run arbitrary JavaScript during assembly.
- [ ] Implement `build()` using Node file operations and an explicit public-path manifest: `index.html`, `logo-skey.png`, `concepts/`, `deck/`, `audit/`, `docs/`, `presentation/` when present. Copy only public files, reject symlink escape, and exclude development/build/test artifacts and hidden directories. Assemble the output HTML into `dist/concepts/app-shell.html`. Build from a fresh, validated task-owned staging directory before replacing prior generated output; no broad repository cleanup command. Verify index links to existing public artifacts still resolve.
- [ ] Implement `dev.mjs` to await the initial build, then serve `dist/` at port 4173 and serialize rebuilds before application-document responses. Developers refresh the page after editing; live reload is not required. Keep a production static-server mode for tests. On build errors return an explicit error response rather than silently serving stale HTML.
- [ ] Run `npm run build`, `node --test tests/build.test.mjs`, and parity against served `dist/`. Expected: includes disappear, JS/CSS load with correct MIME, public assets return 200, traversal is rejected, stable screenshots match. Commit `build: assemble app shell templates for local serving`.

### Task 4: Extract locale, appearance, feedback, and focus behavior

**Files:** Create `core/locale.js`, `core/appearance.js`, `core/work.js`, `components/dialog/dialog.js`, `components/toast/toast.js`, `components/loading/loading.js` under `concepts/app/`; modify `legacy-app.js`; create `tests/components.spec.mjs`.

**Interfaces:** Produce the shared contracts above. `createLoading({getContainer,isSimulationEnabled})` returns `{queue,clear,dispose}`; `createWork({shouldFail})` returns the existing `runWork(btn,label,ms)` function.

- [ ] Add tests for shared behavior through the UI: theme changes update open charts; Arabic updates direction and field formatting; Print Settings traps Tab and restores its trigger on Escape; simulated failure resets busy state and shows the existing feedback. Include this keyboard assertion:

```js
test('print dialog returns keyboard focus', async ({page}) => {
  await boot(page, 'http://127.0.0.1:4173');
  await openSurface(page, 'record');
  const trigger = page.locator('.content').getByRole('button',{name:'Print',exact:true});
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog',{name:'Print Settings'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
```

- [ ] Move `encodeHtml`, `I18N`, date/currency formatting, and their dependencies into locale; export `encodeHtml` separately for safe rendering. Move color functions and `applyTheme`/`applyAppearanceAccent` into appearance without changing math. Move the focus block at 18383, toast block at 18420, `runWork` block immediately after it, and skeleton/ticker functions at 22547–22884 to their owners. Preserve their function bodies; replace reads of invoice/page private state with the exact callbacks declared above.
- [ ] Change the transitional app to a module exporting `startLegacyApp(shared)`. Use `shared` only for this finite set of facilities, not arbitrary getters for every legacy binding. Call it from a temporary module entry after markup is assembled; invoke prototype controls afterward. Explicit `window.*` assignments still work for remaining inline handlers. Check module strict-mode errors before proceeding.
- [ ] Run affected tests and home/record theme/RTL screenshots. Commit `refactor: isolate shared shell facilities`.

### Task 5: Isolate fixture ownership and shared data-list model

**Files:** Create `prototype/fixtures/{invoices,customers,geography,navigation,messages}.js`, `components/data-list/model.js`, `filters.js`, `columns.js`, `pagination.js`, `pages/customers/customers.js`; modify `legacy-app.js`; create `tests/data-list.test.mjs`, `tests/support/storage.mjs`.

**Interfaces:** Export each existing named fixture constant from its owner. `createListModel({config,rows,storage})` returns `{state,rowsInView,saveLayout,resetLayout}`. Expose `dateFilterRange`, `rowMatchesFieldFilter`, and `responsiveDataListColumns` with their existing signatures from their owners; pass the model's state explicitly where prior code indexed global `dataListState`.

- [ ] Add table-driven tests using actual current fixtures for contains/exact date filters, sorting, grouping, and visible-column selection. Keep the same representative values and simulated totals. Include a real empty-filter case:

```js
test('an unmatched customer search produces no visible rows', () => {
  const model = createListModel({config:customerConfig, rows:CUSTOMER_ROWS,
    storage:memoryLayoutStorage()});
  model.state.search = '__no_customer_matches_this__';
  assert.deepEqual(model.rowsInView(), []);
});
```

`customerConfig` is the existing customer entry in `DATA_LIST_CONFIG`, exported from `pages/customers/customers.js` as configuration only during this task. `memoryLayoutStorage()` in `tests/support/storage.mjs` implements the four storage methods using a Map and structured clones; it starts empty and performs no I/O. Test fresh defaults and saved/restored order, not private implementation call counts.
- [ ] Move fixture declarations by name: invoice `STATUSES`, `CHAIN`, `CARDS`, `RULES`, `LIST_ROWS`, `ACTIVITY`, search records/actions; customer `CUSTOMER_ROWS`, `CUSTOMER_SECTIONS`, `CUSTOMER_REFERENCE`, lookup/unit rows; geography `GEO_ROWS`; navigation `NAV_TREE`, `NAV_FAVORITES`, `NAV_RECENTS`, icons/meta; messages `EMAIL_DATA`, `NOTIF_DATA`. Shared constants stay with their actual consumer, not a catch-all constants file. Keep runtime mutable models separate from immutable declarations.
- [ ] Move storage helpers at 21277–21360 with unchanged `skey:data-list-layout:${context}` and `skey:data-list-custom-filters:${context}` keys. Extract date/filter functions at 21906–22134, column calculations at 23532–23588, and pager renderers at 22398–22470 without changing their outputs. Attach legacy callers to these exports, eliminating duplicate copies.
- [ ] Run `node --test tests/data-list.test.mjs` plus list search/sort/pagination browser scenarios. Commit `refactor: isolate list models and prototype fixtures`.

### Task 6: Extract list views, charts, menus, and action callbacks

**Files:** Create `components/data-list/list.js`, `statistics.js`, `charts.js`, `views.js`, `actions.js`, `menus.js`; modify `model.js`, `filters.js`, `columns.js`, `pagination.js`, `legacy-app.js`, `tests/components.spec.mjs`.

**Interfaces:** Produce `createDataList` as defined above. `charts.js` owns per-instance chart lifecycle and exposes `createListChart({root,locale}) -> {render,destroy}`; injected business callbacks own record opening, status changes, and statistics factories.

- [ ] Add browser scenarios for all list variants, selected-row actions, saved layout/filter restore, chart opening/theme refresh, frozen columns, context menus, and constrained Kanban movement. Use the existing selectors:

```js
for (const view of ['list','responsive','adaptive','cards','kanban']) {
  test(`invoice ${view} retains list behavior`, async ({page}) => {
    await boot(page, 'http://127.0.0.1:4173');
    await openSurface(page, 'list');
    const option = page.locator(`[data-list-view="${view}"]`);
    const summary = option.locator('xpath=ancestor::details/summary');
    await summary.click();
    await option.click();
    await settle(page);
    await expect(page.locator('[data-data-list="invoice"]')).toBeVisible();
    await expect(page.locator('[data-data-list="invoice"]')).toHaveScreenshot(`${view}.png`, {
      animations:'disabled', maxDiffPixels:0
    });
  });
}
```

Capture these expected variant images from the baseline before moving the corresponding renderer.
- [ ] Move `renderDataList` with renderer helpers and `wireDataList` into the shared list component. Move number/statistics renderers, chart helpers, view/group renderers, context menu handlers, custom-filter dialogs, export/layout operations to the corresponding ownership files. Each list instance owns its state, menu resources, chart, and observer.
- [ ] Replace `openDataListRecord`, `openNewDataListRecord`, status operations, and context-specific card/statistics branches with the existing page business callbacks. Do not import customer or invoice controllers from the shared list. Preserve footer placement by receiving its current footer element.
- [ ] Replace the existing dataset initialization guard with equivalent per-instance initialization: one set of delegated canvas listeners registered once, disposed through an instance-owned AbortController. Chart rerenders destroy only the instance they replace. Preserve pinned/parked menu behavior and focus restoration.
- [ ] Run affected list tests and repeated-navigation assertions. Commit `refactor: encapsulate shared ERP data list`.

### Task 7: Extract Customer record, lookup, and layout components

**Files:** Create `pages/customers/{record,fields,layouts,lookups,images}.js`; complete `customers.js`; modify `legacy-app.js`, `tests/lifecycle.spec.mjs`.

**Interfaces:** `createCustomers({templates,locale,appearance,dialogs,toast,work,navigate,createList})` returns `{listPage,recordPage,setMode,setLayout}`. Both pages implement `Page`. `setMode(mode)` updates model state even before activation; DOM rendering uses the retained record root. Mode values remain `create`, `view`, `edit`; layout values remain `guided`, `scroll` for exposed controls. Existing other renderers are moved, not opportunistically deleted.

- [ ] Add customer create/view/edit, required-field, guided-tab, Scroll Navigator, lookup selection, nested unit drawer, photo preview, save/undo, and dirty-leave scenarios. Verify event handlers still work after navigating away and back.

```js
test('customer mode restores after reload without a null-root exception', async ({page}) => {
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  await boot(page, 'http://127.0.0.1:4173');
  await openSurface(page, 'customer-record');
  await page.locator('#customer-mode').selectOption('create', {force:true});
  await page.reload();
  await settle(page);
  expect(errors).toEqual([]);
  await openSurface(page, 'customers-list');
  await expect(page.locator('.customer-list-view')).toBeVisible();
});
```

Run first and confirm the documented baseline failure is the null `customer-record-chrome` lookup, not an unrelated timeout. Keep this test expected-failure until restoration wiring is completed in Task 11.
- [ ] Move customer model/validation around 21524–21905, record/layout/save/guard code at 26495–27050, lookup/drawer code at 27330–27900, customer event registrations at 28361–28580, and image helpers at 23732–23774/23980–24129. Resolve every remaining reference against the binding inventory.
- [ ] Replace `document.getElementById('customer-record-chrome')` and customer-private queries with queries rooted at the retained customer page or its explicit overlay roots. Keep shared picker coordination through callbacks. Separate changing mode data from rendering so prototype restoration cannot query a detached root through `document`.
- [ ] Run customer and shared-list scenarios. Commit `refactor: isolate customer page components`.

### Task 8: Extract geography and invoice workflows

**Files:** Create `pages/geography/{geography,hierarchy,pickers}.js`, `pages/invoices/{invoices,record,lines,payments,operations,print,activity}.js`, `components/record-pager/pager.js`; modify `legacy-app.js`, browser tests.

**Interfaces:** `createGeography({templates,locale,dialogs,toast,work,navigate,createList}) -> {listPage,recordPage}`. `createInvoices({templates,locale,dialogs,toast,work,navigate,createList}) -> {listPage,recordPage,setMode,setStatus,setPayment,setDirty}`. `createRecordPager({root,getPosition,onNavigate}) -> {sync,dispose}` retains the existing DOM and delegates business navigation to callbacks.

- [ ] Add invoice item/payment calculations, tab switching, charges/discounts, simulated failure, save/undo, Print Settings, activity/log and document-operation checks. Add geography tree/flow selection, zoom/pan, parent exclusion, create/edit/save, and hierarchy dialog checks.

```js
test('invoice item action is registered only once', async ({page}) => {
  await boot(page, 'http://127.0.0.1:4173');
  await openSurface(page, 'record');
  await page.locator('#mode').selectOption('create', {force:true});
  const rows=page.locator('#items-body > tr');
  const count=await rows.count();
  await page.getByRole('button',{name:'Add item',exact:true}).click();
  await expect(rows).toHaveCount(count+1);
});
```

- [ ] Move geography state and hierarchy/pickers from 21059, 25395–25689, 26121–26493, the associated event registrations, and flow pan behavior at 28663. Keep customer unit lookup content with Customers; geography can provide the existing picker behavior without owning customer record state.
- [ ] Move invoice `state`, `applyState`, record operations/guards/print/log blocks, and line/payment/adjustment functions at 28764–29175 to their owners. Keep the current unwrapped record roots and exact selectors until scoped equivalents pass parity.
- [ ] Move private initialization into each creator; preserve exactly-once row initialization and the second state application required for newly created input rows. Route cross-page navigation by callbacks. Retain the current incomplete invoice fixture lookup and mock pager totals as known defects.
- [ ] Run invoice/geography focused checks and desktop/mobile record screenshots. Commit `refactor: isolate invoice and geography workflows`.

### Task 9: Extract Email, Notifications, Assistant, and Home

**Files:** Create `pages/email/email.js`, `pages/home/home.js`, `components/notifications/notifications.js`, `components/assistant/assistant.js`; modify `legacy-app.js`, browser tests.

**Interfaces:** `createEmail({root,locale,toast,messages,onUnreadChange}) -> Page`; its activation accepts `messageId`. `createNotifications({root,messages,notifications,openEmail}) -> {refresh,dispose}`. `createHome({frame,locale,navigate,activateApp}) -> Page` owns the launchpad's action relocation/inert behavior. `createAssistant({root,dialogs,work,toast}) -> {open,close,dispose}`.

- [ ] Capture baseline compose/reply, unread-count changes, notification tabs, launchpad app switching, and assistant proposal interactions. Confirm the shared topbar actions return from launchpad to their original location.

```js
test('launchpad makes the underlying shell inert', async ({page}) => {
  await boot(page, 'http://127.0.0.1:4173');
  await expect(page.locator('.fbody')).toHaveAttribute('inert','');
  await page.locator('.lp-view').getByRole('button',{name:'Sales Invoice',exact:true}).first().click();
  await expect(page.locator('.fbody')).not.toHaveAttribute('inert','');
});
```

- [ ] Move notification render/badge/tab state at 19470–19705 and email render/selection/composer state at 19783–19943. Both consume the same message objects to preserve unread behavior. Keep email's existing draft-loss and mobile-layout defects out of scope; extraction must not introduce additional changes.
- [ ] Move launchpad functions at 16969–17392 and search-label animation with explicit sidebar callbacks, preserving action-node identity and focus behavior. Move assistant scenario/interaction code at 19993 and its event registrations into its component. No new network integration.
- [ ] Run mail/notifications/home/assistant scenarios and screenshots. Commit `refactor: isolate launchpad and messaging components`.

### Task 10: Compose the shell and page navigation

**Files:** Create `core/navigation.js`, `shell/{shell,sidebar,topbar,menus,search,customize}.js`, `main.js`, `tests/navigation.test.mjs`; modify all page factories and `legacy-app.js`.

**Interfaces:** Complete `createNavigation` and `Page` contracts. `createShell({document,locale,appearance})` returns `{frame,content,side,topbar,dispose}`. Bind navigation-dependent shell handlers only after page creators are registered.

- [ ] Add a navigation unit test proving a blocked leave does not activate the target:

```js
test('a rejected leave keeps the current page active', async () => {
  const calls=[];
  const pages=new Map(['list','record'].map(id => [id,{
    id,roots:[],activate:()=>calls.push(id),deactivate(){},dispose(){}
  }]));
  let allow=true;
  const nav=createNavigation({resolvePage:id=>pages.get(id),
    requestLeave:async()=>allow,showPage(){},onChange(){}});
  assert.equal(await nav.navigate('list'),true);
  allow=false;
  assert.equal(await nav.navigate('record'),false);
  assert.equal(nav.current(),'list');
  assert.deepEqual(calls,['list']);
});
```

Also test first activation, repeated activation using the cached instance, unknown IDs, and overlapping asynchronous leave requests. A newer navigation must invalidate an older unresolved request rather than activating a stale destination.
- [ ] Implement navigation explicitly using cached page instances and a monotonically increasing request ID. Resolve the target before deactivating the current page; await its existing leave decision; verify the request ID; deactivate, attach/show, activate, and notify in order. Do not import page implementations into `core/navigation.js`.
- [ ] Move shell mount/side/topbar/menu/search/customization code to owners and compose the creators in `main.js`. Preserve For You groups, favorites, navigation labels, collapse behavior, search scope shortcuts, and existing explicit fallback mappings. Keep activation of the launchpad's special frame-level root separate from content-host page attachment.
- [ ] Replace `showContentView` calls with the navigation contract, adapting existing guard continuation callbacks into one decision without executing actions twice. Preserve return focus/scroll/selection and ensure every transient menu closes at the same transition points.
- [ ] Run navigation tests and cross-page browser flows. Commit `refactor: compose shared shell and page navigation`.

### Task 11: Restore prototype settings through initialized page interfaces

**Files:** Create `prototype/controls.js`; modify `main.js`, `pages/customers/customers.js`, `core/appearance.js`, `tests/lifecycle.spec.mjs`; delete `prototype/legacy-controls.js` when no callers remain.

**Interfaces:** Produce `readPrototypeState(storage) -> object` and `createPrototypeControls({root,settings,pages})` from the shared contracts. Preserve `skey-proto-state` and `skey-proto-ui` keys and the existing control IDs/value domains.

- [ ] Enable the previously failing customer reload regression. Add fresh-state, malformed JSON, saved light/dark/RTL/density, and customer edit/scroll-layout restoration checks.
- [ ] Move existing controls markup movement, collapse/hide/drag behavior, persistence, and About panel into the controls component. Keep restoring values that are valid existing options; preserve its graceful malformed-storage fallback.
- [ ] Read saved values before rendering. Apply model settings to page interfaces; call DOM-dependent rendering only on initialized roots. Move `syncCustomerPrototypeControls` into `syncPage(id)`. Do not replay arbitrary DOM change handlers before their owning page exists.

```js
// The composition order in main.js, using creator results from previous tasks:
const saved = readPrototypeState(sessionStorage);
appearance.apply(saved);
if (saved['customer-mode']) customers.setMode(saved['customer-mode']);
if (saved['customer-layout']) customers.setLayout(saved['customer-layout']);
const controls = createPrototypeControls({root:document,settings:appearance,
  pages:{invoices,customers}});
await navigation.navigate('launchpad');
controls.syncPage('launchpad');
```

Apply other existing control values through their declared owners in the same phase; map `mode/st/pay/dirty` to invoice operations, `rtl` to locale, appearance controls to appearance, and filter/statistics concepts to list layout operations. This mapping replaces `CONTROL_IDS` event replay; it is not a new settings system.
- [ ] Run reload tests without expected-failure status; require no customer null-root exception. Confirm all other known-defect entries remain unchanged. Commit `fix: restore prototype settings after page initialization`.

### Task 12: Split styles by ownership and remove migration scaffolding

**Files:** Create the component/page CSS files in the ownership table and `styles/{tokens,base,app,overrides}.css`; modify `concepts/app-shell.html`, `main.js`; delete `legacy-app.js`, `styles/legacy-app.css`, temporary extraction tests, and unused global bridges; create `tests/architecture.test.mjs`.

**Interfaces:** The source HTML loads application CSS in explicit original cascade order and starts only `app/main.js` as the module entry. Prototype CSS remains last. No source concatenation re-creates the old shared JavaScript closure.

- [ ] Before splitting CSS, capture the ordered declaration sequence including enclosing media/support conditions from the mechanical checkpoint. Move complete CSS rule blocks to owners; retain order through explicit imports/links. If owner rules are interleaved, keep intentional later patches in `overrides.css` with source provenance rather than silently changing their precedence. `overrides.css` may contain only genuine cross-cutting late overrides, not the original stylesheet under a new name.
- [ ] Replace the inline add-item handler with its equivalent page-owned event binding, after removing the old registration in the same change:

```js
addItemButton.addEventListener('click', () => {
  addItemRow('items-body', 'items-total-qty');
}, {signal: pageAbort.signal});
```

`addItemButton` is the retained Items add control resolved from invoice roots; `pageAbort` is the invoice instance AbortController created on initialization. The behavior test in Task 8 ensures one click adds exactly one row.
- [ ] Account for every entry in `migration-inventory.json`; require one implementation owner and identify intentional bindings that were replaced. Remove the empty legacy orchestrator and temporary bridges after searching HTML, renderer strings, tests, and other repository callers. Preserve any actual external integration entry points with a documented thin adapter rather than silently breaking them.
- [ ] Add structural checks for no classic legacy entry, no unresolved HTML includes in built output, no duplicate IDs in the mounted shell, no page import from shared list/navigation, no circular module imports, and no unresolved migrated inline global handler. Use these to verify architecture, not an arbitrary file-length cap.
- [ ] Run the complete parity suite against `dist/`, focused lifecycle tests, production asset checks, and unit tests. Inspect any stable screenshot differences; do not broaden pixel tolerance. Commit `refactor: finish component styles and remove legacy entry`.

### Task 13: Final verification and developer handoff

**Files:** Create `docs/app-shell-development.md`; update `tests/support/known-defects.md` only with the explicitly fixed lifecycle issue; update plan checkboxes and verification evidence.

**Interfaces:** Document `npm ci`, `npm run dev`, `npm run build`, `npm run test:unit`, `npm run test:browser`; document static hosting of `dist/` without changing remote configuration.

- [ ] Run `npm run build && npm run test:unit && npm run test:browser`. Expected: all enabled checks pass, the lifecycle regression is fixed, and expected visual baselines match. If a scenario cannot run, report the exact missing dependency or permission; do not mark the task complete.
- [ ] Check desktop/mobile/touch, light/dark/high contrast, RTL, reduced motion, repeated navigation, saved settings, filters, and chart cleanup through the scenarios established earlier. Confirm one shell and no new page errors; keep the original chart CDN constraint visible if unavailable in the test environment. Do not substitute a fake chart and claim chart parity.
- [ ] Write the development guide with the actual final paths and commands. Include this page-registration pattern using an existing implementation, not an empty example:

```js
const customerViews = createCustomers(customerDependencies);
pageRegistry.set('customers-list', customerViews.listPage);
pageRegistry.set('customer-record', customerViews.recordPage);
```

Explain where a new page's template, styles, fixtures, navigation mapping, guard, and browser scenario belong, and that shared shell markup must not be copied into a page. `customerDependencies` is the finite dependency object constructed in `main.js` using Task 7's signature; show its actual final values in the guide.
- [ ] Commit `docs: document component app development and parity results`. Hand off the completed branch/diff according to the execution workflow. Report baseline identity, passed checks, the one intentional customer restoration change, remaining known defects, and any unresolved limitations. Do not deploy or merge remotely unless separately authorized.

## Plan self-review

- Spec stages map to Tasks 1–3 (baseline/extraction/assembly), 4–11 (facilities/components/pages/lifecycle), and 12–13 (final styles/parity/handoff).
- One shared shell, native modules, page state retention, template readiness, storage compatibility, and component ownership have explicit contracts and migration tasks.
- The customer restoration fix has a reproduced failing test before the lifecycle change; unrelated audit issues remain separately recorded.
- Both production-shaped serving and baseline/current visual comparisons are required. CSS precedence and invoice's multiple direct DOM roots are explicitly protected.
- Public paths, assets, node/module MIME, missing/cyclic includes, and unsafe source exposure have build/server checks.
- No framework, backend, redesign, new product page, arbitrary line-count target, remote deployment, or replacement shared-state monolith is included.
- All tasks must finish before this refactor is declared complete; the mechanical extraction checkpoint alone is not the deliverable.
