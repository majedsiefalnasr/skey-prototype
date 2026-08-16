# Sales Invoice Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two new self-contained HTML concept prototypes — `concepts/sales-invoice-list.html` and `concepts/sales-invoice-record.html` — each offering 3 switchable UX concepts (plus a Simple/Advanced field-visibility toggle on the record screen), living inside the already-approved `concepts/app-shell.html` chrome.

**Architecture:** Single-file HTML/CSS/JS prototypes, following `concepts/app-shell.html`'s exact conventions: inline `<style>` using its `:root` Atlassian Design System tokens, inline `<script>`, a `.demo-bar` → floating "Prototype controls" kit widget (copied verbatim from app-shell.html, driven by a `.demo-bar` markup block of `<select>`/`<input>` controls), toast/focus-trap helpers copied verbatim. No build step, no dependencies — open directly in a browser.

**Tech Stack:** Plain HTML5, CSS custom properties, vanilla JS (no framework, matches app-shell.html). Verification via `playwright-cli` (open in a real/headless browser, click through states, screenshot).

## Global Constraints

- App shell chrome (topbar, header row/status pill, footer/pager) is **approved and must not change** — reproduce it exactly as it exists in `concepts/app-shell.html`, do not redesign it.
- Every field/section/action found in `Sales_Invoice_Screen_RM.md`, `Sales_Invoice_List_RM.md`, and the live production reference (§2 of the design spec) must exist in **every** concept — concepts differ only in interaction/organization, never in what data is present.
- Reuse `concepts/app-shell.html`'s exact `:root` CSS custom properties (`--ink`, `--muted`, `--surface`, `--accent`, `--st-*` status colors, `--shadow-*`, etc.) and shared classes (`.lbtn`, `.badge`, `.stpill`, `.ibtn`, `.tip`, `.mlist`) — do not invent new colors or a parallel button/badge system.
- Simple mode = RM "High" priority fields only. Advanced mode = Simple + RM "Medium" priority fields. See design spec §3 for the exact field list.
- Real interactivity: tab switching, popover open/close, accordion expand/collapse, Simple/Advanced toggle, concept switching, Mode/Status-driven read-only state, Payment Method add/remove/switch, item grid row add/remove, card-group collapse/expand, advanced search panel open/close.
- Stubbed (toast only, like app-shell.html treats Print): column drag-reorder, drag-to-group, column sort, per-column filter popovers, Export, live calculation math (static representative totals are fine).
- Design spec: `docs/superpowers/specs/2026-08-16-sales-invoice-screens-design.md` — read it before starting; it has the full field inventory (§2), Simple/Advanced split (§3), and concept descriptions (§4-5).

---

## Task 1: Shared shell scaffold for both new files

**Files:**
- Create: `concepts/_shell-scaffold.html` (a temporary reference copy, deleted at the end of Task 6 — see Step 5)
- Read: `concepts/app-shell.html:1-60` (head, `:root`, base reset), `concepts/app-shell.html:4092-4135` (demo-bar shell), `concepts/app-shell.html:5479` (`#toasts`), `concepts/app-shell.html:7918-7990` (focus-trap + toast helpers), `concepts/app-shell.html:9621-10198` (kit widget CSS + JS, About dialog)

**Interfaces:**
- Produces: a documented, copy-ready scaffold block (head/`:root`/reset CSS, `.demo-bar` skeleton, `#toasts` div, kit-widget CSS, `trapFocus`/`releaseFocus`/`toast()` JS, kit-widget JS, About-dialog JS) that Tasks 2 and 4 both start from.

This task doesn't ship a real prototype — it validates the copy-paste plan by building one throwaway file, confirming it renders and the kit widget works, then Tasks 2/4 each copy the validated block into their real file.

- [ ] **Step 1: Copy the head + `:root` tokens + base reset**

Read `concepts/app-shell.html` lines 1-60. Create `concepts/_shell-scaffold.html` starting with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Skey ERP — Shell Scaffold (temp)</title>
    <style>
```

Then paste the exact `:root { ... }` block from `concepts/app-shell.html:8-39` (all `--ink`, `--muted`, `--faint`, `--line`, `--line-2`, `--bg`, `--surface`, `--accent`, `--accent-soft`, `--accent-line`, `--focus`, `--danger`, `--success`, `--st-open-*` through `--st-inac-*`, `--shadow-1`, `--shadow-2`, `--sidebar-w`, `--rail-w`), followed by the `* { box-sizing: border-box; margin: 0; }` and `body { ... }` rules from `concepts/app-shell.html:40-53`.

- [ ] **Step 2: Copy the demo-bar CSS, toasts CSS, and kit-widget CSS**

Read `concepts/app-shell.html` for the `.demo-bar` CSS rules (search the file for `.demo-bar {`), the `.toastwrap`/`.toast` CSS, and the entire kit-widget CSS block at `concepts/app-shell.html:9621-9907` (`#kit`, `#kit .kit-h`, `#kit .kit-b`, `#kit-pill`, `#kit-notes`, and their sub-rules). Paste all of it into `_shell-scaffold.html`'s `<style>` block, then close `</style></head>`.

- [ ] **Step 3: Copy the demo-bar markup, toasts div, and kit/About-dialog JS**

In `<body>`, add a minimal demo-bar with one placeholder control (this gets replaced with real controls in Tasks 2/4):

```html
  <body>
    <div class="demo-bar">
      <div class="grp">
        <label for="placeholder">Placeholder:</label>
        <select id="placeholder" autocomplete="off">
          <option value="a">Option A</option>
        </select>
      </div>
    </div>
    <div class="toastwrap" id="toasts" role="status" aria-live="polite" aria-atomic="false"></div>
    <div style="padding: 40px; text-align: center; color: var(--faint)">Scaffold body placeholder</div>
```

Then paste the focus-trap + toast helper JS from `concepts/app-shell.html:7922-7976` (`FOCUSABLE`, `trapFocus`, `releaseFocus`, the `keydown` Tab-trap listener, `toasts`, `toast`) inside a `<script>` block, followed by the entire kit-widget JS from `concepts/app-shell.html:9909-10198` (the whole `(() => { ... })()` IIFE starting at `const bar = document.querySelector('.demo-bar')` through the closing `})()`).

Close with `</script></body></html>`.

- [ ] **Step 4: Verify the scaffold renders and the kit widget works**

```bash
cd concepts && python3 -m http.server 8940 >/tmp/scaffold-server.log 2>&1 &
```

```bash
playwright-cli open http://localhost:8940/_shell-scaffold.html
playwright-cli screenshot --filename=/tmp/scaffold-check.png
```

Expected: page loads with no console errors, a "Prototype controls" floating panel is visible bottom-left containing the placeholder select, with About/Collapse/Hide buttons.

```bash
playwright-cli click "getByRole('button', { name: 'Collapse' })"
playwright-cli screenshot --filename=/tmp/scaffold-collapsed.png
```

Expected: panel collapses to just its header bar.

- [ ] **Step 5: Clean up test server**

```bash
pkill -f "http.server 8940" 2>/dev/null
rm -f /tmp/scaffold-check.png /tmp/scaffold-collapsed.png /tmp/scaffold-server.log
```

Leave `concepts/_shell-scaffold.html` in place — Tasks 2 and 4 each copy from it, and Task 6 Step 4 deletes it once both real files are verified.

- [ ] **Step 6: Commit**

```bash
git add concepts/_shell-scaffold.html
git commit -m "chore: validate shared shell scaffold for invoice screen prototypes"
```

---

## Task 2: List screen skeleton + Concept A (Data Grid)

**Files:**
- Create: `concepts/sales-invoice-list.html`
- Read: `concepts/_shell-scaffold.html` (Task 1 output), design spec §2 (list fields), §5 (List A description), `Sales_Invoice_List_RM.md` §2-3

**Interfaces:**
- Consumes: scaffold block from Task 1.
- Produces: `concepts/sales-invoice-list.html` with working app-shell chrome (topbar/breadcrumb/footer reproduced from `concepts/app-shell.html`'s `t-top` template and `.phead`/`.fnav` markup), a `#list-concept` select in the demo-bar (`A · Data Grid` / `B · Command List` / `C · Grouped Review Board`, default `a`), and a `renderList(concept)` function later tasks extend with `case 'b':` / `case 'c':` branches. List A is the only concept with real markup in this task; B and C render a placeholder `<div>` until Tasks 3.

- [ ] **Step 1: Build the file skeleton from the scaffold**

Copy `concepts/_shell-scaffold.html` to `concepts/sales-invoice-list.html`. Change `<title>` to `Skey ERP — Sales Invoice List`. Replace the placeholder demo-bar `<div class="grp">` with:

```html
<div class="grp">
  <label for="list-concept">List concept:</label>
  <select id="list-concept" autocomplete="off">
    <option value="a" selected>A · Data Grid</option>
    <option value="b">B · Command List</option>
    <option value="c">C · Grouped Review Board</option>
  </select>
</div>
```

- [ ] **Step 2: Reproduce the app-shell chrome around the content area**

Read `concepts/app-shell.html`'s `<template id="t-top">` (topbar: logo, tenant, search, right-side action icons) and the breadcrumb/header markup pattern used in the invoice record mount (`.phead` with `<nav class="crumbs">` and `<h1>`). Replace the scaffold's placeholder body `<div>` with:

```html
<div class="frame">
  <!-- topbar: paste t-top template content here verbatim from concepts/app-shell.html -->
  <div class="phead">
    <div class="l">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="#">Home</a><span class="sep">›</span><span aria-current="page">Sales Invoice</span>
      </nav>
      <div class="tline"><h1>Sales Invoice</h1></div>
    </div>
    <div class="r">
      <button class="lbtn pri" id="list-add" type="button">
        <svg width="15" height="15" aria-hidden="true"><use href="#i-plus"/></svg> Add
      </button>
    </div>
  </div>
  <div class="canvas" id="list-canvas"></div>
</div>
```

Paste the `<svg>` `<symbol>` icon sprite from `concepts/app-shell.html` (search for `<svg style="display:none"` or similar sprite definition near the top of `<body>`) so `<use href="#i-...">` references resolve.

- [ ] **Step 3: Build Concept A's data grid (List A)**

Add this CSS (near the scaffold's other rules):

```css
.inv-grid-wrap { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; overflow: auto; }
.inv-grid { width: 100%; border-collapse: collapse; font-size: 13px; }
.inv-grid th { text-align: start; padding: 8px 12px; background: var(--line-2); color: var(--muted); font-weight: 600; border-bottom: 1px solid var(--line); white-space: nowrap; }
.inv-grid td { padding: 8px 12px; border-bottom: 1px solid var(--line-2); }
.inv-grid tbody tr:hover { background: var(--accent-soft); cursor: pointer; }
.inv-grid-toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--line); }
.inv-grid-toolbar .grow { flex: 1; }
.inv-group-bar { padding: 8px 12px; color: var(--faint); font-size: 12.5px; border-bottom: 1px solid var(--line); background: var(--bg); }
```

Add JS that renders List A into `#list-canvas` (representative rows — 3-5 static rows is enough, not all 140):

```js
const LIST_COLUMNS = ['Doc. Sequence', 'Doc No.', 'Doc Date', 'Doc Sub-type Name', 'Payment method', 'Customer No.', 'Customer Name'];
const LIST_ROWS = [
  {seq: '001000352026143', no: '143', date: '13/08/2026', subtype: 'عام', pay: 'Cash', custNo: '200002', custName: 'customertest'},
  {seq: '001000352026142', no: '142', date: '13/08/2026', subtype: 'عام', pay: 'Cash', custNo: '200002', custName: 'customertest'},
  {seq: '001000352026140', no: '140', date: '13/08/2026', subtype: 'عام', pay: 'Credit', custNo: '200001', custName: 'العميل الاول'},
];

function renderListA(canvas) {
  canvas.innerHTML =
    '<div class="inv-grid-wrap">' +
      '<div class="inv-grid-toolbar">' +
        '<button class="lbtn out" type="button" onclick="toast({tone:\'ok\',title:\'Search\',body:\'Opens advanced search (see openAdvancedSearch)\'})">' +
          '<svg width="15" height="15" aria-hidden="true"><use href="#i-search"/></svg> Search</button>' +
        '<div class="grow"></div>' +
        '<button class="lbtn out" type="button" onclick="toast({tone:\'ok\',title:\'Columns menu is out of scope here\'})">Columns</button>' +
        '<button class="lbtn out" type="button" onclick="toast({tone:\'ok\',title:\'Export is out of scope here\'})">Export</button>' +
      '</div>' +
      '<div class="inv-group-bar">Drag a column header here to group</div>' +
      '<table class="inv-grid"><thead><tr>' +
        LIST_COLUMNS.map(c => `<th>${c}</th>`).join('') +
      '</tr></thead><tbody>' +
        LIST_ROWS.map(r =>
          `<tr onclick="openInvoiceRecord('${r.no}')">` +
          `<td>${r.seq}</td><td>${r.no}</td><td>${r.date}</td><td>${r.subtype}</td>` +
          `<td>${r.pay}</td><td>${r.custNo}</td><td>${r.custName}</td></tr>`
        ).join('') +
      '</tbody></table>' +
    '</div>';
}

function openInvoiceRecord(no) {
  toast({tone: 'ok', title: `Opens invoice ${no}`, body: 'See sales-invoice-record.html'});
}

function renderList(concept) {
  const canvas = document.getElementById('list-canvas');
  if (concept === 'a') renderListA(canvas);
  else canvas.innerHTML = `<div style="padding:40px;text-align:center;color:var(--faint)">Concept ${concept.toUpperCase()} not built yet</div>`;
}

document.getElementById('list-concept').addEventListener('change', e => renderList(e.target.value));
renderList('a');
```

- [ ] **Step 4: Verify List A renders and row-click works**

```bash
cd concepts && python3 -m http.server 8940 >/tmp/list-server.log 2>&1 &
playwright-cli open http://localhost:8940/sales-invoice-list.html
playwright-cli screenshot --filename=/tmp/list-a.png
```

Expected: topbar + breadcrumb + "Sales Invoice" header + Add button render, below it a data grid with the 7 columns and 3 sample rows, a "Drag a column header here to group" bar above it, Search/Columns/Export buttons in the grid toolbar.

```bash
playwright-cli click "text=143" 
```

Expected: a toast appears saying "Opens invoice 143".

```bash
pkill -f "http.server 8940" 2>/dev/null
rm -f /tmp/list-a.png /tmp/list-server.log
```

- [ ] **Step 5: Commit**

```bash
git add concepts/sales-invoice-list.html
git commit -m "feat: add sales invoice list screen with Concept A (Data Grid)"
```

---

## Task 3: List Concepts B (Command List) and C (Grouped Review Board)

**Files:**
- Modify: `concepts/sales-invoice-list.html`

**Interfaces:**
- Consumes: `renderList(concept)`, `LIST_ROWS`, `openInvoiceRecord(no)`, `toast()` from Task 2.
- Produces: `renderListB(canvas)` and `renderListC(canvas)`, wired into the existing `renderList` switch.

- [ ] **Step 1: Build Concept B — Command List**

Add CSS:

```css
.inv-cmd-search { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); margin-bottom: 10px; color: var(--faint); }
.inv-cmd-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); margin-bottom: 6px; cursor: pointer; }
.inv-cmd-row:hover { border-color: var(--accent-line); background: var(--accent-soft); }
.inv-cmd-row .l { font-size: 13px; }
.inv-cmd-row .r { font-size: 12.5px; color: var(--faint); }
.inv-cmd-chips { display: flex; gap: 6px; margin-bottom: 10px; }
```

Add JS, replacing the `renderList` function's `else` branch with a real `case` for `'b'`:

```js
function renderListB(canvas) {
  canvas.innerHTML =
    '<button type="button" class="inv-cmd-search" onclick="toast({tone:\'ok\',title:\'Opens advanced search\'})" style="width:100%;text-align:start;border:1px solid var(--line);cursor:pointer">' +
      '<svg width="15" height="15" aria-hidden="true"><use href="#i-search"/></svg> Search or jump to invoice #…' +
    '</button>' +
    '<div class="inv-cmd-chips">' +
      '<span class="badge gray">All statuses</span><span class="badge gray">All customers</span>' +
    '</div>' +
    LIST_ROWS.map(r =>
      `<div class="inv-cmd-row" onclick="openInvoiceRecord('${r.no}')">` +
      `<span class="l"><b>#${r.no}</b> · ${r.custName} · ${r.pay}</span>` +
      `<span class="r">${r.date}</span></div>`
    ).join('');
}
```

- [ ] **Step 2: Build Concept C — Grouped Review Board**

Add CSS:

```css
.inv-board-group { margin-bottom: 16px; }
.inv-board-group h3 { font-size: 13px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.inv-board-group h3 .dot { width: 8px; height: 8px; border-radius: 99px; display: inline-block; }
.inv-board-card { padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); margin-bottom: 6px; cursor: pointer; display: flex; justify-content: space-between; }
.inv-board-card:hover { border-color: var(--accent-line); background: var(--accent-soft); }
```

Add JS:

```js
const STATUS_META = {
  posted: {label: 'Posted', color: 'var(--st-post-ink)'},
  pending: {label: 'Pending', color: 'var(--st-pend-ink)'},
  open: {label: 'Open', color: 'var(--st-open-ink)'},
};
function renderListC(canvas) {
  const groups = {posted: LIST_ROWS.slice(0, 2), pending: LIST_ROWS.slice(2)};
  canvas.innerHTML = Object.entries(groups).map(([key, rows]) => {
    if (!rows.length) return '';
    const meta = STATUS_META[key];
    return `<div class="inv-board-group"><h3><span class="dot" style="background:${meta.color}"></span>${meta.label} (${rows.length})</h3>` +
      rows.map(r =>
        `<div class="inv-board-card" onclick="openInvoiceRecord('${r.no}')">` +
        `<span><b>#${r.no}</b> · ${r.custName}</span><span>${r.pay} · ${r.date}</span></div>`
      ).join('') + '</div>';
  }).join('');
}
```

- [ ] **Step 3: Wire both into `renderList`**

Replace the `renderList` function body from Task 2 Step 3 with:

```js
function renderList(concept) {
  const canvas = document.getElementById('list-canvas');
  if (concept === 'a') renderListA(canvas);
  else if (concept === 'b') renderListB(canvas);
  else if (concept === 'c') renderListC(canvas);
}
```

- [ ] **Step 4: Verify all 3 list concepts render and switch correctly**

```bash
cd concepts && python3 -m http.server 8940 >/tmp/list-server2.log 2>&1 &
playwright-cli open http://localhost:8940/sales-invoice-list.html
```

```bash
playwright-cli select "#list-concept" b
playwright-cli screenshot --filename=/tmp/list-b.png
```

Expected: search bar + filter chips + 3 card rows, no table/grid.

```bash
playwright-cli select "#list-concept" c
playwright-cli screenshot --filename=/tmp/list-c.png
```

Expected: "Posted (2)" and "Pending (1)" group headers with colored dots, cards underneath each.

```bash
playwright-cli select "#list-concept" a
playwright-cli screenshot --filename=/tmp/list-a-recheck.png
```

Expected: back to the data grid from Task 2, unchanged.

```bash
pkill -f "http.server 8940" 2>/dev/null
rm -f /tmp/list-b.png /tmp/list-c.png /tmp/list-a-recheck.png /tmp/list-server2.log
```

- [ ] **Step 5: Commit**

```bash
git add concepts/sales-invoice-list.html
git commit -m "feat: add List Concepts B (Command List) and C (Grouped Review Board)"
```

---

## Task 4: Advanced search panel (shared across list concepts)

**Files:**
- Modify: `concepts/sales-invoice-list.html`

**Interfaces:**
- Consumes: `trapFocus`, `releaseFocus` from the scaffold (Task 1/2).
- Produces: `openAdvancedSearch()` / `closeAdvancedSearch()`, wired to every "Search" trigger added in Tasks 2-3 (replace their `toast(...)` stub calls with real calls).

- [ ] **Step 1: Copy the advanced search panel markup and CSS from app-shell.html**

Read `concepts/app-shell.html` for its search overlay markup (search the file for `id="s-open"`, `.swrap`, `.sbox`, or the search-panel dialog opened by `⌘K` / `openSearch()`). Copy that panel's HTML structure and CSS into `sales-invoice-list.html`, adapted to a self-contained `<div id="adv-search-scrim">` overlay with a results list showing invoice-relevant filters (Doc No., Customer, Date range, Status, Payment method) as example filter rows — mirroring app-shell's own search panel's visual structure, not its exact content.

- [ ] **Step 2: Wire open/close**

```js
const advSearchScrim = document.getElementById('adv-search-scrim');
function openAdvancedSearch() {
  advSearchScrim.classList.add('open');
  trapFocus(advSearchScrim.querySelector('.box'));
}
function closeAdvancedSearch() {
  advSearchScrim.classList.remove('open');
  releaseFocus();
}
advSearchScrim.addEventListener('click', e => {
  if (e.target === advSearchScrim || e.target.closest('.adv-search-close')) closeAdvancedSearch();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && advSearchScrim.classList.contains('open')) closeAdvancedSearch();
});
```

- [ ] **Step 3: Replace the 3 stub Search buttons with real calls**

In `renderListA`, `renderListB`, and the chip row added for List C if applicable, change every `onclick="toast({tone:'ok',title:'Opens advanced search'...})"` to `onclick="openAdvancedSearch()"`.

- [ ] **Step 4: Verify search opens and closes from each list concept**

```bash
cd concepts && python3 -m http.server 8940 >/tmp/list-server3.log 2>&1 &
playwright-cli open http://localhost:8940/sales-invoice-list.html
playwright-cli click "getByRole('button', { name: /search/i })"
playwright-cli screenshot --filename=/tmp/adv-search-open.png
```

Expected: search overlay visible with filter rows.

```bash
playwright-cli press Escape
playwright-cli eval "document.getElementById('adv-search-scrim').classList.contains('open')"
```

Expected: `false`.

```bash
pkill -f "http.server 8940" 2>/dev/null
rm -f /tmp/adv-search-open.png /tmp/list-server3.log
```

- [ ] **Step 5: Commit**

```bash
git add concepts/sales-invoice-list.html
git commit -m "feat: wire self-contained advanced search panel into invoice list"
```

---

## Task 5: Record screen skeleton, Mode/Status controls, Simple/Advanced toggle, and Concept A (Guided Tabs)

**Files:**
- Create: `concepts/sales-invoice-record.html`
- Read: `concepts/_shell-scaffold.html`, design spec §2-4, `Sales_Invoice_Screen_RM.md` §3-13

**Interfaces:**
- Consumes: scaffold block from Task 1.
- Produces: `concepts/sales-invoice-record.html` with `#record-concept` select (A/B/C), `#mode`/`#st` selects, a `#mode-toggle` Simple/Advanced segmented control, an `applyMode()`/`applyStatus()` pair driving a `state = {mode, status, viewMode}` object, and `renderRecord()` dispatching to `renderRecordA()` (real) with B/C stubbed as placeholders (built in Task 6).

- [ ] **Step 1: Build the file skeleton and demo-bar controls**

Copy `concepts/_shell-scaffold.html` to `concepts/sales-invoice-record.html`. Set `<title>Skey ERP — Sales Invoice Record</title>`. Replace the placeholder demo-bar with:

```html
<div class="grp">
  <label for="record-concept">Record concept:</label>
  <select id="record-concept" autocomplete="off">
    <option value="a" selected>A · Guided Tabs</option>
    <option value="b">B · Single Flow</option>
    <option value="c">C · Split View</option>
  </select>
</div>
<div class="grp">
  <label for="mode">Mode:</label>
  <select id="mode" autocomplete="off">
    <option value="create">Creating a new invoice</option>
    <option value="record" selected>Viewing a saved invoice</option>
    <option value="edit">Editing a saved invoice</option>
  </select>
</div>
<div class="grp">
  <label for="st">Invoice status:</label>
  <select id="st" autocomplete="off">
    <option value="open">Open — nothing recorded yet</option>
    <option value="pending">Pending (معلق)</option>
    <option value="posted" selected>Posted (مرحل)</option>
    <option value="returned">Returned (مرتجع)</option>
    <option value="canceled">Canceled (ملغي)</option>
    <option value="inactive">Deactivated (موقف)</option>
  </select>
</div>
```

(No "Payment" control — payment method lives in the record itself, per design spec §6.)

- [ ] **Step 2: Reproduce app-shell chrome (topbar + header row + footer/pager)**

Same approach as Task 2 Step 2: paste the `t-top` topbar template content, then build the header row with breadcrumb + `<h1>Sales Invoice 143</h1>` + status pill (paste the `t-pill` template markup from `concepts/app-shell.html:4783-4790`) + Save/Undo buttons on the right, matching `concepts/app-shell.html`'s `.phead` structure exactly. Add the footer/pager row (`.fnav` with pager-mount and record position, matching `concepts/app-shell.html`'s pattern) below the canvas.

Add the Simple/Advanced segmented control next to `<h1>`:

```html
<div class="tline">
  <h1>Sales Invoice 143</h1>
  <div class="segctl" id="mode-toggle" role="group" aria-label="Field detail level">
    <button type="button" class="seg on" data-view="simple">Simple</button>
    <button type="button" class="seg" data-view="advanced">Advanced</button>
  </div>
</div>
```

CSS:

```css
.segctl { display: inline-flex; border: 1px solid var(--line); border-radius: 7px; overflow: hidden; margin-inline-start: 10px; }
.segctl .seg { padding: 4px 12px; font-size: 12.5px; font-weight: 600; color: var(--muted); background: var(--surface); border: none; cursor: pointer; }
.segctl .seg.on { background: var(--accent-soft); color: var(--accent); }
```

- [ ] **Step 3: Wire state (mode, status, viewMode) and status-driven read-only**

```js
const state = {mode: 'record', status: 'posted', viewMode: 'simple'};

function editable() {
  return state.mode !== 'record' && !['posted', 'canceled', 'inactive'].includes(state.status);
}

function applyState() {
  document.querySelectorAll('[data-field]').forEach(el => {
    el.disabled = !editable();
  });
  document.getElementById('lockbanner').hidden = editable() || state.mode === 'create';
}

document.getElementById('mode').addEventListener('change', e => {
  state.mode = e.target.value;
  applyState();
});
document.getElementById('st').addEventListener('change', e => {
  state.status = e.target.value;
  applyState();
});
document.getElementById('mode-toggle').addEventListener('click', e => {
  const btn = e.target.closest('.seg');
  if (!btn) return;
  state.viewMode = btn.dataset.view;
  document.querySelectorAll('#mode-toggle .seg').forEach(b => b.classList.toggle('on', b === btn));
  document.body.classList.toggle('advanced-on', state.viewMode === 'advanced');
});
```

Add a lock banner matching app-shell's pattern (search `concepts/app-shell.html` for `lockbanner`):

```html
<div class="lockbanner" id="lockbanner" hidden>
  <svg width="14" height="14" aria-hidden="true"><use href="#i-lock"/></svg>
  <span>This invoice is posted, so its fields are read-only. Undo the posting to edit it.</span>
</div>
```

- [ ] **Step 4: Add the Simple/Advanced visibility CSS rule**

```css
[data-adv-only] { display: none; }
body.advanced-on [data-adv-only] { display: revert; }
```

Every field/section that's Advanced-only (per design spec §3's list — Mobile No., Address, Beneficiary No., Tax Number, Exchange Rate, Pricing Level, Method Show Price, Expiry, Batch, Free Qty, Available Qty, item Discount, the Other Data/Sub Ledgers/Additional Data tabs, Discount Percent, Discount Including Tax, Sales Charges) gets `data-adv-only` on its wrapping element in Tasks 5-6.

- [ ] **Step 5: Build Concept A — Guided Tabs (Main Data tab, General card)**

```html
<div class="canvas" id="canvas-root">
  <div class="rec-tabs" role="tablist">
    <button class="rec-tab on" data-tab="main" role="tab" aria-selected="true">Main Data</button>
    <button class="rec-tab" data-tab="payment" role="tab" aria-selected="false">Payment method</button>
    <button class="rec-tab" data-tab="other" role="tab" aria-selected="false" data-adv-only>Other Data</button>
    <button class="rec-tab" data-tab="subledgers" role="tab" aria-selected="false" data-adv-only>Sub Ledgers</button>
    <button class="rec-tab" data-tab="additional" role="tab" aria-selected="false" data-adv-only>Additional Data</button>
  </div>
  <div class="rec-tabpanel" data-panel="main">
    <div class="rec-card">
      <button type="button" class="rec-card-hd" aria-expanded="true">General</button>
      <div class="rec-card-body">
        <div class="rec-field"><label>Year <span class="req">*</span></label><input data-field disabled value="2026"></div>
        <div class="rec-field"><label>Operation Unit <span class="req">*</span></label><select data-field><option>2 - lastchance</option></select></div>
        <div class="rec-field"><label>Doc Sub-Type <span class="req">*</span></label><select data-field><option>1 - عام</option></select></div>
        <div class="rec-field"><label>Sequence</label><input data-field disabled value="001000352026143"></div>
        <div class="rec-field"><label>Doc No.</label><input data-field disabled value="143"></div>
        <div class="rec-field"><label>Doc Date <span class="req">*</span></label><input data-field type="date" value="2026-08-13"></div>
        <div class="rec-field"><label>WH No. <span class="req">*</span></label><select data-field><option>201 - المخزن الرئيسي</option></select></div>
      </div>
    </div>
    <!-- Customer card: same .rec-card pattern, fields Customer No.*, Customer Name*, Mobile No. (data-adv-only), Address (data-adv-only), Beneficiary No. (data-adv-only), Tax Number (data-adv-only) -->
    <!-- Currency card: same .rec-card pattern, fields Currency*, Tax Category*, Exchange Rate (data-adv-only), Pricing Level (data-adv-only), Method Show Price (data-adv-only) -->
  </div>
  <!-- payment/other/subledgers/additional panels: built in Task 6 -->
  <!-- items grid + totals + sales charges: built in Task 6, always visible below rec-tabpanel regardless of active tab -->
</div>
```

Build the Customer and Currency cards following the exact same `.rec-card` / `.rec-field` pattern shown for General, using the field lists from design spec §2's Main Data bullet (Customer: Customer No.\*, Customer Name\*, Mobile No., Address, Beneficiary No., Tax Number; Currency: Currency\*, Exchange Rate, Pricing Level, Tax Category\*, Method Show Price). Mark every Advanced-only field's `.rec-field` wrapper with `data-adv-only`.

CSS:

```css
.rec-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--line); margin-bottom: 12px; }
.rec-tab { padding: 8px 14px; font-size: 13px; font-weight: 600; color: var(--muted); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; }
.rec-tab.on { color: var(--accent); border-bottom-color: var(--accent); }
.rec-card { border: 1px solid var(--line); border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
.rec-card-hd { width: 100%; text-align: start; padding: 8px 12px; font-size: 12.5px; font-weight: 700; color: var(--accent); background: var(--line-2); border: none; cursor: pointer; }
.rec-card-body { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 16px; padding: 12px; }
.rec-field label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 3px; }
.rec-field .req { color: var(--danger); }
.rec-field input, .rec-field select { width: 100%; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; font: inherit; }
```

- [ ] **Step 6: Wire tab switching for Concept A**

```js
let recordAInitialized = false;
function renderRecordA() {
  if (recordAInitialized) return;
  recordAInitialized = true;
  document.querySelectorAll('#canvas-root .rec-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#canvas-root .rec-tab').forEach(b => {
        b.classList.toggle('on', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
      document.querySelectorAll('#canvas-root .rec-tabpanel').forEach(p => {
        p.hidden = p.dataset.panel !== btn.dataset.tab;
      });
    });
  });
  document.querySelectorAll('#canvas-root .rec-card-hd').forEach(hd => {
    hd.addEventListener('click', () => {
      const open = hd.getAttribute('aria-expanded') === 'true';
      hd.setAttribute('aria-expanded', String(!open));
      hd.nextElementSibling.hidden = open;
    });
  });
}

function renderRecord(concept) {
  const root = document.getElementById('canvas-root');
  if (concept === 'a') { root.hidden = false; renderRecordA(); }
  else { root.hidden = true; }
}
document.getElementById('record-concept').addEventListener('change', e => renderRecord(e.target.value));
renderRecord('a');
applyState();
```

- [ ] **Step 7: Verify Concept A tabs, cards, status lock, and Simple/Advanced toggle**

```bash
cd concepts && python3 -m http.server 8940 >/tmp/rec-server.log 2>&1 &
playwright-cli open http://localhost:8940/sales-invoice-record.html
playwright-cli screenshot --filename=/tmp/rec-a-simple.png
```

Expected: Main Data tab active, General/Customer/Currency cards visible, no Mobile No./Address/Exchange Rate fields showing (Simple mode default), lock banner visible (status=posted default), Other Data/Sub Ledgers/Additional Data tabs not visible in the tab strip.

```bash
playwright-cli click "text=Advanced"
playwright-cli screenshot --filename=/tmp/rec-a-advanced.png
```

Expected: Mobile No./Address/Exchange Rate fields now visible, Other Data/Sub Ledgers/Additional Data tabs now visible.

```bash
playwright-cli select "#st" open
playwright-cli eval "document.getElementById('lockbanner').hidden"
```

Expected: still `true` (mode is still "record"/View — status alone with mode=record stays read-only per the Mode/Status split in design spec §6; only Edit mode + non-locked status becomes editable). Then:

```bash
playwright-cli select "#mode" edit
playwright-cli eval "document.getElementById('lockbanner').hidden"
```

Expected: `true` (status=open is editable), and:

```bash
playwright-cli eval "document.querySelector('[data-field]').disabled"
```

Expected: `false`.

```bash
pkill -f "http.server 8940" 2>/dev/null
rm -f /tmp/rec-a-simple.png /tmp/rec-a-advanced.png /tmp/rec-server.log
```

- [ ] **Step 8: Commit**

```bash
git add concepts/sales-invoice-record.html
git commit -m "feat: add sales invoice record screen with Concept A (Guided Tabs) and Simple/Advanced mode"
```

---

## Task 6: Record — Payment method (multi-method), Items grid, Totals, Sales Charges, remaining tabs

**Files:**
- Modify: `concepts/sales-invoice-record.html`

**Interfaces:**
- Consumes: `.rec-card`/`.rec-field` CSS, `state`, `editable()`, `applyState()`, `data-adv-only` mechanism from Task 5.
- Produces: `addPaymentMethodRow(containerId, method?, amount?)`, `addItemRow(bodyId, totalId)`, `recalcTotalQty(bodyId, totalId)` — all parameterized by container id so Task 7's Concepts B/C can reuse them for their own grids — plus the Other Data/Sub Ledgers/Additional Data tab panels and the Sales Charges accordion, all always-visible below the tab strip per design spec §2.

- [ ] **Step 1: Build the Payment method tab panel with multi-method support**

```html
<div class="rec-tabpanel" data-panel="payment" hidden>
  <a href="#" class="rec-add-payment" id="add-payment-link">+ Add payment method</a>
  <div id="payment-rows"></div>
</div>
```

```js
const PAYMENT_METHODS = ['Cash', 'Bank', 'Credit Card', 'Cheque', 'Transfer'];
const PAYMENT_EXTRA_FIELDS = {
  Cash: [{label: 'Cash Code', value: '2001 - Main Cash'}],
  Bank: [{label: 'Bank Name', value: ''}, {label: 'Account No.', value: ''}],
  'Credit Card': [{label: 'Card Type', value: ''}, {label: 'Approval No.', value: ''}],
  Cheque: [{label: 'Cheque No.', value: ''}, {label: 'Bank', value: ''}],
  Transfer: [{label: 'Transfer Reference', value: ''}],
};
let paymentRowCount = 0;

function addPaymentMethodRow(containerId = 'payment-rows', method = 'Cash', amount = '') {
  const id = paymentRowCount++;
  const row = document.createElement('div');
  row.className = 'rec-card';
  row.dataset.paymentRow = id;
  row.innerHTML =
    '<div class="rec-card-body">' +
      `<div class="rec-field"><label>Payment Method <span class="req">*</span></label>` +
      `<select data-field data-payment-method>${PAYMENT_METHODS.map(m => `<option${m===method?' selected':''}>${m}</option>`).join('')}</select></div>` +
      `<div class="rec-field"><label>The Amount <span class="req">*</span></label><input data-field value="${amount}"></div>` +
      `<div class="rec-payment-extra"></div>` +
      `<button type="button" class="ibtn rec-remove-payment" aria-label="Remove payment method">✕</button>` +
    '</div>';
  document.getElementById(containerId).appendChild(row);
  renderPaymentExtraFields(row, method);
  row.querySelector('[data-payment-method]').addEventListener('change', e => renderPaymentExtraFields(row, e.target.value));
  row.querySelector('.rec-remove-payment').addEventListener('click', () => row.remove());
}

function renderPaymentExtraFields(row, method) {
  const extra = row.querySelector('.rec-payment-extra');
  extra.innerHTML = (PAYMENT_EXTRA_FIELDS[method] || [])
    .map(f => `<div class="rec-field"><label>${f.label}</label><input data-field value="${f.value}"></div>`)
    .join('');
}

document.getElementById('add-payment-link').addEventListener('click', e => {
  e.preventDefault();
  addPaymentMethodRow('payment-rows');
});
addPaymentMethodRow('payment-rows', 'Cash', '200');
```

- [ ] **Step 2: Build the Other Data, Sub Ledgers, and Additional Data tab panels**

```html
<div class="rec-tabpanel" data-panel="other" hidden data-adv-only>
  <div class="rec-card"><div class="rec-card-body">
    <div class="rec-field" style="grid-column:1/-1"><label>Statement</label><textarea data-field rows="2"></textarea></div>
    <div class="rec-field"><label>Ref. No.</label><input data-field></div>
    <div class="rec-field"><label>Manual No.</label><input data-field></div>
    <div class="rec-field"><label>No. Of Attach.</label><input data-field></div>
  </div></div>
</div>
<div class="rec-tabpanel" data-panel="subledgers" hidden data-adv-only>
  <div class="rec-card"><div class="rec-card-body">
    <div class="rec-field"><label>Cost Center No.</label><select data-field><option>—</option></select></div>
    <div class="rec-field"><label>Sub Ledger2 No.</label><select data-field><option>—</option></select></div>
    <div class="rec-field"><label>Sub Ledger3 No.</label><select data-field><option>—</option></select></div>
  </div></div>
</div>
<div class="rec-tabpanel" data-panel="additional" hidden data-adv-only>
  <div class="rec-card"><div class="rec-card-body">
    <div class="rec-field"><label>Salesperson</label><select data-field><option>—</option></select></div>
    <div class="rec-field"><label>Marketer No.</label><select data-field><option>—</option></select></div>
    <div class="rec-field"><label>Collector</label><select data-field><option>—</option></select></div>
    <div class="rec-field"><label>Emp. Code</label><input data-field></div>
    <div class="rec-field"><label>Driver No.</label><select data-field><option>—</option></select></div>
    <div class="rec-field"><label>Car No.</label><input data-field></div>
    <div class="rec-field"><label>Geo. Location</label><select data-field><option>—</option></select></div>
    <div class="rec-field"><label>Receiver</label><input data-field></div>
    <div class="rec-field"><label>Tax Invoice Type</label><select data-field><option selected>Tax Invoice</option></select></div>
    <div class="rec-field"><label>Tax Accruals Type</label><select data-field><option>—</option></select></div>
    <div class="rec-field"><label>Tax Due Date</label><input data-field type="date"></div>
    <div class="rec-field"><label>Incoming Date</label><input data-field type="date"></div>
    <div class="rec-field"><label><input type="checkbox" data-field> Calculate Tax On Free Qty</label></div>
  </div></div>
</div>
```

- [ ] **Step 3: Build the Items grid (always visible below the tab strip)**

```html
<div class="rec-items">
  <div class="rec-items-hd">
    <b>Items</b>
    <button type="button" class="ibtn" onclick="addItemRow('items-body', 'items-total-qty')" aria-label="Add item"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus"/></svg></button>
  </div>
  <div class="inv-grid-wrap">
    <table class="inv-grid">
      <thead><tr>
        <th></th><th>Item</th><th>UoM</th>
        <th data-adv-only>Expiry Date</th><th data-adv-only>Batch No.</th>
        <th>Qty.</th>
        <th data-adv-only>Free Qty</th><th data-adv-only>Available Qty</th>
        <th>Price</th><th data-adv-only>Discount %</th><th>Tax %</th><th>Tax Amt</th><th>Total</th>
      </tr></thead>
      <tbody id="items-body"></tbody>
    </table>
  </div>
  <div class="rec-total-qty">Total Qty.: <b id="items-total-qty">0</b></div>
</div>
```

```js
let itemRowCount = 0;
/* bodyId/totalId let Concepts B and C (Task 7) reuse this for their own items
   grids, which have their own tbody/total elements since only one concept's
   canvas is visible at a time but all three exist in the DOM simultaneously */
function addItemRow(bodyId, totalId) {
  const id = itemRowCount++;
  const tr = document.createElement('tr');
  tr.dataset.itemRow = id;
  tr.innerHTML =
    '<td><button type="button" class="ibtn rec-remove-item" aria-label="Remove item">✕</button></td>' +
    '<td><input data-field placeholder="Item"></td>' +
    '<td><input data-field placeholder="UoM"></td>' +
    '<td data-adv-only><input data-field placeholder="Expiry"></td>' +
    '<td data-adv-only><input data-field placeholder="Batch"></td>' +
    '<td><input data-field type="number" value="1" class="items-qty"></td>' +
    '<td data-adv-only><input data-field type="number" value="0"></td>' +
    '<td data-adv-only><input data-field disabled placeholder="—"></td>' +
    '<td><input data-field type="number" value="0"></td>' +
    '<td data-adv-only><input data-field type="number" value="0"></td>' +
    '<td><input data-field disabled value="0"></td>' +
    '<td><input data-field disabled value="0"></td>' +
    '<td><input data-field disabled value="0"></td>';
  document.getElementById(bodyId).appendChild(tr);
  tr.querySelector('.rec-remove-item').addEventListener('click', () => { tr.remove(); recalcTotalQty(bodyId, totalId); });
  tr.querySelector('.items-qty').addEventListener('input', () => recalcTotalQty(bodyId, totalId));
  recalcTotalQty(bodyId, totalId);
}
function recalcTotalQty(bodyId, totalId) {
  const qtys = [...document.querySelectorAll(`#${bodyId} .items-qty`)].map(i => Number(i.value) || 0);
  document.getElementById(totalId).textContent = qtys.reduce((a, b) => a + b, 0);
}
addItemRow('items-body', 'items-total-qty');
```

- [ ] **Step 4: Build the Totals block and Sales Charges accordion**

```html
<div class="rec-totals">
  <div class="rec-field"><label>The Amount</label><input data-field disabled value="200"></div>
  <div class="rec-field" data-adv-only><label>Total Items Discount</label><input data-field disabled value="0"></div>
  <div class="rec-field" data-adv-only><label>Discount Percent</label><input data-field value="0"></div>
  <div class="rec-field"><label>Charges Amount</label><input data-field disabled value="0"></div>
  <div class="rec-field" data-adv-only><label>Discount Including Tax</label><input data-field disabled value="0"></div>
  <div class="rec-field"><label>Total Discount</label><input data-field disabled value="0"></div>
  <div class="rec-field"><label>Tax Amt</label><input data-field disabled value="0"></div>
  <div class="rec-field"><label>Net Amount</label><input data-field disabled value="200"></div>
</div>
<div class="rec-card" data-adv-only>
  <button type="button" class="rec-card-hd" aria-expanded="false">Sales Charges</button>
  <div class="rec-card-body" hidden>
    <div class="inv-grid-wrap" style="grid-column:1/-1">
      <table class="inv-grid"><thead><tr><th>Charge</th><th>Amount</th><th></th></tr></thead>
        <tbody><tr><td><input data-field placeholder="Charge type"></td><td><input data-field value="0"></td><td><button type="button" class="ibtn" aria-label="Remove charge">✕</button></td></tr></tbody>
      </table>
    </div>
  </div>
</div>
```

CSS:

```css
.rec-items { margin-bottom: 12px; }
.rec-items-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.rec-total-qty { text-align: end; padding: 6px 12px; font-size: 12.5px; color: var(--success); font-weight: 600; }
.rec-totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 16px; padding: 12px; border: 1px solid var(--line); border-radius: 8px; margin-bottom: 12px; }
.rec-add-payment { display: inline-block; margin-bottom: 10px; font-size: 13px; font-weight: 600; color: var(--accent); }
```

- [ ] **Step 5: Wire the Sales Charges accordion toggle (reuse the `.rec-card-hd` handler from Task 5 Step 6 — it already handles any `.rec-card-hd`, no new code needed)**

Confirm: the `document.querySelectorAll('.rec-card-hd')` listener added in Task 5 Step 6 runs after all cards (including Sales Charges) exist in the DOM, since `renderRecordA()` is called once after the full markup — including Items/Totals/Sales Charges from this task — is in place. No code change needed; this step is a verification-only checkpoint before Step 6.

- [ ] **Step 6: Verify multi-payment-method, item add/remove, and Sales Charges expand**

```bash
cd concepts && python3 -m http.server 8940 >/tmp/rec-server2.log 2>&1 &
playwright-cli open http://localhost:8940/sales-invoice-record.html
playwright-cli click "text=Payment method"
playwright-cli click "text=+ Add payment method"
playwright-cli eval "document.querySelectorAll('[data-payment-row]').length"
```

Expected: `2`.

```bash
playwright-cli click "text=Main Data"
playwright-cli eval "document.querySelectorAll('#items-body tr').length"
```

Expected: `1` (from `addItemRow('items-body', 'items-total-qty')` called once at init).

```bash
playwright-cli click "getByRole('button', { name: 'Add item' })"
playwright-cli eval "document.querySelectorAll('#items-body tr').length"
```

Expected: `2`.

```bash
playwright-cli click "text=Advanced"
playwright-cli click "text=Sales Charges"
playwright-cli screenshot --filename=/tmp/rec-charges.png
```

Expected: Sales Charges card expands showing a mini-grid with Charge/Amount columns.

```bash
pkill -f "http.server 8940" 2>/dev/null
rm -f /tmp/rec-charges.png /tmp/rec-server2.log
```

- [ ] **Step 7: Commit**

```bash
git add concepts/sales-invoice-record.html
git commit -m "feat: add multi-payment-method, items grid, totals, and remaining tabs to record Concept A"
```

---

## Task 7: Record Concepts B (Single Flow) and C (Split View)

**Files:**
- Modify: `concepts/sales-invoice-record.html`

**Interfaces:**
- Consumes: `PAYMENT_METHODS`, `PAYMENT_EXTRA_FIELDS`, `addPaymentMethodRow`, `addItemRow`, `state`, `editable()`, `data-adv-only` mechanism, the Additional/Other/Sub Ledgers field lists from Task 6.
- Produces: `renderRecordB()`, `renderRecordC()`, wired into `renderRecord()`'s dispatch (replacing the `else { ... 'not built yet' }` branch from Task 5 Step 6).

- [ ] **Step 1: Build Concept B — Single Flow markup**

```html
<div class="canvas" id="canvas-root-b" hidden>
  <div class="recb-header">
    <div class="rec-field"><label>Customer <span class="req">*</span></label><input data-field placeholder="customertest"></div>
    <div class="rec-field"><label>Currency <span class="req">*</span></label><select data-field><option>EGP</option></select></div>
    <div class="rec-field"><label>WH No. <span class="req">*</span></label><select data-field><option>201 - المخزن الرئيسي</option></select></div>
    <div class="rec-field"><label>Doc Date <span class="req">*</span></label><input data-field type="date" value="2026-08-13"></div>
  </div>
  <div class="rec-items">
    <div class="rec-items-hd">
      <b>Items</b>
      <button type="button" class="ibtn" onclick="addItemRow('items-body-b', 'items-total-qty-b')" aria-label="Add item"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus"/></svg></button>
    </div>
    <div class="inv-grid-wrap">
      <table class="inv-grid">
        <thead><tr>
          <th></th><th>Item</th><th>UoM</th>
          <th data-adv-only>Expiry Date</th><th data-adv-only>Batch No.</th>
          <th>Qty.</th>
          <th data-adv-only>Free Qty</th><th data-adv-only>Available Qty</th>
          <th>Price</th><th data-adv-only>Discount %</th><th>Tax %</th><th>Tax Amt</th><th>Total</th>
        </tr></thead>
        <tbody id="items-body-b"></tbody>
      </table>
    </div>
    <div class="rec-total-qty">Total Qty.: <b id="items-total-qty-b">0</b></div>
  </div>
  <div class="recb-popover-triggers">
    <button type="button" class="lbtn out" data-popover="payment">💳 Payment</button>
    <button type="button" class="lbtn out" data-popover="other" data-adv-only>📋 Other Data</button>
    <button type="button" class="lbtn out" data-popover="subledgers" data-adv-only>🏷 Sub Ledgers</button>
    <button type="button" class="lbtn out" data-popover="additional" data-adv-only>➕ Additional Data</button>
  </div>
  <div class="rec-totals"><!-- same totals structure as Task 6 Step 4, no Sales Charges accordion here — it opens as a popover instead, data-popover="charges" added to the trigger row --></div>
</div>
<div class="recb-popover-scrim" id="recb-popover-scrim">
  <div class="recb-popover box" role="dialog" aria-modal="true">
    <div class="recb-popover-hd"><b id="recb-popover-title"></b><button type="button" class="ibtn" aria-label="Close" id="recb-popover-close">✕</button></div>
    <div class="recb-popover-body" id="recb-popover-body"></div>
  </div>
</div>
```

CSS:

```css
.recb-header { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 10px 0; margin-bottom: 12px; border-bottom: 1px solid var(--line); }
.recb-popover-triggers { display: flex; gap: 8px; margin: 12px 0; }
.recb-popover-scrim { position: fixed; inset: 0; background: #0000004d; display: none; align-items: center; justify-content: center; z-index: 90; }
.recb-popover-scrim.open { display: flex; }
.recb-popover { width: min(560px, 92vw); max-height: 80vh; overflow: auto; background: var(--surface); border-radius: 10px; box-shadow: var(--shadow-2); }
.recb-popover-hd { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--line); }
.recb-popover-body { padding: 16px; }
```

- [ ] **Step 2: Wire Concept B's popovers, reusing Task 6's field content**

```js
const RECB_POPOVER_CONTENT = {
  payment: () => `<a href="#" id="recb-add-payment">+ Add payment method</a><div id="recb-payment-rows"></div>`,
  other: () => document.querySelector('[data-panel="other"] .rec-card-body').outerHTML,
  subledgers: () => document.querySelector('[data-panel="subledgers"] .rec-card-body').outerHTML,
  additional: () => document.querySelector('[data-panel="additional"] .rec-card-body').outerHTML,
};

let recordBInitialized = false;
function renderRecordB() {
  document.getElementById('canvas-root').hidden = true;
  document.getElementById('canvas-root-b').hidden = false;
  if (recordBInitialized) return;
  recordBInitialized = true;
  addItemRow('items-body-b', 'items-total-qty-b');
  document.querySelectorAll('#canvas-root-b [data-popover]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.popover;
      document.getElementById('recb-popover-title').textContent = btn.textContent.trim();
      document.getElementById('recb-popover-body').innerHTML = RECB_POPOVER_CONTENT[key] ? RECB_POPOVER_CONTENT[key]() : '';
      document.getElementById('recb-popover-scrim').classList.add('open');
      trapFocus(document.querySelector('.recb-popover'));
      if (key === 'payment') {
        addPaymentMethodRow('recb-payment-rows', 'Cash', '200');
        document.getElementById('recb-add-payment').addEventListener('click', e => {
          e.preventDefault();
          addPaymentMethodRow('recb-payment-rows');
        });
      }
    });
  });
  document.getElementById('recb-popover-close').addEventListener('click', () => {
    document.getElementById('recb-popover-scrim').classList.remove('open');
    releaseFocus();
  });
}
```

- [ ] **Step 3: Build Concept C — Split View markup**

```html
<div class="canvas recc-split" id="canvas-root-c" hidden>
  <aside class="recc-summary">
    <div class="rec-field"><label>Customer</label><div class="recc-readonly">customertest</div></div>
    <div class="rec-field"><label>Payment</label><div class="recc-readonly">Cash · 200 EGP</div></div>
    <div class="recc-net">Net: <b>200 EGP</b></div>
  </aside>
  <div class="recc-detail">
    <div class="rec-card"><button type="button" class="rec-card-hd" aria-expanded="true">Main Data</button><div class="rec-card-body"><!-- General/Customer/Currency fields, same pattern as Task 5 --></div></div>
    <div class="rec-items">
      <div class="rec-items-hd">
        <b>Items</b>
        <button type="button" class="ibtn" onclick="addItemRow('items-body-c', 'items-total-qty-c')" aria-label="Add item"><svg width="15" height="15" aria-hidden="true"><use href="#i-plus"/></svg></button>
      </div>
      <div class="inv-grid-wrap">
        <table class="inv-grid">
          <thead><tr>
            <th></th><th>Item</th><th>UoM</th>
            <th data-adv-only>Expiry Date</th><th data-adv-only>Batch No.</th>
            <th>Qty.</th>
            <th data-adv-only>Free Qty</th><th data-adv-only>Available Qty</th>
            <th>Price</th><th data-adv-only>Discount %</th><th>Tax %</th><th>Tax Amt</th><th>Total</th>
          </tr></thead>
          <tbody id="items-body-c"></tbody>
        </table>
      </div>
      <div class="rec-total-qty">Total Qty.: <b id="items-total-qty-c">0</b></div>
    </div>
    <div class="rec-card"><button type="button" class="rec-card-hd" aria-expanded="true">Payment method</button><div class="rec-card-body" id="recc-payment-rows"></div></div>
    <div class="rec-card" data-adv-only><button type="button" class="rec-card-hd" aria-expanded="false">Other Data</button><div class="rec-card-body" hidden></div></div>
    <div class="rec-card" data-adv-only><button type="button" class="rec-card-hd" aria-expanded="false">Sub Ledgers</button><div class="rec-card-body" hidden></div></div>
    <div class="rec-card" data-adv-only><button type="button" class="rec-card-hd" aria-expanded="false">Additional Data</button><div class="rec-card-body" hidden></div></div>
  </div>
</div>
```

CSS:

```css
.recc-split { display: flex; gap: 16px; align-items: flex-start; }
.recc-summary { width: 220px; flex: none; position: sticky; top: 0; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: var(--surface); }
.recc-readonly { font-size: 13px; padding: 4px 0; }
.recc-net { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); font-size: 14px; color: var(--accent); }
.recc-detail { flex: 1; min-width: 0; }
```

- [ ] **Step 4: Wire Concept C's accordion (reuse the same `.rec-card-hd` pattern) and dispatch both concepts in `renderRecord`**

```js
function renderRecordC() {
  document.getElementById('canvas-root').hidden = true;
  document.getElementById('canvas-root-c').hidden = false;
  document.querySelectorAll('#canvas-root-c .rec-card-hd').forEach(hd => {
    hd.addEventListener('click', () => {
      const open = hd.getAttribute('aria-expanded') === 'true';
      hd.setAttribute('aria-expanded', String(!open));
      hd.nextElementSibling.hidden = open;
    });
  });
}

function renderRecord(concept) {
  document.getElementById('canvas-root').hidden = true;
  document.getElementById('canvas-root-b').hidden = true;
  document.getElementById('canvas-root-c').hidden = true;
  if (concept === 'a') { document.getElementById('canvas-root').hidden = false; renderRecordA(); }
  else if (concept === 'b') renderRecordB();
  else if (concept === 'c') renderRecordC();
  applyState();
}
```

- [ ] **Step 5: Verify Concept B popovers and Concept C split layout**

```bash
cd concepts && python3 -m http.server 8940 >/tmp/rec-server3.log 2>&1 &
playwright-cli open http://localhost:8940/sales-invoice-record.html
playwright-cli select "#record-concept" b
playwright-cli screenshot --filename=/tmp/rec-b.png
```

Expected: compact 4-field header row, items grid dominating, 4 popover-trigger buttons below it, no tab strip visible.

```bash
playwright-cli click "text=💳 Payment"
playwright-cli screenshot --filename=/tmp/rec-b-popover.png
```

Expected: modal popover centered over the page showing "Add payment method" link.

```bash
playwright-cli press Escape
playwright-cli select "#record-concept" c
playwright-cli screenshot --filename=/tmp/rec-c.png
```

Expected: left summary rail (Customer/Payment/Net) with items+cards in a wider right column, both visible side by side.

```bash
pkill -f "http.server 8940" 2>/dev/null
rm -f /tmp/rec-b.png /tmp/rec-b-popover.png /tmp/rec-c.png /tmp/rec-server3.log
```

- [ ] **Step 6: Commit**

```bash
git add concepts/sales-invoice-record.html
git commit -m "feat: add record Concepts B (Single Flow) and C (Split View)"
```

---

## Task 8: Cross-concept verification pass and cleanup

**Files:**
- Modify: `concepts/sales-invoice-list.html`, `concepts/sales-invoice-record.html`
- Delete: `concepts/_shell-scaffold.html`
- Modify: `index.html` (add links to the two new prototypes, matching its existing `concepts/app-shell.html` link pattern)

**Interfaces:**
- Consumes: everything from Tasks 1-7.
- Produces: two finished, linked prototype files; no leftover scaffold file.

- [ ] **Step 1: Full click-through of every List concept × Search combination**

```bash
cd concepts && python3 -m http.server 8940 >/tmp/final-server.log 2>&1 &
playwright-cli open http://localhost:8940/sales-invoice-list.html
```

For each of `a`, `b`, `c`:
```bash
playwright-cli select "#list-concept" a
playwright-cli click "getByRole('button', { name: /search/i })"
playwright-cli press Escape
```
Expected each time: no console errors (`playwright-cli console` should show none beyond the pre-existing favicon 404).

- [ ] **Step 2: Full click-through of every Record concept × Mode × Status × Simple/Advanced combination**

```bash
playwright-cli goto http://localhost:8940/sales-invoice-record.html
```

For each `concept` in `a, b, c`, each `mode` in `create, record, edit`, each `viewMode` in `simple, advanced`:
```bash
playwright-cli select "#record-concept" <concept>
playwright-cli select "#mode" <mode>
playwright-cli click "text=<Simple|Advanced>"
```
Expected: no console errors, page doesn't throw (check via `playwright-cli console` after each combination — 27 combinations total, batch a few `console` checks rather than one per combination if time-constrained, but check at least one full pass per concept).

- [ ] **Step 3: Verify data completeness against the design spec**

Read `docs/superpowers/specs/2026-08-16-sales-invoice-screens-design.md` §2 field inventory. For each field/section listed, grep both new files to confirm it appears at least once:

```bash
for field in "Beneficiary No" "Tax Number" "Exchange Rate" "Pricing Level" "Method Show Price" "Batch No" "Free Qty" "Available Qty" "Statement" "Ref. No" "Manual No" "Cost Center No" "Sub Ledger2 No" "Sub Ledger3 No" "Salesperson" "Marketer No" "Collector" "Emp. Code" "Driver No" "Car No" "Geo. Location" "Receiver" "Tax Invoice Type" "Tax Accruals Type" "Tax Due Date" "Incoming Date" "Calculate Tax On Free Qty" "Sales Charges"; do
  grep -q "$field" concepts/sales-invoice-record.html && echo "OK: $field" || echo "MISSING: $field"
done
```

Expected: every line prints `OK:`. If any prints `MISSING:`, go back to the relevant Task 5-7 step and add the field before continuing.

- [ ] **Step 4: Delete the scaffold file**

```bash
rm concepts/_shell-scaffold.html
```

- [ ] **Step 5: Link both prototypes from the project index**

Read `index.html`'s existing link block for `concepts/app-shell.html` (search for `href="concepts/app-shell.html"`). Add two matching entries immediately after it, same markup pattern, pointing to `concepts/sales-invoice-list.html` and `concepts/sales-invoice-record.html`.

- [ ] **Step 6: Final screenshot set for manual review**

```bash
playwright-cli goto http://localhost:8940/sales-invoice-list.html
playwright-cli screenshot --filename=/tmp/final-list-a.png
playwright-cli goto http://localhost:8940/sales-invoice-record.html
playwright-cli screenshot --filename=/tmp/final-record-a.png
pkill -f "http.server 8940" 2>/dev/null
```

Send both screenshots to the user for final visual confirmation before considering this plan complete.

- [ ] **Step 7: Commit**

```bash
git add concepts/sales-invoice-list.html concepts/sales-invoice-record.html index.html
git rm concepts/_shell-scaffold.html
git commit -m "chore: link invoice prototypes from index, remove scaffold, verify field completeness"
```
