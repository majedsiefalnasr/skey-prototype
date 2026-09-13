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

export const DATA_LIST_CONFIG = {
  invoice: {
    label: 'invoices',
    singular: 'invoice',
    key: 'no',
    rows: LIST_ROWS,
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
