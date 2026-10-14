// List-page toolbar pieces for the collaboration screens, mirroring the
// invoices/customers data-list chrome: a quick-filter menu, a "+ Filter"
// menu with inline removable chips, the search field, and the view menu —
// same classes, same spacing, same semantics as components/data-list.
import {
  DATA_TOOLBAR_BUTTON_CLASS,
  DATA_MENU_SUMMARY_CLASS,
  DATA_MENU_POPOVER_CLASS,
  DATA_FILTER_CHIP_CLASS,
} from '../data-list/list.js'
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
