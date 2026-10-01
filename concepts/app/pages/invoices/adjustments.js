// Mechanically extracted invoice behavior; fixture values and markup are preserved.
export function createInvoiceAdjustments({applyRecordValueDirections, applyState}) {
const pageAbort = new AbortController()

  let invoiceAdjustmentCount = 0
  const formatInvoiceMoney = value =>
    Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  function recalcInvoiceSummary() {
    const subtotal = 200
    const itemsDiscount = 0
    const discountValue = Math.max(
      0,
      Number(document.getElementById('invoice-discount-value')?.value) || 0
    )
    const discountCalculation =
      document.getElementById('invoice-discount-calculation')?.value || 'percent'
    const invoiceDiscount =
      discountCalculation === 'percent'
        ? ((subtotal - itemsDiscount) * Math.min(discountValue, 100)) / 100
        : Math.min(discountValue, subtotal - itemsDiscount)
    let charges = 0
    document
      .querySelectorAll('#invoice-adjustment-list [data-adjustment-kind]')
      .forEach(row => {
        const amount = Math.max(
          0,
          Number(row.querySelector('[data-adjustment-value]').value) || 0
        )
        charges += amount
      })
    const tax = 0
    const net = Math.max(0, subtotal - itemsDiscount - invoiceDiscount + charges + tax)
    document.getElementById('invoice-summary-subtotal').textContent =
      formatInvoiceMoney(subtotal)
    document.getElementById('invoice-summary-items-discount').textContent =
      `− ${formatInvoiceMoney(itemsDiscount)}`
    document.getElementById('invoice-summary-discount').textContent =
      `− ${formatInvoiceMoney(invoiceDiscount)}`
    document.getElementById('invoice-summary-charges').textContent =
      `+ ${formatInvoiceMoney(charges)}`
    document.getElementById('invoice-summary-tax').textContent =
      `+ ${formatInvoiceMoney(tax)}`
    document.getElementById('invoice-summary-net').textContent =
      `${formatInvoiceMoney(net)} EGP`
  }

  function syncInvoiceAdjustmentEmptyState() {
    const list = document.getElementById('invoice-adjustment-list')
    const hasRows = Boolean(list.querySelector('[data-adjustment-kind]'))
    let empty = list.querySelector('.rec-adjustment-empty')
    if (hasRows) {
      empty?.remove()
      return
    }
    if (!empty) {
      empty = document.createElement('div')
      empty.className = 'rec-adjustment-empty grid [min-height:72px] [place-items:center] [padding:12px] text-muted text-center'
      empty.textContent = 'No invoice charges.'
      list.appendChild(empty)
    }
  }

  function addInvoiceAdjustment() {
    const list = document.getElementById('invoice-adjustment-list')
    const row = document.createElement('div')
    const id = invoiceAdjustmentCount++
    row.className = 'rec-adjustment-row grid [grid-template-columns:minmax(150px,_1.4fr)_minmax(120px,_0.8fr)_minmax(100px,_0.6fr)_32px] gap-2 items-end [padding:10px] rounded-md bg-[var(--line-2)]'
    row.dataset.adjustmentKind = 'charge'
    row.dataset.adjustmentId = String(id)
    row.innerHTML = `<div class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px] [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted"><label for="invoice-adjustment-name-${id}">Charge</label><select id="invoice-adjustment-name-${id}" data-field><option>Freight</option><option>Delivery</option><option>Insurance</option><option>Other</option></select></div><div class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px] [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted"><label for="invoice-adjustment-calculation-${id}">Tax treatment</label><select id="invoice-adjustment-calculation-${id}" data-field><option>Before tax</option><option>After tax</option></select></div><div class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px] [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted"><label for="invoice-adjustment-value-${id}">Amount</label><input id="invoice-adjustment-value-${id}" data-field data-adjustment-value type="number" min="0" step="0.01" value="0" inputmode="decimal"></div>`
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'ibtn danger [.rec-adjustment-row_&]:[margin-bottom:1px]!'
    remove.setAttribute('aria-label', 'Remove charge')
    remove.innerHTML =
      '<svg width="14" height="14" aria-hidden="true"><use href="#i-x" /></svg>'
    row.appendChild(remove)
    row.addEventListener('input', recalcInvoiceSummary, {signal: pageAbort.signal})
    row.addEventListener('change', event => {
      if (event.target.matches('[data-adjustment-calculation]')) {
        const value = row.querySelector('[data-adjustment-value]')
        value.max = event.target.value === 'percent' ? '100' : ''
      }
      recalcInvoiceSummary()
    }, {signal: pageAbort.signal})
    remove.addEventListener('click', () => {
      row.remove()
      syncInvoiceAdjustmentEmptyState()
      recalcInvoiceSummary()
    }, {signal: pageAbort.signal})
    list.appendChild(row)
    applyRecordValueDirections(row)
    syncInvoiceAdjustmentEmptyState()
    applyState()
    row.querySelector('select, input')?.focus()
  }

  return {dispose: () => pageAbort.abort(), recalcInvoiceSummary, addInvoiceAdjustment}
}
