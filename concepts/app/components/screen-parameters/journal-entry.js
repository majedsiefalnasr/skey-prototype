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
    totalsMount.innerHTML = `<div class="jtotals flex flex-wrap items-center gap-x-6 gap-y-1.5 [padding:10px_12px] mt-2! [border:1px_solid_var(--line)] rounded-lg bg-[var(--line-2)] text-[12.5px]">
      <span><b class="text-muted font-normal">Total Debit</b> <b class="[font-variant-numeric:tabular-nums]">${encodeHtml(format(totals.debit))}</b></span>
      <span><b class="text-muted font-normal">Total Credit</b> <b class="[font-variant-numeric:tabular-nums]">${encodeHtml(format(totals.credit))}</b></span>
      <span><b class="text-muted font-normal">Total Local Debit</b> <b class="[font-variant-numeric:tabular-nums]">${encodeHtml(format(totals.localDebit))}</b></span>
      <span><b class="text-muted font-normal">Total Local Credit</b> <b class="[font-variant-numeric:tabular-nums]">${encodeHtml(format(totals.localCredit))}</b></span>
      <span class="badge ${balanced ? 'ok' : 'danger'} ms-auto">${balanced ? 'Balanced' : 'Unbalanced'}</span>
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
