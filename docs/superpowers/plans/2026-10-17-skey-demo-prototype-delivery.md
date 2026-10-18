# Skey Demo Prototype Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every open P0/P1 requirement in the master spec so journeys J1–J8 pass and the prototype meets the §1.4 demo-ready definition.

**Architecture:** Bounded fixes inside the existing vanilla-ES-module prototype. No new framework, persistence or backend. Work is split into workstreams that each own a disjoint set of files. Shared hotspots (`main.js`, `core/locale.js`, fixtures) have one owner per wave. Every task is test-first and verified on a frozen static build.

**Tech Stack:** native ES modules, `scripts/build.mjs` HTML assembly, Tailwind 4.3.3 CLI (precompiled), Playwright 1.63.0 (7 projects), `node:test`.

**Spec:** [`../specs/2026-10-17-skey-demo-prototype-master-spec.md`](../specs/2026-10-17-skey-demo-prototype-master-spec.md). Requirement IDs below refer to it.

**Decisions applied (user, 2026-10-17):**
- A-12 (D-01): all 7 projects; WS-M bounded.
- A-13 (D-02): option (a), header from row, totals representative.
- A-14 (D-03): one G5 packet per workstream; PNGs pending until per-path approval.
- A-15 (D-07): no commit; hash inventory anchors.

**Pending proposals (spec §9.2), which gate tasks:**
- P-05 (in-memory persistence): gates T2.2, T3.1 save-back/create, and T3.2's GEO-02 part.
- P-06 (canonical user): gates T4.1's DAT-03 part.
- P-07 (Arabic authorship): gates T4.2.
- P-04 (`#pay` control): affects T2.3 Step 3 only.

A gated task or step does not start until its proposal is approved.

## Global Constraints

- **Install and tooling:**
  - `npm ci` only; no new dependencies.
  - Literal-utility rule and the `compatibility.md` categories (spec ARC-03).
  - Tailwind byte budget must still pass.
- **Snapshots:**
  - Never run `--update-snapshots`.
  - A protected PNG changes only through a G5 packet approved per path by the user (spec UX-09, A-10).
- **Baselines and accepted work:**
  - Never edit the 76-failure record, `tests/support/baseline.json`, the visual capture manifest, or `scripts/visual-coverage.mjs`.
  - Do not reopen accepted work (spec §9.1) without a failing reproduction.
- **Running tests:**
  - Browser gates run only against a frozen copy of `dist` served by `scripts/serve.mjs` (spec §7).
  - Unit tests and builds never run at the same time as browser tests.
- **Data:** no invented financial values or calculations (spec DAT-R2).
- **Git:** no commit, push, branch or worktree deletion, or cleanup without explicit user authorization. The "Checkpoint" steps below mean: report and wait; commit only if authorized.
- **Port allocation:** each task uses its own port from 4220 upward. The integrator assigns ports per wave (table in §Execution).

## Review Focus

Most likely first:
1. **Leaving a dirty record via browser Back** (popstate path, `main.js:1110`). The user expects the guard. If they choose Stay, the URL must return to the record's route. Test: T1.2 `dirty invoice + browser Back keeps URL and edits on Stay`.
2. **Reopening a row after its status was changed through the Prototype Controls kit** rather than the UI. The user expects the same status, with no crash. Test: T2.1 `every #st value round-trips through list and record`.
3. **Creating two invoices in a row, then deleting one.** The user expects numbers 149 and 150, with exactly one remaining in the list. Test: T2.2 `two creates then record delete`.
4. **Arabic mode while a toast or dialog is open during locale switch.** The user expects the next render to be Arabic and no mixed-language dialog. Test: T4.2 `dialog reopened after switching to AR is fully Arabic`.
5. **Placeholder reached from search palette, then Back.** The user expects to return to the prior screen, not the invoice record. Test: T1.1 `search result to placeholder then Back`.

---

## Execution model (Superpowers + subagents)

### Owners and file boundaries

| Agent (owner) | Owns (may edit) | Must not edit |
|---|---|---|
| **Integrator** (main session) | `core/locale.js` merges, `known-defects.md`, docs, G5 packets, G7/G9, final report | app code outside merges |
| **shell-nav** | `shell/sidebar.js`, `shell/search.js`, `core/routes.js`, new `pages/placeholder/*`, `main.js` (registry + `requestLeave` + popstate only), `tests/navigation-honesty.spec.mjs`, `tests/routes.test.mjs` (add cases) | invoices/*, customers/*, data-list/* |
| **invoice** | `pages/invoices/*`, `pages/list-actions.js` (`openInvoiceRecord` only), `components/data-list/actions.js` + `renderers.js` (invoice branches only), `pages/invoices/kanban.js`, `prototype/fixtures/invoices.js`, `prototype/fixtures/journal-entry.js`, `components/assistant/*`, `shell/shell.html` (lines 40–60 only, T2.4), `tests/invoice-journey.spec.mjs`, `tests/invoice-selection.spec.mjs` (add cases) | main.js, routes, customers, pagination |
| **records** | `pages/customers/*`, `pages/geography/*`, `pages/email/email.js`, `prototype/fixtures/customers.js`, `prototype/fixtures/geography.js`, `tests/customer-journey.spec.mjs`, `tests/invoice-geography.spec.mjs` (geography cases only), `tests/mail-draft-exit.spec.mjs` (add case) | main.js, data-list/*, invoices/* |
| **list-a11y** | `components/data-list/pagination.js`, `model.js`, `footer.js`, `views.js`, `statistics*.js`, toolbar templates in `components/data-list/*.html`, `styles/tailwind/shell.css` + `components.css` (rules for those controls only), `concepts/app-shell.html` (chart script tag, T5.3), `tests/a11y-ledger.spec.mjs` | renderers.js, actions.js, pages/* |
| **mobile** (wave 2) | files declared in T-M1 Step 2 and approved by the integrator | anything not declared |
| **content** (wave 3, single) | `prototype/fixtures/*`, `core/locale.js`, the 5 dialog html files, toast call sites (string literals only), `tests/demo-data.test.mjs`, `tests/i18n-coverage.test.mjs` | logic changes |

**Shared contracts, fixed before wave 0:**
- **C1 — leave guard.** A page may expose `requestLeave(): boolean | Promise<boolean>`. `main.js` calls `pageRegistry.get(fromId)?.requestLeave?.()` after `listGuard.requestPageLeave(fromId)` (T1.2). Invoice already exposes it (`invoices.js:105`); customer adds it in T3.1.
- **C2 — strings.** Wave 0–2 agents do **not** edit `core/locale.js`. Every new user-visible string is written as `t('<English>', '<English>')` (or with `data-i18n`), and listed in the agent report as `English → proposed Arabic`. The integrator merges translations at wave end.
- **C3 — status table.** `INVOICE_TRANSITIONS` (T2.1) is the single transition source for the record, the row menu and the kanban.
- **C4 — expected visual changes.** Agents never update PNGs. A protected snapshot that fails because of an intended change is listed as `spec › name [project] — reason`. The integrator builds one G5 packet per workstream (A-14), containing for each path:
  - original-size before and after images;
  - the result of the unchanged capture contract (the original entry test or the `scripts/visual-coverage.mjs` preflight);
  - before and after SHA-256.
  
  The replacement is applied only after the user explicitly approves that path. There is no blanket approval, automatic refresh, weakened assertion, mask or tolerance.

**Agent report contract (required from every agent):**
- changed files
- requirement IDs
- tests added or changed
- gate table (G1–G3/G4 counts, with commands)
- failures classified as new / baseline / closed
- C2 strings
- C4 expected visual changes
- discoveries
- unresolved decisions

**Discovery rule:** classify each new finding against the spec.
- It maps to a requirement and fits within the task's files: fix it in the task.
- It maps to a requirement but needs other files: integrator adds a task to the owning workstream.
- No requirement covers it: integrator adds a D-xx row to spec §9.2 and the work continues. No new planning cycle.

### Waves

| Wave | Parallel tasks | Gate at wave end |
|---|---|---|
| 0 | T0.1 (integrator) ∥ T1.1 ∥ T2.1 ∥ T3.2 (GEO-03 part; GEO-02 waits for P-05) → T3.3 ∥ T5.1 | integrator merges C2 strings; G1, G2, G3 for all tasks on one frozen build |
| 1 | T1.2 ∥ T2.2 (needs P-05) ∥ T3.1 (save-back needs P-05) ∥ T5.2 | same, plus G4 for J2, J4, J5 |
| 2 | T2.3 ∥ T2.4 ∥ T-M1 (needs T0.1) ∥ T5.3 | G4 for J3; G5 packets WS1, WS2, WS3, WS5 |
| 3 | T4.1 (DAT-03 needs P-06) → T4.2 (needs P-07) | G4 for J6–J8; G5 packet WS4; G8 |
| 4 | T6.1 → T6.2 | G1–G9 prototype level |

Ports: wave 0 uses 4220–4229, wave 1 4230–4239, and so on. Each task takes the next free port and stops its server when it finishes.

### Completion levels (spec §1.4)

1. **Task:** the task's tests were red before and green after, G1–G3 pass, the reviewer approves, and the report contract is complete.
2. **Workstream:** all tasks are merged into one frozen build, the workstream's journey spec passes (G4), and its G5 packet is approved or has no changes.
3. **Prototype:** T6.2 is complete.

Passing focused tests is **not** product acceptance. The full suite is "green" only if G7 actually ran.

---

## WS0 — Baseline

### Task T0.1: Current full-suite measurement

**Owner:** integrator. **Requirements:** G7 prerequisite. **Depends on:** none.

**Files:**
- Create: `docs/superpowers/reports/2026-10-17-pre-delivery-suite.json` (machine list: test title, project, status)

- [ ] **Step 1:** Run `npm run test:unit`, then `npm run build`, then `cp -R dist /private/tmp/skey-delivery/t0/frozen`. Hash the inventory as earlier reports did.
- [ ] **Step 2:** Run `node scripts/serve.mjs --root /private/tmp/skey-delivery/t0/frozen --port 4220`.
- [ ] **Step 3:** Run `caffeinate -dims env PARITY_URL=http://127.0.0.1:4220 npx playwright test --workers=2 --retries=0 --reporter=json --output=/private/tmp/skey-delivery/t0/out > /private/tmp/skey-delivery/t0/result.json`.
- [ ] **Step 4:** Reduce the result to `{title, project, status}` records. Classify each failure:
  - against the 2026-10-16 76-failure list (ledger #14 = 1, #15 = 18, #16 = 2, #17 = 55);
  - as the known GEO-03 failure;
  - or as **new since 2026-10-16**.
  
  Expected: none new, except possibly failures caused by the 36 approved snapshot replacements' surfaces. List any such failure explicitly.
- [ ] **Step 5:** Write the JSON. Add a dated "pre-delivery measurement" line under ledger entry 19. Do **not** edit the 76 record. Stop the server.

---

## WS1 — Navigation honesty and leave guards (owner: shell-nav)

### Task T1.1: "Not in this prototype" placeholder (SHL-03, SHL-05)

**Depends on:** none.

**Files:**
- Create: `concepts/app/pages/placeholder/placeholder.js`, `concepts/app/pages/placeholder/templates.html`
- Modify:
  - `concepts/app/shell/sidebar.js:120-131`: fallback `'record'` becomes `'placeholder'` with data `{label, app}`.
  - `concepts/app/shell/search.js:143-148`: screen and record results go to their view, or to the placeholder.
  - `concepts/app/core/routes.js`: placeholder route.
  - `concepts/app/main.js`: registry entry.
  - the authored include for the template.
- Test: `tests/navigation-honesty.spec.mjs` (new), `tests/routes.test.mjs` (add cases)

**Interfaces:**
- Produces: page id `'placeholder'`, with `activate({label: string, app: string})`.
- Route: `formatRoute({id:'placeholder', data:{app, label}})` → `/<app base path>/unavailable?screen=<encodeURIComponent(label)>`. `parseRouteUrl` inverts it.
- Copy: title = leaf label. Body: `t('This screen is not part of the prototype.')`. Button `t('Back to {app}')` navigates to the app's For You page.

- [ ] **Step 1: Write failing tests.**
  - `routes.test.mjs` › `placeholder route round-trips`:

    ```js
    assert.deepEqual(parseRouteUrl('/vendors/unavailable', '?screen=Vendor%20Invoice'), {id:'placeholder', data:{app:'Vendors', label:'Vendor Invoice'}})
    assert.equal(formatRoute({id:'placeholder', data:{app:'Vendors', label:'Vendor Invoice'}}), '/vendors/unavailable?screen=Vendor%20Invoice')
    ```

  - `navigation-honesty.spec.mjs`, run through the visible UI:
    - `unbuilt leaf opens placeholder, not the invoice` (3 leaves in Customers, Sales Systems Mgmt and System Setup). Each asserts:
      - the heading equals the leaf label;
      - `page.locator('.invoice-record-root, [data-invoice-number]')` is not visible;
      - after `page.goBack()`, the prior view is restored.
    - `search result to placeholder then Back`
    - `each search record result opens a record or the placeholder` (the 5 `RECORDS` entries)
- [ ] **Step 2:** Run the tests on frozen build 4221 for desktop and mobile-rtl. Expected: FAIL (the invoice record is shown).
- [ ] **Step 3:** Implement the page, the route, the registry entry, the sidebar fallback and the search routing. Follow the page contract in `docs/app-shell-development.md` "Add a page".
- [ ] **Step 4:** Rebuild, re-freeze, and run the tests on all 7 projects. Expected: PASS. Also run `routing.spec.mjs` and `launchpad-quick-access.spec.mjs`; expected: unchanged results.
- [ ] **Step 5: Checkpoint.** Send the report (C2 strings: placeholder copy).

### Task T1.2: Global leave guard (SHL-04, contract C1)

**Depends on:** T1.1, because both edit `main.js`.

**Files:**
- Modify: `concepts/app/main.js:1012-1030` (`requestLeave`) and `main.js:1110-1140` (popstate: restore the URL when leave is refused)
- Test: `tests/invoice-journey.spec.mjs`. Created here with guard cases only; T2.x appends to it.

**Interfaces:**
- Consumes: `recordPage.requestLeave()` (`invoices.js:105`; `operations.js:949`).
- Produces: C1.

- [ ] **Step 1: Write failing tests.** For a dirty invoice (Modify, then type into Statement), test each leave route: rail leaf "Customers", app switcher → Dashboard, `page.goBack()`. Assert:
  - the guard dialog `#g-stay` is visible;
  - after Stay: the URL is still `/sales-systems-management/sales-invoices` and the field value is kept;
  - after Leave: the destination is shown.
  
  Test names: `dirty invoice + rail leaf shows guard`, `dirty invoice + app switcher shows guard`, `dirty invoice + browser Back keeps URL and edits on Stay`.
- [ ] **Step 2:** Run. Expected: FAIL (navigation proceeds).
- [ ] **Step 3:** Change `main.js` to:

  ```js
  requestLeave: async fromId => (await listGuard.requestPageLeave(fromId)) && (await (pageRegistry.get(fromId)?.requestLeave?.() ?? true))
  ```

  When popstate's navigate is refused, re-push the current route without creating a duplicate history entry.
- [ ] **Step 4:** Run on 7 projects. Expected: PASS. Run `lifecycle.spec.mjs` and `routing.spec.mjs`; expected: no new failures against T0.1.
- [ ] **Step 5: Checkpoint.**

---

## WS2 — Invoice integrity (owner: invoice)

### Task T2.1: One status table; Deactivated round-trip (INV-02, INV-05, contract C3)

**Depends on:** none.

**Files:**
- Modify:
  - `prototype/fixtures/invoices.js`: export `INVOICE_TRANSITIONS`; make the status label → key mapping explicit.
  - `pages/invoices/operations.js:13-21,46-51`: use the table; write the row status as the **key's label**, read it back via a key lookup.
  - `pages/list-actions.js` `openInvoiceRecord`: map label → key through `STATUSES`, not `toLowerCase()`.
  - `components/data-list/renderers.js:115`: row menu targets from the table.
  - `pages/invoices/kanban.js:11-27`: a column for every status, or `deactivated` explicitly excluded, with a "Deactivated invoices are not shown on the board" note.
- Test: `tests/invoice-journey.spec.mjs`

**Interfaces:**
- Produces:
  - `INVOICE_TRANSITIONS: Record<StatusKey, StatusKey[]>`, with keys `draft, open, pending, posted, returned, canceled, inactive`. Values follow the spec §3.2 lifecycle.
  - `statusKeyFromLabel(label: string): StatusKey | null`, exported from `fixtures/invoices.js`.

- [ ] **Step 1: Write failing tests.**
  - `every #st value round-trips through list and record`. For each `#st` option on row 145: set the status, go back to the list, reopen. Assert:
    - no `pageerror`;
    - the header badge text equals `STATUSES[key].label`;
    - the list status cell equals the same label.
  - `row menu offers exactly the lifecycle targets` (one row per status).
- [ ] **Step 2:** Run. Expected: FAIL on `inactive` (page error) and on the row-menu targets.
- [ ] **Step 3:** Implement as listed under Files.
- [ ] **Step 4:** Run 7 projects plus `invoice-selection.spec.mjs` and `invoice-geography.spec.mjs --grep invoice`. Expected: PASS.
- [ ] **Step 5: Checkpoint.**

### Task T2.2: Honest create and delete (INV-03, INV-04)

**Depends on:** T2.1.

**Files:**
- Modify:
  - `pages/invoices/operations.js:249-295`: `nextInvoiceNo = max(LIST_ROWS.no) + 1`, computed at save time. On create: set `state.docNo/docSeq/sourceInvoiceNo` and unshift a row built only from values the record shows. Remove the toast's `action` unless it opens the record.
  - `operations.js:523-546`: splice the selected row.
  - `components/data-list/actions.js:43-55` + `renderers.js:141`: block delete for posted/canceled, using the same rule as `invoices.js:63-69`.
- Test: `tests/invoice-journey.spec.mjs`

- [ ] **Step 1: Write failing tests.**
  - `create then save adds 149 to the list`. Assert:
    - the header number is `149`;
    - the list has a row `149` with status `Open`;
    - reopening it shows `149` / Open.
  - `two creates then record delete`. Assert:
    - the second invoice is `150`;
    - deleting 150 from the record removes it from the list;
    - 149 remains.
  - `posted row cannot be deleted from the list`: the Delete menu item is disabled, or a blocked dialog gives the reason.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement as listed under Files.
- [ ] **Step 4:** Run 7 projects plus the invoice regressions. Expected: PASS. List C4 changes, if any.
- [ ] **Step 5: Checkpoint.**

### Task T2.3: Row-specific header, honest disclosure (INV-06…INV-09, A-13)

**Depends on:** T2.1. It does not depend on T2.2's persistence. It runs after T2.2 if T2.2 is unblocked, to avoid conflicts in `operations.js`.

**Files:**
- Modify:
  - `pages/list-actions.js` `openInvoiceRecord`: copy `custNo/custName, date, dueDate, pay, currency, branch, warehouse, salesRep, priceList` from the row.
  - `pages/invoices/invoices.js:6-17`: `state.pay` from the row; boot record = first list row (INV-09).
  - `pages/invoices/templates.html`: bind the header fields; the disclosure names the shared fields: lines, payment details, other tabs, history, **totals**, dialog amounts and the journal.
  - Do not edit `adjustments.js`, the dialog amounts, `journal-entry.js` or the assistant amounts. They stay representative (A-13, DAT-R2).
- Test: `tests/invoice-selection.spec.mjs` (add cases)

- [ ] **Step 1: Write failing tests.**
  - `cash and credit rows drive payment and receipt rules`. Row 143 (Cash): the pay control shows Cash, and the Receipt Voucher availability matches `RULES` for cash. Row 145: Credit.
  - `header fields match the list row`. For each of the 8 rows, compare the 9 A-13 fields in the header with the list cells.
  - `disclosure names shared fields`: the disclosure contains the words for totals and lines, in both EN and AR.
  - `fresh load shows a list member`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Use only existing row values (DAT-R2). `#pay`: the row value applies on open. Whether the control is kept is pending P-04: until it is approved, leave the control in place and still honour it after the record opens.
- [ ] **Step 4:** Run 7 projects plus the full invoice regressions. List C4 changes (expected: the invoice parity `record` snapshot and the coverage invoice images).
- [ ] **Step 5: Checkpoint.**

### Task T2.4: Invoice context copy follows the record (SHL-07)

**Depends on:** T1.1, because it touches `search.js` after the shell-nav agent.

**Files:**
- Modify: `shell/shell.html:40-60`, `shell/search.js:36`
- Test: `tests/navigation-honesty.spec.mjs` (add case)

- [ ] **Step 1: Write failing test.** `palette invoice context follows the open record`:
  - open 145, then open the palette: the context text contains `145`;
  - on Customers, open the palette: there is no invoice context.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Bind the text to `state.docNo`; hide it when the current page is not `record`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Checkpoint.**

---

## WS3 — Customer, geography, mail (owner: records)

### Task T3.1: Customer save writes back; reason shown; guard contract (CUS-03, CUS-04, CUS-05)

**Depends on:** T1.2 for the C1 consumer. The test for leaving through the rail needs T1.2 merged; write it in this task.

**Files:**
- Modify:
  - `pages/customers/record.js:429-458`: on edit, write the mapped fields back to the `CUSTOMER_ROWS` row; on create, unshift a row with the next `customerNo` (max + 1).
  - `record.js`: expose `requestLeave()` on the record page. Reuse the existing guard dialog; keep the capture-phase guard for in-page targets.
  - `pages/customers/fields.js:65-81`: map `statusReason`.
  - the deactivation date from the row (DAT-R3).
- Test: `tests/customer-journey.spec.mjs` (new)

- [ ] **Step 1: Write failing tests.**
  - `edited name appears in list`
  - `added customer appears and reopens`
  - `inactive customer shows reason`. Open 200001: the reason text equals `CUSTOMER_ROWS[...].statusReason`.
  - `dirty customer + app switcher shows guard`
  - `dirty customer + browser Back keeps edits on Stay`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement as listed under Files.
- [ ] **Step 4:** Run 7 projects plus `lifecycle.spec.mjs` and `table-customer-ux.test.mjs`. Expected: no new failures against T0.1.
- [ ] **Step 5: Checkpoint.**

### Task T3.2: Geography create persists; locale-correct status test (GEO-02, GEO-03)

**Depends on:** none.

**Files:**
- Modify:
  - `pages/geography/geography.js:538-543`: create appends to `GEO_ROWS` under the chosen parent.
  - `tests/invoice-geography.spec.mjs`, case "geography record status toggle": assert the label via the active locale (`Inactive` / `غير نشط`). This is a **test defect fix**; the assertion's intent is unchanged.

- [ ] **Step 1: Write failing test.** `created location appears in tree and reopens`.
- [ ] **Step 2:** Run. Expected: FAIL. The existing toggle test also fails on mobile-rtl (known).
- [ ] **Step 3:** Implement the create persistence and the locale-aware assertion.
- [ ] **Step 4:** Run the geography cases on 7 projects. Expected: all PASS. Record GEO-03 as "closed" for G7.
- [ ] **Step 5: Checkpoint.**

### Task T3.3: Draft survives message switch (COL-03)

**Depends on:** none.

**Files:**
- Test: `tests/mail-draft-exit.spec.mjs` (add case)
- Modify, only if the test is red: `pages/email/email.js`

- [ ] **Step 1: Write the test.** `switching messages keeps the composer draft`. Pause timers as the existing cases do. Type a subject and body, open another inbox message, open Drafts. Assert the draft exists with the typed values.
- [ ] **Step 2:** Run on desktop and mobile-rtl.
  - **If it passes:** COL-03 is Accepted. Mark ledger #5 closed with evidence and stop.
  - **If it fails:** flush the draft on reader switch, reusing `flushDraft()`.
- [ ] **Step 3:** Run 7 projects plus the existing mail cases. Expected: PASS.
- [ ] **Step 4: Checkpoint.**

---

## WS5 — List accessibility and honesty (owner: list-a11y)

### Task T5.1: Ledger accessibility items (UX-06: #2, #3, #4, #10)

**Depends on:** none.

**Files:**
- Modify:
  - `components/data-list/pagination.js:77`: `aria-label` on Prev/Next, via `t('Previous page')` / `t('Next page')`.
  - toolbar `<summary>` triggers: give them an accessible name that doesn't depend on the hidden label text.
  - the current-item token in `styles/tailwind/shell.css`: contrast ≥ 4.5:1 in light mode.
  - coarse-pointer sizes for summaries, row actions, select-all and the page-size select.
- Test: `tests/a11y-ledger.spec.mjs` (new)

- [ ] **Step 1: Write failing tests.**
  - `pager buttons have names`: `getByRole('button', {name: /previous page/i})` is visible.
  - `mobile toolbar triggers keep names`
  - `selected nav and page contrast ≥ 4.5`: compute WCAG luminance from `getComputedStyle` colours in light mode.
  - `coarse list controls ≥ 44px` (mobile projects).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement with literal utilities. Each selector rule gets a `compatibility.md` row.
- [ ] **Step 4:** Run 7 projects plus `data-list-component.spec.mjs` and `tailwind.test.mjs`. List C4 changes (expected: data-list and parity list images for the contrast change).
- [ ] **Step 5: Checkpoint.** Integrator updates ledger #2, #3, #4 and #10.

### Task T5.2: Real list totals (INV-11, ledger #9)

**Depends on:** T5.1, because both edit `pagination.js`.

**Files:**
- Modify:
  - `components/data-list/model.js`: drop `DATA_LIST_SIMULATED_TOTAL`, or make it the real count.
  - `pagination.js:50`
  - `runtime.js:28`
  - the invoice record pager "Record 1 of 125" (`pages/invoices/templates.html:636`). This is invoice-owned: coordinate the text change through the invoice agent in wave 1 (C2/C4).
- Test: `tests/a11y-ledger.spec.mjs` (add), `tests/data-list.test.mjs` (update the expectation)

- [ ] **Step 1: Write failing test.** `pager count equals rows`. The invoice list shows a total of 8, and there is no page 2 at the default page size.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement as listed under Files.
- [ ] **Step 4:** Run. Expected: PASS. List C4 changes.
- [ ] **Step 5: Checkpoint.**

### Task T5.3: Mobile statistics and non-blocking chart (UX-07, UX-08; P2)

**Depends on:** T5.2.

- [ ] **Step 1:** Write failing tests:
  - `mobile list visible on first load`: the first row's top is less than the viewport height at 390×844;
  - `chart script does not block parse`: the `script[src*=apexcharts]` has `defer`, or loads on first chart use.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Collapse statistics on mobile by default (existing statistics-concept control). Defer ApexCharts while keeping the integrity attribute.
- [ ] **Step 4:** Run `chart-parity.spec.mjs`. It must still pass with the real cached bytes.
- [ ] **Step 5: Checkpoint.**

---

## WS-M — Mobile reliability (owner: mobile; bounded per A-12)

### Task T-M1: Resolve inherited mobile journey failures (ledger #17, J3/J4 on mobile)

**Depends on:** T0.1, and WS2/WS3 wave 1 merged.

**Bound (A-12):** fix only reproducible application defects that block in-scope J3/J4 journeys. Classify test-design defects separately. Unrelated #17 failures stay baseline, with evidence. No expansion without a demonstrated link to an acceptance criterion; anything else becomes a D-xx row.

- [ ] **Step 1:** From T0.1, list the #17 failures that are J3/J4 cases on mobile-touch and mobile-rtl. Reproduce 3 representative ones with `--trace on`.
- [ ] **Step 2:** Classify each as an app defect or a test-design defect. Declare the files to change; the integrator approves them against the owner table.
- [ ] **Step 3:** Fix app defects test-first (the existing failing test is the red test). Fix test-design defects only where the assertion intent is kept, and record each one.
- [ ] **Step 4:** Rerun the affected specs on the mobile projects. Each formerly failing test either passes (move it to "closed") or stays in the baseline with a reason.
- [ ] **Step 5: Checkpoint.**

---

## WS4 — Demo data coherence and Arabic completeness (owner: content; sequential)

### Task T4.1: Fixture coherence (DAT-02…DAT-05)

**Depends on:** waves 0–2 merged. The DAT-03 identity part needs P-06 approved. Snapshots go through the WS4 G5 packet (A-14).

**Files:**
- Modify: `prototype/fixtures/{invoices,messages,collaboration,profile,organization,customers}.js`, `pages/customers/fields.js` (deactivation date)
- Test: `tests/demo-data.test.mjs` (new, unit)

- [ ] **Step 1: Write failing unit tests.**
  - `no "today" fixture timestamp after PROTOTYPE_NOW` (mail, login log, sessions).
  - `invoice CHAIN dates not before invoice dates`.
  - `signed-in identity is one person`:

    ```js
    assert.equal(COLLAB_USERS.find(u => u.id === 'usr-1').email, 'admin@lastchance.local')
    ```

    Also assert that the inbox addressee name equals `CURRENT_USER.name`.
  - `maintenance date after PROTOTYPE_NOW`.
  - `named parties have one role` (Al Noor).
- [ ] **Step 2:** Run `node --test tests/demo-data.test.mjs`. Expected: FAIL.
- [ ] **Step 3:** Edit the fixtures. Change dates and names only; amounts stay the same.
- [ ] **Step 4:** Run G1 and G3 on the collaboration, profile, organization and invoice specs. List C4 changes (expected: many). The integrator prepares the WS4 G5 packet.
- [ ] **Step 5: Checkpoint.**

### Task T4.2: Arabic completeness and honest stub copy (UX-05, L-06)

**Depends on:** T4.1, and P-07 approved.

**Files:**
- Modify:
  - toast call sites in the 27 files (wrap the literals in `t()`);
  - `invoices/record-dialogs.html`, `invoices/print-dialog.html`, `customers/dialogs.html`, `geography/dialogs.html`, `data-list/list-dialogs.html` (add `data-i18n`);
  - `core/locale.js` (Arabic entries);
  - Receipt Voucher and Sales Return toasts reworded as prototype stubs.
- Test: `tests/i18n-coverage.test.mjs` (new, unit), plus AR browser cases in `tests/language-switcher.spec.mjs`

- [ ] **Step 1: Write failing tests.**
  - Unit `every toast title in listed files is translated`: statically parse the `toast({title: '...'})` literals and assert that each has an `I18N` entry, or is wrapped in `t(`.
  - Unit `listed dialog files have data-i18n on every text node`.
  - Browser `dialog reopened after switching to AR is fully Arabic`, using the posting dialog: assert that no `[A-Za-z]{3,}` text is outside numbers or tokens.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Fixture names stay as they are (DAT-07).
- [ ] **Step 4:** Run G1, G3 and G8 on mobile-rtl. List C4 changes.
- [ ] **Step 5: Checkpoint.**

---

## WS6 — Integration and acceptance (owner: integrator)

### Task T6.1: Documentation corrections (ARC-06)

- [ ] **Step 1:** Edit `docs/app-shell-development.md:90-96` to describe the current stylesheet layout.
- [ ] **Step 2:** Update `tests/support/known-defects.md`:
  - entries closed by this delivery, with date and evidence path (#1, #2, #3, #4, #5, #7, #8, #9, #10, #11, #12 as applicable);
  - GEO-03.
- [ ] **Step 3:** Change the stale "proposed" headers on the two 2026-10-16 proposals to "applied in `7dd0da5`" / "applied in `4cf58e6`".
- [ ] **Step 4:** Update the mail route in the For You and collaboration specs to `/help-screens/email`.

### Task T6.2: Prototype-level gates

**Depends on:** all tasks, and every G5 packet approved.

- [ ] **Step 1:** Apply the approved G5 replacements by path. Verify before/after SHA-256. If D-04 = yes, add the 18 re-captures here.
- [ ] **Step 2:** On one frozen build, run G1, then G2, then G7 (full suite, `caffeinate -dims`, `--workers=2 --retries=0`).
- [ ] **Step 3:** Diff G7 against T0.1 name by name. Classify every failure as baseline, closed, or new. **Any new failure blocks completion**: fix it, or record it as a decision.
- [ ] **Step 4:** Run G8 (manual AR pass of J3–J7 on desktop, plus mobile-rtl G4) and G9 (preservation hash diff).
- [ ] **Step 5:** Write one completion report, `docs/superpowers/reports/<date>-demo-prototype-acceptance.md`. It contains:
  - a requirement status table (from spec §3–§5);
  - journey results J1–J8 by profile;
  - the gate table G1–G9 with commands;
  - the limitations that were accepted;
  - unrun gates, if any.
  
  Update spec statuses.
- [ ] **Step 6: Checkpoint.** Ask the user for commit authorization (A-15). Nothing is committed or pushed before this.
