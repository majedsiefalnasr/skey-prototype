# Sales Invoice — Why Each Concept Is Designed the Way It Is

This document explains the reasoning behind the Sales Invoice List and Record screen concepts in the `concepts/app-shell.html` prototype, for discussion with stakeholders. It covers what each concept optimizes for, who it's built for, and why some earlier concepts were dropped.

## List: one concept — Data Grid

Earlier drafts explored three list layouts (a dense grid, a card-based command list, and a status-grouped review board). We narrowed this to one: the **Data Grid**.

**Why:** A grid with sortable/filterable columns is what accountants already use in the current production system — Doc. Sequence, Doc No., Doc Date, Payment method, Customer, and so on, all visible at once, with search/columns/export controls above it. The card-based and grouped-board alternatives didn't offer a strong enough advantage over the grid to justify maintaining three versions of the same screen — for a list of transactional records like invoices, a grid is simply the right tool, and splitting stakeholder attention across three similar options slowed down getting to a decision. One well-built, on-brand grid is more useful to review than three partial ones.

## Record: three concepts, each for a different way of working

Unlike the list, the record (invoice detail) screen keeps three concepts, because entering or reviewing an invoice is a more varied task — different people touch it for different reasons, and no single layout serves all of them well.

### Concept A — Guided Tabs

**Who it's for:** Anyone already familiar with the current production system, or new staff being trained on it.

**Why it's shaped this way:** Five tabs (Main Data, Payment method, Other Data, Sub Ledgers, Additional Data) mirror the production app's own structure, so nothing has to be relearned. The Items grid, Totals, and Sales Charges stay visible below the tabs no matter which tab is open, because those are the numbers a clerk checks constantly while filling in the rest — hiding them behind a tab would mean constant tab-switching just to see the running total. This is the safest, most discoverable option and the one we'd default to for a broad rollout.

### Concept B — Single Flow

**Who it's for:** High-volume data-entry clerks who process many invoices per shift and want to move fast without hunting through tabs.

**Why it's shaped this way:** There's no tab strip at all — the customer/currency/date header collapses to one compact row, and the Items grid dominates the screen, since line items are what take the most time to enter. Everything else (Payment, Other Data, Sub Ledgers, Additional Data, Sales Charges) is tucked behind a single, clearly-labeled row of buttons that open a focused popup — present when needed, out of the way otherwise. This trades some discoverability for speed: a new user has to learn where things live once, but afterward can work through an invoice with far less scrolling and clicking than Concept A.

### Concept C — Split View

**Who it's for:** Managers and reviewers approving invoices someone else entered, not the person doing the data entry.

**Why it's shaped this way:** A reviewer doesn't need to enter data — they need to quickly judge whether an invoice is correct and decide whether to approve it. The left-hand rail stays pinned while the rest of the invoice scrolls, and always shows the customer, payment summary, and running Net Amount, so the reviewer never loses track of the bottom line. Below that, it surfaces the two things a reviewer actually acts on: **exception flags** (for example, a missing tax number, or a discount above the normal threshold) and a pinned **Approve / Return** action. Earlier versions of this concept had the same split layout but no reviewer-specific content in the rail — it was a read-only copy of fields that added a second column without adding a reason to use it. The flags and action are what make the split worth having: they're the reviewer's actual job, kept in view the whole time instead of buried at the bottom of a long scroll.

## Simple / Advanced mode

All three record concepts share the same Simple/Advanced toggle. Simple mode shows the fields used on nearly every invoice (customer, currency, core item columns, core totals); Advanced reveals the rest (exchange rate, discounts, Sales Charges, and the Other Data / Sub Ledgers / Additional Data tabs). This is a field-visibility layer, not a fourth concept — it applies the same way regardless of which of the three record concepts is active, so switching between "fast entry" (B) and "guided" (A) doesn't also mean relearning what's hidden.

## What was cut, and why

- **List Concept B (Command List)** and **List Concept C (Grouped Review Board)** — dropped in favor of the single Data Grid concept, for the reason above: a grid already serves the invoice-list use case well, and comparing near-duplicate layouts wasn't worth the review overhead.
- Nothing was cut from the Record concepts — all three (A, B, C) remain, because each maps to a genuinely different workflow (guided entry, fast entry, review) rather than being cosmetic variations of the same idea.
