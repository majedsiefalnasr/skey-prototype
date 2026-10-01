import {JOURNAL_ENTRY_ROWS} from '../../prototype/fixtures/journal-entry.js'

// Prototype-only: when the harness's "Unbalanced entry" control is on,
// this much is taken off one line's Local credit so the local debit vs
// local credit difference (and the Unbalanced badge) has a real number to
// show. Document-currency Debit/Credit are untouched — the row keeps its
// original document totals, only the local (EGP) side drifts.
const UNBALANCED_LOCAL_CREDIT_DELTA = 1250.75

/** Owns the invoice record's "Display Journal Entry" dialog's table — a
    real data-list instance (DATA_LIST_CONFIG.journal), same as Screen
    Parameters' own wiring (screen-parameters.js), activated against this
    dialog's own canvas/footer.

    The strip below the table shows Local debit / Local credit (plus the
    local debit−credit Difference while the entry is unbalanced) and the
    Balanced/Unbalanced badge. It is computed from the full (unfiltered)
    row set — the shared data-list table has no tfoot/totals concept, so
    this renders it separately instead of trying to bolt it onto that
    pipeline. */
export function createJournalEntryTable({encodeHtml, dataListInstance}) {
  const totalsMount = document.getElementById('journal-entry-totals')
  let unbalanced = false

  function rowsForState() {
    if (!unbalanced) return JOURNAL_ENTRY_ROWS
    // Take the amount off the line that actually carries the most local
    // credit, so the entry drifts negative-free (a line with no local
    // credit would otherwise go negative, which no real entry does).
    let target = 0
    JOURNAL_ENTRY_ROWS.forEach((row, index) => {
      if (row.localCredit > JOURNAL_ENTRY_ROWS[target].localCredit) target = index
    })
    return JOURNAL_ENTRY_ROWS.map((row, index) =>
      index === target
        ? {...row, localCredit: row.localCredit - UNBALANCED_LOCAL_CREDIT_DELTA}
        : row
    )
  }

  function totalsOf(rows) {
    return rows.reduce(
      (sums, row) => ({
        localDebit: sums.localDebit + row.localDebit,
        localCredit: sums.localCredit + row.localCredit,
      }),
      {localDebit: 0, localCredit: 0}
    )
  }

  function renderTotals(rows) {
    const totals = totalsOf(rows)
    const difference = totals.localDebit - totals.localCredit
    const balanced = difference === 0
    const format = value => value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
    const cell = (label, value) =>
      `<div class="min-w-0"><dt class="text-[11px] font-medium text-muted">${label}</dt><dd class="m-0 mt-0.5 text-[15px] font-semibold leading-5 text-ink [font-variant-numeric:tabular-nums]">${encodeHtml(format(value))}</dd></div>`
    const tone = balanced
      ? 'bg-[var(--success-soft-bg)] text-[var(--success-soft-ink)]'
      : 'bg-[var(--danger-soft-bg)] text-[var(--danger-soft-ink)]'
    // The difference only appears while the entry is unbalanced; a
    // balanced entry reads as Local debit / Local credit / badge.
    // basis keeps the figures legible in a narrow dialog: below ~240px
    // the badge wraps to its own line instead of squeezing the labels.
    const cells = balanced
      ? 'grid-cols-2 sm:grid-cols-2'
      : 'grid-cols-2 sm:grid-cols-3'
    const differenceCell = balanced ? '' : cell('Difference', difference)
    const status = balanced ? 'Balanced' : `Unbalanced · Difference ${encodeHtml(format(difference))}`
    totalsMount.innerHTML = `<div class="jtotals mt-2! flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg bg-[var(--line-2)] [padding:12px_16px]">
      <dl class="m-0 grid min-w-0 flex-1 basis-[220px] ${cells} gap-x-4 gap-y-3 sm:gap-x-6">
        ${cell('Local debit', totals.localDebit)}${cell('Local credit', totals.localCredit)}${differenceCell}
      </dl>
      <span role="status" class="inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}"><svg width="13" height="13" aria-hidden="true"><use href="#${balanced ? 'i-check' : 'i-warn'}"/></svg>${status}</span>
    </div>`
  }

  /** Applies the prototype's unbalanced toggle: swaps the instance's row
      source (model.js's setRows) and re-renders both the table and the
      totals strip so the line values and the badge always agree. */
  function setUnbalanced(next) {
    unbalanced = Boolean(next)
    const rows = rowsForState()
    dataListInstance.setRows(rows)
    dataListInstance.render()
    renderTotals(rows)
  }

  function activate({root, footer}) {
    // Re-sync on every open: the control may have changed while the dialog
    // was closed, and setRows also resets pagination to a clean first page.
    dataListInstance.setRows(rowsForState())
    dataListInstance.activate({root, footer})
    renderTotals(rowsForState())
  }

  function deactivate() {
    dataListInstance.deactivate()
  }

  return {activate, deactivate, setUnbalanced}
}
