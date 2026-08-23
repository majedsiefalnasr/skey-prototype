# Customer Pages and Layout Concepts — Design Spec

## 1. Purpose

Extend `concepts/app-shell.html` with a Customers list and an interactive Customer record while preserving the approved app shell and Sales Invoice screens. The Customer record will provide four stakeholder-comparison concepts selected from the prototype controls. Every concept presents the same customer data and supports the same core interactions; only the information architecture and layout change.

## 2. Scope boundaries

- Add two Customer routes/views inside the existing single-file prototype: **Customers list** and **Customer record**.
- Reuse the approved shell chrome, navigation language, typography, tokens, buttons, grids, form controls, pager, and responsive conventions.
- Do not redesign or remove any Sales Invoice markup, behavior, data, or styling. Customer-only selectors, state, and rendering must remain scoped to the Customer views.
- Preserve the existing prototype controls. Add a Customer-layout selector that affects only the Customer record.
- Use representative in-memory data only. No backend, persistence, uploads, or real exports are in scope.
- Do not omit any field visible in the supplied Customer screenshots. Unknown content is represented truthfully rather than invented.

## 3. Navigation and view flow

Selecting **Customers** from the shell navigation opens the Customers list rather than the Sales Invoice record. The content-view switcher gains explicit `customers-list` and `customer-record` states alongside the existing invoice list, invoice record, and email states.

The Customers list includes a **Customers** breadcrumb/title, an **Add Customer** primary action, the shared grid toolbar, and the shared footer pager. Selecting a row opens that customer's record. Add Customer opens the Customer record in create mode. The Customer breadcrumb returns to the Customers list. Returning to Sales Invoice restores its existing list/record behavior and prototype state.

## 4. Customers list

The list uses the approved ERP data-grid pattern and these columns:

1. Customer No.
2. Customer Name
3. Operation Unit
4. Customer Type
5. Customer Group
6. Currency
7. Country
8. Phone
9. Active status

The toolbar contains Search, Columns, and Export controls matching the existing invoice grid. Search opens a Customer-specific overlay with customer number/name, type/group, country, and status filters. Columns and Export remain safe prototype actions with explanatory toasts. Representative rows include customer `200010 / customer_412`, which opens the populated reference record.

## 5. Shared Customer record model

All four concepts render from one Customer schema and one in-memory state object. Switching concepts must retain edited values, checkbox states, expanded/collapsed state where applicable, and the selected customer. Create mode starts from the same schema with blank values and sensible defaults; view mode locks fields; edit mode enables them.

The prototype's page-aware mode control shows invoice wording on Sales Invoice views and customer wording on the Customer record. Customer state must not read or mutate invoice status, payment, document number, line items, or totals.

## 6. Required Customer content

Every concept must expose every field below, though it may group or sequence the sections differently.

### Identity and classification

- Customer No.
- Customer Name
- Operation Unit
- Customer Type
- Prime Customer
- Account Code
- Customer Group
- Linked To Beneficiaries
- Currency
- Customer photo/select-photo control

### Deactivation

- From Deactivation Date
- To Deactivation Date

### National Address

- Street
- Building
- Flat
- District
- Short Address
- City
- State
- Country
- Postal Code
- Add On
- Identifier Type
- Identifier No.

### Default Contact Info

- Address
- Address Details
- City
- State
- Country
- Postal Code
- Phone
- E-Mail
- Mobile No.
- Website

### Main Data

- Salesperson
- Driver No.
- Geo. Location
- Collector
- Marketer No.
- Credit Period
- Tax Scope
- Tax Category
- Method Show Price
- Tax Number
- Permanent Account Number
- Program No.
- Activation Date
- Customer Barcode

### Other Data

- Dealing Date
- Price Level For Cash
- Price Level For Credit
- Country
- Language
- Payment Type
- Delivery Terms
- Via Person
- Last Confirmation Date
- ID Number
- License No.
- License Owner
- CEO Title
- CEO Name
- Year Established
- Vendor Code
- Black List Reason
- Black List
- Salesperson
- Inactivation In Sales Order
- Inactivation In Invoice
- Remarks

### Sub Ledgers

Provide the screenshot's table toolbar/search, sortable/filterable column affordances, columns `#`, `Sub Ledger Type`, `Number`, `Default`, and `Deactivate`, an honest **No records to display** empty state, and the shared pager treatment.

### Contact Details

Keep the visible Contact Details destination, but use an honest empty state because the supplied references do not define its fields or table structure. Do not invent business fields.

## 7. Customer layout prototype control

Add a **Customer layout** selector to the existing prototype-controls harness with four values:

1. Guided Sections
2. Focused Navigator
3. Compact Workspace
4. Scroll Navigator

The selector is shown or enabled only for the Customer record and does not alter the Sales Invoice record. Switching values replaces only the Customer record canvas. The current Customer state is rendered into the selected concept immediately.

## 8. Concept 1 — Guided Sections

This is the familiarity-first baseline. Identity/classification, Deactivation, National Address, and Default Contact Info appear as collapsible cards above a horizontal tab set for Main Data, Other Data, Sub Ledgers, and Contact Details. It is closest to the source ERP structure and to the approved Sales Invoice Guided Tabs concept, minimizing retraining.

The most important identity fields and photo remain visible at the top. Only one lower tab panel is visible at a time. Card headings show clear expanded/collapsed state and retain keyboard operation.

## 9. Concept 2 — Focused Navigator

This concept optimizes focused editing. A persistent inner navigation column lists Overview, Deactivation, National Address, Default Contact Info, Main Data, Other Data, Sub Ledgers, and Contact Details. The content column shows only the selected section, with a compact Customer identity summary remaining above it.

Unlike the Scroll Navigator, selecting a destination replaces the content panel rather than scrolling a long page. This reduces visual load and is suitable for users who usually update one category at a time.

## 10. Concept 3 — Compact Workspace

This concept optimizes scanning and data-entry density. A compact Customer summary band leads into responsive grouped cards. Identity and frequently used contact/commercial data appear first; secondary details use compact collapsible cards; Sub Ledgers and Contact Details remain full-width at the bottom.

The layout fills wide screens with balanced columns while preserving the source field groupings. It does not hide fields behind an Advanced mode or remove any legacy data. On narrower screens, the cards stack in their semantic order.

## 11. Concept 4 — Scroll Navigator

This concept uses the requested two-column layout:

- A sticky vertical navigation column lists every section title.
- A continuous content column renders all form sections in the same order.

Selecting a navigation link expands its target when collapsed, then scrolls the target section into view. The active navigation item follows the user's scroll position through lightweight scroll-spy behavior. Direct navigation updates `aria-current`; section headings remain keyboard-operable; reduced-motion preferences disable smooth scrolling.

This differs from Focused Navigator because all sections remain in the document and users can read or scroll through the full record without changing panels. On narrow screens, the navigator moves above the content as a compact sticky section selector while the content stays continuous.

## 12. Record actions and prototype behavior

- The Customer toolbar uses Customer-appropriate Record, Procedure, and More actions while retaining the approved shell styling.
- View, edit, and create modes use the same action-state conventions as Sales Invoice: view offers New/Modify, edit/create offers Save/Undo, and unsaved navigation uses the existing guard pattern.
- Collapsible headings expand/collapse with mouse and keyboard.
- Select Photo, Columns, Export, and unavailable business procedures use explicit prototype toasts and make no external changes.
- Empty Sub Ledgers and Contact Details states remain usable and visually intentional.
- Customer row navigation and Add Customer update Customer breadcrumbs, title, record count, and field values without changing invoice data.

## 13. Accessibility and responsive behavior

- Tabs, navigators, collapsible headings, forms, and grids use semantic roles and accessible names.
- Visible focus treatment follows the shell tokens.
- Concept selection and section selection are keyboard-operable.
- Form labels remain associated with their controls in every layout.
- RTL and compact-density prototype controls continue to work on the Customer record.
- At desktop widths, Concepts 2 and 4 retain their two-column navigation/content structure. At narrow widths, their navigator moves above the content without horizontal page overflow.

## 14. Verification

Verification must cover:

1. The existing Sales Invoice list and record still render and behave as before.
2. Customers navigation opens the list; Add and row selection open the correct Customer record mode.
3. All nine approved list columns render with representative data.
4. The Customer layout control switches among all four concepts and affects no invoice view.
5. Edited Customer values persist while switching concepts.
6. Every screenshot field appears in every concept.
7. Guided Sections tabs/collapsibles work.
8. Focused Navigator replaces only its content panel.
9. Compact Workspace stacks without overflow at narrow widths.
10. Scroll Navigator links expand collapsed targets, scroll correctly, and update the active item.
11. Sub Ledgers and Contact Details show truthful empty states.
12. Keyboard focus, RTL, compact density, and reduced-motion behavior remain usable.
13. No browser-console errors occur during the core flows.
14. `git diff --check` and the repository's available formatting/syntax checks pass.

## 15. Explicit non-goals

- No production backend or durable persistence.
- No real photo upload, column customization, export, filtering engine, or server pagination.
- No invented Contact Details schema.
- No redesign of the approved app shell.
- No Sales Invoice concept, content, state, or interaction changes.
