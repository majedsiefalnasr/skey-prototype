import {encodeHtml} from '../../core/locale.js'
import {DATA_LIST_CONFIG} from './columns.js'
import {renderDataListRowActions as renderSharedDataListRowActions, renderDataListAdaptiveFooterActions as renderSharedDataListAdaptiveFooterActions, renderDataListHeader as renderSharedDataListHeader, renderDataListRecordRows as renderSharedDataListRecordRows, renderDataListBody as renderSharedDataListBody, renderDataListCards as renderSharedDataListCards, renderDataListAdaptiveRecord as renderSharedDataListAdaptiveRecord, dataListDetailsId as sharedDataListDetailsId} from './views.js'
import {renderDataListSelectionActions as sharedRenderDataListSelectionActions} from './list.js'

/** Owns list views state and its DOM bindings. */
export function createListViews({t, computeDataListLayoutDirty, getDataListState, dataListIcon, dataListRows, invoiceStatusBadge, renderDataRecordCard, refreshDataListForContext, renderCustomerAvatar} = {}) {
  function renderDataListSelectionActions(config, listState) {
    return sharedRenderDataListSelectionActions(config, listState, {t, dataListIcon})
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
      return `<button class="customer-record-link" type="button" data-list-open-record="${encodeHtml(String(value))}" aria-label="Open ${context} ${encodeHtml(String(value))}">${encodeHtml(String(value))}</button>`
    }
    if (['customer', 'geo'].includes(context) && column.key === 'active') {
      return `<span class="badge ${value ? 'ok' : 'gray'}">${value ? 'Active' : 'Inactive'}</span>`
    }
    if (context === 'invoice' && column.key === 'status') {
      return invoiceStatusBadge(value)
    }
    return encodeHtml(String(value ?? ''))
  }

  function rowMenuItems(context, row, view) {
    if (view === 'adaptive-footer') {
      const contextActions =
        context === 'customer'
          ? `<button type="button" role="menuitem" data-list-row-action="accounts-movement">${dataListIcon('i-flow')} ${t('Accounts movement', 'Accounts movement')}</button><button type="button" role="menuitem" data-list-row-action="toggle-status">${dataListIcon(row.active ? 'i-archive' : 'i-check')} ${row.active ? t('Deactivate', 'Deactivate') : t('Activate', 'Activate')}</button>`
          : context === 'geo'
            ? `<button type="button" role="menuitem" data-list-row-action="view-hierarchy">${dataListIcon('i-flow')} ${t('View in hierarchy', 'View in hierarchy')}</button><button type="button" role="menuitem" data-list-row-action="toggle-status">${dataListIcon(row.active ? 'i-archive' : 'i-check')} ${row.active ? t('Deactivate', 'Deactivate') : t('Activate', 'Activate')}</button>`
            : `<button type="button" role="menuitem" data-list-row-action="user-log">${dataListIcon('i-user')} ${t('User log', 'User log')}</button><button type="button" role="menuitem" data-list-row-action="documents-flow">${dataListIcon('i-flow')} ${t('Documents flow', 'Documents flow')}</button>`
      const deleteAction = `<button type="button" role="menuitem" data-list-row-action="delete">${dataListIcon('i-trash')} ${t('Delete', 'Delete')}</button>`
      return `${contextActions}<div class="data-menu-separator"></div>${deleteAction}`
    }
    const quickViewDisabled = view === 'kanban'
    const commonActions = `<button type="button" role="menuitem" data-list-row-action="quick-view"${quickViewDisabled ? ' disabled aria-disabled="true" title="Switch out of Kanban to jump to a single record"' : ''}>${dataListIcon('i-panel')} Open in Adaptive view</button><button type="button" role="menuitem" data-list-row-action="display">${dataListIcon('i-external')} Display</button><button type="button" role="menuitem" data-list-row-action="modify">${dataListIcon('i-edit')} Modify</button>`
    const recordActions =
      context === 'customer'
        ? `<button type="button" role="menuitem" data-list-row-action="accounts-movement">${dataListIcon('i-flow')} Accounts movement</button><button type="button" role="menuitem" data-list-row-action="toggle-status">${dataListIcon(row.active ? 'i-archive' : 'i-check')} ${row.active ? 'Deactivate' : 'Activate'}</button>`
        : context === 'geo'
          ? `<button type="button" role="menuitem" data-list-row-action="view-hierarchy">${dataListIcon('i-flow')} View in hierarchy</button><button type="button" role="menuitem" data-list-row-action="toggle-status">${dataListIcon(row.active ? 'i-archive' : 'i-check')} ${row.active ? 'Deactivate' : 'Activate'}</button>`
          : `<button type="button" role="menuitem" data-list-row-action="print">${dataListIcon('i-print')} Print</button><button type="button" role="menuitem" data-list-row-action="user-log">${dataListIcon('i-user')} User log</button><button type="button" role="menuitem" data-list-row-action="documents-flow">${dataListIcon('i-flow')} Documents flow</button>`
    const deleteAction = `<button type="button" role="menuitem" data-list-row-action="delete">${dataListIcon('i-trash')} Delete</button>`
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
