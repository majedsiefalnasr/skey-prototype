// Mechanically extracted invoice behavior; fixture values and markup are preserved.
export function createInvoicePayments({connectRecordLabels, applyRecordValueDirections, applyState}) {
       const PAYMENT_METHODS = ['Cash', 'Bank', 'Credit Card', 'Cheque', 'Transfer']
       const PAYMENT_EXTRA_FIELDS = {
         Cash: [{label: 'Cash Code', value: '2001 - Main Cash'}],
         Bank: [
           {label: 'Bank Name', value: ''},
           {label: 'Account No.', value: ''},
         ],
         'Credit Card': [
           {label: 'Card Type', value: ''},
           {label: 'Approval No.', value: ''},
         ],
         Cheque: [
           {label: 'Cheque No.', value: ''},
           {label: 'Bank', value: ''},
         ],
         Transfer: [{label: 'Transfer Reference', value: ''}],
       }
       let paymentRowCount = 0

       /* containerId lets Task 6's Concepts B and C reuse this for their own
          payment-row containers, since only one concept's canvas is visible
          at a time but all three will exist in the DOM simultaneously */
       function addPaymentMethodRow(containerId = 'payment-rows', method = 'Cash', amount = '') {
         const id = paymentRowCount++
         const row = document.createElement('div')
         row.className = 'rec-card'
         row.dataset.paymentRow = id
         row.innerHTML =
           '<div class="rec-payment-row">' +
           `<div class="rec-field"><label>Payment Method <span class="req">*</span></label>` +
           `<select data-field data-payment-method>${PAYMENT_METHODS.map(m => `<option${m === method ? ' selected' : ''}>${m}</option>`).join('')}</select></div>` +
           `<div class="rec-field"><label>The Amount <span class="req">*</span></label><input data-field value="${amount}"></div>` +
           `<div class="rec-payment-extra"></div>` +
           `<button type="button" class="ibtn danger rec-remove-payment" aria-label="Remove payment method"><svg width="14" height="14" aria-hidden="true"><use href="#i-x"/></svg></button>` +
           '</div>'
         document.getElementById(containerId).appendChild(row)
         renderPaymentExtraFields(row, method)
         connectRecordLabels(row)
         applyRecordValueDirections(row)
         row
           .querySelector('[data-payment-method]')
           .addEventListener('change', e => renderPaymentExtraFields(row, e.target.value))
         row.querySelector('.rec-remove-payment').addEventListener('click', () => row.remove())
         /* a freshly-added row's [data-field] inputs start enabled by default —
  sweep the current editable/locked state onto them immediately so they
  don't escape a locked record */
         applyState()
       }

       function renderPaymentExtraFields(row, method) {
         const extra = row.querySelector('.rec-payment-extra')
         extra.innerHTML = (PAYMENT_EXTRA_FIELDS[method] || [])
           .map(
             f =>
               `<div class="rec-field"><label>${f.label}</label><input data-field value="${f.value}"></div>`
           )
           .join('')
         connectRecordLabels(extra)
         applyRecordValueDirections(extra)
       }


  return {addPaymentMethodRow}
}
