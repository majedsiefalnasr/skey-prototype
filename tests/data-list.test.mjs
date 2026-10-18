// Table-driven tests for the shared data-list model extracted in Task 5
// (concepts/app/components/data-list/{model,filters,columns,pagination}.js)
// and the invoice/customer/geo fixtures moved out of legacy-app.js into
// concepts/app/prototype/fixtures/{invoices,customers,geography}.js.
//
// These exercise createListModel/dateFilterRange/rowMatchesFieldFilter/
// responsiveDataListColumns against the SAME representative row data and
// DATA_LIST_CONFIG entries the prototype has always used (imported from
// their new homes, not reinvented), per the task-5 brief's instruction to
// keep the same representative values (list totals are the real row counts). Behavior only —
// no assertions on private call counts or internal implementation shape.

import test from 'node:test';
import assert from 'node:assert/strict';
import * as modelModule from '../concepts/app/components/data-list/model.js';
import {renderShellPager} from '../concepts/app/components/data-list/pagination.js';
import {dateFilterRange, rowMatchesFieldFilter} from '../concepts/app/components/data-list/filters.js';
import {responsiveDataListColumns, DATA_LIST_CONFIG} from '../concepts/app/components/data-list/columns.js';
import {compactStatisticValue, renderDataListStatistics} from '../concepts/app/components/data-list/statistics.js';
import {customerConfig} from '../concepts/app/pages/customers/customers.js';
import {LIST_ROWS} from '../concepts/app/prototype/fixtures/invoices.js';
import {CUSTOMER_ROWS} from '../concepts/app/prototype/fixtures/customers.js';
import {GEO_ROWS} from '../concepts/app/prototype/fixtures/geography.js';
import {memoryLayoutStorage} from './support/storage.mjs';
import {deleteDataListRecords} from '../concepts/app/components/data-list/actions.js';

const {createListModel, DATA_LIST_PAGE_SIZE_OPTIONS} = modelModule;
const invoiceConfig = DATA_LIST_CONFIG.invoice;
const geoConfig = DATA_LIST_CONFIG.geo;

test('deleting an invoice keeps locked rows and later creations visible in the list model', () => {
  const rows = [
    {no: '1', status: 'Posted'}, {no: '2', status: 'Open'}, {no: '3', status: 'Canceled'},
  ];
  const config = {...invoiceConfig, rows};
  const model = createListModel({config, rows, storage: memoryLayoutStorage(), context: 'invoice'});
  deleteDataListRecords('invoice', ['1', '2', '3'], config, model.state,
    {rerender() {}, toast() {}});
  assert.deepEqual(model.rowsInView().map(row => row.no).sort(), ['1', '3']);
  rows.unshift({no: '4', status: 'Open'});
  assert.deepEqual(model.rowsInView().map(row => row.no).sort(), ['1', '3', '4']);
});

// ---------------------------------------------------------------------
// dateFilterRange / rowMatchesFieldFilter — contains vs exact date filters
// ---------------------------------------------------------------------

test('dateFilterRange resolves a "specific" date preset to a single-day range', () => {
  // Invoice 140's date field, an actual LIST_ROWS value (not invented).
  const row = LIST_ROWS.find(item => item.no === '140');
  assert.equal(row.date, '13/08/2026');
  const range = dateFilterRange({value: 'specific:2026-08-13'});
  assert.equal(range.from.getTime(), new Date(2026, 7, 13).getTime());
  assert.equal(range.to.getTime(), new Date(2026, 7, 13).getTime());
});

test('dateFilterRange resolves a "range" preset to an inclusive from/to span, normalizing reversed order', () => {
  const forward = dateFilterRange({value: 'range:2026-08-13:2026-08-16'});
  const reversed = dateFilterRange({value: 'range:2026-08-16:2026-08-13'});
  assert.equal(forward.from.getTime(), new Date(2026, 7, 13).getTime());
  assert.equal(forward.to.getTime(), new Date(2026, 7, 16).getTime());
  assert.deepEqual(
    [reversed.from.getTime(), reversed.to.getTime()],
    [forward.from.getTime(), forward.to.getTime()]
  );
});

test('dateFilterRange returns null for an incomplete range (only one bound given)', () => {
  assert.equal(dateFilterRange({value: 'range:2026-08-13:'}), null);
});

test('rowMatchesFieldFilter: exact ("equals") match on invoice doc date', () => {
  const row = LIST_ROWS.find(item => item.no === '143');
  assert.equal(row.date, '13/08/2026');
  const field = invoiceConfig.filterFields.find(item => item.key === 'date');
  const matchingFilter = {key: 'date', value: 'specific:2026-08-13'};
  const nonMatchingFilter = {key: 'date', value: 'specific:2026-08-14'};
  assert.equal(rowMatchesFieldFilter(row, matchingFilter, field), true);
  assert.equal(rowMatchesFieldFilter(row, nonMatchingFilter, field), false);
});

test('rowMatchesFieldFilter: "contains" text match on customer name (default operator)', () => {
  const field = invoiceConfig.filterFields.find(item => item.key === 'custName');
  const row = LIST_ROWS.find(item => item.no === '140');
  assert.equal(row.custName, 'العميل الاول');
  assert.equal(rowMatchesFieldFilter(row, {key: 'custName', value: 'العميل'}, field), true);
  assert.equal(rowMatchesFieldFilter(row, {key: 'custName', value: 'zzz-no-match'}, field), false);
});

test('rowMatchesFieldFilter: "equals" operator requires an exact (case-insensitive) match', () => {
  const field = invoiceConfig.filterFields.find(item => item.key === 'custName');
  const row = LIST_ROWS.find(item => item.no === '143');
  assert.equal(row.custName, 'customertest');
  assert.equal(
    rowMatchesFieldFilter(row, {key: 'custName', value: 'customertest', operator: 'equals'}, field),
    true
  );
  assert.equal(
    rowMatchesFieldFilter(row, {key: 'custName', value: 'customer', operator: 'equals'}, field),
    false
  );
});

// ---------------------------------------------------------------------
// createListModel — search / sort / grouping / pagination over real rows
// ---------------------------------------------------------------------

test('createListModel default state: fresh defaults with no saved layout', () => {
  const model = createListModel({config: invoiceConfig, rows: LIST_ROWS, storage: memoryLayoutStorage()});
  assert.deepEqual(model.state.columnOrder, invoiceConfig.columns.map(column => column.key));
  assert.equal(model.state.sortKey, invoiceConfig.key); // 'no'
  assert.equal(model.state.sortDirection, 'asc');
  assert.equal(model.state.page, 1);
  assert.equal(model.state.pageSize, 25);
  assert.deepEqual(model.state.groupBy, []);
  assert.deepEqual([...model.state.hiddenColumns], []);
});

test('createListModel: unfiltered rowsInView returns every source row, sorted by the default sort key', () => {
  const model = createListModel({config: invoiceConfig, rows: LIST_ROWS, storage: memoryLayoutStorage()});
  const rows = model.rowsInView();
  assert.equal(rows.length, LIST_ROWS.length);
  // Default sortKey is invoiceConfig.key ('no'), ascending, numeric-aware —
  // same localeCompare(..., {numeric:true}) the original dataListRows used.
  const expectedOrder = [...LIST_ROWS].sort((a, b) =>
    String(a.no).localeCompare(String(b.no), undefined, {numeric: true, sensitivity: 'base'})
  );
  assert.deepEqual(rows.map(row => row.no), expectedOrder.map(row => row.no));
});

test('createListModel: search narrows rowsInView to rows containing the query in a visible column', () => {
  const model = createListModel({config: invoiceConfig, rows: LIST_ROWS, storage: memoryLayoutStorage()});
  model.state.search = 'customertest';
  const rows = model.rowsInView();
  assert.ok(rows.length > 0);
  assert.ok(rows.every(row => row.custName === 'customertest'));
});

test('createListModel: sortKey/sortDirection reorders rowsInView (descending total)', () => {
  const model = createListModel({config: invoiceConfig, rows: LIST_ROWS, storage: memoryLayoutStorage()});
  model.state.sortKey = 'total';
  model.state.sortDirection = 'desc';
  const rows = model.rowsInView();
  const totals = rows.map(row => row.total);
  const expected = [...totals].sort((a, b) =>
    String(b).localeCompare(String(a), undefined, {numeric: true, sensitivity: 'base'})
  );
  assert.deepEqual(totals, expected);
});

test('createListModel: groupBy is preserved verbatim in state (grouping selection, not tree rendering)', () => {
  const model = createListModel({config: invoiceConfig, rows: LIST_ROWS, storage: memoryLayoutStorage()});
  assert.deepEqual(model.state.groupBy, []);
  model.state.groupBy = ['status'];
  assert.deepEqual(model.state.groupBy, ['status']);
  // rowsInView() is unaffected by groupBy — grouping is a display-tree
  // concern layered on top of the filtered/sorted row list, same as the
  // original dataListRows()/renderDataListGroupedBody() split.
  assert.equal(model.rowsInView().length, LIST_ROWS.length);
});

test('createListModel: hiddenColumns + responsiveDataListColumns visible-column selection at a real geo-list width', () => {
  const model = createListModel({config: geoConfig, rows: GEO_ROWS, storage: memoryLayoutStorage()});
  model.state.hiddenColumns = new Set(['remarks']);
  const {visible, overflow} = responsiveDataListColumns('geo', 900, model.state);
  assert.ok(!visible.some(column => column.key === 'remarks'));
  assert.ok(!overflow.some(column => column.key === 'remarks'));
  assert.ok(visible.length + overflow.length === geoConfig.columns.length - 1);
});

test('responsiveDataListColumns: a narrow width overflows the columns that do not fit', () => {
  const model = createListModel({config: geoConfig, rows: GEO_ROWS, storage: memoryLayoutStorage()});
  const {visible, overflow} = responsiveDataListColumns('geo', 320, model.state);
  assert.ok(visible.length >= 1, 'the first column is always kept regardless of width');
  assert.ok(overflow.length > 0, 'a 320px width is too narrow for every geo column');
});

test('createListModel: saveLayout persists columnOrder/hiddenColumns/groupBy through storage, resetLayout restores defaults', () => {
  const storage = memoryLayoutStorage();
  const model = createListModel({config: invoiceConfig, rows: LIST_ROWS, storage});
  model.state.hiddenColumns = new Set(['warehouse']);
  model.state.groupBy = ['status'];
  model.saveLayout();
  assert.deepEqual(storage.loadLayout('invoice').hiddenColumns, ['warehouse']);
  assert.deepEqual(storage.loadLayout('invoice').groupBy, ['status']);

  // A second model instance for the same context/storage picks up the saved
  // layout as ITS defaults — same restore-on-load behavior as the original
  // savedDataListLayout()/dataListState initializer.
  const restored = createListModel({config: invoiceConfig, rows: LIST_ROWS, storage});
  assert.deepEqual([...restored.state.hiddenColumns], ['warehouse']);
  assert.deepEqual(restored.state.groupBy, ['status']);

  model.resetLayout();
  assert.deepEqual([...model.state.hiddenColumns], []);
  assert.deepEqual(model.state.groupBy, []);
  assert.equal(storage.loadLayout('invoice'), null);
});

test('createListModel: pagination page count follows the real row count (no simulated total)', () => {
  // INV-11 / ledger #9: the pager reports real rows only, so the page count
  // is derived from the rows the model holds, never from a simulated dataset size.
  assert.equal('DATA_LIST_SIMULATED_TOTAL' in modelModule, false);
  assert.deepEqual(DATA_LIST_PAGE_SIZE_OPTIONS, [10, 25, 50, 100]);
  const model = createListModel({config: invoiceConfig, rows: LIST_ROWS, storage: memoryLayoutStorage()});
  const totalPages = Math.max(1, Math.ceil(model.rowsInView().length / model.state.pageSize));
  assert.equal(totalPages, 1);

  const pager = renderShellPager('invoice', LIST_ROWS.length, model.state, {
    t: (key, fallback) => fallback ?? key,
    encodeHtml: String,
    dataListIcon: () => '',
  });
  assert.match(pager, new RegExp(`Showing 1–${LIST_ROWS.length} of ${LIST_ROWS.length}</span>`));
  assert.equal(pager.match(/data-pagination-page /g).length, 1);
});

test('renderShellPager: a row count above the page size adds a page and splits the range', () => {
  const deps = {t: (key, fallback) => fallback ?? key, encodeHtml: String, dataListIcon: () => ''};
  const pageButtons = html => html.match(/data-pagination-page /g).length;
  const first = renderShellPager('invoice', 26, {pageSize: 25, page: 1}, deps);
  assert.equal(pageButtons(first), 2);
  assert.match(first, /Showing 1–25 of 26<\/span>/);
  const second = renderShellPager('invoice', 26, {pageSize: 25, page: 2}, deps);
  assert.equal(pageButtons(second), 2);
  assert.match(second, /Showing 26–26 of 26<\/span>/);
});

// ---------------------------------------------------------------------
// Empty-filter case — exact case from the task-5 brief, verbatim.
// ---------------------------------------------------------------------

test('an unmatched customer search produces no visible rows', () => {
  const model = createListModel({config: customerConfig, rows: CUSTOMER_ROWS,
    storage: memoryLayoutStorage()});
  model.state.search = '__no_customer_matches_this__';
  assert.deepEqual(model.rowsInView(), []);
});

test('every statistics card style compacts long quantitative values', () => {
  const metric = {
    label: 'Gross value',
    value: 'EGP 15,300.00',
    support: 'Across 15,300 invoices in fiscal year 2026',
    icon: 'i-grid',
    tone: 'neutral',
    progress: 100,
    operation: 'Review invoice value distribution',
    benchmark: 'Average EGP 1,913',
    trend: [42, 49, 47, 58, 71, 78],
    trendLabel: 'Six-period value pattern',
    trendTone: 'neutral',
  };
  const render = layout => renderDataListStatistics({
    rows: [{}],
    config: {label: 'invoices'},
    layout,
    statisticsFn: () => [metric],
    deps: {
      t: value => value,
      encodeHtml: value => String(value),
      dataListIcon: icon => `<svg data-icon="${icon}"></svg>`,
      locale: {getLocale: () => 'en'},
    },
  });

  for (const layout of ['balanced', 'operational', 'exceptions', 'analytical']) {
    const html = render(layout);
    assert.match(html, />EGP 15\.3K</, `${layout} should compact its primary value`);
    assert.match(html, /title="EGP 15,300\.00"/, `${layout} should retain the exact value`);
  }

  const balanced = render('balanced');
  assert.match(balanced, /Across 15\.3K invoices in fiscal year 2026/);

  const analytical = render('analytical');
  assert.match(analytical, /data-stat-sparkline-grid/);
  assert.match(analytical, /data-stat-sparkline-point/);
  assert.equal(compactStatisticValue('15,000'), '15K');
  assert.equal(compactStatisticValue('1,250,000'), '1.25M');
  assert.equal(compactStatisticValue('37%'), '37%');
});
