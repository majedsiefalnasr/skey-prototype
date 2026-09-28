// Data-list action/command handlers — moved out of concepts/app/legacy-app.js
// as part of Task 6. Every function here takes `listState`/`config` (and
// often a `deps` bundle) explicitly instead of reading a global
// `dataListState[context]`/`DATA_LIST_CONFIG[context]` lookup, per the
// brief's "each list instance owns its state" requirement.
//
// Record-open/new/toolbar-command handlers call the injected `actions`
// business-callback contract (`actions.openRecord(key,mode)`,
// `actions.newRecord()`, `actions.run(command,keys)`) instead of branching
// directly to openCustomerRecord/openGeoRecord/openInvoiceRecord — the
// shared list never imports a customer/invoice controller.

export function visibleDirtyDataListContext(instances) {
  for (const [context, instance] of Object.entries(instances)) {
    const listState = instance.getState()
    if (instance.isVisible() && listState.layoutDirty) return context
  }
  return ''
}

export function computeDataListLayoutDirty(listState, deps) {
  const columnsChanged = listState.columnOrder.join('|') !== listState.savedColumnOrder.join('|')
  const hiddenChanged =
    listState.hiddenColumns.size !== listState.savedHiddenColumns.size ||
    [...listState.hiddenColumns].some(key => !listState.savedHiddenColumns.has(key))
  const viewChanged = listState.view !== listState.savedView
  const groupsChanged = listState.groupBy.join('|') !== listState.savedGroupBy.join('|')
  const statisticsVisibilityChanged =
    listState.statisticsVisible !== listState.savedStatisticsVisible
  const statisticsConceptChanged =
    deps.activeDataListStatisticsConcept(listState) !==
    deps.resolvedDataListStatisticsConcept(listState.savedStatisticsConcept)
  listState.layoutDirty =
    columnsChanged ||
    hiddenChanged ||
    viewChanged ||
    groupsChanged ||
    statisticsVisibilityChanged ||
    statisticsConceptChanged
  return listState.layoutDirty
}

export function deleteDataListRecords(context, keys, config, listState, deps) {
  const deleted = new Set(keys)
  for (let index = config.rows.length - 1; index >= 0; index -= 1) {
    if (deleted.has(String(config.rows[index][config.key]))) config.rows.splice(index, 1)
  }
  listState.sourceRows = listState.sourceRows.filter(row => !deleted.has(String(row[config.key])))
  deleted.forEach(key => listState.selected.delete(key))
  deps.rerender()
  deps.toast({
    tone: 'ok',
    title: `${deleted.size} ${deleted.size === 1 ? config.singular : config.label} deleted`,
  })
}

export function toggleDataListStatus(row, deps) {
  row.active = !row.active
  deps.rerender()
  deps.toast({
    tone: 'ok',
    title: `${row.customerName || row.name} ${row.active ? 'activated' : 'deactivated'}`,
  })
}

export function setDataListRecordsStatus(keys, active, config, deps) {
  const keySet = new Set(keys)
  const rows = config.rows.filter(row => keySet.has(String(row[config.key])))
  rows.forEach(row => (row.active = active))
  deps.rerender()
  deps.toast({
    tone: 'ok',
    title: `${rows.length} ${rows.length === 1 ? config.singular : config.label} ${active ? 'activated' : 'deactivated'}`,
  })
}

export function applyDataListRowAction(context, rowAction, config, deps) {
  /* rowAction can sit inside a nested submenu popover (e.g. a row's "Change
     status" list), which is its own .data-menu-popover but never itself
     parked — only the outer row-menu popover moves to document.body. Walk
     every .data-menu-popover ancestor, not just the nearest one, to find
     the one that actually carries data-parked and its row's __homeParent. */
  let home = null
  for (let node = rowAction.closest('.data-menu-popover'); node; node = node.parentElement?.closest('.data-menu-popover')) {
    if (node.dataset.parked) {
      home = node.__homeParent
      break
    }
  }
  const key =
    rowAction.closest('[data-list-row-key]')?.dataset.listRowKey ||
    home?.closest('[data-list-row-key]')?.dataset.listRowKey
  if (!key) return false
  const command = rowAction.dataset.listRowAction
  const row = config.rows.find(record => String(record[config.key]) === key)
  if (command === 'quick-view') deps.openQuickView(context, key)
  else if (command === 'display') deps.actions.openRecord(key, 'view')
  else if (command === 'modify') deps.actions.openRecord(key, 'edit')
  else if (command === 'delete') deps.deleteDataListRecords(context, [key])
  else if (command === 'toggle-status' && row) deps.toggleDataListStatus(row)
  else if (command === 'change-status' && row)
    deps.openStatusDialog(context, row, rowAction.dataset.statusTarget)
  else if (command === 'view-hierarchy' && row) deps.openGeoRecord(row.code, 'view')
  else if (command === 'print')
    deps.openPrintSettings(`${config.singular[0].toUpperCase() + config.singular.slice(1)} ${key}`)
  else
    deps.toast({
      tone: 'ok',
      title: `${rowAction.textContent.trim()} for ${config.singular} ${key}`,
    })
  return true
}

export function applyDataListToolbarCommand(context, command, selectedKey, listState, config, deps) {
  if (['display', 'modify'].includes(command) && selectedKey) {
    deps.actions.openRecord(selectedKey, command === 'display' ? 'view' : 'edit')
  } else if (command === 'delete' && listState.selected.size) {
    deps.deleteDataListRecords(context, listState.selected)
  } else if (['customer', 'geo'].includes(context) && ['activate', 'deactivate'].includes(command) && listState.selected.size) {
    /* Customers and locations get the same reasoned dialog here as the row
       menu and the record page (openStatusDialog handles activate vs.
       deactivate itself) — every other context keeps the plain instant
       flip. The command is the toolbar button the user actually clicked,
       not each row's current state — a mixed selection still all moves the
       same direction, the one asked for. */
    const keySet = new Set(listState.selected)
    const rows = config.rows.filter(row => keySet.has(String(row[config.key])))
    deps.openStatusDialog(context, rows, command)
  } else if (['activate', 'deactivate'].includes(command) && listState.selected.size) {
    deps.setDataListRecordsStatus(listState.selected, command === 'activate')
  } else if (command === 'chart') {
    listState.chartVisible = !listState.chartVisible
    deps.rerender()
  } else if (command === 'statistics-status') {
    listState.statisticsVisible = !listState.statisticsVisible
    computeDataListLayoutDirty(listState, deps)
    deps.rerender()
    deps.toast({
      tone: 'ok',
      title: `Statistics ${listState.statisticsVisible ? 'shown' : 'hidden'}`,
    })
  } else if (command === 'print') {
    if (listState.view === 'adaptive') {
      const filteredRows = deps.dataListRows(context)
      const record = filteredRows[listState.page - 1]
      const recordKey = record ? record[config.key] : ''
      deps.openPrintSettings(
        `${config.singular[0].toUpperCase() + config.singular.slice(1)} ${recordKey}`
      )
    } else {
      const label = config.label
      deps.openPrintSettings(`${label[0].toUpperCase() + label.slice(1)} list`)
    }
  } else return false
  return true
}

export function applyDataListCommandClick(event, context, listState, deps) {
  const view = event.target.closest('[data-list-view]')
  const record = event.target.closest('[data-list-open-record]')
  const action = event.target.closest('[data-list-action]')
  const rowAction = event.target.closest('[data-list-row-action]')
  const rowExpand = event.target.closest('[data-list-row-expand]')
  const groupToggle = event.target.closest('[data-list-group-toggle]')
  const groupRemove = event.target.closest('[data-list-group-remove]')
  const groupAdd = event.target.closest('[data-list-group-add]')
  const groupClear = event.target.closest('[data-list-group-clear]')
  const chartClose = event.target.closest('[data-list-chart-close]')
  const chartType = event.target.closest('[data-list-chart-type]')
  const chartToggle = event.target.closest('[data-list-chart-toggle]')
  const selectedKey = [...listState.selected][0]
  if (chartClose) {
    listState.chartVisible = false
    deps.rerender()
  } else if (chartToggle) {
    listState.chartExpanded = !listState.chartExpanded
    deps.rerender()
  } else if (chartType) {
    listState.chartType = chartType.dataset.listChartType
    deps.rerender()
  } else if (view) {
    listState.view = view.dataset.listView
    computeDataListLayoutDirty(listState, deps)
    deps.rerender()
  } else if (rowExpand) {
    const key = rowExpand.dataset.listRowExpand
    if (listState.expandedRows.has(key)) listState.expandedRows.delete(key)
    else listState.expandedRows.add(key)
    deps.rerender()
  } else if (groupToggle) {
    const groupId = groupToggle.dataset.listGroupToggle
    if (listState.collapsedGroups.has(groupId)) listState.collapsedGroups.delete(groupId)
    else listState.collapsedGroups.add(groupId)
    deps.rerender()
  } else if (groupRemove) {
    listState.groupBy = listState.groupBy.filter(key => key !== groupRemove.dataset.listGroupRemove)
    listState.collapsedGroups.clear()
    computeDataListLayoutDirty(listState, deps)
    deps.rerender()
  } else if (groupClear) {
    listState.groupBy = []
    listState.collapsedGroups.clear()
    computeDataListLayoutDirty(listState, deps)
    deps.rerender()
  } else if (groupAdd) {
    const columnKey = groupAdd.dataset.listGroupAdd
    if (!listState.groupBy.includes(columnKey)) listState.groupBy.push(columnKey)
    listState.collapsedGroups.clear()
    computeDataListLayoutDirty(listState, deps)
    deps.rerender()
  } else if (rowAction) return deps.applyDataListRowAction(context, rowAction)
  else if (action && deps.applyDataListToolbarCommand(context, action.dataset.listAction, selectedKey))
    return true
  else if (record) {
    deps.actions.openRecord(record.dataset.listOpenRecord, 'view')
  } else return false
  return true
}

export function applyDataListSortClick(event, listState, deps) {
  const sort = event.target.closest('[data-list-sort]')
  if (!sort) return false
  const key = sort.dataset.listSort
  listState.sortDirection =
    listState.sortKey === key && listState.sortDirection === 'asc' ? 'desc' : 'asc'
  listState.sortKey = key
  deps.rerender()
  return true
}

export function onDataListChange(event, context, listState, config, deps) {
  const rowSelect = event.target.closest('[data-list-row-select]')
  const column = event.target.closest('[data-list-column]')
  const filterValue = event.target.closest('[data-list-filter-value]')
  const chartField = event.target.closest('[data-list-chart-field]')
  const chartYField = event.target.closest('[data-list-chart-y-field]')
  const dateAmount = event.target.closest('[data-list-date-amount]')
  const dateUnit = event.target.closest('[data-list-date-unit]')
  const dateSpecific = event.target.closest('[data-list-date-specific]')
  const dateRangeFrom = event.target.closest('[data-list-date-range-from]')
  const dateRangeTo = event.target.closest('[data-list-date-range-to]')
  const dateControl =
    dateAmount?.dataset.listDateAmount ||
    dateUnit?.dataset.listDateUnit ||
    dateSpecific?.dataset.listDateSpecific ||
    dateRangeFrom?.dataset.listDateRangeFrom ||
    dateRangeTo?.dataset.listDateRangeTo
  if (dateControl) {
    const item = listState.fieldFilters.find(fieldFilter => fieldFilter.key === dateControl)
    if (item) {
      const {preset, a, b} = deps.parseDateFilterValue(item)
      if (dateAmount) item.value = `${preset}:${dateAmount.value || 1}:${b || 'day'}`
      else if (dateUnit) item.value = `${preset}:${a || 1}:${dateUnit.value}`
      else if (dateSpecific) item.value = `specific:${dateSpecific.value}`
      else if (dateRangeFrom) item.value = `range:${dateRangeFrom.value}:${b || ''}`
      else if (dateRangeTo) item.value = `range:${a || ''}:${dateRangeTo.value}`
    }
    listState.page = 1
    deps.rerender({focusFilterKey: dateControl})
  } else if (chartField) {
    listState.chartField = chartField.value
  } else if (chartYField) {
    listState.chartYField = chartYField.value
  } else if (rowSelect) {
    if (rowSelect.checked) listState.selected.add(rowSelect.value)
    else listState.selected.delete(rowSelect.value)
  } else if (event.target.closest('[data-list-select-all]'))
    deps.dataListRows(context).forEach(row => {
      const key = String(row[config.key])
      if (event.target.checked) listState.selected.add(key)
      else listState.selected.delete(key)
    })
  else if (column) {
    if (column.checked) listState.hiddenColumns.delete(column.dataset.listColumn)
    else listState.hiddenColumns.add(column.dataset.listColumn)
    computeDataListLayoutDirty(listState, deps)
  } else if (filterValue) {
    const filter = listState.fieldFilters.find(
      item => item.key === filterValue.dataset.listFilterValue
    )
    if (filter) filter.value = filterValue.value
  } else return
  deps.rerender()
}

export function reorderDataListColumn(sourceKey, targetKey, listState, deps) {
  if (!sourceKey || !targetKey || sourceKey === targetKey) return
  const nextOrder = listState.columnOrder.filter(key => key !== sourceKey)
  const targetIndex = nextOrder.indexOf(targetKey)
  if (targetIndex < 0) return
  nextOrder.splice(targetIndex, 0, sourceKey)
  listState.columnOrder = nextOrder
  computeDataListLayoutDirty(listState, deps)
  deps.rerender()
}

export function saveDataListLayout(listState, model, deps) {
  // The model's saveLayout() persists whatever is currently in
  // listState.statisticsConcept — set it from the DOM first so the
  // persisted value matches what activeDataListStatisticsConcept() has
  // always resolved to (falls back to the live #statistics-concept
  // control, then 'balanced'), exactly as before this extraction.
  listState.statisticsConcept = deps.activeDataListStatisticsConcept(listState)
  if (!model.saveLayout()) {
    deps.toast({tone: 'bad', title: 'Table layout could not be saved in this browser'})
    return false
  }
  deps.rerender()
  deps.toast({tone: 'ok', title: 'Table layout saved to your user configuration'})
  return true
}

export function resetDataListLayout(model, deps) {
  model.resetLayout()
  deps.rerender()
  deps.toast({tone: 'ok', title: 'Default table layout restored'})
}
