// Data-list orchestrator (renderDataList/wireDataList) and toolbar/filter-
// editor renderers — moved out of concepts/app/legacy-app.js as part of
// Task 6, plus the `createDataList` factory the brief names as this
// component's public surface.
//
// Scope note (see task-6-report.md for the full history): renderDataList
// and wireDataList are the two orchestrators that assemble every other
// already-extracted piece (statistics.js, charts.js, views.js, menus.js)
// plus a handful of pieces that are genuinely still page-owned — the
// custom-filter/export dialogs, the Kanban board/drag-drop policy, and
// quick-view — because they reach page-level singleton DOM (#save-filter-
// scrim, #geo-filter-scrim, #data-export-scrim) or hardcode invoice-only
// fields with no config-declared generalization to lean on (see checkpoint
// 3's Kanban note). Those stay callbacks supplied through `deps`, exactly
// like views.js/menus.js's presentation `deps` bundle — this module never
// imports a customer/invoice controller directly.
//
// createDataList({context,root,footer,config,rows,locale,actions,storage})
// is the brief's required public factory. Per the report's lowest-risk
// continuation plan, it builds and OWNS what used to be the global,
// context-keyed dataListState[context]/dataListModels[context] pair as an
// internal `listState`/`model` pair private to this instance's closure —
// legacy-app.js's ~150 external call sites that still read
// `dataListState[context]` keep working because legacy-app.js populates
// that global FROM each instance's `getState()` at construction time (see
// legacy-app.js's own createDataList call sites), rather than this module
// re-introducing a global itself.

import {createListModel} from './model.js'
import {createListChart} from './charts.js'

/**
 * @param {object} config
 * @param {object} listState
 */
export function renderDataListFilterButtons(config, listState, deps) {
  const {t, dataListIcon, encodeHtml} = deps
  const builtIn = config.filters
    .map(
      filter =>
        `<button type="button" role="menuitemradio" data-list-filter="${encodeHtml(filter.key)}" aria-checked="${filter.key === listState.filter && !listState.activeCustomFilterId}">${dataListIcon(filter.icon)}<span>${encodeHtml(t(filter.label))}</span>${filter.key === listState.filter && !listState.activeCustomFilterId ? dataListIcon('i-check', 13) : ''}</button>`
    )
    .join('')
  if (!listState.customFilters.length) return builtIn
  const customButtons = listState.customFilters
    .map(custom => {
      const active = custom.id === listState.activeCustomFilterId
      return `<button type="button" role="menuitemradio" data-list-custom-filter-apply="${encodeHtml(custom.id)}" aria-checked="${active}">${dataListIcon(custom.icon || 'i-eye')}<span>${encodeHtml(custom.name)}</span>${active ? dataListIcon('i-check', 13) : ''}</button>`
    })
    .join('')
  return `${builtIn}<hr class="data-menu-separator">
    <div class="data-manage-group-label">${t('Custom filters', 'Custom filters')}</div>
    ${customButtons}<hr class="data-menu-separator">
    <button type="button" role="menuitem" data-list-manage-filters>${dataListIcon('i-sliders', 14)}<span>${t('Manage filters…', 'Manage filters…')}</span></button>`
}

export function renderDataListColumnControls(config, listState, deps) {
  const {t, encodeHtml} = deps
  return listState.columnOrder
    .map(key => config.columns.find(column => column.key === key))
    .filter(Boolean)
    .map(
      column =>
        `<label><input type="checkbox" data-list-column="${encodeHtml(column.key)}"${listState.hiddenColumns.has(column.key) ? '' : ' checked'}><span>${encodeHtml(t(column.label))}</span></label>`
    )
    .join('')
}

export function renderDataListFieldChoices(config, listState, deps) {
  const {t, dataListIcon, encodeHtml} = deps
  const activeKeys = new Set(listState.fieldFilters.map(filter => filter.key))
  const available = config.filterFields.filter(field => !activeKeys.has(field.key))
  if (!available.length)
    return `<span class="data-menu-empty">${t('All available filters are applied.', 'All available filters are applied.')}</span>`
  return available
    .map(
      field =>
        `<button type="button" role="menuitem" data-list-add-filter="${encodeHtml(field.key)}">${dataListIcon(field.icon)}<span>${encodeHtml(t(field.label))}</span></button>`
    )
    .join('')
}

export function renderDataListFilterEditor(config, filter, deps) {
  const {
    t,
    dataListIcon,
    encodeHtml,
    DATA_FILTER_OPERATORS,
    dataFilterOptionLabel,
    dataFilterOptionValue,
    dateFilterLabel,
    renderDataListDatePresetOptions,
  } = deps
  const field = config.filterFields.find(item => item.key === filter.key)
  if (!field) return ''
  const operator =
    DATA_FILTER_OPERATORS.find(item => item.key === filter.operator) || DATA_FILTER_OPERATORS[0]
  const valueLabel = field.options
    ? dataFilterOptionLabel(
        field.options.find(option => dataFilterOptionValue(option) === filter.value) ||
          filter.value
      )
    : filter.value
  const removeButton = `<button type="button" data-list-remove-field-filter="${encodeHtml(field.key)}" aria-label="${t('Remove', 'Remove')} ${encodeHtml(t(field.label))} ${t('filter', 'filter')}">${dataListIcon('i-x', 12)}</button>`
  if (field.type === 'select') {
    const options = field.options
      .map(option => {
        const optionValue = String(dataFilterOptionValue(option))
        const isSelected = optionValue === filter.value
        return `<button type="button" role="option" aria-selected="${isSelected}" data-list-filter-select-option="${encodeHtml(field.key)}" data-value="${encodeHtml(optionValue)}">${encodeHtml(String(dataFilterOptionLabel(option)))}${isSelected ? dataListIcon('i-check', 13) : ''}</button>`
      })
      .join('')
    return `<span class="data-filter-chip"><details class="data-menu data-filter-editor data-list-filter-editor" data-filter-editor-key="${encodeHtml(field.key)}"><summary>${dataListIcon(field.icon)}<strong>${encodeHtml(t(field.label))}:</strong><span class="data-filter-value">${encodeHtml(valueLabel || t('Choose value', 'Choose value'))}</span></summary><div class="data-menu-popover data-filter-select-popover" role="listbox" aria-label="${encodeHtml(t(field.label))} ${t('filter value', 'filter value')}">${options}</div></details>${removeButton}</span>`
  }
  if (field.type === 'date') {
    const chipLabel = dateFilterLabel(filter)
    return `<span class="data-filter-chip"><details class="data-menu data-filter-editor data-list-filter-editor" data-filter-editor-key="${encodeHtml(field.key)}"><summary>${dataListIcon(field.icon)}<strong>${encodeHtml(t(field.label))}:</strong><span class="data-filter-value">${encodeHtml(chipLabel)}</span></summary><div class="data-menu-popover data-filter-date-popover">${renderDataListDatePresetOptions(field, filter)}</div></details>${removeButton}</span>`
  }
  const input = `<input type="text" data-list-filter-value="${encodeHtml(field.key)}" value="${encodeHtml(filter.value)}" placeholder="${t('Enter', 'Enter')} ${encodeHtml(t(field.label).toLowerCase())}" aria-label="${encodeHtml(t(field.label))} ${t('filter value', 'filter value')}">`
  const operators = `<div class="data-filter-operators">${DATA_FILTER_OPERATORS.map(
    item =>
      `<button type="button" data-list-filter-operator="${encodeHtml(item.key)}" data-list-filter-key="${encodeHtml(field.key)}" aria-pressed="${item.key === filter.operator}">${encodeHtml(t(item.label))}</button>`
  ).join('')}</div>`
  return `<span class="data-filter-chip"><details class="data-menu data-filter-editor data-list-filter-editor" data-filter-editor-key="${encodeHtml(field.key)}"><summary>${dataListIcon(field.icon)}<strong>${encodeHtml(t(field.label))}:</strong><span class="data-filter-value">${encodeHtml(`${t(operator.label)} ${valueLabel || '…'}`)}</span></summary><div class="data-menu-popover data-filter-editor-popover">${operators}${input}</div></details>${removeButton}</span>`
}

export function renderDataListSelectionActions(context, listState, deps) {
  const {t, dataListIcon} = deps
  const selectedCount = listState.selected.size
  if (!selectedCount) return ''
  const singleRecordActions =
    selectedCount === 1
      ? `<button class="data-toolbar-button" type="button" data-list-action="display">${dataListIcon('i-eye')} ${t('Display', 'Display')}</button><button class="data-toolbar-button" type="button" data-list-action="modify">${dataListIcon('i-edit')} ${t('Modify')}</button>`
      : ''
  const statusActions = ['customer', 'geo'].includes(context)
    ? `<button class="data-toolbar-button" type="button" data-list-action="activate">${dataListIcon('i-check')} ${t('Activate')}</button><button class="data-toolbar-button" type="button" data-list-action="deactivate">${dataListIcon('i-archive')} ${t('Deactivate')}</button>`
    : ''
  const chartAction = `<button class="data-toolbar-button" type="button" data-list-action="chart" aria-pressed="${listState.chartVisible}">${dataListIcon('i-chart')} ${t('Chart', 'Chart')}</button>`
  return `${singleRecordActions}${statusActions}${chartAction}<button class="data-toolbar-button danger" type="button" data-list-action="delete">${dataListIcon('i-trash')} ${t('Delete', 'Delete')}</button>`
}

export function dataListFilterCount(listState) {
  return (
    (listState.filter !== 'all' ? 1 : 0) +
    listState.fieldFilters.length +
    (listState.advanced ? 1 : 0)
  )
}

export function dataListViewPresentation(view) {
  if (view === 'cards') return {icon: 'i-panel', label: 'Cards'}
  if (view === 'kanban') return {icon: 'i-flow', label: 'Kanban'}
  if (view === 'responsive') return {icon: 'i-panel', label: 'Compact'}
  if (view === 'adaptive') return {icon: 'i-panel', label: 'Adaptive'}
  return {icon: 'i-grid', label: 'List'}
}

export function renderDataListViewMenu(context, listState, deps) {
  const {t, dataListIcon} = deps
  const current = dataListViewPresentation(listState.view)
  const option = (view, icon, label) =>
    `<button type="button" role="menuitemradio" data-list-view="${view}" aria-checked="${listState.view === view}">${dataListIcon(icon)} ${t(label)}${listState.view === view ? dataListIcon('i-check', 13) : ''}</button>`
  return `<details class="data-menu end"><summary>${dataListIcon(current.icon)}<span class="data-toolbar-label-text">${t(current.label)}</span>${dataListIcon('i-caret', 11)}</summary><div class="data-menu-popover" role="menu">${option('list', 'i-grid', 'List view')}${option('responsive', 'i-panel', 'Compact view')}${option('adaptive', 'i-panel', 'Adaptive view')}${option('cards', 'i-panel', 'Cards view')}${context === 'invoice' ? option('kanban', 'i-flow', 'Kanban view') : ''}</div></details>`
}

export function renderDataListToolbar(context, config, listState, deps) {
  const {t, dataListIcon, encodeHtml} = deps
  const tableView = ['list', 'responsive'].includes(listState.view)
  const isAdaptive = listState.view === 'adaptive'
  const activeFilter =
    config.filters.find(filter => filter.key === listState.filter) || config.filters[0]
  const activeCustomFilter = listState.customFilters.find(
    custom => custom.id === listState.activeCustomFilterId
  )
  const filterButtons = renderDataListFilterButtons(config, listState, deps)
  const columnControls = renderDataListColumnControls(config, listState, deps)
  const isUnsaved =
    Boolean(listState.fieldFilters.length || listState.advanced) && !activeCustomFilter
  const filterEditors = listState.fieldFilters
    .map(filter => renderDataListFilterEditor(config, filter, deps))
    .join('')
  const selectedCount = listState.selected.size
  const selectionActions = renderDataListSelectionActions(context, listState, deps)
  const filterCount = dataListFilterCount(listState)
  const clearFilterButton = filterCount
    ? `<button class="data-toolbar-button" type="button" data-list-clear-filter aria-label="${t('Clear all filters', 'Clear all filters')}">${dataListIcon('i-x')} ${t('Clear filter', 'Clear filter')}</button>`
    : ''
  if (selectedCount)
    return `<div class="data-list-toolbar data-selection-toolbar" role="toolbar" aria-label="${t('Selected', 'Selected')} ${encodeHtml(config.label)} ${t('actions', 'actions')}">
      <div class="data-toolbar-cluster data-selection-actions">
        <span class="data-selection-count" aria-live="polite"><b>${selectedCount}</b> ${t('selected', 'selected')}</span>
        ${selectionActions}
      </div>
      <button class="data-toolbar-button data-clear-selection" type="button" data-list-clear-selection>${dataListIcon('i-x')} ${t('Clear selection', 'Clear selection')}</button>
    </div>
    `
  const filterCluster =
    listState.filterMode === 'modal'
      ? `<button class="data-toolbar-button" type="button" data-list-open-filters aria-haspopup="dialog">${dataListIcon('i-filter')}<span>${filterCount ? `${t('Filters', 'Filters')} (${filterCount})` : t('Filters', 'Filters')}</span></button>
      ${clearFilterButton}`
      : `<details class="data-menu"><summary>${dataListIcon(activeCustomFilter ? activeCustomFilter.icon || 'i-eye' : isUnsaved ? 'i-doc' : activeFilter.icon)}<span>${activeCustomFilter ? encodeHtml(activeCustomFilter.name) : isUnsaved ? t('Unsaved view', 'Unsaved view') : encodeHtml(t(activeFilter.label))}</span>${dataListIcon('i-caret', 11)}</summary><div class="data-menu-popover" role="menu">${filterButtons}</div></details>
      ${filterEditors}
      ${listState.advanced ? `<span class="data-filter-chip">${t('Advanced filters', 'Advanced filters')}<button type="button" data-list-clear-advanced aria-label="${t('Clear advanced filters', 'Clear advanced filters')}">${dataListIcon('i-x', 12)}</button></span>` : ''}
      <details class="data-menu"><summary>${dataListIcon('i-plus')}<span>${t('Filter', 'Filter')}</span></summary><div class="data-menu-popover" role="menu">${renderDataListFieldChoices(config, listState, deps)}</div></details>
      ${clearFilterButton}
      ${
        activeCustomFilter
          ? `<button class="data-toolbar-button" type="button" data-list-custom-filter-delete="${encodeHtml(activeCustomFilter.id)}">${dataListIcon('i-trash')} ${t('Delete filter', 'Delete filter')}</button>`
          : ''
      }
      ${isUnsaved ? `<button class="data-toolbar-button" type="button" data-list-save-view>${dataListIcon('i-save')} ${t('Save filter', 'Save filter')}</button>` : ''}`
  const printButton = `<button class="data-toolbar-button" type="button" data-list-action="print">${dataListIcon('i-print')}<span>${isAdaptive ? t('Print record', 'Print record') : t('Print list', 'Print list')}</span></button>`
  const chartButton = isAdaptive
    ? ''
    : `<button class="data-toolbar-button" type="button" data-list-action="chart" aria-pressed="${listState.chartVisible}">${dataListIcon('i-chart')}<span>${t('Chart', 'Chart')}</span></button>`
  const groupTrigger =
    tableView && !isAdaptive ? deps.renderDataListGroupTrigger(config, listState) : ''
  const overflowMenu = `<details class="data-menu end data-toolbar-overflow"><summary aria-label="${t('More actions', 'More actions')}" title="${t('More actions', 'More actions')}">${dataListIcon('i-dots')}</summary><div class="data-menu-popover" role="menu">${printButton}${chartButton}${groupTrigger}</div></details>`
  return `<div class="data-list-toolbar data-browse-toolbar" role="toolbar" aria-label="${encodeHtml(config.label)} ${t('table controls', 'table controls')}">
    <div class="data-toolbar-cluster data-list-view-controls">
      ${filterCluster}
      ${listState.layoutDirty ? `<button class="data-toolbar-button is-active" type="button" data-list-save-layout>${dataListIcon('i-save')} ${t('Save layout', 'Save layout')}</button>` : ''}
    </div>
    <div class="data-toolbar-cluster end">
      <label class="data-search">${dataListIcon('i-search')}<input type="search" data-list-search value="${encodeHtml(listState.search)}" placeholder="${t('Search', 'Search')} ${encodeHtml(config.label)}" aria-label="${t('Search', 'Search')} ${encodeHtml(config.label)}"><button class="data-search-clear" type="button" data-list-search-clear aria-label="${t('Clear search', 'Clear search')}"${listState.search ? '' : ' hidden'}>${dataListIcon('i-x', 12)}</button></label>
      <span class="data-toolbar-separator data-toolbar-optional" aria-hidden="true"></span>
      <span class="data-toolbar-cluster data-toolbar-inline">${printButton}${chartButton}${groupTrigger}</span>
      ${overflowMenu}
      ${listState.view === 'list' && !isAdaptive ? `<details class="data-menu end"><summary>${dataListIcon('i-sliders')}<span class="data-toolbar-label-text">${t('Columns', 'Columns')}</span>${dataListIcon('i-caret', 10)}</summary><div class="data-menu-popover" role="group" aria-label="${t('Visible columns', 'Visible columns')}">${columnControls}</div></details>` : ''}
      ${renderDataListViewMenu(context, listState, deps)}
    </div>
  </div>`
}

export function restoreDataListSearchFocus(canvas) {
  const search = canvas.querySelector('[data-list-search]')
  search?.focus({preventScroll: true})
  search?.setSelectionRange(search.value.length, search.value.length)
}

export function restoreDataListFilterFocus(canvas, filterKey, deps) {
  const editor = canvas.querySelector(`[data-filter-editor-key="${CSS.escape(filterKey)}"]`)
  if (!editor) return
  const input = editor.querySelector('[data-list-filter-value]')
  if (!input) {
    editor.open = true
    const dateControl = editor.querySelector(
      '[data-list-date-amount], [data-list-date-unit], [data-list-date-specific], [data-list-date-range-from], [data-list-date-range-to]'
    )
    const selected = editor.querySelector('[role="option"][aria-selected="true"]')
    const option = dateControl || selected || editor.querySelector('[role="option"]')
    option?.focus({preventScroll: true})
    requestAnimationFrame(() => deps.positionDataMenu(editor))
    return
  }
  editor.open = true
  input.focus({preventScroll: true})
  input.setSelectionRange(input.value.length, input.value.length)
  requestAnimationFrame(() => deps.positionDataMenu(editor))
}

function syncActiveCustomFilter(listState) {
  if (!listState.activeCustomFilterId) return
  const active = listState.customFilters.find(
    custom => custom.id === listState.activeCustomFilterId
  )
  if (!active || !customFilterMatchesFieldFilters(active, listState.fieldFilters))
    listState.activeCustomFilterId = ''
}

/* A custom filter stays "active" (shown by name, offering Delete instead of
   Save) only while the live field filters still match exactly what was
   saved — any edit silently detaches it back to an ordinary unsaved view,
   the same way a saved layout goes dirty the moment a column changes. */
function customFilterMatchesFieldFilters(custom, fieldFilters) {
  if (custom.fieldFilters.length !== fieldFilters.length) return false
  return custom.fieldFilters.every(saved => {
    const live = fieldFilters.find(item => item.key === saved.key)
    return live && live.operator === saved.operator && live.value === saved.value
  })
}

/**
 * The data-list orchestrator. Reads/writes `listState` (this instance's
 * private model state) and `config` (its static DATA_LIST_CONFIG entry),
 * and calls into `deps` for every piece owned elsewhere (statistics,
 * charts, views, menus, the footer pager, and the still page-owned
 * presentation/business callbacks). `footer` is received as a parameter
 * (not queried for internally) per the brief's explicit requirement.
 */
export function renderDataList(
  context,
  listState,
  config,
  footer,
  deps,
  {focusSearch = false, focusFilterKey = '', skipStatsAnimation = false} = {}
) {
  const canvas = listState.canvas
  if (!canvas) return
  syncActiveCustomFilter(listState)
  document.querySelectorAll('body > .data-menu-popover[data-parked]').forEach(popover => {
    if (canvas.contains(popover.__homeParent) || !document.contains(popover.__homeParent))
      popover.remove()
  })
  const filteredRows = deps.dataListRows(context)
  const tableView = ['list', 'responsive'].includes(listState.view)
  const isAdaptive = listState.view === 'adaptive'
  const totalPages = Math.max(
    1,
    Math.ceil((deps.simulatedTotal(context) || filteredRows.length) / listState.pageSize)
  )
  if (isAdaptive) {
    if (listState.page > filteredRows.length) listState.page = filteredRows.length
    if (listState.page < 1) listState.page = 1
  } else {
    if (listState.page > totalPages) listState.page = totalPages
    if (listState.page < 1) listState.page = 1
  }
  const pageStart = (listState.page - 1) * listState.pageSize
  const rows = isAdaptive
    ? filteredRows.slice(listState.page - 1, listState.page)
    : tableView
      ? filteredRows.slice(pageStart, pageStart + listState.pageSize)
      : filteredRows
  const standardVisibleColumns = listState.columnOrder
    .map(key => config.columns.find(column => column.key === key))
    .filter(column => column && !listState.hiddenColumns.has(column.key))
  const responsiveColumns = deps.responsiveDataListColumns(
    context,
    listState.responsiveWidth || Math.round(canvas.getBoundingClientRect().width),
    listState
  )
  const visibleColumns =
    listState.view === 'responsive' ? responsiveColumns.visible : standardVisibleColumns
  const overflowColumns = listState.view === 'responsive' ? responsiveColumns.overflow : []
  listState.responsiveSignature = responsiveColumns.visible.map(column => column.key).join('|')
  const visibleKeys = rows.map(row => String(row[config.key]))
  const selectedVisible = visibleKeys.filter(key => listState.selected.has(key)).length
  const allSelected = Boolean(visibleKeys.length) && selectedVisible === visibleKeys.length
  const toolbar = renderDataListToolbar(context, config, listState, deps)
  const groupingBar = tableView ? deps.renderDataListGroupingBar(config, listState) : ''
  const responsiveColgroup =
    listState.view === 'responsive'
      ? `<colgroup><col style="width:42px">${visibleColumns
          .map(
            column =>
              `<col style="width:${deps.responsiveWidthFor(column.key) || 130}px">`
          )
          .join('')}<col style="width:76px"></colgroup>`
      : ''
  const tableRenderContext = {context, visibleColumns, overflowColumns, config, listState}
  const records =
    listState.view === 'kanban'
      ? deps.renderKanban(context, rows, config, listState)
      : listState.view === 'cards'
        ? deps.renderDataListCards(context, rows, config, listState)
        : isAdaptive
          ? deps.renderDataListAdaptiveRecord(context, rows[0], config, filteredRows.length)
          : `<div class="data-table-scroll${listState.view === 'responsive' ? ' data-table-responsive' : ''}"><table class="inv-grid borders-${deps.encodeHtml(listState.borderMode)}">${responsiveColgroup}<thead><tr><th><input type="checkbox" data-list-select-all aria-label="Select all visible ${deps.encodeHtml(config.label)}"${allSelected ? ' checked' : ''}></th>${deps.renderDataListHeader(visibleColumns, listState)}<th class="data-row-actions-cell" aria-label="Record actions"></th></tr></thead><tbody>${deps.renderDataListBody(rows, tableRenderContext)}</tbody></table></div>`
  const statistics = listState.statisticsVisible
    ? deps.renderDataListStatistics(context, filteredRows, config)
    : ''
  const chart = isAdaptive ? '' : deps.renderDataListChart(context, filteredRows, config, listState)
  /* Grouping lives in its own card, separate from the table card, so the two
     ideas ("how rows are organized" vs "the rows themselves") read as
     distinct pieces of UI rather than one glued block. */
  const groupingCard = groupingBar ? `<div class="data-group-card">${groupingBar}</div>` : ''
  canvas.innerHTML = `${statistics}${chart}<div class="data-list-controls">${toolbar}</div>${groupingCard}<div class="data-list-shell" data-data-list="${context}">${records}</div>`
  /* Paging/record-nav swaps the whole canvas back in via innerHTML, so every
     stat card is a fresh element — animating on those renders would replay
     the count-up on each click, reading as the numbers "resetting" rather
     than the table simply moving on. */
  if (!skipStatsAnimation) deps.initNumberTickers(canvas)
  if (isAdaptive) deps.destroyDataListChartInstance(context)
  else deps.initDataListChart(context, canvas, filteredRows, config, listState)
  deps.renderDataPageManageMenus(context)
  deps.syncFooterPager(footer, context, filteredRows.length, listState)
  const selectAll = canvas.querySelector('[data-list-select-all]')
  if (selectAll) selectAll.indeterminate = selectedVisible > 0 && !allSelected
  wireDataList(canvas, context, listState, config, deps)
  observeResponsiveDataList(canvas, context, listState, deps)
  if (listState.view === 'list') deps.applyFrozenDataListColumns(canvas, visibleColumns, listState)
  if (focusSearch) restoreDataListSearchFocus(canvas)
  if (focusFilterKey) restoreDataListFilterFocus(canvas, focusFilterKey, deps)
}

function observeResponsiveDataList(canvas, context, listState, deps) {
  if (listState.resizeObserver || typeof ResizeObserver === 'undefined') return
  listState.resizeObserver = new ResizeObserver(entries => {
    const width = Math.round(entries[0]?.contentRect.width || 0)
    if (!width) return
    listState.responsiveWidth = width
    if (listState.view !== 'responsive') return
    const signature = deps
      .responsiveDataListColumns(context, width, listState)
      .visible.map(column => column.key)
      .join('|')
    if (signature === listState.responsiveSignature) return
    deps.rerender()
  })
  // Tied to the same instance-owned AbortController wireDataList creates
  // (Task 6) so the observer and the canvas's delegated listeners share one
  // disposal path — dispose() only needs to abort() once to tear down both.
  listState.abortController?.signal.addEventListener('abort', () => {
    listState.resizeObserver?.disconnect()
    listState.resizeObserver = null
  })
  listState.resizeObserver.observe(canvas)
}

/**
 * Delegated canvas listener registration. Replaces the previous
 * `canvas.dataset.dataListWired` boolean guard with `listState.abortController`
 * (Task 6) — a future instance dispose() removes this whole listener set in
 * one controller.abort() call, which a boolean guard has no path to do.
 */
export function wireDataList(canvas, context, listState, config, deps) {
  if (listState.abortController) return
  listState.abortController = new AbortController()
  const {signal} = listState.abortController
  canvas.addEventListener(
    'click',
    event => {
      if (deps.applyDataListFilterClick(event, context)) return
      if (deps.applyDataListToolbarClick(event, context)) return
      if (deps.applyDataListSortClick(event, context)) return
      deps.applyDataListCommandClick(event, context)
    },
    {signal}
  )
  canvas.addEventListener(
    'dblclick',
    event => {
      const row = event.target.closest('.data-list-record-row[data-list-row-key]')
      if (!row) return
      if (
        event.target.closest('button, a, input, select, textarea, summary, label, [role="menuitem"]')
      )
        return
      event.preventDefault()
      const key = row.dataset.listRowKey
      if (event.ctrlKey || event.metaKey) deps.openQuickView(context, key)
      else deps.openDataListRecord(context, key, 'view')
    },
    {signal}
  )
  canvas.addEventListener('change', event => deps.onDataListChange(event, context), {signal})
  canvas.addEventListener(
    'input',
    event => {
      const filterValue = event.target.closest('input[data-list-filter-value]')
      if (filterValue) {
        const filter = listState.fieldFilters.find(
          item => item.key === filterValue.dataset.listFilterValue
        )
        if (filter) filter.value = filterValue.value
        deps.rerender({focusFilterKey: filterValue.dataset.listFilterValue})
        return
      }
      const search = event.target.closest('[data-list-search]')
      if (!search) return
      listState.search = search.value
      listState.selected.clear()
      listState.page = 1
      deps.rerender({focusSearch: true})
    },
    {signal}
  )
  canvas.addEventListener(
    'dragstart',
    event => {
      const header = event.target.closest('[data-list-column-drag]')
      if (header) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', header.dataset.listColumnDrag)
        return
      }
      const card = event.target.closest('.data-kanban-card')
      if (!card) return
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', card.dataset.listRowKey)
      card.classList.add('is-dragging')
    },
    {signal}
  )
  canvas.addEventListener(
    'dragover',
    event => {
      const groupDrop = event.target.closest('[data-list-group-drop]')
      if (groupDrop) {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        groupDrop.dataset.dragOver = 'true'
        return
      }
      const header = event.target.closest('[data-list-column-drag]')
      if (header) {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        canvas
          .querySelectorAll('[data-list-column-drag][data-drag-over="true"]')
          .forEach(item => item.removeAttribute('data-drag-over'))
        header.dataset.dragOver = 'true'
        return
      }
      const drop = event.target.closest('[data-kanban-drop]')
      if (!drop) return
      const draggingCard = canvas.querySelector('.data-kanban-card.is-dragging')
      if (!draggingCard) return
      event.preventDefault()
      const fromStatus = draggingCard.dataset.kanbanStatus
      const toStatus = drop.dataset.kanbanDrop
      const allowed = fromStatus === toStatus || deps.kanbanTransitionAllowed(fromStatus, toStatus)
      event.dataTransfer.dropEffect = 'move'
      canvas
        .querySelectorAll('.data-kanban-drop.is-drag-over, .data-kanban-drop.is-drag-blocked')
        .forEach(item => item.classList.remove('is-drag-over', 'is-drag-blocked'))
      drop.classList.add(allowed ? 'is-drag-over' : 'is-drag-blocked')
    },
    {signal}
  )
  canvas.addEventListener(
    'dragleave',
    event => {
      const groupDrop = event.target.closest('[data-list-group-drop]')
      if (groupDrop && !groupDrop.contains(event.relatedTarget)) {
        groupDrop.removeAttribute('data-drag-over')
        return
      }
      const drop = event.target.closest('[data-kanban-drop]')
      if (!drop || drop.contains(event.relatedTarget)) return
      drop.classList.remove('is-drag-over', 'is-drag-blocked')
    },
    {signal}
  )
  canvas.addEventListener(
    'drop',
    event => {
      const groupDrop = event.target.closest('[data-list-group-drop]')
      if (groupDrop) {
        event.preventDefault()
        groupDrop.removeAttribute('data-drag-over')
        const sourceKey = event.dataTransfer.getData('text/plain')
        const validColumn = config.columns.some(
          column => column.key === sourceKey && column.groupable !== false
        )
        if (validColumn && !listState.groupBy.includes(sourceKey)) {
          listState.groupBy.push(sourceKey)
          listState.collapsedGroups.clear()
          deps.computeDataListLayoutDirty(listState)
          deps.rerender()
        }
        return
      }
      const header = event.target.closest('[data-list-column-drag]')
      if (header) {
        event.preventDefault()
        const sourceKey = event.dataTransfer.getData('text/plain')
        deps.reorderDataListColumn(context, sourceKey, header.dataset.listColumnDrag)
        return
      }
      const drop = event.target.closest('[data-kanban-drop]')
      if (!drop) return
      event.preventDefault()
      drop.classList.remove('is-drag-over', 'is-drag-blocked')
      const key = event.dataTransfer.getData('text/plain')
      deps.actions.run('move-kanban', [key], {toStatus: drop.dataset.kanbanDrop})
    },
    {signal}
  )
  canvas.addEventListener(
    'dragend',
    () => {
      canvas
        .querySelectorAll('[data-list-group-drop][data-drag-over="true"]')
        .forEach(item => item.removeAttribute('data-drag-over'))
      canvas
        .querySelectorAll('[data-list-column-drag][data-drag-over="true"]')
        .forEach(item => item.removeAttribute('data-drag-over'))
      canvas
        .querySelectorAll('.data-kanban-drop.is-drag-over, .data-kanban-drop.is-drag-blocked')
        .forEach(item => item.classList.remove('is-drag-over', 'is-drag-blocked'))
      canvas
        .querySelectorAll('.data-kanban-card.is-dragging')
        .forEach(item => item.classList.remove('is-dragging'))
    },
    {signal}
  )
}

/**
 * Assembles one independent data-list instance: its own model (state),
 * chart handle, AbortController-scoped canvas listeners, and ResizeObserver
 * — none shared with any other `createDataList(...)` call. Per the report's
 * lowest-risk continuation plan, `getState()` exposes the instance's
 * `listState` object by reference so legacy-app.js's still-untouched ~150
 * external call sites can keep populating/reading the transitional
 * `dataListState[context]` global unchanged, while `render`/`activate`/
 * `deactivate`/`dispose`/`getLayout`/`applyLayout`/`requestLeave` are the
 * new instance-owned public surface.
 *
 * @param {object} params
 * @param {string} params.context
 * @param {object} params.config - this context's DATA_LIST_CONFIG entry
 * @param {unknown[]} params.rows
 * @param {{code:string}} params.locale
 * @param {object} params.actions - business callbacks: openRecord(key,mode),
 *   newRecord(), run(command,keys,extra), cardModel(row), statistics(rows,config,total)
 * @param {object} params.storage - localStorageDataListStorage()-shaped
 * @param {object} params.deps - remaining page-owned render/dialog callbacks
 *   this instance needs (see legacy-app.js's call sites for the full shape)
 */
export function createDataList({context, config, rows, locale, actions, storage, deps}) {
  const model = createListModel({config, rows, storage, context})
  const listState = Object.assign(model.state, {
    chartVisible: false,
    chartExpanded: true,
    chartField: config.columns[0].key,
    chartYField: '',
    chartType: 'bar',
    canvas: null,
    responsiveWidth: 0,
    responsiveSignature: '',
    resizeObserver: null,
    abortController: null,
  })

  let chartHandle = null
  let footerEl = null
  let disposed = false

  function chart() {
    if (!chartHandle) chartHandle = createListChart({root: listState.canvas, locale})
    return chartHandle
  }

  const instanceDeps = {
    ...deps,
    actions,
    initDataListChart: (ctx, canvas, filteredRows, cfg, state) =>
      chart().render(filteredRows, cfg, state),
    destroyDataListChartInstance: () => chartHandle?.destroy(),
    rerender: (options = {}) => render(options),
    openDataListRecord: (ctx, key, mode) => actions.openRecord(key, mode),
    syncFooterPager: (footer, ctx, filteredCount, state) =>
      deps.syncFooterPager(footer ?? footerEl, ctx, filteredCount, state),
  }

  function render(options = {}) {
    if (!listState.canvas) return
    renderDataList(context, listState, config, footerEl, instanceDeps, options)
  }

  function activate({root, footer} = {}) {
    // wireDataList only wires a canvas once per abortController (its own
    // dataset-style guard, Task 6) — if this instance was already active on
    // a DIFFERENT canvas (or the same canvas element is being re-adopted
    // after being detached/reattached), that stale controller must be torn
    // down first so the new/current canvas actually gets wired, rather than
    // silently staying unwired while the old canvas's now-orphaned listeners
    // linger until GC. A same-canvas re-activate (root omitted, or passed as
    // the already-active element) is a no-op here, matching render()'s own
    // idempotency.
    if (root && root !== listState.canvas) deactivate()
    if (root) listState.canvas = root
    if (footer) footerEl = footer
    render()
  }

  function deactivate() {
    listState.abortController?.abort()
    listState.abortController = null
  }

  function dispose() {
    if (disposed) return
    disposed = true
    deactivate()
    chartHandle?.destroy()
    chartHandle = null
    listState.canvas = null
  }

  function getLayout() {
    return {
      columnOrder: [...listState.columnOrder],
      hiddenColumns: new Set(listState.hiddenColumns),
      groupBy: [...listState.groupBy],
      view: listState.view,
      statisticsVisible: listState.statisticsVisible,
      statisticsConcept: listState.statisticsConcept,
    }
  }

  function applyLayout(layout) {
    if (!layout) return
    Object.assign(listState, layout)
  }

  function requestLeave(after) {
    return deps.guardDataListLeave(after)
  }

  return {
    context,
    model,
    getState: () => listState,
    render,
    activate,
    deactivate,
    dispose,
    getLayout,
    applyLayout,
    requestLeave,
  }
}
