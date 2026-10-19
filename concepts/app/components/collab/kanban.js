import {uiLocale} from '../../core/locale.js'
const {t} = uiLocale
// Kanban board shared by Notes and Activities. Columns are status buckets;
// moving a card only reports (id, column) to the page, which changes that
// one status field. Drag and drop is mouse sugar: Notes also carries a
// labelled "Move to" select on each card so the same move works from the
// keyboard, while Activities leaves it off — its status lives in the card's
// own editor, and drag and drop covers the board.
import {escapeHtml, icon} from './fields.js'

const COLUMN_CLASS =
  'flex min-h-[220px] min-w-0 w-[var(--kanban-column-width)] flex-none snap-start snap-always flex-col rounded-lg border border-line bg-[var(--line-2)] [&.drop-target]:border-[var(--accent)] [&.drop-target]:bg-[var(--accent-soft)] data-[collapsed=true]:min-h-0'
const COLUMN_MIN_WIDTH = 320
const COLUMN_GAP = 12
const boardObservers = new WeakMap()
function sizeColumns(host) {
  const board = host.querySelector('[data-board]')
  if (!board || !host.clientWidth) return
  const canvas = host.closest('.content')
  const parent = host.parentElement
  const boxed = document.body.classList.contains('layout-boxed') && canvas
  const inset = window.innerWidth <= 900 ? 8 : 0
  const available = boxed ? parent.clientWidth - inset * 2 : host.clientWidth
  if (canvas) {
    const gutter = Math.max(0, (canvas.clientWidth - parent.clientWidth) / 2 + inset)
    host.style.setProperty('--kanban-canvas-width', `${canvas.clientWidth}px`)
    host.style.setProperty('--kanban-bleed', `${Math.max(0, (canvas.clientWidth - parent.clientWidth) / 2)}px`)
    host.style.setProperty('--kanban-gutter', `${gutter}px`)
  }
  const count = Math.max(1, Math.min(board.children.length, Math.floor((available + COLUMN_GAP) / (COLUMN_MIN_WIDTH + COLUMN_GAP))))
  board.style.setProperty('--kanban-column-width', `${(available - (count - 1) * COLUMN_GAP) / count}px`)
}
export const CARD_CLASS =
  'relative cursor-grab rounded-md border border-line bg-surface shadow-[0_1px_1px_rgba(9,30,66,0.08)] transition-[box-shadow,border-color] duration-150 hover:border-[var(--accent-line)] hover:shadow-[0_4px_10px_rgba(9,30,66,0.14)] active:cursor-grabbing'
export const CARD_OPEN_CLASS =
  'block w-full border-0 bg-transparent px-3 pb-3 pt-2.5 text-start focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] hover:[&_.card-title]:underline'

/**
 * @param {HTMLElement} host
 * @param {{
 *   columns: {id: string, label: string, items: object[], collapsed?: boolean, quickAdd?: string}[],
 *   renderCard: (item: object) => string,
 *   renderCardActions?: (item: object) => string,
 *   titleOf: (item: object) => string,
 *   onOpen: (id: string) => void,
 *   onMove: (id: string, columnId: string) => void,
 *   onQuickAdd?: (columnId: string, title: string) => void,
 *   onToggleColumn?: (columnId: string) => void,
 *   emptyText?: string,
 *   showMove?: boolean,
 * }} options
 */
export function renderBoard(host, {columns, moveColumns = columns, renderCard, renderCardActions, titleOf, onOpen, onMove, onQuickAdd, onToggleColumn, emptyText = 'Nothing here yet.', showMove = true}) {
  const moveOptions = moveColumns.map(column => [column.id, column.label])
  host.innerHTML = `<div class="flex w-full min-w-0 items-start gap-3 overflow-visible pb-2" data-board>${columns
    .map(column => {
      const collapsed = Boolean(column.collapsed)
      return `<section class="${COLUMN_CLASS}" data-column="${escapeHtml(column.id)}" data-collapsed="${collapsed}" aria-label="${escapeHtml(t(column.label))}">
        <header class="flex items-center gap-2 px-3 py-2.5">
          <h3 class="flex-1 text-[13px] font-semibold text-ink">${escapeHtml(t(column.label))} <span class="font-normal text-muted">· ${column.items.length}</span></h3>
          ${
            onToggleColumn && column.collapsible
              ? `<button type="button" class="lbtn" data-toggle-column="${escapeHtml(column.id)}" aria-expanded="${!collapsed}">${t(collapsed ? 'Show' : 'Hide')}</button>`
              : ''
          }
        </header>
        ${
          collapsed
            ? ''
            : `<div class="flex flex-1 flex-col gap-2 px-2 pb-2">
          ${
            column.quickAdd && onQuickAdd
              ? `<label class="sr-only" for="quick-add-${escapeHtml(column.id)}">${t('Add to')} ${escapeHtml(t(column.label))}</label><input id="quick-add-${escapeHtml(column.id)}" data-quick-add="${escapeHtml(column.id)}" dir="auto" autocomplete="off" placeholder="${escapeHtml(t(column.quickAdd))}" class="min-h-8 w-full rounded-md border border-dashed border-line bg-surface px-2.5 text-[13px] text-ink placeholder:text-muted focus-visible:border-solid focus-visible:border-[var(--accent)] focus-visible:outline-none">`
              : ''
          }
          ${
            column.items.length
              ? column.items
                  .map(item => {
                    const title = titleOf(item)
                    return `<article class="${CARD_CLASS}" draggable="true" data-card-id="${escapeHtml(item.id)}">
                <button type="button" class="${CARD_OPEN_CLASS}" data-card-open="${escapeHtml(item.id)}">${renderCard(item)}</button>
                ${
                  renderCardActions
                    ? `<div class="absolute end-1.5 top-1.5 z-[1]" data-card-actions>${renderCardActions(item)}</div>`
                    : ''
                }
                ${
                  showMove
                    ? `<div class="flex items-center justify-end gap-1 px-2 pb-2">
                  <label class="sr-only" for="move-${escapeHtml(item.id)}">${t('Move')} ${escapeHtml(title)} ${t('to')}</label>
                  <span class="text-faint" aria-hidden="true">${icon('i-next', 12)}</span>
                  <select id="move-${escapeHtml(item.id)}" data-move="${escapeHtml(item.id)}" class="max-w-[140px] rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-muted hover:border-line focus-visible:border-[var(--accent)] focus-visible:outline-none">
                    ${moveOptions.map(([id, label]) => `<option value="${escapeHtml(id)}"${id === column.id ? ' selected' : ''}>${escapeHtml(t(label))}</option>`).join('')}
                  </select>
                </div>`
                    : ''
                }
              </article>`
                  })
                  .join('')
              : `<p class="px-1 py-3 text-center text-xs text-muted">${escapeHtml(t(emptyText))}</p>`
          }
        </div>`
        }
      </section>`
    })
    .join('')}</div>`
  // Fit a whole number of columns; narrow screens show one complete column.
  // Keep the page's content scroller, with snapping only while a board exists.
  host.classList.add('kanban-scroll-host', '[&:has(>[data-board])]:[scroll-snap-type:x_mandatory]')
  sizeColumns(host)
  if (!boardObservers.has(host)) {
    const observer = new ResizeObserver(() => sizeColumns(host))
    observer.observe(host)
    observer.observe(host.parentElement)
    if (host.closest('.content')) observer.observe(host.closest('.content'))
    boardObservers.set(host, observer)
  }

  host.querySelectorAll('[data-card-open]').forEach(button =>
    button.addEventListener('click', () => onOpen(button.dataset.cardOpen))
  )
  host.querySelectorAll('[data-move]').forEach(select =>
    select.addEventListener('change', () => onMove(select.dataset.move, select.value))
  )
  host.querySelectorAll('[data-toggle-column]').forEach(button =>
    button.addEventListener('click', () => onToggleColumn(button.dataset.toggleColumn))
  )
  host.querySelectorAll('[data-quick-add]').forEach(input =>
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || !input.value.trim()) return
      event.preventDefault()
      onQuickAdd(input.dataset.quickAdd, input.value.trim())
    })
  )
  host.querySelectorAll('[data-card-id]').forEach(card =>
    card.addEventListener('dragstart', event => {
      event.dataTransfer.setData('text/plain', card.dataset.cardId)
      event.dataTransfer.effectAllowed = 'move'
    })
  )
  host.querySelectorAll('[data-column]').forEach(column => {
    column.addEventListener('dragover', event => {
      event.preventDefault()
      column.classList.add('drop-target')
    })
    column.addEventListener('dragleave', () => column.classList.remove('drop-target'))
    column.addEventListener('drop', event => {
      event.preventDefault()
      column.classList.remove('drop-target')
      const id = event.dataTransfer.getData('text/plain')
      if (id) onMove(id, column.dataset.column)
    })
  })
}
