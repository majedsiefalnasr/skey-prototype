import {DATA_TOOLBAR_BUTTON_CLASS} from '../components/data-list/list.js'
import {renderDataListRowActionMenu as renderSharedDataListRowActionMenu} from '../components/data-list/views.js'
import {encodeHtml} from '../core/locale.js'
import {renderCustomerAvatar} from './customers/images.js'

const DATA_RECORD_CARD_CLASS =
  "data-record-card data-record-card-snapshot-layout relative grid min-w-0 gap-5 rounded-lg border border-line bg-surface p-3.5 transition-[border-color,box-shadow,transform] duration-150 ease-in-out hover:[box-shadow:var(--shadow-1)] [&[aria-selected='true']]:border-accent [&[aria-selected='true']]:bg-[var(--accent-soft)] [&[aria-selected='true']_.data-record-card-select]:bg-surface [body.density-compact_&]:gap-2 [body.density-compact_&]:p-2.5"
const DATA_RECORD_CARD_IDENTITY_CLASS =
  'data-record-card-identity flex min-w-0 flex-1 cursor-pointer items-start gap-[9px] overflow-hidden rounded border-0 bg-transparent p-0 text-start font-[inherit] text-inherit focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-accent [&>div]:min-w-0 [&_span]:block [&_span]:truncate [&_strong]:block [&_strong]:truncate [&_strong]:text-sm [&_strong]:text-ink hover:[&_strong]:text-accent hover:[&_strong]:underline'

/** Owns list cards state and its DOM bindings. */
export function createListCards({dataListIcon, getSharedViewDeps, invoiceStatusKey} = {}) {
  function recordStatusBadge(active) {
    return `<span class="badge ${active ? 'ok' : 'gray'}">${active ? 'Active' : 'Inactive'}</span>`
  }

  function invoiceStatusBadge(status) {
    return `<span class="badge invoice-status data-[s=open]:bg-[var(--st-open-bg)] data-[s=open]:text-[var(--st-open-ink)] data-[s=draft]:bg-[var(--st-draft-bg)] data-[s=draft]:text-[var(--st-draft-ink)] data-[s=pending]:bg-[var(--st-pend-bg)] data-[s=pending]:text-[var(--st-pend-ink)] data-[s=posted]:bg-[var(--st-post-bg)] data-[s=posted]:text-[var(--st-post-ink)] data-[s=returned]:bg-[var(--st-retn-bg)] data-[s=returned]:text-[var(--st-retn-ink)] data-[s=canceled]:bg-[var(--st-canc-bg)] data-[s=canceled]:text-[var(--st-canc-ink)]" data-s="${encodeHtml(invoiceStatusKey(status))}">${encodeHtml(status)}</span>`
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
    const classes =
      label === 'Hierarchy path' ? 'wide col-span-full [&_dd]:whitespace-normal' : 'min-w-0'
    return `<div class="${classes}"><dt class="mb-0.5! text-[12px] text-muted">${encodeHtml(label)}</dt><dd class="m-0! truncate text-[12.5px] font-semibold text-ink">${encodeHtml(String(value ?? '—'))}</dd></div>`
  }

  function dataRecordCardSelectMarkup(config, key, selected) {
    return `<label class="data-record-card-select grid size-7 flex-none cursor-pointer place-items-center self-center rounded-md hover:bg-[var(--line-2)] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-1 has-[input:focus-visible]:outline-accent [body.density-compact_&]:size-6 [@media(pointer:coarse)]:size-11"><input class="m-0 size-[15px] accent-accent [body.density-compact_&]:size-[14px]" type="checkbox" data-list-row-select value="${encodeHtml(key)}" aria-label="Select ${encodeHtml(config.singular)} ${encodeHtml(key)}"${selected ? ' checked' : ''}></label>`
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
        : `<span class="data-record-avatar grid size-9 flex-none place-items-center rounded-full bg-[var(--line-2)] text-[12px] font-bold text-ink [body.density-compact_&]:size-[30px]" aria-hidden="true">${card.model.avatar}</span>`
    return `<header class="data-record-card-header flex min-w-0 items-center gap-[9px] [body.density-compact_&]:gap-[7px]">${dataRecordCardSelectMarkup(config, card.key, card.selected)}${avatar}<button class="${DATA_RECORD_CARD_IDENTITY_CLASS} [body.density-compact_&]:gap-[7px] [body.density-compact_&_[&_strong]]:text-[13px]" type="button" data-list-open-record="${encodeHtml(card.key)}" aria-label="Open ${encodeHtml(config.singular)} ${encodeHtml(card.key)}"><div><strong>${encodeHtml(card.model.title)}</strong><span>${encodeHtml(card.model.subtitle)}</span></div></button>${card.model.badge}</header>`
  }

  function dataRecordActionButton(action, icon, label) {
    return `<button type="button" class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS} min-w-0 overflow-hidden [@media(pointer:coarse)]:min-h-11" data-list-row-action="${action}" title="${encodeHtml(label)}">${dataListIcon(icon)}<span class="data-toolbar-button-label truncate">${encodeHtml(label)}</span></button>`
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
    return `<div class="data-record-card-footer-end ms-auto flex flex-none items-center gap-0.5 [@media(pointer:coarse)]:[&_summary]:min-h-11 [@media(pointer:coarse)]:[&_summary]:w-11">${renderOperationsOverflowActions(context, row, config)}</div>`
  }

  function renderOperationsOverflowActions(context, row, config) {
    const quickView = `<button type="button" role="menuitem" data-list-row-action="quick-view">${dataListIcon('i-panel')} Open in Adaptive view</button>`
    const display = `<button type="button" role="menuitem" data-list-row-action="display">${dataListIcon('i-external')} Display</button>`
    const deleteAction = `<button class="text-danger" type="button" role="menuitem" data-list-row-action="delete">${dataListIcon('i-trash')} Delete</button>`
    const statusAction = row.active
      ? `<button class="text-danger" type="button" role="menuitem" data-list-row-action="change-status">${dataListIcon('i-archive')} Deactivate</button>`
      : `<button type="button" role="menuitem" data-list-row-action="change-status">${dataListIcon('i-check')} Activate</button>`
    const actions =
      context === 'invoice'
        ? `${quickView}${display}<button type="button" role="menuitem" data-list-row-action="modify">${dataListIcon('i-edit')} Modify</button><button type="button" role="menuitem" data-list-row-action="user-log">${dataListIcon('i-user')} User log</button><div class="data-menu-separator"></div>${deleteAction}`
        : `${quickView}${display}${statusAction}<div class="data-menu-separator"></div>${deleteAction}`
    return renderSharedDataListRowActionMenu(
      config,
      String(row[config.key]),
      actions,
      '',
      getSharedViewDeps()
    )
  }

  function renderInvoiceSnapshotCard(row, config, listState) {
    const card = dataRecordCardContext('invoice', row, config, listState)
    return `<article class="${DATA_RECORD_CARD_CLASS} data-record-card-invoice" role="listitem" data-list-row-key="${encodeHtml(card.key)}" aria-selected="${card.selected}">${renderSnapshotCardHeader('invoice', row, config, card)}<div class="data-record-card-snapshot grid grid-cols-[minmax(0,1fr)_auto] items-end gap-5 rounded-md bg-[var(--line-2)] px-3.5 py-3 [&>div]:min-w-0 [&_small]:block [&_small]:text-[12px] [&_small]:text-muted [&_span]:block [&_span]:text-[12px] [&_span]:text-muted"><div><span>Customer</span><strong class="my-0.5! block truncate text-[13px] text-ink">${encodeHtml(row.custName)}</strong><small>${encodeHtml(row.custNo)}</small></div><div class="data-record-card-snapshot-value text-end"><span>Total</span><strong class="my-0.5! block truncate text-[18px] text-accent">${encodeHtml(row.currency)} ${encodeHtml(row.total)}</strong></div></div><dl class="data-record-card-meta m-0! grid grid-cols-2 gap-x-3.5 gap-y-2.5">${[
      ['Document date', row.date],
      ['Payment', row.pay],
      ['Sub-type', row.subtype],
    ]
      .map(dataRecordCardFactMarkup)
      .join(
        ''
      )}</dl><footer class="data-record-card-operations-actions flex flex-nowrap items-center gap-1.5 border-t border-line pt-2.5">${renderContextCardActions('invoice')}${renderCardFooterEndActions('invoice', row, config)}</footer></article>`
  }

  function renderCustomerSnapshotCard(row, config, listState) {
    const card = dataRecordCardContext('customer', row, config, listState)
    return `<article class="${DATA_RECORD_CARD_CLASS} data-record-card-customer" role="listitem" data-list-row-key="${encodeHtml(card.key)}" aria-selected="${card.selected}">${renderSnapshotCardHeader('customer', row, config, card)}<div class="data-record-card-snapshot grid grid-cols-[minmax(0,1fr)_auto] items-end gap-5 rounded-md bg-[var(--line-2)] px-3.5 py-3 [&>div]:min-w-0 [&_small]:block [&_small]:text-[12px] [&_small]:text-muted [&_span]:block [&_span]:text-[12px] [&_span]:text-muted"><div><span>Customer profile</span><strong class="my-0.5! block truncate text-[13px] text-ink">${encodeHtml(row.customerType)} customer</strong><small>${encodeHtml(row.customerGroup)} group</small></div><div class="data-record-card-snapshot-value data-record-card-snapshot-contact text-end"><span>Phone</span><strong class="my-0.5! block truncate text-[14px] text-ink">${encodeHtml(row.phone)}</strong></div></div><dl class="data-record-card-meta m-0! grid grid-cols-2 gap-x-3.5 gap-y-2.5">${[
      ['Operation unit', row.operationUnit],
      ['Account currency', row.currency],
      ['Location', row.country],
    ]
      .map(dataRecordCardFactMarkup)
      .join(
        ''
      )}</dl><footer class="data-record-card-operations-actions flex flex-nowrap items-center gap-1.5 border-t border-line pt-2.5">${renderContextCardActions('customer')}${renderCardFooterEndActions('customer', row, config)}</footer></article>`
  }

  function renderGeoSnapshotCard(row, config, listState) {
    const card = dataRecordCardContext('geo', row, config, listState)
    return `<article class="${DATA_RECORD_CARD_CLASS} data-record-card-geo" role="listitem" data-list-row-key="${encodeHtml(card.key)}" aria-selected="${card.selected}">${renderSnapshotCardHeader('geo', row, config, card)}<div class="data-record-card-hierarchy grid gap-[5px] rounded-md bg-[var(--line-2)] px-3 py-[11px] [&_span]:text-[12px] [&_span]:text-muted [&_strong]:text-[12.5px] [&_strong]:leading-[1.4] [&_strong]:text-ink"><span>Hierarchy path</span><strong>${encodeHtml(card.model.factMap.hierarchy[1])}</strong></div><div class="data-record-card-classification grid grid-cols-3 gap-2 [&_span]:text-[12px] [&_span]:text-muted [&_strong]:mt-0.5! [&_strong]:block [&_strong]:truncate [&_strong]:text-[12.5px]"><div><span>Type</span><strong>${encodeHtml(row.type)}</strong></div><div><span>Level</span><strong>${encodeHtml(row.level)}</strong></div><div><span>Code</span><strong>${encodeHtml(row.code)}</strong></div></div><dl class="data-record-card-meta m-0! grid grid-cols-2 gap-x-3.5 gap-y-2.5">${dataRecordCardFactMarkup(['Remarks', row.remarks || 'No remarks'])}</dl><footer class="data-record-card-operations-actions flex flex-nowrap items-center gap-1.5 border-t border-line pt-2.5">${renderContextCardActions('geo')}${renderCardFooterEndActions('geo', row, config)}</footer></article>`
  }

  function renderDataRecordCard(context, row, config, listState) {
    if (context === 'customer') return renderCustomerSnapshotCard(row, config, listState)
    if (context === 'geo') return renderGeoSnapshotCard(row, config, listState)
    return renderInvoiceSnapshotCard(row, config, listState)
  }

  return {invoiceStatusBadge, dataRecordCardModel, renderDataRecordCard}
}
