# Invoice Shell-Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Sales Invoice List and Record content out of the two standalone files (`concepts/sales-invoice-list.html`, `concepts/sales-invoice-record.html`) and into `concepts/app-shell.html`'s one real, existing shell instance — using its actual sidebar, topbar, header (`.phead`), and footer (`.fnav`) components, not reproductions of them — then delete the two standalone files.

**Architecture:** `concepts/app-shell.html` mounts exactly one `.design` section with one shared shell (sidebar + topbar + `.content`). `.content` currently holds two swappable children (`body-tpl`'s record page, `email-tpl`'s email view) toggled via `toggleEmailView(show)`, which sets the `hidden` attribute on `.content`'s direct children. This plan adds a third child (a `list-tpl` for the List view) and generalizes the two-way toggle into a three-way `showContentView('record' | 'email' | 'list')`. Record Concept A's content replaces the existing `.canvas` placeholder ("Invoice form (out of scope)"); Concepts B/C become alternate `.canvas` content swapped by a `#record-concept` Prototype-controls select. The List view gets a new `.phead`/`.canvas`/`.fnav` block (reusing the same classes/components the Record view already uses) with its own `#list-concept` select for its 3 concepts. `setNavCurrent` gains one branch: `label === 'Sales Invoice'` → show the list view; every other label → show the record view (matching today's implicit fallback).

**Tech Stack:** Plain HTML5, CSS custom properties, vanilla JS — no build step, no framework, matching `concepts/app-shell.html`'s existing conventions exactly. Verification via `playwright-cli`.

## Global Constraints

- `concepts/app-shell.html`'s existing sidebar, topbar (app switcher, tenant+year, search, AI Assistant, notifications, user menu), toasts, focus-trap, kit/Prototype-controls widget, and `:root` design tokens are untouched — they already work and are shared automatically once List/Record content lives inside the one existing `.design` mount. Do not copy, rebuild, or re-verify any of these.
- The ported Record/List content must use app-shell.html's **real** components, not the standalone files' hand-reproductions: real `.phead` (breadcrumb/`<h1>`/`.pill-mount`/Save-Undo — app-shell.html:4865-4888), real `.fnav`/`.pager-mount` (app-shell.html:4890-4894, `t-pager` template at 4760-4780), real `t-pill` status pill (app-shell.html:4783-4790), real `.segctl` component (app-shell.html:2112-2130 — plain `<button aria-pressed="true|false">` children, NOT the standalone record file's custom `.seg`/`.seg.on` classes, which must be dropped).
- Content-view switching uses the `hidden`-attribute-on-`.content`-children pattern already established by `toggleEmailView` (app-shell.html:8840-8846) — generalized to three states, not replaced with a different mechanism (no new routing library, no CSS class-based visibility system).
- `setNavCurrent` (app-shell.html:6628-6648) keeps its existing highlighting behavior unchanged; only a content-view call is added. `navCurrentLabel` (app-shell.html:6627, already defaults to `'Sales Invoice'`) is not renamed or restructured.
- Every field/section from the two source files' RM-derived content (already reviewed across 3 rounds in the prior work) carries over unchanged — this plan moves markup/JS, it does not redesign fields or re-litigate UX decisions already made.
- The icon sprite already in `concepts/app-shell.html` (symbols `i-first`/`i-prev`/`i-next`/`i-last`/`i-plus`/`i-search`/`i-caret`/`i-lock`/`i-save`/`i-undo`/etc., lines ~4139-4599) already contains every icon id the ported content needs — no new `<symbol>` definitions are added.
- `concepts/sales-invoice-list.html` and `concepts/sales-invoice-record.html` are deleted only in the final task, after their content is fully ported and verified working inside `concepts/app-shell.html`.
- Design spec: `docs/superpowers/specs/2026-08-17-invoice-shell-port-design.md` — read before starting.

---

## Task 1: Generalize the content-view switch and wire the List nav-item

**Files:**
- Modify: `concepts/app-shell.html`

**Interfaces:**
- Produces: `showContentView(name)` where `name` is `'record' | 'email' | 'list'`, replacing the current boolean `toggleEmailView(show)`. Later tasks (2, 3) rely on this function existing and on `.content` having exactly 3 direct children by the time they run: the record-page's top-level elements (unwrapped siblings), `<div class="email-view">`, and a new `<div class="list-view">`.

This task only touches the switching mechanism and nav wiring — it does not yet add the List view's actual content (Task 2 does that). After this task, selecting "Sales Invoice" in the sidebar will call `showContentView('list')` against an empty/placeholder list-view div — verify that placeholder swap works before building real content on top of it.

- [ ] **Step 1: Read the current `toggleEmailView` and its call sites**

Read `concepts/app-shell.html:8840-8846` (the function) and confirm the call sites via search: `openEmailView` (~8975-8980), `closeEmailView` (~8981-8983), and the `.email-back` click listener (~8984-8989). Also read `setNavCurrent` at `concepts/app-shell.html:6626-6648` in full.

- [ ] **Step 2: Add a placeholder `list-tpl` template next to `email-tpl`**

Find `email-tpl`'s closing `</template>` (around `concepts/app-shell.html:4930`, immediately after `body-tpl` at 4850-4897 and before whatever comes next). Insert a new sibling template immediately after `email-tpl`'s `</template>`:

```html
    <template class="list-tpl">
      <div class="list-view" hidden></div>
    </template>
```

(Task 2 fills the inside of `.list-view` with real content — this step only establishes the template and its swap target so Step 4's mount-loop change has something to clone.)

- [ ] **Step 3: Replace `toggleEmailView` with `showContentView`**

Replace the function at `concepts/app-shell.html:8840-8846`:

```js
function toggleEmailView(show) {
  const content = document.querySelector('.content')
  ;[...content.children].forEach(el => {
    if (!el.classList.contains('email-view')) el.hidden = show
  })
  content.querySelector('.email-view').hidden = !show
}
```

with:

```js
/* .content holds 3 swappable views as direct children: the record page's
   top-level elements (unwrapped: .arow/.phead/.canvas/.fnav), .email-view,
   and .list-view. Exactly one is ever un-hidden at a time. */
function showContentView(name) {
  const content = document.querySelector('.content')
  const emailView = content.querySelector('.email-view')
  const listView = content.querySelector('.list-view')
  const isEmail = name === 'email'
  const isList = name === 'list'
  emailView.hidden = !isEmail
  listView.hidden = !isList
  ;[...content.children].forEach(el => {
    if (el === emailView || el === listView) return
    el.hidden = isEmail || isList
  })
}
```

Then find every call site of `toggleEmailView(true)` and `toggleEmailView(false)` (via `openEmailView`/`closeEmailView`, and the `.email-back` listener — re-check exact lines since Step 2 shifted them down by ~4 lines) and replace: `toggleEmailView(true)` → `showContentView('email')`, `toggleEmailView(false)` → `showContentView('record')`.

- [ ] **Step 4: Clone `list-tpl` into `.content` in the mount loop**

In the mount loop, find the two existing `content.append(...)` lines (originally `concepts/app-shell.html:7190-7191`, re-check exact line numbers after Steps 2-3's edits):

```js
content.append(d.querySelector('.body-tpl').content.cloneNode(true))
content.append(d.querySelector('.email-tpl').content.cloneNode(true))
```

Add immediately after:

```js
content.append(d.querySelector('.list-tpl').content.cloneNode(true))
```

- [ ] **Step 5: Wire `setNavCurrent` to switch content view by label**

In `setNavCurrent` (`concepts/app-shell.html:6628-6648`, re-check exact lines after prior edits), add one line right after the existing `closeEmailView()` call is replaced (Step 3 already turned that literal call into whatever it becomes — `closeEmailView()` itself still exists as a function calling `showContentView('record')`, so leave that call as-is) — add a new line immediately after it:

```js
const setNavCurrent = (root, label) => {
  navCurrentLabel = label
  closeEmailView() /* any real navigation leaves the email view, same as it would leave any other page */
  showContentView(label === 'Sales Invoice' ? 'list' : 'record')
  const frame = root.closest('.frame')
  // ...rest unchanged
```

(Only the new `showContentView(...)` line is added; everything else in the function body stays exactly as it is today.)

- [ ] **Step 6: Verify the placeholder swap works**

```bash
cd concepts && python3 -m http.server 8950 >/tmp/shell-port-server.log 2>&1 &
playwright-cli open http://localhost:8950/app-shell.html
playwright-cli screenshot --filename=/tmp/shell-port-default.png
```

Expected: page loads exactly as before (record view showing, "Invoice form (out of scope)" canvas), no console errors beyond the pre-existing favicon 404.

```bash
playwright-cli click "getByText('Sales Invoice', { exact: true })"
playwright-cli screenshot --filename=/tmp/shell-port-list-empty.png
```

Expected: the record view's `.phead`/`.canvas`/`.fnav` all disappear (hidden), and an empty area where `.list-view` now shows (it has no content yet — this is expected, Task 2 fills it). No console errors.

```bash
playwright-cli click "getByLabel('Add to Favorites')"
```

(or click any other sidebar nav item with a real `dataset.label` — pick one from the visible sidebar tree, e.g. "Customers")

```bash
playwright-cli screenshot --filename=/tmp/shell-port-back-to-record.png
```

Expected: clicking a different nav item switches back to showing the record view's `.phead`/`.canvas`/`.fnav` (since `showContentView('record')` is the fallback for any label other than "Sales Invoice") — confirms the 3-way switch works both directions.

```bash
pkill -f "http.server 8950" 2>/dev/null
rm -f /tmp/shell-port-default.png /tmp/shell-port-list-empty.png /tmp/shell-port-back-to-record.png /tmp/shell-port-server.log
```

- [ ] **Step 7: Commit**

```bash
git add concepts/app-shell.html
git commit -m "feat: generalize content-view switch to record/email/list, wire Sales Invoice nav to list view"
```

---

## Task 2: Port the List view's chrome and Concept A (Data Grid)

**Files:**
- Modify: `concepts/app-shell.html`
- Read: `concepts/sales-invoice-list.html` (source content to port, not modified — deleted in Task 6)

**Interfaces:**
- Consumes: `showContentView`, `.list-view` template slot from Task 1.
- Produces: `.list-view`'s real content — a `.phead` (breadcrumb "Home › Sales Invoice", `<h1>Sales Invoice</h1>`, "+ Add" action), a `#list-concept` Prototype-controls select, a `#list-canvas` div, and List Concept A's data-grid rendering (`renderListA`, `LIST_ROWS`, `renderList` dispatcher — B/C are Task 3's job, stub them for now exactly like the original build's Task 2 did). A working `.fnav`/pager footer using app-shell.html's real `t-pager` template via `.pager-mount` (NOT the standalone list file's hand-built `.fnav`/`.pager`/`.pg-*` CSS, which gets left behind).

- [ ] **Step 1: Add the List-view CSS**

Read `concepts/sales-invoice-list.html:916-1000` (List Concept A/B/C CSS: `.inv-grid-wrap`, `.inv-grid`, `.inv-grid-toolbar`, `.inv-board-toolbar`, `.inv-group-bar`, `.badge` rules, `.inv-cmd-*`, `.inv-board-*`) and `concepts/sales-invoice-list.html:1001-1152` (advanced-search overlay CSS — this is genuinely new content the standalone file built, not a reproduction, so it ports as-is). Copy both blocks verbatim into `concepts/app-shell.html`'s first `<style>` block, immediately before its closing `</style>` (currently `concepts/app-shell.html:4090` — re-check after Task 1's edits shifted nothing in this range, Task 1 only touched later parts of the file).

Do NOT copy `concepts/sales-invoice-list.html:483-915` (the "app-shell chrome (reproduced from concepts/app-shell.html)" block — this is exactly the reproduction this whole plan exists to eliminate; app-shell.html already has its real equivalents).

- [ ] **Step 2: Build the List view's `.phead`, canvas, and real `.fnav`**

Inside the new `<div class="list-view" hidden>` (from Task 1 Step 2), add:

```html
<div class="list-view" hidden>
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
  <div class="fnav">
    <span class="list-pager-mount"></span>
    <span class="pos" aria-live="polite">1 of 14 pages · 140 items</span>
  </div>
</div>
```

This reuses the exact `.phead`/`.crumbs`/`.tline`/`.lbtn`/`.canvas`/`.fnav` classes app-shell.html's real record `.phead`/`.fnav` already use (verified identical structure at `concepts/app-shell.html:4865-4894`) — the List view's header/footer are now built from the same components, not new ones. `list-pager-mount` (not `pager-mount`, to avoid colliding with the record view's own mount point once both exist in the same `.content`) will be filled with a `t-pager` clone in Step 3.

- [ ] **Step 3: Wire the List pager mount and the record `.fnav`'s existing behavior alongside it**

In the mount loop (same area as Task 1 Step 4's edit), find the existing mount-filling lines:

```js
d.querySelectorAll('.pager-mount').forEach(m => m.append(T('t-pager')))
```

Add a parallel line immediately after it:

```js
d.querySelectorAll('.list-pager-mount').forEach(m => m.append(T('t-pager')))
```

This reuses the exact same `t-pager` template (`concepts/app-shell.html:4760-4780`) the record view already uses — same first/prev/input/next/last markup, same visual component, just a second independent instance for the list.

- [ ] **Step 4: Add the `#list-concept` Prototype-controls select**

In `concepts/app-shell.html`'s `.demo-bar` (starts `concepts/app-shell.html:4093`), add a new `.grp` block matching the existing `#mode`/`#st` pattern exactly, placed as the first `.grp` (before `Mode:`):

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

- [ ] **Step 5: Port `LIST_ROWS`, `renderListA`, and a stub `renderList` dispatcher**

Read `concepts/sales-invoice-list.html:2278-2331` (`LIST_ROWS` data array through `renderListA`). Copy both verbatim into a new `<script>` section in `concepts/app-shell.html`, placed near the end of the file's main script block (find where other page-specific render functions live, or add as a new block just before the final closing `</script>` of the main script — search for the last `</script>` before the kit-widget's own separate script tag to find the right spot).

Change every reference to `#list-canvas` in the copied code to stay as `#list-canvas` (unchanged — the id is the same). Change every reference to `toast(...)` to stay unchanged (app-shell.html already has its own `toast()` helper — confirm it exists via `grep -n "const toast = " concepts/app-shell.html` before assuming this, and if app-shell.html's toast helper has a different signature, adapt the calls to match app-shell.html's actual signature, not the standalone file's).

Add a stub dispatcher (B/C come in Task 3):

```js
function openInvoiceRecord(no) {
  showContentView('record')
}
function renderList(concept) {
  const canvas = document.getElementById('list-canvas')
  if (concept === 'a') renderListA(canvas)
  else canvas.innerHTML = `<div style="padding:40px;text-align:center;color:var(--faint)">Concept ${concept.toUpperCase()} not built yet</div>`
}
document.getElementById('list-concept').addEventListener('change', e => renderList(e.target.value))
renderList('a')
```

Note `openInvoiceRecord` now calls the real `showContentView('record')` instead of the standalone file's stub toast — this is a genuine behavior upgrade the port enables (clicking a list row now actually navigates to the record view within the same shell), not scope creep — it directly fixes the "opens invoice" stub that was a placeholder specifically because the two views weren't in the same shell before.

- [ ] **Step 6: Wire the "+ Add" button**

```js
document.getElementById('list-add').addEventListener('click', () => showContentView('record'))
```

(For this task, "Add" just navigates to the record view showing whatever static content is currently in `.canvas` — Task 5 will make Concept A's canvas content real; until then this is consistent with the current `.canvas` still reading "Invoice form (out of scope)" or Task 5 not having run yet, which is fine since tasks execute in order.)

- [ ] **Step 7: Verify List Concept A renders inside the real shell**

```bash
cd concepts && python3 -m http.server 8950 >/tmp/shell-port-server2.log 2>&1 &
playwright-cli open http://localhost:8950/app-shell.html
playwright-cli click "getByText('Sales Invoice', { exact: true })"
playwright-cli screenshot --filename=/tmp/list-a-in-shell.png
```

Expected: List Concept A's data grid (7 columns, 3 sample rows) renders inside the REAL shell — meaning the sidebar (icon rail + panel) is visible on the left, the real topbar (app switcher, search, AI Assistant, notifications, user avatar) is visible on top, and the List's own breadcrumb/title/Add button/grid/pager footer render below/inside that real chrome. This is the key visual confirmation that the port actually worked — compare against a screenshot of the standalone `sales-invoice-list.html` (which has NO sidebar) to confirm the difference.

```bash
playwright-cli click "text=143"
playwright-cli screenshot --filename=/tmp/list-a-row-click.png
```

Expected: clicking a row now calls `showContentView('record')` and actually shows the record view (not a toast) — confirms `openInvoiceRecord`'s upgrade works.

```bash
pkill -f "http.server 8950" 2>/dev/null
rm -f /tmp/list-a-in-shell.png /tmp/list-a-row-click.png /tmp/shell-port-server2.log
```

- [ ] **Step 8: Commit**

```bash
git add concepts/app-shell.html
git commit -m "feat: port List Concept A into app-shell.html's real shell"
```

---

## Task 3: Port List Concepts B and C

**Files:**
- Modify: `concepts/app-shell.html`
- Read: `concepts/sales-invoice-list.html`

**Interfaces:**
- Consumes: `LIST_ROWS`, `openInvoiceRecord`, `renderList` from Task 2.
- Produces: `renderListB`, `renderListC`, `STATUS_META`, wired into the `renderList` dispatcher's `else` branches.

- [ ] **Step 1: Port `renderListB` and `renderListC`**

Read `concepts/sales-invoice-list.html:2332-2369` (`renderListB` through `renderListC`, including `STATUS_META` at 2347-2351) and the M1-fix version of `renderListC` that includes the `.inv-board-toolbar` Search button (confirm by reading the actual current file — an earlier fix round added a Search button inside `renderListC`, make sure you're copying the current version, not an older one). Copy verbatim into the same script section Task 2 added, immediately after `renderListA`.

Update the `openAdvancedSearch()` calls inside both functions: app-shell.html already has its own search overlay (`.spanel` in the real topbar, opened via `.s-open` class per `concepts/app-shell.html`'s existing topbar search button) — this is a genuine consolidation opportunity, but for THIS task, keep it simple: reuse the advanced-search overlay markup/CSS/JS that Task 2 Step 1 already ported from the standalone list file (`#adv-search-scrim`, `openAdvancedSearch`/`closeAdvancedSearch`) rather than trying to merge two different search systems in one task — that merge is explicitly out of scope here (see Task 3's own scope: port B/C, not redesign search). Confirm `openAdvancedSearch`/`closeAdvancedSearch` were actually copied in Task 2 Step 1 (they live in `concepts/sales-invoice-list.html`'s first `<script>` block at ~1960-1973, alongside the CSS — if Task 2 only copied the CSS and not this JS, copy it now as part of this task, placed in the same script section).

- [ ] **Step 2: Wire both into the dispatcher**

Replace the stub `renderList` from Task 2 Step 5:

```js
function renderList(concept) {
  const canvas = document.getElementById('list-canvas')
  if (concept === 'a') renderListA(canvas)
  else if (concept === 'b') renderListB(canvas)
  else if (concept === 'c') renderListC(canvas)
}
```

- [ ] **Step 3: Verify all 3 list concepts render inside the real shell**

```bash
cd concepts && python3 -m http.server 8950 >/tmp/shell-port-server3.log 2>&1 &
playwright-cli open http://localhost:8950/app-shell.html
playwright-cli click "getByText('Sales Invoice', { exact: true })"
playwright-cli select "#list-concept" b
playwright-cli screenshot --filename=/tmp/list-b-in-shell.png
```

Expected: Concept B (search bar + card rows) renders with the real sidebar/topbar visible around it.

```bash
playwright-cli select "#list-concept" c
playwright-cli screenshot --filename=/tmp/list-c-in-shell.png
```

Expected: Concept C (grouped status board + its own Search button) renders with real shell chrome.

```bash
playwright-cli click "getByRole('button', { name: 'Search', exact: true })"
```

Expected: the advanced search overlay opens (confirms the ported search JS/CSS still works inside the real shell).

```bash
pkill -f "http.server 8950" 2>/dev/null
rm -f /tmp/list-b-in-shell.png /tmp/list-c-in-shell.png /tmp/shell-port-server3.log
```

- [ ] **Step 4: Commit**

```bash
git add concepts/app-shell.html
git commit -m "feat: port List Concepts B and C into app-shell.html's real shell"
```

---

## Task 4: Port the Simple/Advanced toggle and the Mode/Status-driven read-only mechanism

**Files:**
- Modify: `concepts/app-shell.html`
- Read: `concepts/sales-invoice-record.html`

**Interfaces:**
- Produces: `state` extensions (`viewMode`, and reconciliation with app-shell.html's own existing `state.mode`/`state.status` — see Step 1), `editable()`, `applyState()` additions, the `data-adv-only` CSS mechanism, a `#record-concept` Prototype-controls select (for Task 5), and the Simple/Advanced `.segctl` toggle wired into the real `.phead`.
- Consumes: app-shell.html's existing `state` object (`concepts/app-shell.html:5909-5918`) and its existing `editable` function — this task RECONCILES the standalone record file's separate state/editable logic with app-shell.html's own pre-existing one, rather than adding a second parallel state system.

This is the trickiest task in the plan: app-shell.html already has its own `state = {status, pay, dirty, design, mode, missing, prints}` and its own `editable = s => !['posted','canceled','inactive'].includes(s.status)` (`concepts/app-shell.html:5909-5918`) — used by the EXISTING canvas placeholder's surrounding chrome (Save/Undo button enabling, etc). The standalone record file built a second, separate `state`/`editable()`/`applyState()` for its own canvas content. Reconciling these means: keep app-shell.html's existing `state`/`editable` as the single source of truth, and make the ported record content read from it instead of creating a duplicate.

- [ ] **Step 1: Read both state systems fully before changing anything**

Read `concepts/app-shell.html:5909-5918` (existing `state`/`editable`) and every place `state.mode`/`state.status` is read or written in app-shell.html (search broadly — this logic is decentralized per the design spec's findings, expect many call sites, not one `applyState()`). Separately, read `concepts/sales-invoice-record.html:2245-2310` (`state`, `STATUS_LABELS`, `LOCK_COPY`, `editable()`, `applyState()` in full).

Note the key difference: app-shell.html's `editable(s)` takes a state object as a parameter (`editable(state)` at call sites), while the standalone record file's `editable()` takes no parameters and closes over its own module-level `state`. Also note app-shell.html's `state.mode` values may differ from the standalone file's (`'create'|'record'|'edit'` — confirm both use the same three values by checking app-shell.html's `#mode` select options, which should already exist since app-shell.html already has Mode/Invoice-status demo-bar controls per the design spec's finding #7).

- [ ] **Step 2: Add `viewMode` to app-shell.html's existing `state` object**

Modify `concepts/app-shell.html:5909-5917`:

```js
const state = {
  status: 'posted',
  pay: 'credit',
  dirty: false,
  design: '1',
  mode: 'record',
  missing: 3,
  prints: 2,
  viewMode: 'simple',
}
```

(Only the `viewMode: 'simple',` line is added — every other field stays exactly as-is, since app-shell.html's existing chrome depends on them unchanged.)

- [ ] **Step 3: Add the `data-adv-only` CSS mechanism**

Add to `concepts/app-shell.html`'s first `<style>` block (same insertion point as Task 2 Step 1, before `</style>`):

```css
[data-adv-only] {
  display: none;
}
body.advanced-on [data-adv-only] {
  display: revert;
}
```

- [ ] **Step 4: Add the Simple/Advanced toggle into the real `.phead`**

Find `concepts/app-shell.html:4865-4888` (`body-tpl`'s `.phead`, specifically the `.tline` div containing `<h1>` and `.pill-mount`). Insert the toggle between `<h1>` and `.pill-mount`, using app-shell.html's REAL `.segctl` component (`concepts/app-shell.html:2112-2130` — plain `<button aria-pressed>` children, not the standalone file's custom `.seg` classes):

```html
<div class="tline">
  <h1>Sales Invoice 143</h1>
  <div class="segctl" id="mode-toggle" role="group" aria-label="Field detail level">
    <button type="button" aria-pressed="true" data-view="simple">Simple</button>
    <button type="button" aria-pressed="false" data-view="advanced">Advanced</button>
  </div>
  <button class="ibtn fav-toggle" aria-label="Add to Favorites" aria-pressed="false">
    <svg width="16" height="16" aria-hidden="true"><use href="#i-spark" /></svg
    ><span class="tip">Add to Favorites</span>
  </button>
  <span class="pill-mount"></span>
</div>
```

(Only the `.segctl` block is new; `<h1>`, the favorite-toggle button, and `.pill-mount` stay exactly as they already are in app-shell.html today — do not modify or reorder them beyond inserting the toggle between `<h1>` and the favorite button.)

- [ ] **Step 5: Wire the toggle's click handler**

Add near wherever app-shell.html's other topbar/chrome event listeners are wired (search for a natural spot, e.g. near where `.side-toggle` or similar UI-state buttons are wired):

```js
document.getElementById('mode-toggle').addEventListener('click', e => {
  const btn = e.target.closest('button[data-view]')
  if (!btn) return
  state.viewMode = btn.dataset.view
  document.querySelectorAll('#mode-toggle button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)))
  document.body.classList.toggle('advanced-on', state.viewMode === 'advanced')
})
```

- [ ] **Step 6: Verify the toggle works without breaking existing chrome**

```bash
cd concepts && python3 -m http.server 8950 >/tmp/shell-port-server4.log 2>&1 &
playwright-cli open http://localhost:8950/app-shell.html
playwright-cli screenshot --filename=/tmp/simple-default.png
```

Expected: the record view (default, unchanged canvas placeholder still showing "Invoice form (out of scope)" — Task 5 replaces this) now shows a Simple/Advanced toggle next to the `<h1>`, with "Simple" active. Status pill and favorite-toggle still render correctly (confirms the insertion didn't break `.tline`'s existing layout).

```bash
playwright-cli click "text=Advanced"
playwright-cli eval "document.body.classList.contains('advanced-on')"
```

Expected: `true`. If `playwright-cli eval` is blocked by the sandbox's git-safety guard, use `playwright-cli run-code` instead, or a screenshot showing the "Advanced" button now active.

```bash
playwright-cli select "#mode" edit
playwright-cli select "#st" open
```

Expected (verify via screenshot or run-code): app-shell.html's EXISTING Save/Undo button enable/disable logic still works correctly after these edits (since `editable(state)` and its call sites weren't touched in this task — only a new field was added to `state`, nothing existing was removed or renamed). This is the regression check for this task: confirm nothing about the pre-existing invoice-mock's mode/status behavior broke.

```bash
pkill -f "http.server 8950" 2>/dev/null
rm -f /tmp/simple-default.png /tmp/shell-port-server4.log
```

- [ ] **Step 7: Commit**

```bash
git add concepts/app-shell.html
git commit -m "feat: add Simple/Advanced toggle and data-adv-only mechanism to app-shell.html"
```

---

## Task 5: Port Record Concept A into the existing `.canvas`

**Files:**
- Modify: `concepts/app-shell.html`
- Read: `concepts/sales-invoice-record.html`

**Interfaces:**
- Consumes: `data-adv-only` mechanism from Task 4, `showContentView` from Task 1.
- Produces: real `.canvas` content (5-tab Guided Tabs interface, Main Data cards, Payment method multi-row, Items grid, Totals, Sales Charges, remaining tab panels) replacing "Invoice form (out of scope)". A `#record-concept` Prototype-controls select (B/C wired in Task 6's placeholder branches, filled in Task 6 itself... actually Task 6 IS the B/C port — see Task 6).

This task ports the single largest chunk of content. Read the source file's exact current line ranges before copying (line numbers below are from the source file's LAST known state — re-verify with a fresh `grep -n` before trusting them, since prior fix rounds may have shifted lines slightly from what's documented in the design-spec's investigation).

- [ ] **Step 1: Add Record Concept A's CSS**

Read `concepts/sales-invoice-record.html:999-1144` (everything from `/* ============ Sales Invoice Record — Concept A (Guided Tabs) ============ */` through the end of the `.recc-*` rules — this range includes A/B/C's CSS together since they're not cleanly separated by comment headers in the source; copying the whole contiguous block now saves a second pass in Task 6). Also read `concepts/sales-invoice-record.html:779-830` (`.fnav`/`.pager` CSS — SKIP this specific sub-range, app-shell.html's real `.fnav`/`.pager` already exists and must not be duplicated) and `concepts/sales-invoice-record.html:971-998` (`.segctl` CSS — SKIP this too, Task 4 already used app-shell.html's real `.segctl`).

Copy `concepts/sales-invoice-record.html:999-1144` (minus nothing — this whole range is genuinely new component CSS: `.rec-tabs`, `.rec-card`, `.rec-field`, `.inv-grid-wrap`/`.inv-grid` — note: check whether Task 2 Step 1 already copied `.inv-grid` rules from the LIST file; if so, compare the two files' `.inv-grid` CSS for differences before copying again — if identical, skip re-copying; if different, reconcile into one shared rule set rather than having two conflicting `.inv-grid` definitions) into `concepts/app-shell.html`'s first `<style>` block.

- [ ] **Step 2: Replace the `.canvas` placeholder with Concept A's markup**

Read `concepts/sales-invoice-record.html:1362-1482` (`#canvas-root`'s full content: `.rec-tabs`, all 5 `.rec-tabpanel`s, `.rec-items`, `.rec-totals`, Sales Charges card). Replace `concepts/app-shell.html:4889`'s `<div class="canvas">Invoice form (out of scope)</div>` with `<div class="canvas">` wrapping that exact copied content (id-wise, drop the `id="canvas-root"` — this is now simply "the canvas," there's only one record concept's worth of markup living directly in it until Task 6 adds B/C as siblings).

Every `data-adv-only` attribute in the copied markup carries over unchanged (Task 4 already built the mechanism it depends on).

- [ ] **Step 3: Port the JS — state-independent parts first**

Read `concepts/sales-invoice-record.html:2311-2415` (`PAYMENT_METHODS`, `PAYMENT_EXTRA_FIELDS`, `addPaymentMethodRow`, `addItemRow`, `recalcTotalQty`, `renderRecordA`). Copy verbatim into a new script section in `concepts/app-shell.html` (same general area as Task 2/3's list-rendering functions — keep list and record rendering functions in adjacent, clearly-commented sections rather than interleaved).

- [ ] **Step 4: Reconcile `applyState()`/`editable()` calls inside the ported content**

The copied `renderRecordA()` and its helpers may reference the standalone file's own `editable()`/`applyState()` (module-level, no-arg versions). Read `concepts/sales-invoice-record.html:2265-2310` (`editable()`, `applyState()`) and app-shell.html's own existing `editable(s)`/call-site pattern (established in Task 4 Step 1's investigation). Adapt every reference inside the newly-copied Concept A code to call app-shell.html's real `editable(state)` (passing the shared `state` object) instead of a duplicate parameterless version — do not create a second `editable()` function in the file.

For the lock banner: app-shell.html's existing `.canvas`-adjacent markup may or may not already have a `#lockbanner` element (check — if the pre-existing invoice mock never had one, this is new markup to add following `concepts/sales-invoice-record.html:1357-1360`'s pattern, inserted between `.phead` and `.canvas` in `body-tpl`). Port the `LOCK_COPY` map and its `applyState()`-integration logic (from the ALREADY-FIXED version of the standalone file — confirm by reading the current file that `LOCK_COPY` has entries for all 6 statuses, per the final-review fix round, not just posted/canceled/inactive) into wherever app-shell.html's existing status-driven rendering logic lives (found in Task 4 Step 1's investigation).

- [ ] **Step 5: Wire the tab-switching and card-collapse listeners**

`renderRecordA()`'s existing internal logic (tab click → panel swap, `.rec-card-hd` click → expand/collapse) is self-contained and doesn't depend on anything file-specific — call `renderRecordA()` once during page initialization (near wherever Task 2/3's `renderList('a')` initial call was added, or immediately after the mount loop completes).

- [ ] **Step 6: Verify Concept A renders and behaves correctly in the real canvas**

```bash
cd concepts && python3 -m http.server 8950 >/tmp/shell-port-server5.log 2>&1 &
playwright-cli open http://localhost:8950/app-shell.html
playwright-cli screenshot --filename=/tmp/record-a-in-shell.png
```

Expected: the default view (record, since that's the shell's default) now shows the real 5-tab Guided Tabs interface — General/Customer/Currency cards, Items grid, Totals, Sales Charges — with the REAL sidebar and topbar visible around it (not the standalone file's reproduced/absent chrome). Only "Main Data" and "Payment method" tabs visible in Simple mode (default) — Other Data/Sub Ledgers/Additional Data are `data-adv-only`.

```bash
playwright-cli click "text=Advanced"
playwright-cli screenshot --filename=/tmp/record-a-advanced.png
```

Expected: Other Data/Sub Ledgers/Additional Data tabs and their Advanced-only fields now visible.

```bash
playwright-cli click "text=Payment method"
playwright-cli click "text=+ Add payment method"
playwright-cli screenshot --filename=/tmp/record-a-payment.png
```

Expected: a second payment-method row appears with its own dropdown/fields, independent of the first.

```bash
pkill -f "http.server 8950" 2>/dev/null
rm -f /tmp/record-a-in-shell.png /tmp/record-a-advanced.png /tmp/record-a-payment.png /tmp/shell-port-server5.log
```

- [ ] **Step 7: Commit**

```bash
git add concepts/app-shell.html
git commit -m "feat: port Record Concept A into app-shell.html's real canvas"
```

---

## Task 6: Port Record Concepts B and C, and the `#record-concept` selector

**Files:**
- Modify: `concepts/app-shell.html`
- Read: `concepts/sales-invoice-record.html`

**Interfaces:**
- Consumes: `addPaymentMethodRow`, `addItemRow`, `recalcTotalQty`, `data-adv-only` mechanism, `editable(state)` from Tasks 4-5.
- Produces: Concept B's compact-header + popover markup, Concept C's split-view markup, both as siblings of Concept A's canvas content (toggled by a new `#record-concept` select), `renderRecordB`/`renderRecordC`, and a `renderRecord(concept)` dispatcher.

- [ ] **Step 1: Add the `#record-concept` Prototype-controls select**

In `concepts/app-shell.html`'s `.demo-bar`, add (matching the `#list-concept` pattern from Task 2 Step 4, placed right after it):

```html
<div class="grp">
  <label for="record-concept">Record concept:</label>
  <select id="record-concept" autocomplete="off">
    <option value="a" selected>A · Guided Tabs</option>
    <option value="b">B · Single Flow</option>
    <option value="c">C · Split View</option>
  </select>
</div>
```

- [ ] **Step 2: Wrap Concept A's canvas content in an identifiable container**

Task 5 Step 2 placed Concept A's markup directly inside `.canvas`. Wrap it now: change `<div class="canvas">` (from Task 5) to `<div class="canvas"><div id="canvas-root">` and add a matching closing `</div>` before `.canvas`'s own closing tag — so Concept A's content is addressable as a sibling to Concepts B/C, all three living inside the same outer `.canvas`.

- [ ] **Step 3: Port Concept B and Concept C markup as siblings inside `.canvas`**

Read `concepts/sales-invoice-record.html:1485-1528` (Concept B's `#canvas-root-b` full content) and `concepts/sales-invoice-record.html:1531-1637` (Concept C's `#canvas-root-c` full content), plus `concepts/sales-invoice-record.html:1645-1650` (`#recb-popover-scrim`, Concept B's popover — this is a `.frame`-level sibling in the source, not inside any canvas-root; port it as a sibling of `.canvas` in `body-tpl`, immediately after `.canvas`'s closing tag and before `.fnav`).

Add both as siblings of `#canvas-root` inside `.canvas` (both starting `hidden`, matching the source's own `hidden` attribute on `#canvas-root-b`/`#canvas-root-c`).

- [ ] **Step 4: Port the JS**

Read `concepts/sales-invoice-record.html:2416-2502` (`RECB_POPOVER_CONTENT`, `renderRecordB`, `renderRecordC`, `renderRecord` dispatcher, plus the `recordBInitialized`/`recordCInitialized` guard pattern and the I3/I4 fixes from the final review — confirm the CURRENT file has: the popover-scrim-closing-on-concept-switch fix inside `renderRecord`, and the scrim positioned as a direct `<body>` child with a click-outside-closes handler, both from the final review's fix rounds). Copy verbatim.

Adapt `RECB_POPOVER_CONTENT.other/subledgers/additional` (they select `[data-panel="other"] .rec-card-body"` etc. from Concept A's markup via `outerHTML` cloning) — these selectors should keep working unchanged since Task 5 preserved the same `data-panel` attributes. Adapt `RECB_POPOVER_CONTENT.charges` to use the `#charges-card` id (confirm the final-review fix that added this id to Concept A's Sales Charges card was carried over correctly in Task 5 Step 2 — if not, add `id="charges-card"` now to Concept A's Sales Charges `.rec-card` before wiring this selector).

Replace Task 5 Step 5's standalone `renderRecordA()` initial call with the full dispatcher:

```js
document.getElementById('record-concept').addEventListener('change', e => renderRecord(e.target.value))
renderRecord('a')
```

- [ ] **Step 5: Verify all 3 record concepts work in the real shell, including popover behavior**

```bash
cd concepts && python3 -m http.server 8950 >/tmp/shell-port-server6.log 2>&1 &
playwright-cli open http://localhost:8950/app-shell.html
playwright-cli select "#record-concept" b
playwright-cli screenshot --filename=/tmp/record-b-in-shell.png
```

Expected: compact header + items grid + popover triggers, real shell chrome visible around it.

```bash
playwright-cli click "text=💳 Payment"
playwright-cli screenshot --filename=/tmp/record-b-popover.png
```

Expected: modal popover opens with a visible dimmed backdrop (per the final-review fix).

```bash
playwright-cli select "#record-concept" a
playwright-cli eval "document.getElementById('recb-popover-scrim').classList.contains('open')"
```

Expected: `false` (the I3 fix — popover auto-closes on concept switch — must still work after porting).

```bash
playwright-cli select "#record-concept" c
playwright-cli screenshot --filename=/tmp/record-c-in-shell.png
```

Expected: sticky summary rail + accordion detail pane, real shell chrome visible.

```bash
pkill -f "http.server 8950" 2>/dev/null
rm -f /tmp/record-b-in-shell.png /tmp/record-b-popover.png /tmp/record-c-in-shell.png /tmp/shell-port-server6.log
```

- [ ] **Step 6: Commit**

```bash
git add concepts/app-shell.html
git commit -m "feat: port Record Concepts B and C into app-shell.html's real canvas"
```

---

## Task 7: Field-completeness re-check, delete standalone files, update index.html

**Files:**
- Modify: `concepts/app-shell.html`, `index.html`
- Delete: `concepts/sales-invoice-list.html`, `concepts/sales-invoice-record.html`

**Interfaces:**
- Consumes: everything from Tasks 1-6.
- Produces: a single, complete `concepts/app-shell.html` with both views fully working, no standalone files, `index.html` pointing only at `concepts/app-shell.html`.

- [ ] **Step 1: Full click-through of every List concept × Record concept × Mode × Status × Simple/Advanced combination**

```bash
cd concepts && python3 -m http.server 8950 >/tmp/shell-port-final.log 2>&1 &
playwright-cli open http://localhost:8950/app-shell.html
```

For each list concept (a/b/c): select it, confirm no console errors, confirm Search opens/closes.
For each record concept (a/b/c) × each mode (create/record/edit) × Simple/Advanced: select the combination, confirm no console errors.
Additionally: click "Sales Invoice" nav item → confirm list shows; double-click a list row → confirm record shows; click a different sidebar nav item (e.g. "Customers") → confirm it falls back to showing the record view (matching pre-port behavior for non-Sales-Invoice nav items).

```bash
playwright-cli console
```

Expected: only the pre-existing benign favicon 404 across the whole click-through, no new errors.

- [ ] **Step 2: Field-completeness grep against the design spec**

```bash
for field in "Beneficiary No" "Tax Number" "Exchange Rate" "Pricing Level" "Method Show Price" "Batch No" "Free Qty" "Available Qty" "Statement" "Ref. No" "Manual No" "Cost Center No" "Sub Ledger2 No" "Sub Ledger3 No" "Salesperson" "Marketer No" "Collector" "Emp. Code" "Driver No" "Car No" "Geo. Location" "Receiver" "Tax Invoice Type" "Tax Accruals Type" "Tax Due Date" "Incoming Date" "Calculate Tax On Free Qty" "Sales Charges"; do
  grep -q "$field" concepts/app-shell.html && echo "OK: $field" || echo "MISSING: $field"
done
```

Expected: every line prints `OK:`. If any prints `MISSING:`, return to the relevant Task 4-6 step and add the missing field before continuing.

- [ ] **Step 3: Delete the standalone files**

```bash
git rm concepts/sales-invoice-list.html concepts/sales-invoice-record.html
```

- [ ] **Step 4: Update `index.html`**

Read `index.html`'s existing link entries for `concepts/sales-invoice-list.html` and `concepts/sales-invoice-record.html` (added by the prior plan's Task 8) and remove them — the content now lives inside `concepts/app-shell.html`, which is already linked from `index.html`. If `index.html` has any descriptive text specifically calling out the two separate invoice screens as distinct links, update it to describe the Sales Invoice List/Record as views reachable from within the app-shell prototype instead.

- [ ] **Step 5: Final screenshot set**

```bash
playwright-cli goto http://localhost:8950/app-shell.html
playwright-cli screenshot --filename=/tmp/final-shell-record.png
playwright-cli click "getByText('Sales Invoice', { exact: true })"
playwright-cli screenshot --filename=/tmp/final-shell-list.png
pkill -f "http.server 8950" 2>/dev/null
```

Send both screenshots to the user for final visual confirmation.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "chore: delete standalone invoice files now ported into app-shell.html, update index"
```
