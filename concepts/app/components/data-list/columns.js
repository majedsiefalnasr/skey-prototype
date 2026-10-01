// Data-list column configuration and responsive-width calculation — moved
// verbatim (unmodified bodies) out of concepts/app/legacy-app.js as part of
// Task 5. DATA_LIST_CONFIG is the baseline's single source of truth for
// every list surface's columns/filters/filterFields (baseline range
// .baseline/concepts/app-shell.html:21069-21275, DATA_LIST_CONFIG +
// DATA_LIST_STATISTICS_CONCEPT_OPTIONS); DATA_LIST_RESPONSIVE_WIDTH +
// responsiveDataListColumns are the column-calculation functions named in
// the brief (baseline range 23532-23588).
//
// responsiveDataListColumns(context, width, listState) already took
// `listState` as an explicit parameter in the original — this module's
// version is unchanged in that respect; only `DATA_LIST_CONFIG[context]`
// (module-local here, not a legacy-app.js global) is looked up internally.
//
// pages/customers/customers.js re-exports DATA_LIST_CONFIG.customer as
// `customerConfig` (configuration only, per the brief — full customer page
// extraction is Task 7).

import {LIST_ROWS} from '../../prototype/fixtures/invoices.js'
import {CUSTOMER_ROWS} from '../../prototype/fixtures/customers.js'
import {GEO_ROWS} from '../../prototype/fixtures/geography.js'
import {SCREEN_PARAMETER_ROWS} from '../../prototype/fixtures/screen-parameters.js'
import {JOURNAL_ENTRY_ROWS} from '../../prototype/fixtures/journal-entry.js'

// Organization Center's 5 table contexts (orgUsers/orgAppSessions/
// orgDbSessions/orgAudit/orgStaff, defined below) start with an empty
// `rows` array — unlike every context above, whose fixture is static and
// fixed for the module's lifetime, Organization's rows are role-scoped
// and mutate at runtime (session revoke/terminate). The real row set is
// supplied via the model's setRows(rows) (model.js) before each
// activate()/render(), called from concepts/app/pages/organization/
// organization.js's own render cycle — this array is only ever the
// pre-first-render placeholder.

export const DATA_LIST_CONFIG = {
  invoice: {
    label: 'invoices',
    singular: 'invoice',
    key: 'no',
    rows: LIST_ROWS,
    supportsKanban: true,
    /* group tags the field for Adaptive view's sectioned layout
       (Document / Customer / Financials / Audit trail) — purely a
       presentation hint, unrelated to table-column visibility. */
    columns: [
      {key: 'seq', label: 'Doc. Sequence', group: 'document'},
      {key: 'no', label: 'Doc No.', group: 'document'},
      {key: 'status', label: 'Invoice Status', group: 'document'},
      {
        key: 'date',
        label: 'Doc Date',
        plottable: true,
        valueType: 'date',
        group: 'document',
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        plottable: true,
        valueType: 'date',
        group: 'document',
      },
      {key: 'subtype', label: 'Doc Sub-type Name', group: 'document'},
      {key: 'poRef', label: 'PO Reference', group: 'document'},
      {key: 'custNo', label: 'Customer No.', group: 'customer'},
      {key: 'custName', label: 'Customer Name', group: 'customer'},
      {key: 'branch', label: 'Branch', group: 'customer'},
      {key: 'pay', label: 'Payment method', group: 'financials'},
      {key: 'currency', label: 'Currency', group: 'financials'},
      {key: 'priceList', label: 'Price List', group: 'financials'},
      {
        key: 'taxAmount',
        label: 'Tax Amount',
        plottable: true,
        valueType: 'number',
        group: 'financials',
      },
      {
        key: 'discount',
        label: 'Discount',
        plottable: true,
        valueType: 'number',
        group: 'financials',
      },
      {
        key: 'total',
        label: 'Net Total',
        plottable: true,
        valueType: 'number',
        group: 'financials',
      },
      {key: 'salesRep', label: 'Sales Rep', group: 'audit'},
      {key: 'warehouse', label: 'Warehouse', group: 'audit'},
      {key: 'createdBy', label: 'Created By', group: 'audit'},
      {
        key: 'modifiedAt',
        label: 'Last Modified',
        plottable: true,
        valueType: 'date',
        group: 'audit',
      },
    ],
    filters: [
      {key: 'all', label: 'All invoices', icon: 'i-eye'},
      {key: 'cash', label: 'Cash invoices', icon: 'i-doc'},
      {key: 'credit', label: 'Credit invoices', icon: 'i-doc'},
      {key: 'recent', label: 'Recent invoices', icon: 'i-clock'},
    ],
    filterFields: [
      {key: 'no', label: 'Doc No.', icon: 'i-doc', type: 'text'},
      {key: 'custName', label: 'Customer', icon: 'i-user', type: 'text'},
      {
        key: 'pay',
        label: 'Payment method',
        icon: 'i-panel',
        type: 'select',
        options: ['Cash', 'Credit'],
      },
      {
        key: 'date',
        label: 'Doc date',
        icon: 'i-clock',
        type: 'date',
      },
      {
        key: 'subtype',
        label: 'Doc Sub-type',
        icon: 'i-doc',
        type: 'select',
        options: ['عام'],
      },
    ],
  },
  customer: {
    label: 'customers',
    singular: 'customer',
    key: 'customerNo',
    rows: CUSTOMER_ROWS,
    supportsActivateDeactivate: true,
    columns: [
      {key: 'avatar', label: 'Photo', sortable: false, groupable: false},
      {key: 'customerNo', label: 'Customer No.'},
      {key: 'customerName', label: 'Customer Name'},
      {key: 'operationUnit', label: 'Operation Unit'},
      {key: 'customerType', label: 'Customer Type'},
      {key: 'customerGroup', label: 'Customer Group'},
      {key: 'currency', label: 'Currency'},
      {key: 'country', label: 'Country'},
      {key: 'phone', label: 'Phone'},
      {key: 'active', label: 'Active status'},
    ],
    filters: [
      {key: 'all', label: 'All customers', icon: 'i-eye'},
      {key: 'active', label: 'Active customers', icon: 'i-check'},
      {key: 'inactive', label: 'Inactive customers', icon: 'i-archive'},
      {key: 'retail', label: 'Retail customers', icon: 'i-user'},
    ],
    filterFields: [
      {key: 'customerNo', label: 'Customer No.', icon: 'i-doc', type: 'text'},
      {key: 'customerName', label: 'Customer Name', icon: 'i-user', type: 'text'},
      {
        key: 'customerType',
        label: 'Customer Type',
        icon: 'i-panel',
        type: 'select',
        options: ['Retail', 'Wholesale'],
      },
      {
        key: 'customerGroup',
        label: 'Customer Group',
        icon: 'i-grid',
        type: 'select',
        options: ['General', 'Local'],
      },
      {key: 'country', label: 'Country', icon: 'i-grid', type: 'text'},
      {
        key: 'active',
        label: 'Active status',
        icon: 'i-check',
        type: 'select',
        options: [
          {value: 'true', label: 'Active'},
          {value: 'false', label: 'Inactive'},
        ],
      },
    ],
  },
  geo: {
    label: 'locations',
    singular: 'location',
    key: 'code',
    rows: GEO_ROWS,
    supportsActivateDeactivate: true,
    columns: [
      {key: 'code', label: 'Location Code'},
      {key: 'name', label: 'Location Name'},
      {key: 'parent', label: 'Parent Location'},
      {key: 'type', label: 'Type'},
      {key: 'level', label: 'Level', plottable: true, valueType: 'number'},
      {key: 'active', label: 'Active status'},
      {key: 'remarks', label: 'Remarks'},
    ],
    filters: [
      {key: 'all', label: 'All locations', icon: 'i-eye'},
      {key: 'active', label: 'Active locations', icon: 'i-check'},
      {key: 'root', label: 'Root locations', icon: 'i-flow'},
      {key: 'inactive', label: 'Inactive locations', icon: 'i-archive'},
    ],
    filterFields: [
      {key: 'code', label: 'Location Code', icon: 'i-doc', type: 'text'},
      {key: 'name', label: 'Location Name', icon: 'i-flow', type: 'text'},
      {key: 'parent', label: 'Parent Location', icon: 'i-flow', type: 'text'},
      {
        key: 'type',
        label: 'Type',
        icon: 'i-grid',
        type: 'select',
        options: ['Country', 'Governorate', 'City', 'District'],
      },
      {
        key: 'level',
        label: 'Level',
        icon: 'i-panel',
        type: 'select',
        options: ['1', '2', '3'],
      },
      {
        key: 'active',
        label: 'Active status',
        icon: 'i-check',
        type: 'select',
        options: [
          {value: 'true', label: 'Active'},
          {value: 'false', label: 'Inactive'},
        ],
      },
    ],
  },
  // Screen Parameters — a plain reference table shared by every record
  // page's "Screen Parameters" dialog (Sales Invoice, Customer,
  // Geographical Structure), given the same real data-list Filter/Search/
  // Columns/sort/pagination UX every list page uses. Unlike the other
  // three contexts, rows carry no detail record, no delete, and no status
  // — `noRowActions: true` is this config's own flag (read by
  // views.js/list.js) that drops the select-all checkbox and the
  // row-actions "..." column, since neither has anything to act on here.
  screenParameters: {
    label: 'parameters',
    singular: 'parameter',
    key: 'name',
    rows: SCREEN_PARAMETER_ROWS,
    noRowActions: true,
    columns: [
      {key: 'name', label: 'Parameter Name'},
      {key: 'value', label: 'Value'},
      {key: 'type', label: 'Type'},
    ],
    filters: [{key: 'all', label: 'All parameters', icon: 'i-sliders'}],
    filterFields: [
      {key: 'name', label: 'Parameter Name', icon: 'i-doc', type: 'text'},
      {key: 'value', label: 'Value', icon: 'i-check', type: 'text'},
      {
        key: 'type',
        label: 'Type',
        icon: 'i-grid',
        type: 'select',
        options: ['General Parameters', 'Transactions Privileges'],
      },
    ],
  },
  // Journal Entry — the invoice record's own "Display Journal Entry"
  // dialog (pages/invoices/record-dialogs.html). Same real data-list
  // Filter/Search/Columns/sort/pagination UX and `noRowActions: true` as
  // Screen Parameters (no detail record, no delete). The Debit/Credit/
  // Local Debit/Local Credit totals + Balanced badge the real screen shows
  // live below the table, computed from the full row set — not through
  // this table's own render pipeline, which has no tfoot/totals concept
  // (screen-parameters.js's sibling, journal-entry.js, renders that strip).
  journal: {
    label: 'lines',
    singular: 'line',
    key: 'accCode',
    rows: JOURNAL_ENTRY_ROWS,
    noRowActions: true,
    // Opt out of list.js's percentage colgroup + `[table-layout:fixed]`:
    // the journal table lays out naturally and scrolls horizontally inside
    // the dialog's `.dbody` (record-dialogs.html) instead of squeezing
    // its 11 columns into the dialog width.
    scrollOverflow: true,
    columns: [
      {key: 'accCode', label: 'Acc. Code'},
      {key: 'detailAcc', label: 'Detail Acc.'},
      {key: 'accName', label: 'Acc. Name'},
      {key: 'currency', label: 'Currency'},
      {key: 'debit', label: 'Debit', plottable: true, valueType: 'number'},
      {key: 'credit', label: 'Credit', plottable: true, valueType: 'number'},
      {key: 'localDebit', label: 'Local Debit', plottable: true, valueType: 'number'},
      {key: 'localCredit', label: 'Local Credit', plottable: true, valueType: 'number'},
      {key: 'statement', label: 'Statement'},
      {key: 'costCenter', label: 'Cost Center No.'},
      {key: 'subLedger2', label: 'Sub Ledger2 No.'},
    ],
    filters: [{key: 'all', label: 'All lines', icon: 'i-doc'}],
    filterFields: [
      {key: 'accCode', label: 'Acc. Code', icon: 'i-doc', type: 'text'},
      {key: 'accName', label: 'Acc. Name', icon: 'i-doc', type: 'text'},
      {key: 'currency', label: 'Currency', icon: 'i-grid', type: 'select', options: ['EGP']},
      {key: 'statement', label: 'Statement', icon: 'i-doc', type: 'text'},
    ],
  },
  // Organization Center's 5 table sections — same real data-list Filter/
  // Search/Columns/sort/pagination UX as Journal Entry/Screen Parameters
  // above (`noRowActions: true`, no detail record, no delete). Their rows
  // are dynamic (see the empty-array comment above this object) and their
  // Revoke/Terminate row actions render as ordinary cell content in the
  // "State" column via renderers.js's renderDataListCell, rather than as
  // engine-native row actions — noRowActions:true tables have no actions
  // column at all (views.js), so the action button lives inside the last
  // visible column's cell instead, the same technique invoices.js already
  // uses for its own interactive cell content (e.g. the record-link
  // button and invoiceStatusBadge).
  orgUsers: {
    label: 'accounts',
    singular: 'account',
    key: 'id',
    rows: [],
    noRowActions: true,
    columns: [
      {key: 'name', label: 'User'},
      {key: 'role', label: 'Role'},
      {key: 'branch', label: 'Branch'},
      {key: 'status', label: 'Status'},
      {key: 'lastActive', label: 'Last active'},
      {key: 'mfa', label: 'MFA'},
    ],
    filters: [{key: 'all', label: 'All accounts', icon: 'i-user'}],
    filterFields: [
      {key: 'role', label: 'Role', icon: 'i-user', type: 'text'},
      {key: 'branch', label: 'Branch', icon: 'i-location', type: 'text'},
      {key: 'status', label: 'Status', icon: 'i-check', type: 'select', options: ['Active', 'Locked', 'Dormant']},
    ],
  },
  orgAppSessions: {
    label: 'sessions',
    singular: 'session',
    key: 'id',
    rows: [],
    noRowActions: true,
    columns: [
      {key: 'user', label: 'User'},
      {key: 'branch', label: 'Branch'},
      {key: 'device', label: 'Device and location'},
      {key: 'started', label: 'Started'},
      {key: 'lastActive', label: 'Last active'},
      {key: 'state', label: 'State'},
    ],
    filters: [{key: 'all', label: 'All sessions', icon: 'i-user'}],
    filterFields: [
      {key: 'user', label: 'User', icon: 'i-user', type: 'text'},
      {key: 'branch', label: 'Branch', icon: 'i-location', type: 'text'},
    ],
  },
  orgDbSessions: {
    label: 'sessions',
    singular: 'session',
    key: 'id',
    rows: [],
    noRowActions: true,
    columns: [
      {key: 'id', label: 'Session'},
      {key: 'workload', label: 'Workload'},
      {key: 'state', label: 'State'},
      {key: 'duration', label: 'Duration'},
      {key: 'query', label: 'Operation'},
      {key: 'blocking', label: 'Blocking'},
    ],
    filters: [{key: 'all', label: 'All sessions', icon: 'i-lock'}],
    filterFields: [
      {key: 'workload', label: 'Workload', icon: 'i-lock', type: 'text'},
      {key: 'state', label: 'State', icon: 'i-check', type: 'select', options: ['Running', 'Waiting', 'Sleeping']},
    ],
  },
  orgAudit: {
    label: 'events',
    singular: 'event',
    key: 'id',
    defaultSortKey: 'timestamp',
    defaultSortDirection: 'desc',
    rows: [],
    noRowActions: true,
    columns: [
      {key: 'timestamp', label: 'Date and time'},
      {key: 'actor', label: 'Actor'},
      {key: 'action', label: 'Activity'},
      {key: 'source', label: 'Source'},
      {key: 'result', label: 'Result'},
    ],
    filters: [{key: 'all', label: 'All events', icon: 'i-clock'}],
    filterFields: [
      {key: 'source', label: 'Source', icon: 'i-doc', type: 'text'},
      {key: 'result', label: 'Result', icon: 'i-check', type: 'select', options: ['Success', 'Denied', 'Partial']},
    ],
  },
  orgStaff: {
    label: 'staff',
    singular: 'staff member',
    key: 'id',
    rows: [],
    noRowActions: true,
    columns: [
      {key: 'name', label: 'Staff member'},
      {key: 'completed', label: 'Completed', plottable: true, valueType: 'number'},
      {key: 'pending', label: 'Pending', plottable: true, valueType: 'number'},
      {key: 'oldest', label: 'Oldest item'},
      {key: 'turnaround', label: 'Turnaround'},
      {key: 'rework', label: 'Rework'},
      {key: 'slaBreaches', label: 'SLA breaches', plottable: true, valueType: 'number'},
    ],
    filters: [{key: 'all', label: 'All staff', icon: 'i-user'}],
    filterFields: [
      {key: 'team', label: 'Team', icon: 'i-user', type: 'text'},
    ],
  },
}

export const DATA_LIST_STATISTICS_CONCEPT_OPTIONS = [
  {key: 'balanced', label: 'Balanced cards'},
  {key: 'operational', label: 'Operational workspace'},
  {key: 'analytical', label: 'Analytical KPIs'},
]

export const DATA_LIST_RESPONSIVE_WIDTH = {
  avatar: 56,
  seq: 180,
  no: 92,
  date: 112,
  dueDate: 112,
  subtype: 145,
  poRef: 110,
  pay: 130,
  custNo: 120,
  custName: 180,
  branch: 150,
  priceList: 130,
  taxAmount: 110,
  discount: 100,
  salesRep: 140,
  warehouse: 150,
  createdBy: 120,
  modifiedAt: 112,
  customerNo: 125,
  customerName: 165,
  operationUnit: 160,
  customerType: 130,
  customerGroup: 135,
  currency: 92,
  country: 105,
  phone: 140,
  active: 112,
  code: 120,
  name: 170,
  parent: 220,
  type: 110,
  level: 78,
  remarks: 220,
  name: 320,
  value: 160,
  accCode: 100,
  detailAcc: 110,
  accName: 150,
  debit: 110,
  credit: 110,
  localDebit: 120,
  localCredit: 120,
  statement: 260,
  costCenter: 130,
  subLedger2: 130,
  // orgAppSessions/orgDbSessions only — a status badge plus a Revoke/
  // Terminate button share this cell (noRowActions:true contexts render
  // the action as ordinary cell content, see renderers.js's
  // orgSessionStateCell), so it needs more room than the 130px default.
  state: 220,
}

export function responsiveDataListColumns(context, width, listState) {
  const config = DATA_LIST_CONFIG[context]
  const columns = listState.columnOrder
    .map(key => config.columns.find(column => column.key === key))
    .filter(column => column && !listState.hiddenColumns.has(column.key))
  const available = Math.max(80, width - 42 - 76 - 2)
  const visible = []
  let used = 0
  for (const [index, column] of columns.entries()) {
    const columnWidth = DATA_LIST_RESPONSIVE_WIDTH[column.key] || 130
    if (index > 0 && used + columnWidth > available) break
    visible.push(column)
    used += columnWidth
  }
  const visibleKeys = new Set(visible.map(column => column.key))
  return {
    visible,
    overflow: columns.filter(column => !visibleKeys.has(column.key)),
  }
}
