# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Accountants / sales clerks doing heavy invoice entry all day (keyboard speed and density matter), plus managers reviewing and approving documents. Bilingual environment: Arabic and English users, mixed-direction data (Arabic item names inside an English UI and vice versa).

## Product Purpose

Skey ERP is a web ERP (demo at app.skeyerp.com). The surface under audit is the Sales Invoice screen's **app shell**: the topbar (Record / Procedure / Transactions / More menus, breadcrumb, status ribbon, record pager) and the right action sidebar (add, search, save, print, undo, user actions). The shell behaves like a data-sheet/record-navigator over documents with statuses (Draft, Returned, ...). This repo documents an audit of that shell, feeding a later Figma redesign of the app shell.

## Positioning

Skey ERP supports dense, keyboard-first document work in a bilingual ERP environment. Its app shell keeps record state and familiar ERP navigation visible while users enter, review, and approve business documents.

## Operating Context

- Sales clerks and accountants perform sustained invoice and document entry where speed and density matter.
- Managers review and approve records with statuses such as Draft and Returned.
- Arabic and English interfaces must handle mixed-direction business data.
- The app shell coordinates topbar menus, breadcrumbs, status, record navigation, and a right-side action rail.

## Capabilities and Constraints

- The shell provides Record, Procedure, Transactions, and More menus; a breadcrumb; status ribbon; record pager; and actions for add, search, save, print, undo, and user operations.
- The launchpad and application shell must support both LTR and RTL locales.
- Keyboard access, information density, and persistent record state are product requirements.
- This repository is a working audit and prototype that informs a later Figma redesign.

## Brand Commitments

Utilitarian, dense, familiar-ERP. The shell should disappear into the task; trust comes from consistency and predictability, not decoration.

Avoid consumer-app minimalism that hides record navigation or bulk actions behind extra clicks, icon-only mystery-meat toolbars without labels or tooltips, and decorative dashboard treatments on transactional screens.

## Evidence on Hand

- Runnable app-shell prototype: `concepts/app-shell.html`.
- Repository fixtures and screens demonstrate invoice entry, customer management, geography, messaging, application switching, record states, and bilingual behavior.
- Product demo reference: `app.skeyerp.com`.
- No customer testimonials, benchmark results, or deployment claims are recorded in this repository; future work must not fabricate them.

## Product Principles

- Keyboard-first data entry: every shell action reachable and fast without the mouse.
- State always visible: document status, dirty/saved state, and current record position must be legible at a glance.
- Bilingual by construction: RTL/LTR and Arabic/English mixing is a first-class case, not an afterthought.
- Earned familiarity: standard ERP affordances (record pager, action rail, menu bar) done precisely, not reinvented.

## Accessibility & Inclusion

WCAG 2.1 AA target: 4.5:1 text contrast, full keyboard operability, visible focus, proper ARIA on menus/toolbars/pager, 44px touch targets where feasible in dense UI.
