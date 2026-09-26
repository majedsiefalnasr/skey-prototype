/* Invoice status copy shared with the record page's own Change status menu
   (pages/invoices/operations.js's STATUS_ACTIONS) — kept here too since the
   table's row action must work without opening the record. Posting and
   cancellation stay record-only (they need fields this table row doesn't
   carry), so only the reasoned/simple transitions are offered from here. */
const INVOICE_STATUS_ACTIONS = {
  Open: {
    title: no => `Open invoice ${no}`,
    description: 'This makes the invoice available for normal processing again.',
    confirm: 'Open invoice',
    tone: 'default',
  },
  Pending: {
    title: no => `Mark invoice ${no} as pending`,
    description: 'Pending invoices stay on hold until the issue below is resolved.',
    confirm: 'Mark as pending',
    tone: 'warning',
    reason: 'Why is this invoice pending?',
  },
  Returned: {
    title: no => `Return invoice ${no}`,
    description: 'This records the return and prevents further processing of this invoice.',
    confirm: 'Return invoice',
    tone: 'danger',
    reason: 'Why is this invoice being returned?',
  },
}

/** Owns the list-level "Change status" dialogs for invoices and customers —
    standalone dialogs (no record navigation needed), built from the same
    .dscrim/.dlg shell as the invoice record page's own status dialog. */
export function createStatusDialogs({trapFocus, releaseFocus, toast, renderDataList} = {}) {
  const invScrim = document.getElementById('invoice-status-scrim')
  const custScrim = document.getElementById('customer-status-scrim')
  let pendingInvoice = null
  let pendingCustomer = null

  function closeInvoiceStatusDialog() {
    invScrim.classList.remove('open')
    pendingInvoice = null
    releaseFocus()
  }

  function validateInvoiceStatusConfirm() {
    const field = invScrim.querySelector('#invoice-status-reason')
    const btn = invScrim.querySelector('#invoice-status-confirm')
    if (!field.required) return void (btn.disabled = false)
    btn.disabled = !field.value.trim()
  }

  /* The table row's "Change status" menu is itself a submenu of next-status
     options (renderers.js's invoiceStatusMenuItem) — picking one calls this
     with that status already chosen, so the dialog opens straight on the
     same confirm step the invoice record page's own Change status menu
     shows (operations.js's STATUS_ACTIONS), never a picker of its own. */
  function openInvoiceStatusDialog(row, targetStatus) {
    const action = INVOICE_STATUS_ACTIONS[targetStatus]
    if (!action) return
    pendingInvoice = row
    invScrim.querySelector('.dlg').dataset.tone = action.tone
    invScrim.querySelector('#invoice-status-title').textContent = action.title(row.no)
    invScrim.querySelector('#invoice-status-description').textContent = action.description
    const reason = invScrim.querySelector('.invoice-status-reason')
    reason.hidden = !action.reason
    reason.querySelector('label').textContent = action.reason || ''
    const field = reason.querySelector('textarea')
    field.value = ''
    field.required = Boolean(action.reason)
    const confirmBtn = invScrim.querySelector('#invoice-status-confirm')
    confirmBtn.dataset.targetStatus = targetStatus
    confirmBtn.textContent = action.confirm
    invScrim.querySelector('#invoice-status-sum').textContent = `Invoice ${row.no}`
    validateInvoiceStatusConfirm()
    invScrim.classList.add('open')
    trapFocus(invScrim.querySelector('.dlg'))
  }

  invScrim.addEventListener('click', event => {
    if (event.target === invScrim || event.target.closest('.invoice-status-close')) {
      closeInvoiceStatusDialog()
      return
    }
    if (event.target.closest('#invoice-status-confirm') && pendingInvoice) {
      const status = event.target.closest('#invoice-status-confirm').dataset.targetStatus
      const row = pendingInvoice
      row.status = status
      closeInvoiceStatusDialog()
      renderDataList('invoice')
      toast({tone: 'ok', title: `Invoice ${row.no} changed to ${status}`})
    }
  })
  invScrim.addEventListener('input', event => {
    if (event.target.id === 'invoice-status-reason') validateInvoiceStatusConfirm()
  })

  function closeCustomerStatusDialog() {
    custScrim.classList.remove('open')
    pendingCustomer = null
    releaseFocus()
  }

  /* Activating is a plain, reversible flip — no reason needed, so it never
     opens a dialog. Deactivating needs a reason on record, so it always
     does. Same rule everywhere a customer's status changes: the table row
     menu, the table's bulk activate/deactivate action on a multi-selection,
     and the customer record page's own action all call
     openCustomerStatusDialog — bulk passes an array of rows plus the
     explicit `command` the user picked (the toolbar button's own intent,
     not each row's current state); the single-row callers pass one row and
     no command, so the direction is inferred from that row's own state
     (the only sensible reading of a lone "Change status" action). */
  function activateCustomers(rows, {onDone} = {}) {
    rows.forEach(row => {
      row.active = true
      row.statusReason = ''
    })
    renderDataList('customer')
    onDone?.(rows)
    toast({
      tone: 'ok',
      title:
        rows.length === 1
          ? `${rows[0].customerName || rows[0].customerNo} activated`
          : `${rows.length} customers activated`,
    })
  }

  function openCustomerStatusDialog(rowOrRows, {onDone, command} = {}) {
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]
    if (!rows.length) return
    const activating = command ? command === 'activate' : !rows[0].active
    return activating
      ? activateCustomers(rows, {onDone})
      : openCustomerDeactivateDialog(rows, {onDone})
  }

  function openCustomerDeactivateDialog(rows, {onDone} = {}) {
    pendingCustomer = {rows, onDone}
    const single = rows.length === 1 ? rows[0] : null
    custScrim.querySelector('#customer-status-title').textContent = single
      ? `Deactivate customer ${single.customerNo}`
      : `Deactivate ${rows.length} customers`
    custScrim.querySelector('#customer-status-description').textContent =
      'Deactivated customers stay on hold until reactivated. Say why below.'
    const reason = custScrim.querySelector('.customer-status-reason')
    reason.hidden = false
    reason.querySelector('label').textContent = 'Why is this customer being deactivated?'
    const field = reason.querySelector('textarea')
    field.value = ''
    field.required = true
    custScrim.querySelector('#customer-status-confirm').textContent = 'Deactivate customer'
    custScrim.querySelector('.dlg').dataset.tone = 'danger'
    custScrim.querySelector('#customer-status-sum').textContent = single
      ? single.customerName || single.customerNo
      : `${rows.length} customers`
    validateCustomerStatusConfirm()
    custScrim.classList.add('open')
    trapFocus(custScrim.querySelector('.dlg'))
  }

  function validateCustomerStatusConfirm() {
    const field = custScrim.querySelector('#customer-status-reason')
    const btn = custScrim.querySelector('#customer-status-confirm')
    if (!field.required) return void (btn.disabled = false)
    btn.disabled = !field.value.trim()
  }

  custScrim.addEventListener('click', event => {
    if (event.target === custScrim || event.target.closest('.customer-status-close')) {
      closeCustomerStatusDialog()
      return
    }
    if (event.target.closest('#customer-status-confirm') && pendingCustomer) {
      const {rows, onDone} = pendingCustomer
      const reason = custScrim.querySelector('#customer-status-reason').value.trim()
      rows.forEach(row => {
        row.active = false
        row.statusReason = reason
      })
      closeCustomerStatusDialog()
      renderDataList('customer')
      onDone?.(rows)
      toast({
        tone: 'ok',
        title:
          rows.length === 1
            ? `${rows[0].customerName || rows[0].customerNo} deactivated`
            : `${rows.length} customers deactivated`,
      })
    }
  })
  custScrim.addEventListener('input', event => {
    if (event.target.id === 'customer-status-reason') validateCustomerStatusConfirm()
  })

  return {openInvoiceStatusDialog, closeInvoiceStatusDialog, openCustomerStatusDialog, closeCustomerStatusDialog}
}
