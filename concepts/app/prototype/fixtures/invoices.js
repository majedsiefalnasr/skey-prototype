// Invoice fixtures -- moved verbatim (by name, unmodified bodies) out of
// concepts/app/legacy-app.js as part of Task 5's fixture-ownership split.
// STATUSES/CHAIN/CARDS describe the audit-trail popover's verified model;
// RULES is the action-availability matrix keyed by action label; ACTIVITY
// is the record's activity-feed sample data; LIST_ROWS is the Sales
// Invoice list's sample row data (paired with DATA_LIST_SIMULATED_TOTAL.
// invoice = 125 in components/data-list/model.js -- these 8 rows are a
// representative sample, not the full simulated dataset).
//
// Everything here is read-only sample/reference data: legacy-app.js never
// mutates these arrays/objects in place (verified: no .push/.splice/
// .unshift/reassignment against any of them), only reads via
// find/filter/map/sort, so moving them changes no observable behavior.

export const STATUSES = {
  open: {label: 'Open', short: 'Open'},
  pending: {label: 'Pending', short: 'Pending'},
  posted: {label: 'Posted', short: 'Posted'},
  returned: {label: 'Returned', short: 'Returned'},
  canceled: {label: 'Canceled', short: 'Canceled'},
  inactive: {label: 'Deactivated', short: 'Deactivated'},
}

/* the chain shown in the popover: two audit cards that always exist,
   then the status flags in the order the product records them */
export const CHAIN = [
  {
    id: 'entry',
    name: 'Entry Data',
    always: true,
    who: 'Majed Sief Alnasr',
    when: '22/02/2026 08:25:32',
    dur: '01:39:12',
    decision: 'Invoice created',
  },
  {
    id: 'modified',
    name: 'Modification Data',
    always: true,
    who: 'Majed Sief Alnasr',
    when: '22/02/2026 10:04:18',
    decision: 'Last update recorded',
  },
  {
    id: 'pending',
    name: 'Pending',
    who: 'Sales manager',
    when: '22/02/2026 09:40:02',
    decision: 'Pending',
  },
  {
    id: 'posted',
    name: 'Posted',
    who: 'System admin',
    when: '22/02/2026 11:26:17',
    decision: 'Posted',
    link: 'Display Journal Entry',
  },
  {id: 'returned', name: 'Returned', who: '—', when: '—', decision: 'Returned flag is set'},
  {
    id: 'canceled',
    name: 'Canceled',
    who: 'Majed Sief Alnasr',
    when: '23/02/2026 09:00:11',
    decision: 'Canceled',
  },
  {
    id: 'inactive',
    name: 'Deactivated',
    who: 'Majed Sief Alnasr',
    when: '24/02/2026 14:20:05',
    decision: 'Deactivated',
  },
]

/* audit cards confirmed by the backend team; Returned has no card */
export const CARDS = [
  {
    id: 'entry',
    name: 'Entry Data',
    always: true,
    rows: [
      ['Entered By', 'Majed Sief Alnasr'],
      ['Entry Date', '22/02/2026 08:25:32'],
      ['Entry Start Date', '22/02/2026 06:46:20'],
      ['Entry Duration', '01:39:12'],
      ['No. of Prints', '__PRINTS__'],
    ],
  },
  {
    id: 'modified',
    name: 'Modification Data',
    always: true,
    badge: '3 updates',
    rows: [
      ['Last Update By', 'Majed Sief Alnasr'],
      ['Last Update Date', '22/02/2026 10:04:18'],
      ['No. of Updates', '3'],
    ],
  },
  {
    id: 'pending',
    name: 'Pending-related Data',
    rows: [
      ['Pending User', 'Sales manager'],
      ['Pending Date', '22/02/2026 09:40:02'],
      ['Reason for Pending', 'Waiting for the customer purchase order'],
    ],
  },
  {
    id: 'posted',
    name: 'Posting-related Data',
    link: 'Display Journal Entry',
    rows: [
      ['Last Posting User', 'System admin'],
      ['Posting Date', '22/02/2026 11:26:17'],
      ['Posting Description', 'Posted after the price check passed'],
    ],
  },
  {
    id: 'canceled',
    name: 'Cancellation Data',
    rows: [
      ['Canceled By', 'Majed Sief Alnasr'],
      ['Cancellation Date', '23/02/2026 09:00:11'],
      ['Cancellation Statement', 'Duplicate of invoice 127'],
    ],
  },
  {
    id: 'inactive',
    name: 'Deactivation Data',
    badge: '1 deactivation',
    rows: [
      ['Deactivating User', 'Majed Sief Alnasr'],
      ['Deactivation Date', '24/02/2026 14:20:05'],
      ['Deactivation Reason', 'Suspended pending audit'],
      ['No. of Deactivations', '1'],
    ],
  },
]

/* verified matrix + the one proposed correction */
export const RULES = {
  Save: s => (!s.dirty ? 'Nothing changed yet' : null),
  /* in edit mode Undo also means "leave the invoice as it was", so it stays live */
  Undo: s => (s.mode === 'edit' || s.dirty ? null : 'Nothing to undo yet'),
  /* PROPOSED CORRECTION — the live product still offers Posting on a canceled
     document, which cannot be right. Blocked here on purpose. */
  /* Posting stays reachable once posted — it then opens the recorded posting
     with the reverse action, instead of dead-ending on a disabled button. */
  Posting: s =>
    s.status === 'canceled'
      ? 'A canceled document can\u2019t be posted. Restore it first.'
      : null,
  'Display Journal Entry': s =>
    s.status !== 'posted'
      ? 'Post the invoice first \u2014 the entry is created at posting'
      : null,
  /* likewise, on a canceled document this opens the cancellation record and Restore */
  'Cancel Document': s => null,
  'Receipt Voucher': s =>
    s.status === 'canceled'
      ? 'A canceled invoice can\u2019t generate documents'
      : s.pay !== 'credit'
        ? 'Only credit invoices need a receipt voucher'
        : null,
  'Sales Return': s =>
    s.status === 'canceled' ? 'A canceled invoice can\u2019t generate documents' : null,
}

export const ACTIVITY = [
  {
    day: 'Today · 22 February 2026',
    items: [
      {
        who: 'System admin',
        ini: 'SA',
        what: 'posted the invoice',
        time: '11:26 AM',
        chg: {l: 'Status', f: 'Open', t: 'Posted'},
        chips: [
          {t: 'Display Journal Entry', i: 'i-doc'},
          {t: 'invoice-352.pdf · 86 KB', i: 'i-clip'},
        ],
        notes: [
          {
            who: 'System admin',
            ini: 'SA',
            txt: 'Posted after the price check passed.',
            time: '11:27 AM',
          },
          {
            who: 'General accountant',
            ini: 'GA',
            tag: 'Internal',
            txt: '<span class="mn">@System admin</span> reviewed the entry, the distribution is correct.',
            time: '11:41 AM',
          },
        ],
      },
      {
        who: 'System',
        ini: '',
        sys: true,
        auto: true,
        what: 'locked the invoice fields after posting',
        time: '11:26 AM',
        chg: {l: 'Editability', f: 'Allowed', t: 'Locked'},
      },
      {
        who: 'Majed Sief Alnasr',
        ini: 'MS',
        what: 'updated the invoice',
        time: '10:04 AM',
        chg: {l: 'Qty.', f: '8', t: '10'},
      },
      {
        who: 'Majed Sief Alnasr',
        ini: 'MS',
        what: 'created the invoice',
        time: '8:25 AM',
        chips: [{t: 'purchase-order-77.pdf · 240 KB', i: 'i-clip'}],
      },
    ],
  },
]

export const LIST_ROWS = [
  {
    seq: '001000352026143',
    no: '143',
    date: '13/08/2026',
    dueDate: '13/09/2026',
    subtype: 'عام',
    poRef: 'PO-88213',
    pay: 'Cash',
    custNo: '200002',
    custName: 'customertest',
    branch: '2 - lastchance',
    status: 'Posted',
    currency: 'EGP',
    priceList: 'Retail 2026',
    taxAmount: '28.00',
    discount: '0.00',
    total: '200.00',
    salesRep: 'Mona Farouk',
    warehouse: 'WH-01 Main Store',
    createdBy: 'mona.farouk',
    modifiedAt: '13/08/2026',
  },
  {
    seq: '001000352026142',
    no: '142',
    date: '13/08/2026',
    dueDate: '13/09/2026',
    subtype: 'عام',
    poRef: 'PO-88190',
    pay: 'Cash',
    custNo: '200002',
    custName: 'customertest',
    branch: '2 - lastchance',
    status: 'Posted',
    currency: 'EGP',
    priceList: 'Retail 2026',
    taxAmount: '245.00',
    discount: '50.00',
    total: '1,750.00',
    salesRep: 'Mona Farouk',
    warehouse: 'WH-01 Main Store',
    createdBy: 'mona.farouk',
    modifiedAt: '13/08/2026',
  },
  {
    seq: '001000352026140',
    no: '140',
    date: '13/08/2026',
    dueDate: '12/10/2026',
    subtype: 'عام',
    poRef: 'PO-88104',
    pay: 'Credit',
    custNo: '200001',
    custName: 'العميل الاول',
    branch: '1 - headoffice',
    status: 'Posted',
    currency: 'EGP',
    priceList: 'Wholesale 2026',
    taxAmount: '784.00',
    discount: '200.00',
    total: '5,600.00',
    salesRep: 'Ahmed Nabil',
    warehouse: 'WH-02 Central',
    createdBy: 'ahmed.nabil',
    modifiedAt: '14/08/2026',
  },
  {
    seq: '001000352026144',
    no: '144',
    date: '14/08/2026',
    dueDate: '14/09/2026',
    subtype: 'عام',
    poRef: 'PO-88240',
    pay: 'Cash',
    custNo: '200002',
    custName: 'customertest',
    branch: '2 - lastchance',
    status: 'Draft',
    currency: 'EGP',
    priceList: 'Retail 2026',
    taxAmount: '133.00',
    discount: '0.00',
    total: '950.00',
    salesRep: 'Mona Farouk',
    warehouse: 'WH-01 Main Store',
    createdBy: 'mona.farouk',
    modifiedAt: '14/08/2026',
  },
  {
    seq: '001000352026145',
    no: '145',
    date: '14/08/2026',
    dueDate: '13/10/2026',
    subtype: 'عام',
    poRef: 'PO-88251',
    pay: 'Credit',
    custNo: '200001',
    custName: 'العميل الاول',
    branch: '1 - headoffice',
    status: 'Open',
    currency: 'EGP',
    priceList: 'Wholesale 2026',
    taxAmount: '448.00',
    discount: '100.00',
    total: '3,200.00',
    salesRep: 'Ahmed Nabil',
    warehouse: 'WH-02 Central',
    createdBy: 'ahmed.nabil',
    modifiedAt: '15/08/2026',
  },
  {
    seq: '001000352026146',
    no: '146',
    date: '15/08/2026',
    dueDate: '15/09/2026',
    subtype: 'عام',
    poRef: 'PO-88277',
    pay: 'Cash',
    custNo: '200002',
    custName: 'customertest',
    branch: '2 - lastchance',
    status: 'Pending',
    currency: 'EGP',
    priceList: 'Retail 2026',
    taxAmount: '157.00',
    discount: '25.00',
    total: '1,120.00',
    salesRep: 'Mona Farouk',
    warehouse: 'WH-01 Main Store',
    createdBy: 'mona.farouk',
    modifiedAt: '15/08/2026',
  },
  {
    seq: '001000352026147',
    no: '147',
    date: '15/08/2026',
    dueDate: '14/10/2026',
    subtype: 'عام',
    poRef: 'PO-88283',
    pay: 'Credit',
    custNo: '200001',
    custName: 'العميل الاول',
    branch: '1 - headoffice',
    status: 'Returned',
    currency: 'EGP',
    priceList: 'Wholesale 2026',
    taxAmount: '67.00',
    discount: '0.00',
    total: '480.00',
    salesRep: 'Ahmed Nabil',
    warehouse: 'WH-02 Central',
    createdBy: 'ahmed.nabil',
    modifiedAt: '16/08/2026',
  },
  {
    seq: '001000352026148',
    no: '148',
    date: '16/08/2026',
    dueDate: '16/09/2026',
    subtype: 'عام',
    poRef: 'PO-88301',
    pay: 'Cash',
    custNo: '200002',
    custName: 'customertest',
    branch: '2 - lastchance',
    status: 'Canceled',
    currency: 'EGP',
    priceList: 'Retail 2026',
    taxAmount: '280.00',
    discount: '0.00',
    total: '2,000.00',
    salesRep: 'Mona Farouk',
    warehouse: 'WH-01 Main Store',
    createdBy: 'mona.farouk',
    modifiedAt: '16/08/2026',
  },
]
