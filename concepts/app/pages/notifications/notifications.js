import {encodeHtml} from '../../core/locale.js'
import {DATA_LIST_CONFIG} from '../../components/data-list/columns.js'
import {NOTIFICATION_DETAILS} from '../../prototype/fixtures/messages.js'
import {notificationItems, saveNotificationState} from '../../components/notifications/state.js'
import {notificationActionButtons} from '../../components/notifications/actions.js'

function notificationRows() {
  return notificationItems().map(row => ({
    ...row,
    type: row.type || 'System notification',
    source: row.source || 'Sales',
    day: row.time === 'Yesterday' ? 'Yesterday' : row.time.endsWith('d') ? 'Earlier' : 'Today',
  }))
}

function money(value) {
  return Number(value).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})
}

/** Owns the Notifications page: the shared data-list plus the detail modal. */
export function createNotificationsPage({t, listInstance, detailList, dialogs}) {
  const rows = notificationRows()
  const selectionActions = [{command: 'mark-unread', label: 'Mark as unread', icon: 'i-bell'}]
  DATA_LIST_CONFIG.notifications.selectionActions = state =>
    rows.some(row => state.selected.has(String(row.id)) && !row.unread) ? selectionActions : []
  let modal = null
  let showUnreadOnly = false
  let activeId = null
  let bound = false

  function elements() {
    modal = document.getElementById('notification-modal')
  }

  function syncRows() {
    const state = listInstance?.getState()
    if (state) state.unreadOnly = showUnreadOnly
    const next = showUnreadOnly ? rows.filter(row => row.unread) : rows
    listInstance?.model.setRows(next)
    listInstance?.render()
  }

  function updateNotification(id, action) {
    const row = rows.find(item => item.id === id)
    if (!row) return
    if (action === 'read') row.unread = true
    else if (action === 'pin') row.pinned = !row.pinned
    else return
    saveNotificationState(row)
    syncRows()
    if (activeId === id) document.getElementById('notification-modal-actions').innerHTML = notificationActionButtons(row)
  }

  function summaryMarkup(facts) {
    return `<dl class="jgrid-head m-0 mb-3! grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-[var(--line-2)] [padding:var(--ds-space-150)_var(--ds-space-200)] sm:grid-cols-3">${facts
      .map(
        ([label, value]) =>
          `<div><dt class="text-xs text-muted">${encodeHtml(t(label))}</dt><dd class="mt-0.5 font-semibold text-ink">${encodeHtml(String(value))}</dd></div>`
      )
      .join('')}</dl>`
  }

  function messageMarkup(row) {
    const body = row.body || row.what
    return `<div class="rounded-lg border border-[var(--line)] bg-white p-4 text-sm leading-6 text-ink">${encodeHtml(body)}</div>`
  }

  function totalsMarkup(detail) {
    if (detail.totals === 'imbalance') {
      const difference = Number(detail.debit || 0) - Number(detail.credit || 0)
      return `<div class="jtotals mt-2! flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--line-2)] [padding:var(--ds-space-100)_var(--ds-space-200)]">
        <dl class="m-0! grid grid-cols-3 gap-x-8">
          <div><dt class="text-xs text-muted">${t('Debit')}</dt><dd class="font-semibold">${money(detail.debit)}</dd></div>
          <div><dt class="text-xs text-muted">${t('Credit')}</dt><dd class="font-semibold">${money(detail.credit)}</dd></div>
          <div><dt class="text-xs text-muted">${t('Difference')}</dt><dd class="font-semibold">${money(difference)}</dd></div>
        </dl>
        <span role="status" class="badge warn inline-flex items-center gap-1">${t('Unbalanced')}</span>
      </div>`
    }
    if (detail.totals !== 'balance') return ''
    const total = detail.rows.reduce((sum, row) => sum + Number(row.balance || 0), 0)
    const contrary = total !== 0
    return `<div class="jtotals mt-2! flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--line-2)] [padding:var(--ds-space-100)_var(--ds-space-200)]">
      <dl class="m-0! grid grid-cols-2 gap-x-8">
        <div><dt class="text-xs text-muted">${t('Accounts')}</dt><dd class="font-semibold">${detail.rows.length}</dd></div>
        <div><dt class="text-xs text-muted">${t('Net balance')}</dt><dd class="font-semibold">${money(total)}</dd></div>
      </dl>
      <span role="status" class="badge ${contrary ? 'warn' : 'ok'} inline-flex items-center gap-1">${contrary ? t('Contrary') : t('Balanced')}</span>
    </div>`
  }

  function hideDetailList() {
    detailList?.deactivate()
    const canvas = document.getElementById('notification-detail-canvas')
    const footer = document.getElementById('notification-detail-fnav')
    if (canvas) canvas.hidden = true
    if (footer) footer.hidden = true
    const totals = document.getElementById('notification-modal-totals')
    if (totals) totals.innerHTML = ''
  }

  function showDetailList(detail) {
    const config = DATA_LIST_CONFIG.notificationDetail
    const canvas = document.getElementById('notification-detail-canvas')
    const footer = document.getElementById('notification-detail-fnav')
    config.columns = detail.columns
    config.label = detail.label
    config.singular = detail.singular
    config.key = 'id'
    config.filterFields = detail.columns.slice(0, 3).map(column => ({
      key: column.key,
      label: column.label,
      icon: 'i-doc',
      type: 'text',
    }))
    const state = detailList.getState()
    state.columnOrder = detail.columns.map(column => column.key)
    state.savedColumnOrder = state.columnOrder.slice()
    state.hiddenColumns.clear()
    state.savedHiddenColumns = new Set()
    state.sortKey = 'id'
    state.sortDirection = 'asc'
    state.view = 'list'
    state.search = ''
    state.fieldFilters = []
    state.layoutDirty = false
    canvas.hidden = false
    footer.hidden = false
    detailList.setRows(detail.rows)
    detailList.activate({root: canvas, footer})
    document.getElementById('notification-modal-totals').innerHTML = totalsMarkup(detail)
  }

  function openNotification(id) {
    const row = rows.find(item => item.id === id)
    if (!row || !modal) return
    activeId = id
    const detail = row.detail ? NOTIFICATION_DETAILS[row.detail] : null
    const dlg = document.getElementById('notification-modal-dlg')
    const icon = document.getElementById('notification-modal-icon')
    const summary = document.getElementById('notification-modal-summary')
    const message = document.getElementById('notification-modal-message')
    icon?.setAttribute('href', `#${row.icon || 'i-bell'}`)
    document.getElementById('notification-modal-note').textContent = row.detail || row.type === 'Warning'
      ? t('Reading this notification does not resolve the underlying issue.')
      : t('Read-only. Opened from Notifications.')
    if (detail && detailList) {
      dlg.classList.add('wide')
      dlg.dataset.tone = 'info'
      document.getElementById('notification-modal-title').textContent = row.what
      document.getElementById('notification-modal-subtitle').textContent = t('Read-only list')
      summary.hidden = false
      summary.innerHTML = summaryMarkup(
        detail.facts || [
          ['Count', detail.rows.length],
          ['Source', row.who],
          ['As of', row.time],
        ]
      )
      message.hidden = true
      message.innerHTML = ''
      showDetailList(detail)
    } else {
      dlg.classList.remove('wide')
      dlg.dataset.tone = row.type === 'Warning' ? 'warn' : 'default'
      document.getElementById('notification-modal-title').textContent = row.what
      document.getElementById('notification-modal-subtitle').textContent = `${row.who} · ${row.time}`
      summary.hidden = false
      summary.innerHTML = summaryMarkup(
        row.facts || [
          ['From', row.who],
          ['Type', row.type],
          ['Received', row.time],
        ]
      )
      message.hidden = false
      message.innerHTML = messageMarkup(row)
      hideDetailList()
    }
    if (row.unread) {
      row.unread = false
      saveNotificationState(row)
      syncRows()
    }
    document.getElementById('notification-modal-actions').innerHTML = notificationActionButtons(row)
    modal.hidden = false
    modal.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
    dialogs.trapFocus(dlg)
  }

  function closeModal() {
    if (!modal || modal.hidden) return
    const closedId = activeId
    hideDetailList()
    activeId = null
    modal.hidden = true
    modal.classList.add('hidden')
    document.body.style.overflow = ''
    dialogs.releaseFocus()
    const active = document.activeElement
    if (closedId != null && (active === document.body || modal.contains(active))) {
      document.querySelector(`#notifications-list-canvas [data-list-open-record="${CSS.escape(String(closedId))}"]`)?.focus()
    }
  }

  function bind() {
    if (bound) return
    elements()
    document.getElementById('notifications-list-canvas')?.addEventListener('change', event => {
      if (event.target.id !== 'notifications-page-unread-only') return
      showUnreadOnly = event.target.checked
      syncRows()
    })
    function handleAction(event) {
      const bulk = event.target.closest('[data-list-action]')
      if (bulk && bulk.dataset.listAction === 'mark-unread') {
        event.preventDefault()
        event.stopPropagation()
        const state = listInstance.getState()
        for (const row of rows) {
          if (!state.selected.has(String(row.id))) continue
          row.unread = true
          saveNotificationState(row)
        }
        const count = state.selected.size
        state.selected.clear()
        syncRows()
        let status = document.getElementById('notifications-bulk-status')
        if (!status) {
          status = document.createElement('div')
          status.id = 'notifications-bulk-status'
          status.className = 'sr-only'
          status.setAttribute('role', 'status')
          document.getElementById('notifications-list-canvas').after(status)
        }
        status.textContent = `${count} ${t('notifications')}: ${t('Marked as unread')}`
        return
      }
      const button = event.target.closest('[data-notification-action]')
      if (!button) return
      event.preventDefault()
      event.stopPropagation()
      updateNotification(button.dataset.notificationId, button.dataset.notificationAction)
    }
    document.getElementById('notifications-list-canvas')?.addEventListener('click', handleAction, true)
    document.getElementById('notification-modal-actions')?.addEventListener('click', handleAction)
    document.getElementById('notification-modal-close')?.addEventListener('click', closeModal)
    document.getElementById('notification-modal-close-btn')?.addEventListener('click', closeModal)
    modal?.addEventListener('click', event => {
      if (event.target === modal) closeModal()
    })
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeModal()
    })
    document.addEventListener('notifications:open', event => openNotification(event.detail?.id))
    // Render action hints outside table/dialog scrollports so sticky cells cannot clip them.
    const tooltip = document.createElement('div')
    tooltip.id = 'notification-action-tooltip'
    tooltip.className = 'tip'
    tooltip.setAttribute('role', 'tooltip')
    document.body.append(tooltip)
    let tooltipButton = null
    function hideActionTooltip() {
      tooltipButton?.removeAttribute('aria-describedby')
      tooltipButton = null
      tooltip.style.display = 'none'
    }
    function showActionTooltip(event) {
      const button = event.target.closest('[data-notification-action]')
      if (!button) return
      hideActionTooltip()
      tooltipButton = button
      tooltip.textContent = button.getAttribute('aria-label')
      button.setAttribute('aria-describedby', tooltip.id)
      Object.assign(tooltip.style, {display: 'block', position: 'fixed', opacity: '1', translate: 'none', zIndex: '300', inset: 'auto', left: '0px', top: '0px'})
      const rect = button.getBoundingClientRect()
      const width = tooltip.offsetWidth
      const height = tooltip.offsetHeight
      tooltip.style.left = `${Math.max(8, Math.min(innerWidth - width - 8, rect.left + (rect.width - width) / 2))}px`
      tooltip.style.top = `${rect.bottom + height + 14 > innerHeight ? rect.top - height - 6 : rect.bottom + 6}px`
    }
    for (const root of [document.getElementById('notifications-list-canvas'), document.getElementById('notification-modal-actions')]) {
      root?.addEventListener('pointerover', showActionTooltip)
      root?.addEventListener('focusin', showActionTooltip)
      root?.addEventListener('pointerout', hideActionTooltip)
      root?.addEventListener('focusout', hideActionTooltip)
      root?.addEventListener('click', hideActionTooltip)
    }
    document.addEventListener('scroll', hideActionTooltip, true)
    window.addEventListener('resize', hideActionTooltip)
    document.addEventListener('keydown', event => { if (event.key === 'Escape') hideActionTooltip() })
    bound = true
  }

  return {
    id: 'notifications',
    roots: {root: document.querySelector('.notifications-list-view')},
    activate() {
      bind()
      const state = listInstance?.getState()
      const order = ['what', 'source', 'actions']
      if (state && (state.columnOrder.join(',') !== order.join(',') || state.hiddenColumns.size)) {
        state.columnOrder = order
        state.savedColumnOrder = order.slice()
        state.hiddenColumns.clear()
        state.savedHiddenColumns = new Set()
        state.layoutDirty = false
        listInstance.model.saveLayout()
      }
      const root = document.getElementById('notifications-list-canvas')
      const footer = document.getElementById('notifications-list-fnav')
      syncRows()
      listInstance?.activate({root, footer})
    },
    deactivate() {
      closeModal()
      listInstance?.deactivate()
    },
    dispose() {
      closeModal()
    },
  }
}
