import {encodeHtml} from '../../core/locale.js'
import {DATA_LIST_DEFAULT_PAGE_SIZE} from './model.js'
import {renderShellPager as renderSharedShellPager, renderShellRecordPager as renderSharedShellRecordPager} from './pagination.js'

const DATA_LIST_FOOTER_CLASS =
  'fnav fnav-list empty:hidden flex flex-wrap items-center gap-3 border-t border-line bg-surface px-4 py-[9px]'

/** Owns list pager state and its DOM bindings. */
export function createListPager({t, applyDataListRowAction, getDataListState, renderDataList, dataListIcon, dataListRows, renderDataListAdaptiveFooterActions} = {}) {
  const DATA_LIST_FNAV_IDS = {
    invoice: 'list-fnav',
    customer: 'customer-list-fnav',
    geo: 'geo-list-fnav',
  }

  const shellPagerDeps = {t, encodeHtml, dataListIcon}

  function renderShellPager(context, filteredCount) {
    return renderSharedShellPager(context, filteredCount, getDataListState()[context], shellPagerDeps)
  }

  function renderShellRecordPager(context, filteredCount) {
    return renderSharedShellRecordPager(context, filteredCount, getDataListState()[context], {
      ...shellPagerDeps,
      dataListRows,
      renderDataListAdaptiveFooterActions,
    })
  }

  function activeAdaptiveListContext() {
    return Object.keys(getDataListState()).find(context => {
      const listState = getDataListState()[context]
      return listState.view === 'adaptive' && listState.canvas?.offsetParent
    })
  }

  document.addEventListener('keydown', event => {
    if (!event.altKey || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
    const target = event.target
    if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
    const context = activeAdaptiveListContext()
    if (!context) return
    const listState = getDataListState()[context]
    const filteredCount = dataListRows(context).length
    const nextPage = event.key === 'ArrowRight' ? listState.page + 1 : listState.page - 1
    if (nextPage < 1 || nextPage > filteredCount) return
    event.preventDefault()
    listState.page = nextPage
    renderDataList(context, {skipStatsAnimation: true})
  })

  function syncShellListPager(context, filteredCount, footer) {
    const mount = footer || document.getElementById(DATA_LIST_FNAV_IDS[context])
    if (!mount) return
    mount.className = DATA_LIST_FOOTER_CLASS
    const listState = getDataListState()[context]
    mount.hidden = listState.view === 'kanban'
    if (mount.hidden) return
    mount.innerHTML =
      listState.view === 'adaptive'
        ? renderShellRecordPager(context, filteredCount)
        : renderShellPager(context, filteredCount)
    if (mount.dataset.wired) return
    mount.dataset.wired = 'true'
    mount.addEventListener('click', event => {
      const recordButton = event.target.closest('[data-list-record]')
      if (recordButton) {
        if (recordButton.disabled) return
        listState.page = Number(recordButton.dataset.listRecord) || 1
        renderDataList(context, {skipStatsAnimation: true})
        return
      }
      const pageButton = event.target.closest('[data-list-page]')
      if (pageButton) {
        if (pageButton.disabled) return
        listState.page = Number(pageButton.dataset.listPage) || 1
        renderDataList(context, {skipStatsAnimation: true})
        return
      }
      const rowAction = event.target.closest('[data-list-row-action]')
      if (rowAction) applyDataListRowAction(context, rowAction)
    })
    mount.addEventListener('change', event => {
      const recordInput = event.target.closest('.pg-i')
      if (recordInput) {
        const mountEl = event.currentTarget
        const total = Number(recordInput.max) || 1
        const next = Math.min(Math.max(1, Number(recordInput.value) || 1), total)
        listState.page = next
        renderDataList(context, {skipStatsAnimation: true})
        return
      }
      const jumpInput = event.target.closest('.data-pagination-jump-input')
      if (jumpInput) {
        const totalPages = Number(jumpInput.max) || 1
        listState.page = Math.min(Math.max(1, Number(jumpInput.value) || 1), totalPages)
        renderDataList(context, {skipStatsAnimation: true})
        return
      }
      const sizeSelect = event.target.closest('[data-list-page-size]')
      if (!sizeSelect) return
      listState.pageSize = Number(sizeSelect.value) || DATA_LIST_DEFAULT_PAGE_SIZE
      listState.page = 1
      renderDataList(context, {skipStatsAnimation: true})
    })
  }

  return {syncShellListPager}
}
