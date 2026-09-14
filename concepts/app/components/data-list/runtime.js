import {encodeHtml} from '../../core/locale.js'
import {DATA_LIST_SIMULATED_TOTAL, localStorageDataListStorage} from './model.js'
import {DATA_FILTER_OPERATORS, dataFilterOptionValue, dataFilterOptionLabel, parseDateFilterValue} from './filters.js'
import {DATA_LIST_CONFIG, DATA_LIST_RESPONSIVE_WIDTH, responsiveDataListColumns} from './columns.js'
import {createDataList} from './list.js'
import {computeDataListLayoutDirty as sharedComputeDataListLayoutDirty, deleteDataListRecords as sharedDeleteDataListRecords, toggleDataListStatus as sharedToggleDataListStatus, setDataListRecordsStatus as sharedSetDataListRecordsStatus, applyDataListRowAction as sharedApplyDataListRowAction, applyDataListToolbarCommand as sharedApplyDataListToolbarCommand, applyDataListCommandClick as sharedApplyDataListCommandClick, applyDataListSortClick as sharedApplyDataListSortClick, onDataListChange as sharedOnDataListChange, reorderDataListColumn as sharedReorderDataListColumn, saveDataListLayout as sharedSaveDataListLayout, resetDataListLayout as sharedResetDataListLayout} from './actions.js'

/** Owns list runtime state and its DOM bindings. */
export function createListRuntime({locale, t, toast, initNumberTickers, openPrintSettings, openGeoRecord, getDataListActions, guardDataListLeave, dateFilterLabel, renderDataListDatePresetOptions, syncShellListPager, renderDataListChart, renderDataListStatistics, renderDataListGroupTrigger, renderDataListGroupingBar, renderDataListHeader, renderDataListBody, openQuickView, renderDataListCards, renderDataListAdaptiveRecord, getINVOICE_STATUS_TRANSITIONS, renderDataListKanban, positionDataMenu, applyFrozenDataListColumns, applyDataListFilterClick, applyDataListToolbarClick, resolvedDataListStatisticsConcept, activeDataListStatisticsConcept, renderDataPageManageMenu, renderGeoList} = {}) {
  const dataListStorage = localStorageDataListStorage()

  const dataListDeps = {
    t,
    encodeHtml,
    // dataListIcon/applyFrozenDataListColumns are declared later in this
    // file as `const` (not hoisted function declarations, unlike almost
    // everything else this bundle references) — wrapped in lambdas here
    // so they're resolved lazily on first call, after both are actually
    // initialized, rather than read eagerly at this object's own
    // construction time (which would throw a TDZ ReferenceError).
    dataListIcon: (...args) => dataListIcon(...args),
    DATA_FILTER_OPERATORS,
    dataFilterOptionLabel,
    dataFilterOptionValue,
    dateFilterLabel,
    renderDataListDatePresetOptions,
    dataListRows,
    simulatedTotal: context => DATA_LIST_SIMULATED_TOTAL[context],
    responsiveDataListColumns,
    responsiveWidthFor: key => DATA_LIST_RESPONSIVE_WIDTH[key],
    renderDataListGroupTrigger,
    renderDataListGroupingBar,
    renderKanban: renderDataListKanban,
    renderDataListCards,
    renderDataListAdaptiveRecord,
    renderDataListHeader,
    renderDataListBody,
    renderDataListStatistics,
    renderDataListChart,
    initNumberTickers,
    renderDataPageManageMenus: context => {
      const manageMenu = document.querySelector(
        `.data-page-manage[data-list-context="${CSS.escape(context)}"]`
      )
      if (manageMenu) renderDataPageManageMenu(manageMenu)
    },
    syncFooterPager: (footer, context, filteredCount) =>
      syncShellListPager(context, filteredCount, footer),
    applyFrozenDataListColumns: (canvas, visibleColumns, listState) =>
      applyFrozenDataListColumns(canvas, visibleColumns, listState),
    applyDataListFilterClick,
    applyDataListToolbarClick,
    applyDataListSortClick,
    applyDataListCommandClick,
    onDataListChange,
    positionDataMenu,
    openQuickView,
    openGeoRecord,
    kanbanTransitionAllowed: (fromStatus, toStatus) =>
      (getINVOICE_STATUS_TRANSITIONS()[fromStatus] || []).includes(toStatus),
    computeDataListLayoutDirty,
    reorderDataListColumn: (context, sourceKey, targetKey) =>
      reorderDataListColumn(context, sourceKey, targetKey),
    guardDataListLeave,
  }

  const sharedActionDeps = {
    toast,
    dataListRows,
    rerender: (context, options) => renderDataList(context, options),
    openQuickView,
    openGeoRecord,
    openPrintSettings,
    activeDataListStatisticsConcept,
    resolvedDataListStatisticsConcept,
  }

  function computeDataListLayoutDirty(listState) {
    return sharedComputeDataListLayoutDirty(listState, sharedActionDeps)
  }

  function deleteDataListRecords(context, keys) {
    return sharedDeleteDataListRecords(context, keys, DATA_LIST_CONFIG[context], dataListState[context], {
      ...sharedActionDeps,
      rerender: () => renderDataList(context),
    })
  }

  function toggleDataListStatus(context, row) {
    return sharedToggleDataListStatus(row, {
      ...sharedActionDeps,
      rerender: () => renderDataList(context),
    })
  }

  function setDataListRecordsStatus(context, keys, active) {
    return sharedSetDataListRecordsStatus(keys, active, DATA_LIST_CONFIG[context], {
      ...sharedActionDeps,
      rerender: () => renderDataList(context),
    })
  }

  function openDataListRecord(context, key, mode) {
    if (guardDataListLeave(() => openDataListRecord(context, key, mode))) return
    getDataListActions()[context].openRecord(key, mode)
  }

  function applyDataListRowAction(context, rowAction) {
    return sharedApplyDataListRowAction(context, rowAction, DATA_LIST_CONFIG[context], {
      ...sharedActionDeps,
      actions: getDataListActions()[context],
      deleteDataListRecords: (ctx, keys) => deleteDataListRecords(context, keys),
      toggleDataListStatus: row => toggleDataListStatus(context, row),
    })
  }

  function applyDataListToolbarCommand(context, command, selectedKey) {
    return sharedApplyDataListToolbarCommand(
      context,
      command,
      selectedKey,
      dataListState[context],
      DATA_LIST_CONFIG[context],
      {
        ...sharedActionDeps,
        actions: getDataListActions()[context],
        rerender: () => renderDataList(context),
        deleteDataListRecords: (ctx, keys) => deleteDataListRecords(context, keys),
        setDataListRecordsStatus: (keys, active) =>
          setDataListRecordsStatus(context, keys, active),
      }
    )
  }

  function applyDataListCommandClick(event, context) {
    return sharedApplyDataListCommandClick(event, context, dataListState[context], {
      ...sharedActionDeps,
      actions: getDataListActions()[context],
      rerender: () => renderDataList(context),
      applyDataListRowAction: (ctx, rowAction) => applyDataListRowAction(ctx, rowAction),
      applyDataListToolbarCommand: (ctx, cmd, key) => applyDataListToolbarCommand(ctx, cmd, key),
    })
  }

  function applyDataListSortClick(event, context) {
    return sharedApplyDataListSortClick(event, dataListState[context], {
      ...sharedActionDeps,
      rerender: () => renderDataList(context),
    })
  }

  function onDataListChange(event, context) {
    return sharedOnDataListChange(event, context, dataListState[context], DATA_LIST_CONFIG[context], {
      ...sharedActionDeps,
      parseDateFilterValue,
      rerender: (options = {}) => renderDataList(context, options),
    })
  }

  function reorderDataListColumn(context, sourceKey, targetKey) {
    return sharedReorderDataListColumn(sourceKey, targetKey, dataListState[context], {
      ...sharedActionDeps,
      rerender: () => renderDataList(context),
    })
  }

  function saveDataListLayout(context) {
    return sharedSaveDataListLayout(dataListState[context], dataListModels[context], {
      ...sharedActionDeps,
      rerender: () => renderDataList(context),
    })
  }

  function resetDataListLayout(context) {
    return sharedResetDataListLayout(dataListModels[context], {
      ...sharedActionDeps,
      rerender: () => renderDataList(context),
    })
  }

  const dataListInstances = Object.fromEntries(
    Object.entries(DATA_LIST_CONFIG).map(([context, config]) => [
      context,
      createDataList({
        context,
        config,
        rows: config.rows,
        locale,
        actions: getDataListActions()[context],
        storage: dataListStorage,
        deps: dataListDeps,
      }),
    ])
  )

  const dataListModels = Object.fromEntries(
    Object.entries(dataListInstances).map(([context, instance]) => [context, instance.model])
  )

  const dataListState = Object.fromEntries(
    Object.entries(dataListInstances).map(([context, instance]) => [
      context,
      instance.getState(),
    ])
  )

  function renderDataList(context, options) {
    dataListInstances[context].render(options)
  }

  const dataListIcon = (name, size = 15) =>
    `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#${name}" /></svg>`

  function dataListRows(context) {
    return dataListModels[context].rowsInView()
  }

  function refreshDataListForContext(context) {
    if (context === 'geo') renderGeoList()
    else renderDataList(context)
  }

  document.getElementById('filter-mode').addEventListener('change', e => {
    Object.keys(DATA_LIST_CONFIG).forEach(context => {
      dataListState[context].filterMode = e.target.value
      if (dataListState[context].canvas) refreshDataListForContext(context)
    })
  })

  document.getElementById('statistics-concept').addEventListener('change', () => {
    Object.keys(DATA_LIST_CONFIG).forEach(context => {
      if (dataListState[context].canvas) refreshDataListForContext(context)
    })
  })

  return {dataListStorage, computeDataListLayoutDirty, applyDataListRowAction, applyDataListToolbarCommand, saveDataListLayout, resetDataListLayout, dataListInstances, dataListState, renderDataList, dataListIcon, dataListRows, refreshDataListForContext}
}
