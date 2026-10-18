# Skey Demo Prototype — Master Specification

Status: **implementation under review; G5/G7/G8 acceptance pending** · 2026-10-17 · branch `feat/prototype-quality-pass` (HEAD `f29d61c`, all 2026-10-17 work uncommitted)
Execution plan: [`../plans/2026-10-17-skey-demo-prototype-delivery.md`](../plans/2026-10-17-skey-demo-prototype-delivery.md)

This document is the single execution contract for the Skey ERP demonstration prototype. It consolidates the 13 earlier design specs, the defect ledger, and the 2026-10-16/17 reports. Those documents remain the detailed design record. Where they disagree with this one, **this one wins**, and §9 records the reason.

---

## 0. Summary

**Accepted (done, verified, not to be reopened without reproducible evidence):**
- App-shell componentisation (`2026-09-13`).
- Tailwind migration (`2026-09-14`).
- Customer pages with the Scroll Navigator (`2026-08-23`, `2026-09-15`).
- Profile (`2026-09-23/27`) and Organization Center (5 visible sections).
- For You landing pages (`2026-10-03`).
- Email-first sign-in (`2026-10-05` + addendum).
- Collaboration suite (`2026-10-13`).
- Visual QA batches 1–3 (VQA-01…06, VQA-08) and SR-01.
- The 128-image visual coverage.
- Mail draft recovery.
- Invoice selection coherence (number/sequence/status only).

**Original delivery gaps:** the following groups drove implementation. Current requirement status is in §3–§5; implemented does not mean prototype acceptance.
- **Defects that break the demo:**
  - A crash path: invoice status `Deactivated`.
  - Toasts that claim things that didn't happen: "Saved as invoice 129" and "no longer appears in the list".
  - Every unbuilt navigation leaf silently opens the Sales Invoice record.
  - Leaving a dirty invoice or customer through the shell skips the unsaved-changes guard.
- **Demo-data incoherence:** invoice header and totals vs the list row, the demo clock, user identity, and cross-module names.
- **Bilingual gaps:** about 130 toasts and 5 dialog files are English-only in Arabic mode.
- **Open accessibility defects from the 2026-09-13 audit:** ledger #2, #3, #4 and #10.

**Decided 2026-10-17:** D-01, D-02, D-03 and D-07 (§9.1 A-12…A-15).

**Decision update 2026-10-17:** P-05, P-06 and P-07 are approved. In-memory persistence, canonical identity and Arabic copy have been implemented. Update 2026-10-18: 89 exact user-approved PNG replacements are applied. Final full regression completed with 1,979 passed / 41 failed / 556 skipped; protected visual differences, historical toolbar timeouts and unexplained capture variants prevent an all-green acceptance claim. See the consolidated acceptance record; the historical 76-failure record is unchanged. At the 2026-10-17 decision point, 36 already-modified protected PNGs were the approved A-05 replacements and 33 other changed images were report assets. Those historical counts are separate from the 89 exact replacements approved on 2026-10-18.

---

## 1. Product scope

### 1.1 Purpose and audience
- **Purpose:** a coherent, convincing, reliable ERP prototype for live demonstrations and design/engineering review. It also feeds a later Figma app-shell redesign (`PRODUCT.md`).
- **Audience:**
  - Sales clerks and accountants doing dense, keyboard-first entry.
  - Managers reviewing and approving.
  - Arabic and English users, with mixed-direction data.

### 1.2 In-scope surfaces (demo surface)

| Area | Screens / routes | Depth |
|---|---|---|
| Sign-in | `/signin`: 11 panes (email, branch, password, accounts, PIN, save, savepin, request, reset, privacy, support) | Full |
| Shell | Launchpad overlay, rail and panel nav, topbar (app switcher, search Ctrl+K, notifications, assistant, user menu), keyboard dialog, Customize sidebar, logout, Prototype Controls kit | Full |
| For You | 20 app base paths (`/dashboard`, `/customers`, …) | Landing only, with static KPI cards |
| Sales Invoice | `/sales-systems-management/sales-invoices`: list (grid, Compact/Adaptive/Cards) and record (5 tabs, lines, payments, charges, status chain, print, activity drawer, posting/journal dialogs) | Full |
| Customers | `/customers/list`: list and record (Scroll Navigator; view/edit/create; guard) | Full |
| Geographical Structure | `/system-setup/geographical-structure`: list (Tree/Flow), record, pickers, status dialogs | Full |
| Collaboration | `/help-screens/{notes,activities,events,people-data,email}` | Full (sessionStorage) |
| Profile | `/system/profile?section=`: 7 sections | Full (sessionStorage) |
| Organization Center | `/system/organization?section=`: overview, settings, users, application-sessions, database-sessions; roles via `#active-role` | Full |

### 1.3 Explicitly excluded
- **Screens:**
  - 15 apps beyond their For You page (Vendors, Inventory, Purchase, POS, Finance, HCM, Fixed Assets, MRP, Real Estate, Maintenance, CRM, Hospital, Car rent, Reports, System Administration).
  - Every navigation leaf not listed in §1.2.
- **Backend:** no production backend, API, auth server, or persistence beyond `sessionStorage`/`localStorage`.
- **Business logic:**
  - Real posting, costing, tax-authority integration, approval workflow, or payment gateway.
  - Real PDF and real export.
  - Real email delivery.
  - Calendar recurrence expansion, drag-to-reschedule, or external sync.
- **Languages:** only EN and AR are functional. The other 5 selector languages are display-only (`tests/language-selector.test.mjs`).
- **Removed design concepts:** invoice concepts B/C, list B/C, the Simple/Advanced toggle (`docs/design-rationale/sales-invoice-concepts.md`), and the extra customer layout concepts.
- **Invented evidence:** no testimonials, benchmarks, or deployment claims (`PRODUCT.md`).

### 1.4 Demo-ready definition (prototype level)
The prototype is demo-ready when every condition below holds:
1. Journeys J1–J8 (§2) pass end-to-end on all 7 Playwright projects (A-12).
2. No in-scope screen shows information that contradicts another in-scope screen. "Shared demo data" disclosures (DAT-*) are allowed only where §4 permits them.
3. No toast, dialog, or label claims an outcome that did not happen.
4. No navigation silently lands on an unrelated screen.
5. Every P0 and P1 requirement is `Accepted` or recorded as a `Limitation` in §9.3 with the reviewer's agreement.
6. Gates G1–G9 (§7) have all been run, and their evidence is recorded in the completion report.

---

## 2. User journeys

Each journey is the unit for workstream-level acceptance. Specs listed under "Verify" exist; specs marked *new* are created by the plan.

| ID | Journey | Entry → steps → resulting state | Recovery | Depends on | Verify |
|---|---|---|---|---|---|
| J1 | Sign in | `/signin` → email `admin@lastchance.local` → branch, if the workspace has more than one → password `skey123` → Save step (Not now / Create PIN) → shell. A returning user goes PIN → shell. | Wrong PIN shows "Sign in as someone else". Unknown email leads to Request access. Forget account. | — | `signin-pages`, `signin-gate` |
| J2 | Find a screen | Launchpad tile / app switcher / rail → app For You → panel leaf → screen. Ctrl+K search. | Unbuilt leaf → honest placeholder (SHL-03). Back/Forward restore the view. | J1 | `routing`, *new* `navigation-honesty.spec.mjs` |
| J3 | Work an invoice | List → open row → detail matches the row (identity, status, A-13 fields) → status action → back → list shows the new status. New → lines → Save → numbered record appears in the list. Edit → dirty → leave by any route → guard. Print. Post (with `failsim`). | Undo discards edits. Guard offers stay/discard. Failed post explains the failure and keeps state. | J2 | `invoice-selection`, `invoice-geography`, *new* `invoice-journey.spec.mjs` |
| J4 | Maintain a customer | List → open row → detail matches the row → Modify → edit → Save → list reflects the change. Add Customer → Save → new row. Inactive customer shows its reason. | Guard on every leave route. Undo restores the snapshot. | J2 | `lifecycle`, *new* `customer-journey.spec.mjs` |
| J5 | Maintain geography | Tree/Flow → record → edit → Save → tree reflects it. Status toggle with reason. Create → new node appears. | Undo re-renders. | J2 | `invoice-geography` |
| J6 | Collaborate | Notes / Activities (Kanban, Calendar) / Events / People / Internal Mail. Link items across types. Mark done → follow-up. Compose → reload → draft recovered → send once. | Discard confirmation. Deleted link target shows "Unavailable item". Reset kit. | J1 | `collaboration`, `help-screens-consistency`, `mail-draft-exit` |
| J7 | Account and organization | User menu → Profile sections (edit employee contact, security dialogs, sessions) → Organization Center under Administrator / Manager / User roles → revoke a session with a reason → audit entry. | Role change hides sections; on the User role the open page moves to Profile. | J1 | `profile-lifecycle`, `organization-center`, `user-menu`, `account-rail` |
| J8 | Bilingual and appearance | Switch AR (RTL) and back, dark, high contrast, density, reduced motion across J3–J7 surfaces. | Settings restore after reload. | J3–J7 | `language-switcher`, `components`, 7 Playwright projects |

**Shared workflows across modules:**
- Data-list engine (J3/J4/J5).
- Record pager and status dialogs.
- Unsaved-changes guard (J3/J4/J6).
- Toasts and `work.js` simulated latency/failure.
- Locale.
- `collabStore` links: collaboration items reference invoices and customers by label only.

---

## 3. Functional rules and requirements

Fields used in every requirement table:
- **Pri:** P0 = demo-breaking; P1 = coherence, bilingual and accessibility commitments; P2 = polish.
- **Status:**
  - `Accepted`: done and verified by an accepted report.
  - `Implemented`: present in code, but no acceptance evidence beyond existing tests.
  - `Partial`
  - `Gap`
  - `Deferred`
  - `Limitation`: accepted as-is, disclosed.
- **Verify:**
  - `T`: automated Playwright or unit test (named in §8).
  - `R`: review against evidence.
  - `V`: visual review packet (G5).

### 3.1 Shell and navigation (SHL)

| ID | Pri | Requirement | Status | Acceptance | Verify |
|---|---|---|---|---|---|
| SHL-01 | P0 | One shared shell; pages follow the `{id, roots, activate, deactivate, dispose}` contract (`core/navigation.js`) | Accepted | `architecture.test`, `navigation.test` pass | T |
| SHL-02 | P1 | Every in-scope screen has a stable route (§1.2); Back/Forward restore the view | Accepted | `routes.test`, `routing.spec` pass | T |
| SHL-03 | P0 | A nav leaf, search result or quick list item with no screen opens a **"Not in this prototype"** placeholder naming the requested screen and its app, with a route back to the app's For You page. It never opens the Sales Invoice record (ledger #7; `shell/sidebar.js:131`). | Implemented; delivery gates pending | For each of 3 sampled unbuilt leaves in 3 apps: title equals the leaf label, no invoice content visible, Back returns. Search-palette screen results behave the same. | T |
| SHL-04 | P0 | Leaving a dirty record through **any** route (rail, panel, topbar app switcher, user menu, search, notifications, browser Back) runs that page's unsaved-changes guard. `main.js:1014` currently consults only the list-layout guard. | Implemented; delivery gates pending | Dirty invoice and dirty customer × {rail leaf, app switcher, Back}: guard appears. Stay keeps the edits; discard navigates. | T |
| SHL-05 | P1 | Search palette record results either open their record or go through SHL-03; no generic "out of scope" toast for listed records | Implemented; delivery gates pending | Each of the 5 `RECORDS` entries opens a record or the placeholder | T |
| SHL-06 | P1 | Prototype Controls kit stays visibly a review aid. Its controls restore after reload. It never covers a primary action (VQA-05 accepted). | Accepted | `lifecycle`, `visual-qa-batch2` | T |
| SHL-07 | P2 | Persistent "Actions apply to invoice 126" copy in the search palette and shell (`shell/shell.html:44,57`; `search.js:36`; `locale.js:405`) follows the current record, or is removed when no invoice is open | Implemented; delivery gates pending | With invoice 145 open, the palette context shows 145. On a non-invoice page, no invoice context appears. | T |

### 3.2 Sales Invoice (INV)

Lifecycle, as used in code (`operations.js:13–21`) and declared authoritative here:

```
draft → open | canceled
open → pending | canceled
pending → open | posted
posted → pending | returned | canceled
returned, canceled, deactivated: terminal
```

Editable only when mode ≠ record and status ∉ {posted, canceled, deactivated}. Opening a locked row via Modify opens it in view mode (accepted 2026-10-17).

| ID | Pri | Requirement | Status | Acceptance | Verify |
|---|---|---|---|---|---|
| INV-01 | P0 | Selecting any list row shows that row's number, sequence and status in the header, General fields, dialogs, journal identifiers, history header and print subject | Accepted | `invoice-selection.spec` (all 8 rows, 7 profiles) | T |
| INV-02 | P0 | Every status value reachable through the UI or Prototype Controls renders without error and round-trips list ↔ record. `Deactivated` currently writes a label (`'Deactivated'`) whose lowercased form is not a `STATUSES` key (`inactive`). | Implemented; delivery gates pending | Set `#st` = Deactivated on row 145 → back → reopen: no console error, badge "Deactivated", record locked, kanban shows it or excludes it per INV-05 | T |
| INV-03 | P0 | Create → Save assigns the next number after the highest existing one (currently 149, not the hardcoded 129 at `operations.js:249`). The header shows it, the record becomes the selected row, and a list row is added with the values shown in the record. The "Open it" toast action opens it, or is removed. | Implemented; delivery gates pending | New → add a line → Save: header shows 149, list contains 149 with status Open, reopening shows the same values | T |
| INV-04 | P0 | Delete from the record removes the row from the list, as its toast says. Delete from the list obeys the record's rule: blocked for Posted/Canceled (`invoices.js:63–69` vs `data-list/actions.js:43–55`). | Implemented; delivery gates pending | Record delete on an Open row → row gone. List row menu on a Posted row → Delete unavailable or blocked with a reason. | T |
| INV-05 | P1 | List row status menu, kanban columns and record transitions use one transition table (the lifecycle above). Today the row menu offers only Open/Pending/Returned (`renderers.js:115`). | Implemented; delivery gates pending | For each status, the row menu offers exactly the lifecycle's targets; kanban has a column or a documented exclusion for every status | T |
| INV-06 | P1 | Header fields that already exist on the list row (customer, date, due date, payment type, currency, branch, warehouse, sales rep, price list) are row-specific (A-13). `state.pay` currently ignores `row.pay` (`invoices.js:6–10`); fixing that also fixes Receipt Voucher availability. | Implemented; delivery gates pending | For rows 143 (Cash) and 145 (Credit): payment control and Receipt Voucher availability match the row. A-13 fields match the list columns. | T |
| INV-07 | P1 | Totals area stays representative (A-13). The disclosure names every field that remains shared, totals included. No fabricated calculation. | Implemented; delivery gates pending | Disclosure text lists the shared fields, including totals | T/R |
| INV-08 | P1 | Dialog money footers (`record-dialogs.html:142,231,474`), the journal table (`journal-entry.js`) and the assistant canned text (`assistant.js:24,28`) do not contradict the selected invoice. Either they derive from the same source as INV-07 or they are covered by the disclosure. | Implemented; delivery gates pending | With row 147 selected, posting/journal/cancel dialogs show values consistent with INV-07 | T |
| INV-09 | P1 | Boot and default record is a member of the list. Today invoice 126, which is not in the list, is the boot record (`invoices.js:15–17`). | Implemented; delivery gates pending | Fresh load of the invoice record route shows a list member, or the list | T |
| INV-10 | P0 | Record keeps the accepted features: 5 tabs, payments add/remove, line entry, charges, status chain popover, print dialog, activity drawer, posting with `failsim` | Accepted | `invoice-geography` invoice cases (56) | T |
| INV-11 | P2 | Pager "Record 1 of 125" and list simulated total 125 reflect the real row count (ledger #9) | Implemented; delivery gates pending | Pager shows "n of 8"; page 2 does not advertise rows that don't exist | T |
| INV-12 | — | VQA-07 RTL financial-token formatting | **Deferred** (D-06) | Not implemented until the policy is approved | — |

### 3.3 Customers (CUS)

| ID | Pri | Requirement | Status | Acceptance | Verify |
|---|---|---|---|---|---|
| CUS-01 | P0 | List of 9 columns; opening a row shows that row's identity fields (`createSavedCustomerData`, `customers/fields.js:65–81`); other fields come from the shared reference record under the existing disclosure model (§4) | Implemented | Each of the 3 rows: number, name, unit, type, group, currency, country and phone match the list | T |
| CUS-02 | P0 | View/edit/create modes, Save/Undo, unsaved-changes guard ("Leave without saving" / "Save, then leave") | Accepted | `lifecycle.spec` | T |
| CUS-03 | P1 | Save in edit mode writes the mapped fields back to the list row. Save in create mode adds a row. Today neither happens (`record.js:429–458`). | Implemented; delivery gates pending | Edit the name of 200002 → Save → list shows the new name. Add Customer → Save → new row present and reopenable. | T |
| CUS-04 | P1 | An inactive customer shows its deactivation reason (`statusReason`) and a date consistent with the demo clock | Implemented; delivery gates pending | Open 200001: reason visible, date ≤ demo clock | T |
| CUS-05 | P1 | Guard covers all leave routes | Implemented; delivery gates pending | via SHL-04 | T |

### 3.4 Geographical Structure (GEO)

| ID | Pri | Requirement | Status | Acceptance | Verify |
|---|---|---|---|---|---|
| GEO-01 | P0 | Tree/Flow list and record are fully row-specific; edits write back (`geography.js:137–156`) | Implemented | Existing geography cases | T |
| GEO-02 | P0 | Create → Save adds the node. Today it toasts "Location saved" and writes nothing (`geography.js:538–543`). | Implemented; delivery gates pending | Create a city under Cairo → Save → appears in the tree, reopenable | T |
| GEO-03 | P1 | Status toggle with reason works in both locales. The existing test "geography record status toggle" expects English `Inactive` in mobile-rtl; that is a **test defect**: the UI correctly shows `غير نشط`. | Implemented; delivery gates pending | Test asserts the locale-appropriate label; passes on all 7 profiles | T |

### 3.5 Collaboration (COL)

| ID | Pri | Requirement | Status | Acceptance | Verify |
|---|---|---|---|---|---|
| COL-01 | P0 | Notes, Activities, Events, People and Internal Mail behave per `2026-10-13-collaboration-suite-design.md`. Store key `skey-proto-collab`; links undirected; deleted targets show "Unavailable item". | Accepted | `collaboration.spec` (69), `help-screens-consistency` | T |
| COL-02 | P0 | Mail drafts survive reload and navigation before autosave | Accepted | `mail-draft-exit.spec` | T |
| COL-03 | P1 | Switching to another message while composing does not silently discard the draft (ledger #5). Verify whether the existing autosave/flush already covers it; close the gap only if it reproduces. | Implemented; delivery gates pending | Type in the composer → open another message → return: draft exists | T |
| COL-04 | P1 | Mobile Mail reading has a usable reader (ledger #1, P0 at the 2026-09-13 audit; VQA-01 fixed the reader height) | Accepted (VQA-01); update the ledger | `visual-qa-batch1` VQA-01 | T/R |
| COL-05 | P2 | Calendar mobile context strip; 30-minute event paint/hit separation (VQA-04, VQA-08) | Accepted | `visual-qa-batch2` | T |

### 3.6 Profile, Organization, Sign-in (ACC)

| ID | Pri | Requirement | Status | Acceptance | Verify |
|---|---|---|---|---|---|
| ACC-01 | P0 | Sign-in journey J1 per `2026-10-05-signin-pages-design.md` and its 2026-10-16 addendum; storage key `skey-proto-accounts` | Accepted | `signin-pages`, `signin-gate`, `signin.test` | T |
| ACC-02 | P1 | Profile has 7 sections, including "Contact details", which is not in the 09-23 spec. Retention is **proposed** (§9.2 P-02); no change is planned. | Implemented | `profile-lifecycle`, `profile-page.test` | T |
| ACC-03 | P1 | Organization Center: 5 visible sections. `audit`, `performance` and `staff` are hidden in `organization/fields.js:5`; retention is **proposed** (§9.2 P-03). Role gating per `organization/access.js`. Session revoke/terminate needs a reason, is blocked for current/system/maintenance sessions, and writes an audit entry. | Accepted | `organization-center.spec` / `.test` | T |
| ACC-04 | P1 | Password identity wraps by token (VQA-06) | Accepted | `visual-qa-batch3` | T |

---

## 4. Demo data

### 4.1 Rules
- **DAT-R1:** A field shown on both a list row and its detail view must have the same value in both. If the detail value is not row-specific, it must sit under a visible disclosure, as the invoice record already has (`templates.html`, "Prototype: identity and status follow the selected invoice…").
- **DAT-R2:** Values come only from existing fixtures, or from values the user entered in this session. No new financial calculations, no invented amounts, no new business rules (e.g. tax computation).
- **DAT-R3:** One demo clock. `PROTOTYPE_NOW = 2026-10-13T13:24` (`fixtures/collaboration.js:12`) is authoritative. Fixture dates shown as "today" or "recent" must not lie in the future relative to it, and must not contradict their own sequence (an invoice's audit chain is not older than the invoice).
- **DAT-R4:** One signed-in identity: the user who signs in as `admin@lastchance.local` is the same person as Profile's `CURRENT_USER`, Organization user `usr-1`, collaboration `me`, and the addressee of inbox mail.
- **DAT-R5:** A named party has one role and one name spelling across modules, or the difference is intentional and visible (e.g. a separate vendor).
- **DAT-R6:** Fixture edits that change pixels on protected snapshots follow G5. They are batched per workstream.

### 4.2 Requirements

| ID | Pri | Requirement | Status | Evidence | Verify |
|---|---|---|---|---|---|
| DAT-01 | P1 | Invoice list rows, record, dialogs, journal and assistant obey DAT-R1/R2 (INV-06…INV-09) | Implemented; delivery gates pending | `2026-10-17-invoice-selection-coherence.md` | T |
| DAT-02 | P1 | Demo-clock coherence (DAT-R3). Known contradictions to fix:<br>- invoice CHAIN and ACTIVITY dated Feb 2026 vs invoices dated Aug 2026<br>- mail e1 16:05 and s1 14:40 are later than "now" 13:24<br>- `nextMaintenance` 2026-09-20 has passed<br>- `deactivationFrom` hardcoded `2026-08-01` | Implemented; delivery gates pending | Architecture review, §2 | T (date assertions), V |
| DAT-03 | P1 | Identity coherence (DAT-R4). Known contradictions:<br>- inbox addressed to "Kathleen" (`messages.js:49ff`)<br>- `COLLAB_USERS` derives `majed@…` while `me` is `admin@…` (`collaboration.js:20,25`)<br>- `CURRENT_USER.branch` 'lastchance' vs `usr-1` 'Cairo HQ'<br>- manager "Ahmed Hassan" is not an org user | Implemented; delivery gates pending | Architecture review, §2 | T, V |
| DAT-04 | P2 | Cross-module parties (DAT-R5):<br>- Al Noor appears as a customer in notes, a vendor in e4, and on a supplier-visit event, but not in `CUSTOMER_ROWS`<br>- invoice `custName` "العميل الاول" with branch `1 - headoffice` vs the customer fixture's unit `2 - lastchance`<br>- customer `unitLocation` codes vs geo codes (`CAI`) | Implemented; delivery gates pending | Architecture review, §2 | R, V |
| DAT-05 | P2 | Inactive customer 200001 has an Open invoice (145). Either acceptable (the invoice predates deactivation; dates must show it) or change the fixture. **Builder's call within DAT-R3.** | Implemented; delivery gates pending | — | R |
| DAT-06 | — | Fixed subtotal 200, zero tax, zero line-money outputs on the invoice record | **Limitation** (A-08; A-13 keeps totals representative) | Invoice-selection report | — |
| DAT-07 | — | English fixture text (names, remarks) in Arabic mode | **Limitation** (A-09) | Batch reports | — |

### 4.3 Record-specific vs representative fields (after A-13)

| Module | Record-specific | Representative (disclosed) |
|---|---|---|
| Invoice | no, seq, status, plus customer, date, dueDate, pay, currency, branch, warehouse, salesRep, priceList | lines, payments detail, other tabs, history/CHAIN, totals (per INV-07) |
| Customer | no, name, unit, type, group, currency, country, phone, photo, active and reason | address, contact, main/other data, sub-ledgers (empty) |
| Geography | all | — |
| Collaboration | all (store) | — |
| Profile / Org | single user / list-only | — |

---

## 5. UI/UX and design system

| ID | Pri | Requirement | Status | Verify |
|---|---|---|---|---|
| UX-01 | P0 | Utilitarian, dense, familiar-ERP shell; no consumer minimalism, no icon-only mystery toolbars without labels or tooltips (`PRODUCT.md`) | Accepted | R |
| UX-02 | P0 | Approved layouts: invoice Data Grid list plus Guided Tabs record; customer Scroll Navigator; Geography Tree/Flow; collaboration Kanban/List/Calendar | Accepted | T/V |
| UX-03 | P1 | Responsive behaviour on the 7 Playwright profiles; mobile at 390×844 without document overflow (accepted Batch 1–3 and SR-01 fixes). All 7 profiles in scope (A-12). | Partial | T/V |
| UX-04 | P1 | RTL: logical properties; `applyRecordValueDirections` (numbers, dates and phones LTR). Financial tokens: VQA-07 deferred (D-06). | Implemented | T |
| UX-05 | P1 | Arabic completeness: every user-visible string on in-scope surfaces goes through `t()` / `data-i18n` — about 130 toasts across 27 files, and `invoices/record-dialogs.html`, `print-dialog.html`, `customers/dialogs.html`, `geography/dialogs.html`, `data-list/list-dialogs.html`, plus invoice tab and summary labels, kanban columns, row-menu actions, validation messages. Names in fixture data are excluded (DAT-07). | Implemented; delivery gates pending | T |
| UX-06 | P1 | Accessibility (WCAG 2.1 AA target), open ledger items:<br>- #2 pager Prev/Next accessible names<br>- #3 mobile Columns/view trigger names<br>- #4 selected nav/pagination contrast 4.28:1 → ≥ 4.5:1<br>- #10 coarse-pointer 44 px targets on list controls | Implemented; delivery gates pending | T (accessible-name and computed-contrast assertions), V |
| UX-07 | P2 | Mobile invoice statistics do not push the list below the fold (#11) | Implemented; delivery gates pending | T/V |
| UX-08 | P2 | ApexCharts does not block initial load (#12). The integrity attribute and `chart-parity` must remain. | Implemented; delivery gates pending | T |
| UX-09 | P0 | **Raster policy:** a pixel difference on a protected snapshot is either (a) a reviewed, intended change approved per path, or (b) an open item. Unexplained differences are never assumed harmless and never accepted by tolerance or mask. The 11 retained unexplained pairs (`2026-10-17-visual-qa-visual-differences-investigation.md`) stay open as **L-05**, outside the delivery critical path. | Accepted policy | R |

---

## 6. Architecture and implementation constraints

- **ARC-01 Stack:**
  - Authored `concepts/app-shell.html` → `scripts/build.mjs` → `dist/`.
  - Native ES modules from `concepts/app/main.js`.
  - Tailwind 4.3.3 CLI precompiled; Playwright 1.63.0.
  - No framework, bundler, PostCSS, new runtime dependency, or backend (`docs/app-shell-development.md`).
  - Install with `npm ci` only.
- **ARC-02 Ownership:**
  - `shell/` owns shell interactions.
  - `pages/<page>/` owns page workflows.
  - `components/data-list/` owns shared list behaviour.
  - `prototype/fixtures/` owns sample data.
  - `prototype/controls*` owns the review kit.
  - Pages register once in the `main.js` registry.
- **ARC-03 Styling:**
  - Literal-utility rule.
  - Named `@source inline()` per dynamic constant.
  - Selector rules only in the five compatibility categories, each with a row in `styles/tailwind/compatibility.md`.
  - Tailwind byte budget in `tests/tailwind.test.mjs`.
  - **Known debt:** the 2026-10-17 selector rules (`.email-message-toolbar…`, `.email-composer[data-empty-quick-reply]`, `#items-body .items-*`, `.collab-calendar-context`, `.gtop…`, the controls.css `:has()`) have no compatibility rows. Recorded as ARC-D1. It is reconciled by documentation or conversion **only** if `tailwind.test`/`architecture.test` fail on it, or the reviewer asks. Accepted visual fixes are not to be churned for style purity.
- **ARC-04 Hotspots (single owner per wave; see the plan):** `main.js`, `core/locale.js`, `components/data-list/columns.js`, `prototype/fixtures/*.js`, `pages/list-actions.js`, `components/data-list/menu-controller.js`, `pages/invoices/operations.js`, `styles/tailwind/shell.css`, `shell/shell.html`.
- **ARC-05 Prohibited scope expansion:**
  - No per-record URLs.
  - No new persistence layer.
  - No new screens beyond the SHL-03 placeholder.
  - No real calculations.
  - No refactors without a requirement.
  - No snapshot refresh without G5.
  - No changes to the 76-failure baseline record.
- **ARC-06 Docs to correct as a side effect** (no new reports):
  - `docs/app-shell-development.md` lines 90–96 mention `overrides.css`, which no longer exists.
  - The For You and collaboration specs use mail route `/system/email`; the code uses `/help-screens/email`, which is authoritative.
  - `known-defects.md` #1, #5, #7 and #8 need status updates when their requirements are accepted.
  - The 2026-10-16 week-start and hit-test proposals carry stale "proposed" headers but were applied (`7dd0da5`, `4cf58e6`).

---

## 7. Quality gates

Every run uses a **frozen static build**:
1. `npm run test:unit`
2. `npm run build`
3. Copy `dist` to `/private/tmp/<task>/frozen`.
4. `node scripts/serve.mjs --root <frozen> --port <N>`.
5. `PARITY_URL=http://127.0.0.1:<N> npx playwright test … --workers=2 --retries=0 --output=/private/tmp/<task>/…`

Never use mutable `dist` or `npm run dev` for browser gates (ledger #18). Never run unit tests in parallel with browser runs.

| Gate | Scope | Command | Pass criteria | Evidence |
|---|---|---|---|---|
| G1 Unit | all | `npm run test:unit` | 143 + new, 0 fail | count line |
| G2 Build/static | changed files | `npm run build`; `node --check <changed js>`; `git -c core.fsmonitor=false diff --check` | exit 0 | command list |
| G3 Focused behaviour | task's specs, 7 profiles | `PARITY_URL=… npx playwright test <task specs>` | all pass; red-before-green shown for new tests | pass/fail table |
| G4 Journey | workstream journey spec(s), 7 profiles (A-12) | as G3 | all pass | journey table |
| G5 Visual | protected PNGs touched | per-path before/after review at original resolution; original entry contract passes; explicit approval per path; before/after SHA-256 | every changed PNG approved by path; no unexplained diff accepted | review packet (one per workstream) |
| G6 Accessibility | UX-06 surfaces | assertions on accessible names, computed contrast ≥ 4.5:1 and target size ≥ 44 px under coarse pointer, in the journey specs | pass | assertion list |
| G7 Regression | full suite, all projects | `caffeinate -dims` + full `npx playwright test --workers=2 --retries=0` against a frozen build | every failure matched by exact test name + project to the ledger baseline (#14–#17), to a ledger entry closed by this delivery (then it must now pass), or to a listed new expected change; **zero unexplained new failures** | name-by-name diff vs 2026-10-16 run (1,193/76/516) |
| G8 RTL | `mobile-rtl` project + desktop AR manual pass of J3–J7 | G4 + G7 subset | pass; no English UI strings on in-scope surfaces except DAT-07 | screenshot or assertion list |
| G9 Preservation | repo | starting vs final file-hash inventory | only the task's declared files changed; protected PNGs changed only via G5 | hash diff |

**Test outcome handling:**
- **Skipped:** project-scoped skips (516 in the baseline) are expected, and are reported as a count. A new skip needs a reason in the task report.
- **Failed:** classified as *new*, *baseline* (ledger #14–#17, matched by name + project), or *closed* (a baseline entry fixed by this work: move it in the ledger with a date).
- **Unrun:** a gate not executed is reported as **unrun**, never as passed.
- **The 76-failure record is historical** and is not edited. The G7 result is recorded as a new dated entry.
- **Known unrelated failure:** geography status toggle on mobile-rtl, tracked by GEO-03.

---

## 8. Requirements traceability matrix

| Req | Screen / route | Code area | Tests (existing / *new*) | Evidence | Plan task |
|---|---|---|---|---|---|
| SHL-03 | all unbuilt leaves, search | `shell/sidebar.js:120-131`, `shell/search.js:143-148`, `main.js` registry, new `pages/placeholder/` | Implemented; delivery gates pending | ledger #7 | T1.1 |
| SHL-04, CUS-05 | invoice record, customer record | `main.js:1012-1030`, `components/data-list/guard.js:90-107`, `pages/invoices/operations.js:877-949`, `pages/customers/record.js:842-860` | *invoice-journey*, *customer-journey*, `lifecycle` | architecture review §3 | T1.2 |
| SHL-05 | search palette | `shell/search.js` | Implemented; delivery gates pending | — | T1.1 |
| SHL-07 | palette and shell | `shell/shell.html:44,57`, `shell/search.js:36` | Implemented; delivery gates pending | — | T2.4 |
| INV-02 | invoice record and list | `operations.js:46-51`, `fixtures/invoices.js:22`, `kanban.js` | Implemented; delivery gates pending | verified 2026-10-17 | T2.1 |
| INV-03 | invoice create | `operations.js:249-295`, `fixtures/invoices.js` LIST_ROWS | Implemented; delivery gates pending | verified | T2.2 |
| INV-04 | record and list delete | `operations.js:523-546`, `data-list/actions.js:43-55`, `renderers.js:141` | Implemented; delivery gates pending | — | T2.2 |
| INV-05 | row menu, kanban | `renderers.js:115`, `kanban.js:11-27`, `operations.js:13-21` | Implemented; delivery gates pending | — | T2.1 |
| INV-06/07/08/09 | invoice record and dialogs | `list-actions.js:107-119`, `invoices.js:6-17`, `adjustments.js:13,35`, `record-dialogs.html`, `journal-entry.js`, `assistant.js` | `invoice-selection` (+ cases) | invoice-selection report | T2.3 |
| INV-11 | lists, pager | `data-list/model.js` `DATA_LIST_SIMULATED_TOTAL`, `templates.html:636` | Implemented; delivery gates pending | ledger #9 | T5.2 |
| CUS-03/04 | customer record and list | `pages/customers/record.js:429-458`, `fields.js:65-81` | *customer-journey* | — | T3.1 |
| GEO-02 | geo create | `geography.js:538-543` | Implemented; delivery gates pending | — | T3.2 |
| GEO-03 | geo record (RTL) | `tests/invoice-geography.spec.mjs` | Implemented; delivery gates pending | invoice-selection report | T3.2 |
| COL-03 | mail | `pages/email/email.js` | Implemented; delivery gates pending | ledger #5 | T3.3 |
| DAT-02/03/04/05 | cross-module | `prototype/fixtures/*.js`, `components/assistant/*` | *demo-data.test.mjs* (unit date/identity invariants) | architecture review §2 | T4.1 |
| UX-05 | all in-scope | `core/locale.js`, the 5 dialog html files, toast call sites | Implemented; delivery gates pending | architecture review §4 | T4.2 |
| UX-06 | lists, nav | `components/data-list/pagination.js`, toolbar, `styles/tailwind/shell.css` | Implemented; delivery gates pending | ledger #2-4, #10 | T5.1 |
| UX-07, UX-08 | mobile invoice list; head | `statistics.js`, `app-shell.html` | `chart-parity`, *a11y-ledger* | ledger #11, #12 | T5.3 |
| ARC-06 | docs | listed files | — | — | T6.1 |
| Prototype gate | all | — | G1–G9 | — | T6.2 |

Accepted requirements (SHL-01/02/06, INV-01/10, CUS-02, COL-01/02/04/05, ACC-*, UX-01/02) are traced to their existing specs and reports in §3–§5 and need no task. They are re-verified only by G7.

---

## 9. Decisions and limitations register

### 9.1 Accepted decisions (do not reopen)

| ID | Decision | Source |
|---|---|---|
| A-01 | Invoice concepts B/C, list B/C and the Simple/Advanced toggle are removed | `docs/design-rationale/sales-invoice-concepts.md` |
| A-02 | Customer record uses the Scroll Navigator only; Kanban/Print/Chart list views are hidden but their code is kept | `2026-09-15` spec |
| A-03 | Week starts Sunday (visual coverage week 2026-10-11…17) | applied `7dd0da5`; `2026-10-16-sunday-start-preflight.md` |
| A-04 | Invoice summary hit-test neutral rail capture | applied `4cf58e6` |
| A-05 | VQA-01…06, VQA-08 and SR-01 fixes plus 36 approved snapshot replacements | batch1/2/3, snapshot-review, sr01, signin-snapshot-review reports |
| A-06 | Mail flushes the draft on `pagehide` | mail-draft-recovery report |
| A-07 | Invoice selection maps no/seq/status from the live row; locked rows open via Modify in view mode; saved Draft is distinct from an unsaved new invoice; disclosure label | invoice-selection report |
| A-08 | Fixed subtotal 200, zero tax and zero line money are accepted limitations (totals stay representative per A-13) | same |
| A-09 | English fixture text in Arabic mode is accepted | batch reports |
| A-10 | Zero-tolerance snapshots; replacement only with per-path review and approval | README, ledger |
| A-11 | The user approves G5 packets, limitation acceptance (§1.4 #5) and new D-xx decisions | user, 2026-10-17 (D-03 instruction) |
| A-12 | **D-01 → (a):** all 7 Playwright projects are in scope for the required journeys. WS-M is bounded: fix only reproducible app defects that block in-scope J3/J4 journeys; classify test-design defects separately; unrelated #17 failures stay baseline with evidence; no expansion without a demonstrated link to acceptance criteria | user, 2026-10-17 |
| A-13 | **D-02 → (a):** invoice customer, date, due date, payment type, currency, branch, warehouse, sales rep and price list come from the selected row. Totals and other unsupported details stay representative, under a disclosure that names the shared fields. Payment behaviour and Receipt Voucher availability follow the row. No invented amounts, calculations or rules | user, 2026-10-17 |
| A-14 | **D-03 → one G5 packet per workstream (5).** Implementation, focused tests and non-snapshot verification may continue while a packet waits. Protected PNG replacements stay pending until each path is explicitly approved. Each packet contains: original-size before/after comparisons, unchanged capture-contract results, before/after SHA-256. No blanket approval, automatic refresh, weakened assertion or tolerance | user, 2026-10-17 |
| A-15 | **D-07 → no commit or push.** The starting file-hash inventory (T0.1) and existing evidence anchor before/after. Preserve branch, worktree, uncommitted work and baseline records. Ask for commit authorization only at the T6.2 checkpoint | user, 2026-10-17 |

### 9.2 Proposals and approval status

P-05, P-06 and P-07 approved by the user in the Codex continuation on 2026-10-17. Other proposals remain pending.

These are implementer proposals. They are **not** accepted decisions. Work that depends on one waits until it is approved; work listed as "none" can proceed because it changes nothing.

| ID | Proposal | Rationale / evidence | Alternatives | Impact / blocks |
|---|---|---|---|---|
| P-01 | Mail route is `/help-screens/email`; update the For You and collaboration specs, which say `/system/email` | Code (`routes.js:53,77`), README and tests use it; no record of an approval either way | Change the code to `/system/email` (route, tests, README) | Blocks only the T6.1 doc edit; no behaviour change |
| P-02 | Keep the Profile "Contact details" 7th section as built | Implemented in `pages/profile/fields.js:6`; not in the 09-23/09-27 specs | Remove the section; or merge it into Employee details | None (no change planned). Removal would be a new task |
| P-03 | Keep Organization `audit`/`performance`/`staff` hidden | `organization/fields.js:5` hides them; the 09-28 spec lists 8 sections; no record of why | Show them (needs data and test review); or delete them | None (no change planned) |
| P-04 | Keep the `#pay` Credit/Cash prototype control | Present at `controls.html:124`; the 08-16 spec removed it. With A-13 the row sets payment type, so the control becomes an override for review | Remove the control (rows then set payment only) | T2.3 test design: the row value applies on open; the control is still honoured afterwards. Removing it would be part of T2.3 |
| P-05 | Created, edited or deleted records (INV-03/04, CUS-03, GEO-02) persist in memory across in-app navigation and are lost on reload. This matches existing invoice status changes and geography edits; no new storage keys | ARC-05 forbids a new persistence layer; L-03/L-04 | Persist in `sessionStorage` (survives reload; needs Reset handling, new keys, more tests) | **Approved 2026-10-17:** unblocks GEO-02, INV-03/04 and CUS-03 |
| P-06 | Canonical signed-in user: Majed Sief Alnasr, `admin@lastchance.local`, branch `lastchance`; collaboration users, organization `usr-1`, mail addressee and assistant align to it | `fixtures/profile.js` `CURRENT_USER` and the `shell/shell.html` user card already use it; sign-in authenticates `admin@lastchance.local` | Use another persona (e.g. "Kathleen" from the inbox) | **Approved 2026-10-17:** unblocks DAT-03 |
| P-07 | The implementer writes the Arabic copy for UX-05 following `locale.js` terminology; the user spot-checks in G8; no separate native review gate | Previous accepted tasks added Arabic this way (e.g. the invoice disclosure) | Supplied or natively reviewed copy as a gate | **Approved 2026-10-17:** unblocks bulk UX-05 work (T4.2). Small per-task C2 strings follow existing practice |

### 9.3 Open product decisions

| ID | Question | Options | Default if unanswered | Blocks |
|---|---|---|---|---|
| D-04 | Ledger #15: re-capture the 18 stale non-desktop parity baselines? | yes, in T6.2 under G5 / no, keep as baseline | no (non-blocking) | G7 classification |
| D-05 | Retained unexplained pixel differences (11 pairs): run the bounded renderer trace? | yes (separate task) / no (stay L-05) | no (non-blocking) | nothing on the critical path |
| D-06 | VQA-07: Arabic financial-token convention | (a) Latin tokens with bidi isolation; (b) localized Arabic currency format (exact convention to be specified) | **stays deferred** | INV-12 |

### 9.4 Known limitations (accepted unless a decision changes them)

| ID | Limitation |
|---|---|
| L-01 | 15 apps are For You landing pages only; unbuilt leaves open the placeholder (SHL-03) |
| L-02 | For You KPI cards are identical static values in every app |
| L-03 | No per-record URL; reloading an invoice record returns to the default record |
| L-04 | Persistence is browser-session only; Prototype Controls → Reset restores collaboration seed data |
| L-05 | 11 unexplained retained raster-difference pairs (open; see UX-09) |
| L-06 | Stubbed actions show an honest "prototype" toast: invoice Reports/Lock/Clear, Receipt Voucher and Sales Return (success toasts are to be reworded as prototype stubs under UX-05/T4.2), customer photo/sub-ledger/reports, data-list manage actions, assistant canned answers |
| L-07 | Five extra languages are display-only |
| L-08 | No role gating outside Organization Center and the topbar org menu |
| L-09 | DAT-06 and DAT-07 |
