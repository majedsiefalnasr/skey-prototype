# Skey ERP — Sales Invoice App Shell Audit

**Scope**: The app shell of the Sales Invoice record screen at `app.skeyerp.com/sal/sls/sales/salesinvoice/list` — top action bar (Record / Procedure / Transactions / More), status ribbon, breadcrumb bar with status-dependent quick actions and record pager, and the right action rail (New, Search, Save, Print, Undo, User Log, Documents Flow). The left menu sidebar and the invoice form content are **out of scope**.

**Environment**: Chromium 1920×1080 (also tested 1366×768 and 1024×768), English LTR UI, demo tenant `lastchance`, audited 2026-08-01. Screenshots in [assets/](assets/).

---

## 1. Shell Inventory (for the Figma redesign)

### Zone A — App topbar (row 1)
| Element | Details |
|---|---|
| Tenant name "lastchance" | Link to /dashboard, top-left |
| Hamburger toggle | Collapses menu sidebar |
| Lock icon | Session lock (green unlock state) |
| Fiscal year "2026" | Static chip, dark blue |
| Language "English" | Dropdown (English / عربي), flips whole app LTR/RTL |
| Mail icon, Notifications (badge 4), "admin" + avatar | Icon buttons |

### Zone B — Record action bar (row 2, white)
Dropdown menus (Bootstrap dropdowns, `aria-haspopup` + `aria-expanded` present, items are plain `<button>`s — no `role="menu"/"menuitem"`):

| Menu | Items (Returned invoice) | State-dependent behavior |
|---|---|---|
| Record | New, Add From, Search | — |
| Procedure | Save *(disabled)*, Lock Screen, Reports, Print, Undo *(disabled)* | Save/Undo enable when the form is dirty |
| Transactions | Posting, Display Journal Entry, Cancel Document | Items change with document status |
| More | Screen Parameters, Help | — |

**Status ribbon** (right end of row): arrow-shaped ribbon, `h6.ribbon__content`. Observed variants: orange "Returned", green "Posted". **Absent entirely for unposted/draft records** — draft state has no visual label.

### Zone C — Breadcrumb bar (row 3, blue #335DAF)
- Breadcrumb: Home › Sales Invoice › All (white links).
- **Status-dependent quick actions** (icon-only, white 24px-high buttons):
  - "Posted" toggle (`a.nav-link.dropdown-toggle`, `fa-file-export` icon) → opens the **"Posting-related Data" modal** (Posted toggle, Posting Description, Last Posting User, Posting Date, Save). Icon turns green on Posted records. Contents/state of this modal change with invoice status.
  - "Receipt Voucher" (`a.receipt_icon`, `fa-receipt`) — shown only on Returned invoice in test.
  - "Sales Return" (`a.receipt_icon.receipt_iconMov`) — shown only on Returned invoice in test.
- **Record pager**: first ‹‹, prev ‹, current-record spinbutton, total-records label ("125"), next ›, last ››. First/prev auto-disable on record 1. Typing a number + Enter jumps to that record.

### Zone D — Right action rail (vertical, fixed right edge)
| Button | Style | Notes |
|---|---|---|
| New (+) | `btn-outline-primary`, 40×38 | title="New", shake-on-hover icon |
| Search | `btn-outline-secondary`, 42×38 | |
| Save | `btn-outline-success`, disabled until dirty | **title typo: "Save-"** |
| Print | `btn-outline-primary` | |
| Undo | `btn-outline-warning`, disabled until dirty | |
| User Log | `btn-open-user` (solid blue), 38×32 | |
| Documents Flow | `btn-open-user`, 38×32 | separated below |

Disabled rail buttons render as gray fill `#B6B5B5` with the blue icon retained (outline color variants are overridden when disabled).

---

## 2. Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 1 | Pager buttons unnamed; quick actions not keyboard-reachable; no visible focus on menubar/breadcrumb |
| 2 | Performance | 2 | `RangeError: Maximum call stack size exceeded` in grid render; 90+ JS chunks |
| 3 | Responsive Design | 2 | Shell survives 1024px, but 20–24px targets throughout the pager/quick actions |
| 4 | Theming | 2 | Bootstrap tokens exist but ribbon color class is broken (`ribbon__content--color--`); light-only |
| 5 | Anti-Patterns | 2 | Mystery-meat icon actions; invisible draft status; `<a>`-vs-`<button>` affordance mix |
| **Total** | | **9/20** | **Poor — major overhaul needed on the shell** |

### Anti-Patterns Verdict (product register)
Not AI slop — this is classic hand-built ERP chrome and its familiarity is a strength. It fails the product slop test in a different way: **strangeness without purpose at the component level**. Actions that do the same kind of thing are built three different ways (`<button title>`, `<a role="button" tabindex=0>`, `<a>` with neither), disabled styling contradicts the outline-button vocabulary, and the single most important piece of state (document status) is invisible for drafts and rendered as a heading for others.

### Executive Summary
- **Health: 9/20 (Poor)** — the shell's information design is sound (menus, pager, rail are the right ERP affordances) but execution fails WCAG AA and component consistency.
- Issues: **2 × P0, 5 × P1, 6 × P2, 4 × P3**.
- Top issues: unnamed/unreachable controls for keyboard and screen-reader users; no visible focus in the top rows; status ribbon contrast failure; status-dependent actions with no discoverable labels; grid `RangeError` in console.

---

## 3. Detailed Findings

### P0 — Blocking

**[P0-1] Record pager buttons have no accessible name and no tooltip**
- Location: breadcrumb bar pager (‹‹ ‹ [1] 125 › ››)
- Category: Accessibility
- Impact: Screen-reader users hear "button" ×4; sighted users get no tooltip either. The spinbutton has no label and the "125" total is an unassociated `<label>`. Record navigation — the core of the data-sheet model — is unusable non-visually.
- WCAG: 4.1.2 Name, Role, Value; 1.1.1 Non-text Content
- Recommendation: `aria-label` ("First record", "Previous record", "Record number", "of 125 records") + native `title` tooltips; make the total a plain `<span>` or wire the `<label>` to the input; announce record changes via `aria-live="polite"`.

**[P0-2] Status-dependent quick actions are not keyboard-reachable**
- Location: breadcrumb bar — "Receipt Voucher" and "Sales Return" (`<a class="receipt_icon">` with no `href`, no `tabindex`, no role)
- Category: Accessibility
- Impact: The actions the business cares most about (generate receipt voucher / sales return from a returned invoice) cannot be reached by Tab at all. They are skipped in the tab order (verified: All → pager spinbutton).
- WCAG: 2.1.1 Keyboard
- Recommendation: Use real `<button>` elements with `aria-label` matching the `title`.

### P1 — Major

**[P1-1] No visible focus indicator on menubar buttons and breadcrumb links**
- Location: Record/Procedure/Transactions/More buttons, Home/Sales Invoice/All links
- Category: Accessibility — `outline: 0 none`, no box-shadow on `:focus` (verified computed styles while tabbing)
- WCAG: 2.4.7 Focus Visible
- Recommendation: A consistent 2px focus ring token across the shell (the pager/tab controls already show Bootstrap's shadow ring — extend it).

**[P1-2] Status ribbon text contrast fails AA**
- Location: status ribbon, row 2 right
- Category: Accessibility. Measured: white on green `rgb(32,180,32)` = **2.8:1** (needs 4.5:1 at 14–16px bold). The orange "Returned" variant is in the same ~3:1 band.
- WCAG: 1.4.3 Contrast (Minimum)
- Recommendation: Darken ribbon fills (e.g. green ≥ `#1B7A1B`, orange ≥ `#A85B00`) or use dark text on light status tints.

**[P1-3] Draft/unposted records show no status at all**
- Location: status ribbon (absent), Zone B
- Category: Anti-Pattern / state visibility. The ribbon disappears instead of reading "Draft", so the most common working state is the only unlabeled one; users must infer status from which icons happen to be visible.
- Recommendation: Always render the ribbon; give every status a name and color.

**[P1-4] Icon-only quick actions rely on `title` tooltips alone**
- Location: Posted toggle, Receipt Voucher, Sales Return (Zone C); action rail (Zone D)
- Category: Anti-Pattern (mystery meat) / Accessibility. Native `title` has ~1s delay, no touch support, and is the only affordance. Because the set of visible icons *changes with invoice status*, users can't build stable muscle memory without labels.
- Recommendation: Proper tooltip component (instant, touch-friendly) + `aria-label`; consider text labels for the status-dependent trio since they are contextual, not persistent.

**[P1-5] `RangeError: Maximum call stack size exceeded` thrown during grid render**
- Location: console, from the bundled grid (`processQuery`/`setListData` in chunk 6319)
- Category: Performance / robustness. A recursion blow-up in the record screen's list rendering; risk of partially-rendered UI states.
- Recommendation: Fix upstream; at minimum add an error boundary so shell chrome never depends on grid success.

### P2 — Minor

**[P2-1] Two tabs report `selected` simultaneously** — "Main Data" and "Payment method" both expose `aria-selected=true` (verified in accessibility tree). Misreports state to AT. *(WCAG 4.1.2)*
- **[P2-2] "Posted" toggle `aria-expanded` stuck on `true`** even when its modal is closed; it is also a `dropdown-toggle` that actually opens a modal dialog — the semantics say "menu", the behavior is "dialog".
- **[P2-3] Touch targets 20–24px** across pager, quick actions, year chip, topbar icons (Zone A–C). Below the 44px guidance and below Bootstrap's own 31px defaults elsewhere. Dense ERP tolerates smaller, but 20px arrows with 2px gaps invite mis-taps between "next record" and "last record".
- **[P2-4] No `<h1>`, no `main` landmark, ribbon rendered as `<h6>`** — heading/landmark structure is decorative, not semantic. *(WCAG 1.3.1, 2.4.1)*
- **[P2-5] Disabled styling contradicts the button vocabulary** — enabled Save/Undo are outline-success/outline-warning; disabled they become solid gray `#B6B5B5` with the brand-blue glyph (3.1:1). The color-coded affordance (green=save, orange=undo) never actually appears in the resting state, so the rail reads as five identical blue buttons.
- **[P2-6] Menu triggers vs items are visually identical** — dropdown items are plain buttons at the same 12.8px size as their triggers, with no menu container roles; keyboard arrows work (Bootstrap), but AT users get no "menu, 3 items" context.

### P3 — Polish

- **[P3-1] "Save-" title typo** on the rail Save button.
- **[P3-2] Decorative hover animation** (`faa-shake`) on rail icons — motion conveys no state; no `prefers-reduced-motion` handling.
- **[P3-3] Decorative icons lack `aria-hidden`** (FontAwesome `<i>` elements are announced or ignored inconsistently).
- **[P3-4] Broken ribbon modifier class** `ribbon__content--color--` (empty modifier) — status color isn't driven by the intended token system.

---

## 4. Patterns & Systemic Issues

1. **Three implementations for one concept.** "Icon action button" exists as `<button title>` (rail), `<a role="button" tabindex="0">` (Posted), and bare `<a>` (Receipt Voucher / Sales Return). Every accessibility failure above is a symptom of this. One `IconButton` primitive (label, tooltip, disabled, focus ring) fixes P0-2, P1-1, P1-4, P3-1, P3-3 at once.
2. **State lives in visibility, not in language.** Status changes are communicated by adding/removing unlabeled icons and by an absent ribbon — nothing announces or names the change. For a document-centric ERP, status should be a first-class, always-visible, always-named element.
3. **Title-attribute accessibility.** Everywhere a control is icon-only, `title` is doing all the work (or nothing, in the pager's case).

## 5. Positive Findings

- **Right information architecture**: menubar + breadcrumb + pager + action rail is exactly the earned-familiar ERP shell; nothing is invented for flavor.
- **Keyboard support inside menus is real**: Enter opens, ArrowDown traverses items, Escape closes (Bootstrap behavior verified).
- **Menu triggers carry `aria-haspopup`/`aria-expanded`**, and rail buttons are all reachable by Tab with `tabindex=0`.
- **Dirty-state affordance**: Save/Undo disabled-until-dirty (mirrored in both the rail and the Procedure menu) is a good, consistent model.
- **Shell is structurally responsive**: at 1366/1024 the shell keeps all four zones functional; quick actions collapse progressively.
- **Breadcrumb links pass contrast** (white on #335DAF = 6.3:1) and the LTR/RTL flip is wholesale and coherent.

## 6. Recommended Actions

1. **[P0] `$impeccable harden`**: rebuild the pager and quick actions as named, keyboard-reachable controls with aria-live record announcements (P0-1, P0-2, P2-2).
2. **[P1] `$impeccable polish`**: focus-ring token across menubar/breadcrumb; ribbon contrast fixes; always-visible status ribbon incl. Draft (P1-1, P1-2, P1-3).
3. **[P1] `$impeccable clarify`**: label strategy for icon-only actions — instant tooltips + `aria-label`, text labels for status-dependent actions, fix "Save-" (P1-4, P3-1).
4. **[P2] `$impeccable distill`**: one IconButton primitive and one disabled treatment for the whole shell; fix the double-selected tabs (P2-1, P2-5, P2-6).
5. **[P2] `$impeccable adapt`**: touch-target pass on pager/quick actions/topbar (P2-3).
6. Finish with **`$impeccable polish`** re-run and re-audit.
