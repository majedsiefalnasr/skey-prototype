// Data-list context-menu + frozen-column helpers — moved out of
// concepts/app/legacy-app.js as part of Task 6.
//
// Scope note (see task-6-report.md for the full reasoning): the generic
// `.data-menu`/`.data-page-manage` toggle-positioning system
// (positionDataMenu, parkRowMenuPopover/unparkRowMenuPopover, and the
// document-level toggle/resize/scroll listeners that drive them) is
// page-wide singleton infrastructure ALSO used by non-data-list menus
// (customer lookup menus) — it stays in legacy-app.js, out of this
// component, matching the brief's file list (menus.js is scoped to
// "context menu handlers and custom-filter dialogs", not the general menu
// system). The custom-filter dialogs, export dialog, and the Manage menu
// itself stay in legacy-app.js too: they read/write page-level singleton
// DOM (#save-filter-scrim, #data-export-scrim, .data-page-manage elements)
// that predates and is shared beyond this component's own canvas. This
// module owns the two genuinely generic, config/listState-only pieces of
// data-list "menu" behavior: the right-click context menu (column-header
// and row actions) and frozen-column positioning.

/**
 * Pins the leading edge of every frozen column to accumulate insetInlineStart
 * offsets left-to-right (or right-to-left under RTL, since insetInlineStart
 * is direction-aware), so multiple pinned columns stack without overlapping.
 */
export function applyFrozenDataListColumns(canvas, visibleColumns, listState) {
  let offset = canvas.querySelector('.inv-grid th:first-child')?.getBoundingClientRect().width || 0
  visibleColumns.forEach(column => {
    if (!listState.frozenColumns.has(column.key)) return
    const cells = canvas.querySelectorAll(`[data-col="${CSS.escape(column.key)}"]`)
    cells.forEach(cell => {
      cell.dataset.frozen = 'true'
      cell.style.insetInlineStart = `${offset}px`
    })
    offset += cells[0]?.getBoundingClientRect().width || 0
  })
}

/**
 * Creates the right-click context menu controller for one data-list
 * instance. The `#data-list-context-menu` DOM node itself is a page-level
 * singleton (only one context menu can ever be open at a time, same as the
 * original) — createContextMenu wraps it with instance-scoped callbacks
 * (`getConfig`, `getListState`, `onRowAction`, `onColumnAction`,
 * `refresh`) so each createDataList(...) instance can drive the shared
 * element without any instance reading another instance's state.
 *
 * @param {object} params
 * @param {HTMLElement} params.menuEl - the shared #data-list-context-menu element.
 * @param {{t: Function, encodeHtml: Function, dataListIcon: Function}} params.deps
 */
export function createContextMenu({menuEl, deps}) {
  const {t, encodeHtml, dataListIcon} = deps

  function close() {
    menuEl.hidden = true
    menuEl.innerHTML = ''
    delete menuEl.dataset.context
    delete menuEl.dataset.rowKey
    delete menuEl.dataset.columnKey
  }

  function position(x, y) {
    const rect = menuEl.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width - 8
    const maxY = window.innerHeight - rect.height - 8
    menuEl.style.left = `${Math.max(8, Math.min(x, maxX))}px`
    menuEl.style.top = `${Math.max(8, Math.min(y, maxY))}px`
  }

  function open(x, y, innerHtml, context, rowKey = '', columnKey = '') {
    menuEl.innerHTML = innerHtml
    menuEl.dataset.context = context
    if (rowKey) menuEl.dataset.rowKey = rowKey
    else delete menuEl.dataset.rowKey
    if (columnKey) menuEl.dataset.columnKey = columnKey
    else delete menuEl.dataset.columnKey
    menuEl.hidden = false
    position(x, y)
    menuEl.querySelector('[role="menuitem"], button')?.focus({preventScroll: true})
  }

  return {open, close, position}
}

/**
 * @param {object} config
 * @param {object} column
 * @param {object} listState
 * @param {{t: Function, encodeHtml: Function, dataListIcon: Function}} deps
 */
export function renderDataListColumnHeaderMenu(config, column, listState, deps) {
  const {t, encodeHtml, dataListIcon} = deps
  const sorted = listState.sortKey === column.key
  const pinned = listState.frozenColumns.has(column.key)
  const canGroup = column.groupable !== false && !listState.groupBy.includes(column.key)
  const canChart = column.key !== undefined
  const item = (action, icon, label, disabled = false) =>
    `<button type="button" role="menuitem" data-context-column-action="${action}"${disabled ? ' disabled' : ''}>${dataListIcon(icon, 13)} ${encodeHtml(t(label, label))}</button>`
  return `${item('sort-asc', 'i-caret', 'Sort ascending', sorted && listState.sortDirection === 'asc')}
    ${item('sort-desc', 'i-caret', 'Sort descending', sorted && listState.sortDirection === 'desc')}
    ${item('clear-sort', 'i-undo', 'Clear sort', !sorted)}
    <div class="data-menu-separator"></div>
    ${item(pinned ? 'unpin' : 'pin', 'i-lock', pinned ? 'Unpin column' : 'Pin column')}
    <div class="data-menu-separator"></div>
    ${item('hide', 'i-x', 'Hide column')}
    ${column.groupable !== false ? item('group-by', 'i-grid', 'Group by this column', !canGroup) : ''}
    <div class="data-menu-separator"></div>
    ${item('chart-range', 'i-chart', 'Chart range', !canChart)}`
}

/**
 * Applies a column-header context-menu action to listState in place. Mirrors
 * the original's mutation set exactly (sort/pin/hide/group/chart-range);
 * callers are responsible for re-rendering afterward.
 * @returns {boolean} whether the action was recognized/applied.
 */
export function applyDataListColumnHeaderAction(listState, config, columnKey, action) {
  if (action === 'sort-asc' || action === 'sort-desc') {
    listState.sortKey = columnKey
    listState.sortDirection = action === 'sort-asc' ? 'asc' : 'desc'
  } else if (action === 'clear-sort') {
    listState.sortKey = config.key
    listState.sortDirection = 'asc'
  } else if (action === 'pin') {
    listState.frozenColumns.add(columnKey)
  } else if (action === 'unpin') {
    listState.frozenColumns.delete(columnKey)
  } else if (action === 'hide') {
    listState.hiddenColumns.add(columnKey)
    return {dirty: true}
  } else if (action === 'group-by') {
    if (!listState.groupBy.includes(columnKey)) listState.groupBy.push(columnKey)
    listState.collapsedGroups.clear()
    return {dirty: true}
  } else if (action === 'chart-range') {
    listState.chartField = columnKey
    listState.chartVisible = true
  } else {
    return null
  }
  return {dirty: false}
}
