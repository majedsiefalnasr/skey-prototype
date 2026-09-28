import {encodeHtml} from '../../core/locale.js'
import {DATA_LIST_CONFIG} from './columns.js'
import {renderDataListRowActions as renderSharedDataListRowActions, renderDataListAdaptiveFooterActions as renderSharedDataListAdaptiveFooterActions, renderDataListHeader as renderSharedDataListHeader, renderDataListRecordRows as renderSharedDataListRecordRows, renderDataListBody as renderSharedDataListBody, renderDataListCards as renderSharedDataListCards, renderDataListAdaptiveRecord as renderSharedDataListAdaptiveRecord, dataListDetailsId as sharedDataListDetailsId} from './views.js'
import {renderDataListSelectionActions as sharedRenderDataListSelectionActions, DATA_MENU_POPOVER_CLASS} from './list.js'

/** Owns list views state and its DOM bindings. */
export function createListViews({t, computeDataListLayoutDirty, getDataListState, dataListIcon, dataListRows, invoiceStatusBadge, renderDataRecordCard, refreshDataListForContext, renderCustomerAvatar, invoiceStatusTransitions} = {}) {
  function renderDataListSelectionActions(config, listState) {
    return sharedRenderDataListSelectionActions(config, listState, {t, dataListIcon})
  }

  // Organization Center's status badge: the default/active state renders
  // nothing (the user asked twice not to show "Active" as a badge or
  // text), only Locked/Dormant/Current/Protected/Waiting-etc. states get
  // a badge — same rule the org page's row data carries via
  // canPerformOrganizationAction()-driven flags (access.js), computed
  // once in organization.js's getData() before rows reach the data-list
  // engine, not re-derived here.
  function orgStatusBadge(value, tone) {
    if (!value || value === 'Active') return ''
    return `<span class="badge ${tone}">${encodeHtml(String(value))}</span>`
  }

  // Revoke/Terminate render as ordinary "State" column cell content —
  // noRowActions:true contexts (orgAppSessions/orgDbSessions, like
  // journal/screenParameters) have no engine-native actions column, so
  // the button lives here instead. row.canRevoke/row.canTerminate are
  // precomputed in organization.js via canPerformOrganizationAction
  // before the rows reach this table, keeping that access-policy import
  // out of this shared components/ module.
  function orgSessionStateCell(context, row) {
    const kind = context === 'orgAppSessions' ? 'revoke' : 'terminate'
    const allowed = context === 'orgAppSessions' ? row.canRevoke : row.canTerminate
    const stateBadge =
      context === 'orgAppSessions'
        ? row.current
          ? '<span class="badge ok">Current</span>'
          : row.protected
            ? '<span class="badge gray">Protected</span>'
            : ''
        : `<span class="badge ${row.state === 'Waiting' ? 'warn' : 'ok'}">${encodeHtml(String(row.state))}</span>`
    if (!allowed) {
      const reason =
        context === 'orgAppSessions'
          ? row.current
            ? 'Current session'
            : row.protected
              ? 'System session'
              : 'Restricted'
          : row.current
            ? 'Current connection'
            : 'Protected'
      return `<div class="flex items-center justify-between gap-2">${stateBadge}<span class="text-xs text-muted">${encodeHtml(reason)}</span></div>`
    }
    const label = kind === 'revoke' ? 'Revoke' : 'Terminate'
    return `<div class="flex items-center justify-between gap-2">${stateBadge}<button type="button" class="lbtn out" data-organization-session-action="${kind}" data-session-id="${encodeHtml(String(row.id))}">${label}</button></div>`
  }

  function renderDataListCell(context, row, column) {
    const value = row[column.key]
    if (context === 'customer' && column.key === 'avatar') {
      return renderCustomerAvatar(row, {encodeHtml})
    }
    if (
      (context === 'customer' && column.key === 'customerNo') ||
      (context === 'invoice' && column.key === 'no') ||
      (context === 'geo' && column.key === 'code')
    ) {
      return `<button class="customer-record-link text-accent! [text-decoration:underline] [text-underline-offset:2px] [&:hover]:[color:var(--accent-hover)] [&:focus-visible]:[outline:2px_solid_var(--accent)]" type="button" data-list-open-record="${encodeHtml(String(value))}" aria-label="Open ${context} ${encodeHtml(String(value))}">${encodeHtml(String(value))}</button>`
    }
    if (['customer', 'geo'].includes(context) && column.key === 'active') {
      return value ? '' : '<span class="badge danger">Inactive</span>'
    }
    if (context === 'invoice' && column.key === 'status') {
      return invoiceStatusBadge(value)
    }
    if (context === 'orgUsers' && column.key === 'name') {
      return `<strong>${encodeHtml(String(value))}</strong><small class="block text-muted">${encodeHtml(String(row.team ?? ''))}</small>`
    }
    if (context === 'orgUsers' && column.key === 'status') {
      return orgStatusBadge(value, value === 'Locked' ? 'danger' : 'gray')
    }
    if (context === 'orgAppSessions' && column.key === 'user') {
      return `<strong>${encodeHtml(String(value))}</strong><small class="block text-muted">${encodeHtml(String(row.role ?? ''))}</small>`
    }
    if (context === 'orgAppSessions' && column.key === 'device') {
      return `${encodeHtml(String(value))}<small class="block text-muted">${encodeHtml(String(row.location ?? ''))}</small>`
    }
    if ((context === 'orgAppSessions' || context === 'orgDbSessions') && column.key === 'state') {
      return orgSessionStateCell(context, row)
    }
    if (context === 'orgDbSessions' && column.key === 'id') {
      return `<strong>${encodeHtml(String(value))}</strong><small class="block text-muted">${encodeHtml(String(row.account ?? ''))}</small>`
    }
    if (context === 'orgAudit' && column.key === 'action') {
      return `<strong>${encodeHtml(String(value))}</strong><small class="block text-muted">${encodeHtml(String(row.object ?? ''))}</small>`
    }
    if (context === 'orgAudit' && column.key === 'result') {
      return `<span class="badge ${value === 'Success' ? 'ok' : value === 'Denied' ? 'danger' : 'warn'}">${encodeHtml(String(value))}</span>`
    }
    if (context === 'orgStaff' && column.key === 'name') {
      return `<strong>${encodeHtml(String(value))}</strong><small class="block text-muted">${encodeHtml(String(row.team ?? ''))}</small>`
    }
    if (context === 'orgStaff' && column.key === 'slaBreaches') {
      return value ? `<span class="badge warn">${encodeHtml(String(value))}</span>` : '<span class="badge ok">0</span>'
    }
    return encodeHtml(String(value ?? ''))
  }

  /* Statuses the table row's own menu can offer — posting and cancellation
     stay record-only (they need fields a table row doesn't carry), so only
     the reasoned/simple transitions from status-dialogs.js's
     INVOICE_STATUS_ACTIONS are listed here. */
  const INVOICE_ROW_MENU_STATUSES = ['Open', 'Pending', 'Returned']

  function customerStatusMenuItem(row) {
    return row.active
      ? `<button class="text-danger" type="button" role="menuitem" data-list-row-action="change-status">${dataListIcon('i-archive')} Deactivate customer</button>`
      : `<button type="button" role="menuitem" data-list-row-action="change-status">${dataListIcon('i-check')} Activate customer</button>`
  }

  function geoStatusMenuItem(row) {
    return row.active
      ? `<button class="text-danger" type="button" role="menuitem" data-list-row-action="change-status">${dataListIcon('i-archive')} ${t('Deactivate', 'Deactivate')}</button>`
      : `<button type="button" role="menuitem" data-list-row-action="change-status">${dataListIcon('i-check')} ${t('Activate', 'Activate')}</button>`
  }

  function invoiceStatusMenuItem(row) {
    const next = (invoiceStatusTransitions?.() || {})[row.status] || []
    const offered = next.filter(status => INVOICE_ROW_MENU_STATUSES.includes(status))
    if (!offered.length) return ''
    const options = offered
      .map(
        status =>
          `<button type="button" role="menuitem" data-list-row-action="change-status" data-status-target="${encodeHtml(status)}">${encodeHtml(status)}</button>`
      )
      .join('')
    return `<details class="data-menu data-manage-submenu relative"><summary class="flex w-full min-h-[32px] items-center gap-[9px] rounded-[5px] px-2 py-1.5 text-[14px]! font-normal whitespace-normal text-ink cursor-pointer list-none [&::-webkit-details-marker]:hidden [&_svg:last-child]:ms-auto [&_svg:last-child]:text-muted rtl:[&_svg:last-child]:scale-x-[-1]">${dataListIcon('i-flow', 14)}<span>Change status</span>${dataListIcon('i-next', 10)}</summary><div class="${DATA_MENU_POPOVER_CLASS} min-w-[160px] gap-0.5" role="menu">${options}</div></details>`
  }

  function rowMenuItems(context, row, view) {
    if (view === 'adaptive-footer') {
      const contextActions =
        context === 'customer'
          ? `<button type="button" role="menuitem" data-list-row-action="accounts-movement">${dataListIcon('i-flow')} ${t('Accounts movement', 'Accounts movement')}</button>${customerStatusMenuItem(row)}`
          : context === 'invoice'
            ? `<button type="button" role="menuitem" data-list-row-action="user-log">${dataListIcon('i-user')} ${t('User log', 'User log')}</button><button type="button" role="menuitem" data-list-row-action="documents-flow">${dataListIcon('i-flow')} ${t('Documents flow', 'Documents flow')}</button>${invoiceStatusMenuItem(row)}`
            : context === 'geo'
              ? `<button type="button" role="menuitem" data-list-row-action="view-hierarchy">${dataListIcon('i-flow')} ${t('View in hierarchy', 'View in hierarchy')}</button>${geoStatusMenuItem(row)}`
              : ''
      const deleteAction = `<button class="text-danger" type="button" role="menuitem" data-list-row-action="delete">${dataListIcon('i-trash')} ${t('Delete', 'Delete')}</button>`
      return `${contextActions}<div class="data-menu-separator"></div>${deleteAction}`
    }
    const quickViewDisabled = view === 'kanban'
    const commonActions = `<button type="button" role="menuitem" data-list-row-action="quick-view"${quickViewDisabled ? ' disabled aria-disabled="true" title="Switch out of Kanban to jump to a single record"' : ''}>${dataListIcon('i-panel')} Open in Adaptive view</button><button type="button" role="menuitem" data-list-row-action="display">${dataListIcon('i-external')} Display</button><button type="button" role="menuitem" data-list-row-action="modify">${dataListIcon('i-edit')} Modify</button>`
    const recordActions =
      context === 'customer'
        ? `<button type="button" role="menuitem" data-list-row-action="accounts-movement">${dataListIcon('i-flow')} Accounts movement</button>${customerStatusMenuItem(row)}`
        : context === 'geo'
          ? `<button type="button" role="menuitem" data-list-row-action="view-hierarchy">${dataListIcon('i-flow')} View in hierarchy</button>${geoStatusMenuItem(row)}`
          : `<button type="button" role="menuitem" data-list-row-action="print">${dataListIcon('i-print')} Print</button><button type="button" role="menuitem" data-list-row-action="user-log">${dataListIcon('i-user')} User log</button><button type="button" role="menuitem" data-list-row-action="documents-flow">${dataListIcon('i-flow')} Documents flow</button>${invoiceStatusMenuItem(row)}`
    const deleteAction = `<button class="text-danger" type="button" role="menuitem" data-list-row-action="delete">${dataListIcon('i-trash')} Delete</button>`
    return `${commonActions}<div class="data-menu-separator"></div>${recordActions}<div class="data-menu-separator"></div>${deleteAction}`
  }

  function groupValueLabel(context, column, groupValue) {
    if (column.key === 'active') return groupValue ? 'Active' : 'Inactive'
    return String(groupValue ?? 'Not set') || 'Not set'
  }

  const sharedViewDeps = {
    t,
    encodeHtml,
    dataListIcon,
    renderCell: (context, row, column) => renderDataListCell(context, row, column),
    renderFieldValue: (context, row, column) => renderQuickViewFieldValue(context, row, column),
    groupValueLabel,
    rowMenuItems,
    renderCard: (context, row, config, listState) =>
      renderDataRecordCard(context, row, config, listState),
  }

  function renderDataListAdaptiveFooterActions(context, row, config) {
    return renderSharedDataListAdaptiveFooterActions(context, row, config, sharedViewDeps)
  }

  function renderDataListRowActions(context, row, config, view = 'list') {
    return renderSharedDataListRowActions(context, row, config, view, sharedViewDeps)
  }

  function renderDataListHeader(visibleColumns, listState) {
    return renderSharedDataListHeader(visibleColumns, listState, sharedViewDeps)
  }

  function dataListDetailsId(context, key) {
    return sharedDataListDetailsId(context, key)
  }

  function renderDataListRecordRows(row, tableContext) {
    return renderSharedDataListRecordRows(row, tableContext, sharedViewDeps)
  }

  function renderDataListBody(rows, tableContext) {
    return renderSharedDataListBody(rows, tableContext, sharedViewDeps)
  }

  function renderQuickViewFieldValue(context, row, column) {
    const value = row[column.key]
    if (context === 'customer' && column.key === 'avatar')
      return renderCustomerAvatar(row, {encodeHtml})
    if (['customer', 'geo'].includes(context) && column.key === 'active')
      return `<span class="badge ${value ? 'ok' : 'gray'}">${value ? 'Active' : 'Inactive'}</span>`
    return encodeHtml(String(value === '' || value == null ? '—' : value))
  }

  function openQuickView(context, key) {
    const listState = getDataListState()[context]
    const filteredRows = dataListRows(context)
    const config = DATA_LIST_CONFIG[context]
    const index = filteredRows.findIndex(row => String(row[config.key]) === key)
    if (index < 0) return
    listState.view = 'adaptive'
    listState.page = index + 1
    computeDataListLayoutDirty(listState)
    refreshDataListForContext(context)
  }

  function renderDataListCards(context, rows, config, listState) {
    return renderSharedDataListCards(context, rows, config, listState, sharedViewDeps)
  }

  function renderDataListAdaptiveRecord(context, row, config, filteredCount = 0) {
    const listState = getDataListState()[context]
    return renderSharedDataListAdaptiveRecord(
      context,
      row,
      config,
      listState,
      filteredCount,
      sharedViewDeps
    )
  }

  return {renderDataListSelectionActions, rowMenuItems, sharedViewDeps, renderDataListAdaptiveFooterActions, renderDataListRowActions, renderDataListHeader, renderDataListBody, openQuickView, renderDataListCards, renderDataListAdaptiveRecord}
}
