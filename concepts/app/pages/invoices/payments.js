// Mechanically extracted invoice behavior; fixture values and markup are preserved.
export function createInvoicePayments({connectRecordLabels, applyRecordValueDirections, applyState}) {
const pageAbort = new AbortController()

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
         row.className = 'rec-card [border:1px_solid_var(--line)] rounded-lg mb-3! overflow-hidden [.rec-card-flow>&]:[flex:1_1_calc(var(--card-cols,_3)_*_200px)] [.rec-card-flow>&]:[min-width:min(100%,_320px)] [.rec-card-flow>&]:mb-0!'
         row.dataset.paymentRow = id
         row.innerHTML =
           '<div class="rec-payment-row flex items-end gap-4 [padding:12px]">' +
           `<div class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted"><label>Payment Method <span class="req [.rfld_label_&]:[color:var(--danger)] [.rec-field_&]:[color:var(--danger)]">*</span></label>` +
           `<select data-field data-payment-method>${PAYMENT_METHODS.map(m => `<option${m === method ? ' selected' : ''}>${m}</option>`).join('')}</select></div>` +
           `<div class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted"><label>The Amount <span class="req [.rfld_label_&]:[color:var(--danger)] [.rec-field_&]:[color:var(--danger)]">*</span></label><input data-field value="${amount}"></div>` +
           `<div class="rec-payment-extra [display:contents]"></div>` +
           `<button type="button" class="ibtn danger rec-remove-payment [.rec-adjustment-row_&]:[margin-bottom:1px]! [flex:none]" aria-label="Remove payment method"><svg width="14" height="14" aria-hidden="true"><use href="#i-x"/></svg></button>` +
           '</div>'
         document.getElementById(containerId).appendChild(row)
         renderPaymentExtraFields(row, method)
         connectRecordLabels(row)
         applyRecordValueDirections(row)
         row
           .querySelector('[data-payment-method]')
           .addEventListener('change', e => renderPaymentExtraFields(row, e.target.value), {signal: pageAbort.signal})
         row.querySelector('.rec-remove-payment').addEventListener('click', () => row.remove(), {signal: pageAbort.signal})
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
               `<div class="rec-field [&_label]:block [&_label]:text-xs [&_label]:text-muted [&_label]:[margin-bottom:3px]! [&_input]:w-full [&_input]:[padding:6px_8px] [&_input]:[border:1px_solid_var(--line)] [&_input]:rounded-md [&_input]:[font:inherit] [&_input]:text-ink [&_input]:bg-surface [&_select]:w-full [&_select]:[padding:6px_8px] [&_select]:[border:1px_solid_var(--line)] [&_select]:rounded-md [&_select]:[font:inherit] [&_select]:text-ink [&_select]:bg-surface [&_textarea]:w-full [&_textarea]:[padding:6px_8px] [&_textarea]:[border:1px_solid_var(--line)] [&_textarea]:rounded-md [&_textarea]:[font:inherit] [&_textarea]:text-ink [&_textarea]:bg-surface [&_textarea]:[resize:vertical] [&_input:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_select:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_textarea:is(:hover,_:focus-visible)]:[border-color:var(--accent-line)] [&_input:focus-visible]:[outline:none] [&_input:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_select:focus-visible]:[outline:none] [&_select:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_textarea:focus-visible]:[outline:none] [&_textarea:focus-visible]:[box-shadow:0_0_0_3px_var(--accent-soft)] [&_input:disabled]:bg-[var(--line-2)] [&_input:disabled]:text-muted [&_select:disabled]:bg-[var(--line-2)] [&_select:disabled]:text-muted [&_textarea:disabled]:bg-[var(--line-2)] [&_textarea:disabled]:text-muted [&_select]:[appearance:none] [&_select]:[-webkit-appearance:none] [&_select]:[padding-inline-end:28px] [&_select]:[background-image:url(data:image/svg+xml,%3Csvg_xmlns=http://www.w3.org/2000/svg_width=12_height=12_viewBox=0_0_12_12%3E%3Cpath_fill=%2344546f_d=M2.5_4.5_6_8l3.5-3.5z/%3E%3C/svg%3E)] [&_select]:[background-repeat:no-repeat] [&_select]:[background-position:right_8px_center] [&_select]:[background-size:12px] [[dir=rtl]_&_select]:[padding-inline-end:8px] [[dir=rtl]_&_select]:[padding-inline-start:28px] [[dir=rtl]_&_select]:[background-position:left_8px_center] [.rec-payment-row_&]:[flex:1] [.rec-payment-row_&]:[min-width:140px] [.rec-adjustment-row_&_label]:text-muted"><label>${f.label}</label><input data-field value="${f.value}"></div>`
           )
           .join('')
         connectRecordLabels(extra)
         applyRecordValueDirections(extra)
       }


  return {dispose: () => pageAbort.abort(), addPaymentMethodRow}
}
