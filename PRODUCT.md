# Product

## Register

product

## Users

Accountants / sales clerks doing heavy invoice entry all day (keyboard speed and density matter), plus managers reviewing and approving documents. Bilingual environment: Arabic and English users, mixed-direction data (Arabic item names inside an English UI and vice versa).

## Product Purpose

Skey ERP is a web ERP (demo at app.skeyerp.com). The surface under audit is the Sales Invoice screen's **app shell**: the topbar (Record / Procedure / Transactions / More menus, breadcrumb, status ribbon, record pager) and the right action sidebar (add, search, save, print, undo, user actions). The shell behaves like a data-sheet/record-navigator over documents with statuses (Draft, Returned, ...). This repo documents an audit of that shell, feeding a later Figma redesign of the app shell.

## Brand Personality

Utilitarian, dense, familiar-ERP. The shell should disappear into the task; trust comes from consistency and predictability, not decoration.

## Anti-references

- Consumer-app minimalism that hides record navigation or bulk actions behind extra clicks.
- Icon-only mystery-meat toolbars with no labels or tooltips.
- Decorative dashboards aesthetics (gradients, glassmorphism) on transactional screens.

## Design Principles

- Keyboard-first data entry: every shell action reachable and fast without the mouse.
- State always visible: document status, dirty/saved state, and current record position must be legible at a glance.
- Bilingual by construction: RTL/LTR and Arabic/English mixing is a first-class case, not an afterthought.
- Earned familiarity: standard ERP affordances (record pager, action rail, menu bar) done precisely, not reinvented.

## Accessibility & Inclusion

WCAG 2.1 AA target: 4.5:1 text contrast, full keyboard operability, visible focus, proper ARIA on menus/toolbars/pager, 44px touch targets where feasible in dense UI.
