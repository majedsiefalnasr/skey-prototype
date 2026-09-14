import {encodeHtml} from '../../core/locale.js'
import {DATA_LIST_CONFIG, DATA_LIST_STATISTICS_CONCEPT_OPTIONS} from './columns.js'
import {applyFrozenDataListColumns as applySharedFrozenDataListColumns} from './menus.js'

/** Owns list menus state and its DOM bindings. */
export function createListMenus({t, toast, computeDataListLayoutDirty, applyDataListRowAction, applyDataListToolbarCommand, saveDataListLayout, resetDataListLayout, getDataListState, renderDataList, dataListIcon, openDataExport} = {}) {
  function positionDataMenu(details) {
    if (!details?.open) return
    const summary = details.querySelector(':scope > summary')
    const popover =
      details.querySelector(':scope > .data-menu-popover') ||
      [...document.body.children].find(child => child.__homeParent === details)
    if (!summary || !popover) return
    const margin = 8
    const gap = 4
    const anchor = summary.getBoundingClientRect()
    popover.style.left = `${margin}px`
    popover.style.top = `${margin}px`
    popover.style.maxHeight = `${Math.max(120, window.innerHeight - margin * 2)}px`
    const rect = popover.getBoundingClientRect()
    if (details.classList.contains('data-manage-submenu')) {
      const rtl = document.documentElement.dir === 'rtl'
      const fitsEnd = rtl
        ? anchor.left - gap - rect.width >= margin
        : anchor.right + gap + rect.width <= window.innerWidth - margin
      let left = rtl
        ? fitsEnd
          ? anchor.left - gap - rect.width
          : anchor.right + gap
        : fitsEnd
          ? anchor.right + gap
          : anchor.left - gap - rect.width
      left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin))
      let top = anchor.top
      if (top + rect.height > window.innerHeight - margin)
        top = Math.max(margin, window.innerHeight - margin - rect.height)
      popover.style.left = `${left}px`
      popover.style.top = `${top}px`
      return
    }
    const alignEnd =
      details.classList.contains('end') || details.classList.contains('data-page-manage')
    let left = alignEnd ? anchor.right - rect.width : anchor.left
    left = Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin))
    let top = anchor.bottom + gap
    if (top + rect.height > window.innerHeight - margin)
      top = Math.max(margin, anchor.top - rect.height - gap)
    popover.style.left = `${left}px`
    popover.style.top = `${top}px`
  }
  
  const applyFrozenDataListColumns = applySharedFrozenDataListColumns
  
  function dataManageAction(action, icon, title, support, {disabled = false} = {}) {
    return `<button type="button" role="menuitem" data-list-manage-action="${action}"${disabled ? ' disabled' : ''}>${dataListIcon(icon)}<span class="data-manage-copy"><strong>${title}</strong><small>${support}</small></span></button>`
  }
  
  const DATA_BORDER_MODES = ['default', 'both', 'none', 'horizontal', 'vertical']
  
  function renderDataManageBorderControls(context, listState) {
    return DATA_BORDER_MODES.map(
      mode =>
        `<label class="data-manage-radio"><input type="radio" name="${encodeHtml(context)}-border" data-list-manage-border="${mode}"${listState.borderMode === mode ? ' checked' : ''}><span>${mode[0].toUpperCase() + mode.slice(1)}</span></label>`
    ).join('')
  }
  
  function resolvedDataListStatisticsConcept(statisticsConcept) {
    return (
      statisticsConcept || document.getElementById('statistics-concept')?.value || 'balanced'
    )
  }
  
  function activeDataListStatisticsConcept(listState) {
    return resolvedDataListStatisticsConcept(listState.statisticsConcept)
  }
  
  function renderDataManageStatisticsControls(context, listState) {
    const active = activeDataListStatisticsConcept(listState)
    return DATA_LIST_STATISTICS_CONCEPT_OPTIONS.map(
      option =>
        `<label class="data-manage-radio"><input type="radio" name="${encodeHtml(context)}-statistics-concept" data-list-manage-statistics-concept="${option.key}"${active === option.key ? ' checked' : ''}><span>${encodeHtml(t(option.label))}</span></label>`
    ).join('')
  }
  
  function renderDataManageFrozenControls(config, listState) {
    const columns = listState.columnOrder
      .map(key => config.columns.find(column => column.key === key))
      .filter(Boolean)
    if (!columns.length) return `<p class="data-manage-empty">No columns to freeze.</p>`
    return columns
      .map(
        column =>
          `<label><input type="checkbox" data-list-manage-frozen="${encodeHtml(column.key)}"${listState.frozenColumns.has(column.key) ? ' checked' : ''}><span>${encodeHtml(column.label)}</span></label>`
      )
      .join('')
  }
  
  function renderDataPageManageMenu(details) {
    const context = details.dataset.listContext
    const config = DATA_LIST_CONFIG[context]
    const listState = getDataListState()[context]
    const popover = details.querySelector('.data-menu-popover')
    if (!config || !listState || !popover) return
    const singular = config.singular[0].toUpperCase() + config.singular.slice(1)
    const borderLabel = DATA_BORDER_MODES.includes(listState.borderMode)
      ? listState.borderMode[0].toUpperCase() + listState.borderMode.slice(1)
      : 'Default'
    const statisticsConceptLabel =
      DATA_LIST_STATISTICS_CONCEPT_OPTIONS.find(
        option => option.key === activeDataListStatisticsConcept(listState)
      )?.label || 'Balanced cards'
    const tablePrefs =
      listState.view === 'list'
        ? `<div class="data-manage-group-label">Table preferences</div>
      ${dataManageAction('save-layout', 'i-save', 'Save table layout', 'Keep columns, grouping, view and statistics', {disabled: !listState.layoutDirty})}
      ${dataManageAction('reset-layout', 'i-undo', 'Reset table layout', 'Restore the system default')}
      <details class="data-menu data-manage-submenu"><summary>${dataListIcon('i-sliders')}<span class="data-manage-copy"><strong>Borders</strong><small>${borderLabel}</small></span>${dataListIcon('i-next', 10)}</summary><div class="data-menu-popover" role="radiogroup" aria-label="Table borders">${renderDataManageBorderControls(context, listState)}</div></details>
      <details class="data-menu data-manage-submenu"><summary>${dataListIcon('i-lock')}<span class="data-manage-copy"><strong>Freeze columns</strong><small>${listState.frozenColumns.size ? `${listState.frozenColumns.size} frozen` : 'None'}</small></span>${dataListIcon('i-next', 10)}</summary><div class="data-menu-popover" role="group" aria-label="Frozen columns">${renderDataManageFrozenControls(config, listState)}</div></details>`
        : `<div class="data-manage-group-label">Table preferences</div>
      ${dataManageAction('save-layout', 'i-save', 'Save table layout', 'Keep columns, grouping, view and statistics', {disabled: !listState.layoutDirty})}
      ${dataManageAction('reset-layout', 'i-undo', 'Reset table layout', 'Restore the system default')}`
    popover.innerHTML = `
      <div class="data-manage-group-label">Data exchange</div>
      ${dataManageAction('export', 'i-external', 'Export', 'Excel, PDF, CSV or Word')}
      <div class="data-menu-separator"></div>
      <div class="data-manage-group-label">Analysis</div>
      ${dataManageAction('statistics-status', 'i-grid', listState.statisticsVisible ? 'Hide statistics' : 'Show statistics', 'Toggle the statistics summary for this view')}
      <details class="data-menu data-manage-submenu"><summary>${dataListIcon('i-chart')}<span class="data-manage-copy"><strong>Statistics style</strong><small>${encodeHtml(t(statisticsConceptLabel))}</small></span>${dataListIcon('i-next', 10)}</summary><div class="data-menu-popover" role="radiogroup" aria-label="Statistics style">${renderDataManageStatisticsControls(context, listState)}</div></details>
      <div class="data-menu-separator"></div>
      <div class="data-manage-group-label">Reporting</div>
      ${dataManageAction('report', 'i-doc', `${singular} report`, 'Create a configurable report')}
      <div class="data-menu-separator"></div>
      ${tablePrefs}`
  }
  
  function renderDataPageManageMenus() {
    document
      .querySelectorAll('.data-page-manage[data-list-context]')
      .forEach(renderDataPageManageMenu)
  }
  
  function parkRowMenuPopover(details) {
    if (!details.classList.contains('data-row-menu')) return
    const popover = details.querySelector(':scope > .data-menu-popover')
    if (!popover || popover.dataset.parked) return
    popover.dataset.parked = 'true'
    popover.__homeParent = details
    popover.__homeNext = popover.nextSibling
    document.body.appendChild(popover)
  }
  
  function unparkRowMenuPopover(details) {
    const popover = details.querySelector?.(':scope > .data-menu-popover')
    const parked =
      popover || [...document.body.children].find(child => child.__homeParent === details)
    if (!parked?.dataset.parked) return
    delete parked.dataset.parked
    parked.__homeParent.insertBefore(parked, parked.__homeNext)
    parked.__homeParent = null
    parked.__homeNext = null
  }
  
  document.addEventListener(
    'toggle',
    event => {
      const details = event.target.closest?.('.data-menu, .data-page-manage')
      if (!details) return
      if (!details.open) {
        unparkRowMenuPopover(details)
        return
      }
      document
        .querySelectorAll('.data-menu[open], .data-page-manage[open]')
        .forEach(openMenu => {
          if (openMenu !== details && !openMenu.contains(details))
            openMenu.removeAttribute('open')
        })
      parkRowMenuPopover(details)
      requestAnimationFrame(() => positionDataMenu(details))
    },
    true
  )
  
  const repositionOpenDataMenus = () =>
    document
      .querySelectorAll('.data-menu[open], .data-page-manage[open]')
      .forEach(positionDataMenu)
  
  window.addEventListener('resize', repositionOpenDataMenus)
  
  document.addEventListener('scroll', repositionOpenDataMenus, true)
  
  document.addEventListener('click', event => {
    const parkedRowAction = event.target.closest(
      '.data-menu-popover[data-parked] [data-list-row-action]'
    )
    if (parkedRowAction) {
      const homeParent = parkedRowAction.closest('.data-menu-popover').__homeParent
      const context =
        homeParent?.closest('[data-data-list]')?.dataset.dataList ||
        homeParent?.dataset.listContext
      if (context) applyDataListRowAction(context, parkedRowAction)
      parkedRowAction.closest('.data-menu-popover').__homeParent?.removeAttribute('open')
      return
    }
    const manage = event.target.closest('[data-list-manage-action]')
    if (manage) {
      const details = manage.closest('.data-page-manage')
      const context = details.dataset.listContext
      const action = manage.dataset.listManageAction
      if (action === 'save-layout') saveDataListLayout(context)
      else if (action === 'reset-layout') resetDataListLayout(context)
      else if (action === 'statistics-status')
        applyDataListToolbarCommand(context, action, [...getDataListState()[context].selected][0])
      else if (action === 'export') openDataExport(context)
      else {
        toast({
          tone: 'ok',
          title: `${manage.querySelector('strong')?.textContent || action} is ready for integration`,
        })
      }
      details.removeAttribute('open')
      return
    }
    const activeMenu = event.target.closest('.data-menu, .data-page-manage')
    if (!activeMenu) {
      document
        .querySelectorAll('.data-menu[open], .data-page-manage[open]')
        .forEach(details => details.removeAttribute('open'))
    }
  })
  
  document.addEventListener('change', event => {
    const border = event.target.closest('[data-list-manage-border]')
    const frozen = event.target.closest('[data-list-manage-frozen]')
    const statisticsConcept = event.target.closest('[data-list-manage-statistics-concept]')
    if (!border && !frozen && !statisticsConcept) return
    const details = event.target.closest('.data-page-manage')
    const context = details?.dataset.listContext
    if (!context) return
    const listState = getDataListState()[context]
    if (border) listState.borderMode = border.dataset.listManageBorder
    else if (frozen) {
      const key = frozen.dataset.listManageFrozen
      if (frozen.checked) listState.frozenColumns.add(key)
      else listState.frozenColumns.delete(key)
    } else if (statisticsConcept) {
      listState.statisticsConcept = statisticsConcept.dataset.listManageStatisticsConcept
      computeDataListLayoutDirty(listState)
    }
    renderDataList(context)
    renderDataPageManageMenu(details)
    details.querySelectorAll('.data-manage-submenu').forEach(submenu => {
      if (
        submenu.querySelector(
          border
            ? '[data-list-manage-border]'
            : frozen
              ? '[data-list-manage-frozen]'
              : '[data-list-manage-statistics-concept]'
        )
      ) {
        submenu.setAttribute('open', '')
        requestAnimationFrame(() => positionDataMenu(submenu))
      }
    })
    positionDataMenu(details)
  })
  
  function bind() {
  renderDataPageManageMenus()
  }

  return {positionDataMenu, applyFrozenDataListColumns, resolvedDataListStatisticsConcept, activeDataListStatisticsConcept, renderDataPageManageMenu, bind}
}
