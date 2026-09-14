import {encodeHtml} from '../../core/locale.js'
import {DATA_LIST_CONFIG} from '../../components/data-list/columns.js'

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
    return `<article class="data-kanban-card" role="listitem" draggable="true" data-list-row-key="${encodeHtml(key)}" data-kanban-status="${encodeHtml(row.status)}" aria-selected="${selected}"><header><button class="data-record-card-identity" type="button" data-list-open-record="${encodeHtml(key)}" aria-label="Open ${encodeHtml(config.singular)} ${encodeHtml(key)}"><div><strong>Sales Invoice ${encodeHtml(row.no)}</strong><span>${encodeHtml(row.seq)}</span></div></button>${renderDataListRowActions('invoice', row, config, 'kanban')}</header><div class="data-kanban-card-total">${encodeHtml(row.currency)} ${encodeHtml(row.total)}</div><dl class="data-kanban-card-meta"><div><dt>Customer</dt><dd>${encodeHtml(row.custName)}</dd></div><div><dt>Date</dt><dd>${encodeHtml(row.date)}</dd></div><div><dt>Payment</dt><dd>${encodeHtml(row.pay)}</dd></div></dl></article>`
  }
  
  function renderDataListKanban(context, rows, config, listState) {
    if (context !== 'invoice') return ''
    const columns = INVOICE_KANBAN_COLUMNS.map(status => {
      const columnRows = rows.filter(row => row.status === status)
      const cards = columnRows
        .map(row => renderDataListKanbanCard(row, config, listState))
        .join('')
      return `<div class="data-kanban-column" data-kanban-column="${encodeHtml(status)}"><header class="data-kanban-column-header" data-s="${invoiceStatusKey(status)}"><span class="stdot"></span><strong>${encodeHtml(status)}</strong><span class="data-kanban-count">${columnRows.length}</span></header><div class="data-kanban-drop" data-kanban-drop="${encodeHtml(status)}" role="list" aria-label="${encodeHtml(status)} invoices">${cards || `<p class="data-kanban-empty">No invoices</p>`}</div></div>`
    }).join('')
    return `<div class="data-kanban-board">${columns}</div>`
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
