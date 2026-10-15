// List-page toolbar pieces for the collaboration screens, mirroring the
// invoices/customers data-list chrome: a quick-filter menu, a "+ Filter"
// menu with inline removable chips, the search field, and the view menu —
// same classes, same spacing, same semantics as components/data-list.
import {
  DATA_TOOLBAR_BUTTON_CLASS,
  DATA_MENU_SUMMARY_CLASS,
  DATA_MENU_POPOVER_CLASS,
  DATA_FILTER_CHIP_CLASS,
  DATA_FILTER_OPTION_CLASS,
} from '../data-list/list.js'
import {DATA_FILTER_OPERATORS, rowMatchesFieldFilter} from '../data-list/filters.js'
import {icon, escapeHtml} from './fields.js'

/** A picked option in any of the toolbar menus. */
export const menuItemRadio = ({attr, value, label, checked, iconName = ''}) =>
  `<button type="button" role="menuitemradio" aria-checked="${checked}" data-${attr}="${escapeHtml(value)}">${iconName ? icon(iconName, 14) : ''}<span>${escapeHtml(label)}</span>${checked ? icon('i-check', 13) : ''}</button>`

export const menuItemCheck = ({attr, value, label, checked, iconName = ''}) =>
  `<button type="button" role="menuitemcheckbox" aria-checked="${checked}" data-${attr}="${escapeHtml(value)}">${iconName ? icon(iconName, 14) : ''}<span>${escapeHtml(label)}</span>${checked ? icon('i-check', 13) : ''}</button>`

export const menuGroupLabel = label =>
  `<span class="px-2 pt-[7px] pb-1 text-xs font-bold text-muted">${escapeHtml(label)}</span>`

/** The left-hand menu: quick filters, or the "+ Filter" field menu. */
export const menuDetails = ({attr, iconName, label, items, end = false}) =>
  `<details class="data-menu${end ? ' end' : ''} relative" data-${attr}>
    <summary class="${DATA_MENU_SUMMARY_CLASS}">${icon(iconName, 14)}<span>${escapeHtml(label)}</span>${icon('i-caret', 11)}</summary>
    <div class="${DATA_MENU_POPOVER_CLASS}" role="menu">${items}</div>
  </details>`

/** An applied field filter, shown inline like the invoices filter chips. */
export const filterChip = ({attr, value, label}) =>
  `<span class="${DATA_FILTER_CHIP_CLASS}">${escapeHtml(label)}<button type="button" class="grid size-[18px] place-items-center rounded p-0 border-0 bg-transparent text-inherit cursor-pointer" data-${attr}="${escapeHtml(value)}" aria-label="Remove ${escapeHtml(label)} filter">${icon('i-x', 12)}</button></span>`

export const clearFilterButton = ({attr}) =>
  `<button class="data-toolbar-button ${DATA_TOOLBAR_BUTTON_CLASS}" type="button" data-${attr} aria-label="Clear all filters">${icon('i-x')}<span>Clear filter</span></button>`

/** The search field — the invoices list's right-cluster input. */
export const searchField = ({attr, label, value}) =>
  `<label class="data-search relative flex items-center [&>svg:first-child]:absolute [&>svg:first-child]:start-[9px] [&>svg:first-child]:text-muted [&>svg:first-child]:pointer-events-none">${icon(
    'i-search'
  )}<input type="search" class="w-[clamp(160px,18vw,260px)] min-h-[32px] rounded-md border border-line bg-surface py-[5px] ps-[30px] pe-7 font-[inherit] text-[12.5px] text-ink focus:border-[var(--accent)] focus:outline focus:outline-2 focus:outline-[var(--accent-soft)]" data-${attr} value="${escapeHtml(
    value
  )}" placeholder="Search ${escapeHtml(label)}" aria-label="Search ${escapeHtml(label)}"><button class="data-search-clear absolute end-1 grid size-6 place-items-center rounded p-0 border-0 bg-transparent text-muted cursor-pointer" type="button" data-${attr}-clear aria-label="Clear search"${
    value ? '' : ' hidden'
  }>${icon('i-x', 12)}</button></label>`

/** The right-hand "change view" menu — one icon + label + caret summary. */
export const viewMenu = ({attr, label, iconName, options}) =>
  `<details class="data-menu end relative" data-${attr}>
    <summary class="${DATA_MENU_SUMMARY_CLASS}">${icon(iconName, 14)}<span>${escapeHtml(label)}</span>${icon('i-caret', 11)}</summary>
    <div class="${DATA_MENU_POPOVER_CLASS}" role="menu">${options}</div>
  </details>`

/** The toolbar row itself — left filter cluster, right search + view. */
export const toolbarRow = ({ariaLabel, left, right}) =>
  `<div class="data-list-toolbar flex min-h-[46px] flex-wrap items-center gap-2 py-[7px]" role="toolbar" aria-label="${escapeHtml(ariaLabel)}">
    <div class="flex min-w-0 [flex:1_1_auto] flex-wrap items-center gap-1.5">${left}</div>
    <div class="flex min-w-0 flex-wrap items-center gap-1.5 ms-auto">${right}</div>
  </div>`

/** Close the toolbar menu a pick came from (the popover re-renders). */
export const closeOwnedMenu = item => {
  const details = item.closest('details')
  if (details) details.open = false
}

const EDITOR_SUMMARY_CLASS =
  'flex min-w-0 items-center gap-1.5 whitespace-nowrap min-h-0! rounded-none! border-0! bg-transparent! p-0! text-[inherit]! hover:bg-transparent! [&::-webkit-details-marker]:hidden'
const REMOVE_BUTTON_CLASS =
  'grid size-[18px] place-items-center rounded p-0 border-0 bg-transparent text-inherit cursor-pointer'
const ADD_ITEM_CLASS = ''

const optionValue = option => String(typeof option === 'object' && option !== null ? option.value : option)
const optionLabel = option => String(typeof option === 'object' && option !== null ? option.label : option)

export const collabFilterValueLabel = (field, filter) => {
  if (field.type === 'multi') {
    const picked = Array.isArray(filter.value) ? filter.value : []
    if (!picked.length) return field.emptyLabel || 'Anyone'
    const option = (field.options || []).find(item => optionValue(item) === String(picked[0]))
    const first = option ? optionLabel(option) : picked[0]
    return picked.length === 1 ? first : `${first} +${picked.length - 1}`
  }
  if (field.type !== 'select') return filter.value || ''
  const option = (field.options || []).find(item => optionValue(item) === String(filter.value))
  return option ? optionLabel(option) : filter.value || 'Choose value'
}

export const collabFilterMatches = (row, filter, field) => {
  if (!field) return true
  return typeof field.match === 'function' ? Boolean(field.match(row, filter)) : rowMatchesFieldFilter(row, filter, field)
}

export const collabFieldChoices = ({fields, activeKeys}) => {
  const available = fields.filter(field => !activeKeys.has(field.key))
  if (!available.length)
    return `<span class="data-menu-empty px-2 py-1.5 text-xs text-muted">All available filters are applied.</span>`
  return available
    .map(
      field =>
        `<button type="button" role="menuitem" class="${ADD_ITEM_CLASS}" data-collab-add-filter="${escapeHtml(field.key)}">${icon(
          field.icon,
          14
        )}<span>${escapeHtml(field.label)}</span></button>`
    )
    .join('')
}

export const collabFilterChip = ({field, filter}) => {
  const operator = DATA_FILTER_OPERATORS.find(item => item.key === filter.operator) || DATA_FILTER_OPERATORS[0]
  const valueLabel = collabFilterValueLabel(field, filter)
  const summaryValue = field.type === 'select' || field.type === 'multi' ? valueLabel : `${operator.label} ${filter.value || '…'}`
  const summary = `<summary class="${EDITOR_SUMMARY_CLASS}">${icon(field.icon, 14)}<strong>${escapeHtml(
    field.label
  )}:</strong><span class="data-filter-value overflow-hidden text-ellipsis text-accent">${escapeHtml(summaryValue)}</span></summary>`
  const remove = `<button type="button" class="${REMOVE_BUTTON_CLASS}" data-collab-remove-filter="${escapeHtml(
    field.key
  )}" aria-label="Remove ${escapeHtml(field.label)} filter">${icon('i-x', 12)}</button>`
  if (field.type === 'multi') {
    const picked = Array.isArray(filter.value) ? filter.value : []
    const options = (field.options || [])
      .map(option => {
        const value = optionValue(option)
        const selected = picked.includes(value)
        return `<button class="flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-[5px] px-2 text-start text-[12.5px] text-ink hover:bg-[var(--line-2)] aria-selected:bg-[var(--line-2)]" type="button" role="option" aria-selected="${selected}" data-collab-multi-option="${escapeHtml(
          field.key
        )}" data-value="${escapeHtml(value)}"><span class="grid size-4 flex-none place-items-center text-muted" data-collab-multi-check aria-hidden="true">${
          selected ? icon('i-check', 13) : ''
        }</span><span class="min-w-0 flex-1 truncate">${escapeHtml(optionLabel(option))}</span></button>`
      })
      .join('')
    return `<span class="${DATA_FILTER_CHIP_CLASS}"><details class="data-menu data-filter-editor relative min-w-0" data-collab-editor-key="${escapeHtml(
      field.key
    )}">${summary}<div class="${DATA_MENU_POPOVER_CLASS} min-w-[min(240px,calc(100vw-16px))] p-1.5" role="listbox" aria-multiselectable="true" aria-label="${escapeHtml(
      field.label
    )} filter values"><input type="search" class="mb-1 w-full min-h-[30px] rounded-md border border-line bg-surface px-2 py-1 font-[inherit] text-[12.5px] text-ink" data-collab-filter-search="${escapeHtml(
      field.key
    )}" placeholder="Search ${escapeHtml(field.label.toLowerCase())}" aria-label="Search ${escapeHtml(
      field.label
    )}" autocomplete="off"><div class="grid max-h-52 gap-0.5 overflow-auto" data-collab-multi-options="${escapeHtml(
      field.key
    )}">${options}</div></div></details>${remove}</span>`
  }
  if (field.type === 'select') {
    const options = (field.options || [])
      .map(option => {
        const value = optionValue(option)
        const selected = String(filter.value) === value
        return `<button class="${DATA_FILTER_OPTION_CLASS}" type="button" role="option" aria-selected="${selected}" data-collab-filter-select-option="${escapeHtml(
          field.key
        )}" data-value="${escapeHtml(value)}">${escapeHtml(optionLabel(option))}${selected ? icon('i-check', 13) : ''}</button>`
      })
      .join('')
    return `<span class="${DATA_FILTER_CHIP_CLASS}"><details class="data-menu data-filter-editor relative min-w-0" data-collab-editor-key="${escapeHtml(
      field.key
    )}">${summary}<div class="${DATA_MENU_POPOVER_CLASS} min-w-[min(220px,calc(100vw-16px))] p-1" role="listbox" aria-label="${escapeHtml(
      field.label
    )} filter value">${options}</div></details>${remove}</span>`
  }
  const operators = `<div class="data-filter-operators mb-1.5 flex flex-nowrap gap-1 overflow-x-auto">${DATA_FILTER_OPERATORS.map(
    item =>
      `<button type="button" class="flex-none w-auto min-h-[28px] whitespace-nowrap px-2 py-1 aria-pressed:bg-[var(--line-2)] aria-pressed:font-bold" data-collab-filter-operator="${escapeHtml(
        item.key
      )}" data-collab-filter-key="${escapeHtml(field.key)}" aria-pressed="${item.key === filter.operator}">${escapeHtml(
        item.label
      )}</button>`
  ).join('')}</div>`
  const input = `<input type="text" class="w-full min-h-[36px] rounded-md border border-line bg-surface px-[9px] py-1.5 font-[inherit] text-ink" data-collab-filter-value="${escapeHtml(
    field.key
  )}" value="${escapeHtml(filter.value)}" placeholder="Enter ${escapeHtml(field.label.toLowerCase())}" aria-label="${escapeHtml(
    field.label
  )} filter value">`
  return `<span class="${DATA_FILTER_CHIP_CLASS}"><details class="data-menu data-filter-editor relative min-w-0" data-collab-editor-key="${escapeHtml(
    field.key
  )}">${summary}<div class="${DATA_MENU_POPOVER_CLASS} min-w-[min(260px,calc(100vw-16px))] p-2.5">${operators}${input}</div></details>${remove}</span>`
}

export const collabFilterChips = ({fields, filters}) =>
  filters
    .map(filter => {
      const field = fields.find(item => item.key === filter.key)
      return field ? collabFilterChip({field, filter}) : ''
    })
    .join('')

export const applyCollabFilterClick = (event, {fields, filters, onChange}) => {
  const add = event.target.closest('[data-collab-add-filter]')
  if (add) {
    const field = fields.find(item => item.key === add.dataset.collabAddFilter)
    if (field && !filters.some(item => item.key === field.key)) {
      filters.push({
        key: field.key,
        operator: field.type === 'text' ? 'contains' : 'equals',
        value: field.type === 'multi' ? [] : field.type === 'select' ? optionValue((field.options || [])[0] ?? '') : '',
      })
    }
    closeOwnedMenu(add)
    onChange({focusKey: field?.key ?? ''})
    return true
  }
  const remove = event.target.closest('[data-collab-remove-filter]')
  if (remove) {
    const key = remove.dataset.collabRemoveFilter
    const index = filters.findIndex(item => item.key === key)
    if (index >= 0) filters.splice(index, 1)
    onChange({focusKey: ''})
    return true
  }
  const operator = event.target.closest('[data-collab-filter-operator]')
  if (operator) {
    const filter = filters.find(item => item.key === operator.dataset.collabFilterKey)
    if (filter) filter.operator = operator.dataset.collabFilterOperator
    onChange({focusKey: operator.dataset.collabFilterKey})
    return true
  }
  const option = event.target.closest('[data-collab-filter-select-option]')
  if (option) {
    const key = option.dataset.collabFilterSelectOption
    const filter = filters.find(item => item.key === key)
    if (filter) filter.value = option.dataset.value
    onChange({focusKey: key})
    return true
  }
  const multi = event.target.closest('[data-collab-multi-option]')
  if (multi) {
    const key = multi.dataset.collabMultiOption
    const filter = filters.find(item => item.key === key)
    const field = fields.find(item => item.key === key)
    if (filter) {
      const value = multi.dataset.value
      const picked = Array.isArray(filter.value) ? [...filter.value] : []
      const at = picked.indexOf(value)
      if (at >= 0) picked.splice(at, 1)
      else picked.push(value)
      filter.value = picked
      const selected = picked.includes(value)
      multi.setAttribute('aria-selected', String(selected))
      const check = multi.querySelector('[data-collab-multi-check]')
      if (check) check.innerHTML = selected ? icon('i-check', 13) : ''
      const summaryValue = multi.closest('.data-menu')?.querySelector('summary .data-filter-value')
      if (summaryValue && field) summaryValue.textContent = collabFilterValueLabel(field, filter)
      onChange({soft: true})
    }
    return true
  }
  return false
}

export const bindCollabFieldFilters = (host, {fields, filters, onChange}) => {
  host
    .querySelectorAll('[data-collab-add-filter], [data-collab-remove-filter], [data-collab-filter-operator], [data-collab-filter-select-option], [data-collab-multi-option]')
    .forEach(item => item.addEventListener('click', event => applyCollabFilterClick(event, {fields, filters, onChange})))
  host.querySelectorAll('[data-collab-filter-value]').forEach(input =>
    input.addEventListener('input', event => {
      const filter = filters.find(item => item.key === event.target.dataset.collabFilterValue)
      if (!filter) return
      filter.value = event.target.value
      onChange({focusKey: filter.key, caret: event.target.selectionStart})
    })
  )
  host.querySelectorAll('[data-collab-filter-search]').forEach(input =>
    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase()
      const optionsHost = input.closest('.data-menu')?.querySelector('[data-collab-multi-options]')
      if (!optionsHost) return
      optionsHost.querySelectorAll('[data-collab-multi-option]').forEach(option => {
        const label = option.lastElementChild?.textContent?.toLowerCase() || ''
        option.hidden = query ? !label.includes(query) : false
      })
    })
  )
}

export const restoreCollabFilterFocus = (host, focusKey, caret = null) => {
  if (!focusKey) return
  const editor = host.querySelector(`[data-collab-editor-key="${CSS.escape(focusKey)}"]`)
  if (!editor) return
  editor.open = true
  const search = editor.querySelector('[data-collab-filter-search]')
  if (search) {
    search.focus()
    return
  }
  const input = editor.querySelector('[data-collab-filter-value]')
  if (input) {
    input.focus()
    const position = caret == null ? input.value.length : caret
    input.setSelectionRange(position, position)
    return
  }
  editor.querySelector('[aria-selected="true"]')?.focus()
}
