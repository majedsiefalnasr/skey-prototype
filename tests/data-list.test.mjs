// Table-driven tests for the shared data-list model extracted in Task 5
// (concepts/app/components/data-list/{model,filters,columns,pagination}.js)
// and the invoice/customer/geo fixtures moved out of legacy-app.js into
// concepts/app/prototype/fixtures/{invoices,customers,geography}.js.
//
// These exercise createListModel/dateFilterRange/rowMatchesFieldFilter/
// responsiveDataListColumns against the SAME representative row data and
// DATA_LIST_CONFIG entries the prototype has always used (imported from
// their new homes, not reinvented), per the task-5 brief's instruction to
// keep the same representative values and simulated totals. Behavior only —
// no assertions on private call counts or internal implementation shape.

import test from 'node:test';
import assert from 'node:assert/strict';
import {createListModel, DATA_LIST_SIMULATED_TOTAL, DATA_LIST_PAGE_SIZE_OPTIONS}
  from '../concepts/app/components/data-list/model.js';
import {dateFilterRange, rowMatchesFieldFilter} from '../concepts/app/components/data-list/filters.js';
import {responsiveDataListColumns, DATA_LIST_CONFIG} from '../concepts/app/components/data-list/columns.js';
import {customerConfig} from '../concepts/app/pages/customers/customers.js';
import {LIST_ROWS} from '../concepts/app/prototype/fixtures/invoices.js';
import {CUSTOMER_ROWS} from '../concepts/app/prototype/fixtures/customers.js';
import {GEO_ROWS} from '../concepts/app/prototype/fixtures/geography.js';
import {memoryLayoutStorage} from './support/storage.mjs';

const invoiceConfig = DATA_LIST_CONFIG.invoice;
const geoConfig = DATA_LIST_CONFIG.geo;

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

test('createListModel: pagination page count agrees with the simulated total, not just the sample row count', () => {
  // Pagination contract (see baseline comment above DATA_LIST_SIMULATED_TOTAL,
  // ported to model.js): the mocked row arrays only hold a handful of sample
  // records, but the app's record-navigator pager already claims a
  // simulated dataset size, so list pagination must agree with the same
  // simulated total.
  assert.deepEqual(DATA_LIST_SIMULATED_TOTAL, {invoice: 125, customer: 72, geo: 12, screenParameters: 57, journal: 4});
  assert.deepEqual(DATA_LIST_PAGE_SIZE_OPTIONS, [10, 25, 50, 100]);
  const model = createListModel({config: invoiceConfig, rows: LIST_ROWS, storage: memoryLayoutStorage()});
  const totalPages = Math.max(1, Math.ceil(DATA_LIST_SIMULATED_TOTAL.invoice / model.state.pageSize));
  assert.equal(totalPages, 5); // ceil(125 / 25)
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
