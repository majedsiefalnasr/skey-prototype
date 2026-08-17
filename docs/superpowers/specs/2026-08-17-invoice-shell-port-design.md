# Invoice List/Record Shell-Port — Design Spec

## 1. Purpose

The Sales Invoice List and Record screens were previously built as two standalone HTML files (`concepts/sales-invoice-list.html`, `concepts/sales-invoice-record.html`), each reproducing pieces of the approved app shell (topbar, breadcrumb, status pill, footer) by hand-copying markup. That reproduction diverged from the real shell: it carried none of the shell's actual sidebar (icon rail + panel), app switcher, tenant/year identity, advanced search, AI Assistant, notifications, or user menu, and its hand-rebuilt header/footer used different markup/classes than `concepts/app-shell.html`'s real components.

This spec replaces that approach: the List and Record content moves **into** `concepts/app-shell.html` itself, as new content inside its one existing, real shell instance — using its actual sidebar, topbar, header (`.phead`), and footer (`.fnav`) components, not copies of them. The two standalone files are deleted.

## 2. What we found in app-shell.html's architecture (grounds the design)

Confirmed via direct inspection:

- **Exactly one shell instance mounts today.** app-shell.html has a single `.design` section (`data-design="1"`); an earlier multi-`.design` pattern existed and was deliberately collapsed to one (dead `.d2` CSS at line ~9180, an inert `design: '1'` field still in `state`). Each `.design` mount builds its own full independent sidebar+topbar+content stack — reviving multiple `.design` sections to hold List/Record would create N parallel shells, which is not what's wanted here.
- **`.content` already holds two swappable children**, appended by the mount loop: `body-tpl` (the invoice-record page: `.arow` toolbar, `.phead`, `.canvas`, `.fnav` — siblings, not wrapped in a container) and `email-tpl` (a single-root `<div class="email-view" hidden">`). The swap mechanism is `toggleEmailView(show)`: it sets `hidden` on every direct child of `.content` except `.email-view` when showing email, and reverses it when hiding. This is the established, load-bearing pattern for "multiple pages sharing one shell" already in the file — the List view will be a third such child, following the same shape as `email-view` (single wrapping `<div class="list-view" hidden>` sibling).
- **`.canvas` is the existing Record placeholder**, currently containing the literal text "Invoice form (out of scope)". Its surrounding `.phead` (breadcrumb, `<h1>`, favorite toggle, `.pill-mount` status pill, Save/Undo action buttons) and `.fnav` (pager, position text, related-docs actions) are real, wired components — not something to rebuild.
- **Sidebar nav clicks only do visual highlighting today.** Leaf nav items (built by `ncBuildItem`) carry a stable `dataset.label` (e.g. `"Sales Invoice"`) and call `setNavCurrent(root, label)` on click, which marks `.current`/`.on-path` classes and calls `closeEmailView()` defensively — no content-switching logic exists inside it yet. Critically, **`navCurrentLabel = 'Sales Invoice'` is already the module-level default** — the shell already treats "Sales Invoice" as the current page's identity, it just has no List content to show for it yet.
- **State machine is decentralized.** There is no single `applyState()` — mode/status-driven behavior is spread across many inline conditionals throughout the script. New page-switching state follows the same lightweight pattern (a module-level variable + a small number of call sites), not a new centralized state object.

## 3. Content-swap architecture

Extend `.content`'s existing two-child swap to three children, all siblings of `.content`, all following the `email-view`'s single-wrapper-div shape where a wrapper is needed:

- **Record view**: `body-tpl`'s existing direct children (`.arow`, `.phead`, `.canvas`, `.fnav`) — unwrapped, exactly as today.
- **Email view**: `email-tpl`'s existing `<div class="email-view" hidden>` — unchanged.
- **List view** (new): a new `<div class="list-view" hidden>` sibling, built the same way `email-view` is (its own template, cloned into `.content` by the mount loop).

Generalize `toggleEmailView(show)` into a `showContentView(name)` function (`'record' | 'email' | 'list'`) that hides every `.content` child except the one matching `name`, replacing the current two-state hide/show boolean with a three-way switch. Every existing call site of `toggleEmailView`/`openEmailView`/`closeEmailView` keeps working (they become the `'email'`/`'record'` cases of the new function) — this is a rename-and-extend, not a rewrite of the closing/opening logic itself.

## 4. Navigation wiring

- **`setNavCurrent(root, label)`** gains one new branch: when `label === 'Sales Invoice'`, call `showContentView('list')` (in addition to its existing highlighting work). For every other label, call `showContentView('record')` — this matches today's implicit behavior (every other nav item already has no content of its own, so falling back to showing the record view/canvas is a no-op change in outcome, just made explicit).
- **Opening a record from the list**: List view's row double-click and "Add" action call `showContentView('record')` (and, for a real row, populate `.canvas`/`.phead` with that invoice's data — using the same static/representative-data approach the deleted files used, no real backend).
- **Returning to the list**: the record view's breadcrumb "Sales Invoice" link (already present in `.phead`'s `nav.crumbs`) calls `showContentView('list')`.

No new sidebar wiring is needed — "Sales Invoice" is already the default current nav item pointing at exactly the content this spec adds.

## 5. Record Concept A fills the existing canvas

Record Concept A ("Guided Tabs" — 5-tab interface, collapsible Main Data cards, always-visible Items/Totals/Sales Charges) becomes the real content of the existing `.canvas`, replacing "Invoice form (out of scope)". It uses the shell's **existing** `.phead` (breadcrumb/title/status-pill/Save-Undo) and `.fnav` (pager) exactly as they already work today — no parallel header/footer markup, no reproduction.

Concepts B (Single Flow) and C (Split View) become alternate content for the same `.canvas` slot, swapped via a `#record-concept` selector in Prototype controls (matching the existing demo-bar convention for Mode/Status/etc.). Switching concepts only replaces `.canvas`'s children — `.phead` and `.fnav` are shell-owned and never rebuilt per concept, directly addressing the original complaint that the standalone files "made new pages without the power of the app shell."

The Simple/Advanced toggle and Mode/Status-driven read-only behavior (both already built and reviewed in the standalone Record file) port over as-is, adapted to read from/write to `.canvas`'s real position inside the existing shell rather than a synthetic `#canvas-root`.

## 6. List view gets header/footer from the same component pattern

The new List view is not header/footer-less — it gets its own breadcrumb + title + action row (using the **same** `.phead`/`crumbs`/`tline` classes and structure the record view already uses, adapted content: "Sales Invoice" title, an "Add" action instead of Save/Undo) and its own footer (using the **same** `.fnav`/pager component classes, adapted to a list's pagination — page number/size instead of record position). This directly satisfies "you don't follow the same page layout and instructions from app shell" — the List view is built from the shell's real header/footer components, not new ones invented for it.

List Concepts A (Data Grid), B (Command List), C (Grouped Review Board) — already built and reviewed in the standalone List file — port over as the swappable content inside the List view's canvas-equivalent area, switched via a `#list-concept` selector in Prototype controls.

## 7. What gets reused as-is (zero duplication)

Sidebar (icon rail + panel), topbar (app switcher, tenant name + year, global search, AI Assistant, notifications, user menu), toasts, focus-trap, kit/Prototype-controls widget, `:root` design tokens — all already shared automatically once List/Record content lives inside the one existing shell instance. Nothing about these needs to be touched, copied, or re-verified; they are simply now visible behind real content instead of a placeholder or nothing at all.

## 8. Migration of existing reviewed work

The standalone files' content (both List concepts A/B/C and Record concepts A/B/C, including the Simple/Advanced mechanism, multi-payment-method rows, items grid, totals, sales charges, and every fix from the 3-round review that already happened) is the source material being moved, not redesigned. Field inventories, interaction models, and all bugfixes carry over unchanged — only their markup's relationship to the surrounding page (header/footer/chrome) changes, from "reproduced" to "real."

`concepts/sales-invoice-list.html` and `concepts/sales-invoice-record.html` are deleted once their content has been ported into `concepts/app-shell.html`.

## 9. Out of scope

Real backend/data (still static/representative), real pagination/sort/filter/export logic (still stubbed, per the original plan's own scope decision), a true router/URL-based navigation (this is `hidden`-toggle content switching within one page, matching the file's existing pattern, not a SPA router).
