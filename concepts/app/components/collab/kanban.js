// Kanban board shared by Notes and Activities. Columns are status buckets;
// moving a card only reports (id, column) to the page, which changes that
// one status field. Drag and drop is mouse sugar: every card also carries a
// labelled "Move to" select so the same move works from the keyboard.
import {escapeHtml, icon} from './fields.js'

const COLUMN_CLASS =
  'flex min-h-[220px] min-w-[240px] flex-1 flex-col rounded-lg border border-line bg-[var(--line-2)] [&.drop-target]:border-[var(--accent)] [&.drop-target]:bg-[var(--accent-soft)] data-[collapsed=true]:min-h-0 data-[collapsed=true]:flex-none data-[collapsed=true]:min-w-[200px]'
const CARD_CLASS = 'rounded-md border border-line bg-surface shadow-[0_1px_1px_rgba(9,30,66,0.08)]'
export const CARD_OPEN_CLASS =
  'block w-full border-0 bg-transparent px-3 pb-1 pt-2.5 text-start focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--focus)] hover:[&_.card-title]:underline'

/**
 * @param {HTMLElement} host
 * @param {{
 *   columns: {id: string, label: string, items: object[], collapsed?: boolean, quickAdd?: string}[],
 *   renderCard: (item: object) => string,
 *   titleOf: (item: object) => string,
 *   onOpen: (id: string) => void,
 *   onMove: (id: string, columnId: string) => void,
 *   onQuickAdd?: (columnId: string, title: string) => void,
 *   onToggleColumn?: (columnId: string) => void,
 *   emptyText?: string,
 * }} options
 */
export function renderBoard(host, {columns, renderCard, titleOf, onOpen, onMove, onQuickAdd, onToggleColumn, emptyText = 'Nothing here yet.'}) {
  const moveOptions = columns.map(column => [column.id, column.label])
  host.innerHTML = `<div class="flex items-start gap-3 overflow-x-auto pb-2" data-board>${columns
    .map(column => {
      const collapsed = Boolean(column.collapsed)
      return `<section class="${COLUMN_CLASS}" data-column="${escapeHtml(column.id)}" data-collapsed="${collapsed}" aria-label="${escapeHtml(column.label)}">
        <header class="flex items-center gap-2 px-3 py-2.5">
          <h3 class="flex-1 text-[13px] font-semibold text-ink">${escapeHtml(column.label)} <span class="font-normal text-muted">· ${column.items.length}</span></h3>
          ${
            onToggleColumn && column.collapsible
              ? `<button type="button" class="lbtn" data-toggle-column="${escapeHtml(column.id)}" aria-expanded="${!collapsed}">${collapsed ? 'Show' : 'Hide'}</button>`
              : ''
          }
        </header>
        ${
          collapsed
            ? ''
            : `<div class="flex flex-1 flex-col gap-2 px-2 pb-2">
          ${
            column.quickAdd && onQuickAdd
              ? `<label class="sr-only" for="quick-add-${escapeHtml(column.id)}">Add to ${escapeHtml(column.label)}</label><input id="quick-add-${escapeHtml(column.id)}" data-quick-add="${escapeHtml(column.id)}" dir="auto" autocomplete="off" placeholder="${escapeHtml(column.quickAdd)}" class="min-h-8 w-full rounded-md border border-dashed border-line bg-surface px-2.5 text-[13px] text-ink placeholder:text-muted focus-visible:border-solid focus-visible:border-[var(--accent)] focus-visible:outline-none">`
              : ''
          }
          ${
            column.items.length
              ? column.items
                  .map(item => {
                    const title = titleOf(item)
                    return `<article class="${CARD_CLASS}" draggable="true" data-card-id="${escapeHtml(item.id)}">
                <button type="button" class="${CARD_OPEN_CLASS}" data-card-open="${escapeHtml(item.id)}">${renderCard(item)}</button>
                <div class="flex items-center justify-end gap-1 px-2 pb-2">
                  <label class="sr-only" for="move-${escapeHtml(item.id)}">Move ${escapeHtml(title)} to</label>
                  <span class="text-faint" aria-hidden="true">${icon('i-next', 12)}</span>
                  <select id="move-${escapeHtml(item.id)}" data-move="${escapeHtml(item.id)}" class="max-w-[140px] rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-muted hover:border-line focus-visible:border-[var(--accent)] focus-visible:outline-none">
                    ${moveOptions.map(([id, label]) => `<option value="${escapeHtml(id)}"${id === column.id ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}
                  </select>
                </div>
              </article>`
                  })
                  .join('')
              : `<p class="px-1 py-3 text-center text-xs text-muted">${escapeHtml(emptyText)}</p>`
          }
        </div>`
        }
      </section>`
    })
    .join('')}</div>`

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
