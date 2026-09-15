// Mechanically extracted invoice behavior; fixture values and markup are preserved.
export function createInvoiceLines({applyRecordValueDirections, applyState}) {
  const abort = new AbortController()
       let itemRowCount = 0
       /* bodyId/totalId let Concepts B and C (Task 6) reuse this for their own items
          grids, which have their own tbody/total elements since only one concept's
          canvas is visible at a time but all three will exist in the DOM simultaneously */
       function addItemRow(bodyId, totalId) {
         const id = itemRowCount++
         const tr = document.createElement('tr')
         tr.dataset.itemRow = id
         tr.innerHTML =
           '<td><input data-field placeholder="Item"></td>' +
           '<td><input data-field placeholder="UoM"></td>' +
           '<td><input data-field placeholder="Expiry"></td>' +
           '<td><input data-field placeholder="Batch"></td>' +
           '<td><input data-field type="number" value="1" class="items-qty"></td>' +
           '<td><input data-field type="number" value="0"></td>' +
           '<td><input data-field disabled placeholder="—"></td>' +
           '<td><input data-field type="number" value="0"></td>' +
           '<td><input data-field type="number" value="0"></td>' +
           '<td><input data-field disabled value="0"></td>' +
           '<td><input data-field disabled value="0"></td>' +
           '<td><input data-field disabled value="0"></td>' +
           '<td><button type="button" class="ibtn danger rec-remove-item [.rec-adjustment-row_&]:[margin-bottom:1px]!" aria-label="Remove item"><svg width="14" height="14" aria-hidden="true"><use href="#i-x"/></svg></button></td>'
         const itemFieldNames = [
           'Item',
           'Unit of measure',
           'Expiry date',
           'Batch',
           'Quantity',
           'Unit price',
           'Bonus quantity',
           'Discount',
           'Tax',
           'Gross amount',
           'Discount amount',
           'Net amount',
         ]
         tr.querySelectorAll('input').forEach((input, index) => {
           input.setAttribute('aria-label', itemFieldNames[index])
         })
         applyRecordValueDirections(tr)
         document.getElementById(bodyId).appendChild(tr)
         tr.querySelector('.rec-remove-item').addEventListener('click', () => {
           tr.remove()
           recalcTotalQty(bodyId, totalId)
         })
         tr.querySelector('.items-qty').addEventListener('input', () =>
           recalcTotalQty(bodyId, totalId)
         )
         recalcTotalQty(bodyId, totalId)
         /* a freshly-added row's [data-field] inputs start enabled by default —
  sweep the current editable/locked state onto them immediately so they
  don't escape a locked record */
         applyState()
       }
       function recalcTotalQty(bodyId, totalId) {
         const qtys = [...document.querySelectorAll(`#${bodyId} .items-qty`)].map(
           i => Number(i.value) || 0
         )
         document.getElementById(totalId).textContent = qtys.reduce((a, b) => a + b, 0)
       }

       /* Spreadsheet-style line entry: Enter moves to the same column on the next
          row, adding one if this is the last row, so a clerk can key in several
          lines without reaching for the mouse. Arrow keys move between cells the
          same way a spreadsheet does; they only take over navigation on inputs
          where the caret is already at that edge, so normal text editing (and
          number-input spin arrows) still works. */
       document.addEventListener('keydown', event => {
         const cell = event.target.closest('.inv-grid td [data-field]')
         if (!cell) return
         const row = cell.closest('tr[data-item-row]')
         if (!row) return
         const body = row.parentElement
         const cellIndex = [...row.children].indexOf(cell.closest('td'))
         /* type="number" already uses Up/Down to step its value, so row-to-row
            arrow navigation only applies to plain text cells (Item, UoM, Expiry,
            Batch) — Enter still moves every field type to the next row. */
         const isPlainText = cell.tagName === 'INPUT' && cell.type === 'text'
         const atStart = isPlainText && cell.selectionStart === 0
         const atEnd = isPlainText && cell.selectionEnd === cell.value.length
         const moveTo = targetRow => {
           const targetCell = targetRow?.children[cellIndex]?.querySelector('[data-field]')
           if (!targetCell || targetCell.disabled) return false
           event.preventDefault()
           targetCell.focus()
           if (targetCell.tagName === 'INPUT') targetCell.select()
           return true
         }
         if (event.key === 'Enter' && !event.shiftKey) {
           event.preventDefault()
           const next = row.nextElementSibling
           if (next) moveTo(next)
           else if (body.id === 'items-body') {
             addItemRow('items-body', 'items-total-qty')
             moveTo(body.lastElementChild)
           }
           return
         }
         if (event.key === 'ArrowDown' && atEnd) {
           if (moveTo(row.nextElementSibling)) return
         }
         if (event.key === 'ArrowUp' && atStart) {
           if (moveTo(row.previousElementSibling)) return
         }
         if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
           if (body.id !== 'items-body') return
           event.preventDefault()
           const values = [...row.querySelectorAll('[data-field]')].map(field => field.value)
           addItemRow('items-body', 'items-total-qty')
           const newRow = body.lastElementChild
           newRow.querySelectorAll('[data-field]').forEach((field, index) => {
             if (!field.disabled) field.value = values[index] ?? field.value
           })
           recalcTotalQty('items-body', 'items-total-qty')
           moveTo(newRow)
         }
       }, {signal: abort.signal})

       /* Multi-cell paste: clipboard text with tabs (columns) and newlines (rows) —
          the shape a user copies out of a spreadsheet — fills forward from the
          focused cell, adding rows if the pasted block runs past the last one. */
       document.addEventListener('paste', event => {
         const cell = event.target.closest('.inv-grid td [data-field]')
         if (!cell) return
         const text = event.clipboardData?.getData('text/plain') ?? ''
         if (!text.includes('\t') && !text.includes('\n')) return
         const row = cell.closest('tr[data-item-row]')
         const body = row?.parentElement
         if (!row || body?.id !== 'items-body') return
         event.preventDefault()
         const cellIndex = [...row.children].indexOf(cell.closest('td'))
         const grid = text
           .replace(/\r/g, '')
           .split('\n')
           .filter((line, index, lines) => line !== '' || index < lines.length - 1)
           .map(line => line.split('\t'))
         let targetRow = row
         grid.forEach((lineValues, rowOffset) => {
           if (rowOffset > 0) {
             if (!targetRow.nextElementSibling) addItemRow('items-body', 'items-total-qty')
             targetRow = targetRow.nextElementSibling
           }
           lineValues.forEach((value, columnOffset) => {
             const field =
               targetRow.children[cellIndex + columnOffset]?.querySelector('[data-field]')
             if (field && !field.disabled) field.value = value
           })
         })
         recalcTotalQty('items-body', 'items-total-qty')
       }, {signal: abort.signal})

  return {addItemRow, recalcTotalQty, dispose: () => abort.abort()}
}
