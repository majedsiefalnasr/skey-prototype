import {encodeHtml} from '../../core/locale.js'
import {DATA_LIST_CONFIG} from './columns.js'
import {renderDataListColumnHeaderMenu as renderSharedDataListColumnHeaderMenu, applyDataListColumnHeaderAction as applySharedDataListColumnHeaderAction} from './menus.js'

/** Owns context menu state and its DOM bindings. */
export function createContextMenu({t, toast, renderDataListSelectionActions, computeDataListLayoutDirty, applyDataListRowAction, applyDataListToolbarCommand, getDataListState, dataListIcon, rowMenuItems, refreshDataListForContext} = {}) {
  const dataListContextMenu = document.getElementById('data-list-context-menu')

  const DATA_LIST_COPYABLE_COLUMNS = {
    invoice: ['no', 'seq', 'total'],
    customer: ['customerNo'],
    geo: ['code'],
  }

  function closeDataListContextMenu() {
    dataListContextMenu.hidden = true
    dataListContextMenu.innerHTML = ''
    delete dataListContextMenu.dataset.context
    delete dataListContextMenu.dataset.rowKey
    delete dataListContextMenu.dataset.columnKey
  }

  function positionDataListContextMenu(x, y) {
    const rect = dataListContextMenu.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width - 8
    const maxY = window.innerHeight - rect.height - 8
    dataListContextMenu.style.left = `${Math.max(8, Math.min(x, maxX))}px`
    dataListContextMenu.style.top = `${Math.max(8, Math.min(y, maxY))}px`
  }

  function openDataListContextMenu(x, y, innerHtml, context, rowKey = '', columnKey = '') {
    dataListContextMenu.innerHTML = innerHtml
    dataListContextMenu.dataset.context = context
    if (rowKey) dataListContextMenu.dataset.rowKey = rowKey
    else delete dataListContextMenu.dataset.rowKey
    if (columnKey) dataListContextMenu.dataset.columnKey = columnKey
    else delete dataListContextMenu.dataset.columnKey
    dataListContextMenu.hidden = false
    positionDataListContextMenu(x, y)
    dataListContextMenu
      .querySelector('[role="menuitem"], button')
      ?.focus({preventScroll: true})
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {})
    } else {
      const helper = document.createElement('textarea')
      helper.value = text
      helper.style.position = 'fixed'
      helper.style.opacity = '0'
      document.body.appendChild(helper)
      helper.select()
      document.execCommand('copy')
      helper.remove()
    }
    toast({tone: 'ok', title: `Copied "${text}"`})
  }

  const sharedMenuDeps = {t, encodeHtml, dataListIcon}

  function renderDataListColumnHeaderMenu(context, column) {
    const listState = getDataListState()[context]
    return renderSharedDataListColumnHeaderMenu(DATA_LIST_CONFIG[context], column, listState, sharedMenuDeps)
  }

  function applyDataListColumnHeaderAction(context, columnKey, action) {
    const listState = getDataListState()[context]
    const config = DATA_LIST_CONFIG[context]
    const result = applySharedDataListColumnHeaderAction(listState, config, columnKey, action)
    if (!result) return
    if (result.dirty) computeDataListLayoutDirty(listState)
    refreshDataListForContext(context)
  }

  document.addEventListener('contextmenu', event => {
    const header = event.target.closest('th[data-col]')
    if (header) {
      const canvas = event.target.closest('[data-data-list]')
      if (!canvas) return
      const context = canvas.dataset.dataList
      const config = DATA_LIST_CONFIG[context]
      const column = config.columns.find(item => item.key === header.dataset.col)
      if (!column) return
      event.preventDefault()
      openDataListContextMenu(
        event.clientX,
        event.clientY,
        renderDataListColumnHeaderMenu(context, column),
        context,
        '',
        column.key
      )
      return
    }
    const cell = event.target.closest('td[data-col]')
    const rowEl = event.target.closest('[data-list-row-key]')
    const canvas = event.target.closest('[data-data-list]')
    if (!canvas || !rowEl) return
    const context = canvas.dataset.dataList
    const listState = getDataListState()[context]
    const config = DATA_LIST_CONFIG[context]
    const key = rowEl.dataset.listRowKey

    const copyEntry =
      cell && (DATA_LIST_COPYABLE_COLUMNS[context] || []).includes(cell.dataset.col)
        ? `<button type="button" role="menuitem" data-context-copy="${encodeHtml(cell.textContent.trim())}">${dataListIcon('i-doc', 13)} ${t('Copy value', 'Copy value')}</button><div class="data-menu-separator"></div>`
        : ''

    if (listState.selected.size > 1 && listState.selected.has(key)) {
      event.preventDefault()
      const actions = renderDataListSelectionActions(config, listState)
      openDataListContextMenu(event.clientX, event.clientY, `${copyEntry}${actions}`, context)
      return
    }

    const row = config.rows.find(record => String(record[config.key]) === key)
    if (!row) return
    event.preventDefault()
    const view = rowEl.closest('.data-kanban-card') ? 'kanban' : listState.view
    const rowActionsHtml = rowMenuItems(context, row, view)
    openDataListContextMenu(
      event.clientX,
      event.clientY,
      `${copyEntry}${rowActionsHtml}`,
      context,
      key
    )
  })

  dataListContextMenu.addEventListener('click', event => {
    const copy = event.target.closest('[data-context-copy]')
    if (copy) {
      copyTextToClipboard(copy.dataset.contextCopy)
      closeDataListContextMenu()
      return
    }
    const rowAction = event.target.closest('[data-list-row-action]')
    if (rowAction) {
      const context = dataListContextMenu.dataset.context
      closeDataListContextMenu()
      if (context) applyDataListRowAction(context, rowAction)
      return
    }
    const toolbarAction = event.target.closest('[data-list-action]')
    if (toolbarAction) {
      const context = dataListContextMenu.dataset.context
      const listState = context && getDataListState()[context]
      const selectedKey = listState ? [...listState.selected][0] : ''
      closeDataListContextMenu()
      if (context)
        applyDataListToolbarCommand(context, toolbarAction.dataset.listAction, selectedKey)
      return
    }
    const columnAction = event.target.closest('[data-context-column-action]')
    if (columnAction && !columnAction.disabled) {
      const context = dataListContextMenu.dataset.context
      const columnKey = dataListContextMenu.dataset.columnKey
      const action = columnAction.dataset.contextColumnAction
      closeDataListContextMenu()
      if (context && columnKey) applyDataListColumnHeaderAction(context, columnKey, action)
    }
  })

  document.addEventListener('click', event => {
    if (!dataListContextMenu.hidden && !dataListContextMenu.contains(event.target))
      closeDataListContextMenu()
  })

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !dataListContextMenu.hidden) closeDataListContextMenu()
  })

  window.addEventListener('scroll', closeDataListContextMenu, true)

  window.addEventListener('resize', closeDataListContextMenu)

  return {}
}
