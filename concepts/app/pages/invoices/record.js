// Owns invoice tabs and exactly-once initial row creation.
export function createInvoiceRecord({connectRecordLabels, applyRecordValueDirections, addPaymentMethodRow, addItemRow, addInvoiceAdjustment, recalcInvoiceSummary}) {
  function selectRecordTab(tab) {
    document.querySelectorAll('#canvas-root .rec-tab').forEach(button => {
      const selected = button === tab
      button.classList.toggle('on', selected)
      button.setAttribute('aria-selected', String(selected))
      button.tabIndex = selected ? 0 : -1
    })
    document.querySelectorAll('#canvas-root .rec-tabpanel').forEach(panel => {
      panel.hidden = panel.dataset.panel !== tab.dataset.tab
    })
  }

  function handleRecordTabKeydown(event) {
    const tabs = [...document.querySelectorAll('#canvas-root .rec-tab')]
    const current = tabs.indexOf(event.currentTarget)
    const rtl = document.documentElement.dir === 'rtl'
    let next = current
    if (event.key === 'ArrowRight') next += rtl ? -1 : 1
    else if (event.key === 'ArrowLeft') next += rtl ? 1 : -1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    const tab = tabs[(next + tabs.length) % tabs.length]
    selectRecordTab(tab)
    tab.focus()
  }

  let recordAInitialized = false
  function renderRecordA() {
    if (recordAInitialized) return
    recordAInitialized = true
    document.querySelectorAll('#canvas-root .rec-tab').forEach(btn => {
      btn.addEventListener('click', () => selectRecordTab(btn))
      btn.addEventListener('keydown', handleRecordTabKeydown)
    })
    selectRecordTab(document.querySelector('#canvas-root .rec-tab[aria-selected="true"]'))
    connectRecordLabels(document.getElementById('canvas-root'))
    applyRecordValueDirections(document.getElementById('canvas-root'))
    document.querySelectorAll('#canvas-root .rec-card-hd').forEach(hd => {
      hd.addEventListener('click', () => {
        const open = hd.getAttribute('aria-expanded') === 'true'
        hd.setAttribute('aria-expanded', String(!open))
        hd.nextElementSibling.hidden = open
      })
    })

    document
      .getElementById('add-payment-link')
      .addEventListener('click', () => addPaymentMethodRow('payment-rows'))
    document.querySelectorAll('[data-invoice-adjustment]').forEach(button => {
      button.addEventListener('click', addInvoiceAdjustment)
    })
    const discountCalculation = document.getElementById('invoice-discount-calculation')
    const discountValue = document.getElementById('invoice-discount-value')
    const discountUnit = document.getElementById('invoice-discount-unit')
    discountCalculation.addEventListener('change', () => {
      const percent = discountCalculation.value === 'percent'
      discountValue.max = percent ? '100' : '200'
      discountUnit.textContent = percent ? '%' : 'EGP'
      recalcInvoiceSummary()
    })
    discountValue.addEventListener('input', recalcInvoiceSummary)
    addPaymentMethodRow('payment-rows', 'Cash', '200')
    addItemRow('items-body', 'items-total-qty')
    recalcInvoiceSummary()
  }


  return {render: renderRecordA}
}
