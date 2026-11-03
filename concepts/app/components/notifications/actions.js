import {encodeHtml} from '../../core/locale.js'

/** Shared controls for notification table and cards. The page owns their delegated events. */
export function notificationActionButtons(row) {
  const key = encodeHtml(row.id)
  const pinLabel = row.pinned ? 'Unpin notification' : 'Pin notification'
  const readLabel = 'Mark as unread'
  const readIcon = '<path d="m2 6 6-4 6 4v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6Z"/><path d="m2 6 6 4 6-4"/>'
  const pinIcon = '<path d="m10 1 5 5-2 1-2 3v2l-3-1-3-3H3V6l3-1 3-2 1-2Z"/><path d="m6 10-4 4"/>'
  return `<span class="flex w-full items-center justify-end gap-1 whitespace-nowrap">
    ${!row.unread ? `<button type="button" class="ibtn size-8 p-0! active:bg-[var(--line)]" data-notification-action="read" data-notification-id="${key}" aria-label="${readLabel}" title="${readLabel}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${readIcon}</svg>
    </button>` : ''}
    <button type="button" class="ibtn size-8 p-0! active:bg-[var(--line)] ${row.pinned ? 'text-accent!' : ''}" data-notification-action="pin" data-notification-id="${key}" aria-label="${pinLabel}" aria-pressed="${Boolean(row.pinned)}" title="${pinLabel}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="${row.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pinIcon}</svg>
    </button>
  </span>`
}
