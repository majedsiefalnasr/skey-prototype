import {encodeHtml} from '../core/locale.js'
import {renderDataListRowActionMenu as renderSharedDataListRowActionMenu} from '../components/data-list/views.js'
import {renderCustomerAvatar} from './customers/images.js'

/** Owns list cards state and its DOM bindings. */
export function createListCards({dataListIcon, getSharedViewDeps, invoiceStatusKey} = {}) {
  function recordStatusBadge(active) {
    return `<span class="badge ${active ? 'ok' : 'gray'}">${active ? 'Active' : 'Inactive'}</span>`
  }

  function invoiceStatusBadge(status) {
    return `<span class="badge invoice-status" data-s="${encodeHtml(invoiceStatusKey(status))}">${encodeHtml(status)}</span>`
  }

  function customerRecordCardModel(row) {
    return {
      title: row.customerName,
      subtitle: `${row.customerNo}`,
      badge: recordStatusBadge(row.active),
      factMap: {
        type: ['Customer type', row.customerType],
        group: ['Customer group', row.customerGroup],
        operation: ['Operation unit', row.operationUnit],
        currency: ['Account currency', row.currency],
        location: ['Location', row.country],
        phone: ['Phone', row.phone],
      },
    }
  }

  function invoiceRecordCardModel(row) {
    return {
      title: `Sales Invoice ${row.no}`,
      subtitle: row.seq,
      avatar: dataListIcon('i-doc', 18),
      badge: invoiceStatusBadge(row.status),
      factMap: {
        total: ['Total', `${row.currency} ${row.total}`],
        customer: ['Customer', row.custName],
        date: ['Document date', row.date],
        payment: ['Payment', row.pay],
        subtype: ['Sub-type', row.subtype],
      },
    }
  }

  function geoRecordCardModel(row) {
    const hierarchyPath = row.parent
      ? `${row.parent} › ${row.code} - ${row.name}`
      : `Root › ${row.code} - ${row.name}`
    return {
      title: row.name,
      subtitle: `Location ${row.code}`,
      avatar: dataListIcon('i-flow', 18),
      badge: recordStatusBadge(row.active),
      factMap: {
        hierarchy: ['Hierarchy path', hierarchyPath],
        type: ['Location type', row.type],
        level: ['Level', row.level],
        code: ['Code', row.code],
        remarks: ['Remarks', row.remarks || 'No remarks'],
      },
    }
  }

  function dataRecordCardModel(context, row) {
    return context === 'customer'
      ? customerRecordCardModel(row)
      : context === 'geo'
        ? geoRecordCardModel(row)
        : invoiceRecordCardModel(row)
  }

  function dataRecordCardFactMarkup([label, value]) {
    const wide = label === 'Hierarchy path' ? ' class="wide"' : ''
    return `<div${wide}><dt>${encodeHtml(label)}</dt><dd>${encodeHtml(String(value ?? '—'))}</dd></div>`
  }

  function dataRecordCardSelectMarkup(config, key, selected) {
    return `<label class="data-record-card-select"><input type="checkbox" data-list-row-select value="${encodeHtml(key)}" aria-label="Select ${encodeHtml(config.singular)} ${encodeHtml(key)}"${selected ? ' checked' : ''}></label>`
  }

  function dataRecordCardContext(context, row, config, listState) {
    const key = String(row[config.key])
    return {
      key,
      selected: listState.selected.has(key),
      model: dataRecordCardModel(context, row),
    }
  }

  function renderSnapshotCardHeader(context, row, config, card) {
    const avatar =
      context === 'customer'
        ? renderCustomerAvatar(row, {encodeHtml})
        : `<span class="data-record-avatar" aria-hidden="true">${card.model.avatar}</span>`
    return `<header class="data-record-card-header">${dataRecordCardSelectMarkup(config, card.key, card.selected)}${avatar}<button class="data-record-card-identity" type="button" data-list-open-record="${encodeHtml(card.key)}" aria-label="Open ${encodeHtml(config.singular)} ${encodeHtml(card.key)}"><div><strong>${encodeHtml(card.model.title)}</strong><span>${encodeHtml(card.model.subtitle)}</span></div></button>${card.model.badge}</header>`
  }

  function dataRecordActionButton(action, icon, label) {
    return `<button type="button" class="data-toolbar-button" data-list-row-action="${action}" title="${encodeHtml(label)}">${dataListIcon(icon)}<span class="data-toolbar-button-label">${encodeHtml(label)}</span></button>`
  }

  function renderContextCardActions(context) {
    const actions =
      context === 'invoice'
        ? [
            ['print', 'i-print', 'Print'],
            ['documents-flow', 'i-flow', 'Documents flow'],
          ]
        : context === 'customer'
          ? [
              ['modify', 'i-edit', 'Modify'],
              ['accounts-movement', 'i-flow', 'Accounts movement'],
            ]
          : [
              ['view-hierarchy', 'i-flow', 'View hierarchy'],
              ['modify', 'i-edit', 'Modify'],
            ]
    return actions.map(action => dataRecordActionButton(...action)).join('')
  }

  function renderCardFooterEndActions(context, row, config) {
    return `<div class="data-record-card-footer-end">${renderOperationsOverflowActions(context, row, config)}</div>`
  }

  function renderOperationsOverflowActions(context, row, config) {
    const quickView = `<button type="button" role="menuitem" data-list-row-action="quick-view">${dataListIcon('i-panel')} Open in Adaptive view</button>`
    const display = `<button type="button" role="menuitem" data-list-row-action="display">${dataListIcon('i-external')} Display</button>`
    const deleteAction = `<button type="button" role="menuitem" data-list-row-action="delete">${dataListIcon('i-trash')} Delete</button>`
    const actions =
      context === 'invoice'
        ? `${quickView}${display}<button type="button" role="menuitem" data-list-row-action="modify">${dataListIcon('i-edit')} Modify</button><button type="button" role="menuitem" data-list-row-action="user-log">${dataListIcon('i-user')} User log</button><div class="data-menu-separator"></div>${deleteAction}`
        : `${quickView}${display}<button type="button" role="menuitem" data-list-row-action="toggle-status">${dataListIcon(row.active ? 'i-archive' : 'i-check')} ${row.active ? 'Deactivate' : 'Activate'}</button><div class="data-menu-separator"></div>${deleteAction}`
    return renderSharedDataListRowActionMenu(config, String(row[config.key]), actions, '', getSharedViewDeps())
  }

  function renderInvoiceSnapshotCard(row, config, listState) {
    const card = dataRecordCardContext('invoice', row, config, listState)
    return `<article class="data-record-card data-record-card-snapshot-layout data-record-card-invoice" role="listitem" data-list-row-key="${encodeHtml(card.key)}" aria-selected="${card.selected}">${renderSnapshotCardHeader('invoice', row, config, card)}<div class="data-record-card-snapshot"><div><span>Customer</span><strong>${encodeHtml(row.custName)}</strong><small>${encodeHtml(row.custNo)}</small></div><div class="data-record-card-snapshot-value"><span>Total</span><strong>${encodeHtml(row.currency)} ${encodeHtml(row.total)}</strong></div></div><dl class="data-record-card-meta">${[
      ['Document date', row.date],
      ['Payment', row.pay],
      ['Sub-type', row.subtype],
    ]
      .map(dataRecordCardFactMarkup)
      .join(
        ''
      )}</dl><footer class="data-record-card-operations-actions">${renderContextCardActions('invoice')}${renderCardFooterEndActions('invoice', row, config)}</footer></article>`
  }

  function renderCustomerSnapshotCard(row, config, listState) {
    const card = dataRecordCardContext('customer', row, config, listState)
    return `<article class="data-record-card data-record-card-snapshot-layout data-record-card-customer" role="listitem" data-list-row-key="${encodeHtml(card.key)}" aria-selected="${card.selected}">${renderSnapshotCardHeader('customer', row, config, card)}<div class="data-record-card-snapshot"><div><span>Customer profile</span><strong>${encodeHtml(row.customerType)} customer</strong><small>${encodeHtml(row.customerGroup)} group</small></div><div class="data-record-card-snapshot-value data-record-card-snapshot-contact"><span>Phone</span><strong>${encodeHtml(row.phone)}</strong></div></div><dl class="data-record-card-meta">${[
      ['Operation unit', row.operationUnit],
      ['Account currency', row.currency],
      ['Location', row.country],
    ]
      .map(dataRecordCardFactMarkup)
      .join(
        ''
      )}</dl><footer class="data-record-card-operations-actions">${renderContextCardActions('customer')}${renderCardFooterEndActions('customer', row, config)}</footer></article>`
  }

  function renderGeoSnapshotCard(row, config, listState) {
    const card = dataRecordCardContext('geo', row, config, listState)
    return `<article class="data-record-card data-record-card-snapshot-layout data-record-card-geo" role="listitem" data-list-row-key="${encodeHtml(card.key)}" aria-selected="${card.selected}">${renderSnapshotCardHeader('geo', row, config, card)}<div class="data-record-card-hierarchy"><span>Hierarchy path</span><strong>${encodeHtml(card.model.factMap.hierarchy[1])}</strong></div><div class="data-record-card-classification"><div><span>Type</span><strong>${encodeHtml(row.type)}</strong></div><div><span>Level</span><strong>${encodeHtml(row.level)}</strong></div><div><span>Code</span><strong>${encodeHtml(row.code)}</strong></div></div><dl class="data-record-card-meta">${dataRecordCardFactMarkup(['Remarks', row.remarks || 'No remarks'])}</dl><footer class="data-record-card-operations-actions">${renderContextCardActions('geo')}${renderCardFooterEndActions('geo', row, config)}</footer></article>`
  }

  function renderDataRecordCard(context, row, config, listState) {
    if (context === 'customer') return renderCustomerSnapshotCard(row, config, listState)
    if (context === 'geo') return renderGeoSnapshotCard(row, config, listState)
    return renderInvoiceSnapshotCard(row, config, listState)
  }

  return {invoiceStatusBadge, dataRecordCardModel, renderDataRecordCard}
}
