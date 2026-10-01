import {JOURNAL_ENTRY_ROWS} from '../../prototype/fixtures/journal-entry.js'

/** Owns the invoice record's "Display Journal Entry" dialog's table — a
    real data-list instance (DATA_LIST_CONFIG.journal), same as Screen
    Parameters' own wiring (screen-parameters.js), activated against this
    dialog's own canvas/footer. The Debit/Credit/Local Debit/Local Credit
    totals + Balanced badge the real screen shows live below the table are
    computed once from the full (unfiltered) row set — the shared
    data-list table has no tfoot/totals concept, so this renders them
    separately instead of trying to bolt them onto that pipeline. */
export function createJournalEntryTable({encodeHtml, dataListInstance}) {
  const totalsMount = document.getElementById('journal-entry-totals')

  function renderTotals() {
    const totals = JOURNAL_ENTRY_ROWS.reduce(
      (sums, row) => ({
        debit: sums.debit + row.debit,
        credit: sums.credit + row.credit,
        localDebit: sums.localDebit + row.localDebit,
        localCredit: sums.localCredit + row.localCredit,
      }),
      {debit: 0, credit: 0, localDebit: 0, localCredit: 0}
    )
    const balanced = totals.debit === totals.credit && totals.localDebit === totals.localCredit
    const format = value => value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
    const difference =
      Math.abs(totals.debit - totals.credit) + Math.abs(totals.localDebit - totals.localCredit)
    const cell = (label, value) =>
      `<div class="min-w-0"><dt class="text-[11px] font-medium text-muted">${label}</dt><dd class="m-0 mt-0.5 text-[15px] font-semibold leading-5 text-ink [font-variant-numeric:tabular-nums]">${encodeHtml(format(value))}</dd></div>`
    const tone = balanced
      ? 'bg-[var(--success-soft-bg)] text-[var(--success-soft-ink)]'
      : 'bg-[var(--danger-soft-bg)] text-[var(--danger-soft-ink)]'
    const status = balanced ? 'Balanced' : `Unbalanced · Difference ${encodeHtml(format(difference))}`
    totalsMount.innerHTML = `<div class="jtotals mt-2! flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg bg-[var(--line-2)] [padding:12px_16px]">
      <dl class="m-0 grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        ${cell('Total debit', totals.debit)}${cell('Total credit', totals.credit)}${cell('Local debit', totals.localDebit)}${cell('Local credit', totals.localCredit)}
      </dl>
      <span role="status" class="inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}"><svg width="13" height="13" aria-hidden="true"><use href="#${balanced ? 'i-check' : 'i-warn'}"/></svg>${status}</span>
    </div>`
  }

  function activate({root, footer}) {
    dataListInstance.activate({root, footer})
    renderTotals()
  }

  function deactivate() {
    dataListInstance.deactivate()
  }

  return {activate, deactivate}
}
