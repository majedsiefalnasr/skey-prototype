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
      empty.className = 'rec-adjustment-empty'
      empty.textContent = 'No invoice charges.'
      list.appendChild(empty)
    }
  }

  function addInvoiceAdjustment() {
    const list = document.getElementById('invoice-adjustment-list')
    const row = document.createElement('div')
    const id = invoiceAdjustmentCount++
    row.className = 'rec-adjustment-row'
    row.dataset.adjustmentKind = 'charge'
    row.dataset.adjustmentId = String(id)
    row.innerHTML = `<div class="rec-field"><label for="invoice-adjustment-name-${id}">Charge</label><select id="invoice-adjustment-name-${id}" data-field><option>Freight</option><option>Delivery</option><option>Insurance</option><option>Other</option></select></div><div class="rec-field"><label for="invoice-adjustment-calculation-${id}">Tax treatment</label><select id="invoice-adjustment-calculation-${id}" data-field><option>Before tax</option><option>After tax</option></select></div><div class="rec-field"><label for="invoice-adjustment-value-${id}">Amount</label><input id="invoice-adjustment-value-${id}" data-field data-adjustment-value type="number" min="0" step="0.01" value="0" inputmode="decimal"></div>`
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'ibtn danger'
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
