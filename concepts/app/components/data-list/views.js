// Data-list view/group renderers — moved out of concepts/app/legacy-app.js
// as part of Task 6. These are the row/table/adaptive-record/group
// renderers that ARE generic across contexts (they only read `config` and
// `listState`, never branch on a context name directly) — the row-action
// MENU CONTENTS, per-cell display, and per-context snapshot card/kanban
// layouts stayed genuinely context-specific in the original (every one of
// renderDataListRowActionsContent/renderDataListAdaptiveFooterActions/
// renderDataListCell/dataRecordCardModel/renderDataListKanban branched on
// `context === 'customer' | 'geo' | 'invoice'`), so — per the brief's rule
// that the shared list must not import customer/invoice controllers
// directly — those become page-supplied callbacks passed in as `deps`:
//
//   deps.renderCell(context, row, column)      — per-cell display (was renderDataListCell)
//   deps.renderFieldValue(context, row, column) — adaptive/quick-view/responsive-overflow field display (was renderQuickViewFieldValue)
//   deps.groupValueLabel(context, column, value) — row-group label text (was dataListGroupValue)
//   deps.rowMenuItems(context, row, view)       — the "..." / context menu's per-record action items (was renderDataListRowActionsContent + renderDataListAdaptiveFooterActions's context branch)
//   deps.renderCard(context, row, config, listState) — full snapshot card markup (was renderDataRecordCard)
//   deps.renderKanban(context, rows, config, listState) — full kanban board markup, only supplied when a context has one (was renderDataListKanban, invoice-only)
//
// legacy-app.js still owns every one of those callback bodies unchanged
// (invoiceRecordCardModel/customerRecordCardModel/geoRecordCardModel,
// renderCustomerAvatar, the Kanban board/card/status-transition logic,
// etc.) — this module only owns the context-agnostic table/adaptive/group
// scaffolding that calls them.

import {DATA_MENU_POPOVER_CLASS, DATA_MENU_SUMMARY_CLASS} from './list.js'

const DATA_SORT_BUTTON_CLASS =
  'data-sort-button inline-flex items-center gap-[5px] p-0 border-0 text-inherit bg-transparent font-[inherit] cursor-pointer hover:text-ink'

/**
 * Shared by the left-click "..." row menu AND the right-click context menu.
 * @param {object} config
 * @param {string} key
 * @param {string} actionsHtml
 * @param {string} context
 * @param {Function} encodeHtml
 */
export function renderDataListRowActionMenu(
  config,
  key,
  actionsHtml,
  context,
  {encodeHtml, dataListIcon}
) {
  const contextAttr = context ? ` data-list-context="${encodeHtml(context)}"` : ''
  return `<details class="data-menu end data-row-menu relative [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-auto! [.customer-record-footer_&]:flex [.customer-record-footer_&]:gap-1.5"${contextAttr}><summary class="${DATA_MENU_SUMMARY_CLASS} w-8! min-h-8 justify-center px-[5px]! py-[5px]!" aria-label="Actions for ${encodeHtml(config.singular)} ${encodeHtml(key)}" title="Record actions">${dataListIcon('i-dots')}</summary><div class="${DATA_MENU_POPOVER_CLASS} min-w-[190px]" role="menu">${actionsHtml}</div></details>`
}

/**
 * @param {string} context
 * @param {object} row
 * @param {object} config
 * @param {string} view
 * @param {object} deps
 */
export function renderDataListRowActions(context, row, config, view, deps) {
  const {rowMenuItems} = deps
  const actionsHtml = rowMenuItems(context, row, view)
  return renderDataListRowActionMenu(config, String(row[config.key]), actionsHtml, '', deps)
}

/**
 * Adaptive view's footer keeps the two most-reached-for actions as buttons
 * (Display, Modify) and tucks everything else behind one overflow menu.
 */
export function renderDataListAdaptiveFooterActions(context, row, config, deps) {
  const {t, rowMenuItems} = deps
  const key = String(row[config.key])
  const displayButton = `<button class="ctx [.d4_.cp-act_&]:w-full [.d4_.cp-act_&]:justify-start" type="button" data-list-row-action="display"><svg width="15" height="15" aria-hidden="true"><use href="#i-external" /></svg><span>${t('Display', 'Display')}</span></button>`
  const modifyButton = `<button class="ctx [.d4_.cp-act_&]:w-full [.d4_.cp-act_&]:justify-start" type="button" data-list-row-action="modify"><svg width="15" height="15" aria-hidden="true"><use href="#i-edit" /></svg><span>${t('Modify', 'Modify')}</span></button>`
  const overflowActions = rowMenuItems(context, row, 'adaptive-footer')
  return `<span class="data-adaptive-footer-actions ms-auto! flex items-center gap-1.5" data-list-row-key="${deps.encodeHtml(key)}">${displayButton}${modifyButton}${renderDataListRowActionMenu(config, key, overflowActions, context, deps)}</span>`
}

export function renderDataListHeader(visibleColumns, listState, {t, encodeHtml}) {
  const sortButtonClass = DATA_SORT_BUTTON_CLASS
  return visibleColumns
    .map(column => {
      if (column.sortable === false) {
        return `<th data-col="${encodeHtml(column.key)}" data-list-column-drag="${encodeHtml(column.key)}" draggable="true" aria-sort="none" title="${t('Drag to reorder', 'Drag to reorder')}"><span class="${sortButtonClass}"><span>${encodeHtml(t(column.label))}</span></span></th>`
      }
      const sorted = listState.sortKey === column.key
      const ariaSort = sorted
        ? listState.sortDirection === 'asc'
          ? 'ascending'
          : 'descending'
        : 'none'
      const indicator = sorted ? (listState.sortDirection === 'asc' ? '↑' : '↓') : ''
      return `<th data-col="${encodeHtml(column.key)}" data-list-column-drag="${encodeHtml(column.key)}" draggable="true" aria-sort="${ariaSort}" title="${t('Drag to reorder or add to row groups', 'Drag to reorder or add to row groups')}"><button class="${sortButtonClass}" type="button" data-list-sort="${encodeHtml(column.key)}"><span>${encodeHtml(t(column.label))}</span><span class="data-sort-indicator min-w-[10px] text-xs text-accent" aria-hidden="true">${indicator}</span></button></th>`
    })
    .join('')
}

export function dataListDetailsId(context, key) {
  return `responsive-details-${context}-${String(key).replace(/[^a-z0-9_-]+/gi, '-')}`
}

function renderResponsiveRowDetails(context, row, overflowColumns, deps) {
  const {encodeHtml, renderFieldValue} = deps
  return `<dl class="data-responsive-details grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-[18px] gap-y-3 border-b border-line py-3 ps-[54px] pe-4 text-start">${overflowColumns
    .map(
      column =>
        `<div class="min-w-0"><dt class="mb-0.5 text-xs font-semibold text-muted">${encodeHtml(column.label)}</dt><dd class="text-[12.5px] font-semibold text-ink [overflow-wrap:anywhere]">${renderFieldValue(context, row, column)}</dd></div>`
    )
    .join('')}</dl>`
}

function renderDataListExpandButton(
  context,
  key,
  expanded,
  overflowColumns,
  {encodeHtml, dataListIcon}
) {
  if (!overflowColumns.length) return ''
  const detailsId = dataListDetailsId(context, key)
  const label = expanded ? 'Collapse row details' : 'Expand row details'
  return `<button type="button" class="data-row-expand grid w-8! min-h-8 place-items-center rounded-md text-muted! hover:bg-[var(--line-2)]! hover:text-ink!" data-list-row-expand="${encodeHtml(key)}" aria-controls="${encodeHtml(detailsId)}" aria-expanded="${expanded}" aria-label="${label}" title="${label}">${dataListIcon('i-caret', 12)}</button>`
}

/**
 * @param {object} row
 * @param {{context, visibleColumns, overflowColumns, config, listState}} tableContext
 * @param {object} deps
 */
export function renderDataListRecordRows(row, tableContext, deps) {
  const {encodeHtml, renderCell} = deps
  const {context, visibleColumns, overflowColumns, config, listState} = tableContext
  const key = String(row[config.key])
  const selected = listState.selected.has(key)
  const expanded = listState.expandedRows.has(key) && overflowColumns.length > 0
  const cells = visibleColumns
    .map(column => {
      const title =
        column.key === 'avatar' ? '' : ` title="${encodeHtml(String(row[column.key] ?? ''))}"`
      return `<td data-col="${encodeHtml(column.key)}"${title}>${renderCell(context, row, column)}</td>`
    })
    .join('')
  // Rows with nothing to act on (config.noRowActions — e.g. Screen
  // Parameters' plain reference table) skip both the select-all checkbox
  // and the "..." actions cell entirely, rather than rendering controls
  // that would have nothing to select/act on for.
  const selectCell = config.noRowActions
    ? ''
    : `<td class="data-row-select-cell"><input class="m-0! size-[15px] accent-accent" type="checkbox" data-list-row-select value="${encodeHtml(key)}" aria-label="Select ${encodeHtml(config.singular)} ${encodeHtml(key)}"${selected ? ' checked' : ''}></td>`
  const actionCell = config.noRowActions
    ? ''
    : `<td class="data-row-actions-cell"><div class="data-row-actions flex items-center justify-end gap-0.5">${renderDataListExpandButton(context, key, expanded, overflowColumns, deps)}${renderDataListRowActions(context, row, config, listState.view, deps)}</div></td>`
  const recordRow = `<tr class="data-list-record-row${config.noRowActions ? '' : ' cursor-pointer'}" data-list-row-key="${encodeHtml(key)}" aria-selected="${selected}"${config.noRowActions ? '' : ' title="Double-click to open. Ctrl/Command + double-click for Adaptive view on this record."'}>${selectCell}${cells}${actionCell}</tr>`
  if (!expanded) return recordRow
  const detailsId = dataListDetailsId(context, key)
  const detailsColspan = visibleColumns.length + (config.noRowActions ? 0 : 2)
  return `${recordRow}<tr class="data-responsive-detail-row" id="${encodeHtml(detailsId)}"><td colspan="${detailsColspan}">${renderResponsiveRowDetails(context, row, overflowColumns, deps)}</td></tr>`
}

export function renderDataListGroupedBody(rows, tableContext, deps, depth = 0, path = []) {
  const {encodeHtml, dataListIcon, groupValueLabel} = deps
  const {context, visibleColumns, config, listState} = tableContext
  if (depth >= listState.groupBy.length)
    return rows.map(row => renderDataListRecordRows(row, tableContext, deps)).join('')
  const column = config.columns.find(item => item.key === listState.groupBy[depth])
  if (!column) return renderDataListGroupedBody(rows, tableContext, deps, depth + 1, path)
  const groups = new Map()
  rows.forEach(row => {
    const value = groupValueLabel(context, column, row[column.key])
    if (!groups.has(value)) groups.set(value, [])
    groups.get(value).push(row)
  })
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, undefined, {numeric: true}))
    .map(([value, groupRows]) => {
      const groupPath = [...path, `${column.key}:${value}`]
      const groupId = groupPath.join('')
      const expanded = !listState.collapsedGroups.has(groupId)
      const children = expanded
        ? renderDataListGroupedBody(groupRows, tableContext, deps, depth + 1, groupPath)
        : ''
      const groupColspan = visibleColumns.length + (config.noRowActions ? 0 : 2)
      return `<tr class="data-group-row [grid-column:1_/_-1] bg-[var(--line-2)] [border-bottom:1px_solid_var(--line)] [border-top:1px_solid_var(--line)]"><td colspan="${groupColspan}"><button type="button" class="data-group-toggle flex w-full min-h-9 items-center gap-[7px] py-1.5 pe-2.5 text-start" style="--group-depth:${depth};padding-inline-start:calc(10px + var(--group-depth, 0) * 20px)" data-list-group-toggle="${encodeHtml(groupId)}" aria-expanded="${expanded}">${dataListIcon('i-caret', 11)}<span class="data-group-label text-xs font-semibold text-muted">${encodeHtml(column.label)}</span><span class="data-group-value font-bold text-ink">${encodeHtml(value)}</span><span class="data-group-count ms-auto text-xs font-medium text-muted">${groupRows.length} ${groupRows.length === 1 ? config.singular : config.label}</span></button></td></tr>${children}`
    })
    .join('')
}

export function renderDataListBody(rows, tableContext, deps) {
  const {encodeHtml} = deps
  const {config, visibleColumns} = tableContext
  if (!rows.length)
    return `<tr><td colspan="${visibleColumns.length + 2}"><div class="customer-lookup-empty [padding:28px_16px] text-muted text-center">No ${encodeHtml(config.label)} match this view.</div></td></tr>`
  return renderDataListGroupedBody(rows, tableContext, deps)
}

/**
 * @param {string} context
 * @param {unknown[]} rows
 * @param {object} config
 * @param {object} listState
 * @param {object} deps - must include renderCard(context,row,config,listState)
 */
export function renderDataListCards(context, rows, config, listState, deps) {
  const {encodeHtml, renderCard} = deps
  if (!rows.length)
    return `<div class="customer-lookup-empty [padding:28px_16px] text-muted text-center">No ${encodeHtml(config.label)} match this view.</div>`
  return `<div class="data-card-grid grid grid-cols-3 gap-5 rounded-[10px] bg-bg p-3 max-[1240px]:grid-cols-2 max-[720px]:grid-cols-1" role="list" aria-label="${encodeHtml(config.label)} cards">${rows
    .map(row => renderCard(context, row, config, listState))
    .join('')}</div>`
}

const DATA_ADAPTIVE_GROUP_LABELS = {
  document: 'Document',
  customer: 'Customer',
  financials: 'Financials',
  audit: 'Audit trail',
}

function renderDataAdaptiveFieldRow(context, row, column, deps) {
  const {t, encodeHtml, renderFieldValue} = deps
  const raw = row[column.key]
  const isEmpty = raw === null || raw === undefined || raw === ''
  const value = renderFieldValue(context, row, column)
  return `<div class="data-adaptive-row grid [grid-template-columns:subgrid] [grid-column:1_/_-1] [padding:10px_14px] [border-bottom:1px_solid_var(--line)] [&:last-child]:[border-bottom:none]"><span class="data-adaptive-label text-xs text-muted">${encodeHtml(t(column.label))}</span><span class="data-adaptive-value${isEmpty ? ' data-adaptive-value-empty' : ''}">${value}</span></div>`
}

/**
 * Adaptive view shows one record at a time as a two-column label/value list
 * — fields carrying a `group` tag render as separate collapsible sections;
 * contexts that don't tag groups fall back to one flat section.
 *
 * @param {string} context
 * @param {object|null} row
 * @param {object} config
 * @param {object} listState
 * @param {number} filteredCount
 * @param {object} deps
 */
export function renderDataListAdaptiveRecord(context, row, config, listState, filteredCount, deps) {
  const {t, encodeHtml, dataListIcon} = deps
  if (!row) {
    const message = filteredCount
      ? t('No record at this position.', 'No record at this position.')
      : t('No records match this view.', 'No records match this view.')
    const hint = filteredCount
      ? t('Try First or Last.', 'Try First or Last.')
      : t(
          'Clear the search or filter to see records again.',
          'Clear the search or filter to see records again.'
        )
    return `<div class="data-adaptive-empty [padding:40px_20px] [border:1px_dashed_var(--line)] rounded-lg text-center [&_p]:[margin:0]!"><p>${encodeHtml(message)}</p><p class="data-adaptive-empty-hint mt-1.5! text-muted [font-size:12.5px]">${encodeHtml(hint)}</p></div>`
  }
  const fields = config.columns.filter(column => column.key !== 'avatar')
  const hasGroups = fields.some(column => column.group)
  const key = String(row[config.key])
  if (!hasGroups) {
    return `<div class="rec-card data-adaptive-record [border:1px_solid_var(--line)] rounded-lg mb-3! overflow-hidden [.rec-card-flow>&]:[flex:1_1_calc(var(--card-cols,_3)_*_200px)] [.rec-card-flow>&]:[min-width:min(100%,_320px)] [.rec-card-flow>&]:mb-0! grid [grid-template-columns:minmax(140px,_260px)_1fr]" data-list-row-key="${encodeHtml(key)}">${fields
      .map(column => renderDataAdaptiveFieldRow(context, row, column, deps))
      .join('')}</div>`
  }
  const groupOrder = [...new Set(fields.map(column => column.group || 'details'))]
  const sections = groupOrder
    .map(groupKey => {
      const groupFields = fields.filter(column => (column.group || 'details') === groupKey)
      const label = DATA_ADAPTIVE_GROUP_LABELS[groupKey] || 'Details'
      const groupId = `adaptive:${groupKey}`
      const expanded = !listState.collapsedGroups.has(groupId)
      const rowsHtml = groupFields
        .map(column => renderDataAdaptiveFieldRow(context, row, column, deps))
        .join('')
      return `<section class="data-adaptive-section grid [grid-template-columns:minmax(140px,_260px)_1fr]"><div class="data-group-row [grid-column:1_/_-1] bg-[var(--line-2)] [border-bottom:1px_solid_var(--line)] [border-top:1px_solid_var(--line)]"><button type="button" class="data-group-toggle flex w-full min-h-9 items-center gap-[7px] py-1.5 pe-2.5 ps-2.5 text-start" data-list-group-toggle="${encodeHtml(groupId)}" aria-expanded="${expanded}">${dataListIcon('i-caret', 11)}<span class="data-group-label text-xs font-semibold text-muted">${encodeHtml(t(label))}</span><span class="data-group-count ms-auto text-xs font-medium text-muted">${groupFields.length} ${t('fields', 'fields')}</span></button></div>${expanded ? rowsHtml : ''}</section>`
    })
    .join('')
  return `<div class="rec-card data-adaptive-sections [border:1px_solid_var(--line)] rounded-lg mb-3! overflow-hidden [.rec-card-flow>&]:[flex:1_1_calc(var(--card-cols,_3)_*_200px)] [.rec-card-flow>&]:[min-width:min(100%,_320px)] [.rec-card-flow>&]:mb-0!" data-list-row-key="${encodeHtml(key)}">${sections}</div>`
}
