// Data-list orchestrator (renderDataList/wireDataList) and toolbar/filter-
// editor renderers — moved out of concepts/app/legacy-app.js as part of
// Task 6, plus the `createDataList` factory the brief names as this
// component's public surface.
//
// Scope note (see task-6-report.md for the full history): renderDataList
// and wireDataList are the two orchestrators that assemble every other
// already-extracted piece (statistics.js, charts.js, views.js, menus.js)
// plus a handful of pieces that are genuinely still page-owned — the
// custom-filter/export dialogs, the Kanban board/drag-drop policy, and
// quick-view — because they reach page-level singleton DOM (#save-filter-
// scrim, #geo-filter-scrim, #data-export-scrim) or hardcode invoice-only
// fields with no config-declared generalization to lean on (see checkpoint
// 3's Kanban note). Those stay callbacks supplied through `deps`, exactly
// like views.js/menus.js's presentation `deps` bundle — this module never
// imports a customer/invoice controller directly.
//
// createDataList({context,root,footer,config,rows,locale,actions,storage})
// is the brief's required public factory. Per the report's lowest-risk
// continuation plan, it builds and OWNS what used to be the global,
// context-keyed dataListState[context]/dataListModels[context] pair as an
// internal `listState`/`model` pair private to this instance's closure —
// legacy-app.js's ~150 external call sites that still read
// `dataListState[context]` keep working because legacy-app.js populates
// that global FROM each instance's `getState()` at construction time (see
// legacy-app.js's own createDataList call sites), rather than this module
// re-introducing a global itself.

import {createListModel} from './model.js'
import {createListChart} from './charts.js'

/* Shared literal utility strings for data-list toolbar/menu markup repeated
   across this file, menu-controller.js, menus.js, statistics.js, and
   date-fields.js -- kept as one source of truth so every call site emits an
   identical literal class list for the same element type (see
   tailwind/components.css's header comment on this file's conversion for the
   full selector inventory). */
export const DATA_TOOLBAR_BUTTON_CLASS =
  'inline-flex min-h-[32px] items-center gap-[7px] rounded-md border! border-transparent! bg-transparent! px-[9px] py-[5px] font-[inherit]! font-semibold! text-[12.5px]! text-ink! whitespace-nowrap cursor-pointer hover:bg-[var(--line-2)]! disabled:cursor-not-allowed disabled:text-muted! disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]'
/* .data-menu[open] > summary/.data-page-manage[open] > summary's "open"
   background is a parent-[open]-attribute-to-child selector relationship
   (see tailwind/components.css) -- not expressible as a literal utility on
   the summary itself, since the [open] attribute lives on the ancestor
   <details>, not on this element. */
export const DATA_MENU_SUMMARY_CLASS =
  'inline-flex min-h-[32px] items-center gap-[7px] rounded-md border border-transparent px-[9px] py-[5px] font-semibold text-[12.5px] text-ink whitespace-nowrap cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-[var(--line-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]'
export const DATA_MENU_POPOVER_CLASS =
  'data-menu-popover fixed z-[120] grid min-w-[140px] max-w-[min(420px,calc(100vw-16px))] max-h-[min(420px,calc(100vh-16px))] gap-0.5 overflow-auto rounded-lg border border-line bg-surface p-1.5 [box-shadow:var(--shadow-1)] [&:has([data-list-custom-filter-apply])]:min-w-[220px] [&>button]:flex [&>button]:w-full [&>button]:min-h-8 [&>button]:cursor-pointer [&>button]:items-center [&>button]:gap-[9px] [&>button]:rounded-[5px] [&>button]:border-0! [&>button]:bg-transparent! [&>button]:px-2 [&>button]:py-1.5 [&>button]:text-start [&>button]:font-[inherit]! [&>button]:text-[14px]! [&>button]:text-ink! [&>button:hover]:bg-[var(--line-2)]! [&>button[aria-checked=true]]:bg-[var(--line-2)]! [&>button:focus-visible]:outline-2 [&>button:focus-visible]:outline-offset-1 [&>button:focus-visible]:outline-accent [&>label]:flex [&>label]:w-full [&>label]:min-h-8 [&>label]:cursor-pointer [&>label]:items-center [&>label]:gap-[9px] [&>label]:rounded-[5px] [&>label]:px-2 [&>label]:py-1.5 [&>label]:text-start [&>label]:font-[inherit]! [&>label]:text-[14px]! [&>label]:text-ink! [&>label:hover]:bg-[var(--line-2)]! [&>label:has(input:focus-visible)]:outline-2 [&>label:has(input:focus-visible)]:outline-offset-1 [&>label:has(input:focus-visible)]:outline-accent [&_input[type=checkbox]]:m-0! [&_input[type=checkbox]]:size-[15px] [&_input[type=checkbox]]:accent-accent'
export const DATA_FILTER_CHIP_CLASS =
  'data-filter-chip inline-flex min-h-[28px] items-center gap-1.5 rounded-md bg-[var(--line-2)] px-2 py-1 text-xs font-semibold text-ink'
export const DATA_FILTER_OPTION_CLASS =
  'flex w-full min-h-[32px] items-center gap-2 rounded-[5px] border-0 bg-transparent px-[9px] py-1.5 text-start font-[inherit] text-[12.5px] text-ink cursor-pointer hover:bg-[var(--line-2)] focus-visible:bg-[var(--line-2)] focus-visible:outline-none aria-selected:font-semibold aria-selected:text-accent [&_svg]:ms-auto'

/**
 * @param {object} config
 * @param {object} listState
 */
export function renderDataListFilterButtons(config, listState, deps) {
  const {t, dataListIcon, encodeHtml} = deps
  const builtIn = config.filters
    .map(
      filter =>
        `<button type="button" role="menuitemradio" data-list-filter="${encodeHtml(filter.key)}" aria-checked="${filter.key === listState.filter && !listState.activeCustomFilterId}">${dataListIcon(filter.icon)}<span>${encodeHtml(t(filter.label))}</span>${filter.key === listState.filter && !listState.activeCustomFilterId ? dataListIcon('i-check', 13) : ''}</button>`
    )
    .join('')
  if (!listState.customFilters.length) return builtIn
  const customButton = custom => {
      const active = custom.id === listState.activeCustomFilterId
      return `<button type="button" role="menuitemradio" data-list-custom-filter-apply="${encodeHtml(custom.id)}" aria-checked="${active}">${dataListIcon(custom.icon || 'i-eye')}<span class="truncate">${encodeHtml(custom.name)}</span>${active ? dataListIcon('i-check', 13) : ''}</button>`
    }
  const visibleCustomButtons = listState.customFilters.slice(0, 5).map(customButton).join('')
  const overflowFilters = listState.customFilters.slice(5)
  const overflowMenu = overflowFilters.length
    ? `<details class="data-menu data-manage-submenu data-list-custom-filter-overflow relative"><summary class="flex w-full min-h-[32px] items-center gap-[9px] rounded-[5px] px-2 py-1.5 text-[12.5px] font-normal whitespace-normal text-ink cursor-pointer list-none [&::-webkit-details-marker]:hidden [&_svg:last-child]:ms-auto [&_svg:last-child]:text-muted rtl:[&_svg:last-child]:scale-x-[-1]">${dataListIcon('i-dots', 14)}<span>More filters…</span>${dataListIcon('i-next', 10)}</summary><div class="${DATA_MENU_POPOVER_CLASS} min-w-[180px] gap-0.5" role="menu">${overflowFilters.map(customButton).join('')}</div></details>`
    : ''
  return `${builtIn}<hr class="data-menu-separator col-span-full w-full my-0.5 h-px border-none bg-line">
    <div class="data-manage-group-label px-2 pt-[7px] pb-1 text-xs font-bold text-muted">${t('Custom filters', 'Custom filters')}</div>
    ${visibleCustomButtons}${overflowMenu}<hr class="data-menu-separator col-span-full w-full my-0.5 h-px border-none bg-line">
    <button type="button" role="menuitem" data-list-manage-filters>${dataListIcon('i-sliders', 14)}<span>${t('Manage filters…', 'Manage filters…')}</span></button>`
}

export function renderDataListColumnControls(config, listState, deps) {
  const {t, encodeHtml} = deps
  return listState.columnOrder
    .map(key => config.columns.find(column => column.key === key))
    .filter(Boolean)
    .map(
      column =>
        `<label><input type="checkbox" data-list-column="${encodeHtml(column.key)}"${listState.hiddenColumns.has(column.key) ? '' : ' checked'}><span>${encodeHtml(t(column.label))}</span></label>`
    )
    .join('')
}

export function renderDataListFieldChoices(config, listState, deps) {
  const {t, dataListIcon, encodeHtml} = deps
  const activeKeys = new Set(listState.fieldFilters.map(filter => filter.key))
  const available = config.filterFields.filter(field => !activeKeys.has(field.key))
  if (!available.length)
    return `<span class="data-menu-empty">${t('All available filters are applied.', 'All available filters are applied.')}</span>`
  return available
    .map(
      field =>
        `<button type="button" role="menuitem" data-list-add-filter="${encodeHtml(field.key)}">${dataListIcon(field.icon)}<span>${encodeHtml(t(field.label))}</span></button>`
    )
    .join('')
}

export function renderDataListFilterEditor(config, filter, deps) {
  const {
    t,
    dataListIcon,
    encodeHtml,
    DATA_FILTER_OPERATORS,
    dataFilterOptionLabel,
    dataFilterOptionValue,
    dateFilterLabel,
    renderDataListDatePresetOptions,
  } = deps
  const field = config.filterFields.find(item => item.key === filter.key)
  if (!field) return ''
  const operator =
    DATA_FILTER_OPERATORS.find(item => item.key === filter.operator) || DATA_FILTER_OPERATORS[0]
  const valueLabel = field.options
    ? dataFilterOptionLabel(
        field.options.find(option => dataFilterOptionValue(option) === filter.value) ||
          filter.value
      )
    : filter.value
  const removeButton = `<button type="button" class="grid size-[18px] place-items-center rounded p-0 border-0 bg-transparent text-inherit cursor-pointer" data-list-remove-field-filter="${encodeHtml(field.key)}" aria-label="${t('Remove', 'Remove')} ${encodeHtml(t(field.label))} ${t('filter', 'filter')}">${dataListIcon('i-x', 12)}</button>`
  const filterChipClass = DATA_FILTER_CHIP_CLASS
  if (field.type === 'select') {
    const options = field.options
      .map(option => {
        const optionValue = String(dataFilterOptionValue(option))
        const isSelected = optionValue === filter.value
        return `<button class="${DATA_FILTER_OPTION_CLASS}" type="button" role="option" aria-selected="${isSelected}" data-list-filter-select-option="${encodeHtml(field.key)}" data-value="${encodeHtml(optionValue)}">${encodeHtml(String(dataFilterOptionLabel(option)))}${isSelected ? dataListIcon('i-check', 13) : ''}</button>`
      })
      .join('')
    return `<span class="${filterChipClass}"><details class="data-menu data-filter-editor data-list-filter-editor relative min-w-0" data-filter-editor-key="${encodeHtml(field.key)}"><summary class="flex min-w-0 items-center gap-1.5 whitespace-nowrap min-h-0! rounded-none! border-0! bg-transparent! p-0! text-[inherit]! hover:bg-transparent! [&::-webkit-details-marker]:hidden">${dataListIcon(field.icon)}<strong>${encodeHtml(t(field.label))}:</strong><span class="data-filter-value overflow-hidden text-ellipsis text-accent">${encodeHtml(valueLabel || t('Choose value', 'Choose value'))}</span></summary><div class="${DATA_MENU_POPOVER_CLASS} data-filter-select-popover min-w-[min(220px,calc(100vw-16px))] p-1" role="listbox" aria-label="${encodeHtml(t(field.label))} ${t('filter value', 'filter value')}">${options}</div></details>${removeButton}</span>`
  }
  if (field.type === 'date') {
    const chipLabel = dateFilterLabel(filter)
    return `<span class="${filterChipClass}"><details class="data-menu data-filter-editor data-list-filter-editor relative min-w-0" data-filter-editor-key="${encodeHtml(field.key)}"><summary class="flex min-w-0 items-center gap-1.5 whitespace-nowrap min-h-0! rounded-none! border-0! bg-transparent! p-0! text-[inherit]! hover:bg-transparent! [&::-webkit-details-marker]:hidden">${dataListIcon(field.icon)}<strong>${encodeHtml(t(field.label))}:</strong><span class="data-filter-value overflow-hidden text-ellipsis text-accent">${encodeHtml(chipLabel)}</span></summary><div class="${DATA_MENU_POPOVER_CLASS} data-filter-date-popover min-w-[min(220px,calc(100vw-16px))] p-1">${renderDataListDatePresetOptions(field, filter)}</div></details>${removeButton}</span>`
  }
  const input = `<input type="text" class="w-full min-h-[36px] rounded-md border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-ink" data-list-filter-value="${encodeHtml(field.key)}" value="${encodeHtml(filter.value)}" placeholder="${t('Enter', 'Enter')} ${encodeHtml(t(field.label).toLowerCase())}" aria-label="${encodeHtml(t(field.label))} ${t('filter value', 'filter value')}">`
  const operators = `<div class="data-filter-operators mb-1.5 flex flex-nowrap gap-1 overflow-x-auto">${DATA_FILTER_OPERATORS.map(
    item =>
      `<button type="button" class="flex-none w-auto min-h-[28px] whitespace-nowrap px-2 py-1 aria-pressed:bg-[var(--line-2)] aria-pressed:font-bold" data-list-filter-operator="${encodeHtml(item.key)}" data-list-filter-key="${encodeHtml(field.key)}" aria-pressed="${item.key === filter.operator}">${encodeHtml(t(item.label))}</button>`
  ).join('')}</div>`
  return `<span class="${filterChipClass}"><details class="data-menu data-filter-editor data-list-filter-editor relative min-w-0" data-filter-editor-key="${encodeHtml(field.key)}"><summary class="flex min-w-0 items-center gap-1.5 whitespace-nowrap min-h-0! rounded-none! border-0! bg-transparent! p-0! text-[inherit]! hover:bg-transparent! [&::-webkit-details-marker]:hidden">${dataListIcon(field.icon)}<strong>${encodeHtml(t(field.label))}:</strong><span class="data-filter-value overflow-hidden text-ellipsis text-accent">${encodeHtml(`${t(operator.label)} ${valueLabel || '…'}`)}</span></summary><div class="${DATA_MENU_POPOVER_CLASS} data-filter-editor-popover min-w-[min(260px,calc(100vw-16px))] p-2.5">${operators}${input}</div></details>${removeButton}</span>`
}

export function renderDataListSelectionActions(config, listState, deps) {
  const {t, dataListIcon} = deps
  const selectedCount = listState.selected.size
  if (!selectedCount) return ''
  const singleRecordActions =
    selectedCount === 1
      ? `<button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS}" type="button" data-list-action="display">${dataListIcon('i-eye')} ${t('Display', 'Display')}</button><button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS}" type="button" data-list-action="modify">${dataListIcon('i-edit')} ${t('Modify')}</button>`
      : ''
  const statusActions = config.supportsActivateDeactivate
    ? `<button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS}" type="button" data-list-action="activate">${dataListIcon('i-check')} ${t('Activate')}</button><button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS}" type="button" data-list-action="deactivate">${dataListIcon('i-archive')} ${t('Deactivate')}</button>`
    : ''
  const chartAction = `<button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS}" type="button" data-list-action="chart" aria-pressed="${listState.chartVisible}" hidden>${dataListIcon('i-chart')} ${t('Chart', 'Chart')}</button>`
  return `${singleRecordActions}${statusActions}${chartAction}<button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS} danger text-[var(--danger)]" type="button" data-list-action="delete">${dataListIcon('i-trash')} ${t('Delete', 'Delete')}</button>`
}

export function dataListFilterCount(listState) {
  return (
    (listState.filter !== 'all' ? 1 : 0) +
    listState.fieldFilters.length +
    (listState.advanced ? 1 : 0)
  )
}

export function dataListViewPresentation(view) {
  if (view === 'cards') return {icon: 'i-panel', label: 'Cards'}
  if (view === 'kanban') return {icon: 'i-flow', label: 'Kanban'}
  if (view === 'responsive') return {icon: 'i-panel', label: 'Compact'}
  if (view === 'adaptive') return {icon: 'i-panel', label: 'Adaptive'}
  return {icon: 'i-grid', label: 'List'}
}

export function renderDataListViewMenu(config, listState, deps) {
  const {t, dataListIcon} = deps
  const current = dataListViewPresentation(listState.view)
  const option = (view, icon, label) =>
    `<button type="button" role="menuitemradio" data-list-view="${view}" aria-checked="${listState.view === view}"${view === 'kanban' ? ' hidden' : ''}>${dataListIcon(icon)} ${t(label)}${listState.view === view ? dataListIcon('i-check', 13) : ''}</button>`
  return `<details class="data-menu end relative [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-auto! [.customer-record-footer_&]:flex [.customer-record-footer_&]:gap-1.5"><summary class="${DATA_MENU_SUMMARY_CLASS}">${dataListIcon(current.icon)}<span class="data-toolbar-label-text max-[620px]:hidden">${t(current.label)}</span>${dataListIcon('i-caret', 11)}</summary><div class="${DATA_MENU_POPOVER_CLASS}" role="menu">${option('list', 'i-grid', 'List view')}${option('responsive', 'i-panel', 'Compact view')}${option('adaptive', 'i-panel', 'Adaptive view')}${option('cards', 'i-panel', 'Cards view')}${config.supportsKanban ? option('kanban', 'i-flow', 'Kanban view') : ''}</div></details>`
}

export function renderDataListToolbar(context, config, listState, deps) {
  const {t, dataListIcon, encodeHtml} = deps
  const tableView = ['list', 'responsive'].includes(listState.view)
  const isAdaptive = listState.view === 'adaptive'
  const activeFilter =
    config.filters.find(filter => filter.key === listState.filter) || config.filters[0]
  const activeCustomFilter = listState.customFilters.find(
    custom => custom.id === listState.activeCustomFilterId
  )
  const filterButtons = renderDataListFilterButtons(config, listState, deps)
  const columnControls = renderDataListColumnControls(config, listState, deps)
  const isUnsaved =
    Boolean(listState.fieldFilters.length || listState.advanced) && !activeCustomFilter
  const filterEditors = listState.fieldFilters
    .map(filter => renderDataListFilterEditor(config, filter, deps))
    .join('')
  const selectedCount = listState.selected.size
  const selectionActions = renderDataListSelectionActions(config, listState, deps)
  const filterCount = dataListFilterCount(listState)
  const clearFilterButton = filterCount
    ? `<button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS}" type="button" data-list-clear-filter aria-label="${t('Clear all filters', 'Clear all filters')}">${dataListIcon('i-x')} ${t('Clear filter', 'Clear filter')}</button>`
    : ''
  if (selectedCount)
    return `<div class="data-list-toolbar data-selection-toolbar flex min-h-[46px] flex-wrap items-center justify-between gap-2 px-2.5 py-[7px] border-[var(--accent-line)]" role="toolbar" aria-label="${t('Selected', 'Selected')} ${encodeHtml(config.label)} ${t('actions', 'actions')}">
      <div class="data-toolbar-cluster data-selection-actions flex min-w-0 [flex:1_1_auto] flex-wrap items-center gap-1.5">
        <span class="data-selection-count inline-flex min-h-[30px] items-center gap-[7px] rounded-md bg-[var(--accent-soft)] px-[9px] py-1 text-[12.5px] font-bold" aria-live="polite"><b class="grid min-w-5 h-5 place-items-center rounded-full bg-[var(--line-2)] text-xs">${selectedCount}</b> ${t('selected', 'selected')}</span>
        ${selectionActions}
      </div>
      <button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS} data-clear-selection ms-auto" type="button" data-list-clear-selection>${dataListIcon('i-x')} ${t('Clear selection', 'Clear selection')}</button>
    </div>
    `
  const filterCluster =
    listState.filterMode === 'modal'
      ? `<button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS}" type="button" data-list-open-filters aria-haspopup="dialog">${dataListIcon('i-filter')}<span>${filterCount ? `${t('Filters', 'Filters')} (${filterCount})` : t('Filters', 'Filters')}</span></button>
      ${clearFilterButton}`
      : `<details class="data-menu relative"><summary class="${DATA_MENU_SUMMARY_CLASS}">${dataListIcon(activeCustomFilter ? activeCustomFilter.icon || 'i-eye' : isUnsaved ? 'i-doc' : activeFilter.icon)}<span>${activeCustomFilter ? encodeHtml(activeCustomFilter.name) : isUnsaved ? t('Unsaved view', 'Unsaved view') : encodeHtml(t(activeFilter.label))}</span>${dataListIcon('i-caret', 11)}</summary><div class="${DATA_MENU_POPOVER_CLASS}" role="menu">${filterButtons}</div></details>
      ${filterEditors}
      ${listState.advanced ? `<span class="${DATA_FILTER_CHIP_CLASS}">${t('Advanced filters', 'Advanced filters')}<button type="button" class="grid size-[18px] place-items-center rounded p-0 border-0 bg-transparent text-inherit cursor-pointer" data-list-clear-advanced aria-label="${t('Clear advanced filters', 'Clear advanced filters')}">${dataListIcon('i-x', 12)}</button></span>` : ''}
      <details class="data-menu relative"><summary class="${DATA_MENU_SUMMARY_CLASS}">${dataListIcon('i-plus')}<span>${t('Filter', 'Filter')}</span></summary><div class="${DATA_MENU_POPOVER_CLASS}" role="menu">${renderDataListFieldChoices(config, listState, deps)}</div></details>
      ${clearFilterButton}
      ${
        activeCustomFilter
          ? `<button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS}" type="button" data-list-custom-filter-delete="${encodeHtml(activeCustomFilter.id)}">${dataListIcon('i-trash')} ${t('Delete filter', 'Delete filter')}</button>`
          : ''
      }
      ${isUnsaved ? `<button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS}" type="button" data-list-save-view>${dataListIcon('i-save')} ${t('Save filter', 'Save filter')}</button>` : ''}`
  const printButton = `<button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS}" type="button" data-list-action="print" hidden>${dataListIcon('i-print')}<span>${isAdaptive ? t('Print record', 'Print record') : t('Print list', 'Print list')}</span></button>`
  const chartButton = isAdaptive
    ? ''
    : `<button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS}" type="button" data-list-action="chart" aria-pressed="${listState.chartVisible}" hidden>${dataListIcon('i-chart')}<span>${t('Chart', 'Chart')}</span></button>`
  const groupTrigger =
    tableView && !isAdaptive ? deps.renderDataListGroupTrigger(config, listState) : ''
  const overflowMenu = `<details class="data-menu end data-toolbar-overflow relative hidden max-[900px]:inline-flex [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-auto! [.customer-record-footer_&]:flex [.customer-record-footer_&]:gap-1.5"><summary class="${DATA_MENU_SUMMARY_CLASS}" aria-label="${t('More actions', 'More actions')}" title="${t('More actions', 'More actions')}">${dataListIcon('i-dots')}</summary><div class="${DATA_MENU_POPOVER_CLASS}" role="menu">${printButton}${chartButton}${groupTrigger}</div></details>`
  return `<div class="data-list-toolbar data-browse-toolbar flex min-h-[46px] flex-wrap items-center gap-2 px-2.5 py-[7px] max-[900px]:items-stretch" role="toolbar" aria-label="${encodeHtml(config.label)} ${t('table controls', 'table controls')}">
    <div class="data-toolbar-cluster data-list-view-controls flex min-w-0 [flex:1_1_auto] flex-wrap items-center gap-1.5">
      ${filterCluster}
      ${listState.layoutDirty ? `<button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS} is-active text-accent bg-[var(--accent-soft)]" type="button" data-list-save-layout>${dataListIcon('i-save')} ${t('Save layout', 'Save layout')}</button>` : ''}
    </div>
    <div class="data-toolbar-cluster end flex min-w-0 flex-wrap items-center gap-1.5 ms-auto max-[900px]:w-full max-[900px]:ms-0 [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-auto! [.customer-record-footer_&]:flex [.customer-record-footer_&]:gap-1.5">
      <label class="data-search relative flex items-center max-[900px]:flex-1 [&>svg:first-child]:absolute [&>svg:first-child]:start-[9px] [&>svg:first-child]:text-muted [&>svg:first-child]:pointer-events-none">${dataListIcon('i-search')}<input type="search" class="w-[clamp(160px,18vw,260px)] min-h-[32px] rounded-md border border-line bg-surface py-[5px] ps-[30px] pe-7 font-[inherit] text-[12.5px] text-ink focus:border-[var(--accent)] focus:outline focus:outline-2 focus:outline-[var(--accent-soft)] max-[900px]:w-full" data-list-search value="${encodeHtml(listState.search)}" placeholder="${t('Search', 'Search')} ${encodeHtml(config.label)}" aria-label="${t('Search', 'Search')} ${encodeHtml(config.label)}"><button class="data-search-clear absolute end-1 grid size-6 place-items-center rounded p-0 border-0 bg-transparent text-muted cursor-pointer" type="button" data-list-search-clear aria-label="${t('Clear search', 'Clear search')}"${listState.search ? '' : ' hidden'}>${dataListIcon('i-x', 12)}</button></label>
      <span class="data-toolbar-separator data-toolbar-optional w-px h-6 mx-0.5 bg-line max-[900px]:hidden" aria-hidden="true"></span>
      <span class="data-toolbar-cluster data-toolbar-inline flex min-w-0 flex-wrap items-center gap-1.5 max-[900px]:hidden">${printButton}${chartButton}${groupTrigger}</span>
      ${overflowMenu}
      ${listState.view === 'list' && !isAdaptive ? `<details class="data-menu end relative [.rfoot_&]:ms-auto! [.rfoot_&]:flex [.rfoot_&]:gap-2 [.jbar_&]:ms-auto! [.guard_.gf_&]:ms-auto! [.guard_.gf_&]:flex [.guard_.gf_&]:flex-wrap [.guard_.gf_&]:justify-end [.guard_.gf_&]:gap-2.5 [.d2_.crow_&]:ms-auto! [.d2_.crow_&]:flex [.d2_.crow_&]:items-center [.d2_.crow_&]:gap-2 [.d3_.fbar_&]:ms-auto! [.d3_.fbar_&]:flex [.d3_.fbar_&]:gap-2 [.d4_.top_&]:ms-auto! [.d4_.top_&]:flex [.d4_.top_&]:items-center [.d4_.top_&]:gap-2 [.customer-record-footer_&]:ms-auto! [.customer-record-footer_&]:flex [.customer-record-footer_&]:gap-1.5"><summary class="${DATA_MENU_SUMMARY_CLASS}">${dataListIcon('i-sliders')}<span class="data-toolbar-label-text max-[620px]:hidden">${t('Columns', 'Columns')}</span>${dataListIcon('i-caret', 10)}</summary><div class="${DATA_MENU_POPOVER_CLASS}" role="group" aria-label="${t('Visible columns', 'Visible columns')}">${columnControls}</div></details>` : ''}
      ${renderDataListViewMenu(config, listState, deps)}
    </div>
  </div>`
}

export function restoreDataListSearchFocus(canvas) {
  const search = canvas.querySelector('[data-list-search]')
  search?.focus({preventScroll: true})
  search?.setSelectionRange(search.value.length, search.value.length)
}

export function restoreDataListFilterFocus(canvas, filterKey, deps) {
  const editor = canvas.querySelector(`[data-filter-editor-key="${CSS.escape(filterKey)}"]`)
  if (!editor) return
  const input = editor.querySelector('[data-list-filter-value]')
  if (!input) {
    editor.open = true
    const dateControl = editor.querySelector(
      '[data-list-date-amount], [data-list-date-unit], [data-list-date-specific], [data-list-date-range-from], [data-list-date-range-to]'
    )
    const selected = editor.querySelector('[role="option"][aria-selected="true"]')
    const option = dateControl || selected || editor.querySelector('[role="option"]')
    option?.focus({preventScroll: true})
    requestAnimationFrame(() => deps.positionDataMenu(editor))
    return
  }
  editor.open = true
  input.focus({preventScroll: true})
  input.setSelectionRange(input.value.length, input.value.length)
  requestAnimationFrame(() => deps.positionDataMenu(editor))
}

function syncActiveCustomFilter(listState) {
  if (!listState.activeCustomFilterId) return
  const active = listState.customFilters.find(
    custom => custom.id === listState.activeCustomFilterId
  )
  if (!active || !customFilterMatchesFieldFilters(active, listState.fieldFilters))
    listState.activeCustomFilterId = ''
}

/* A custom filter stays "active" (shown by name, offering Delete instead of
   Save) only while the live field filters still match exactly what was
   saved — any edit silently detaches it back to an ordinary unsaved view,
   the same way a saved layout goes dirty the moment a column changes. */
function customFilterMatchesFieldFilters(custom, fieldFilters) {
  if (custom.fieldFilters.length !== fieldFilters.length) return false
  return custom.fieldFilters.every(saved => {
    const live = fieldFilters.find(item => item.key === saved.key)
    return live && live.operator === saved.operator && live.value === saved.value
  })
}

/**
 * The data-list orchestrator. Reads/writes `listState` (this instance's
 * private model state) and `config` (its static DATA_LIST_CONFIG entry),
 * and calls into `deps` for every piece owned elsewhere (statistics,
 * charts, views, menus, the footer pager, and the still page-owned
 * presentation/business callbacks). `footer` is received as a parameter
 * (not queried for internally) per the brief's explicit requirement.
 */
export function renderDataList(
  context,
  listState,
  config,
  footer,
  deps,
  {focusSearch = false, focusFilterKey = '', skipStatsAnimation = false} = {}
) {
  const canvas = listState.canvas
  if (!canvas) return
  syncActiveCustomFilter(listState)
  document.querySelectorAll('body > .data-menu-popover[data-parked]').forEach(popover => {
    if (canvas.contains(popover.__homeParent) || !document.contains(popover.__homeParent))
      popover.remove()
  })
  const filteredRows = deps.dataListRows(context)
  const tableView = ['list', 'responsive'].includes(listState.view)
  const isAdaptive = listState.view === 'adaptive'
  const totalPages = Math.max(
    1,
    Math.ceil((deps.simulatedTotal(context) || filteredRows.length) / listState.pageSize)
  )
  if (isAdaptive) {
    if (listState.page > filteredRows.length) listState.page = filteredRows.length
    if (listState.page < 1) listState.page = 1
  } else {
    if (listState.page > totalPages) listState.page = totalPages
    if (listState.page < 1) listState.page = 1
  }
  const pageStart = (listState.page - 1) * listState.pageSize
  const rows = isAdaptive
    ? filteredRows.slice(listState.page - 1, listState.page)
    : tableView
      ? filteredRows.slice(pageStart, pageStart + listState.pageSize)
      : filteredRows
  const standardVisibleColumns = listState.columnOrder
    .map(key => config.columns.find(column => column.key === key))
    .filter(column => column && !listState.hiddenColumns.has(column.key))
  const responsiveColumns = deps.responsiveDataListColumns(
    context,
    listState.responsiveWidth || Math.round(canvas.getBoundingClientRect().width),
    listState
  )
  const visibleColumns =
    listState.view === 'responsive' ? responsiveColumns.visible : standardVisibleColumns
  const overflowColumns = listState.view === 'responsive' ? responsiveColumns.overflow : []
  listState.responsiveSignature = responsiveColumns.visible.map(column => column.key).join('|')
  const visibleKeys = rows.map(row => String(row[config.key]))
  const selectedVisible = visibleKeys.filter(key => listState.selected.has(key)).length
  const allSelected = Boolean(visibleKeys.length) && selectedVisible === visibleKeys.length
  const toolbar = renderDataListToolbar(context, config, listState, deps)
  const groupingBar = tableView ? deps.renderDataListGroupingBar(config, listState) : ''
  const responsiveColgroup =
    listState.view === 'responsive'
      ? `<colgroup><col style="width:42px">${visibleColumns
          .map(
            column =>
              `<col style="width:${deps.responsiveWidthFor(column.key) || 130}px">`
          )
          .join('')}<col style="width:76px"></colgroup>`
      : ''
  const tableRenderContext = {context, visibleColumns, overflowColumns, config, listState}
  const records =
    listState.view === 'kanban'
      ? deps.renderKanban(context, rows, config, listState)
      : listState.view === 'cards'
        ? deps.renderDataListCards(context, rows, config, listState)
        : isAdaptive
          ? deps.renderDataListAdaptiveRecord(context, rows[0], config, filteredRows.length)
          : `<div class="data-table-scroll overflow-auto${listState.view === 'responsive' ? ' data-table-responsive max-w-full overflow-clip' : ''}"><table class="inv-grid borders-${deps.encodeHtml(listState.borderMode)} w-full [border-collapse:collapse] [font-size:13px] [&_th]:text-start [&_th]:[padding:8px_12px]! [&_th]:bg-[var(--line-2)] [&_th]:text-muted [&_th]:font-medium [&_th]:[border-bottom:1px_solid_var(--line)] [&_th]:whitespace-nowrap [&_td]:[padding:8px_12px]! [&_td]:[border-bottom:1px_solid_var(--line-2)] [&_td]:text-ink [&_td]:whitespace-nowrap [&_td]:[text-overflow:ellipsis] [&_td]:overflow-hidden [&_td]:[max-width:200px] [&_tbody_tr:hover]:[background:var(--hover-overlay)] [&_tbody_tr:hover]:[cursor:pointer] [&_td_input]:w-full [&_td_input]:[padding:5px_7px] [&_td_input]:bg-surface [&_td_input]:text-ink [&_td_input]:[border:1px_solid_var(--line)] [&_td_input]:[border-radius:5px] [&_td_input]:[font:inherit]">${responsiveColgroup}<thead><tr><th><input class="m-0! size-[15px] accent-accent" type="checkbox" data-list-select-all aria-label="Select all visible ${deps.encodeHtml(config.label)}"${allSelected ? ' checked' : ''}></th>${deps.renderDataListHeader(visibleColumns, listState)}<th class="data-row-actions-cell" aria-label="Record actions"></th></tr></thead><tbody>${deps.renderDataListBody(rows, tableRenderContext)}</tbody></table></div>`
  const statistics = listState.statisticsVisible
    ? deps.renderDataListStatistics(context, filteredRows, config)
    : ''
  const chart = isAdaptive ? '' : deps.renderDataListChart(context, filteredRows, config, listState)
  /* Grouping lives in its own card, separate from the table card, so the two
     ideas ("how rows are organized" vs "the rows themselves") read as
     distinct pieces of UI rather than one glued block. */
  const groupingCard = groupingBar ? `<div class="data-group-card">${groupingBar}</div>` : ''
  canvas.innerHTML = `${statistics}${chart}<div class="data-list-controls grid gap-2 mb-2.5">${toolbar}</div>${groupingCard}<div class="data-list-shell relative overflow-visible rounded-lg border border-line bg-surface [box-shadow:var(--shadow-1)]" data-data-list="${context}">${records}</div>`
  /* Paging/record-nav swaps the whole canvas back in via innerHTML, so every
     stat card is a fresh element — animating on those renders would replay
     the count-up on each click, reading as the numbers "resetting" rather
     than the table simply moving on. */
  if (!skipStatsAnimation) deps.initNumberTickers(canvas)
  if (isAdaptive) deps.destroyDataListChartInstance(context)
  else deps.initDataListChart(context, canvas, filteredRows, config, listState)
  deps.renderDataPageManageMenus(context)
  deps.syncFooterPager(footer, context, filteredRows.length, listState)
  const selectAll = canvas.querySelector('[data-list-select-all]')
  if (selectAll) selectAll.indeterminate = selectedVisible > 0 && !allSelected
  wireDataList(canvas, context, listState, config, deps)
  observeResponsiveDataList(canvas, context, listState, deps)
  if (listState.view === 'list') deps.applyFrozenDataListColumns(canvas, visibleColumns, listState)
  if (focusSearch) restoreDataListSearchFocus(canvas)
  if (focusFilterKey) restoreDataListFilterFocus(canvas, focusFilterKey, deps)
}

function observeResponsiveDataList(canvas, context, listState, deps) {
  if (listState.resizeObserver || typeof ResizeObserver === 'undefined') return
  listState.resizeObserver = new ResizeObserver(entries => {
    const width = Math.round(entries[0]?.contentRect.width || 0)
    if (!width) return
    listState.responsiveWidth = width
    if (listState.view !== 'responsive') return
    const signature = deps
      .responsiveDataListColumns(context, width, listState)
      .visible.map(column => column.key)
      .join('|')
    if (signature === listState.responsiveSignature) return
    deps.rerender()
  })
  // Tied to the same instance-owned AbortController wireDataList creates
  // (Task 6) so the observer and the canvas's delegated listeners share one
  // disposal path — dispose() only needs to abort() once to tear down both.
  listState.abortController?.signal.addEventListener('abort', () => {
    listState.resizeObserver?.disconnect()
    listState.resizeObserver = null
  })
  listState.resizeObserver.observe(canvas)
}

/**
 * Delegated canvas listener registration. Replaces the previous
 * `canvas.dataset.dataListWired` boolean guard with `listState.abortController`
 * (Task 6) — a future instance dispose() removes this whole listener set in
 * one controller.abort() call, which a boolean guard has no path to do.
 */
export function wireDataList(canvas, context, listState, config, deps) {
  if (listState.abortController) return
  listState.abortController = new AbortController()
  const {signal} = listState.abortController
  canvas.addEventListener(
    'click',
    event => {
      if (deps.applyDataListFilterClick(event, context)) return
      if (deps.applyDataListToolbarClick(event, context)) return
      if (deps.applyDataListSortClick(event, context)) return
      deps.applyDataListCommandClick(event, context)
    },
    {signal}
  )
  canvas.addEventListener(
    'dblclick',
    event => {
      const row = event.target.closest('.data-list-record-row[data-list-row-key]')
      if (!row) return
      if (
        event.target.closest('button, a, input, select, textarea, summary, label, [role="menuitem"]')
      )
        return
      event.preventDefault()
      const key = row.dataset.listRowKey
      if (event.ctrlKey || event.metaKey) deps.openQuickView(context, key)
      else deps.openDataListRecord(context, key, 'view')
    },
    {signal}
  )
  canvas.addEventListener('change', event => deps.onDataListChange(event, context), {signal})
  canvas.addEventListener(
    'input',
    event => {
      const filterValue = event.target.closest('input[data-list-filter-value]')
      if (filterValue) {
        const filter = listState.fieldFilters.find(
          item => item.key === filterValue.dataset.listFilterValue
        )
        if (filter) filter.value = filterValue.value
        deps.rerender({focusFilterKey: filterValue.dataset.listFilterValue})
        return
      }
      const search = event.target.closest('[data-list-search]')
      if (!search) return
      listState.search = search.value
      listState.selected.clear()
      listState.page = 1
      deps.rerender({focusSearch: true})
    },
    {signal}
  )
  canvas.addEventListener(
    'dragstart',
    event => {
      const header = event.target.closest('[data-list-column-drag]')
      if (header) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', header.dataset.listColumnDrag)
        return
      }
      const card = event.target.closest('.data-kanban-card')
      if (!card) return
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', card.dataset.listRowKey)
      card.classList.add('is-dragging')
    },
    {signal}
  )
  canvas.addEventListener(
    'dragover',
    event => {
      const groupDrop = event.target.closest('[data-list-group-drop]')
      if (groupDrop) {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        groupDrop.dataset.dragOver = 'true'
        return
      }
      const header = event.target.closest('[data-list-column-drag]')
      if (header) {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        canvas
          .querySelectorAll('[data-list-column-drag][data-drag-over="true"]')
          .forEach(item => item.removeAttribute('data-drag-over'))
        header.dataset.dragOver = 'true'
        return
      }
      const drop = event.target.closest('[data-kanban-drop]')
      if (!drop) return
      const draggingCard = canvas.querySelector('.data-kanban-card.is-dragging')
      if (!draggingCard) return
      event.preventDefault()
      const fromStatus = draggingCard.dataset.kanbanStatus
      const toStatus = drop.dataset.kanbanDrop
      const allowed = fromStatus === toStatus || deps.kanbanTransitionAllowed(fromStatus, toStatus)
      event.dataTransfer.dropEffect = 'move'
      canvas
        .querySelectorAll('.data-kanban-drop.is-drag-over, .data-kanban-drop.is-drag-blocked')
        .forEach(item => item.classList.remove('is-drag-over', 'is-drag-blocked'))
      drop.classList.add(allowed ? 'is-drag-over' : 'is-drag-blocked')
    },
    {signal}
  )
  canvas.addEventListener(
    'dragleave',
    event => {
      const groupDrop = event.target.closest('[data-list-group-drop]')
      if (groupDrop && !groupDrop.contains(event.relatedTarget)) {
        groupDrop.removeAttribute('data-drag-over')
        return
      }
      const drop = event.target.closest('[data-kanban-drop]')
      if (!drop || drop.contains(event.relatedTarget)) return
      drop.classList.remove('is-drag-over', 'is-drag-blocked')
    },
    {signal}
  )
  canvas.addEventListener(
    'drop',
    event => {
      const groupDrop = event.target.closest('[data-list-group-drop]')
      if (groupDrop) {
        event.preventDefault()
        groupDrop.removeAttribute('data-drag-over')
        const sourceKey = event.dataTransfer.getData('text/plain')
        const validColumn = config.columns.some(
          column => column.key === sourceKey && column.groupable !== false
        )
        if (validColumn && !listState.groupBy.includes(sourceKey)) {
          listState.groupBy.push(sourceKey)
          listState.collapsedGroups.clear()
          deps.computeDataListLayoutDirty(listState)
          deps.rerender()
        }
        return
      }
      const header = event.target.closest('[data-list-column-drag]')
      if (header) {
        event.preventDefault()
        const sourceKey = event.dataTransfer.getData('text/plain')
        deps.reorderDataListColumn(context, sourceKey, header.dataset.listColumnDrag)
        return
      }
      const drop = event.target.closest('[data-kanban-drop]')
      if (!drop) return
      event.preventDefault()
      drop.classList.remove('is-drag-over', 'is-drag-blocked')
      const key = event.dataTransfer.getData('text/plain')
      deps.actions.run('move-kanban', [key], {toStatus: drop.dataset.kanbanDrop})
    },
    {signal}
  )
  canvas.addEventListener(
    'dragend',
    () => {
      canvas
        .querySelectorAll('[data-list-group-drop][data-drag-over="true"]')
        .forEach(item => item.removeAttribute('data-drag-over'))
      canvas
        .querySelectorAll('[data-list-column-drag][data-drag-over="true"]')
        .forEach(item => item.removeAttribute('data-drag-over'))
      canvas
        .querySelectorAll('.data-kanban-drop.is-drag-over, .data-kanban-drop.is-drag-blocked')
        .forEach(item => item.classList.remove('is-drag-over', 'is-drag-blocked'))
      canvas
        .querySelectorAll('.data-kanban-card.is-dragging')
        .forEach(item => item.classList.remove('is-dragging'))
    },
    {signal}
  )
}

/**
 * Assembles one independent data-list instance: its own model (state),
 * chart handle, AbortController-scoped canvas listeners, and ResizeObserver
 * — none shared with any other `createDataList(...)` call. Per the report's
 * lowest-risk continuation plan, `getState()` exposes the instance's
 * `listState` object by reference so legacy-app.js's still-untouched ~150
 * external call sites can keep populating/reading the transitional
 * `dataListState[context]` global unchanged, while `render`/`activate`/
 * `deactivate`/`dispose`/`getLayout`/`applyLayout`/`requestLeave` are the
 * new instance-owned public surface.
 *
 * @param {object} params
 * @param {string} params.context
 * @param {object} params.config - this context's DATA_LIST_CONFIG entry
 * @param {unknown[]} params.rows
 * @param {{code:string}} params.locale
 * @param {object} params.actions - business callbacks: openRecord(key,mode),
 *   newRecord(), run(command,keys,extra), cardModel(row), statistics(rows,config,total)
 * @param {object} params.storage - localStorageDataListStorage()-shaped
 * @param {object} params.deps - remaining page-owned render/dialog callbacks
 *   this instance needs (see legacy-app.js's call sites for the full shape)
 */
export function createDataList({context, config, rows, locale, actions, storage, deps}) {
  const model = createListModel({config, rows, storage, context})
  const listState = Object.assign(model.state, {
    chartVisible: false,
    chartExpanded: true,
    chartField: config.columns[0].key,
    chartYField: '',
    chartType: 'bar',
    canvas: null,
    responsiveWidth: 0,
    responsiveSignature: '',
    resizeObserver: null,
    abortController: null,
  })

  let chartHandle = null
  let footerEl = null
  let disposed = false

  function chart() {
    if (!chartHandle) chartHandle = createListChart({root: listState.canvas, locale})
    return chartHandle
  }

  const instanceDeps = {
    ...deps,
    actions,
    initDataListChart: (ctx, canvas, filteredRows, cfg, state) =>
      chart().render(filteredRows, cfg, state),
    destroyDataListChartInstance: () => chartHandle?.destroy(),
    rerender: (options = {}) => render(options),
    openDataListRecord: (ctx, key, mode) => actions.openRecord(key, mode),
    syncFooterPager: (footer, ctx, filteredCount, state) =>
      deps.syncFooterPager(footer ?? footerEl, ctx, filteredCount, state),
  }

  function render(options = {}) {
    if (!listState.canvas) return
    renderDataList(context, listState, config, footerEl, instanceDeps, options)
  }

  function activate({root, footer} = {}) {
    // wireDataList only wires a canvas once per abortController (its own
    // dataset-style guard, Task 6) — if this instance was already active on
    // a DIFFERENT canvas (or the same canvas element is being re-adopted
    // after being detached/reattached), that stale controller must be torn
    // down first so the new/current canvas actually gets wired, rather than
    // silently staying unwired while the old canvas's now-orphaned listeners
    // linger until GC. A same-canvas re-activate (root omitted, or passed as
    // the already-active element) is a no-op here, matching render()'s own
    // idempotency.
    if (root && root !== listState.canvas) deactivate()
    if (root) listState.canvas = root
    if (footer) footerEl = footer
    render()
  }

  function deactivate() {
    listState.abortController?.abort()
    listState.abortController = null
  }

  function dispose() {
    if (disposed) return
    disposed = true
    deactivate()
    chartHandle?.destroy()
    chartHandle = null
    listState.canvas = null
  }

  function getLayout() {
    return {
      columnOrder: [...listState.columnOrder],
      hiddenColumns: new Set(listState.hiddenColumns),
      groupBy: [...listState.groupBy],
      view: listState.view,
      statisticsVisible: listState.statisticsVisible,
      statisticsConcept: listState.statisticsConcept,
    }
  }

  function applyLayout(layout) {
    if (!layout) return
    Object.assign(listState, layout)
  }

  function requestLeave(after) {
    return deps.guardDataListLeave(after)
  }

  return {
    context,
    model,
    getState: () => listState,
    render,
    activate,
    deactivate,
    dispose,
    getLayout,
    applyLayout,
    requestLeave,
  }
}
