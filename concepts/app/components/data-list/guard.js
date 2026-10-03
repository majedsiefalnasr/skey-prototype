

/** Owns list guard state and its DOM bindings. */
export function createListGuard({trapFocus, releaseFocus, saveDataListLayout, getDataListState, toast} = {}) {
  const listLayoutGuard = document.getElementById('list-layout-guard')

  let listLayoutGuardContext = ''

  let listLayoutGuardAfter = null

  function visibleDirtyDataListContext() {
    if (
      document.querySelector('.list-view')?.hidden === false &&
      getDataListState().invoice.layoutDirty
    )
      return 'invoice'
    if (
      document.querySelector('.customer-list-view')?.hidden === false &&
      getDataListState().customer.layoutDirty
    )
      return 'customer'
    if (
      document.querySelector('.geo-list-view')?.hidden === false &&
      getDataListState().geo.layoutDirty
    )
      return 'geo'
    return ''
  }

  function askListLayoutGuard(context, after) {
    listLayoutGuardContext = context
    listLayoutGuardAfter = after
    listLayoutGuard.classList.add('open')
    setTimeout(() => trapFocus(listLayoutGuard.querySelector('.dlg')), 0)
  }

  function guardDataListLeave(after) {
    const context = visibleDirtyDataListContext()
    if (!context) return false
    askListLayoutGuard(context, after)
    return true
  }

  function closeListLayoutGuard() {
    listLayoutGuard.classList.remove('open')
    listLayoutGuardContext = ''
    listLayoutGuardAfter = null
    releaseFocus()
    // Notify asynchronously so a synchronous `after?.()` callback in the
    // closing action (discard/save) settles its navigation promise first;
    // a close with no `after` (Keep editing, backdrop click) means the
    // pending navigation must abort rather than hang forever.
    queueMicrotask(() => listLayoutGuard.dispatchEvent(new CustomEvent('guardclosed')))
  }

  document.getElementById('list-layout-stay').addEventListener('click', closeListLayoutGuard)

  document.getElementById('list-layout-discard').addEventListener('click', () => {
    const context = listLayoutGuardContext
    const after = listLayoutGuardAfter
    const listState = getDataListState()[context]
    listState.columnOrder = [...listState.savedColumnOrder]
    listState.hiddenColumns = new Set(listState.savedHiddenColumns)
    listState.groupBy = [...listState.savedGroupBy]
    listState.view = listState.savedView
    listState.statisticsVisible = listState.savedStatisticsVisible
    listState.statisticsConcept = listState.savedStatisticsConcept
    listState.layoutDirty = false
    closeListLayoutGuard()
    toast?.({
      tone: 'ok',
      title: 'Table layout changes discarded',
      body: 'Columns, grouping and the view are back to the saved layout.',
    })
    after?.()
  })

  document.getElementById('list-layout-save').addEventListener('click', () => {
    const context = listLayoutGuardContext
    const after = listLayoutGuardAfter
    if (!saveDataListLayout(context)) return
    closeListLayoutGuard()
    after?.()
  })

  listLayoutGuard.addEventListener('click', event => {
    if (event.target === listLayoutGuard) closeListLayoutGuard()
  })

  function requestPageLeave(fromId) {
    if (fromId === 'list' || fromId === 'customers-list' || fromId === 'geo-list') {
      const context = {list: 'invoice', 'customers-list': 'customer', 'geo-list': 'geo'}[fromId]
      if (visibleDirtyDataListContext() !== context) return true
      return new Promise(resolve => {
        let settled = false
        const done = allowed => {
          if (settled) return
          settled = true
          listLayoutGuard.removeEventListener('guardclosed', onClosed)
          resolve(allowed)
        }
        const onClosed = () => done(false)
        listLayoutGuard.addEventListener('guardclosed', onClosed)
        askListLayoutGuard(context, () => done(true))
      })
    }
    return true
  }

  return {visibleDirtyDataListContext, guardDataListLeave, requestPageLeave}
}
