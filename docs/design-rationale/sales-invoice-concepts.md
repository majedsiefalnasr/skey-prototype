# Sales Invoice — Why It's Designed the Way It Is

This document explains the reasoning behind the Sales Invoice List and Record screens in the `concepts/app-shell.html` prototype, for discussion with stakeholders. It covers what each screen optimizes for and why earlier alternatives were dropped.

## List: one concept — Data Grid

Earlier drafts explored three list layouts (a dense grid, a card-based command list, and a status-grouped review board). We narrowed this to one: the **Data Grid**.

**Why:** A grid with sortable/filterable columns is what accountants already use in the current production system — Doc. Sequence, Doc No., Doc Date, Payment method, Customer, and so on, all visible at once, with search/columns/export controls above it. The card-based and grouped-board alternatives didn't offer a strong enough advantage over the grid to justify maintaining three versions of the same screen — for a list of transactional records like invoices, a grid is simply the right tool, and splitting stakeholder attention across three similar options slowed down getting to a decision. One well-built, on-brand grid is more useful to review than three partial ones.

## Record: one concept — Guided Tabs

Earlier drafts also explored three record layouts: Guided Tabs (mirroring the production app's structure), Single Flow (a popover-driven fast-entry layout), and Split View (a persistent-rail, single-scroll layout). We narrowed this to one as well: **Guided Tabs**.

**Why:** Single Flow and Split View each traded discoverability for a workflow gain (fewer clicks, less scrolling) that only paid off for a narrow slice of users — a high-volume clerk, or someone reviewing a long invoice end-to-end. Guided Tabs is the layout every current user already knows, since its five tabs (Main Data, Payment method, Other Data, Sub Ledgers, Additional Data) mirror the production app's own structure. Maintaining three record layouts meant three places to keep field-parity and interaction fixes in sync, for a benefit that didn't clearly outweigh that cost. The Items grid, Totals, and Sales Charges stay visible below the tabs no matter which tab is open — marked with a labeled band ("Items, totals & charges — visible on every tab") — because those are the numbers a clerk checks constantly while filling in the rest; hiding them behind a tab would mean constant tab-switching just to see the running total.

## All fields are always visible

Earlier drafts also had a Simple/Advanced toggle that hid less-common fields (exchange rate, discounts, Sales Charges, the Other Data / Sub Ledgers / Additional Data tabs) behind an "Advanced" switch. That toggle has been removed — every field is shown all the time, the same set a clerk would see in "Advanced" mode today.

**Why:** A toggle that hides fields only helps if most users spend most of their time in the reduced set — but invoices routinely need fields from both sides (a return needs a discount field, a wholesale sale needs Sales Charges), so the toggle mostly added an extra click before someone could find the field they needed, without saving much scanning time in exchange. Removing it simplifies the mental model: what you see is what's there, always.

## Wide screens fill their own width

On a wide screen, the Main Data tab's field-groups (General, Customer, Currency) now flow left-to-right and wrap based on their own natural width, instead of each one always claiming a full-width row. A group with more fields (General) may take a row on its own; smaller groups (Customer, Currency) sit side by side once they fit. The same applies to Other Data / Sub Ledgers / Additional Data.

**Why:** The previous one-card-per-row layout left most of a wide monitor empty once a card only had two or three fields — useful screen space was going unused while the page still asked the user to scroll past it. Sizing each card by its own field count (rather than hardcoding "this many cards per row") means the layout adapts if a card gains or loses fields later, without needing a design pass to re-balance rows.

## Prototype controls: Density and Input style

Two controls in the prototype's top bar exist to compare layout options side by side — they are testing aids, not features going into the product as toggles for end users.

- **Density** (Default / Compact): Compact tightens the spacing inside cards, fields, and grid rows — smaller padding, tighter gaps — without touching the shell chrome (topbar, sidebar, footer). This is a rough test of "how much more fits on screen if we tighten spacing," to gauge whether the shipped design should default to a tighter rhythm than the current draft uses.
- **Input style** (Default / Floated label / Ghost label / Odoo-style): Four ways of presenting the same label + field pairing, to compare against each other before committing to one for the real app:
  - **Default** — label above the field, as used today.
  - **Floated label** — the label sits inside the field at rest and floats up into a small caption once the field has a value or focus (the familiar "Material" pattern).
  - **Ghost label** — the label only appears as placeholder text inside an empty field, and disappears once the field is filled; for `<select>` fields (which have no native placeholder) the label appears as a disabled, hidden-once-chosen option instead.
  - **Odoo-style** — no visible border or background at rest; the field reads as label-beside-value plain text, and only gains a bottom rule when focused.

**Why:** these were requested explicitly as a live comparison tool, not a specification for four shipped variants — the intent is to pick one winner for the production design once stakeholders have seen all four against real field data (including RTL, disabled/read-only fields, and long values), not to ship a configurable style switcher.

## What was cut, and why

- **List Concept B (Command List)** and **List Concept C (Grouped Review Board)** — dropped in favor of the single Data Grid concept: a grid already serves the invoice-list use case well, and comparing near-duplicate layouts wasn't worth the review overhead.
- **Record Concept B (Single Flow)** and **Record Concept C (Split View)** — dropped in favor of the single Guided Tabs concept, for the same reason: each mapped to a real but narrow workflow, and maintaining three full record layouts cost more than the workflow-specific gains were worth once the goal narrowed to a single production-ready design.
- **Simple/Advanced mode** — dropped; see above. All fields are shown all the time now, in every card and tab.
