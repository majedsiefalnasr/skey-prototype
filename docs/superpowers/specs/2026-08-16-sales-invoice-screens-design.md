# Sales Invoice Screens — Design Spec

## 1. Purpose

Design the Sales Invoice **List** screen and **Record** screen (Add / View / Edit) as new Figma-prep HTML concepts, inside the app shell approved in `concepts/app-shell.html`. The app shell (topbar, header row, status pill, footer/pager) is locked — this work is scoped entirely to the content that currently reads `Invoice form (out of scope)` in `.canvas`.

Source of truth for required fields/actions: `Sales_Invoice_Screen_RM.md` and `Sales_Invoice_List_RM.md` (both in `~/Downloads`), cross-checked against the live production app at `app.skeyerp.com` (tenant `lastchance`). Production is a **field/data reference, not a UX target** — every field and action found in the RM or in production must exist somewhere in each concept, but how it's organized is ours to redesign.

Goal: give the user several genuinely different UX directions to compare side by side, then let them assemble a final design by picking pieces from different concepts — not converge on one "best" answer up front.

## 2. What we found in production (grounds the design)

Logged into `app.skeyerp.com/sal/sls/sales/salesinvoice/list` (tenant `lastchance`) and inspected the real screen in both list and record (Add/View) states. Confirmed:

**List screen:** grid with Doc. Sequence, Doc No., Doc Date, Doc Sub-type Name, Payment method, Customer No., Customer Name columns; drag-to-group bar above the header row; toolbar (Add, view/print/export icons, Columns menu); per-column filter icons + sortable headers; global search box; pagination footer (`1 of 14 pages · 140 items`, page-size selector).

**Record screen:** 5 tabs — **Main Data**, **Payment method**, **Other Data**, **Sub Ledgers**, **Additional Data**. Items grid + Totals block + Sales Charges (its own mini-grid) sit **below the tab strip and stay visible regardless of active tab** — they are not tab content.

- **Main Data** tab: 3 collapsible card-groups — **General** (Year, Sequence, Operation Unit, Doc Sub-Type, Doc Date, WH No.), **Customer** (Customer No., Customer Name, Address, Mobile No., Beneficiary No., Tax Number), **Currency** (Currency, Exchange Rate, Pricing Level, Tax Category, Method Show Price).
- **Payment method** tab: supports **multiple simultaneous payment methods** via an "Add payment method +" link — not a single picker. Each method row shows Payment Method + Amount + method-specific fields (e.g. Cash Code for Cash).
- **Other Data** tab: Statement (textarea), Ref. No., Manual No., No. Of Attach.
- **Sub Ledgers** tab: Cost Center No., Sub Ledger2 No., Sub Ledger3 No.
- **Additional Data** tab: Salesperson, Marketer No., Collector, Emp. Code, Driver No., Car No., Geo. Location, Receiver, Tax Invoice Type, Tax Accruals Type, Tax Due Date, Incoming Date, "Calculate Tax On Free Qty" checkbox — richer than the RM implied.
- **Items grid** columns: `# · Item · UoM · Expiry Date · Batch No. · Qty. · Free Qty · Available Qty · Price Includes Tax · Discount % · Tax % · Tax Amt · Total · Statement · Barcode`.
- **Totals block**: The Amount, Total Items Discount, Discount Percent, Discount Including Tax, Charges Amount, Total Discount, Tax Amt, Net Amount.
- Add mode: required fields marked `*`; a "Fill From" button in the General card; item grid rows editable with add/delete icons in the grid's own toolbar.
- Right action rail (Add / Search / Save / Print / Undo / user icons) is the same one already built in `app-shell.html` — no changes needed there.

## 3. Simple / Advanced mode

Two modes, toggled by a **segmented control next to the invoice title** (`Simple | Advanced`), same row as the status pill — confirmed placement.

**Split rule:** use the RM's own Priority column.
- **Simple mode** = every High-priority field/section from the RM.
- **Advanced mode** = Simple + every Medium-priority field/section.

Concretely, Advanced-only (hidden in Simple):
- Customer: Mobile No., Address, Beneficiary No., Tax Number.
- Currency: Exchange Rate, Pricing Level, Method Show Price.
- Items: Expiry, Batch, Free Qty, Available Qty, Discount, item search/sort.
- Whole tabs: **Other Data**, **Sub Ledgers**, **Additional Data**.
- Totals: Discount Percent, Discount Including Tax.
- **Sales Charges** section.

Simple mode keeps: Main Data's General (all fields) + Customer (Customer No., Customer Name only — Mobile No./Address/Beneficiary No./Tax Number move to Advanced) + Currency (Currency, Tax Category only — Exchange Rate/Pricing Level/Method Show Price move to Advanced), the core item columns (Item, UoM, Qty, Price, Tax %, Line Total), the Payment Method tab, and the core totals (Amount, Tax Amt, Net Amount).

This mode applies **identically across all 3 record concepts** — it's a field-visibility layer, not a concept-specific feature.

## 4. Three Record concepts (all built, switchable)

A **Record concept** selector in Prototype controls (`A / B / C`), independent of the List concept selector. All three carry every field from §2 — only the interaction model differs.

### Concept A — Guided Tabs
Closest to production's shape, refined: 5 tabs (Main Data / Payment method / Other Data / Sub Ledgers / Additional Data), collapsible General/Customer/Currency cards inside Main Data, Items + Totals + Sales Charges pinned below the tab strip on every tab. Optimized for **discoverability** — matches what accountants already know from the live app.

### Concept B — Single Flow
No tab strip. Header collapses to one compact row (Customer · Currency · WH No · Doc Date). Items grid dominates the screen. Payment method, Other Data, Sub Ledgers, and Additional Data become small popover-triggering buttons that open a focused panel over the page and close on save/cancel. Optimized for **keyboard-speed data entry**, matching the product's own stated design principle (`PRODUCT.md`: "Keyboard-first data entry... every shell action reachable and fast without the mouse").

### Concept C — Split View
Left rail: persistent read-only summary (customer, payment status, running Net Amount) that never scrolls away. Right pane: everything else (Main Data fields, Items, Payment, Other Data, Sub Ledgers, Additional Data) as one continuous scroll with accordion sections — no tab-clicking. Optimized for the **manager/reviewer** persona from `PRODUCT.md` ("managers reviewing and approving documents") — always see the bottom line while scanning detail.

## 5. Three List concepts (all built, switchable)

A **List concept** selector in Prototype controls (`A / B / C`), independent of the Record concept selector — any combination is viewable (e.g. List B with Record A). All three carry every field/action from §2.

### List A — Data Grid
Full-width dense grid mirroring production: sortable/filterable/groupable columns, standard toolbar. Pairs naturally with Record A's mental model.

### List B — Command List
Row cards instead of grid cells, fewer fields visible per row by default (rest via filter chips), built around fast filter-and-jump. Pairs with Record B's speed focus.

### List C — Grouped Review Board
Pre-grouped by invoice status (Posted / Pending / Returned / etc.) with counts, built for "what needs my attention" scanning rather than a flat table the user groups manually. Pairs with Record C's reviewer focus.

**Search:** none of the three reinvents search. Each gets a single **Search button** that opens a self-contained copy of the app-shell's existing advanced search panel (visually/behaviorally identical to the one in `app-shell.html`, copied into the list file since it's a separate file) — real open/close, not a stub.

## 6. Prototype controls (new/changed)

Building on `app-shell.html`'s existing pattern (`#navc`-style selects wired to a `renderXxx()` rebuild function):

- **List concept**: `A · Data Grid` / `B · Command List` / `C · Grouped Review Board`.
- **Record concept**: `A · Guided Tabs` / `B · Single Flow` / `C · Split View`.
- **Mode**: kept as-is (`Creating a new invoice` / `Viewing a saved invoice` / `Editing a saved invoice`) — separate from Status, since Add mode has no status yet.
- **Invoice status**: kept as-is (Open / Pending (معلق) / Posted (مرحل) / Returned (مرتجع) / Canceled (ملغي) / Deactivated (موقف)) — drives read-only/editable state within View/Edit modes.
- **Payment control removed** from Prototype controls (per earlier instruction) — payment method is now a real field inside the record, not a demo toggle.

## 7. Interactivity depth

Matches `app-shell.html`'s own convention (real where it demonstrates the actual UX decision, stubbed where it's a deep feature orthogonal to this design pass):

**Real:** tab switching (Concept A), popover open/close (Concept B), accordion expand/collapse (Concept C), Simple/Advanced toggle, List/Record concept switching, Mode/Status-driven read-only state, Payment Method add/remove/switch (reveals method-specific fields), item grid row add/remove, card-group collapse/expand (General/Customer/Currency), advanced search panel open/close.

**Stubbed** (toast or static, like `app-shell.html` treats Print today): column drag-to-reorder, drag-to-group, column sort, per-column filter popovers, Export, actual calculation math (totals can show static representative numbers rather than recompute live).

## 8. File architecture

Two new self-contained HTML files alongside `concepts/app-shell.html`, following its single-file convention (inline `<style>`/`<script>`, Atlassian Design System CSS custom properties, Prototype-controls demo bar):

- `concepts/sales-invoice-list.html`
- `concepts/sales-invoice-record.html`

Each file contains all 3 of its own concepts (switchable internally) plus the Simple/Advanced toggle. They reuse the exact `:root` token set already defined in `app-shell.html` (`--ink`, `--surface`, `--accent`, `--st-*` status colors, `--shadow-*`, etc.) and the same status-pill/badge/button classes, so visual language stays identical to the approved shell. The app shell chrome itself (topbar, header row, footer/pager) is reproduced around the new content exactly as approved — no changes to its markup or behavior.

## 9. Out of scope (per RM §21 and this pass)

Detailed accounting posting logic, payment gateway/bank integration, inventory costing algorithms, customer/item master-data creation, tax authority integration, approval workflow, detailed reporting, real PDF export, real live calculation engine (static/representative totals are fine), column drag-reorder/group mechanics (visual only).
