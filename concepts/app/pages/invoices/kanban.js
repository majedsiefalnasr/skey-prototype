import {encodeHtml} from '../../core/locale.js'
import {DATA_LIST_CONFIG} from '../../components/data-list/columns.js'

const DATA_KANBAN_IDENTITY_CLASS =
  'data-record-card-identity flex min-w-0 flex-1 cursor-pointer items-start gap-[9px] overflow-hidden rounded border-0 bg-transparent p-0 text-start font-[inherit] text-inherit focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-accent [&>div]:min-w-0 [&_span]:block [&_span]:truncate [&_span]:text-[12px] [&_span]:text-muted [&_strong]:block [&_strong]:truncate [&_strong]:text-[12.5px] [&_strong]:text-ink hover:[&_strong]:text-accent hover:[&_strong]:underline'

/** Owns kanban state and its DOM bindings. */
export function createKanban({trapFocus, releaseFocus, toast, renderDataList, renderDataListRowActions} = {}) {
  const INVOICE_KANBAN_COLUMNS = [
    'Draft',
    'Open',
    'Pending',
    'Posted',
    'Returned',
    'Canceled',
  ]

  const INVOICE_STATUS_TRANSITIONS = {
    Draft: ['Open', 'Canceled'],
    Open: ['Pending', 'Canceled'],
    Pending: ['Open', 'Posted'],
    Posted: ['Pending', 'Returned', 'Canceled'],
    Returned: [],
    Canceled: [],
  }

  function invoiceStatusKey(status) {
    return String(status || '').toLowerCase()
  }

  function renderDataListKanbanCard(row, config, listState) {
    const key = String(row[config.key])
    const selected = listState.selected.has(key)
    return `<article class="data-kanban-card grid cursor-grab gap-2 rounded-lg border border-line bg-surface p-2.5 transition-[box-shadow] duration-[120ms] ease-[ease] hover:[box-shadow:var(--shadow-1)]" role="listitem" draggable="true" data-list-row-key="${encodeHtml(key)}" data-kanban-status="${encodeHtml(row.status)}" aria-selected="${selected}"><header class="flex items-start justify-between gap-1.5"><button class="${DATA_KANBAN_IDENTITY_CLASS}" type="button" data-list-open-record="${encodeHtml(key)}" aria-label="Open ${encodeHtml(config.singular)} ${encodeHtml(key)}"><div><strong>Sales Invoice ${encodeHtml(row.no)}</strong><span>${encodeHtml(row.seq)}</span></div></button>${renderDataListRowActions('invoice', row, config, 'kanban')}</header><div class="data-kanban-card-total text-[14px] font-bold text-accent">${encodeHtml(row.currency)} ${encodeHtml(row.total)}</div><dl class="data-kanban-card-meta m-0! grid gap-1 [&>div]:flex [&>div]:justify-between [&>div]:gap-2 [&_dd]:m-0! [&_dd]:text-[12px] [&_dd]:font-semibold [&_dd]:text-ink [&_dt]:text-[12px] [&_dt]:text-muted"><div><dt>Customer</dt><dd>${encodeHtml(row.custName)}</dd></div><div><dt>Date</dt><dd>${encodeHtml(row.date)}</dd></div><div><dt>Payment</dt><dd>${encodeHtml(row.pay)}</dd></div></dl></article>`
  }

  function renderDataListKanban(context, rows, config, listState) {
    if (context !== 'invoice') return ''
    const columns = INVOICE_KANBAN_COLUMNS.map(status => {
      const columnRows = rows.filter(row => row.status === status)
      const cards = columnRows
        .map(row => renderDataListKanbanCard(row, config, listState))
        .join('')
      return `<div class="data-kanban-column flex w-[280px] min-w-[280px] flex-col gap-2 rounded-[10px] bg-bg p-2.5" data-kanban-column="${encodeHtml(status)}"><header class="data-kanban-column-header flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] font-bold text-muted data-[s=open]:bg-[var(--st-open-bg)] data-[s=open]:text-[var(--st-open-ink)] data-[s=draft]:bg-[var(--st-draft-bg)] data-[s=draft]:text-[var(--st-draft-ink)] data-[s=pending]:bg-[var(--st-pend-bg)] data-[s=pending]:text-[var(--st-pend-ink)] data-[s=posted]:bg-[var(--st-post-bg)] data-[s=posted]:text-[var(--st-post-ink)] data-[s=returned]:bg-[var(--st-retn-bg)] data-[s=returned]:text-[var(--st-retn-ink)] data-[s=canceled]:bg-[var(--st-canc-bg)] data-[s=canceled]:text-[var(--st-canc-ink)]" data-s="${invoiceStatusKey(status)}"><span class="stdot size-[7px]"></span><strong>${encodeHtml(status)}</strong><span class="data-kanban-count ms-auto font-normal opacity-75">${columnRows.length}</span></header><div class="data-kanban-drop grid min-h-20 gap-2 rounded-lg p-0.5 transition-[background-color] duration-[120ms] ease-[ease]" data-kanban-drop="${encodeHtml(status)}" role="list" aria-label="${encodeHtml(status)} invoices">${cards || `<p class="data-kanban-empty m-0! px-1.5 py-2.5 text-center text-[12px] text-muted">No invoices</p>`}</div></div>`
    }).join('')
    return `<div class="data-kanban-board flex gap-3 overflow-x-auto p-3">${columns}</div>`
  }

  function openKanbanBlockedDialog(row, fromStatus, toStatus) {
    const allowedFrom = INVOICE_STATUS_TRANSITIONS[fromStatus] || []
    document.getElementById('kanban-blocked-body').textContent =
      `Sales Invoice ${row.no} is ${fromStatus} and can't move directly to ${toStatus}. It must follow the document status flow.`
    const allowedBlock = document.getElementById('kanban-blocked-allowed')
    const allowedList = document.getElementById('kanban-blocked-allowed-list')
    if (allowedFrom.length) {
      allowedList.innerHTML = allowedFrom
        .map(
          status =>
            `<span class="stpill" data-s="${invoiceStatusKey(status)}"><span class="stdot"></span><span class="nm">${encodeHtml(status)}</span></span>`
        )
        .join('')
      allowedBlock.hidden = false
    } else {
      allowedList.innerHTML = ''
      allowedBlock.hidden = true
    }
    kanbanBlockedScrim.classList.add('open')
    trapFocus(kanbanBlockedScrim.querySelector('.customer-modal'))
  }

  function closeKanbanBlockedDialog() {
    kanbanBlockedScrim.classList.remove('open')
    releaseFocus()
  }

  function moveInvoiceKanbanCard(context, key, toStatus) {
    const config = DATA_LIST_CONFIG[context]
    const row = config.rows.find(record => String(record[config.key]) === key)
    if (!row) return
    const fromStatus = row.status
    if (fromStatus === toStatus) return
    const allowed = (INVOICE_STATUS_TRANSITIONS[fromStatus] || []).includes(toStatus)
    if (!allowed) {
      openKanbanBlockedDialog(row, fromStatus, toStatus)
      return
    }
    row.status = toStatus
    renderDataList(context)
    toast({tone: 'ok', title: `Sales Invoice ${row.no} moved to ${toStatus}`})
  }

  const kanbanBlockedScrim = document.getElementById('kanban-blocked-scrim')

  kanbanBlockedScrim.addEventListener('click', event => {
    if (
      event.target === kanbanBlockedScrim ||
      event.target.closest('.kanban-blocked-close')
    ) {
      closeKanbanBlockedDialog()
    }
  })

  return {INVOICE_STATUS_TRANSITIONS, invoiceStatusKey, renderDataListKanban, closeKanbanBlockedDialog, moveInvoiceKanbanCard, kanbanBlockedScrim}
}
