// Shared data-list model — extracted from concepts/app/legacy-app.js as
// part of Task 5. Reconstructs the filter/sort/group/column/pagination/
// layout slice of the original `dataListState` global (baseline range
// .baseline/concepts/app-shell.html:21383-21451) as a self-contained
// factory, `createListModel({config, rows, storage})`, per the brief's
// declared contract — not a byte-for-byte port of the whole original state
// blob, which also carried chart/DOM fields (`canvas`, `resizeObserver`,
// `chartVisible`, `chartExpanded`, ...) that belong to a future chart
// component, out of this task's scope. legacy-app.js's own `dataListState`
// continues to drive the live prototype DOM (full page extraction is
// Task 7); its per-context entries are built by calling createListModel
// once per DATA_LIST_CONFIG context and threading the model's `state`
// through the same render functions that used to index the global.
//
// dataListRows(context)'s filter/sort algorithm (baseline
// .baseline/concepts/app-shell.html:22087-22134) is reconstructed verbatim
// here as `rowsInView()`, reading `config`/`rows`/`state` from the factory's
// own closure instead of `DATA_LIST_CONFIG[context]`/`dataListState[context]`
// globals — the exact "pass the model's state explicitly" substitution the
// brief calls out; the filter/sort logic itself is unchanged.
//
// saveLayout/resetLayout reconstruct the STATE + STORAGE half of the
// original saveDataListLayout/resetDataListLayout (baseline
// .baseline/concepts/app-shell.html — legacy-app.js's current line ~8449/
// ~8483): the same field reconciliation, minus the DOM/toast side effects
// (`renderDataList(context)`, `toast({...})`) that only make sense wired to
// a live page — those stay in legacy-app.js's own saveDataListLayout/
// resetDataListLayout wrappers, which call the model's methods and then
// layer the toast+render on top, exactly like createLocale/createToast's
// existing "pure facility, DOM orchestration stays at the call site"
// split from Task 4.
//
// `storage` is an injected dependency implementing 4 methods
// (loadLayout/saveLayout/loadCustomFilters/saveCustomFilters) — see
// this module's own localStorageDataListStorage() for the
// localStorage-backed implementation (unchanged key strings
// `skey:data-list-layout:${context}` / `skey:data-list-custom-filters:
// ${context}`, moved verbatim from baseline 21277-21360) and
// tests/support/storage.mjs's memoryLayoutStorage() for the in-memory
// test double.

import {DATA_LIST_STATISTICS_CONCEPT_OPTIONS} from './columns.js'
import {rowMatchesFieldFilter} from './filters.js'

/**
 * @typedef {Object} ListModelState
 * @property {unknown[]} sourceRows
 * @property {unknown[]} baseRows Unfiltered rows a filter reset returns to; tracks setRows for dynamic contexts.
 * @property {Set<string|number>} selected
 * @property {Set<string>} hiddenColumns
 * @property {Set<string>} savedHiddenColumns
 * @property {string[]} groupBy
 * @property {string[]} savedGroupBy
 * @property {Set<string>} collapsedGroups
 * @property {Set<string|number>} expandedRows
 * @property {string} search
 * @property {string} filter
 * @property {string} filterMode
 * @property {string} sortKey
 * @property {'asc'|'desc'} sortDirection
 * @property {number} page
 * @property {number} pageSize
 * @property {string} view
 * @property {string} savedView
 * @property {boolean} advanced
 * @property {unknown[]} fieldFilters
 * @property {unknown[]} customFilters
 * @property {string} activeCustomFilterId
 * @property {string} borderMode
 * @property {Set<string>} frozenColumns
 * @property {string[]} columnOrder
 * @property {string[]} savedColumnOrder
 * @property {boolean} layoutDirty
 * @property {boolean} statisticsVisible
 * @property {boolean} savedStatisticsVisible
 * @property {string} statisticsConcept
 * @property {string} savedStatisticsConcept
 */

/**
 * @typedef {Object} ListModelStorage
 * @property {(context: string) => unknown} loadLayout
 * @property {(context: string, layout: unknown | null) => boolean} saveLayout
 * @property {(context: string) => unknown[]} loadCustomFilters
 * @property {(context: string, filters: unknown[]) => boolean} saveCustomFilters
 */

export const DATA_LIST_VALID_VIEWS = {
  invoice: ['list', 'responsive', 'adaptive', 'cards', 'kanban'],
  customer: ['list', 'responsive', 'adaptive', 'cards'],
  geo: ['list', 'responsive', 'adaptive', 'cards'],
  // List only: no per-row detail record to open, so Adaptive/Cards/Kanban
  // (all of which drill into one row) have nothing to show.
  screenParameters: ['list'],
  journal: ['list'],
  orgUsers: ['list'],
  orgAppSessions: ['list'],
  orgDbSessions: ['list'],
  orgAudit: ['list'],
  orgStaff: ['list'],
}

/* Pagination contract: the mocked row arrays only hold a handful of sample
   records, but the record-navigator pager elsewhere in the UI already claims
   a simulated dataset size ("Record 1 of 125" etc). List-level pagination
   must agree with that same simulated total so the two counters never
   contradict each other. */
export const DATA_LIST_SIMULATED_TOTAL = {invoice: 125, customer: 72, geo: 12, screenParameters: 57, journal: 4}
export const DATA_LIST_DEFAULT_PAGE_SIZE = 25
export const DATA_LIST_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

/**
 * Resolves the persisted layout for `context` against `defaultOrder`,
 * shaping storage's raw (possibly absent/malformed) value into a complete
 * layout with every field defaulted — same reconciliation
 * savedDataListLayout() always did, now reading through the injected
 * `storage.loadLayout` instead of localStorage directly.
 * @param {ListModelStorage} storage
 * @param {string} context
 * @param {string[]} defaultOrder
 */
function resolveSavedLayout(storage, context, defaultOrder) {
  const fallback = {
    columnOrder: defaultOrder,
    hiddenColumns: [],
    groupBy: [],
    view: 'list',
    statisticsVisible: true,
    statisticsConcept: '',
  }
  const stored = storage.loadLayout(context)
  const storedOrder = Array.isArray(stored) ? stored : stored?.columnOrder
  if (!Array.isArray(storedOrder)) return fallback
  const retainedOrder = storedOrder.filter(
    (columnKey, index, keys) =>
      defaultOrder.includes(columnKey) && keys.indexOf(columnKey) === index
  )
  const columnOrder = [
    ...retainedOrder,
    ...defaultOrder.filter(columnKey => !retainedOrder.includes(columnKey)),
  ]
  const statisticsConcept = DATA_LIST_STATISTICS_CONCEPT_OPTIONS.some(
    option => option.key === stored?.statisticsConcept
  )
    ? stored.statisticsConcept
    : ''
  return {
    columnOrder,
    hiddenColumns: Array.isArray(stored?.hiddenColumns) ? stored.hiddenColumns : [],
    groupBy: Array.isArray(stored?.groupBy) ? stored.groupBy : [],
    view: typeof stored?.view === 'string' ? stored.view : 'list',
    statisticsVisible:
      typeof stored?.statisticsVisible === 'boolean' ? stored.statisticsVisible : true,
    statisticsConcept,
  }
}

/**
 * Builds the initial per-context list state — same field set and defaulting
 * rules as the original dataListState initializer (baseline
 * .baseline/concepts/app-shell.html:21392-21451), minus the chart/DOM-only
 * fields (canvas, resizeObserver, chartVisible, chartExpanded, chartField,
 * chartYField, chartType, responsiveWidth, responsiveSignature) that belong
 * to a future chart component, out of this task's scope.
 * @param {{key: string, columns: {key: string}[]}} config
 * @param {unknown[]} rows
 * @param {ListModelStorage} storage
 * @param {string} context
 */
function createInitialState(config, rows, storage, context) {
  const defaultOrder = config.columns.map(column => column.key)
  const saved = resolveSavedLayout(storage, context, defaultOrder)
  const savedView = (DATA_LIST_VALID_VIEWS[context] || ['list']).includes(saved.view)
    ? saved.view
    : 'list'
  const savedHiddenColumns = saved.hiddenColumns.filter(columnKey => defaultOrder.includes(columnKey))
  const savedGroupBy = saved.groupBy.filter(
    (columnKey, index, keys) => defaultOrder.includes(columnKey) && keys.indexOf(columnKey) === index
  )
  // A plain reference table (config.noRowActions) has no numeric/plottable
  // columns to summarize, so its statistics panel starts hidden rather
  // than showing an empty row of cards — same rule everywhere this flag
  // applies (views.js/list.js's row-chrome suppression).
  const statisticsVisible = config.noRowActions ? false : saved.statisticsVisible
  return {
    sourceRows: rows,
    baseRows: rows,
    selected: new Set(),
    hiddenColumns: new Set(savedHiddenColumns),
    savedHiddenColumns: new Set(savedHiddenColumns),
    groupBy: [...savedGroupBy],
    savedGroupBy: [...savedGroupBy],
    collapsedGroups: new Set(),
    expandedRows: new Set(),
    search: '',
    filter: 'all',
    filterMode: 'inline',
    // config.defaultSortKey lets a context sort by something other than
    // its row-identity key on first load (e.g. orgAudit sorts by
    // timestamp desc, newest first, rather than alphabetically by id) —
    // every existing context omits it and keeps sorting by config.key,
    // unchanged from before this field existed.
    sortKey: config.defaultSortKey || config.key,
    sortDirection: config.defaultSortDirection || 'asc',
    page: 1,
    pageSize: DATA_LIST_DEFAULT_PAGE_SIZE,
    view: savedView,
    savedView,
    advanced: false,
    fieldFilters: [],
    customFilters: storage.loadCustomFilters(context),
    activeCustomFilterId: '',
    borderMode: 'default',
    frozenColumns: new Set(),
    columnOrder: [...saved.columnOrder],
    savedColumnOrder: [...saved.columnOrder],
    layoutDirty: false,
    statisticsVisible,
    savedStatisticsVisible: statisticsVisible,
    statisticsConcept: saved.statisticsConcept,
    savedStatisticsConcept: saved.statisticsConcept,
  }
}

/**
 * @param {{
 *   config: {key: string, columns: {key: string}[], filterFields: unknown[]},
 *   rows: unknown[],
 *   storage: ListModelStorage,
 *   context?: string,
 * }} params `context` is the DATA_LIST_CONFIG key this model instance is
 *   for ('invoice' | 'customer' | 'geo' in the current config), used to
 *   scope storage lookups and the filter/valid-view rules that originally
 *   switched on `context` inside dataListRows()/the dataListState
 *   initializer. Not inferable from `config` alone (`config.key` is the
 *   *sort* key field, e.g. 'no'/'customerNo'/'code' — a different thing);
 *   defaults to `config.singular` (every DATA_LIST_CONFIG entry's singular
 *   name already equals its context key: 'invoice'/'customer'/'geo'), but
 *   callers may pass a context explicitly when using a config shape that
 *   doesn't follow that convention (as the empty-filter test in the brief
 *   does not — it passes customerConfig without an explicit context and
 *   relies on this default).
 * @returns {{
 *   state: ListModelState,
 *   rowsInView(): unknown[],
 *   saveLayout(): boolean,
 *   resetLayout(): void,
 * }}
 */
export function createListModel({config, rows, storage, context = config.singular}) {
  const state = createInitialState(config, rows, storage, context)

  // rowsInView() reconstructs dataListRows(context)'s exact filter/sort
  // algorithm (baseline 22087-22134), reading `config`/`state` from this
  // factory's closure instead of DATA_LIST_CONFIG[context]/
  // dataListState[context] globals.
  function rowsInView() {
    const query = state.search.trim().toLowerCase()
    let filteredRows = state.sourceRows.filter(row => {
      if (
        query &&
        !config.columns.some(column =>
          String(row[column.key] ?? '')
            .toLowerCase()
            .includes(query)
        )
      )
        return false
      if (context === 'customer') {
        if (state.filter === 'active' && !row.active) return false
        if (state.filter === 'inactive' && row.active) return false
        if (state.filter === 'retail' && row.customerType !== 'Retail') return false
      }
      if (context === 'invoice') {
        if (state.filter === 'cash' && row.pay !== 'Cash') return false
        if (state.filter === 'credit' && row.pay !== 'Credit') return false
      }
      if (context === 'geo') {
        if (state.filter === 'active' && !row.active) return false
        if (state.filter === 'inactive' && row.active) return false
        if (state.filter === 'root' && row.parentCode) return false
      }
      return state.fieldFilters.every(filter =>
        rowMatchesFieldFilter(row, filter, config.filterFields.find(field => field.key === filter.key))
      )
    })
    const direction = state.sortDirection === 'asc' ? 1 : -1
    filteredRows = [...filteredRows].sort(
      (a, b) =>
        String(a[state.sortKey] ?? '').localeCompare(String(b[state.sortKey] ?? ''), undefined, {
          numeric: true,
          sensitivity: 'base',
        }) * direction
    )
    return filteredRows
  }

  // Pure state+storage half of saveDataListLayout (baseline range around
  // .baseline/concepts/app-shell.html — see legacy-app.js's current
  // saveDataListLayout, which calls this then layers toast+render on top).
  function saveLayout() {
    const layout = {
      columnOrder: state.columnOrder,
      hiddenColumns: [...state.hiddenColumns],
      groupBy: state.groupBy,
      view: state.view,
      statisticsVisible: state.statisticsVisible,
      statisticsConcept: state.statisticsConcept,
    }
    if (!storage.saveLayout(context, layout)) return false
    state.savedColumnOrder = [...state.columnOrder]
    state.savedHiddenColumns = new Set(state.hiddenColumns)
    state.savedGroupBy = [...state.groupBy]
    state.savedView = state.view
    state.savedStatisticsVisible = state.statisticsVisible
    state.savedStatisticsConcept = state.statisticsConcept
    state.layoutDirty = false
    return true
  }

  // Pure state+storage half of resetDataListLayout — restores the same
  // hard-coded defaults the original used, and clears the persisted layout
  // (storage.saveLayout(context, null), mirroring the original's
  // localStorage.removeItem call).
  function resetLayout() {
    state.columnOrder = config.columns.map(column => column.key)
    state.savedColumnOrder = [...state.columnOrder]
    state.hiddenColumns.clear()
    state.savedHiddenColumns.clear()
    state.frozenColumns.clear()
    state.groupBy = []
    state.savedGroupBy = []
    state.collapsedGroups.clear()
    state.expandedRows.clear()
    state.borderMode = 'default'
    state.view = 'list'
    state.savedView = 'list'
    state.statisticsVisible = true
    state.savedStatisticsVisible = true
    state.statisticsConcept = ''
    state.savedStatisticsConcept = ''
    state.page = 1
    state.layoutDirty = false
    storage.saveLayout(context, null)
  }

  // Swaps this model's row source in place — for contexts whose data is
  // role-scoped or mutates at runtime (e.g. Organization Center's tables),
  // unlike every static-fixture context (invoice/customer/geo/
  // screenParameters/journal) which never calls this. Resets to page 1
  // since the previous page may no longer exist against the new row count.
  function setRows(nextRows) {
    state.sourceRows = nextRows
    state.baseRows = nextRows
    state.page = 1
  }

  return {state, rowsInView, saveLayout, resetLayout, setRows}
}

/**
 * localStorage-backed implementation of the model's 4-method storage
 * contract — moved verbatim (unchanged key strings and fallback/try-catch
 * behavior) from baseline .baseline/concepts/app-shell.html:21277-21360
 * (savedDataListLayout/persistDataListLayout/loadCustomFilters/
 * persistCustomFilters). legacy-app.js wires this in for the live
 * prototype; tests use tests/support/storage.mjs's memoryLayoutStorage()
 * instead.
 * @returns {ListModelStorage}
 */
export function localStorageDataListStorage() {
  return {
    loadLayout(context) {
      try {
        return JSON.parse(localStorage.getItem(`skey:data-list-layout:${context}`) || 'null')
      } catch (error) {
        if (error instanceof SyntaxError || error instanceof DOMException) return null
        throw error
      }
    },
    saveLayout(context, layout) {
      try {
        if (layout == null) {
          localStorage.removeItem(`skey:data-list-layout:${context}`)
          return true
        }
        localStorage.setItem(`skey:data-list-layout:${context}`, JSON.stringify(layout))
        return true
      } catch (error) {
        if (error instanceof DOMException) return false
        throw error
      }
    },
    loadCustomFilters(context) {
      try {
        const stored = JSON.parse(
          localStorage.getItem(`skey:data-list-custom-filters:${context}`) || '[]'
        )
        return Array.isArray(stored) ? stored.filter(item => item && typeof item.id === 'string') : []
      } catch (error) {
        if (error instanceof SyntaxError || error instanceof DOMException) return []
        throw error
      }
    },
    saveCustomFilters(context, filters) {
      try {
        localStorage.setItem(`skey:data-list-custom-filters:${context}`, JSON.stringify(filters))
        return true
      } catch (error) {
        if (error instanceof DOMException) return false
        throw error
      }
    },
  }
}
