// Journal Entry fixture -- the same read-only sample-data convention as
// prototype/fixtures/customers.js. The linked journal entry for invoice
// 126 (posted sales invoice), shown read-only via the invoice record's own
// "Display Journal Entry" dialog (pages/invoices/record-dialogs.html).

export const JOURNAL_ENTRY_ROWS = [
  {
    accCode: '114001',
    detailAcc: '200001',
    accName: 'Customers',
    currency: 'EGP',
    debit: 20000,
    credit: 0,
    localDebit: 20000,
    localCredit: 0,
    statement: 'فاتورة المبيعات (EGP) 001000352026126',
    costCenter: '',
    subLedger2: '',
  },
  {
    accCode: '411001',
    detailAcc: '',
    accName: 'Sales Revenues',
    currency: 'EGP',
    debit: 0,
    credit: 20000,
    localDebit: 0,
    localCredit: 20000,
    statement: 'مبيعات المجموعة رقم (001)',
    costCenter: '',
    subLedger2: '',
  },
  {
    accCode: '115001',
    detailAcc: '',
    accName: 'Inventory',
    currency: 'EGP',
    debit: 0,
    credit: 9780,
    localDebit: 0,
    localCredit: 9780,
    statement: 'تكلفة مبيعات المجموعة رقم (001)',
    costCenter: '',
    subLedger2: '',
  },
  {
    accCode: '311001',
    detailAcc: '',
    accName: 'Cost of Sold Goods',
    currency: 'EGP',
    debit: 9780,
    credit: 0,
    localDebit: 9780,
    localCredit: 0,
    statement: 'تكلفة مبيعات المجموعة رقم (001)',
    costCenter: '',
    subLedger2: '',
  },
]
