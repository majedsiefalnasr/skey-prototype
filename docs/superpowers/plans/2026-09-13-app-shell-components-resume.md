# App shell refactor resume checkpoint

Worktree: `.claude/worktrees/app-shell-components` in the main checkout.
Branch: `worktree-app-shell-components`.
Plan: `2026-09-13-app-shell-components.md` in this directory.

The inherited branch reached Task 7 at `37a4b5e`. This checkpoint begins Task 8; **Task 8 is not complete** and Tasks 9–13 remain. The original audit and browser snapshots in the main checkout were left untouched.

## Changes in this checkpoint

- Extracted invoice item creation, quantity totals, keyboard navigation, duplication, and spreadsheet paste into `concepts/app/pages/invoices/lines.js`.
- Extracted payment rows and method-specific fields into `payments.js`.
- Extracted invoice charges/discount summary into `adjustments.js`, a cohesive invoice subcomponent alongside the plan's named owners.
- Extracted tab behavior and exactly-once row initialization into `record.js`.
- Kept the original startup positions, fixture calculations, second `applyState()` call, and inline `window.addItemRow` bridge. The bridge is scheduled for removal in Task 12.
- Added `tests/invoice-geography.spec.mjs`: item quantities, payment fields/removal, charges/discounts, repeated-navigation keyboard entry, and geography edit/undo. Each scenario checks page errors.

## Verification

- `npm run build`: passed.
- `npm run test:unit`: 36 passed, zero failures, one existing TODO for the obsolete mechanical JavaScript byte comparison.
- Existing desktop/mobile component and parity scenarios plus the first three new scenarios: 31 passed, one existing mobile chart skip. All 16 surface screenshots matched committed baselines without updates.
- Final focused invoice/geography run on desktop and mobile: 10 passed, with zero page errors.
- No chart fidelity claim: the existing boot helper aborts the chart CDN request for static scenarios; full live-chart verification is still a final-plan requirement.

Local HTTP tests and Chromium require execution outside the sandbox because localhost listening is otherwise denied. Development server command: `npm run dev` (port 4173). Browser tests do not start it automatically.

## Resume Task 8

1. Finish invoice state, operations/guards, print, and activity ownership; compose `createInvoices` and the record pager contract. Row modules are wired through the transitional entry today. Integrate disposal into the page lifecycle; only `lines.js` currently exposes cleanup for its document listeners.
2. Move geography record state, hierarchy, parent pickers, and pan handlers with their registrations into the planned geography modules. Geography production code is unchanged in this checkpoint. Keep customer unit lookup ownership with Customers.
3. Complete Task 8 behavior coverage, then its focused invoice/geography screenshot and lifecycle checks. Do not mark Task 8 complete based on this incremental checkpoint.
4. Continue Tasks 9–13, including prototype restoration, CSS ownership, migration inventory reconciliation, legacy removal, and the full final browser matrix.

The shared templates still live in `concepts/app/shell/page-templates.html`; there is no `main.js` yet. Avoid assuming the final ownership table already reflects the current files. `openSurface()` starts from the launchpad only; for repeated invoice navigation use `.record-back` then `[data-list-open-record]`.
