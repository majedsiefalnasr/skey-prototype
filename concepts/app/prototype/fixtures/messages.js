// Messages fixtures -- moved verbatim (by name, unmodified bodies) out of
// concepts/app/legacy-app.js as part of Task 5's fixture-ownership split.
// NOTIF_DATA is the system-notifications panel's sample data ("Direct" tab);
// EMAIL_DATA is the app's own inbox -- separate from system notifications,
// so it gets its own tab instead of being mixed into "Direct" (original
// inline comment preserved below).
//
// Read-only sample/reference data: legacy-app.js never mutates either in
// place.

export const NOTIF_DATA = {
  direct: [
    {
      icon: 'i-post',
      unread: true,
      who: 'Majed Sief Alnasr',
      what: 'Sales Invoice 126 was posted',
      time: '2h',
      type: 'Posting',
      source: 'Sales',
      facts: [
        ['Document', 'Sales Invoice 126'],
        ['Customer', 'Al Noor Trading'],
        ['Amount', '29,780.00 EGP'],
        ['Posted by', 'Majed Sief Alnasr'],
      ],
      body: 'The invoice was posted and its journal entry was created. Debit and credit both total 29,780.00 EGP.',
    },
    {
      icon: 'i-warn',
      unread: true,
      who: 'System',
      what: 'Invoice 118 journal entry is unbalanced',
      time: 'Yesterday',
      type: 'Warning',
      source: 'Accounting',
      detail: 'unbalanced-journal',
    },
    {
      icon: 'i-chat',
      unread: false,
      who: 'General accountant',
      what: 'Comment on Sales Invoice 126',
      time: '2d',
      type: 'Comment',
      source: 'Sales',
      facts: [
        ['Document', 'Sales Invoice 126'],
        ['From', 'General accountant'],
        ['About', 'Line 2 discount'],
      ],
      body: 'Please confirm the discount on line 2 before we send this to the customer. The posted total still includes the old price.',
    },
    {
      icon: 'i-warn',
      unread: true,
      who: 'System',
      what: 'There are accounts whose balances are contrary to their nature (32)',
      time: '1h',
      type: 'Alert',
      source: 'Accounting',
      detail: 'contrary-balances',
    },
    {
      icon: 'i-doc',
      unread: true,
      who: 'System',
      what: 'Employee Documents (1)',
      time: '3h',
      type: 'Alert',
      source: 'HR',
      detail: 'employee-documents',
    },
    {
      icon: 'i-user',
      unread: true,
      who: 'System',
      what: 'There are employees who do not have permanent contracts. (10)',
      time: '4h',
      type: 'Alert',
      source: 'HR',
      detail: 'employees-no-contract',
    },
    {
      icon: 'i-doc',
      unread: true,
      who: 'System',
      what: 'Unposted Documents (414)',
      time: '5h',
      type: 'Alert',
      source: 'Sales',
      detail: 'unposted-documents',
    },
    {
      icon: 'i-flow',
      unread: true,
      who: 'System',
      what: 'Unreceived Stock Transfers (8)',
      time: 'Yesterday',
      type: 'Alert',
      source: 'Inventory',
      detail: 'stock-transfers',
    },
  ],
}

const EMPLOYEES_WITHOUT_CONTRACT = [
  ['11', 'رياض احمد سنان'],
  ['13', 'وهيب احمد مرشد المساح'],
  ['14', 'هناء'],
  ['15', 'محمد الزيلعي'],
  ['17', 'HR 17 فحص هشام'],
  ['3', 'engytest'],
  ['5', 'موظف جديد'],
  ['6', 'عدي جهاد الشبوطي'],
  ['7', 'محمد طه علي عبد العزيز الزريقي'],
  ['8', 'وسيم الزعزعي'],
]

const CONTRARY_ACCOUNTS = [
  ['114001', 'Customers', 'Debit'],
  ['115001', 'Inventory', 'Debit'],
  ['211001', 'Suppliers', 'Credit'],
  ['411001', 'Sales Revenues', 'Credit'],
  ['311001', 'Cost of Sold Goods', 'Debit'],
  ['112001', 'Cash', 'Debit'],
  ['212001', 'Accrued expenses', 'Credit'],
  ['116001', 'Advances', 'Debit'],
]

function contraryBalanceRows() {
  return Array.from({length: 32}, (_, index) => {
    const [code, name, nature] = CONTRARY_ACCOUNTS[index % CONTRARY_ACCOUNTS.length]
    const amount = 1500 + index * 275
    return {
      id: `acc-${index + 1}`,
      accCode: String(Number(code) + index),
      accName: name,
      nature,
      balance: nature === 'Debit' ? -amount : amount,
    }
  })
}

function unpostedDocumentRows() {
  const types = ['Sales Invoice', 'Purchase Invoice', 'Stock Transfer', 'Receipt']
  const users = ['Majed Sief Alnasr', 'General accountant', 'engytest']
  return Array.from({length: 414}, (_, index) => ({
    id: `upd-${index + 1}`,
    docType: types[index % types.length],
    docNo: String(1400 + index),
    date: '02/11/2026',
    user: users[index % users.length],
    amount: 1000 + index * 17,
  }))
}

/** Detail grids opened from an alert notification. Same dialog shell as
    Display Journal Entry; the columns are what changes per alert. */
export const NOTIFICATION_DETAILS = {
  'unbalanced-journal': {
    label: 'lines',
    singular: 'line',
    totals: 'imbalance',
    debit: 15000,
    credit: 14250,
    facts: [
      ['Document', 'Sales Invoice 118'],
      ['Difference', '750.00'],
      ['Status', 'Unbalanced'],
    ],
    columns: [
      {key: 'account', label: 'Account'},
      {key: 'description', label: 'Description'},
      {key: 'debit', label: 'Debit'},
      {key: 'credit', label: 'Credit'},
    ],
    rows: [
      {id: 'j1', account: '1200', description: 'Accounts receivable', debit: '15,000.00', credit: '—'},
      {id: 'j2', account: '4000', description: 'Sales revenue', debit: '—', credit: '12,500.00'},
      {id: 'j3', account: '2200', description: 'VAT payable', debit: '—', credit: '1,750.00'},
    ],
  },
  'employee-documents': {
    label: 'documents',
    singular: 'document',
    columns: [
      {key: 'empCode', label: 'Emp. Code'},
      {key: 'employeeName', label: 'Employee Name'},
      {key: 'docType', label: 'Doc Type'},
      {key: 'docNo', label: 'Doc No.'},
      {key: 'issuanceDate', label: 'Issuance Date'},
      {key: 'expiryDate', label: 'Expiry Date'},
    ],
    rows: [
      {
        id: 'doc-14',
        empCode: '14',
        employeeName: 'هناء',
        docType: 'Identity No.',
        docNo: '100111100110',
        issuanceDate: '11/10/2028',
        expiryDate: '11/10/2028',
      },
    ],
  },
  'employees-no-contract': {
    label: 'employees',
    singular: 'employee',
    columns: [
      {key: 'empCode', label: 'Emp. Code'},
      {key: 'employeeName', label: 'Employee Name'},
    ],
    rows: EMPLOYEES_WITHOUT_CONTRACT.map(([empCode, employeeName]) => ({
      id: `emp-${empCode}`,
      empCode,
      employeeName,
    })),
  },
  'stock-transfers': {
    label: 'transfers',
    singular: 'transfer',
    columns: [
      {key: 'transferNo', label: 'Transfer No.'},
      {key: 'fromWh', label: 'From Warehouse'},
      {key: 'toWh', label: 'To Warehouse'},
      {key: 'date', label: 'Date'},
      {key: 'qty', label: 'Qty'},
    ],
    rows: [
      ['ST-2401', 'Main warehouse', 'Nasr City', '28/10/2026', 12],
      ['ST-2408', 'October', 'Alexandria', '29/10/2026', 4],
      ['ST-2412', 'Main warehouse', 'October', '30/10/2026', 18],
      ['ST-2419', 'Alexandria', 'Nasr City', '30/10/2026', 6],
      ['ST-2422', 'October', 'Main warehouse', '31/10/2026', 9],
      ['ST-2430', 'Nasr City', 'Alexandria', '01/11/2026', 3],
      ['ST-2436', 'Main warehouse', 'Alexandria', '01/11/2026', 15],
      ['ST-2441', 'October', 'Nasr City', '02/11/2026', 7],
    ].map(([transferNo, fromWh, toWh, date, qty]) => ({
      id: transferNo,
      transferNo,
      fromWh,
      toWh,
      date,
      qty,
    })),
  },
  'contrary-balances': {
    label: 'accounts',
    singular: 'account',
    totals: 'balance',
    columns: [
      {key: 'accCode', label: 'Acc. Code'},
      {key: 'accName', label: 'Acc. Name'},
      {key: 'nature', label: 'Nature'},
      {key: 'balance', label: 'Balance', valueType: 'number'},
    ],
    rows: contraryBalanceRows(),
  },
  'unposted-documents': {
    label: 'documents',
    singular: 'document',
    columns: [
      {key: 'docType', label: 'Doc Type'},
      {key: 'docNo', label: 'Doc No.'},
      {key: 'date', label: 'Date'},
      {key: 'user', label: 'User'},
      {key: 'amount', label: 'Amount', valueType: 'number'},
    ],
    rows: unpostedDocumentRows(),
  },
}

/* the app's own inbox -- separate from system notifications above, so it gets
   its own tab instead of being mixed into "Direct" */
export const EMAIL_DATA = [
  {
    id: 'e1',
    day: 'Today',
    from: 'Finance Team',
    email: 'finance@lastchance.local',
    subject: 'Payment scheduled for Sales Invoice 126',
    time: '13:05',
    unread: true,
    hue: 258,
    to: [{name: 'Majed Sief Alnasr', email: 'admin@lastchance.local'}],
    cc: [{name: 'Kane', email: 'kane@lastchance.local'}],
    body: [
      'Good morning,',
      'Your payment for Sales Invoice 126 is scheduled for processing on 29/07/2026, for 20,000.00 EGP on credit terms.',
      'No action is needed on your side — the receipt voucher will be generated automatically once the payment clears. If the amount or due date looks wrong, reply to this email and Finance will take a look.',
      'Thanks,\nFinance Team',
    ],
    attachments: [{name: 'invoice-126.pdf', size: '214 KB'}],
  },
  {
    id: 'e2',
    day: 'Today',
    from: 'Warehouse Ops',
    email: 'warehouse@lastchance.local',
    subject: 'Stock check needed before Bill Outgoing Order ships',
    time: '12:20',
    unread: true,
    hue: 189,
    to: [{name: 'Majed Sief Alnasr', email: 'admin@lastchance.local'}],
    cc: [],
    body: [
      'Hi,',
      'Warehouse 201 shows a stock variance on 3 line items linked to your recent Bill Outgoing Order. Please confirm the counts before the shipment goes out today.',
      'Thanks.',
    ],
    attachments: [],
  },
  {
    id: 'e3',
    day: 'Today',
    from: 'System Admin',
    email: 'admin@lastchance.local',
    subject: 'Your password expires in 5 days',
    time: '11:05',
    unread: false,
    hue: 18,
    to: [{name: 'Majed Sief Alnasr', email: 'admin@lastchance.local'}],
    cc: [],
    body: [
      'Hello,',
      'Your password expires in 5 days. Update it from your account settings to avoid being locked out.',
      'System Admin',
    ],
    attachments: [],
  },
  {
    id: 'e4',
    day: 'Yesterday',
    from: 'Customer Portal',
    email: 'customers@lastchance.local',
    subject: 'Quotation request from Al Noor Trading',
    time: '17:40',
    unread: false,
    hue: 142,
    to: [{name: 'Majed Sief Alnasr', email: 'admin@lastchance.local'}],
    cc: [],
    body: [
      'A new sales quotation request #884 is ready for your review in the Customer Portal.',
      'Please review and approve within 3 business days.',
    ],
    attachments: [{name: 'quotation-884.pdf', size: '98 KB'}],
  },
  {
    id: 'e5',
    day: 'Yesterday',
    from: 'Finance Team',
    email: 'finance@lastchance.local',
    subject: 'Undo request approved on Invoice 118',
    time: '09:15',
    unread: false,
    hue: 258,
    to: [{name: 'Majed Sief Alnasr', email: 'admin@lastchance.local'}],
    cc: [],
    body: [
      'The undo posting request you submitted for Invoice 118 has been approved by the accounting supervisor.',
      'The invoice is unlocked for editing.',
    ],
    attachments: [],
  },
]
