import {RULES} from '../../prototype/fixtures/invoices.js'
// Invoice-owned model and availability matrix.
export function createInvoiceState() {
        const state = {
          status: 'posted',
          pay: 'credit',
          dirty: false,
          design: '1',
          mode: 'record',
          missing: 3,
          prints: 2,
          docNo: '126',
        }
        const editable = s =>
          s.mode === 'create'
            ? true
            : s.mode !== 'record' && !['posted', 'canceled', 'inactive'].includes(s.status)
        /* lockbanner copy for every status — ported from sales-invoice-record.html's
   LOCK_COPY map (final-review fix round gave every status its own entry, not
   just posted/canceled/inactive) */
        const LOCK_COPY = {
          posted:
            'This invoice is posted, so its fields are read-only. Undo the posting to edit it.',
          canceled: 'This invoice is canceled, so its fields are read-only.',
          inactive:
            'This invoice is deactivated, so its fields are read-only. Reactivate it to edit.',
          open: "You're viewing this invoice. Switch to Edit mode to make changes.",
          pending: "You're viewing this invoice. Switch to Edit mode to make changes.",
          returned: "You're viewing this invoice. Switch to Edit mode to make changes.",
        }
        /* A new invoice has no number, no history and nothing to act on until it is saved.
   Everything that reads or writes the stored document waits for that first save. */
        const needsSaved = [
          'Print',
          'Posting',
          'Display Journal Entry',
          'Cancel Document',
          'Receipt Voucher',
          'Sales Return',
          'User Log',
          'Documents Flow',
          'Reports',
          'Search',
          'Add From',
          'Modify',
          'Change status',
          'Delete',
        ]

        /* verified matrix + the one proposed correction */
        const blocked = label => {
          /* actions that only make sense on a saved record the user is not already editing */
          if (label === 'Modify') {
            if (state.mode === 'edit') return 'You are already editing this invoice'
            if (state.status === 'posted')
              return 'A posted invoice cannot be modified. Undo the posting first.'
            if (state.status === 'canceled')
              return 'A canceled invoice cannot be modified. Restore it first.'
            if (state.status === 'inactive') return 'A deactivated invoice cannot be modified'
          }
          if (label === 'Delete') {
            if (state.status === 'posted')
              return 'A posted invoice cannot be deleted. Undo the posting first.'
            if (state.status === 'canceled')
              return 'A canceled invoice is kept in the records — it cannot be deleted'
            if (state.status === 'inactive') return 'A deactivated invoice cannot be deleted'
          }
          if (state.mode === 'create') {
            if (label === 'Save')
              return state.missing
                ? `${state.missing} required ${state.missing === 1 ? 'field' : 'fields'} still empty`
                : null
            if (label === 'Undo') return state.dirty ? null : 'Nothing to undo yet'
            if (needsSaved.includes(label)) return 'Save the invoice first — it has no number yet'
            return null
          }
          return RULES[label] ? RULES[label](state) : null
        }


return {state, editable, LOCK_COPY, needsSaved, blocked}
}


/** Cached invoice pages; the record keeps its existing unwrapped roots. */
export function createInvoices({templates, state, operations, record}) {
  const listPage = {
    id: 'list', roots: [templates.listRoot],
    activate() { templates.listInstance.activate({root: templates.listCanvas, footer: templates.listFooter}) },
    deactivate() { templates.listInstance.deactivate() },
    dispose() { templates.listInstance.dispose() },
  }
  const recordPage = {
    id: 'record', roots: templates.recordRoots,
    activate() { record.render(); operations.applyState() },
    deactivate() {},
    dispose() { record.dispose() },
    requestLeave: operations.requestLeave,
  }
  return {
    listPage, recordPage,
    setMode(value) { operations.modeSel.value = value; operations.applyMode(value) },
    setStatus(value) { state.status = value; document.getElementById('st').value = value; operations.applyState() },
    setPayment(value) { state.pay = value; document.getElementById('pay').value = value; operations.applyState() },
    setDirty(value) { state.dirty = Boolean(value); document.getElementById('dirty').checked = state.dirty; operations.applyState() },
  }
}
