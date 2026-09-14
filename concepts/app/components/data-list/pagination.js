// Data-list pager renderers — moved verbatim (unmodified algorithm/markup)
// out of concepts/app/legacy-app.js as part of Task 5, from the baseline
// range .baseline/concepts/app-shell.html:22398-22470 (renderShellPager,
// renderShellRecordPager).
//
// Both functions built their HTML by reading legacy-app.js's private
// closure state directly: `dataListState[context]` for the list's live
// state, and legacy-only locale/render helpers (t, encodeHtml, dataListIcon,
// dataListRows, renderDataListAdaptiveFooterActions) for markup pieces this
// module has no business owning. Per the brief's explicit substitution
// ("pass the model's state explicitly where prior code indexed global
// dataListState"), each function now takes `listState` as its own
// parameter instead of indexing a global, and takes the small set of
// render helpers it needs via a `deps` parameter instead of closing over
// legacy-app.js's scope — the exact plumbing change the brief calls out,
// with the original page-math and markup otherwise byte-identical.
//
// legacy-app.js's own renderShellPager/renderShellRecordPager now call
// these with `dataListState[context]` and its own t/encodeHtml/
// dataListIcon/dataListRows/renderDataListAdaptiveFooterActions bound into
// `deps`, eliminating the duplicate copies.

import {DATA_LIST_CONFIG} from './columns.js'
import {DATA_LIST_SIMULATED_TOTAL, DATA_LIST_PAGE_SIZE_OPTIONS} from './model.js'

/**
 * @typedef {{
 *   t(key: string, fallback?: string): string,
 *   encodeHtml(value: unknown): string,
 *   dataListIcon(name: string, size?: number): string,
 * }} PagerDeps
 */

/**
 * @param {string} context
 * @param {number} filteredCount
 * @param {import('./model.js').ListModelState} listState
 * @param {PagerDeps} deps
 */
export function renderShellPager(context, filteredCount, listState, deps) {
  const {t, encodeHtml, dataListIcon} = deps
  const config = DATA_LIST_CONFIG[context]
  const simulatedTotal = DATA_LIST_SIMULATED_TOTAL[context] || filteredCount
  const pageSize = listState.pageSize
  const totalPages = Math.max(1, Math.ceil(simulatedTotal / pageSize))
  const page = Math.min(Math.max(1, listState.page), totalPages)
  const rangeStart = filteredCount ? (page - 1) * pageSize + 1 : 0
  const rangeEnd = Math.min(page * pageSize, filteredCount ? simulatedTotal : 0)
  const pageNumbers = []
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) pageNumbers.push(n)
    else if (pageNumbers.at(-1) !== '…') pageNumbers.push('…')
  }
  const pageButtonClass = 'inline-flex min-w-[30px] min-h-[30px] items-center justify-center gap-[5px] rounded-md border border-line bg-surface px-[9px] py-1 text-[12.5px] font-semibold text-ink cursor-pointer aria-[current=page]:border-[var(--accent)] aria-[current=page]:bg-[var(--accent-soft)] aria-[current=page]:text-accent hover:not-aria-[current=page]:bg-[var(--line-2)] disabled:text-muted disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]'
  const pageButtons = pageNumbers
    .map(n =>
      n === '…'
        ? `<span class="data-pagination-ellipsis px-1 text-faint" aria-hidden="true">…</span>`
        : `<button type="button" class="data-pagination-page ${pageButtonClass}${n === page ? ' is-current' : ''}" data-list-page="${n}"${n === page ? ' aria-current="page"' : ''} aria-label="${t('Page', 'Page')} ${n}">${n}</button>`
    )
    .join('')
  const sizeOptions = DATA_LIST_PAGE_SIZE_OPTIONS.map(
    size =>
      `<option value="${size}"${size === pageSize ? ' selected' : ''}>${size}</option>`
  ).join('')
  const edgeButtonClass = 'inline-flex min-w-[30px] min-h-[30px] items-center justify-center gap-[5px] rounded-md border border-line bg-surface p-1 text-[12.5px] font-semibold text-ink cursor-pointer hover:enabled:bg-[var(--line-2)] disabled:text-muted disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]'
  return `<div class="data-list-pagination flex flex-1 flex-wrap items-center gap-x-4 gap-y-2.5" role="navigation" aria-label="${encodeHtml(config.label)} ${t('page navigation', 'page navigation')}">
    <div class="data-pagination-controls flex flex-wrap items-center gap-1">
      <button type="button" class="data-pagination-edge ${edgeButtonClass}" data-list-page="1"${page <= 1 ? ' disabled' : ''} aria-label="${t('First page', 'First page')}">${dataListIcon('i-first', 13)}</button>
      <button type="button" class="data-pagination-prev ${edgeButtonClass}" data-list-page="${page - 1}"${page <= 1 ? ' disabled' : ''}>${dataListIcon('i-prev', 12)}</button>
      ${pageButtons}
      <button type="button" class="data-pagination-next ${edgeButtonClass}" data-list-page="${page + 1}"${page >= totalPages ? ' disabled' : ''}>${dataListIcon('i-next', 12)}</button>
      <button type="button" class="data-pagination-edge ${edgeButtonClass}" data-list-page="${totalPages}"${page >= totalPages ? ' disabled' : ''} aria-label="${t('Last page', 'Last page')}">${dataListIcon('i-last', 13)}</button>
      <label class="data-pagination-jump inline-flex items-center gap-1.5 ms-1.5 ps-2 border-s border-line text-[12.5px] whitespace-nowrap text-muted"><span>${t('Go to page', 'Go to page')}</span><input class="data-pagination-jump-input w-[52px] min-h-[30px] rounded-md border border-line bg-surface text-center font-[inherit] text-[12.5px] font-semibold text-ink" type="number" min="1" max="${totalPages}" value="${page}" aria-label="${t('Go to page', 'Go to page')}"></label>
    </div>
    <span class="data-pagination-summary whitespace-nowrap text-[12.5px] text-muted" aria-live="polite">${t('Showing', 'Showing')} ${rangeStart}–${rangeEnd} ${t('of', 'of')} ${simulatedTotal}</span>
    <label class="data-pagination-size inline-flex items-center gap-1.5 ms-auto text-[12.5px] whitespace-nowrap text-muted">${t('Rows per page', 'Rows per page')}<select class="min-h-[30px] rounded-md border border-line bg-surface px-1.5 py-[3px] font-[inherit] text-[12.5px] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]" data-list-page-size aria-label="${t('Rows per page', 'Rows per page')}">${sizeOptions}</select></label>
  </div>`
}

/* Adaptive view's footer navigator moves between records, one at a
   time, instead of between pages — same First/Prev/[N]/Next/Last
   shape as the in-record "Record N of N" pager elsewhere, but scoped
   to the actually-navigable rows rather than the simulated total
   (there's nothing meaningful to jump to past the real sample set). */
/**
 * @param {string} context
 * @param {number} filteredCount
 * @param {import('./model.js').ListModelState} listState
 * @param {PagerDeps & {
 *   dataListRows(context: string): unknown[],
 *   renderDataListAdaptiveFooterActions(context: string, row: unknown, config: unknown): string,
 * }} deps
 */
export function renderShellRecordPager(context, filteredCount, listState, deps) {
  const {t, encodeHtml, dataListIcon, dataListRows, renderDataListAdaptiveFooterActions} = deps
  const config = DATA_LIST_CONFIG[context]
  const total = Math.max(filteredCount, filteredCount ? 1 : 0)
  const position = Math.min(Math.max(1, listState.page), total || 1)
  const atFirst = !total || position <= 1
  const atLast = !total || position >= total
  const row = total ? dataListRows(context)[position - 1] : null
  const actions = row ? renderDataListAdaptiveFooterActions(context, row, config) : ''
  const searchTerm = listState.search.trim()
  const searchNote = searchTerm
    ? `<span class="data-adaptive-search-note">${t('matching', 'matching')} "${encodeHtml(searchTerm)}"</span>`
    : ''
  const pagerButtonClass = 'relative inline-flex min-w-[30px] min-h-[30px] items-center justify-center rounded-md border border-line bg-surface disabled:cursor-not-allowed disabled:text-muted disabled:opacity-55 hover:enabled:bg-[var(--line-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]'
  return `<div class="pager inline-flex items-center gap-1" role="group" aria-label="${t('Record navigation', 'Record navigation')}" title="${t('Tip: Alt + Left/Right arrow also moves between records', 'Tip: Alt + Left/Right arrow also moves between records')}">
    <button type="button" class="pg-f ${pagerButtonClass}" data-list-record="1"${atFirst ? ' disabled' : ''} aria-label="${t('First record', 'First record')}">${dataListIcon('i-first', 13)}</button>
    <button type="button" class="pg-p ${pagerButtonClass}" data-list-record="${position - 1}"${atFirst ? ' disabled' : ''} aria-label="${t('Previous record', 'Previous record')}">${dataListIcon('i-prev', 12)}</button>
    <input class="pg-i w-[52px] min-h-[30px] rounded-md border border-line bg-surface text-center font-[inherit] text-[12.5px] font-semibold text-ink" type="number" min="1" max="${total || 1}" value="${total ? position : 0}" aria-label="${t('Record number', 'Record number')}"${total ? '' : ' disabled'}>
    <span class="tot whitespace-nowrap px-2 text-[12.5px] text-muted">${t('of', 'of')} ${total}</span>
    ${searchNote}
    <button type="button" class="pg-n ${pagerButtonClass}" data-list-record="${position + 1}"${atLast ? ' disabled' : ''} aria-label="${t('Next record', 'Next record')}">${dataListIcon('i-next', 12)}</button>
    <button type="button" class="pg-l ${pagerButtonClass}" data-list-record="${total}"${atLast ? ' disabled' : ''} aria-label="${t('Last record', 'Last record')}">${dataListIcon('i-last', 13)}</button>
  </div>${actions}`
}
